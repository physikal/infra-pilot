import { Router } from "express";
import {
  getApp,
  getAllApps,
  upsertApp,
  updateAppStatus,
  deleteAppFromDb,
  addActivity,
} from "../db.js";
import * as nomad from "../integrations/nomad.js";
import * as cloudflare from "../integrations/cloudflare.js";
import * as github from "../integrations/github.js";
import { generateJobHcl } from "../lib/hcl.js";

const router = Router();

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

async function resolveAccessUrl(app) {
  if (app.routing === "external" && app.domain) {
    return `https://${app.domain}`;
  }

  if (!app.port || !app.nomad_job_id || app.status !== "running") {
    return null;
  }

  if (!nomad.isConfigured()) return null;

  try {
    const allocs = await nomad.getJobAllocations(app.nomad_job_id);
    const runningStub = allocs.find(
      (a) => a.ClientStatus === "running"
    );
    if (!runningStub) return null;

    const alloc = await nomad.getAllocation(runningStub.ID);

    const ports = alloc.AllocatedResources?.Shared?.Ports;
    const httpPort = ports?.find((p) => p.Label === "http");

    if (httpPort) {
      const ip = httpPort.HostIP || alloc.AllocatedResources
        ?.Shared?.Networks?.[0]?.IP;
      if (ip && httpPort.Value) {
        return `http://${ip}:${httpPort.Value}`;
      }
    }

    const dynPorts = alloc.Resources?.Networks?.[0]?.DynamicPorts;
    const dynHttp = dynPorts?.find((p) => p.Label === "http");
    if (dynHttp?.Value) {
      const ip = alloc.Resources.Networks[0].IP;
      if (ip) return `http://${ip}:${dynHttp.Value}`;
    }

    return null;
  } catch {
    return null;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateName(name) {
  if (!name || typeof name !== "string") return "App name is required";
  const slug = slugify(name);
  if (slug.length < 2 || slug.length > 63) {
    return "App name must be 2-63 characters";
  }
  if (!SLUG_RE.test(slug)) {
    return "App name must be alphanumeric with hyphens";
  }
  return null;
}

// List all apps
router.get("/", async (_req, res, next) => {
  try {
    const apps = getAllApps();
    const enriched = await Promise.all(
      apps.map(async (app) => ({
        ...app,
        access_url: await resolveAccessUrl(app),
      }))
    );
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Get app detail with live Nomad status
router.get("/:id", async (req, res, next) => {
  try {
    const app = getApp(req.params.id);
    if (!app) return res.status(404).json({ error: "App not found" });

    let nomadStatus = null;
    if (app.nomad_job_id && nomad.isConfigured()) {
      try {
        nomadStatus = await nomad.getJob(app.nomad_job_id);
      } catch {
        // Job may not exist anymore
      }
    }

    const access_url = await resolveAccessUrl(app);
    res.json({ ...app, nomad_status: nomadStatus, access_url });
  } catch (err) {
    next(err);
  }
});

// Deploy new app
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      source_type,
      image,
      source_meta,
      cpu,
      memory,
      port,
      env_vars,
      routing,
      domain,
      zone_id,
    } = req.body;

    const nameError = validateName(name);
    if (nameError) return res.status(400).json({ error: nameError });

    if (!source_type || !image) {
      return res
        .status(400)
        .json({ error: "source_type and image are required" });
    }

    const id = slugify(name);

    const existing = getApp(id);
    if (existing) {
      return res.status(409).json({ error: `App "${name}" already exists` });
    }

    let dnsRecordIds = [];

    if (routing === "external") {
      if (!domain) {
        return res
          .status(400)
          .json({ error: "Domain is required for external routing" });
      }
      if (!zone_id) {
        return res
          .status(400)
          .json({ error: "Zone ID is required for external routing" });
      }
      if (!cloudflare.isConfigured()) {
        return res.status(400).json({
          error: "Cloudflare integration not configured",
          suggestion: "Go to Settings to configure Cloudflare.",
        });
      }

      const nodes = await nomad.listNodes();
      const eligibleNodes = nodes.filter(
        (n) =>
          n.Status === "ready" &&
          n.SchedulingEligibility === "eligible"
      );

      if (eligibleNodes.length === 0) {
        return res
          .status(400)
          .json({ error: "No eligible Nomad nodes found for DNS records" });
      }

      for (const node of eligibleNodes) {
        let ip = node.Address;
        if (!ip && node.HTTPAddr) {
          ip = node.HTTPAddr.replace(/:\d+$/, "");
        }

        if (!ip) continue;

        try {
          const record = await cloudflare.createDNSRecord(zone_id, {
            type: "A",
            name: domain,
            content: ip,
            proxied: false,
          });
          dnsRecordIds.push(record.id);
        } catch (err) {
          // Rollback created DNS records on failure
          for (const recordId of dnsRecordIds) {
            await cloudflare
              .deleteDNSRecord(zone_id, recordId)
              .catch(() => {});
          }
          throw new Error(`Failed to create DNS record: ${err.message}`);
        }
      }
    }

    const app = {
      id,
      name,
      source_type,
      image,
      source_meta: source_meta || {},
      cpu: cpu || 200,
      memory: memory || 256,
      port: port || null,
      env_vars: env_vars || {},
      routing: routing || "internal",
      domain: domain || null,
      zone_id: zone_id || null,
      dns_record_ids: dnsRecordIds.length > 0 ? dnsRecordIds : null,
      nomad_job_id: id,
      status: "deploying",
    };

    if (env_vars && Object.keys(env_vars).length > 0) {
      await nomad.putVariable(`nomad/jobs/${id}`, env_vars);
    }

    const hcl = await generateJobHcl(app);
    await nomad.deployJob(hcl);

    app.status = "running";
    upsertApp(app);
    addActivity("apps", `Deployed app: ${name} (${image})`);
    res.json(getApp(id));
  } catch (err) {
    next(err);
  }
});

// Stop app
router.post("/:id/stop", async (req, res, next) => {
  try {
    const app = getApp(req.params.id);
    if (!app) return res.status(404).json({ error: "App not found" });

    await nomad.stopJob(app.nomad_job_id);
    updateAppStatus(app.id, "stopped");
    addActivity("apps", `Stopped app: ${app.name}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Start app
router.post("/:id/start", async (req, res, next) => {
  try {
    const app = getApp(req.params.id);
    if (!app) return res.status(404).json({ error: "App not found" });

    const hcl = await generateJobHcl(app);
    await nomad.deployJob(hcl);
    updateAppStatus(app.id, "running");
    addActivity("apps", `Started app: ${app.name}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Restart app
router.post("/:id/restart", async (req, res, next) => {
  try {
    const app = getApp(req.params.id);
    if (!app) return res.status(404).json({ error: "App not found" });

    await nomad.restartJob(app.nomad_job_id);
    addActivity("apps", `Restarted app: ${app.name}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Delete app
router.delete("/:id", async (req, res, next) => {
  try {
    const app = getApp(req.params.id);
    if (!app) return res.status(404).json({ error: "App not found" });

    try {
      await nomad.stopJob(app.nomad_job_id);
    } catch {
      // Job may already be stopped
    }

    if (app.dns_record_ids && app.dns_record_ids.length > 0 && app.zone_id) {
      for (const recordId of app.dns_record_ids) {
        await cloudflare.deleteDNSRecord(app.zone_id, recordId).catch(() => {});
      }
    }

    try {
      await nomad.deleteVariable(`nomad/jobs/${app.id}`);
    } catch {
      // Variable may not exist
    }

    deleteAppFromDb(app.id);
    addActivity("apps", `Deleted app: ${app.name}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Docker Hub search proxy
router.get("/search/dockerhub", async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=10`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Docker Hub search failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data.results || []);
  } catch (err) {
    next(err);
  }
});

// GitHub repos search
router.get("/search/github-repos", async (_req, res, next) => {
  try {
    if (!github.isConfigured()) {
      return res.status(503).json({
        error: "GitHub integration not configured",
        suggestion: "Connect GitHub in Settings first.",
      });
    }

    const repos = await github.listRepos();
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

export default router;

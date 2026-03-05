import { Router } from "express";
import { getConfig, getRecentActivity, getAllIntegrations } from "../db.js";
import * as nomad from "../integrations/nomad.js";
import * as proxmox from "../integrations/proxmox.js";
import * as traefik from "../integrations/traefik.js";

const router = Router();

router.get("/", async (_req, res) => {
  const integrations = getAllIntegrations();
  const overview = {
    instanceName: getConfig("instance_name") || "Infra Pilot",
    nomad: null,
    proxmox: null,
    traefik: null,
    activity: getRecentActivity(10),
    integrations: integrations.map((i) => ({
      id: i.id,
      type: i.type,
      enabled: i.enabled,
    })),
  };

  const fetches = [];

  if (nomad.isConfigured()) {
    fetches.push(
      (async () => {
        try {
          const [jobs, nodes] = await Promise.all([
            nomad.listJobs(),
            nomad.listNodes(),
          ]);
          overview.nomad = {
            totalJobs: jobs.length,
            runningJobs: jobs.filter((j) => j.Status === "running").length,
            failedJobs: jobs.filter((j) => j.Status === "dead").length,
            nodeCount: nodes.length,
            healthyNodes: nodes.filter((n) => n.Status === "ready").length,
          };
        } catch (err) {
          overview.nomad = { error: err.message };
        }
      })()
    );
  }

  if (proxmox.isConfigured()) {
    fetches.push(
      (async () => {
        try {
          const nodes = await proxmox.listNodes();
          overview.proxmox = {
            nodeCount: nodes.length,
            nodes: nodes.map((n) => ({
              name: n.node,
              status: n.status,
              cpu: n.cpu,
              maxcpu: n.maxcpu,
              mem: n.mem,
              maxmem: n.maxmem,
            })),
          };
        } catch (err) {
          overview.proxmox = { error: err.message };
        }
      })()
    );
  }

  if (traefik.isConfigured()) {
    fetches.push(
      (async () => {
        try {
          const [routers, services] = await Promise.all([
            traefik.listRouters(),
            traefik.listServices(),
          ]);
          overview.traefik = {
            routerCount: routers.length,
            serviceCount: services.length,
          };
        } catch (err) {
          overview.traefik = { error: err.message };
        }
      })()
    );
  }

  await Promise.all(fetches);
  res.json(overview);
});

router.get("/activity", (req, res) => {
  const limit = parseInt(String(req.query.limit || "20"), 10);
  res.json(getRecentActivity(Math.min(limit, 100)));
});

export default router;

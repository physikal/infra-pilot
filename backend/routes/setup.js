import { Router } from "express";
import {
  isSetupComplete,
  setConfig,
  getConfig,
  saveIntegration,
  addActivity,
} from "../db.js";
import * as nomad from "../integrations/nomad.js";
import * as proxmox from "../integrations/proxmox.js";
import * as cloudflare from "../integrations/cloudflare.js";
import * as traefik from "../integrations/traefik.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({
    setupComplete: isSetupComplete(),
    instanceName: getConfig("instance_name") || null,
  });
});

router.post("/instance-name", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Instance name is required" });
  }
  setConfig("instance_name", name.trim());
  addActivity("setup", `Instance named: ${name.trim()}`);
  res.json({ ok: true });
});

router.post("/test/:integration", async (req, res) => {
  const { integration } = req.params;

  try {
    switch (integration) {
      case "nomad": {
        const { url, token } = req.body;
        if (!url) return res.status(400).json({ error: "URL is required" });
        const result = await nomad.testConnection(url, token);
        return res.json({ ok: true, data: { member: result.member?.Name } });
      }
      case "proxmox": {
        const { url, tokenId, tokenSecret } = req.body;
        if (!url || !tokenId || !tokenSecret) {
          return res
            .status(400)
            .json({ error: "URL, token ID, and secret are required" });
        }
        const result = await proxmox.testConnection(url, tokenId, tokenSecret);
        return res.json({ ok: true, data: result.data });
      }
      case "cloudflare": {
        const { apiToken } = req.body;
        if (!apiToken) {
          return res.status(400).json({ error: "API token is required" });
        }
        const result = await cloudflare.testConnection(apiToken);
        return res.json({ ok: true, data: { status: result.status } });
      }
      case "traefik": {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "URL is required" });
        const result = await traefik.testConnection(url);
        return res.json({ ok: true, data: result });
      }
      default:
        return res.status(400).json({ error: `Unknown integration: ${integration}` });
    }
  } catch (err) {
    return res.json({
      ok: false,
      error: err.message,
      suggestion: getSuggestion(integration, err),
    });
  }
});

router.post("/save/:integration", (req, res) => {
  const { integration } = req.params;
  const config = req.body;

  try {
    switch (integration) {
      case "nomad":
        saveIntegration("nomad", "nomad", {
          url: config.url,
          token: config.token || "",
        });
        break;
      case "proxmox":
        saveIntegration("proxmox", "proxmox", {
          url: config.url,
          node: config.node || "",
          tokenId: config.tokenId,
          tokenSecret: config.tokenSecret,
        });
        break;
      case "cloudflare":
        saveIntegration("cloudflare", "cloudflare", {
          apiToken: config.apiToken,
        });
        break;
      case "traefik":
        saveIntegration("traefik", "traefik", { url: config.url });
        break;
      default:
        return res.status(400).json({ error: `Unknown integration: ${integration}` });
    }

    addActivity("setup", `Configured ${integration} integration`);
    res.json({ ok: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Failed to save ${integration}: ${err.message}` });
  }
});

router.post("/complete", (_req, res) => {
  setConfig("setup_complete", "true");
  addActivity("setup", "Initial setup completed");
  res.json({ ok: true });
});

function getSuggestion(integration, err) {
  const msg = err.message.toLowerCase();

  if (msg.includes("econnrefused") || msg.includes("fetch failed")) {
    return `Cannot reach the ${integration} server. Check the URL and make sure the service is running.`;
  }
  if (msg.includes("401") || msg.includes("403")) {
    return `Authentication failed. Double-check your credentials.`;
  }
  if (msg.includes("certificate") || msg.includes("ssl")) {
    return `SSL/TLS error. If using self-signed certs, set NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production).`;
  }
  return `Connection failed. Verify the URL is correct and the service is accessible from this server.`;
}

export default router;

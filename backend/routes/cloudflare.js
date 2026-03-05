import { Router } from "express";
import { addActivity } from "../db.js";
import * as cloudflare from "../integrations/cloudflare.js";

const router = Router();

function requireCloudflare(_req, res, next) {
  if (!cloudflare.isConfigured()) {
    return res.status(503).json({
      error: "Cloudflare integration not configured",
      suggestion: "Go to Settings to configure your Cloudflare connection.",
    });
  }
  next();
}

router.use(requireCloudflare);

router.get("/zones", async (_req, res, next) => {
  try {
    res.json(await cloudflare.listZones());
  } catch (err) {
    next(err);
  }
});

router.get("/zones/:zoneId/records", async (req, res, next) => {
  try {
    res.json(await cloudflare.listDNSRecords(req.params.zoneId));
  } catch (err) {
    next(err);
  }
});

router.post("/zones/:zoneId/records", async (req, res, next) => {
  try {
    const { type, name, content, proxied, ttl } = req.body;
    if (!type || !name || !content) {
      return res
        .status(400)
        .json({ error: "type, name, and content are required" });
    }
    const result = await cloudflare.createDNSRecord(req.params.zoneId, {
      type,
      name,
      content,
      proxied,
      ttl,
    });
    addActivity("cloudflare", `Created ${type} record: ${name} -> ${content}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/zones/:zoneId/records/:recordId", async (req, res, next) => {
  try {
    const result = await cloudflare.updateDNSRecord(
      req.params.zoneId,
      req.params.recordId,
      req.body
    );
    addActivity("cloudflare", `Updated DNS record ${req.params.recordId}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/zones/:zoneId/records/:recordId", async (req, res, next) => {
  try {
    const result = await cloudflare.deleteDNSRecord(
      req.params.zoneId,
      req.params.recordId
    );
    addActivity("cloudflare", `Deleted DNS record ${req.params.recordId}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Quick-add: "Point domain -> IP"
router.post("/quick-add", async (req, res, next) => {
  try {
    const { zoneId, domain, ip } = req.body;
    if (!zoneId || !domain || !ip) {
      return res
        .status(400)
        .json({ error: "zoneId, domain, and ip are required" });
    }
    const result = await cloudflare.createDNSRecord(zoneId, {
      type: "A",
      name: domain,
      content: ip,
      proxied: false,
    });
    addActivity("cloudflare", `Quick-add: ${domain} -> ${ip}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

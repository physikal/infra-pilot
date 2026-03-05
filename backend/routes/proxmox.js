import { Router } from "express";
import { addActivity } from "../db.js";
import * as proxmox from "../integrations/proxmox.js";

const router = Router();

function requireProxmox(_req, res, next) {
  if (!proxmox.isConfigured()) {
    return res.status(503).json({
      error: "Proxmox integration not configured",
      suggestion: "Go to Settings to configure your Proxmox connection.",
    });
  }
  next();
}

router.use(requireProxmox);

router.get("/nodes", async (_req, res, next) => {
  try {
    res.json(await proxmox.listNodes());
  } catch (err) {
    next(err);
  }
});

router.get("/vms", async (_req, res, next) => {
  try {
    res.json(await proxmox.listAllVMs());
  } catch (err) {
    next(err);
  }
});

router.get("/nodes/:node/vms", async (req, res, next) => {
  try {
    res.json(await proxmox.listVMs(req.params.node));
  } catch (err) {
    next(err);
  }
});

router.post("/nodes/:node/vms/:vmid/start", async (req, res, next) => {
  try {
    const result = await proxmox.startVM(req.params.node, req.params.vmid);
    addActivity("proxmox", `Started VM ${req.params.vmid} on ${req.params.node}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/nodes/:node/vms/:vmid/stop", async (req, res, next) => {
  try {
    const result = await proxmox.stopVM(req.params.node, req.params.vmid);
    addActivity("proxmox", `Stopped VM ${req.params.vmid} on ${req.params.node}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/nodes/:node/vms/:vmid/restart", async (req, res, next) => {
  try {
    const result = await proxmox.restartVM(req.params.node, req.params.vmid);
    addActivity("proxmox", `Restarted VM ${req.params.vmid} on ${req.params.node}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/nodes/:node/vms/:vmid/status", async (req, res, next) => {
  try {
    res.json(await proxmox.getVMStatus(req.params.node, req.params.vmid));
  } catch (err) {
    next(err);
  }
});

router.post("/nodes/:node/vms", async (req, res, next) => {
  try {
    const { vmid, name, cores, memory, clone, ipconfig0 } = req.body;
    if (!vmid || !name) {
      return res
        .status(400)
        .json({ error: "vmid and name are required" });
    }

    const vmConfig = { vmid, name, cores: cores || 2, memory: memory || 2048 };
    if (clone) vmConfig.clone = clone;
    if (ipconfig0) vmConfig.ipconfig0 = ipconfig0;

    const result = await proxmox.createVM(req.params.node, vmConfig);
    addActivity("proxmox", `Created VM ${name} (${vmid}) on ${req.params.node}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

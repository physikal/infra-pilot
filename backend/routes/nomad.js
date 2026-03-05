import { Router } from "express";
import { addActivity } from "../db.js";
import * as nomad from "../integrations/nomad.js";

const router = Router();

function requireNomad(_req, res, next) {
  if (!nomad.isConfigured()) {
    return res.status(503).json({
      error: "Nomad integration not configured",
      suggestion: "Go to Settings to configure your Nomad connection.",
    });
  }
  next();
}

router.use(requireNomad);

router.get("/jobs", async (_req, res, next) => {
  try {
    res.json(await nomad.listJobs());
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    res.json(await nomad.getJob(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/deploy", async (req, res, next) => {
  try {
    const { hcl } = req.body;
    if (!hcl) return res.status(400).json({ error: "HCL job spec required" });
    const result = await nomad.deployJob(hcl);
    addActivity("nomad", `Deployed job: ${result.EvalID || "unknown"}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/:id/stop", async (req, res, next) => {
  try {
    const result = await nomad.stopJob(req.params.id);
    addActivity("nomad", `Stopped job: ${req.params.id}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/:id/restart", async (req, res, next) => {
  try {
    const result = await nomad.restartJob(req.params.id);
    addActivity("nomad", `Restarted job: ${req.params.id}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/:id/scale", async (req, res, next) => {
  try {
    const { group, count } = req.body;
    if (!group || count == null) {
      return res
        .status(400)
        .json({ error: "Group name and count are required" });
    }
    const result = await nomad.scaleJob(req.params.id, group, count);
    addActivity("nomad", `Scaled ${req.params.id}/${group} to ${count}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:id/allocations", async (req, res, next) => {
  try {
    res.json(await nomad.getJobAllocations(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get("/allocations/:allocId/logs", async (req, res, next) => {
  try {
    const { task, type } = req.query;
    if (!task) return res.status(400).json({ error: "task param required" });
    const logs = await nomad.getAllocationLogs(
      req.params.allocId,
      String(task),
      String(type || "stderr")
    );
    res.type("text/plain").send(logs);
  } catch (err) {
    next(err);
  }
});

router.get("/nodes", async (_req, res, next) => {
  try {
    res.json(await nomad.listNodes());
  } catch (err) {
    next(err);
  }
});

export default router;

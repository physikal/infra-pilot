import { Router } from "express";
import * as traefik from "../integrations/traefik.js";

const router = Router();

function requireTraefik(_req, res, next) {
  if (!traefik.isConfigured()) {
    return res.status(503).json({
      error: "Traefik integration not configured",
      suggestion: "Go to Settings to configure your Traefik connection.",
    });
  }
  next();
}

router.use(requireTraefik);

router.get("/routers", async (_req, res, next) => {
  try {
    res.json(await traefik.listRouters());
  } catch (err) {
    next(err);
  }
});

router.get("/services", async (_req, res, next) => {
  try {
    res.json(await traefik.listServices());
  } catch (err) {
    next(err);
  }
});

router.get("/overview", async (_req, res, next) => {
  try {
    res.json(await traefik.getOverview());
  } catch (err) {
    next(err);
  }
});

export default router;

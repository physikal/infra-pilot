import { Router } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import {
  getConfig,
  setConfig,
  getAllIntegrations,
  getIntegration,
  deleteIntegration,
  getPasswordHash,
  setPasswordHash,
  addActivity,
} from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  const integrations = getAllIntegrations();
  res.json({
    instanceName: getConfig("instance_name") || "Infra Pilot",
    passwordEnabled: Boolean(getPasswordHash()),
    integrations,
  });
});

router.patch("/instance-name", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required" });
  }
  setConfig("instance_name", name.trim());
  res.json({ ok: true });
});

router.get("/integrations/:id", (req, res) => {
  const integration = getIntegration(req.params.id);
  if (!integration) {
    return res.status(404).json({ error: "Integration not found" });
  }
  // Return config with secrets masked
  const masked = {};
  for (const [key, value] of Object.entries(integration.config)) {
    if (
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("password")
    ) {
      masked[key] =
        typeof value === "string" && value.length > 4
          ? `${"*".repeat(value.length - 4)}${value.slice(-4)}`
          : "****";
    } else {
      masked[key] = value;
    }
  }
  res.json({ ...integration, config: masked });
});

router.delete("/integrations/:id", (req, res) => {
  deleteIntegration(req.params.id);
  addActivity("settings", `Removed integration: ${req.params.id}`);
  res.json({ ok: true });
});

router.post("/password", (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  setPasswordHash(`${salt}:${hash}`);
  addActivity("settings", "Password protection enabled");
  res.json({ ok: true });
});

router.delete("/password", (_req, res) => {
  setConfig("password_hash", "");
  addActivity("settings", "Password protection disabled");
  res.json({ ok: true });
});

router.post("/verify-password", (req, res) => {
  const { password } = req.body;
  const stored = getPasswordHash();
  if (!stored) return res.json({ ok: true });

  const [salt, hash] = stored.split(":");
  const derived = scryptSync(password || "", salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");

  if (hashBuf.length !== derivedBuf.length) {
    return res.status(401).json({ error: "Invalid password" });
  }

  if (!timingSafeEqual(hashBuf, derivedBuf)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.json({ ok: true });
});

export default router;

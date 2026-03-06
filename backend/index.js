import express from "express";
import helmet from "helmet";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import setupRoutes from "./routes/setup.js";
import dashboardRoutes from "./routes/dashboard.js";
import nomadRoutes from "./routes/nomad.js";
import proxmoxRoutes from "./routes/proxmox.js";
import cloudflareRoutes from "./routes/cloudflare.js";
import traefikRoutes from "./routes/traefik.js";
import settingsRoutes from "./routes/settings.js";
import appsRoutes from "./routes/apps.js";
import githubRoutes from "./routes/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/setup", setupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/nomad", nomadRoutes);
app.use("/api/proxmox", proxmoxRoutes);
app.use("/api/cloudflare", cloudflareRoutes);
app.use("/api/traefik", traefikRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/apps", appsRoutes);
app.use("/api/github", githubRoutes);

const publicDir = join(__dirname, "public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/docs")) {
      return res.sendFile(join(publicDir, "docs", "index.html"));
    }
    res.sendFile(join(publicDir, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Infra Pilot running on http://0.0.0.0:${PORT}`);
});

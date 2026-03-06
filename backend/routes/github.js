import { Router } from "express";
import { getConfig, getIntegration, saveIntegration, addActivity } from "../db.js";
import * as github from "../integrations/github.js";

const router = Router();

router.get("/manifest", (_req, res) => {
  const instanceName = getConfig("instance_name") || "Infra Pilot";
  const baseUrl = getConfig("base_url") || "";

  const manifest = {
    name: `Infra Pilot - ${instanceName}`,
    url: baseUrl || "https://github.com/your-org/infrapilot",
    redirect_url: baseUrl
      ? `${baseUrl}/api/github/callback`
      : "",
    hook_attributes: { url: "", active: false },
    public: false,
    default_permissions: { contents: "read", metadata: "read" },
    default_events: [],
  };

  res.json(manifest);
});

router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Missing code parameter" });
  }

  try {
    const result = await github.exchangeManifestCode(code);

    saveIntegration("github", "github", {
      appId: result.id,
      privateKey: result.pem,
      webhookSecret: result.webhook_secret || "",
      clientId: result.client_id,
      clientSecret: result.client_secret,
      installationId: null,
      htmlUrl: result.html_url,
    });

    addActivity("github", "GitHub App connected via manifest flow");
    res.redirect("/settings?github=connected");
  } catch (err) {
    console.error("[GitHub Callback Error]", err.message);
    res.redirect(`/settings?github=error&message=${encodeURIComponent(err.message)}`);
  }
});

router.get("/status", async (_req, res) => {
  try {
    if (!github.isConfigured()) {
      return res.json({ connected: false });
    }

    let repoCount = 0;
    try {
      const repos = await github.listRepos();
      repoCount = repos.length;
    } catch {
      // Installation might not exist yet
    }

    const integration = getIntegration("github");
    const htmlUrl = integration?.config?.htmlUrl || "";
    res.json({ connected: true, repoCount, installUrl: htmlUrl ? `${htmlUrl}/installations/new` : "" });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

export default router;

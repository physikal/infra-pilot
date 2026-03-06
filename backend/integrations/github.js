// GitHub App API client (App Manifest flow)
// Docs: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps

import { createPrivateKey, createSign } from "node:crypto";
import { getIntegration, saveIntegration } from "../db.js";

let cachedToken = null;
let tokenExpiresAt = 0;

function getClient() {
  const integration = getIntegration("github");
  if (!integration || !integration.enabled) return null;
  return integration.config;
}

export function isConfigured() {
  return getClient() !== null;
}

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateJwt(appId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const payload = base64url(
    Buffer.from(
      JSON.stringify({ iat: now - 60, exp: now + 600, iss: String(appId) })
    )
  );
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey(privateKey);
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = base64url(sign.sign(key));
  return `${signingInput}.${signature}`;
}

async function ghApiFetch(path, options = {}) {
  const url = path.startsWith("https://")
    ? path
    : `https://api.github.com${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API error ${response.status}: ${body || response.statusText}`
    );
  }
  return response.json();
}

async function getInstallationToken() {
  const config = getClient();
  if (!config) throw new Error("GitHub integration not configured");

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const jwt = generateJwt(config.appId, config.privateKey);

  let installationId = config.installationId;
  if (!installationId) {
    const installations = await ghApiFetch("/app/installations", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (installations.length === 0) {
      throw new Error(
        "No GitHub App installations found. Install the app on your account first."
      );
    }
    installationId = installations[0].id;
    saveIntegration("github", "github", {
      ...config,
      installationId,
    });
  }

  const tokenData = await ghApiFetch(
    `/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  cachedToken = tokenData.token;
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

export async function ghFetch(path) {
  const token = await getInstallationToken();
  return ghApiFetch(path, {
    headers: { Authorization: `token ${token}` },
  });
}

export async function listRepos() {
  const data = await ghFetch("/installation/repositories");
  return data.repositories || [];
}

export async function getRepo(owner, repo) {
  return ghFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

export async function exchangeManifestCode(code) {
  return ghApiFetch(
    `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,
    { method: "POST" }
  );
}

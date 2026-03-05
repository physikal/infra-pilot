// Traefik API client
// Docs: https://doc.traefik.io/traefik/operations/api/

import { getIntegration } from "../db.js";

function getClient() {
  const integration = getIntegration("traefik");
  if (!integration || !integration.enabled) return null;
  return integration.config;
}

async function traefikFetch(path) {
  const config = getClient();
  if (!config) throw new Error("Traefik integration not configured");

  const url = `${config.url.replace(/\/$/, "")}/api${path}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Traefik API error ${response.status}`);
  }

  return response.json();
}

// https://doc.traefik.io/traefik/operations/api/#version
export async function testConnection(url) {
  const response = await fetch(
    `${url.replace(/\/$/, "")}/api/version`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!response.ok) {
    throw new Error(`Traefik returned ${response.status}`);
  }
  return response.json();
}

// https://doc.traefik.io/traefik/operations/api/#http-routers
export async function listRouters() {
  return traefikFetch("/http/routers");
}

// https://doc.traefik.io/traefik/operations/api/#http-services
export async function listServices() {
  return traefikFetch("/http/services");
}

// https://doc.traefik.io/traefik/operations/api/#overview
export async function getOverview() {
  return traefikFetch("/overview");
}

export function isConfigured() {
  return getClient() !== null;
}

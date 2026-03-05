// Cloudflare API client
// Docs: https://developers.cloudflare.com/api/

import { getIntegration } from "../db.js";

const CF_API = "https://api.cloudflare.com/client/v4";

function getClient() {
  const integration = getIntegration("cloudflare");
  if (!integration || !integration.enabled) return null;
  return integration.config;
}

async function cfFetch(path, options = {}) {
  const config = getClient();
  if (!config) throw new Error("Cloudflare integration not configured");

  const url = `${CF_API}${path}`;
  const headers = {
    Authorization: `Bearer ${config.apiToken}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  const json = await response.json();

  if (!json.success) {
    const errors = json.errors?.map((e) => e.message).join(", ") || "Unknown";
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return json.result;
}

// https://developers.cloudflare.com/api/operations/user-api-tokens-verify-token
export async function testConnection(apiToken) {
  const response = await fetch(`${CF_API}/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    signal: AbortSignal.timeout(10_000),
  });

  const json = await response.json();
  if (!json.success) {
    throw new Error("Invalid Cloudflare API token");
  }
  return json.result;
}

// https://developers.cloudflare.com/api/operations/zones-get
export async function listZones() {
  return cfFetch("/zones?per_page=50");
}

// https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-list-dns-records
export async function listDNSRecords(zoneId) {
  return cfFetch(
    `/zones/${encodeURIComponent(zoneId)}/dns_records?per_page=100`
  );
}

// https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-create-dns-record
export async function createDNSRecord(zoneId, record) {
  return cfFetch(
    `/zones/${encodeURIComponent(zoneId)}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        proxied: record.proxied ?? false,
        ttl: record.ttl || 1,
      }),
    }
  );
}

// https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-patch-dns-record
export async function updateDNSRecord(zoneId, recordId, record) {
  return cfFetch(
    `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        proxied: record.proxied,
        ttl: record.ttl,
      }),
    }
  );
}

// https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-delete-dns-record
export async function deleteDNSRecord(zoneId, recordId) {
  return cfFetch(
    `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
    { method: "DELETE" }
  );
}

export function isConfigured() {
  return getClient() !== null;
}

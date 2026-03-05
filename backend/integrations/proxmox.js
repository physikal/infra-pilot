// Proxmox VE API client
// Docs: https://pve.proxmox.com/pve-docs/api-viewer/

import { getIntegration } from "../db.js";

function getClient() {
  const integration = getIntegration("proxmox");
  if (!integration || !integration.enabled) return null;
  return integration.config;
}

async function pveRequest(path, options = {}) {
  const config = getClient();
  if (!config) throw new Error("Proxmox integration not configured");

  const baseUrl = config.url.replace(/\/$/, "");
  const url = `${baseUrl}/api2/json${path}`;

  const headers = {
    Authorization: `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Proxmox API error ${response.status}: ${body || response.statusText}`
    );
  }

  const json = await response.json();
  return json.data;
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/version
export async function testConnection(url, tokenId, tokenSecret) {
  const headers = {
    Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
  };

  const response = await fetch(
    `${url.replace(/\/$/, "")}/api2/json/version`,
    { headers, signal: AbortSignal.timeout(15_000) }
  );

  if (!response.ok) {
    throw new Error(`Proxmox returned ${response.status}`);
  }
  return response.json();
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes
export async function listNodes() {
  return pveRequest("/nodes");
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu
export async function listVMs(node) {
  return pveRequest(`/nodes/${encodeURIComponent(node)}/qemu`);
}

// List all VMs across all nodes
export async function listAllVMs() {
  const nodes = await listNodes();
  const results = [];

  for (const node of nodes) {
    const vms = await pveRequest(
      `/nodes/${encodeURIComponent(node.node)}/qemu`
    );
    for (const vm of vms) {
      results.push({ ...vm, node: node.node });
    }
  }

  return results;
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu/{vmid}/status/start
export async function startVM(node, vmid) {
  return pveRequest(
    `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/start`,
    { method: "POST" }
  );
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu/{vmid}/status/stop
export async function stopVM(node, vmid) {
  return pveRequest(
    `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/stop`,
    { method: "POST" }
  );
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu/{vmid}/status/reboot
export async function restartVM(node, vmid) {
  return pveRequest(
    `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/reboot`,
    { method: "POST" }
  );
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu/{vmid}/status/current
export async function getVMStatus(node, vmid) {
  return pveRequest(
    `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/current`
  );
}

// https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu
export async function createVM(node, config) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(config)) {
    body.append(key, String(value));
  }

  return pveRequest(
    `/nodes/${encodeURIComponent(node)}/qemu`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );
}

export function isConfigured() {
  return getClient() !== null;
}

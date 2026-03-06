const BASE = "/api";

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.suggestion = data.suggestion;
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  // Setup
  getSetupStatus: () => request("/setup/status"),
  setInstanceName: (name) =>
    request("/setup/instance-name", {
      method: "POST",
      body: { name },
    }),
  testIntegration: (type, config) =>
    request(`/setup/test/${type}`, {
      method: "POST",
      body: config,
    }),
  saveIntegration: (type, config) =>
    request(`/setup/save/${type}`, {
      method: "POST",
      body: config,
    }),
  completeSetup: () =>
    request("/setup/complete", { method: "POST" }),

  // Dashboard
  getDashboard: () => request("/dashboard"),

  // Nomad
  getNomadJobs: () => request("/nomad/jobs"),
  getNomadJob: (id) => request(`/nomad/jobs/${id}`),
  deployNomadJob: (hcl) =>
    request("/nomad/jobs/deploy", {
      method: "POST",
      body: { hcl },
    }),
  stopNomadJob: (id) =>
    request(`/nomad/jobs/${id}/stop`, { method: "POST" }),
  restartNomadJob: (id) =>
    request(`/nomad/jobs/${id}/restart`, { method: "POST" }),
  scaleNomadJob: (id, group, count) =>
    request(`/nomad/jobs/${id}/scale`, {
      method: "POST",
      body: { group, count },
    }),
  getNomadAllocations: (id) =>
    request(`/nomad/jobs/${id}/allocations`),
  getNomadNodes: () => request("/nomad/nodes"),

  // Proxmox
  getProxmoxNodes: () => request("/proxmox/nodes"),
  getProxmoxVMs: () => request("/proxmox/vms"),
  startProxmoxVM: (node, vmid) =>
    request(`/proxmox/nodes/${node}/vms/${vmid}/start`, {
      method: "POST",
    }),
  stopProxmoxVM: (node, vmid) =>
    request(`/proxmox/nodes/${node}/vms/${vmid}/stop`, {
      method: "POST",
    }),
  restartProxmoxVM: (node, vmid) =>
    request(`/proxmox/nodes/${node}/vms/${vmid}/restart`, {
      method: "POST",
    }),
  getProxmoxVMStatus: (node, vmid) =>
    request(`/proxmox/nodes/${node}/vms/${vmid}/status`),
  createProxmoxVM: (node, config) =>
    request(`/proxmox/nodes/${node}/vms`, {
      method: "POST",
      body: config,
    }),

  // Cloudflare
  getCloudflareZones: () => request("/cloudflare/zones"),
  getCloudflareDNS: (zoneId) =>
    request(`/cloudflare/zones/${zoneId}/records`),
  createCloudflareDNS: (zoneId, record) =>
    request(`/cloudflare/zones/${zoneId}/records`, {
      method: "POST",
      body: record,
    }),
  updateCloudflareDNS: (zoneId, recordId, record) =>
    request(`/cloudflare/zones/${zoneId}/records/${recordId}`, {
      method: "PATCH",
      body: record,
    }),
  deleteCloudflareDNS: (zoneId, recordId) =>
    request(`/cloudflare/zones/${zoneId}/records/${recordId}`, {
      method: "DELETE",
    }),
  cloudflareQuickAdd: (zoneId, domain, ip) =>
    request("/cloudflare/quick-add", {
      method: "POST",
      body: { zoneId, domain, ip },
    }),

  // Traefik
  getTraefikRouters: () => request("/traefik/routers"),
  getTraefikServices: () => request("/traefik/services"),
  getTraefikOverview: () => request("/traefik/overview"),

  // Apps
  getApps: () => request("/apps"),
  getApp: (id) => request(`/apps/${id}`),
  deployApp: (config) =>
    request("/apps", { method: "POST", body: config }),
  stopApp: (id) =>
    request(`/apps/${id}/stop`, { method: "POST" }),
  startApp: (id) =>
    request(`/apps/${id}/start`, { method: "POST" }),
  restartApp: (id) =>
    request(`/apps/${id}/restart`, { method: "POST" }),
  deleteApp: (id) =>
    request(`/apps/${id}`, { method: "DELETE" }),
  searchDockerHub: (q) => request(`/apps/search/dockerhub?q=${encodeURIComponent(q)}`),
  getGitHubRepos: () => request("/apps/search/github-repos"),

  // GitHub
  getGitHubStatus: () => request("/github/status"),
  getGitHubManifest: () => request("/github/manifest"),

  // Settings
  getSettings: () => request("/settings"),
  updateInstanceName: (name) =>
    request("/settings/instance-name", {
      method: "PATCH",
      body: { name },
    }),
  setBaseUrl: (url) =>
    request("/settings/base-url", {
      method: "PATCH",
      body: { url },
    }),
  getIntegrationDetails: (id) =>
    request(`/settings/integrations/${id}`),
  deleteIntegration: (id) =>
    request(`/settings/integrations/${id}`, { method: "DELETE" }),
  setPassword: (password) =>
    request("/settings/password", {
      method: "POST",
      body: { password },
    }),
  removePassword: () =>
    request("/settings/password", { method: "DELETE" }),
  verifyPassword: (password) =>
    request("/settings/verify-password", {
      method: "POST",
      body: { password },
    }),
};

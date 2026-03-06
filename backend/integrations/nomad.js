// Nomad HTTP API client
// Docs: https://developer.hashicorp.com/nomad/api-docs

import { getIntegration } from "../db.js";

function getClient() {
  const integration = getIntegration("nomad");
  if (!integration || !integration.enabled) {
    return null;
  }
  return integration.config;
}

async function nomadFetch(path, options = {}) {
  const config = getClient();
  if (!config) throw new Error("Nomad integration not configured");

  const url = `${config.url.replace(/\/$/, "")}/v1${path}`;
  const headers = { "Content-Type": "application/json" };
  if (config.token) {
    headers["X-Nomad-Token"] = config.token;
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Nomad API error ${response.status}: ${body || response.statusText}`
    );
  }

  return response.json();
}

// https://developer.hashicorp.com/nomad/api-docs/status
export async function testConnection(url, token) {
  const headers = {};
  if (token) headers["X-Nomad-Token"] = token;

  const response = await fetch(
    `${url.replace(/\/$/, "")}/v1/agent/self`,
    { headers, signal: AbortSignal.timeout(10_000) }
  );

  if (!response.ok) {
    throw new Error(`Nomad returned ${response.status}`);
  }
  return response.json();
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#list-jobs
export async function listJobs() {
  return nomadFetch("/jobs");
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#read-job
export async function getJob(jobId) {
  return nomadFetch(`/job/${encodeURIComponent(jobId)}`);
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#parse-job
// https://developer.hashicorp.com/nomad/api-docs/jobs#create-job
export async function deployJob(jobHcl) {
  const parsed = await nomadFetch("/jobs/parse", {
    method: "POST",
    body: JSON.stringify({ JobHCL: jobHcl, Canonicalize: true }),
  });

  return nomadFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({ Job: parsed }),
  });
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#stop-a-job
export async function stopJob(jobId) {
  return nomadFetch(`/job/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#restart-job
export async function restartJob(jobId) {
  const job = await getJob(jobId);
  return nomadFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({ Job: job }),
  });
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#scale-task-group
export async function scaleJob(jobId, group, count) {
  return nomadFetch(
    `/job/${encodeURIComponent(jobId)}/scale`,
    {
      method: "POST",
      body: JSON.stringify({
        Count: count,
        Target: { Group: group },
      }),
    }
  );
}

// https://developer.hashicorp.com/nomad/api-docs/jobs#list-job-allocations
export async function getJobAllocations(jobId) {
  return nomadFetch(`/job/${encodeURIComponent(jobId)}/allocations`);
}

// https://developer.hashicorp.com/nomad/api-docs/client#read-allocation-logs
export async function getAllocationLogs(allocId, taskName, logType = "stderr") {
  const config = getClient();
  if (!config) throw new Error("Nomad integration not configured");

  const url =
    `${config.url.replace(/\/$/, "")}/v1/client/fs/logs/` +
    `${encodeURIComponent(allocId)}` +
    `?task=${encodeURIComponent(taskName)}` +
    `&type=${logType}&plain=true`;

  const headers = {};
  if (config.token) headers["X-Nomad-Token"] = config.token;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Nomad logs error ${response.status}`);
  }
  return response.text();
}

// https://developer.hashicorp.com/nomad/api-docs/nodes#list-nodes
export async function listNodes() {
  return nomadFetch("/nodes");
}

// https://developer.hashicorp.com/nomad/api-docs/variables#create-variable
export async function putVariable(path, items) {
  return nomadFetch(`/var/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({ Path: path, Items: items }),
  });
}

// https://developer.hashicorp.com/nomad/api-docs/variables#delete-variable
export async function deleteVariable(path) {
  return nomadFetch(`/var/${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function isConfigured() {
  return getClient() !== null;
}

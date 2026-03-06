---
title: Nomad
description: Connect to your HashiCorp Nomad cluster.
---

Nomad is the core orchestrator for Infra Pilot. It's required for the App Platform and the Nomad management page.

## Configuration

| Field | Required | Description |
|-------|----------|-------------|
| API URL | Yes | Nomad HTTP API address (e.g., `http://192.168.1.100:4646`) |
| ACL Token | No | Required if Nomad ACLs are enabled |

## What Infra Pilot Uses

### Job Management

- **List jobs** — `GET /v1/jobs`
- **Get job detail** — `GET /v1/job/{id}`
- **Deploy job** — Parse HCL via `POST /v1/jobs/parse`, then `POST /v1/jobs`
- **Stop job** — `DELETE /v1/job/{id}`
- **Restart job** — Re-submit the existing job definition
- **Scale job** — `POST /v1/job/{id}/scale`

### Node Discovery

- **List nodes** — `GET /v1/nodes` — Used to discover worker IPs for DNS records and to determine available datacenters

### Allocations

- **List allocations** — `GET /v1/job/{id}/allocations`
- **Get allocation detail** — `GET /v1/allocation/{id}` — Used to resolve dynamic ports and node IPs for app access URLs
- **Read logs** — `GET /v1/client/fs/logs/{allocId}`

### Variables (Secrets)

- **Store env vars** — `PUT /v1/var/nomad/jobs/{appId}` — App environment variables stored here
- **Delete env vars** — `DELETE /v1/var/nomad/jobs/{appId}`

Apps read their environment variables at runtime via Nomad's template block, which sources values from the Variable path.

## ACL Token Permissions

If using Nomad ACLs, the token needs the following policies:

```hcl
namespace "default" {
  policy = "write"
  capabilities = ["submit-job", "read-job", "dispatch-job",
                   "read-logs", "alloc-exec", "alloc-lifecycle",
                   "scale-job", "list-jobs"]
  variables {
    path "nomad/jobs/*" {
      capabilities = ["write", "read", "destroy", "list"]
    }
  }
}

node {
  policy = "read"
}
```

## Nomad Page Features

The Nomad management page provides:

- **Jobs tab** — List all jobs with status, type, and action buttons. Expand a job to see its allocations. Jobs managed by the App Platform are tagged with an **"App"** badge that links to the app detail page.
- **Nodes tab** — List all cluster nodes with status, datacenter, and available drivers.
- **Deploy** — Paste raw HCL to deploy any job spec directly.

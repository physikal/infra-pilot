---
title: API Reference
description: All backend API endpoints.
---

All endpoints are prefixed with `/api`. Responses are JSON.

## Setup

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/setup/status` | Returns `{ setupComplete, instanceName }` |
| `POST` | `/setup/instance-name` | Set instance name. Body: `{ name }` |
| `POST` | `/setup/test/:type` | Test integration connection. Body: integration config |
| `POST` | `/setup/save/:type` | Save integration. Body: integration config |
| `POST` | `/setup/complete` | Mark setup as complete |

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard` | Aggregated stats from all integrations |

## Apps

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/apps` | List all apps |
| `GET` | `/apps/:id` | Get app detail + live Nomad status |
| `POST` | `/apps` | Deploy a new app |
| `POST` | `/apps/:id/stop` | Stop app (Nomad job) |
| `POST` | `/apps/:id/start` | Start app (re-deploy from config) |
| `POST` | `/apps/:id/restart` | Restart app (Nomad restart) |
| `DELETE` | `/apps/:id` | Delete app + DNS + Nomad variable |
| `GET` | `/apps/search/dockerhub?q=` | Search Docker Hub images |
| `GET` | `/apps/search/github-repos` | List accessible GitHub repos |

### Deploy App Body

```json
{
  "name": "my-app",
  "source_type": "docker_hub",
  "image": "nginx:latest",
  "source_meta": {},
  "cpu": 200,
  "memory": 256,
  "port": 80,
  "env_vars": { "KEY": "value" },
  "routing": "external",
  "domain": "myapp.example.com",
  "zone_id": "cloudflare-zone-id"
}
```

## Nomad

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/nomad/jobs` | List all jobs |
| `GET` | `/nomad/jobs/:id` | Get job detail |
| `POST` | `/nomad/jobs/deploy` | Deploy HCL job. Body: `{ hcl }` |
| `POST` | `/nomad/jobs/:id/stop` | Stop a job |
| `POST` | `/nomad/jobs/:id/restart` | Restart a job |
| `POST` | `/nomad/jobs/:id/scale` | Scale job. Body: `{ group, count }` |
| `GET` | `/nomad/jobs/:id/allocations` | List job allocations |
| `GET` | `/nomad/nodes` | List cluster nodes |

## Cloudflare

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cloudflare/zones` | List zones |
| `GET` | `/cloudflare/zones/:id/records` | List DNS records |
| `POST` | `/cloudflare/zones/:id/records` | Create DNS record |
| `PATCH` | `/cloudflare/zones/:id/records/:rid` | Update DNS record |
| `DELETE` | `/cloudflare/zones/:id/records/:rid` | Delete DNS record |
| `POST` | `/cloudflare/quick-add` | Create A record. Body: `{ zoneId, domain, ip }` |

## Traefik

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/traefik/routers` | List HTTP routers |
| `GET` | `/traefik/services` | List HTTP services |
| `GET` | `/traefik/overview` | Dashboard overview stats |

## Proxmox

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/proxmox/nodes` | List nodes |
| `GET` | `/proxmox/vms` | List all VMs |
| `POST` | `/proxmox/nodes/:node/vms/:vmid/start` | Start VM |
| `POST` | `/proxmox/nodes/:node/vms/:vmid/stop` | Stop VM |
| `POST` | `/proxmox/nodes/:node/vms/:vmid/restart` | Restart VM |
| `GET` | `/proxmox/nodes/:node/vms/:vmid/status` | VM status |
| `POST` | `/proxmox/nodes/:node/vms` | Create VM |

## GitHub

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/github/manifest` | Get GitHub App Manifest JSON |
| `GET` | `/github/callback?code=` | Handle manifest flow callback |
| `GET` | `/github/status` | Connection status + repo count + install URL |

## Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/settings` | Get instance config + integrations list |
| `PATCH` | `/settings/instance-name` | Update instance name. Body: `{ name }` |
| `PATCH` | `/settings/base-url` | Set base URL. Body: `{ url }` |
| `GET` | `/settings/integrations/:id` | Get integration detail (secrets masked) |
| `DELETE` | `/settings/integrations/:id` | Remove integration |
| `POST` | `/settings/password` | Set password. Body: `{ password }` |
| `DELETE` | `/settings/password` | Remove password protection |
| `POST` | `/settings/verify-password` | Verify password. Body: `{ password }` |

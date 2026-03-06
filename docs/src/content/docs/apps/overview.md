---
title: App Platform Overview
description: Deploy Docker containers with a guided experience.
---

The App Platform provides a DigitalOcean-like deployment experience for running Docker containers on your Nomad cluster. No HCL knowledge required.

## How It Works

1. **Pick a source** — Search Docker Hub for public images or select a repo from your connected GitHub account
2. **Configure** — Set app name, CPU/memory, port, and environment variables
3. **Choose routing** — Internal (cluster-only) or external (public HTTPS with auto DNS)
4. **Deploy** — Infra Pilot generates the Nomad job spec, creates DNS records if needed, stores secrets as Nomad Variables, and deploys

## What Gets Created

When you deploy an app, Infra Pilot:

- Generates an HCL job spec with Docker driver, dynamic ports, and resource limits
- Queries Nomad for available datacenters (no hardcoding)
- Stores environment variables as a **Nomad Variable** at `nomad/jobs/{app-id}` (read by the task at runtime via template block)
- Deploys the job through Nomad's parse + create API
- For **external routing**: creates Cloudflare DNS A records (one per eligible Nomad worker) and adds Traefik tags for HTTPS

## Quick Deploy Templates

The Apps page includes quick-start presets for popular images:

| App | Image | Port | Description |
|-----|-------|------|-------------|
| n8n | `n8nio/n8n` | 5678 | Workflow automation |
| Portainer | `portainer/portainer-ce` | 9000 | Container management |
| Uptime Kuma | `louislam/uptime-kuma` | 3001 | Monitoring tool |
| Gitea | `gitea/gitea` | 3000 | Self-hosted Git |

These are convenience presets — any Docker Hub image can be deployed through the wizard.

## App Lifecycle

Each app has a status:

| Status | Meaning |
|--------|---------|
| `running` | Nomad job is active and healthy |
| `stopped` | Job has been stopped, can be restarted |
| `deploying` | Job is being submitted to Nomad |
| `pending` | Job created in DB but not yet deployed |
| `failed` | Deployment encountered an error |

You can **stop**, **start**, **restart**, or **delete** any app from the list view or detail page.

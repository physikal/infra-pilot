---
title: Deploying Apps
description: Step-by-step guide to deploying your first app.
---

## The Deploy Wizard

Click **Deploy App** from the Apps page to open the 4-step wizard.

### Step 1: Source

Choose where your image comes from:

**Docker Hub** — Type a search query (e.g., "nginx", "postgres", "n8n") to search Docker Hub. Results show the image name, description, and whether it's an official image. Click a result to select it. You can also type an image reference directly (e.g., `nginx:alpine`).

**GitHub** — If you've connected a GitHub App, your accessible repos are listed. Select a repo, then provide an image reference (the repo's container image on GHCR, Docker Hub, etc.). Phase 1 requires a pre-built image — no build step.

### Step 2: Configure

- **App Name** — Auto-generated from the image name, but editable. Must be alphanumeric with hyphens, 2-63 characters. This becomes the Nomad job ID.
- **CPU (MHz)** — Select from presets: 100, 200, 500, 1000. This is the CPU allocation in Nomad.
- **Memory (MB)** — Select from presets: 128, 256, 512, 1024.
- **Container Port** — The port your application listens on inside the container. Nomad maps a dynamic host port to this.
- **Environment Variables** — Key-value pairs stored encrypted in the database and as Nomad Variables at runtime. Click "Add" to add rows.

### Step 3: Routing

**Internal** — The app is accessible within the Nomad cluster via service discovery. No DNS or Traefik configuration.

**External** — The app gets a public domain with HTTPS:

1. Select a DNS zone from your Cloudflare account
2. Enter a subdomain (e.g., `myapp`)
3. A preview shows the full URL (e.g., `https://myapp.example.com`)

External routing requires both **Cloudflare** and **Traefik** integrations configured.

### Step 4: Review

Review all settings and click **Deploy**. The wizard shows progress and any errors.

## What Happens During Deploy

1. App name is validated and slugified into an ID
2. If external routing: DNS A records are created in Cloudflare (one per eligible Nomad worker node)
3. Environment variables are stored as a Nomad Variable at `nomad/jobs/{app-id}`
4. An HCL job spec is generated with the Docker driver, resources, port mapping, and service tags
5. The job is parsed and submitted to Nomad
6. App is saved to the database with status `running`

If DNS record creation fails partway through, previously created records are rolled back automatically.

## Deploying from Quick Start

On the Apps page, click any quick-start preset (n8n, Portainer, Uptime Kuma, Gitea) to open the wizard pre-filled with the image, name, and port. You can modify anything before deploying.

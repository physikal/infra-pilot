---
title: Managing Apps
description: Stop, start, restart, and delete deployed apps.
---

## App List

The Apps page shows all deployed apps with:

- **Status dot** — Green (running), red (stopped/failed), amber (deploying/pending)
- **Name and image** — The app name and Docker image reference
- **Access URL** — A clickable link showing how to reach the app (for both internal and external apps)
- **Action buttons** — Restart, stop/start, and open link

Click any app row to open its detail view.

## Access URL

Every running app displays its access URL. Infra Pilot resolves this dynamically from Nomad:

- **External apps** — `https://{domain}` (the Cloudflare DNS domain you configured)
- **Internal apps** — `http://{node-ip}:{dynamic-port}` (resolved from the Nomad allocation's dynamically assigned host port and the worker node's IP)

The URL appears in the app list row (below the app name) and as a prominent card at the top of the app detail page.

If the app is stopped or the allocation hasn't started yet, no URL is shown.

## Actions

### Stop

Stops the Nomad job. The app's configuration remains in the database so it can be restarted. DNS records are preserved.

### Start

Re-deploys the app from its stored configuration. Generates a fresh HCL spec and submits it to Nomad.

### Restart

Restarts the running Nomad job by re-submitting the existing job definition. Faster than stop + start since it doesn't regenerate the HCL.

### Delete

Permanently removes the app:

1. Stops the Nomad job
2. Deletes all Cloudflare DNS records (using stored record IDs)
3. Deletes the Nomad Variable containing environment variables
4. Removes the app from the database

This action cannot be undone. A confirmation dialog is shown before proceeding.

## App Detail View

Navigate to `/apps/{id}` (or click an app row) to see:

- **Access URL** — Prominent card at the top with a clickable link to open the app
- **Status** — Current status with badge
- **Image** — Docker image reference
- **Resources** — CPU and memory allocation
- **Port** — Container port
- **Routing** — Internal or external
- **Domain** — Clickable link for external apps
- **Source** — Docker Hub or GitHub
- **Created** — When the app was first deployed

The detail view also provides stop, start, restart, and delete buttons.

## Nomad Page Cross-Reference

Apps deployed through the App Platform also appear as jobs on the Nomad page. These jobs are tagged with a small **"App"** badge linking back to the app detail page, so you always know which Nomad jobs are managed by the Apps system versus standalone HCL deployments.

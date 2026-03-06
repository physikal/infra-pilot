---
title: Setup Wizard
description: First-time configuration walkthrough.
---

When you first open Infra Pilot, you'll be guided through a setup wizard to configure your instance.

## Step 1: Instance Name

Choose a name for your Infra Pilot instance. This appears in the sidebar and is used when creating a GitHub App. Examples: "Homelab", "Production", "Dev Cluster".

## Step 2: Integrations

Configure connections to your infrastructure services. Each integration is tested before saving to ensure connectivity.

### Nomad (Required for App Deployments)

- **API URL** — Your Nomad server's HTTP address (e.g., `http://192.168.1.100:4646`)
- **ACL Token** — Optional. Required if Nomad ACLs are enabled

### Proxmox (Optional)

- **API URL** — Your Proxmox server's HTTPS address (e.g., `https://192.168.1.50:8006`)
- **API Token ID** — Format: `user@realm!token-name`
- **API Token Secret** — The token's secret value

### Cloudflare (Optional, Required for External Routing)

- **API Token** — A Cloudflare API token with DNS edit permissions for your zones

### Traefik (Optional)

- **API URL** — Traefik's API/dashboard address (e.g., `http://192.168.1.100:8080`)

## Step 3: Complete

After configuring at least one integration, click "Complete Setup" to finish. You can always add or reconfigure integrations later from the Settings page.

## Adding Integrations Later

Navigate to **Settings** and click **Add Integration** to configure services you skipped during setup. Click the refresh icon on any existing integration to reconfigure it.

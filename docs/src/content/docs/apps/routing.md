---
title: Routing
description: Internal vs external routing for deployed apps.
---

## Internal Routing

Apps deployed with **internal** routing are accessible within the Nomad cluster only. The Nomad service block uses `provider = "nomad"` for service discovery, but no Traefik tags are added.

Internal apps are useful for:

- Backend services that other apps connect to
- Databases and caches
- Services not meant to be publicly accessible

## External Routing

Apps deployed with **external** routing get a public domain with automatic HTTPS. This requires both **Cloudflare** and **Traefik** integrations to be configured.

### How It Works

1. **DNS records** — Infra Pilot queries Nomad for all `ready` + `eligible` worker nodes and creates one Cloudflare A record per node pointing the chosen subdomain to each worker's IP. Multiple A records provide DNS-level redundancy.

2. **Traefik tags** — The Nomad service block includes Traefik tags:
   - `traefik.enable=true`
   - `traefik.http.routers.{app-id}.rule=Host(\`{domain}\`)`
   - `traefik.http.routers.{app-id}.entrypoints=websecure`
   - `traefik.http.routers.{app-id}.tls.certresolver=letsencrypt`

3. **HTTPS** — Traefik automatically obtains a Let's Encrypt certificate for the domain and terminates TLS.

### Requirements

- **Cloudflare** integration configured with a DNS-edit capable API token
- **Traefik** running on your Nomad cluster with:
  - `websecure` entrypoint (port 443)
  - `letsencrypt` certificate resolver configured
  - Nomad catalog provider enabled (to discover services via tags)
- **DNS records** set to **DNS only** (not proxied through Cloudflare) — Traefik handles TLS directly

### DNS Record Cleanup

When an app is **deleted**, all associated DNS records are automatically removed from Cloudflare. The record IDs are stored in the database when created and cleaned up on deletion.

If DNS record creation fails partway during deployment, any records that were successfully created are rolled back.

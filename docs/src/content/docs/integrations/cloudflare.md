---
title: Cloudflare
description: Manage DNS records and enable external app routing.
---

Cloudflare integration enables DNS management and is required for external app routing.

## Configuration

| Field | Required | Description |
|-------|----------|-------------|
| API Token | Yes | Cloudflare API token with DNS edit permissions |

## Creating an API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit zone DNS** template, or create a custom token with:
   - **Permissions**: Zone > DNS > Edit
   - **Zone Resources**: Include the zones you want to manage
4. Copy the token and paste it into Infra Pilot's setup

## What Infra Pilot Uses

- **List zones** — `GET /zones` — Populates zone dropdowns in the app deploy wizard and Cloudflare page
- **List DNS records** — `GET /zones/{id}/dns_records` — Shows records on the Cloudflare page
- **Create DNS records** — `POST /zones/{id}/dns_records` — Used by app deployments and the quick-add feature
- **Update DNS records** — `PATCH /zones/{id}/dns_records/{id}`
- **Delete DNS records** — `DELETE /zones/{id}/dns_records/{id}` — Used during app deletion

## Cloudflare Page Features

The Cloudflare management page provides:

- **Zone selector** — Browse all zones accessible by your API token
- **DNS record list** — View all records with type, name, content, proxy status, and TTL
- **Create record** — Add new A, AAAA, CNAME, TXT, MX, or other record types
- **Edit/Delete** — Modify or remove existing records
- **Quick Add** — Shortcut to create an A record pointing a domain to an IP

## App Platform Integration

When deploying an app with external routing:

1. User selects a zone and enters a subdomain
2. Infra Pilot queries Nomad for eligible worker node IPs
3. Creates one A record per worker (proxied = false, for Traefik TLS)
4. Record IDs are stored in the app's database entry
5. On app deletion, all records are automatically cleaned up

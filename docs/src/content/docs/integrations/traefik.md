---
title: Traefik
description: Monitor reverse proxy routers and services.
---

Traefik integration provides visibility into your reverse proxy routing layer.

## Configuration

| Field | Required | Description |
|-------|----------|-------------|
| API URL | Yes | Traefik API address (e.g., `http://192.168.1.100:8080`) |

Traefik's API must be enabled. In your Traefik static configuration:

```yaml
api:
  dashboard: true
  insecure: true  # or secure with auth
```

## What Infra Pilot Uses

- **List HTTP routers** — `GET /api/http/routers` — Shows all configured routers
- **List HTTP services** — `GET /api/http/services` — Shows all backend services
- **Overview** — `GET /api/overview` — Summary statistics

## Traefik Page Features

The Traefik page provides a read-only view of:

- **Routers** — All HTTP routers with their rules, entrypoints, TLS status, and service bindings
- **Services** — All backend services with their load balancer targets and health

## Role in External Routing

Traefik is the entry point for externally-routed apps. When an app is deployed with external routing, the Nomad service block includes Traefik tags:

```
traefik.enable=true
traefik.http.routers.{app-id}.rule=Host(`app.example.com`)
traefik.http.routers.{app-id}.entrypoints=websecure
traefik.http.routers.{app-id}.tls.certresolver=letsencrypt
```

### Traefik Setup for App Platform

Your Traefik instance needs:

1. **Nomad catalog provider** — So Traefik discovers services registered in Nomad:
   ```yaml
   providers:
     nomad:
       endpoint:
         address: http://nomad-server:4646
         token: your-nomad-token  # if ACLs enabled
   ```

2. **Websecure entrypoint** — Port 443 for HTTPS:
   ```yaml
   entryPoints:
     websecure:
       address: ":443"
   ```

3. **Let's Encrypt cert resolver**:
   ```yaml
   certificatesResolvers:
     letsencrypt:
       acme:
         email: you@example.com
         storage: /letsencrypt/acme.json
         httpChallenge:
           entryPoint: web
   ```

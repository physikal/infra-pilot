---
title: Installation
description: How to install and run Infra Pilot.
---

Infra Pilot runs as a Docker container. You can deploy it on any Docker host, or run it as a Nomad job.

## Prerequisites

- Docker (any recent version)
- A Nomad cluster (for app deployments)
- Optionally: Cloudflare account, Traefik instance, Proxmox cluster

## Docker Run

The quickest way to get started:

```bash
docker run -d \
  --name infrapilot \
  -p 3000:3000 \
  -v /opt/infrapilot/data:/data \
  ghcr.io/physikal/infra-pilot:latest
```

Then open `http://your-host:3000` in your browser.

## Docker Compose

```yaml
services:
  infrapilot:
    image: ghcr.io/physikal/infra-pilot:latest
    container_name: infrapilot
    ports:
      - "3000:3000"
    volumes:
      - /opt/infrapilot/data:/data
    environment:
      - PORT=3000
      - DATA_DIR=/data
      - NODE_ENV=production
    restart: unless-stopped
```

## Nomad Job

For deploying Infra Pilot on a Nomad cluster:

```hcl
job "infrapilot" {
  datacenters = ["dc1"]
  type        = "service"

  group "infrapilot" {
    count = 1

    network {
      port "http" { static = 3000 }
    }

    task "infrapilot" {
      driver = "docker"

      config {
        image = "ghcr.io/physikal/infra-pilot:latest"
        ports = ["http"]
        volumes = [
          "/opt/infrapilot/data:/data",
        ]
      }

      env {
        PORT     = "3000"
        DATA_DIR = "/data"
        NODE_ENV = "production"
      }

      resources {
        cpu    = 200
        memory = 256
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `DATA_DIR` | `/data` | Directory for SQLite database and encryption key |
| `NODE_ENV` | `production` | Node.js environment |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for self-signed certs (Proxmox) |

## Persistent Data

Infra Pilot stores all state in the `DATA_DIR` directory:

- `infrapilot.db` — SQLite database (config, integrations, apps, activity log)
- `.server-secret` — Auto-generated encryption key for secrets

**Back up this directory** to preserve your configuration. The encryption key in `.server-secret` is required to decrypt stored integration credentials — if lost, you'll need to re-enter all integration configs.

## Health Check

Infra Pilot exposes a health endpoint:

```
GET /health
```

Returns `{"status":"ok","timestamp":"..."}` when the server is ready.

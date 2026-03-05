# Infra Pilot

Self-hosted infrastructure management portal for homelabs and small infrastructure stacks. Manages Nomad, Proxmox, Cloudflare DNS, and Traefik from a single dashboard.

Runs as a single Docker container with SQLite storage — no external database required.

## Quick Start

```bash
git clone https://github.com/<your-user>/infrapilot.git
cd infrapilot
sudo bash install.sh
```

The installer checks for Docker, builds the image, starts the container, and opens the setup wizard in your browser.

## Manual Docker Run

```bash
docker build -t infrapilot .
docker volume create infrapilot-data
docker run -d \
  --name infrapilot \
  --restart unless-stopped \
  -p 3000:3000 \
  -v infrapilot-data:/data \
  infrapilot
```

Open `http://your-server:3000` to start the setup wizard.

## Docker Compose

```bash
docker compose up -d
```

## Configuration

On first launch, a setup wizard walks you through connecting each integration:

- **Nomad** — cluster orchestration (jobs, nodes, allocations)
- **Proxmox** — VM management (start/stop/create)
- **Cloudflare** — DNS record management
- **Traefik** — reverse proxy routes and services

All API credentials are encrypted at rest with AES-256-GCM. The encryption key is generated on first run and stored in the data volume.

Skip any integration you don't use — reconfigure later from Settings.

## Updating

```bash
cd infrapilot
git pull
docker compose down
docker compose up -d --build
```

Or with the manual approach:

```bash
docker stop infrapilot && docker rm infrapilot
docker build -t infrapilot .
docker run -d --name infrapilot --restart unless-stopped \
  -p 3000:3000 -v infrapilot-data:/data infrapilot
```

Your configuration persists in the `infrapilot-data` volume.

## Backup

The SQLite database and encryption key are stored in the Docker volume:

```bash
docker run --rm -v infrapilot-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/infrapilot-backup.tar.gz /data
```

Restore:

```bash
docker run --rm -v infrapilot-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/infrapilot-backup.tar.gz -C /
```

## Environment Variables

See `.env.example` for all available options.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the app listens on |
| `DATA_DIR` | `/data` | Directory for SQLite DB and secrets |
| `NODE_ENV` | `production` | Node environment |

## Health Check

```bash
curl http://localhost:3000/health
```

Returns `{"status":"ok","timestamp":"..."}`.

## Architecture

```
backend/
  index.js              Express server
  db.js                 SQLite with encrypted credential storage
  crypto.js             AES-256-GCM encryption
  integrations/         API clients (one per service)
  routes/               Express route handlers
frontend/
  src/                  React + Tailwind UI
```

Each integration is a self-contained module in `backend/integrations/`. To add a new one, create the API client, add a route handler, and wire it into the setup wizard.

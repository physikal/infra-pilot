---
title: Configuration
description: Environment variables, database, and security settings.
---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `DATA_DIR` | `/data` | Directory for SQLite database and encryption key |
| `NODE_ENV` | `production` | Node.js environment |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` to accept self-signed certs (needed for Proxmox) |

## Data Directory

The `DATA_DIR` contains:

| File | Purpose |
|------|---------|
| `infrapilot.db` | SQLite database with all configuration, integrations, apps, and activity |
| `.server-secret` | Auto-generated encryption key (128 hex chars). Required to decrypt stored secrets |

### Backup

Back up the entire `DATA_DIR` to preserve your instance. Both files are needed — the database without the secret key means encrypted fields (integration credentials, app env vars) cannot be read.

### Migration

To move Infra Pilot to a new host:

1. Stop the container
2. Copy the entire `DATA_DIR` to the new host
3. Start the container with the same `DATA_DIR` path

## Password Protection

Infra Pilot optionally supports password protection:

- Set via **Settings** > **Password Protection**
- Passwords are hashed with scrypt (random salt, 64-byte derived key)
- Stored as `salt:hash` in the config table
- No username — single shared password

## Security Model

### Encryption at Rest

All integration credentials and app environment variables are encrypted using AES-256-GCM:

- Server secret auto-generated on first run
- Per-encryption random salt (32 bytes) and IV (16 bytes)
- Key derived via scrypt from server secret + salt
- Auth tag prevents tampering

### Network Security

Infra Pilot does **not** implement authentication middleware by default (beyond optional password). It's designed for internal/homelab networks. For public exposure:

- Put it behind a reverse proxy with authentication (e.g., Authelia, Authentik)
- Use a VPN (WireGuard, Tailscale)
- Enable password protection as a minimum

### Integration Credentials

Credentials are only stored encrypted and decrypted on-demand. The Settings page masks secrets when displaying integration details. Credentials are never sent to the frontend in plaintext — only masked versions for display.

## Docker Build

The Dockerfile uses a multi-stage build:

1. **Stage 1 (frontend-build)**: Installs frontend deps, runs `vite build`
2. **Stage 2 (docs-build)**: Installs Astro/Starlight deps, builds the documentation site
3. **Stage 3 (runtime)**: Installs backend deps (production only), copies backend code + built frontend + built docs at `/docs`
4. Uses `tini` as init process and Alpine for minimal image size
5. Health check built in via `wget` to `/health`

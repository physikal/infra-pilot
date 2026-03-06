---
title: Architecture
description: How Infra Pilot is structured internally.
---

## Overview

Infra Pilot is a monolithic Node.js application with a React frontend, bundled into a single Docker image.

```
┌─────────────────────────────────┐
│         Docker Container        │
│                                 │
│  ┌───────────────────────────┐  │
│  │    Express Server (:3000) │  │
│  │                           │  │
│  │  /api/setup    → setup.js │  │
│  │  /api/dashboard→ dash.js  │  │
│  │  /api/nomad    → nomad.js │  │
│  │  /api/proxmox  → prox.js  │  │
│  │  /api/cloudflare→ cf.js   │  │
│  │  /api/traefik  → tfk.js   │  │
│  │  /api/apps     → apps.js  │  │
│  │  /api/github   → gh.js    │  │
│  │  /api/settings → set.js   │  │
│  │  /docs/*       → Starlight│
│  │  /*            → SPA      │  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │   SQLite (better-sqlite3) │  │
│  │   /data/infrapilot.db     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Encryption Key          │  │
│  │   /data/.server-secret    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Project Structure

```
infrapilot/
├── backend/
│   ├── index.js              # Express server, route mounting
│   ├── db.js                 # SQLite schema, prepared statements, CRUD
│   ├── crypto.js             # AES-256-GCM encryption/decryption
│   ├── integrations/
│   │   ├── nomad.js          # Nomad HTTP API client
│   │   ├── cloudflare.js     # Cloudflare API client
│   │   ├── traefik.js        # Traefik API client
│   │   ├── proxmox.js        # Proxmox API client
│   │   └── github.js         # GitHub App API client (JWT auth)
│   ├── lib/
│   │   └── hcl.js            # HCL job spec generator
│   └── routes/
│       ├── setup.js          # First-time setup wizard
│       ├── dashboard.js      # Dashboard aggregation
│       ├── nomad.js          # Nomad job/node management
│       ├── proxmox.js        # Proxmox VM management
│       ├── cloudflare.js     # DNS record management
│       ├── traefik.js        # Router/service viewing
│       ├── apps.js           # App Platform CRUD + deploy
│       ├── github.js         # GitHub App Manifest flow
│       └── settings.js       # Instance settings + integrations
├── frontend/
│   └── src/
│       ├── api.js            # API client (fetch wrapper)
│       ├── App.jsx           # Router, sidebar, layout
│       └── pages/
│           ├── Dashboard.jsx
│           ├── NomadPage.jsx
│           ├── ProxmoxPage.jsx
│           ├── CloudflarePage.jsx
│           ├── TraefikPage.jsx
│           ├── AppsPage.jsx
│           ├── SettingsPage.jsx
│           └── SetupWizard.jsx
├── docs/                     # Starlight documentation site
├── Dockerfile                # Multi-stage build
└── infrapilot.nomad          # Nomad job spec for self-hosting
```

## Database Schema

### Tables

**config** — Key-value store for instance settings (instance name, setup status, base URL).

**integrations** — Stores integration credentials. The `config` column is encrypted JSON (AES-256-GCM).

**activity** — Audit log of actions (deployments, config changes, DNS operations).

**apps** — Deployed applications with full configuration, status, and DNS record tracking.

## Encryption

All sensitive data (integration credentials, app environment variables) is encrypted using AES-256-GCM:

1. A server secret is auto-generated on first run and stored in `/data/.server-secret`
2. Each encryption operation generates a random salt and IV
3. The key is derived from the server secret + salt using scrypt
4. The ciphertext, salt, IV, and auth tag are combined and base64-encoded

## Request Flow

1. Browser makes API call (e.g., `POST /api/apps`)
2. Express route handler validates input
3. Integration client makes upstream API call (e.g., Nomad, Cloudflare)
4. Result is stored in SQLite
5. Activity is logged
6. Response returned to browser

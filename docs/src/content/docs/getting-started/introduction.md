---
title: Introduction
description: What Infra Pilot is and why it exists.
---

Infra Pilot is an open-source infrastructure management portal designed for homelabs and small-scale deployments. It provides a unified web dashboard for managing containers, DNS records, reverse proxy routes, and virtual machines across multiple tools.

## The Problem

Running a homelab typically means juggling multiple UIs:

- **Nomad** for container orchestration
- **Cloudflare** for DNS management
- **Traefik** for reverse proxy and HTTPS
- **Proxmox** for VM management

Each tool has its own dashboard, API, and authentication. Deploying a new service means touching 3-4 different interfaces.

## The Solution

Infra Pilot brings these together into a single portal where you can:

- **Deploy apps** with a guided wizard — search Docker Hub, pick an image, configure resources, and deploy
- **Manage DNS** records across your Cloudflare zones
- **Monitor routing** through Traefik's routers and services
- **View and manage** Nomad jobs, allocations, and nodes
- **Control VMs** on Proxmox — start, stop, restart

## Key Features

- **App Platform** — DigitalOcean App Platform-like experience for deploying Docker containers to Nomad
- **External routing** — Auto-creates Cloudflare DNS records and Traefik HTTPS routing via Let's Encrypt
- **GitHub integration** — Connect via the App Manifest flow to deploy from your repos
- **Dynamic infrastructure** — No hardcoded IPs, hostnames, or cluster sizes. Adapts to your environment via APIs
- **Encrypted secrets** — Integration credentials and app environment variables are encrypted at rest
- **Single binary** — Ships as a single Docker image with an embedded SQLite database
- **Built-in docs** — Starlight documentation site served at `/docs` inside the same container

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express, better-sqlite3 |
| Frontend | React 19, Vite, Tailwind CSS, lucide-react |
| Database | SQLite with WAL mode |
| Encryption | AES-256-GCM with scrypt key derivation |
| Container | Alpine-based Docker image with tini |

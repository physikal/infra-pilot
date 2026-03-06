---
title: Proxmox
description: Manage virtual machines on your Proxmox cluster.
---

Proxmox integration provides VM management from the Infra Pilot dashboard.

## Configuration

| Field | Required | Description |
|-------|----------|-------------|
| API URL | Yes | Proxmox web UI address (e.g., `https://192.168.1.50:8006`) |
| Default Node | No | Proxmox node name (e.g., `pve`) |
| API Token ID | Yes | Format: `user@realm!token-name` (e.g., `root@pam!infrapilot`) |
| API Token Secret | Yes | The token's UUID secret |

## Creating an API Token

1. Log in to Proxmox web UI
2. Go to **Datacenter** > **Permissions** > **API Tokens**
3. Click **Add** and fill in:
   - **User**: Select the user (e.g., `root@pam`)
   - **Token ID**: A name for the token (e.g., `infrapilot`)
   - **Privilege Separation**: Uncheck for full access, or configure specific permissions
4. Copy the token ID and secret

## Self-Signed Certificates

Proxmox typically uses self-signed certificates. If you get SSL errors, set the environment variable on your Infra Pilot container:

```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This is already set in the default Nomad job spec. Not recommended for production environments with untrusted networks.

## Proxmox Page Features

- **Nodes** — List all Proxmox nodes with status and resource usage
- **VMs** — List all virtual machines across nodes
- **Actions** — Start, stop, and restart VMs
- **Status** — View individual VM status details
- **Create VM** — Create new virtual machines on a specific node

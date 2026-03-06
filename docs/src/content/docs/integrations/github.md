---
title: GitHub
description: Connect GitHub to deploy from your repositories.
---

GitHub integration uses the **App Manifest flow** for seamless setup. One click creates a GitHub App on your account with the right permissions.

## Setup Flow

1. Go to **Settings** in Infra Pilot
2. Set your **Base URL** (the URL where Infra Pilot is accessible from your browser, e.g., `http://192.168.1.100:3000`)
3. In the **GitHub** section, click **Connect GitHub**
4. You're redirected to GitHub where a pre-configured App is shown for approval
5. Click **Create GitHub App**
6. GitHub redirects back to Infra Pilot with the credentials
7. Click **Install on your repos** to grant the app access to your repositories

## Base URL

The Base URL is required for the GitHub callback to work. It must be reachable **from your browser** (not from GitHub's servers). This means:

- Internal/LAN URLs work fine (e.g., `http://192.168.1.100:3000`)
- The redirect happens in your browser, not server-to-server
- No public internet access required

## App Permissions

The created GitHub App requests minimal permissions:

| Permission | Level | Purpose |
|-----------|-------|---------|
| Contents | Read | Access repository files and metadata |
| Metadata | Read | List repositories |

No write access. No webhooks (Phase 1).

## Installation

After creating the GitHub App, you need to **install** it on your account or organization:

1. Infra Pilot shows an "Install on your repos" link after connection
2. Click it to go to GitHub's installation page
3. Choose **All repositories** or select specific ones
4. Click **Install**

The repo count on the Settings page updates once the app is installed.

## How Authentication Works

1. Infra Pilot generates a JWT from the stored `appId` and `privateKey` (RS256, 10-min expiry)
2. Uses the JWT to get an installation access token via GitHub API (valid 1 hour)
3. Caches the token and refreshes when expired
4. All API calls use the installation token

## Using GitHub in the Deploy Wizard

Once connected and installed:

1. Open the Deploy wizard and select **GitHub**
2. Your accessible repositories are listed
3. Select a repo, then provide the image reference (GHCR, Docker Hub, etc.)
4. The image must be pre-built — Phase 1 doesn't include a build step

## Disconnecting

To remove the GitHub integration, go to **Settings** > **Integrations** and delete the `github` integration. This removes stored credentials from Infra Pilot but does not delete the GitHub App — you can remove it from GitHub's settings at `https://github.com/settings/apps`.

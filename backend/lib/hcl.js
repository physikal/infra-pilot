// Generates Nomad HCL job specs for app deployments

import * as nomad from "../integrations/nomad.js";

async function getDatacenters() {
  try {
    const nodes = await nomad.listNodes();
    const dcs = [...new Set(nodes.map((n) => n.Datacenter))];
    return dcs.length > 0 ? dcs : ["dc1"];
  } catch {
    return ["dc1"];
  }
}

function escapeHcl(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildServiceBlock(app) {
  if (app.routing === "external" && app.domain) {
    return `
      service {
        name     = "${app.id}"
        port     = "http"
        provider = "nomad"

        tags = [
          "traefik.enable=true",
          "traefik.http.routers.${app.id}.rule=Host(\`${escapeHcl(app.domain)}\`)",
          "traefik.http.routers.${app.id}.entrypoints=websecure",
          "traefik.http.routers.${app.id}.tls.certresolver=letsencrypt",
        ]
      }`;
  }

  return `
      service {
        name     = "${app.id}"
        port     = "http"
        provider = "nomad"
      }`;
}

function buildEnvTemplate(appId) {
  return `
      template {
        data        = <<-EOT
          {{ range nomadVarItems "nomad/jobs/${appId}" }}
          {{ .Key }}={{ .Value }}
          {{ end }}
        EOT
        destination = "secrets/.env"
        env         = true
      }`;
}

export async function generateJobHcl(app) {
  const datacenters = await getDatacenters();
  const dcList = datacenters.map((dc) => `"${escapeHcl(dc)}"`).join(", ");
  const hasEnvVars =
    app.env_vars && Object.keys(app.env_vars).length > 0;

  return `job "${escapeHcl(app.id)}" {
  datacenters = [${dcList}]
  type        = "service"

  group "${escapeHcl(app.id)}" {
    count = 1

    network {
      port "http" {
        to = ${app.port || 80}
      }
    }

    task "${escapeHcl(app.id)}" {
      driver = "docker"

      config {
        image = "${escapeHcl(app.image)}"
        ports = ["http"]
      }

      resources {
        cpu    = ${app.cpu || 200}
        memory = ${app.memory || 256}
      }
${hasEnvVars ? buildEnvTemplate(app.id) : ""}
${buildServiceBlock(app)}
    }
  }
}
`;
}

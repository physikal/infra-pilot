job "infrapilot" {
  datacenters = ["dc1"]
  type        = "service"

  constraint {
    attribute = "${node.unique.name}"
    value     = "nomad-wkr-01"
  }

  meta {
    deploy_version = "13"
  }

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

        auth {
          username = "physikal"
          password = "${GHCR_TOKEN}"
        }

        volumes = [
          "/opt/infrapilot/data:/data",
        ]
      }

      template {
        destination = "secrets/ghcr.env"
        env         = true
        data        = <<TMPL
GHCR_TOKEN={{ with nomadVar "nomad/jobs/infrapilot" }}{{ .token }}{{ end }}
TMPL
      }

      env {
        PORT                          = "3000"
        DATA_DIR                      = "/data"
        NODE_ENV                      = "production"
        NODE_TLS_REJECT_UNAUTHORIZED  = "0"
      }

      resources {
        cpu    = 200
        memory = 256
      }
    }
  }
}

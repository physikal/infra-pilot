#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="infrapilot"
IMAGE_NAME="infrapilot"
PORT=3000
DATA_VOLUME="infrapilot-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$1" >&2; }
fatal() { error "$1"; exit 1; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    fatal "This script must be run as root. Try: sudo bash install.sh"
  fi
}

detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_ID_LIKE="${ID_LIKE:-}"
  else
    fatal "Cannot detect OS. /etc/os-release not found."
  fi
}

install_docker() {
  if command -v docker &>/dev/null; then
    ok "Docker is already installed: $(docker --version)"
    return
  fi

  info "Docker not found. Installing..."

  case "$OS_ID" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/${OS_ID} \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io
      ;;
    fedora|rhel|centos|rocky|almalinux)
      dnf install -y -q dnf-plugins-core
      dnf config-manager --add-repo \
        https://download.docker.com/linux/fedora/docker-ce.repo
      dnf install -y -q docker-ce docker-ce-cli containerd.io
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm docker
      ;;
    *)
      if [[ "$OS_ID_LIKE" == *debian* ]]; then
        info "Debian-like OS detected, attempting Ubuntu install method..."
        apt-get update -qq
        apt-get install -y -qq docker.io
      elif [[ "$OS_ID_LIKE" == *rhel* ]] || [[ "$OS_ID_LIKE" == *fedora* ]]; then
        info "RHEL-like OS detected, attempting Fedora install method..."
        dnf install -y -q docker
      else
        fatal "Unsupported OS: ${OS_ID}. Install Docker manually: https://docs.docker.com/engine/install/"
      fi
      ;;
  esac

  systemctl enable --now docker
  ok "Docker installed successfully"
}

detect_host_ip() {
  HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  if [[ -z "$HOST_IP" ]]; then
    HOST_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || true)
  fi
  if [[ -z "$HOST_IP" ]]; then
    HOST_IP="localhost"
    warn "Could not detect host IP. Using localhost."
  fi
}

stop_existing() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    info "Stopping existing ${CONTAINER_NAME} container..."
    docker stop "$CONTAINER_NAME" &>/dev/null || true
    docker rm "$CONTAINER_NAME" &>/dev/null || true
    ok "Removed existing container"
  fi
}

build_and_run() {
  info "Building Infra Pilot image..."

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  if [[ -f "${script_dir}/Dockerfile" ]]; then
    docker build -t "$IMAGE_NAME" "$script_dir"
  else
    fatal "Dockerfile not found. Clone the repo first: git clone <repo-url> && cd infrapilot && sudo bash install.sh"
  fi

  info "Starting Infra Pilot container..."
  docker volume create "$DATA_VOLUME" &>/dev/null || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${PORT}:3000" \
    -v "${DATA_VOLUME}:/data" \
    -e NODE_ENV=production \
    -e DATA_DIR=/data \
    "$IMAGE_NAME"

  ok "Container started"
}

wait_for_healthy() {
  info "Waiting for Infra Pilot to start..."
  local retries=30
  while [[ $retries -gt 0 ]]; do
    if curl -sf "http://localhost:${PORT}/health" &>/dev/null; then
      ok "Infra Pilot is running"
      return
    fi
    retries=$((retries - 1))
    sleep 1
  done
  fatal "Infra Pilot did not start within 30 seconds. Check logs: docker logs ${CONTAINER_NAME}"
}

open_browser() {
  local url="http://${HOST_IP}:${PORT}"
  printf "\n"
  printf "${GREEN}================================================${NC}\n"
  printf "${GREEN}  Infra Pilot is ready!${NC}\n"
  printf "${GREEN}  Open: ${url}${NC}\n"
  printf "${GREEN}================================================${NC}\n"
  printf "\n"

  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" 2>/dev/null || true
  fi
}

main() {
  printf "\n"
  printf "${BLUE}  Infra Pilot Installer${NC}\n"
  printf "${BLUE}  =====================${NC}\n"
  printf "\n"

  check_root
  detect_os
  install_docker
  detect_host_ip
  stop_existing
  build_and_run
  wait_for_healthy
  open_browser
}

main "$@"

#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/amarktai}"
STORAGE_ROOT="${AMARKTAI_STORAGE_ROOT:-$APP_ROOT/storage}"
VENV_DIR="${AMARKTAI_PYTHON_VENV:-$APP_ROOT/.venv}"
QDRANT_DIR="${QDRANT_DATA_DIR:-$APP_ROOT/qdrant}"
RHUBARB_DIR="${RHUBARB_DIR:-$APP_ROOT/tools/rhubarb}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root or with sudo."
  exit 1
fi

apt-get update
apt-get install -y redis-server python3 python3-venv python3-pip ffmpeg curl unzip
systemctl enable --now redis-server

mkdir -p "$STORAGE_ROOT"/{artifacts,jobs,logs,memory,research} "$QDRANT_DIR" "$RHUBARB_DIR"
chown -R "${APP_USER:-www-data}:${APP_GROUP:-www-data}" "$STORAGE_ROOT" "$QDRANT_DIR" "$RHUBARB_DIR"

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install scrapy trafilatura

cd "$APP_ROOT"
npx playwright install --with-deps chromium

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the managed Qdrant service. Install Docker, then rerun the Qdrant command in docs/FINAL_VPS_INSTALL_PLAN.md."
else
  docker rm -f amarktai-qdrant >/dev/null 2>&1 || true
  docker run -d --name amarktai-qdrant --restart unless-stopped -p 127.0.0.1:6333:6333 -v "$QDRANT_DIR:/qdrant/storage" qdrant/qdrant:latest
fi

if [[ ! -x "$RHUBARB_DIR/rhubarb" ]]; then
  echo "Rhubarb Lip Sync is not installed automatically because release assets vary by architecture."
  echo "Install the correct release binary at $RHUBARB_DIR/rhubarb and set RHUBARB_PATH."
fi

redis-cli ping
ffmpeg -version | head -n 1
"$VENV_DIR/bin/python" -c 'import scrapy, trafilatura; print("Python crawler stack ready")'
node -e 'require("playwright"); console.log("Playwright ready")'
curl -fsS http://127.0.0.1:6333/readyz >/dev/null && echo "Qdrant ready" || true
echo "Open-source stack checks complete."

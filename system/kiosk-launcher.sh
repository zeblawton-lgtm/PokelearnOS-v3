#!/usr/bin/env bash
# =============================================================================
# kiosk-launcher.sh — PokéLearnOS v3 kiosk launcher (Node.js / Vite edition)
#
# Adapted from the v2 Python/FastAPI launcher. The backend is now a Node.js
# Express server that also serves the pre-built Vite frontend.
#
# Invoked by pokelearnos.service (systemd user unit for the kids account).
#
# Sequence:
#   1. Kill any stale Node process on the backend port.
#   2. Start the Express backend (NODE_ENV=production) in background.
#   3. Wait up to 15s for GET /api/healthz to return HTTP 200.
#   4. exec Chromium in kiosk mode — replaces this process so systemd tracks
#      Chromium's PID directly. Restart=on-failure covers browser crashes.
#
# Wayland vs X11:
#   Auto-detected via WAYLAND_DISPLAY. --ozone-platform wayland is added when
#   a Wayland session is present. No manual editing required.
#
# HiDPI (Dell Inspiron 7306, 4K 13.3"):
#   --force-device-scale-factor=0.7
#   GNOME already HiDPI-scales the 4K panel (~200%). A Chromium factor of 2
#   double-scaled the UI (huge, needed manual zoom). On-device tuning on
#   2026-05-25 settled on 0.7. Change this and run install.sh again if needed.
#
# This script must stay under /opt/pokelearnos/system/ — owned root:root,
# not writable by the kids user.
# =============================================================================

set -euo pipefail

INSTALL_DIR="${POKELEARNOS_INSTALL:-/opt/pokelearnos}"
KIDS_HOME="${HOME:-/home/kids}"
BACKEND_HOST="127.0.0.1"
BACKEND_PORT="${PORT:-8765}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}/api/healthz"
BACKEND_TIMEOUT=15   # seconds to wait for /api/healthz before aborting

log() { echo "[pokelearnos] $*"; }
die() { echo "[pokelearnos] FATAL: $*" >&2; exit 1; }

log "kiosk-launcher starting — install dir: ${INSTALL_DIR}"

# ---------------------------------------------------------------------------
# 0. Kill any stale Node process from a previous systemd restart cycle
# ---------------------------------------------------------------------------
if ss -tlnp "sport = :${BACKEND_PORT}" 2>/dev/null | grep -q ":${BACKEND_PORT}"; then
  log "WARNING: Port ${BACKEND_PORT} already in use — killing prior process."
  fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
  sleep 0.5
fi

# ---------------------------------------------------------------------------
# 1. Locate Node.js binary
# ---------------------------------------------------------------------------
NODE_BIN=""
for candidate in \
    "${INSTALL_DIR}/runtime/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node" \
    "$(command -v node 2>/dev/null || true)"; do
  if [[ -x "$candidate" ]]; then
    NODE_BIN="$candidate"
    break
  fi
done

[[ -z "$NODE_BIN" ]] && die "node not found. Run install.sh first."
log "Node.js binary: ${NODE_BIN} ($(${NODE_BIN} --version))"

# ---------------------------------------------------------------------------
# 2. Start the Express backend
# ---------------------------------------------------------------------------
cd "${INSTALL_DIR}"

# Load .env if present (LLM_PROVIDER, DATABASE_URL, etc.)
# NOTE: Phase 4 TODO from v2 still applies — when LLM API keys are added,
# restructure so .env variables are NOT inherited by Chromium.
if [[ -f "${INSTALL_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${INSTALL_DIR}/.env"
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-sqlite:${KIDS_HOME}/.local/share/pokelearnos/db.sqlite}"
mkdir -p "$(dirname "${DATABASE_URL#sqlite:}")"

APP_ENV=kiosk \
NODE_ENV=production \
PORT="${BACKEND_PORT}" \
POKELEARNOS_INSTALL="${INSTALL_DIR}" \
  "${NODE_BIN}" "${INSTALL_DIR}/api-dist/index.mjs" \
  &
BACKEND_PID=$!
log "Backend PID: ${BACKEND_PID}"

# ---------------------------------------------------------------------------
# 3. Wait for the backend /api/healthz endpoint
# ---------------------------------------------------------------------------
log "Waiting up to ${BACKEND_TIMEOUT}s for backend /api/healthz ..."
ELAPSED=0
READY=false
while [[ $ELAPSED -lt $BACKEND_TIMEOUT ]]; do
  if curl -fsS --max-time 1 "${BACKEND_URL}" > /dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 0.5
  ELAPSED=$(( ELAPSED + 1 ))
done

if ! $READY; then
  log "ERROR: Backend did not respond within ${BACKEND_TIMEOUT}s — killing and exiting."
  kill "${BACKEND_PID}" 2>/dev/null || true
  exit 1
fi

log "Backend is healthy. Launching Chromium kiosk."

# ---------------------------------------------------------------------------
# 4. Build Chromium flags
# ---------------------------------------------------------------------------
CHROMIUM_FLAGS=(
  # Core kiosk mode — no address bar, no tabs, no chrome UI
  --kiosk
  # App URL — backend serves both API (/api/*) and Vite frontend (/)
  "--app=http://${BACKEND_HOST}:${BACKEND_PORT}/"
  --no-first-run

  # HiDPI — 4K panel at 13.3" (3840×2160, ~331 PPI).
  # GNOME already HiDPI-scales (~200%); Chromium factor 2 double-scaled.
  # On-device tuning 2026-05-25: 0.7 is correct. See kiosk-launcher header.
  --force-device-scale-factor=0.7

  # Touch
  --touch-events=enabled
  --enable-touch-drag-drop

  # Prevent escape gestures
  --disable-pinch
  --overscroll-history-navigation=0

  # Audio — allow autoplay so TTS and feedback audio work without gesture
  --autoplay-policy=no-user-gesture-required

  # Isolated Chromium profile for the kiosk session.
  # NOTE: must NOT be a hidden dot-directory — snap confinement blocks those,
  # Chromium then silently falls back to its default profile (which on this
  # machine still carried the v2 service-worker cache). snap/chromium/common
  # is always writable by the chromium snap.
  --user-data-dir="${KIDS_HOME}/snap/chromium/common/pokelearnos-kiosk"

  # Disable UI chrome that has no place in a kiosk
  --disable-features=TranslateUI
  --no-default-browser-check
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-restore-session-state

  # No crash/metrics reporting
  --disable-breakpad
  --disable-domain-reliability
  --metrics-recording-only
)

# Wayland vs X11 auto-detection
if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
  log "Wayland session detected (WAYLAND_DISPLAY=${WAYLAND_DISPLAY})"
  CHROMIUM_FLAGS+=(--ozone-platform=wayland)
elif [[ -n "${DISPLAY:-}" ]]; then
  log "X11 session detected (DISPLAY=${DISPLAY})"
else
  log "WARNING: Neither WAYLAND_DISPLAY nor DISPLAY is set — Chromium may fail."
fi

# Locate the Chromium binary (snap or .deb)
CHROMIUM_BIN=""
for candidate in \
    /snap/bin/chromium \
    /usr/bin/chromium \
    /usr/bin/chromium-browser \
    /usr/bin/google-chrome; do
  if [[ -x "$candidate" ]]; then
    CHROMIUM_BIN="$candidate"
    break
  fi
done

[[ -z "$CHROMIUM_BIN" ]] && die "Chromium binary not found. Run install.sh first."
log "Launching: ${CHROMIUM_BIN} (kiosk mode)"

# ---------------------------------------------------------------------------
# 5. exec Chromium — replaces this process; PID tracked by systemd
# ---------------------------------------------------------------------------
mkdir -p "${KIDS_HOME}/snap/chromium/common/pokelearnos-kiosk"
exec "${CHROMIUM_BIN}" "${CHROMIUM_FLAGS[@]}"

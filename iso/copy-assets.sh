#!/usr/bin/env bash
# PokelearnOS Asset Copy Script
# Copies the built application into the chroot filesystem
CHROOT="${1:?Usage: copy-assets.sh <chroot-path>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
set -euo pipefail

DEST="$CHROOT/opt/pokelearnos"
mkdir -p "$DEST"

echo "Building production frontend..."
cd "$APP_DIR"
NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/pokelearnos run build 2>&1 || {
  echo "WARNING: Frontend build failed - using existing dist if available"
}

echo "Copying application files..."
# Copy built frontend
cp -r artifacts/pokelearnos/dist "$DEST/public" 2>/dev/null || true

# Copy backend
cp -r artifacts/api-server/dist "$DEST/api-dist" 2>/dev/null || {
  echo "Building api-server..."
  pnpm --filter @workspace/api-server run build
  cp -r artifacts/api-server/dist "$DEST/api-dist"
}

# Copy system scripts
cp -r system "$DEST/system"
chmod +x "$DEST/system/"*.sh

# Copy content files
mkdir -p "$DEST/content"
cp artifacts/pokelearnos/src/content/*.ts "$DEST/content/" 2>/dev/null || true

# Copy package manifest for node_modules
cp artifacts/api-server/package.json "$DEST/"

# Create data directory
mkdir -p "$CHROOT/var/lib/pokelearnos"
chown -R 1000:1000 "$CHROOT/var/lib/pokelearnos" 2>/dev/null || true

# Create startup wrapper that serves static files too
cat > "$DEST/system/kiosk-launcher.sh" << 'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-8765}"
LOG_DIR="/var/log/pokelearnos"
mkdir -p "$LOG_DIR"
APP_DIR="/opt/pokelearnos"

DATABASE_URL="sqlite:///var/lib/pokelearnos/pokelearnos.db" \
APP_ENV=kiosk HOST=127.0.0.1 PORT="$PORT" \
node "$APP_DIR/api-dist/index.mjs" >> "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

for i in $(seq 1 20); do
  curl -sf "http://127.0.0.1:$PORT/api/healthz" > /dev/null 2>&1 && break
  sleep 1
done

xset s off; xset -dpms; xset s noblank
unclutter -idle 2 -root &

chromium-browser --kiosk --no-first-run --disable-infobars \
  --force-device-scale-factor=2 --touch-events=enabled \
  --enable-touch-drag-drop --overscroll-history-navigation=0 \
  "http://127.0.0.1:$PORT/" >> "$LOG_DIR/chromium.log" 2>&1

kill "$BACKEND_PID" 2>/dev/null || true
LAUNCHER
chmod +x "$DEST/system/kiosk-launcher.sh"

echo "Assets copied to $DEST"

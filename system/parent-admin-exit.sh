#!/usr/bin/env bash
# Emergency parent exit from kiosk mode
# Usage: Run in a separate terminal or bind to a hidden key sequence
# Default: Ctrl+Alt+F2 to get a TTY, login as parent, run this script
set -euo pipefail

echo "PokelearnOS Parent Exit"
echo "Enter parent PIN to stop kiosk:"
read -rs PIN

HASH=$(echo -n "${PIN}pokelearnos" | sha256sum | cut -d' ' -f1)
KIDS_USER="${KIDS_USER:-kids}"
KIDS_HOME="/home/${KIDS_USER}"
DB="${DATABASE_URL:-sqlite:${KIDS_HOME}/.local/share/pokelearnos/db.sqlite}"
DB="${DB#sqlite:}"

if [ -f "$DB" ]; then
  STORED=$(sqlite3 "$DB" "SELECT value FROM settings WHERE key='parent_pin_hash' LIMIT 1" 2>/dev/null || echo "")
  if [ -z "$STORED" ]; then
    # Default hash for "1234"
    STORED="c1e32e60c71a7bbce3b6b9ee6f7fba76a847ab63038eeece7e94b7c57553a3aa"
  fi
  if [ "$HASH" = "$STORED" ]; then
    echo "PIN verified. Stopping kiosk..."
    KIDS_UID="$(id -u "${KIDS_USER}")"
    sudo -u "${KIDS_USER}" XDG_RUNTIME_DIR="/run/user/${KIDS_UID}" \
      systemctl --user stop pokelearnos.service
    pkill -u "${KIDS_USER}" chromium 2>/dev/null || true
    pkill -u "${KIDS_USER}" chromium-browser 2>/dev/null || true
    echo "Kiosk stopped. Type 'sudo -u ${KIDS_USER} XDG_RUNTIME_DIR=/run/user/${KIDS_UID} systemctl --user start pokelearnos.service' to restart."
  else
    echo "Incorrect PIN."
    exit 1
  fi
else
  echo "Database not found at $DB"
  exit 1
fi

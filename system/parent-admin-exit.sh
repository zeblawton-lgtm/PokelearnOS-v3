#!/usr/bin/env bash
# Emergency parent exit from kiosk mode
# Usage: Run in a separate terminal or bind to a hidden key sequence
# Default: Ctrl+Alt+F2 to get a TTY, login as parent, run this script
set -euo pipefail

echo "PokelearnOS Parent Exit"
echo "Enter parent PIN to stop kiosk:"
read -rs PIN

HASH=$(echo -n "${PIN}pokelearnos" | sha256sum | cut -d' ' -f1)
DB="/var/lib/pokelearnos/pokelearnos.db"

if [ -f "$DB" ]; then
  STORED=$(sqlite3 "$DB" "SELECT value FROM settings WHERE key='parent_pin_hash' LIMIT 1" 2>/dev/null || echo "")
  if [ -z "$STORED" ]; then
    # Default hash for "1234"
    STORED="c1e32e60c71a7bbce3b6b9ee6f7fba76a847ab63038eeece7e94b7c57553a3aa"
  fi
  if [ "$HASH" = "$STORED" ]; then
    echo "PIN verified. Stopping kiosk..."
    systemctl stop pokelearnos.service
    pkill chromium-browser 2>/dev/null || true
    echo "Kiosk stopped. Type 'sudo systemctl start pokelearnos.service' to restart."
  else
    echo "Incorrect PIN."
    exit 1
  fi
else
  echo "Database not found at $DB"
  exit 1
fi

#!/usr/bin/env bash
# =============================================================================
# install-relaunch-icon.sh — desktop icon that relaunches the PokéLearnOS kiosk
#
# Run as root (called by install.sh, or manually):
#   sudo bash system/install-relaunch-icon.sh
#
# Creates /home/kids/Desktop/relaunch-pokelearnos.desktop. The icon restarts
# pokelearnos.service in the kids user's own systemd manager — no password
# needed. Visible whenever Chromium is not fullscreen on top (e.g. after the
# kiosk app is closed); a tap brings the kiosk back without a reboot.
#
# IDEMPOTENCY: Re-running this script is safe.
# =============================================================================

set -euo pipefail

KIDS_USER="kids"
KIDS_HOME="/home/${KIDS_USER}"
KIDS_UID="$(id -u "${KIDS_USER}")"
DESKTOP_DIR="${KIDS_HOME}/Desktop"
DESKTOP_FILE="${DESKTOP_DIR}/relaunch-pokelearnos.desktop"

[[ "${EUID}" -eq 0 ]] || { echo "Run as root: sudo bash $0" >&2; exit 1; }

mkdir -p "${DESKTOP_DIR}"

cat > "${DESKTOP_FILE}" << 'EOF'
[Desktop Entry]
Type=Application
Name=Relaunch PokéLearnOS
Comment=Restart the PokéLearnOS kiosk app
Exec=systemctl --user restart pokelearnos.service
Icon=/opt/pokelearnos/web/logo.png
Terminal=false
Categories=Education;
EOF

chmod +x "${DESKTOP_FILE}"
chown -R "${KIDS_USER}:${KIDS_USER}" "${DESKTOP_DIR}"

# GNOME desktop icons require the file to be marked trusted ("Allow Launching").
sudo -u "${KIDS_USER}" \
  XDG_RUNTIME_DIR="/run/user/${KIDS_UID}" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${KIDS_UID}/bus" \
  gio set "${DESKTOP_FILE}" metadata::trusted true 2>/dev/null || \
  echo "[WARN] Could not mark icon trusted — right-click it on the kiosk and choose 'Allow Launching'."

echo "[OK] Relaunch icon installed at ${DESKTOP_FILE}"

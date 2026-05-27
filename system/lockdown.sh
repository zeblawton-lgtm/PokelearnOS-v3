#!/usr/bin/env bash
# PokelearnOS Kiosk Lockdown Script
# Hardens the system for child-safe kiosk operation on Dell Inspiron 7306
# Run as root during system setup
set -euo pipefail

KIOSK_USER="pokelearnos"
APP_DIR="/opt/pokelearnos"
DATA_DIR="/var/lib/pokelearnos"
LOG_DIR="/var/log/pokelearnos"

echo "=== PokelearnOS Lockdown ==="

# Create kiosk user if not exists
if ! id "$KIOSK_USER" &>/dev/null; then
  useradd -r -m -d "/home/$KIOSK_USER" -s /bin/bash "$KIOSK_USER"
  echo "Created user: $KIOSK_USER"
fi

# Create data and log directories
mkdir -p "$DATA_DIR" "$LOG_DIR"
chown -R "$KIOSK_USER:$KIOSK_USER" "$DATA_DIR" "$LOG_DIR"
chmod 750 "$DATA_DIR"

# Set app directory permissions (read-only for kiosk user)
if [ -d "$APP_DIR" ]; then
  chown -R root:root "$APP_DIR"
  chmod -R 755 "$APP_DIR"
  # Allow kiosk user to run launcher
  chmod 755 "$APP_DIR/system/kiosk-launcher.sh"
fi

# Disable unnecessary services
systemctl disable --now bluetooth 2>/dev/null || true
systemctl disable --now cups 2>/dev/null || true
systemctl disable --now avahi-daemon 2>/dev/null || true

# Configure GDM autologin
GDM_CONF="/etc/gdm3/custom.conf"
if [ -f "$GDM_CONF" ]; then
  cp system/autologin.conf "$GDM_CONF"
  echo "Configured GDM autologin"
fi

# Block keyboard shortcuts that could escape kiosk
mkdir -p /etc/dconf/db/local.d
cat > /etc/dconf/db/local.d/00-pokelearnos << 'EOF'
[org/gnome/desktop/lockdown]
disable-lock-screen=true
disable-log-out=true
disable-user-switching=true

[org/gnome/desktop/screensaver]
lock-enabled=false
idle-activation-enabled=false

[org/gnome/settings-daemon/plugins/media-keys]
screensaver=[]
logout=[]
EOF
dconf update 2>/dev/null || true

# Install and enable systemd service
cp system/kiosk.service /etc/systemd/system/pokelearnos.service
sed -i "s|/opt/pokelearnos|$APP_DIR|g" /etc/systemd/system/pokelearnos.service
systemctl daemon-reload
systemctl enable pokelearnos.service
echo "Installed pokelearnos.service"

# Set up .xinitrc for kiosk user
cat > "/home/$KIOSK_USER/.xinitrc" << 'EOF'
#!/bin/sh
exec /opt/pokelearnos/system/kiosk-launcher.sh
EOF
chmod +x "/home/$KIOSK_USER/.xinitrc"

echo ""
echo "=== Lockdown complete ==="
echo "Reboot to activate kiosk mode."
echo "Parent PIN default: 1234 (change via admin panel)"

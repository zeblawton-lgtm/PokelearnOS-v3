#!/usr/bin/env bash
# PokelearnOS Chroot Customization
# Called by build-iso.sh — installs packages and configures the chroot environment
CHROOT="${1:?Usage: chroot-customize.sh <chroot-path>}"
set -euo pipefail

# Mount virtual filesystems
mount --bind /dev "$CHROOT/dev"
mount --bind /proc "$CHROOT/proc"
mount --bind /sys "$CHROOT/sys"

cleanup() {
  umount "$CHROOT/sys" 2>/dev/null || true
  umount "$CHROOT/proc" 2>/dev/null || true
  umount "$CHROOT/dev" 2>/dev/null || true
}
trap cleanup EXIT

# Write apt sources
cat > "$CHROOT/etc/apt/sources.list" << EOF
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOF

chroot "$CHROOT" bash << 'INNERSCRIPT'
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y --no-install-recommends \
  linux-image-generic \
  live-boot \
  systemd-sysv \
  xorg \
  openbox \
  lightdm \
  chromium-browser \
  nodejs \
  npm \
  curl \
  sqlite3 \
  fonts-noto \
  pulseaudio \
  xdg-utils \
  xdotool \
  unclutter

# Create kiosk user
useradd -m -s /bin/bash -G audio,video,input pokelearnos

# Configure LightDM autologin
mkdir -p /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-pokelearnos.conf << EOF
[SeatDefaults]
autologin-user=pokelearnos
autologin-user-timeout=0
user-session=openbox
EOF

# Configure openbox autostart
mkdir -p /home/pokelearnos/.config/openbox
cat > /home/pokelearnos/.config/openbox/autostart << 'EOF'
# Hide mouse cursor after 2s idle
unclutter -idle 2 -root &
# Start kiosk
/opt/pokelearnos/system/kiosk-launcher.sh &
EOF
chown -R pokelearnos:pokelearnos /home/pokelearnos/.config

# Enable services
systemctl enable lightdm

# Clean up
apt-get clean
rm -rf /var/lib/apt/lists/*
INNERSCRIPT

echo "Chroot customization complete."

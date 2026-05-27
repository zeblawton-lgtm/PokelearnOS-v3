# PokelearnOS ISO Build Guide

## Overview

The `iso/` directory contains scripts to build a bootable Ubuntu-based ISO image
for deploying PokelearnOS as a locked-down kiosk on the Dell Inspiron 7306.

## Prerequisites

ISO building **cannot be done inside Replit** due to privilege requirements.
Run these scripts in one of:

- A local Ubuntu 22.04+ machine
- Docker with `--privileged` flag
- A VM (VirtualBox, VMWare, QEMU)
- A GitHub Actions runner with `ubuntu-latest`

Required tools:
```bash
sudo apt-get install debootstrap xorriso squashfs-tools grub-pc-bin
```

Required disk space: ~10 GB free

## Build Steps

```bash
# 1. Clone or export the repository
git clone <repo-url> pokelearnos
cd pokelearnos

# 2. Install Node.js dependencies
pnpm install

# 3. Build the application
pnpm --filter @workspace/pokelearnos run build
pnpm --filter @workspace/api-server run build

# 4. Run the ISO build (requires root)
sudo bash iso/build-iso.sh
```

Output: `dist/pokelearnos.iso`

## Flash to USB

```bash
# Replace /dev/sdX with your USB drive (check with lsblk)
sudo dd if=dist/pokelearnos.iso of=/dev/sdX bs=4M status=progress
sync
```

## Deploy to Dell Inspiron 7306

1. Insert the USB drive
2. Boot the laptop and press F12 for boot menu
3. Select USB boot
4. The system will boot directly into PokelearnOS kiosk mode
5. On first boot, the app seeds the database with Ash (age 5) and Misty (age 3)
6. Default parent PIN: **1234** — change this immediately via the parent overlay

## Architecture

```
PokelearnOS ISO Boot Sequence:
  UEFI → GRUB → Ubuntu live system
  → LightDM autologin (pokelearnos user)
  → OpenBox session
  → kiosk-launcher.sh
  → Node.js backend (127.0.0.1:8765)
  → Chromium kiosk (fullscreen, touch enabled, 200% DPI)
```

## Kiosk Escape (Parent)

To exit kiosk mode without the on-screen PIN:
1. Press **Ctrl+Alt+F2** to switch to TTY2
2. Login as the parent user
3. Run: `sudo systemctl stop pokelearnos.service`
4. Return to graphical session: **Ctrl+Alt+F7**

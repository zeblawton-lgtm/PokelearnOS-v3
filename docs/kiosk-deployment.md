# Kiosk Deployment Guide — Dell Inspiron 7306

## Target Hardware

| Component | Spec |
|-----------|------|
| Device | Dell Inspiron 7306 2-in-1 |
| CPU | Intel Core i7-1165G7 (11th Gen) |
| Display | 13.3" touchscreen, 3840×2160 native |
| Required Scaling | 200% (--force-device-scale-factor=2) |
| RAM | 16 GB |
| Storage | 477 GB NVMe |
| Wi-Fi | Intel Wi-Fi 6 AX201 |

## Option A: Run from USB / Fresh Install

1. Build the ISO: see `iso/README.md`
2. Flash to USB: `sudo dd if=dist/pokelearnos.iso of=/dev/sdX bs=4M status=progress`
3. Boot the Dell laptop from USB (F12 at boot → select USB)
4. System boots directly into PokelearnOS kiosk

## Option B: Install Alongside Existing Ubuntu

```bash
# 1. Clone repo to /opt/pokelearnos
sudo git clone <repo> /opt/pokelearnos
cd /opt/pokelearnos

# 2. Install Node.js 20+
sudo apt-get install -y nodejs npm

# 3. Install dependencies and build
pnpm install
pnpm --filter @workspace/api-server run build

# 4. Run lockdown script
sudo bash system/lockdown.sh

# 5. Configure DATABASE_URL (edit kiosk.service)
# sudo systemctl edit pokelearnos.service
# Add: Environment=DATABASE_URL=postgresql://... (or SQLite path)

# 6. Reboot
sudo reboot
```

## Touch Screen Configuration

Chromium is launched with `--touch-events=enabled`. On Ubuntu, the touchscreen
should work out of the box with the HID driver. If touches are inverted:

```bash
# Find the touchscreen input ID
xinput list

# Apply coordinate transform
xinput set-prop <id> "Coordinate Transformation Matrix" 1 0 0 0 1 0 0 0 1
```

## 4K Scaling (200%)

The kiosk launcher sets `--force-device-scale-factor=2` for Chromium.
The app uses Nunito font at large sizes and 100px+ touch targets — optimized for this.

## Kiosk Security

The `system/lockdown.sh` script:
- Creates a dedicated `pokelearnos` user (no sudo)
- Configures GDM autologin
- Disables lock screen, log-out, user switching
- Disables Bluetooth, CUPS, and Avahi
- Binds backend to 127.0.0.1 only (not accessible over network)

## Escape from Kiosk (Parent)

**On-screen:** Tap the lock icon → enter PIN → End Session

**Physical keyboard (emergency):**
1. Ctrl+Alt+F2 → login as parent user
2. `sudo systemctl stop pokelearnos.service`
3. Ctrl+Alt+F7 to return to GUI

## Database (Kiosk Mode)

In kiosk mode the app uses SQLite at `/var/lib/pokelearnos/pokelearnos.db`.
Progress is stored locally and persists across reboots.

To reset all data:
```bash
sudo rm /var/lib/pokelearnos/pokelearnos.db
sudo systemctl restart pokelearnos.service
# App will re-seed on first startup
```

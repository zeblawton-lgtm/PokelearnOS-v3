# Kiosk Deployment Guide — Dell Inspiron 7306

## Target Hardware

| Component | Spec |
|-----------|------|
| Device | Dell Inspiron 7306 2-in-1 |
| CPU | Intel Core i7-1165G7 (11th Gen) |
| Display | 13.3" touchscreen, 3840×2160 native |
| Required Scaling | GNOME HiDPI + Chromium `--force-device-scale-factor=0.7` |
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
# 1. Clone repo anywhere writable by the parent/admin user
git clone <repo> pokelearnos-v3
cd pokelearnos-v3

# 2. Run the installer from the repository root
sudo bash scripts/install.sh

# 3. Apply kiosk lockdown
sudo bash system/kiosk-lockdown.sh

# 4. Reboot
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

## 4K Scaling

The kiosk launcher sets `--force-device-scale-factor=0.7` for Chromium on top
of GNOME's HiDPI scaling. Touch targets are sized for the 13.3" 4K panel.

## Kiosk Security

The installer plus `system/kiosk-lockdown.sh`:
- Creates a dedicated `kids` user with no shell, no password, and no sudo
- Configures GDM autologin
- Disables lock screen, log-out, user switching
- Disables Bluetooth, CUPS, and Avahi
- Binds backend to 127.0.0.1 only (not accessible over network)

## Escape from Kiosk (Parent)

**On-screen:** Tap the lock icon → enter PIN → End Session

**Physical keyboard (emergency):**
1. Ctrl+Alt+F2 → login as parent user
2. `sudo -u kids XDG_RUNTIME_DIR=/run/user/$(id -u kids) systemctl --user stop pokelearnos.service`
3. Ctrl+Alt+F7 to return to GUI

## Database (Kiosk Mode)

In kiosk mode the app uses SQLite at `/home/kids/.local/share/pokelearnos/db.sqlite`.
Progress is stored locally and persists across reboots.

To reset all data:
```bash
sudo rm /home/kids/.local/share/pokelearnos/db.sqlite
sudo -u kids XDG_RUNTIME_DIR=/run/user/$(id -u kids) systemctl --user restart pokelearnos.service
# App will re-seed on first startup
```

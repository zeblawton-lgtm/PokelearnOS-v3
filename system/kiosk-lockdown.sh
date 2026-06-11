#!/usr/bin/env bash
# =============================================================================
# kiosk-lockdown.sh — PokéLearnOS v3 post-install kiosk hardening
#
# Ported and adapted from PokéLearnOS v2 (Python/FastAPI edition).
# Run as root on the 7306 AFTER install.sh has completed.
#
#   sudo bash system/kiosk-lockdown.sh
#
# WHAT THIS SCRIPT DOES:
#   Step 1:  Verify pre-conditions (root, Ubuntu 26.04, kids user exists)
#   Step 2:  Configure GDM3 autologin for the kids user
#   Step 3:  Disable GNOME screen lock and screensaver (system dconf db)
#   Step 4:  Block keyboard shortcuts that escape the kiosk (via dconf)
#   Step 5:  Disable GNOME session features kids should not reach
#   Step 6:  Remove desktop entries that should not appear
#   Step 7:  Mask TTY gettys tty2–tty6 (TTY switching blocked)
#   Step 8:  Install polkit rules (50-kids.rules)
#   Step 9:  Configure iio-sensor-proxy to lock orientation to landscape
#   Step 10: Disable Bluetooth (not needed for kiosk)
#   Step 11: Mask systemd sleep/suspend/hibernate targets
#   Step 12: Configure logind — ignore lid close and power button
#
# IDEMPOTENCY: Re-running this script is safe.
#
# WHAT YOU MUST DO AFTER THIS SCRIPT:
#   a. Reboot the device.
#   b. Verify: kids user auto-logs in and PokéLearnOS kiosk launches.
#   c. Test the PIN escape (5-second corner hold) works as the parent (Zulu).
# =============================================================================

set -euo pipefail

KIDS_USER="kids"
INSTALL_DIR="/opt/pokelearnos"
POLKIT_RULES_SRC="${INSTALL_DIR}/system/50-kids.rules"
POLKIT_RULES_DEST="/etc/polkit-1/rules.d/50-kids.rules"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step()  { echo ""; echo "============================================================="; echo "  STEP $*"; echo "============================================================="; }
info()  { echo "    $*"; }
ok()    { echo "    [OK] $*"; }
warn()  { echo "    [WARN] $*"; }
die()   { echo "FATAL: $*" >&2; exit 1; }

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "Run as root: sudo bash system/kiosk-lockdown.sh"
}

# Run a dconf command as the kids user (requires a running D-Bus session).
# In a live session this works. At install time without a session, use
# dconf compile + gsettings-data-convert fallback.
dconf_kids() {
  local key="$1" val="$2"
  sudo -u "${KIDS_USER}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u "${KIDS_USER}")/bus" \
    dconf write "${key}" "${val}" 2>/dev/null || \
    warn "dconf write ${key} failed (no session bus?). Apply manually or reboot and re-run."
}

# ---------------------------------------------------------------------------
# Step 1 — Pre-conditions
# ---------------------------------------------------------------------------
step "1: Pre-conditions"

require_root

if ! grep -q 'VERSION_ID="26.04"' /etc/os-release 2>/dev/null; then
  warn "Not Ubuntu 26.04. Proceeding anyway — some steps may differ."
fi

id "${KIDS_USER}" &>/dev/null || die "User '${KIDS_USER}' not found. Run install.sh first."
[[ -d "${INSTALL_DIR}" ]] || die "${INSTALL_DIR} not found. Run install.sh first."

ok "Pre-conditions passed."

# ---------------------------------------------------------------------------
# Step 2 — GDM3 autologin
# ---------------------------------------------------------------------------
step "2: GDM3 autologin for '${KIDS_USER}'"

GDM_CONF="/etc/gdm3/custom.conf"
GDM_CONF_DIR="$(dirname "${GDM_CONF}")"

mkdir -p "${GDM_CONF_DIR}"
cat > "${GDM_CONF}" << EOF
# PokéLearnOS — managed by kiosk-lockdown.sh
[daemon]
AutomaticLoginEnable=True
AutomaticLogin=${KIDS_USER}

[security]
DisableUserList=True

[xdmcp]
Enable=False

[chooser]
EOF

ok "GDM3 autologin configured for ${KIDS_USER}."

# ---------------------------------------------------------------------------
# Step 3 — Disable screen lock and screensaver for kids
# ---------------------------------------------------------------------------
step "3: Disable screen lock and screensaver"

# These settings MUST live in a system dconf database. Text keyfiles under
# ~/.config/dconf/ are never read by anything — ~/.config/dconf/user is a
# binary GVDB that only the dconf daemon writes. (Earlier revisions of this
# script wrote per-user text keyfiles there; they were silently ignored,
# which left GNOME's default 5-minute idle lock active — fatal for the
# password-locked kids account, since no password can ever unlock it.)
command -v dconf >/dev/null 2>&1 || die "dconf CLI not found — install dconf-cli first"

DCONF_DB_DIR="/etc/dconf/db/pokelearnos.d"
mkdir -p "${DCONF_DB_DIR}/locks" /etc/dconf/profile

# Session profile: the writable per-user db first, then our kiosk db.
# The locks below force the kiosk values even where a user db already has
# overrides. Note: this profile applies to every desktop session on the
# machine (the parent account too) — acceptable on a dedicated kiosk.
cat > /etc/dconf/profile/user << 'PROFILE_EOF'
user-db:user
system-db:pokelearnos
PROFILE_EOF

cat > "${DCONF_DB_DIR}/00-kiosk" << 'KEYFILE_EOF'
[org/gnome/desktop/screensaver]
lock-enabled=false
idle-activation-enabled=false
ubuntu-lock-on-suspend=false

[org/gnome/desktop/session]
idle-delay=uint32 0

[org/gnome/settings-daemon/plugins/power]
idle-dim=false
sleep-inactive-ac-timeout=0
sleep-inactive-battery-timeout=0
power-button-action='nothing'
lid-close-ac-action='nothing'
lid-close-battery-action='nothing'

[org/gnome/desktop/lockdown]
disable-lock-screen=true
disable-log-out=true
disable-user-switching=true
KEYFILE_EOF

# Lock the safety-critical keys so no per-user setting can re-enable them.
cat > "${DCONF_DB_DIR}/locks/pokelearnos" << 'LOCKS_EOF'
/org/gnome/desktop/screensaver/lock-enabled
/org/gnome/desktop/screensaver/idle-activation-enabled
/org/gnome/desktop/screensaver/ubuntu-lock-on-suspend
/org/gnome/desktop/session/idle-delay
/org/gnome/desktop/lockdown/disable-lock-screen
/org/gnome/desktop/lockdown/disable-log-out
/org/gnome/desktop/lockdown/disable-user-switching
/org/gnome/settings-daemon/plugins/power/sleep-inactive-ac-timeout
/org/gnome/settings-daemon/plugins/power/sleep-inactive-battery-timeout
/org/gnome/settings-daemon/plugins/power/power-button-action
/org/gnome/settings-daemon/plugins/power/lid-close-ac-action
/org/gnome/settings-daemon/plugins/power/lid-close-battery-action
/org/gnome/settings-daemon/plugins/media-keys/screensaver
/org/gnome/settings-daemon/plugins/media-keys/logout
/org/gnome/settings-daemon/plugins/media-keys/terminal
/org/gnome/settings-daemon/plugins/media-keys/control-center
LOCKS_EOF

# Remove the inert per-user keyfiles from earlier revisions of this script.
rm -f "/home/${KIDS_USER}/.config/dconf/pokelearnos-kiosk" \
      "/home/${KIDS_USER}/.config/dconf/pokelearnos-shortcuts" \
      "/home/${KIDS_USER}/.config/dconf/pokelearnos-gnome" \
      "/home/${KIDS_USER}/.config/dconf/pokelearnos-orientation"

ok "Screen lock / screensaver disabled (system dconf keyfile written)."

# ---------------------------------------------------------------------------
# Step 4 — Block keyboard shortcuts that escape the kiosk
# ---------------------------------------------------------------------------
step "4: Block keyboard shortcuts"

SHORTCUTS_KEYFILE="${DCONF_DB_DIR}/01-shortcuts"
cat > "${SHORTCUTS_KEYFILE}" << 'SHORTCUTS_EOF'
[org/gnome/settings-daemon/plugins/media-keys]
screensaver=@as []
logout=@as []
terminal=@as []
control-center=@as []
search=@as []
home=@as []
email=@as []
www=@as []

[org/gnome/desktop/wm/keybindings]
switch-applications=@as []
switch-applications-backward=@as []
switch-windows=@as []
switch-windows-backward=@as []
cycle-windows=@as []
minimize=@as []
maximize=@as []
unmaximize=@as []
close=@as []
toggle-fullscreen=@as []

[org/gnome/mutter/keybindings]
toggle-tiled-left=@as []
toggle-tiled-right=@as []

[org/gnome/shell/keybindings]
toggle-application-menu=@as []
toggle-message-tray=@as []
focus-active-notification=@as []
show-screenshot-ui=@as []
open-new-window-application=@as []
SHORTCUTS_EOF

ok "Keyboard shortcuts cleared."

# ---------------------------------------------------------------------------
# Step 5 — Disable GNOME features kids should not reach
# ---------------------------------------------------------------------------
step "5: Disable GNOME overview, notifications, extension manager"

GNOME_KEYFILE="${DCONF_DB_DIR}/02-gnome"
cat > "${GNOME_KEYFILE}" << 'GNOME_EOF'
[org/gnome/shell]
enabled-extensions=@as []
disable-extension-version-validation=false

[org/gnome/desktop/notifications]
show-banners=false
show-in-lock-screen=false

[org/gnome/desktop/interface]
clock-show-date=false
clock-show-seconds=false
enable-hot-corners=false
GNOME_EOF

ok "GNOME features restricted."

# ---------------------------------------------------------------------------
# Step 6 — Remove desktop entries kids should not reach
# ---------------------------------------------------------------------------
step "6: Remove desktop entries from kids session"

KIDS_LOCAL_APPS="/home/${KIDS_USER}/.local/share/applications"
mkdir -p "${KIDS_LOCAL_APPS}"
chown "${KIDS_USER}:${KIDS_USER}" "${KIDS_LOCAL_APPS}"

# Create .desktop files that hide apps from GNOME Activities
for app in \
  org.gnome.Terminal \
  org.gnome.Nautilus \
  org.gnome.Software \
  org.gnome.Settings \
  org.gnome.TextEditor \
  org.gnome.Calculator \
  org.gnome.gedit \
  firefox \
  chromium \
  snap-store; do
  cat > "${KIDS_LOCAL_APPS}/${app}.desktop" << DESKTOP_EOF
[Desktop Entry]
Hidden=true
DESKTOP_EOF
  chown "${KIDS_USER}:${KIDS_USER}" "${KIDS_LOCAL_APPS}/${app}.desktop"
done

ok "Desktop entries hidden for kids user."

# ---------------------------------------------------------------------------
# Step 7 — Mask TTY gettys tty2–tty6
# ---------------------------------------------------------------------------
step "7: Mask TTY getty units (block TTY switching)"

for tty in 2 3 4 5 6; do
  systemctl mask "getty@tty${tty}.service" 2>/dev/null && \
    ok "Masked getty@tty${tty}.service" || \
    warn "Could not mask getty@tty${tty}.service"
done

# Also mask console-getty (serial console) if present
systemctl mask console-getty.service 2>/dev/null || true

ok "TTY switching blocked."

# ---------------------------------------------------------------------------
# Step 8 — Install polkit rules
# ---------------------------------------------------------------------------
step "8: Install polkit rules (50-kids.rules)"

if [[ -f "${POLKIT_RULES_SRC}" ]]; then
  cp "${POLKIT_RULES_SRC}" "${POLKIT_RULES_DEST}"
  chmod 644 "${POLKIT_RULES_DEST}"
  ok "Installed ${POLKIT_RULES_DEST}"
else
  warn "${POLKIT_RULES_SRC} not found — polkit rules NOT installed."
  warn "Copy system/50-kids.rules to ${POLKIT_RULES_DEST} manually."
fi

# ---------------------------------------------------------------------------
# Step 9 — Lock screen orientation to landscape (iio-sensor-proxy)
# ---------------------------------------------------------------------------
step "9: Lock orientation to landscape"

# The 7306 is a 2-in-1 — auto-rotation can flip the kiosk screen in tablet mode.
# We disable auto-rotation via the system dconf db from step 3.
ORIENTATION_KEYFILE="${DCONF_DB_DIR}/03-orientation"
cat > "${ORIENTATION_KEYFILE}" << 'ORI_EOF'
[org/gnome/settings-daemon/peripherals/touchscreen]
orientation-lock=true
ORI_EOF

ok "Screen orientation locked to landscape."

# Compile every system dconf keyfile written above (steps 3, 4, 5, 9) into
# the binary database GNOME reads. Running sessions pick the changes up
# live; reboot afterwards for a clean kiosk session anyway.
dconf update
ok "System dconf database compiled (dconf update)."

# ---------------------------------------------------------------------------
# Step 10 — Disable Bluetooth
# ---------------------------------------------------------------------------
step "10: Disable Bluetooth service"

systemctl disable --now bluetooth.service 2>/dev/null && ok "Bluetooth disabled." || \
  warn "Bluetooth disable failed (may not be installed)."

# ---------------------------------------------------------------------------
# Step 11 — Mask sleep/suspend/hibernate targets
# ---------------------------------------------------------------------------
step "11: Mask sleep/suspend/hibernate systemd targets"

for target in \
  sleep.target \
  suspend.target \
  hibernate.target \
  hybrid-sleep.target \
  suspend-then-hibernate.target; do
  systemctl mask "${target}" 2>/dev/null && ok "Masked ${target}" || warn "Could not mask ${target}"
done

# ---------------------------------------------------------------------------
# Step 12 — logind: ignore lid close and power button
# ---------------------------------------------------------------------------
step "12: Configure logind — ignore lid close and power button"

LOGIND_CONF_DIR="/etc/systemd/logind.conf.d"
mkdir -p "${LOGIND_CONF_DIR}"
cat > "${LOGIND_CONF_DIR}/50-pokelearnos.conf" << 'LOGIND_EOF'
# PokéLearnOS — managed by kiosk-lockdown.sh
# Make the power and lid buttons inert for the kiosk.
# This is a belt-and-suspenders layer independent of polkit.
[Login]
HandlePowerKey=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
IdleActionSec=0
LOGIND_EOF

# Apply without reboot
systemctl restart systemd-logind 2>/dev/null && ok "logind reloaded." || warn "logind restart failed — changes active after reboot."

echo ""
echo "==================================================================="
echo "  Lockdown complete."
echo "==================================================================="
echo ""
echo "  Next steps:"
echo "    1. Reboot the device"
echo "    2. Verify kids user auto-logs in and the kiosk launches"
echo "    3. Test the 5-second corner hold → PIN entry works"
echo "    4. Default parent PIN: 1234 — change via the admin overlay"
echo ""
echo "  Recovery (if the kiosk gets stuck):"
echo "    Ctrl+Alt+F1 → login as parent → sudo -u kids XDG_RUNTIME_DIR=/run/user/\$(id -u kids) systemctl --user stop pokelearnos.service"
echo "    Or: sudo -u kids XDG_RUNTIME_DIR=/run/user/\$(id -u kids) journalctl --user -u pokelearnos.service -n 50 --no-pager"
echo ""

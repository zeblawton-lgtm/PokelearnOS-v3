#!/usr/bin/env bash
# =============================================================================
# install.sh — PokéLearnOS v3 full deployment script (Node.js / Vite edition)
#
# Run as root on the Dell Inspiron 7306 after Ubuntu 26.04 LTS is installed.
#
#   sudo bash scripts/install.sh
#
# WHAT THIS SCRIPT DOES (read before running — each step has a human prompt):
#
#   Step 0:  Pre-flight — confirm Ubuntu 26.04, confirm not running as kids user
#   Step 1:  Create 'parent' admin account (interactive) — for Zulu
#   Step 2:  Create 'kids' kiosk user (no shell, locked password)
#   Step 3:  Install system packages (apt + snap chromium + Node.js via nvm/fnm)
#   Step 4:  Build the app on-device (pnpm install + build) OR deploy pre-built
#   Step 5:  Deploy app to /opt/pokelearnos/ via rsync
#   Step 6:  Configure SQLite database + run migrations
#   Step 7:  Seed default profiles (Leo, Michael)
#   Step 8:  Install systemd user unit for the kids account
#   Step 9:  Configure gdm3 autologin for the kids user
#   Step 10: Install polkit rules
#   Step 11: Enable linger for the kids user
#
# WHAT YOU MUST DO AFTER THIS SCRIPT:
#   a. Run:  sudo bash system/kiosk-lockdown.sh
#   b. Set the parent PIN via the admin overlay (default: 1234)
#   c. Reboot the device.
#
# IDEMPOTENCY: Re-running this script is safe.
#
# Run from the repository root:
#   sudo bash scripts/install.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
INSTALL_DIR="/opt/pokelearnos"
KIDS_USER="kids"
PARENT_USER="parent"
LEGACY_USER="pokelearnos"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="pokelearnos.service"
SERVICE_SRC="${REPO_DIR}/system/${SERVICE_NAME}"
POLKIT_RULES_SRC="${REPO_DIR}/system/50-kids.rules"
POLKIT_RULES_DEST="/etc/polkit-1/rules.d/50-kids.rules"
NODE_VERSION="22"   # Node.js LTS major version

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step()    { echo ""; echo ""; echo "==========================================================================="; echo "  STEP $*"; echo "==========================================================================="; }
info()    { echo "    $*"; }
ok()      { echo "    [OK] $*"; }
warn()    { echo "    [WARN] $*"; }
die()     { echo ""; echo "FATAL: $*" >&2; exit 1; }

confirm() {
  local msg="$1" default="${2:-y}" prompt
  [[ "$default" == "y" ]] && prompt="[Y/n]" || prompt="[y/N]"
  echo ""; printf "  >>> %s %s: " "${msg}" "${prompt}"
  read -r answer; answer="${answer:-$default}"
  case "${answer}" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "This script must be run as root: sudo bash scripts/install.sh"
}

# ---------------------------------------------------------------------------
# Step 0 — Pre-flight
# ---------------------------------------------------------------------------
step "0/11: Pre-flight checks"
require_root

[[ "${SUDO_USER:-}" == "${KIDS_USER}" ]] && die "Do not run install.sh as the ${KIDS_USER} user."

if ! grep -q 'VERSION_ID="26.04"' /etc/os-release 2>/dev/null; then
  warn "Not Ubuntu 26.04 LTS — PokéLearnOS is tested on 26.04."
  confirm "Continue anyway?" "n" || die "Aborted."
fi

[[ -f "${REPO_DIR}/artifacts/api-server/package.json" ]] || \
  die "artifacts/api-server/package.json not found in ${REPO_DIR}. Run from the repository root."

ok "Pre-flight passed. Installing from: ${REPO_DIR}"
info "Install target: ${INSTALL_DIR}"

# ---------------------------------------------------------------------------
# Step 1 — Create 'parent' admin account (for Zulu)
# ---------------------------------------------------------------------------
step "1/11: Create parent/admin account (for Zulu)"

info "The parent account is the recovery and admin shell account."
info "It can reach a real shell via Ctrl+Alt+F1 at login, or SSH."
info "It has sudo rights. The kids user does NOT."
echo ""
printf "    Enter parent account username [${PARENT_USER}]: "
read -r PARENT_USER_INPUT
PARENT_USER="${PARENT_USER_INPUT:-${PARENT_USER}}"

if id "${PARENT_USER}" &>/dev/null; then
  ok "User '${PARENT_USER}' already exists — skipping creation."
else
  if confirm "Create parent account '${PARENT_USER}'?" "y"; then
    adduser --gecos "PokéLearnOS Parent/Admin" "${PARENT_USER}"
    usermod -aG sudo "${PARENT_USER}"
    ok "Parent account '${PARENT_USER}' created with sudo access."
  else
    warn "Skipped parent account creation. Recovery will be harder without it."
  fi
fi

# ---------------------------------------------------------------------------
# Step 2 — Create 'kids' kiosk user
# ---------------------------------------------------------------------------
step "2/11: Create '${KIDS_USER}' kiosk user"

info "The kids user: no password (locked), no sudo, no shell, GDM autologin."

if id "${KIDS_USER}" &>/dev/null; then
  ok "User '${KIDS_USER}' already exists — skipping creation."
else
  if confirm "Create kiosk user '${KIDS_USER}'?" "y"; then
    useradd --create-home --shell /usr/sbin/nologin \
      --comment "PokéLearnOS Kiosk User" "${KIDS_USER}"
    usermod -L "${KIDS_USER}"
    ok "Kiosk user '${KIDS_USER}' created (password locked)."
  else
    die "Cannot proceed without the ${KIDS_USER} user."
  fi
fi

usermod --shell /usr/sbin/nologin "${KIDS_USER}"
usermod -L "${KIDS_USER}"
if id -nG "${KIDS_USER}" | tr ' ' '\n' | grep -qx sudo; then
  gpasswd -d "${KIDS_USER}" sudo >/dev/null 2>&1 || true
fi

KIDS_HOME="/home/${KIDS_USER}"
KIDS_UID="$(id -u "${KIDS_USER}")"

if id "${LEGACY_USER}" &>/dev/null; then
  warn "Legacy user '${LEGACY_USER}' exists. Locking it and disabling shell."
  usermod -L "${LEGACY_USER}" || true
  usermod --shell /usr/sbin/nologin "${LEGACY_USER}" || true
fi

LEGACY_STAMP="$(date +%Y%m%d%H%M%S)"
if [[ -f /etc/systemd/system/pokelearnos.service ]]; then
  systemctl disable --now pokelearnos.service >/dev/null 2>&1 || true
  mv /etc/systemd/system/pokelearnos.service "/etc/systemd/system/pokelearnos.service.legacy-${LEGACY_STAMP}"
  systemctl daemon-reload || true
  ok "Legacy system service quarantined."
fi
for legacy_path in /var/lib/pokelearnos /var/log/pokelearnos; do
  if [[ -e "${legacy_path}" ]]; then
    mv "${legacy_path}" "${legacy_path}.legacy-${LEGACY_STAMP}"
    ok "Legacy path quarantined: ${legacy_path}.legacy-${LEGACY_STAMP}"
  fi
done

# ---------------------------------------------------------------------------
# Step 3 — Install system packages
# ---------------------------------------------------------------------------
step "3/11: Install system packages"

info "Required: curl, chromium (snap), nodejs (via fnm), pnpm, speech-dispatcher,"
info "          espeak-ng, iio-sensor-proxy, ufw, rsync"
echo ""

if confirm "Install system packages?" "y"; then
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    curl \
    speech-dispatcher \
    espeak-ng \
    iio-sensor-proxy \
    ufw \
    rsync \
    sqlite3 \
    git

  # Chromium via snap
  if snap list chromium &>/dev/null 2>&1; then
    ok "chromium snap already installed."
  else
    snap install chromium && ok "chromium snap installed." || \
      warn "chromium snap install failed — install manually: snap install chromium"
  fi

  # Node.js via fnm (Fast Node Manager — manages multiple Node versions)
  if command -v node &>/dev/null && node --version | grep -q "^v${NODE_VERSION}"; then
    ok "Node.js $(node --version) already installed."
  else
    info "Installing fnm (Node.js version manager) ..."
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir /usr/local/fnm --skip-shell
    FNM="/usr/local/fnm/fnm"
    [[ -x "${FNM}" ]] || die "fnm install failed."
    "${FNM}" install "${NODE_VERSION}" --fnm-dir /usr/local/fnm
    NODE_BIN="$("${FNM}" exec --using="${NODE_VERSION}" --fnm-dir /usr/local/fnm -- which node)"
    # Symlink to /usr/local/bin so it's on PATH for all users
    ln -sf "${NODE_BIN}" /usr/local/bin/node
    ln -sf "$(dirname "${NODE_BIN}")/npm" /usr/local/bin/npm
    ok "Node.js $(node --version) installed."
  fi

  # pnpm
  if command -v pnpm &>/dev/null; then
    ok "pnpm $(pnpm --version) already installed."
  else
    npm install -g pnpm && ok "pnpm installed." || warn "pnpm install failed."
    # npm -g installs into the fnm node dir — symlink pnpm onto PATH like node/npm
    if ! command -v pnpm &>/dev/null && [[ -L /usr/local/bin/node ]]; then
      ln -sf "$(dirname "$(readlink -f /usr/local/bin/node)")/pnpm" /usr/local/bin/pnpm
      ok "pnpm symlinked to /usr/local/bin/pnpm ($(pnpm --version))."
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Step 4 — Build the application
# ---------------------------------------------------------------------------
step "4/11: Build application (pnpm install + build)"

info "Building frontend (Vite) and backend (TypeScript → ESM) ..."
info "This step runs in ${REPO_DIR} — requires internet for first install."
echo ""

if confirm "Build the application now?" "y"; then
  cd "${REPO_DIR}"

  # Fetch the full Pokédex sprite set (1..1025) into public/ before the build.
  # Idempotent and offline-tolerant; ~250 MB on first run.
  info "Fetching Pokédex sprites (1..1025) — slow on first run ..."
  python3 "${REPO_DIR}/scripts/cache-assets.py" all || \
    warn "Some sprites could not be fetched — those Pokémon show the Poké Ball icon."

  pnpm install --frozen-lockfile || pnpm install
  ok "pnpm install complete."

  # Build frontend — outputs to artifacts/pokelearnos/dist/public/
  BASE_PATH=/ pnpm --filter @workspace/pokelearnos run build
  ok "Frontend built → artifacts/pokelearnos/dist/public/"

  # Build backend — outputs to artifacts/api-server/dist/
  pnpm --filter @workspace/api-server run build
  ok "Backend built → artifacts/api-server/dist/"
else
  warn "Skipped build step. Ensure dist/ directories exist before continuing."
fi

# ---------------------------------------------------------------------------
# Step 5 — Deploy to /opt/pokelearnos/
# ---------------------------------------------------------------------------
step "5/11: Deploy application to ${INSTALL_DIR}/ [DESTRUCTIVE — overwrites existing deploy]"

info "Deploying:"
info "  artifacts/api-server/dist/     → ${INSTALL_DIR}/api-dist/"
info "  artifacts/pokelearnos/dist/public/ → ${INSTALL_DIR}/web/"
info "  system/                        → ${INSTALL_DIR}/system/"
info "  scripts/                       → ${INSTALL_DIR}/scripts/"
info "  package.json                   → ${INSTALL_DIR}/"
echo ""

if confirm "Deploy to ${INSTALL_DIR}/?" "y"; then
  mkdir -p "${INSTALL_DIR}/api-dist" "${INSTALL_DIR}/web" \
           "${INSTALL_DIR}/system" "${INSTALL_DIR}/scripts"

  # Backend compiled output
  rsync -a --delete \
    "${REPO_DIR}/artifacts/api-server/dist/" \
    "${INSTALL_DIR}/api-dist/" && ok "api-dist/ synced."

  # Frontend built output (Vite)
  rsync -a --delete \
    "${REPO_DIR}/artifacts/pokelearnos/dist/public/" \
    "${INSTALL_DIR}/web/" && ok "web/ synced."

  # System scripts
  rsync -a "${REPO_DIR}/system/" "${INSTALL_DIR}/system/" && ok "system/ synced."
  rsync -a "${REPO_DIR}/scripts/" "${INSTALL_DIR}/scripts/" && ok "scripts/ synced."

  # Minimal runtime package.json — the backend bundle externalizes only
  # native modules (better-sqlite3). npm cannot parse pnpm's workspace:/catalog:
  # protocols, so we must NOT copy the api-server package.json here.
  BS3_VERSION="$(node -p "require('${REPO_DIR}/artifacts/api-server/node_modules/better-sqlite3/package.json').version")"
  cat > "${INSTALL_DIR}/package.json" << PKGEOF
{
  "name": "pokelearnos-runtime",
  "private": true,
  "dependencies": {
    "better-sqlite3": "${BS3_VERSION}"
  }
}
PKGEOF

  # .env — only if present in repo root
  if [[ -f "${REPO_DIR}/.env" ]]; then
    cp "${REPO_DIR}/.env" "${INSTALL_DIR}/.env"
    chmod 640 "${INSTALL_DIR}/.env"
    chown "root:${KIDS_USER}" "${INSTALL_DIR}/.env"
    ok ".env deployed (mode 640, root:kids)."
  else
    info ".env not found — using defaults (LLM disabled, DATABASE_URL=sqlite default)."
    info "Create ${INSTALL_DIR}/.env from .env.example for LLM/production settings."
  fi

  # Install production node_modules for the backend (better-sqlite3 only)
  info "Installing runtime Node.js dependencies (better-sqlite3 ${BS3_VERSION}) ..."
  cd "${INSTALL_DIR}"
  rm -rf "${INSTALL_DIR}/node_modules" "${INSTALL_DIR}/package-lock.json"
  if npm install --omit=dev --no-audit --no-fund; then
    [[ -d "${INSTALL_DIR}/node_modules/better-sqlite3" ]] && \
      ok "Runtime node_modules installed." || \
      die "npm install ran but better-sqlite3 is missing in ${INSTALL_DIR}/node_modules."
  else
    die "npm install failed in ${INSTALL_DIR} — backend cannot start without better-sqlite3."
  fi

  # Permissions: root owns everything; world-readable for kids user
  chown -R root:root "${INSTALL_DIR}"
  chmod -R o+rX "${INSTALL_DIR}"
  chmod +x "${INSTALL_DIR}/system/kiosk-launcher.sh" \
           "${INSTALL_DIR}/system/kiosk-lockdown.sh" \
           "${INSTALL_DIR}/system/parent-admin-exit.sh" 2>/dev/null || true
  ok "Permissions set: root:root, world-readable, scripts executable."
fi

# ---------------------------------------------------------------------------
# Step 6 — Database
# ---------------------------------------------------------------------------
step "6/11: Database (SQLite)"

KIDS_DATA_DIR="${KIDS_HOME}/.local/share/pokelearnos"
DB_PATH="${KIDS_DATA_DIR}/db.sqlite"

mkdir -p "${KIDS_DATA_DIR}"
chown -R "${KIDS_USER}:${KIDS_USER}" "${KIDS_DATA_DIR}"
chmod 750 "${KIDS_DATA_DIR}"

if [[ -f "${DB_PATH}" ]]; then
  ok "Database already exists at ${DB_PATH} — not touched."
else
  info "Database will be initialized on first run via Drizzle migrations."
  info "Set DATABASE_URL=sqlite:${DB_PATH} in ${INSTALL_DIR}/.env"
  ok "Data directory prepared: ${KIDS_DATA_DIR}"
fi

# Write .env defaults if no .env file present
if [[ ! -f "${INSTALL_DIR}/.env" ]]; then
  cat > "${INSTALL_DIR}/.env" << ENVEOF
# PokéLearnOS v3 — generated by install.sh
DATABASE_URL=sqlite:${DB_PATH}
APP_ENV=kiosk
NODE_ENV=production
PORT=8765
LLM_PROVIDER=none
ENVEOF
  chmod 640 "${INSTALL_DIR}/.env"
  chown "root:${KIDS_USER}" "${INSTALL_DIR}/.env"
  ok ".env created with SQLite defaults."
fi

# ---------------------------------------------------------------------------
# Step 7 — Seed default profiles
# ---------------------------------------------------------------------------
step "7/11: Seed default profiles (Leo, Michael)"

info "Profiles are seeded automatically when the kiosk backend starts."
info "  Leo:     age 3, Jigglypuff avatar, 15 min/day"
info "  Michael: age 5, Pikachu avatar, 20 min/day"
ok "Profile seeding configured (auto-seeds on first run)."

# ---------------------------------------------------------------------------
# Step 8 — Install systemd user unit
# ---------------------------------------------------------------------------
step "8/11: Install systemd user unit"

KIDS_SYSTEMD_DIR="${KIDS_HOME}/.config/systemd/user"
mkdir -p "${KIDS_SYSTEMD_DIR}"
chown -R "${KIDS_USER}:${KIDS_USER}" "${KIDS_HOME}/.config"

if [[ -f "${SERVICE_SRC}" ]]; then
  cp "${SERVICE_SRC}" "${KIDS_SYSTEMD_DIR}/${SERVICE_NAME}"
  chown "${KIDS_USER}:${KIDS_USER}" "${KIDS_SYSTEMD_DIR}/${SERVICE_NAME}"

  # Enable the unit as the kids user
  sudo -u "${KIDS_USER}" \
    XDG_RUNTIME_DIR="/run/user/${KIDS_UID}" \
    systemctl --user enable "${SERVICE_NAME}" 2>/dev/null && \
    ok "pokelearnos.service enabled for ${KIDS_USER} user." || \
    warn "Could not enable service (no user session running). It will enable on next login."
else
  warn "${SERVICE_SRC} not found — service NOT installed."
fi

# Desktop relaunch icon — lets anyone restart the kiosk app with a tap
bash "${REPO_DIR}/system/install-relaunch-icon.sh" || \
  warn "Relaunch icon install failed — run manually: sudo bash system/install-relaunch-icon.sh"

# ---------------------------------------------------------------------------
# Step 9 — GDM3 autologin
# ---------------------------------------------------------------------------
step "9/11: Configure GDM3 autologin"

# NOTE: kiosk-lockdown.sh also writes this file, with more comprehensive
# settings. If running both, run install.sh first, kiosk-lockdown.sh second.
GDM_CONF="/etc/gdm3/custom.conf"
if [[ -f "${GDM_CONF}" ]]; then
  if grep -q "AutomaticLogin=${KIDS_USER}" "${GDM_CONF}"; then
    ok "GDM3 autologin already configured for ${KIDS_USER}."
  else
    cp "${GDM_CONF}" "${GDM_CONF}.bak"
    info "Run sudo bash system/kiosk-lockdown.sh to configure GDM3 autologin."
    info "(kiosk-lockdown.sh handles this step with full settings.)"
  fi
else
  warn "${GDM_CONF} not found — GDM3 autologin not configured. Run kiosk-lockdown.sh."
fi

# ---------------------------------------------------------------------------
# Step 10 — Install polkit rules
# ---------------------------------------------------------------------------
step "10/11: Install polkit rules"

if [[ -f "${POLKIT_RULES_SRC}" ]]; then
  cp "${POLKIT_RULES_SRC}" "${POLKIT_RULES_DEST}"
  chmod 644 "${POLKIT_RULES_DEST}"
  ok "Installed ${POLKIT_RULES_DEST}"
else
  warn "${POLKIT_RULES_SRC} not found — polkit rules NOT installed."
fi

# ---------------------------------------------------------------------------
# Step 11 — Enable linger
# ---------------------------------------------------------------------------
step "11/11: Enable linger for '${KIDS_USER}'"

loginctl enable-linger "${KIDS_USER}" 2>/dev/null && \
  ok "Linger enabled — ${KIDS_USER} user services will start on boot." || \
  warn "loginctl enable-linger failed. Run manually: loginctl enable-linger ${KIDS_USER}"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "==========================================================================="
echo "  Installation complete."
echo "==========================================================================="
echo ""
echo "  Next steps (required):"
echo "    1. sudo bash system/kiosk-lockdown.sh   (hardens the OS for kiosk use)"
echo "    2. Reboot the device"
echo "    3. Verify autologin works and the kiosk launches"
echo "    4. Change the parent PIN from 1234 via the admin overlay (5s corner hold)"
echo ""
echo "  Default profiles (auto-seeded on first run):"
echo "    Michael — age 5 — Pikachu  — 20 min/day"
echo "    Leo     — age 3 — Jigglypuff — 15 min/day"
echo ""
echo "  Logs:  journalctl _UID=$(id -u "${KIDS_USER}") -f"
echo ""

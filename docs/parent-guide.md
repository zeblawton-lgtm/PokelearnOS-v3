# Parent Guide — PokéLearnOS v3

**For:** Zulu (parent admin)
**Device:** Dell Inspiron 7306 2-in-1, Ubuntu 26.04 LTS

---

## Getting Started

When PokéLearnOS starts you'll see the profile selection screen.
Tap the card for the child who is learning today:

| Profile | Age | Avatar | Daily Limit |
|---------|-----|--------|-------------|
| **Michael** | 5 | Pikachu | 20 min/day |
| **Leo** | 3 | Jigglypuff | 15 min/day |

---

## Learning Modules

### Math
- **Leo (age 3):** Counting objects (1–5), visual addition, visual subtraction using Pokémon sprites
- **Michael (age 5):** Addition/subtraction up to 20, introductory multiplication (×2–×5), word problems

### Spanish *(v3 — Phase 5)*
Michael's Spanish vocabulary: colors, numbers, greetings, basic phrases.

### Earth Science *(v3 — Phase 5)*
Continents, climates (polar/desert/rainforest/ocean), land features, directional concepts.
Leo gets the concrete visual version; Michael gets the more detailed version.

---

## Session Timer

A timer bar at the top of the screen shows remaining time. When it expires,
the **Rest Screen** appears and the child cannot continue until you unlock.

---

## Parent Controls — Corner Gesture

**Hold the top-right corner of the screen for 5 seconds.**

A PIN entry overlay appears. Enter your PIN (default: **1234**).

From the parent panel:
- Add or remove time (+/– 5 minutes)
- Adjust the child's daily time limit
- End the session and return to profile select

**Change your PIN from 1234 immediately after setup.**

---

## Emergency Exit (Physical Keyboard)

1. Press **Ctrl+Alt+F1** — this reaches a login terminal
2. Login as your parent account (default username: `parent`)
3. `sudo systemctl stop pokelearnos` — stops the kiosk
4. `journalctl _UID=$(id -u kids) -n 50` — view logs if something is broken
5. `sudo systemctl start pokelearnos` — restart the kiosk

---

## Adjusting Daily Limits

Tap the corner lock icon → enter PIN → Session Settings.

Or via the API (advanced — while backend is running):
```bash
curl -X PATCH http://localhost:8765/api/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"dailyLimitMinutes": 25}'
```

---

## Screen Scaling

The kiosk is set to `--force-device-scale-factor=0.7` to work correctly with
GNOME's built-in HiDPI scaling on the 4K 13.3" panel.

If touch targets feel too small or too large after a GNOME update, edit
`/opt/pokelearnos/system/kiosk-launcher.sh` and change `0.7` to another value
(try `0.8` or `0.6`), then run `sudo bash scripts/install.sh` to redeploy.

---

## Re-deploying After an Update

```bash
# From the repository root on your Mac Studio (or the device itself)
cd /path/to/pokelearnos-v3

# Build
pnpm install
BASE_PATH=/ pnpm --filter @workspace/pokelearnos run build
pnpm --filter @workspace/api-server run build

# Deploy to the device (replace 10.0.x.x with the 7306's IP)
rsync -av --delete \
  artifacts/api-server/dist/ zulu@10.0.x.x:/opt/pokelearnos/api-dist/
rsync -av --delete \
  artifacts/pokelearnos/dist/public/ zulu@10.0.x.x:/opt/pokelearnos/web/

# Restart on the device
ssh zulu@10.0.x.x \
  "sudo -u kids XDG_RUNTIME_DIR=/run/user/\$(id -u kids) \
   systemctl --user restart pokelearnos.service"
```

---

## Profiles

Default profiles are seeded automatically on first run via `POST /api/admin/seed`.

| Name | Age | Pokémon | Daily Limit |
|------|-----|---------|-------------|
| Michael | 5 | Pikachu (#25) | 20 min |
| Leo | 3 | Jigglypuff (#39) | 15 min |

---

## Default Parent PIN

```
1234
```

**Change this before letting the kids use the device.** Use the corner-hold gesture → PIN entry → Settings.

# Parent Guide — PokéLearnOS v3

**For:** Zulu (parent admin)
**Device:** Dell Inspiron 7306 2-in-1, Ubuntu 26.04 LTS

---

## Getting Started

When PokéLearnOS starts you'll see the profile selection screen.
Tap the card for the child who is learning today:

| Profile | Age | Avatar | Timer |
|---------|-----|--------|-------|
| **Michael** | 5 | Dracovish | No limit |
| **Leo** | 3 | Zapdos | No limit |

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

The time restriction is disabled. The top bar now shows **No limit**, and the
app does not block learning time or move children to the Rest Screen because
of elapsed minutes.

---

## Parent Controls — Corner Gesture

**Hold the top-right corner of the screen for 5 seconds.**

A PIN entry overlay appears. Enter your PIN (default: **1234**).

From the parent panel:
- Toggle audio
- Change the parent PIN
- End the session and return to profile select

**Change your PIN from 1234 immediately after setup.**

---

## Emergency Exit (Physical Keyboard)

1. Press **Ctrl+Alt+F1** — this reaches a login terminal
2. Login as your parent account (default username: `parent`)
3. `sudo -u kids XDG_RUNTIME_DIR=/run/user/$(id -u kids) systemctl --user stop pokelearnos.service` — stops the kiosk
4. `sudo -u kids XDG_RUNTIME_DIR=/run/user/$(id -u kids) journalctl --user -u pokelearnos.service -n 50` — view logs if something is broken
5. `sudo -u kids XDG_RUNTIME_DIR=/run/user/$(id -u kids) systemctl --user start pokelearnos.service` — restart the kiosk

---

## Timer Restrictions

Daily time limits are currently disabled in the kiosk app.

The backend still records session usage for progress/history and keeps legacy
timer endpoints for compatibility, but those endpoints no longer stop a child
from starting or continuing a session. The parent panel no longer exposes
add/remove/reset timer controls.

Via the API (advanced — while backend is running), timer reads should report an
unlimited state:
```bash
curl -s http://localhost:8765/api/timer/1
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

# Update the installed checkout on the device
ssh parent@10.0.100.56 \
  "cd /opt/pokelearnos && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh"
```

---

## Profiles

Default profiles are seeded automatically by the backend when the database is empty.

| Name | Age | Pokémon | Timer |
|------|-----|---------|-------|
| Michael | 5 | Dracovish (#882) | No limit |
| Leo | 3 | Zapdos (#145) | No limit |

---

## Default Parent PIN

```
1234
```

**Change this before letting the kids use the device.** Use the corner-hold gesture → PIN entry → Settings.

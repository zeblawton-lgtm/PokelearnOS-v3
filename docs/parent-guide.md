# Parent Guide — PokéLearnOS v3

**For:** Zulu (parent admin)
**Device:** Dell Inspiron 7306 2-in-1, Ubuntu 26.04 LTS

---

## Getting Started

When PokéLearnOS starts you'll see the profile selection screen.
Tap the card for the child who is learning today:

| Profile | Age | Avatar |
|---------|-----|--------|
| **Michael** | 5 | Dracovish |
| **Leo** | 3 | Zapdos |

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

## Screen Time

There are no app-imposed time limits. The app never blocks learning time or
shows a rest screen. Each session's minutes are recorded only so the Progress
page can show history. End a session any time from the parent panel.

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

| Name | Age | Pokémon |
|------|-----|---------|
| Michael | 5 | Dracovish (#882) |
| Leo | 3 | Zapdos (#145) |

---

## Default Parent PIN

```
1234
```

**Change this before letting the kids use the device.** Use the corner-hold gesture → PIN entry → Settings.

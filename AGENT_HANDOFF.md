# PokeLearnOS Agent Handoff

Last updated: 2026-06-09

## Current Repo State

Local deploy worktree:

```text
/Users/zeb/Desktop/Pokelearn/PokelearnOS-v3-repair-work
```

Branch:

```text
repair/kiosk-release
```

Remote:

```text
origin/repair/kiosk-release
```

Current commit:

```text
d9a1262 Show number-only math for Michael
```

GitHub CI passed for the latest pushed branch.

## What Changed

1. Time restriction was removed from the app flow.
   - Timer no longer blocks sessions.
   - UI shows `No limit`.
   - Parent reset/unlock timer controls are no longer needed for daily limits.

2. Default avatars were changed.
   - Michael: Dracovish `#882`
   - Leo: Zapdos `#145`
   - Existing databases migrate old defaults on backend start:
     - Michael from Pikachu `25` or Lucario `448` to Dracovish `882`
     - Leo from Jigglypuff `39` or Mimikyu `778` to Zapdos `145`
   - Offline artwork added:
     - `artifacts/pokelearnos/public/sprites/official-artwork/145.png`
     - `artifacts/pokelearnos/public/sprites/official-artwork/882.png`

3. Michael's math was changed.
   - For Michael/age 5 math, Pokemon pictures were removed.
   - Main math area now shows large numeric equations.
   - Answer choices use larger numerals.
   - Word problems show large text instead of Pokemon art.
   - Leo/age 3 math still uses picture-based counting/add/subtract visuals.

4. Pokedex/habitat support was extended.
   - Zapdos has a stormy mountain sky habitat.
   - Dracovish has a rocky ocean shore habitat.

5. Security/test work exists and passed.
   - API tests cover unauthenticated admin/profile/timer writes failing.
   - Latest local checks passed:
     - frontend typecheck
     - API typecheck
     - API tests `16/16`
     - `git diff --check`
   - GitHub CI passed.

## Important Laptop State

Both laptops have their parent git checkouts updated to `d9a1262`, but `/opt/pokelearnos` has not been redeployed because sudo needs an interactive password.

```text
10.0.100.47 / leoslaptop
checkout: /home/parent/PokelearnOS-v3
head: d9a1262

10.0.100.62 / mikeslaptop
checkout: /home/parent/PokelearnOS-v3-repair
head: d9a1262
```

Finish deploy with:

```bash
ssh -t parent@10.0.100.47 'cd /home/parent/PokelearnOS-v3 && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh'

ssh -t parent@10.0.100.62 'cd /home/parent/PokelearnOS-v3-repair && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh'
```

## Architecture

```mermaid
flowchart TD
  A[Mac Studio local repo] --> B[GitHub origin]
  B --> C[repair/kiosk-release branch]

  C --> D1[10.0.100.47 parent checkout<br>/home/parent/PokelearnOS-v3]
  C --> D2[10.0.100.62 parent checkout<br>/home/parent/PokelearnOS-v3-repair]

  D1 --> E1[sudo scripts/update.sh]
  D2 --> E2[sudo scripts/update.sh]

  E1 --> F1[/opt/pokelearnos]
  E2 --> F2[/opt/pokelearnos]

  F1 --> G1[api-dist Express backend]
  F1 --> H1[web Vite React frontend]
  F1 --> I1[SQLite DB preserved]

  F2 --> G2[api-dist Express backend]
  F2 --> H2[web Vite React frontend]
  F2 --> I2[SQLite DB preserved]

  G1 --> J1[kids user systemd service<br>pokelearnos.service]
  H1 --> J1

  G2 --> J2[kids user systemd service<br>pokelearnos.service]
  H2 --> J2
```

## Update Script Behavior

`scripts/update.sh` does this on each laptop:

```text
1. fetch/checkout/pull repair/kiosk-release
2. cache Pokemon sprites
3. pnpm install
4. build frontend
5. build backend
6. rsync frontend/backend/system/scripts into /opt/pokelearnos
7. preserve /opt/pokelearnos/.env and SQLite DB
8. restart kids user's pokelearnos.service
```

## Useful Commands

Check local deploy branch:

```bash
cd /Users/zeb/Desktop/Pokelearn/PokelearnOS-v3-repair-work
git status --short --branch
git log --oneline -5
```

Run local gates:

```bash
npx pnpm@10 --filter @workspace/pokelearnos run typecheck
npx pnpm@10 --filter @workspace/api-server run typecheck
npm exec --package tsx@4.21.0 --package @esbuild/darwin-arm64@0.27.3 -- tsx --test artifacts/api-server/tests/*.test.ts
git diff --check
```

Check laptop repo heads:

```bash
ssh parent@10.0.100.47 'cd /home/parent/PokelearnOS-v3 && git status --short --branch && git log --oneline -1'
ssh parent@10.0.100.62 'cd /home/parent/PokelearnOS-v3-repair && git status --short --branch && git log --oneline -1'
```

## Known Loose End

There is a separate dirty main worktree at:

```text
/Users/zeb/Desktop/Pokelearn/PokelearnOS-v3
```

It contains geography/region image work using user-added country/climate images. That work was not ported or pushed to `repair/kiosk-release` in the latest deploy branch.

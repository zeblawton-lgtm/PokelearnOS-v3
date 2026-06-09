# PokeLearnOS Agent Handoff

Last updated: 2026-06-09 (Vivian TTS narration + menu-only music, ADR-005;
time-based blocking removed end-to-end, ADR-004)

## Current Repo State

Local deploy worktree:

```text
/Users/zeb/Desktop/Pokelearn/PokelearnOS-v3-repair-work
```

Branch: `repair/kiosk-release`, pushed to `origin/repair/kiosk-release`.

Don't trust a hash written in this file — check the live state instead:

```bash
git log --oneline -3
gh run list --branch repair/kiosk-release --limit 3
```

Note: the local branch has no upstream tracking configured, so
`git status -sb` shows no ahead/behind info. Push explicitly with
`git push origin repair/kiosk-release` (CI runs on every push).

## What Changed (most recent first)

1. **Voice narration + menu-only music (2026-06-09, ADR-005).**
   - Backend `GET /api/tts?text&lang=en|es|auto` (`routes/tts.ts`) proxies the
     LAN Qwen3-TTS box (Gradio `run_instruct`; voice **Vivian**) and caches
     wavs on disk. Env: `TTS_URL` (default `http://10.0.100.137:8000`),
     `TTS_VOICE`, `TTS_INSTRUCT`, `TTS_CACHE_DIR`. No laptop `.env` changes
     needed — defaults are in code.
   - Frontend `src/lib/tts.ts` (speakText/speakSequence/stopSpeaking): object-
     URL cache, respects parent sound mute, SpeechSynthesis fallback on 503.
   - Narrated: math questions + wrong-answer explanations (en), Spanish
     vocabulary in Spanish only (the English question text is shown, not
     spoken — parent preference), Pokédex names, habitat blurbs. Module
     question audio is prefetched on module start so narration is instant.
   - Music `learn` scene removed — music on menus only; learning modules are
     silent; completion keeps fanfare + jingle. The completion tracks are
     full-length songs, so `music.stop()`/`playScene()` explicitly stop the
     jingle element — without that it kept playing into the next module.
   - Verified live against the real box through the proxy: en + es synthesis,
     1.5 ms cached replay, valid 24 kHz PCM wav.

2. **Time-based blocking removed end-to-end (2026-06-09, ADR-004).**
   - GOAL.md §1/§6/§9 no longer require daily limits or a rest screen; the
     release gate now requires sessions run without time-based blocking.
   - Backend: `/api/timer/*` and `PATCH /api/profiles/:id` deleted (requests
     return 404 — regression-tested in `tests/security.test.ts`).
     `lib/timer.ts` replaced by `lib/session-usage.ts` (records per-session
     minutes for the Progress page only; nothing enforces a limit).
   - Frontend: `TimerBar` renamed to `TopBar` (home + parent-lock buttons only,
     no progress bar or "No limit" label); profile cards no longer show a
     "No limit" badge; timer API methods/types removed from `lib/api.ts`.
   - DB: `profiles.daily_limit_minutes` retained unused in both schemas — no
     destructive kiosk migration. Stale `timer_adjustment:*` settings rows are
     ignored.
   - Docs updated: parent guide, architecture, README, `.claude/agents/*`,
     QA report appendix.

3. **Number-only math for Michael** (`d9a1262`).
   - The split is keyed by profile **age** (`age <= 3` gets picture-based
     visuals), not by name — "Michael" appears nowhere in frontend logic.
   - Age > 3: large numeric equations, bigger answer numerals, large-text word
     problems. Age <= 3 (Leo): unchanged picture-based count/add/subtract.

4. **Default avatars changed** (`33d3608`).
   - Michael: Dracovish `#882`; Leo: Zapdos `#145`.
   - Startup migration in `api-server/src/index.ts` moves old defaults
     (25/448 → 882 for Michael, 39/778 → 145 for Leo). Verified applied on both
     laptops' live DBs.
   - Avatars render correctly: profile-select.tsx and progress.tsx alias
     `const SPRITE = ARTWORK`, so they load the bundled
     `official-artwork/145.png`/`882.png`. (An earlier review note claimed
     they 404'd to the Poké Ball fallback — that was wrong; the lib-level
     `SPRITE()` helper and its `sprites/pokemon/` path are simply unused by
     the avatar screens.)

5. **Pokédex/habitat support extended** — Zapdos (stormy mountain sky) and
   Dracovish (rocky ocean shore) in `src/lib/pokemonHabitat.ts` (rendered with
   the generic mountain/ocean GeoScenes).

6. **Security/test work** — API tests cover unauthenticated admin/profile
   writes failing, removed endpoints returning 404, bearer-token validity, PIN
   rate limiting, CORS, and the TTS proxy (mock Gradio box: synth, disk cache,
   validation, 503 fallback). Local gates last verified 2026-06-09: frontend +
   API typechecks clean, tests **19/19**, `git diff --check` clean.

## Laptop State

Both laptops were fully deployed at ~08:30 EDT 2026-06-09 with `d9a1262`
content and the kiosk service is running it (verified live: `/api/profiles`
returns avatars 882/145; deployed bundle contains the post-`92b4e5c` UI).

They do **not** yet have the ADR-004 (timer purge) or ADR-005 (TTS narration +
menu-only music) commits. Note: on 2026-06-09 the .47 checkout was renamed
from `/home/parent/PokelearnOS-v3` to `/home/parent/PokelearnOS-v3-repair` so
**both laptops now use the same path**. To redeploy (interactive sudo password
required — run in a real terminal, not via Claude Code's `!` shell):

```bash
ssh -t parent@10.0.100.47 'cd /home/parent/PokelearnOS-v3-repair && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh'

ssh -t parent@10.0.100.62 'cd /home/parent/PokelearnOS-v3-repair && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh'
```

Check what a laptop is actually running (read-only, no sudo):

```bash
ssh parent@10.0.100.47 'git -C /home/parent/PokelearnOS-v3-repair log --oneline -1; ls -l /opt/pokelearnos/api-dist/index.mjs; curl -s http://127.0.0.1:8765/api/profiles'
ssh parent@10.0.100.62 'git -C /home/parent/PokelearnOS-v3-repair log --oneline -1; ls -l /opt/pokelearnos/api-dist/index.mjs; curl -s http://127.0.0.1:8765/api/profiles'
```

## Architecture

```mermaid
flowchart TD
  A[Mac Studio local repo] --> B[GitHub origin]
  B --> C[repair/kiosk-release branch]

  C --> D1[10.0.100.47 parent checkout<br>/home/parent/PokelearnOS-v3-repair]
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

`scripts/update.sh` on each laptop:

```text
1. git fetch/checkout/pull --ff-only of the deploy ref
2. cache Pokemon sprites (cache-assets.py — needs network; warns + degrades
   to the Poke Ball fallback on failure)
3. pnpm install
4. build frontend
5. build backend
6. rsync api-dist/web (with --delete) + system/scripts into /opt/pokelearnos
7. .env preserved (root-level, never rsynced); SQLite DB lives at
   /home/kids/.local/share/pokelearnos/db.sqlite — untouched by design
8. restart kids user's pokelearnos.service (best-effort; warns
   "reboot to apply" on failure)
```

Caveats:
- Deploy ref precedence: `POKELEARNOS_UPDATE_REF` env var > laptop's current
  branch > `repair/kiosk-release` fallback. Always set the env var (as the
  commands above do).
- If the `better-sqlite3` version changed, the script wipes
  `/opt/pokelearnos/node_modules` and runs `npm install --omit=dev` there —
  network-dependent and **fatal** on failure.
- The pull is `--ff-only`: a rebase/force-push of the branch breaks laptop
  deploys (escape hatch: `--no-pull` deploys the checkout as-is).

## Useful Commands

Run local gates:

```bash
npx pnpm@10 --filter @workspace/pokelearnos run typecheck
npx pnpm@10 --filter @workspace/api-server run typecheck
npm exec --package tsx@4.21.0 --package @esbuild/darwin-arm64@0.27.3 -- tsx --test artifacts/api-server/tests/*.test.ts
git diff --check
```

## Known Loose Ends

1. **Geography/region image work is stranded** in the dirty main worktree at
   `/Users/zeb/Desktop/Pokelearn/PokelearnOS-v3` — local `main` there is
   ahead 2 (committed, unpushed geography commits) / behind 17 of
   `origin/main`, plus uncommitted geography/region changes. Not ported to
   `repair/kiosk-release`.
2. **`repair/kiosk-release` has never been merged to `main`** — the deployed
   kiosk code lives only on the side branch.

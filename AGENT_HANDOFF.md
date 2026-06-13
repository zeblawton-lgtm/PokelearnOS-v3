# PokeLearnOS Agent Handoff

Last updated: 2026-06-11 (creative corner modules, ADR-006; Vivian TTS
narration + menu-only music, ADR-005; time-based blocking removed, ADR-004)

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

1. **Home page redesigned + voice-over-music balance (2026-06-12, later).**
   - `home.tsx` rebuilt in the style of the owner's mockup: sky-gradient
     backdrop with drifting CSS clouds, the child's own avatar bouncing next
     to a "Hi, {name}!" speech bubble, three Pokémon "type cards" for the
     subjects (Charmander/fire = Math, Squirtle/water = Spanish,
     Bulbasaur/grass = World), and a chunky white fun-row where every tile
     has a thematic Pokémon mascot (Smeargle=Coloring, Unown=Tracing,
     Voltorb=Dots, Alakazam=Memory, Rotom=Pokédex, Lapras=Regions,
     Jirachi=gold Progress — six new artwork PNGs added via
     cache-assets.py + manifest regen). All assets bundled (no web
     fonts/sprites); touch targets ≥ 88 px kept. The mockup's Poké-ball
     reward meter / catch-reveal flow was deliberately NOT built (new game
     economy — needs an owner decision + ADR if wanted).
   - Audio balance: narration routes through a Web Audio gain stage
     (1.8× + compressor) in `lib/tts.ts`; music default 0.32→0.2 and ducks
     to ¼ while speech plays (`setSpeechDucking` in `lib/music.ts`).

2. **TTS speed + tent-mode rotation (2026-06-12).**
   - *Box*: `/tts/prompt` synthesis dropped ~36 s → **2.3 s** per new phrase.
     A resident-model sidecar (`app/server/tts_sidecar.py` on the ML box,
     loopback 127.0.0.1:8766, qwen3-tts-env, model loaded once + speaker
     embedding precomputed, GPU-serialized) is called by `routers/tts.py`
     (httpx; falls back to the old subprocess path if the sidecar is down).
     Contract/hash/mp3 format unchanged — existing cache stays valid.
     CAVEAT: neither box process auto-starts after a reboot (no systemd unit
     yet); first request after a sidecar restart pays a one-time ~27 s load.
   - *Kiosk proxy*: background voice upgrades moved to a drain queue that
     only runs when zero foreground requests are in flight (cap 500, skip
     if mp3 already exists, drains one at a time). Tests 22/22.
   - *Warm script*: `artifacts/pokelearnos/scripts/warm-tts.ts` enumerates
     all 529 narration phrases (same builders/transforms as the app —
     `src/lib/spoken-math.ts` extracted from math.tsx; pronounce.ts now uses
     a relative import so Node tooling can load it) and POSTs them serially
     to the box. `--dry-run` prints counts. Real run:
     `cd artifacts/pokelearnos && npx tsx scripts/warm-tts.ts`.
   - *Tent mode*: `kiosk-lockdown.sh` step 9 now writes
     `orientation-lock=false` (auto-rotation ON). The previous `true` broke
     tent mode the moment the dconf fix made lockdown effective. Laptops
     need a lockdown re-run to repair.

3. **Kiosk proxy prefers the box's /tts/prompt cache, ADR-007 (2026-06-11).**
   The owner is adding `POST /tts/prompt` on the ML box (returns a cached or
   freshly synthesized MP3 path in a voice-cloned speaker; a codex agent was
   implementing it box-side — it did NOT exist on any port when checked).
   `routes/tts.ts` now: tries `POST {TTS_PROMPT_URL||TTS_URL}/tts/prompt`
   first (120 s timeout — the box runner loads the model per call), caches
   the mp3 keyed voice=`clone`, negative-caches a missing endpoint (404/405/
   conn-fail) for 5 min, serves legacy Vivian wavs instantly while upgrading
   them to the cloned voice in the background one at a time, then falls back
   to the Gradio flow. Tests cover all paths (21/21). Zero config if the
   endpoint lands on the Gradio origin; else set `TTS_PROMPT_URL` in
   `/opt/pokelearnos/.env` on the laptops.

4. **Pokémon name pronunciation + Memory Match replay music leak (2026-06-11).**
   - `src/content/pronunciations.ts` (535 entries, Gens 1-5) maps names to
     TTS-friendly respellings, sourced from Smogon's official pronunciation
     guide; `src/lib/pronounce.ts` exposes `spokenName()` / `spokenText()`.
     Applied at every narration call site (pokedex, dots, match, math
     questions/explanations incl. word-problem prose, Spanish color answers,
     regions blurbs). Display text always shows the real name; only the
     string sent to /api/tts changes. Unmapped names (Gens 6-9) pass through.
   - Memory Match "Play Again" now calls `music.stop()` — it stays on the
     route, so App's route effect never fired and the full-length completion
     song kept playing through the next game.

5. **Lock-screen lockout fixed in kiosk-lockdown.sh (2026-06-11).** The
   script's dconf steps (3/4/5/9) wrote *text keyfiles into
   `/home/kids/.config/dconf/`*, which dconf never reads — so screen-lock
   disable, idle-delay=0, shortcut blocking, and orientation lock were all
   silently inert. Verified live on .47: `/etc/dconf/profile/` had no `user`
   profile and no pokelearnos db; GNOME's default 5-min idle lock fired, and
   the password-locked kids account can never pass a lock screen (reboot was
   the only way back in). Fixed: settings now go to
   `/etc/dconf/db/pokelearnos.d/*` with `/etc/dconf/profile/user`, a
   `locks/` file for the safety-critical keys, and `dconf update`. **The fix
   must be applied by re-running `sudo bash system/kiosk-lockdown.sh` on
   each laptop** (then reboot) — `update.sh` only rsyncs files, it does not
   execute the lockdown script.

6. **Creative corner modules (2026-06-11, ADR-006).** Four new frontend-only
   pages, wired into App.tsx routes (all music-free like other modules),
   home-screen tiles, and Progress-page labels. No backend/schema changes —
   they log through the existing `POST /api/attempts` (`module` is free text).
   - `/coloring` — finger-paint canvas over a faded grayscale render of the
     bundled artwork; palette swatches narrate color names; undo/eraser.
   - `/tracing` — A–Z / 0–9 / shapes; lenient pixel-coverage check (45% for
     age ≤ 3, 60% otherwise); success-only, never a failure state.
   - `/dots` — connect-the-dots; dot positions generated at runtime from the
     artwork alpha-channel outline (`src/lib/contour.ts`, Moore-neighbour
     tracing + arc-length resampling, normalised to object-contain geometry
     so dots overlay the watermark image exactly). 8 dots (age ≤ 3) / 14.
   - `/match` — memory pairs with a CSS Poké Ball card back; 4 pairs
     (age ≤ 3) / 8; matched Pokémon names narrated.
   All four prefetch their TTS audio on mount and follow the ≥88 px
   touch-target and positive-feedback rules.

7. **Voice narration + menu-only music (2026-06-09, ADR-005).**
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

8. **Time-based blocking removed end-to-end (2026-06-09, ADR-004).**
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

9. **Number-only math for Michael** (`d9a1262`).
   - The split is keyed by profile **age** (`age <= 3` gets picture-based
     visuals), not by name — "Michael" appears nowhere in frontend logic.
   - Age > 3: large numeric equations, bigger answer numerals, large-text word
     problems. Age <= 3 (Leo): unchanged picture-based count/add/subtract.

10. **Default avatars changed** (`33d3608`).
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

11. **Pokédex/habitat support extended** — Zapdos (stormy mountain sky) and
   Dracovish (rocky ocean shore) in `src/lib/pokemonHabitat.ts` (rendered with
   the generic mountain/ocean GeoScenes).

12. **Security/test work** — API tests cover unauthenticated admin/profile
   writes failing, removed endpoints returning 404, bearer-token validity, PIN
   rate limiting, CORS, and the TTS proxy (mock Gradio box: synth, disk cache,
   validation, 503 fallback). Local gates last verified 2026-06-09: frontend +
   API typechecks clean, tests **19/19**, `git diff --check` clean.

## Laptop State

Both laptops were fully deployed at ~08:30 EDT 2026-06-09 with `d9a1262`
content and the kiosk service is running it (verified live: `/api/profiles`
returns avatars 882/145; deployed bundle contains the post-`92b4e5c` UI).

On 2026-06-09 the parent later deployed the ADR-004/ADR-005 content. The
laptops do **not** yet have: `1fb2fc2` (jingle stop + Spanish-only narration),
`caf139c` (creative corner modules), or the kiosk-lockdown dconf fix (which
additionally requires re-running the lockdown script — `update.sh` only
rsyncs files). Note: on 2026-06-09 the .47 checkout was renamed from
`/home/parent/PokelearnOS-v3` to `/home/parent/PokelearnOS-v3-repair` so
**both laptops now use the same path**. To redeploy everything including the
lockdown fix (interactive sudo password required — run in a real terminal,
not via Claude Code's `!` shell):

```bash
ssh -t parent@10.0.100.47 'cd /home/parent/PokelearnOS-v3-repair && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh && sudo bash system/kiosk-lockdown.sh && sudo reboot'

ssh -t parent@10.0.100.62 'cd /home/parent/PokelearnOS-v3-repair && sudo POKELEARNOS_UPDATE_REF=repair/kiosk-release bash scripts/update.sh && sudo bash system/kiosk-lockdown.sh && sudo reboot'
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

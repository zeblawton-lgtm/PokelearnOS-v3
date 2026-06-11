# Architecture Decisions

## ADR-001 — Dual-dialect database (Postgres dev / SQLite kiosk)
**Context:** Replit dev uses Postgres; the installed kiosk must run fully offline
with no DB server. `install.sh` configures `DATABASE_URL=sqlite:...`, but the db
layer was Postgres-only and would have crashed on the kiosk.

**Decision:** `@workspace/db` selects the driver at runtime (`src/driver.ts`).
SQLite mode uses `better-sqlite3` with a mirrored `sqlite-core` schema
(`src/schema-sqlite.ts`) and idempotent DDL applied on first boot (no drizzle-kit
needed on-device). Route code stays typed against the Postgres schema; the active
tables are re-typed to match, which is sound because both dialect definitions are
structurally identical. All SQL the routes use (`FILTER`, `coalesce(sum())`,
`RETURNING`, `ON CONFLICT DO UPDATE`, timestamp compares) is portable and was
verified against SQLite.

## ADR-002 — Offline-first assets (no runtime network)
**Context:** Sprites were loaded from `raw.githubusercontent.com` at runtime,
breaking the offline requirement (GOAL §6).

**Decision:** Sprites are bundled under `public/sprites/official-artwork/<id>.png`
and resolved locally (`src/lib/sprites.ts`); a bundled `fallback.svg` Poké Ball is
shown if an id is missing, so gameplay never needs the network. A service worker
(`public/sw.js`) caches the app shell + assets for offline reloads. PokéAPI is
relegated to an optional build-time refresh (`scripts/cache-assets.py`).

## ADR-003 — Audio
**Decision:** Correct/incorrect/tap/fanfare cues are synthesised at runtime with
the Web Audio API (zero asset weight, original); Spanish pronunciation uses the
offline SpeechSynthesis API. Owner-supplied background music is bundled under
`public/audio/` and managed by `src/lib/music.ts`, with parent mute controls.
See `docs/credits.md` for music/sprite licensing caveats.

## ADR-004 — No time-based session blocking (2026-06-09)
**Context:** The kiosk originally enforced a configurable daily limit with a
"Pokémon are resting" rest screen (old GOAL §6) and parent timer controls. The
parent decided the kids can play without time limits; commit 92b4e5c removed
the enforcement and the rest screen, but GOAL.md still required them and
vestigial timer endpoints remained.

**Decision:** Time-based blocking is out of scope product-wide. GOAL.md §1/§6/§9
no longer require daily limits, countdowns, or a rest screen; the release gate
instead requires that sessions start and run without time-based blocking. The
legacy `/api/timer/*` endpoints, the admin-only PATCH /profiles daily-limit
editor, the unused frontend timer API/types, and the daily-limit math were
removed; API tests assert the removed endpoints now return 404. Sessions still
record `minutesUsed` for the Progress page only. `profiles.daily_limit_minutes`
stays in both schemas (unused) so existing kiosk SQLite databases need no
destructive migration; orphaned `timer_adjustment:*` rows in `settings` are
ignored.

## ADR-005 — LAN voice narration (Qwen3-TTS "Vivian") and menu-only music (2026-06-09)
**Context:** The parent runs a Qwen3-TTS box (`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`,
a Gradio app) on the home LAN at `10.0.100.137:8000` and wants math questions
and English text read aloud in the friendly "Vivian" voice, the same voice for
all Spanish speech, and background music limited to menus and module completion.

**Decision:** The backend proxies speech at `GET /api/tts?text&lang=en|es|auto`
(`routes/tts.ts`): it drives the Gradio `run_instruct` endpoint, downloads the
wav, and caches it on disk keyed by voice+lang+text (`TTS_CACHE_DIR`, default
under the OS tmpdir), so the finite question banks converge to zero box traffic
and already-heard phrases keep playing while the box is offline. Config via env:
`TTS_URL` (default `http://10.0.100.137:8000`), `TTS_VOICE` (default `Vivian`),
`TTS_INSTRUCT` (speaking-style prompt). The frontend speaks only through
`src/lib/tts.ts` — same-origin fetch, object-URL cache, respects the parent
sound mute — and falls back to the offline SpeechSynthesis voice when the proxy
returns 503, so the app never *requires* the box. This keeps GOAL §7's offline
rule intact: LAN-only, best-effort, never the internet. Narrated: math
questions and wrong-answer explanations (en), Spanish vocabulary in Spanish
only (parent preference — the English question text is shown, not spoken),
Pokédex names, habitat blurbs; module audio is prefetched at module start.
The music `learn` scene was removed — background music plays on menu screens
only; module completion keeps the fanfare + jingle (explicitly stopped on the
next scene/module, since the completion tracks are full-length songs).

## ADR-006 — Creative corner modules (2026-06-11)
**Context:** The parent asked for more creative/educational activities beyond
the question-bank modules: coloring Pokémon, drawing/tracing, connect the
dots, and similar age-appropriate play.

**Decision:** Four new frontend-only modules, no backend or schema changes
(`attempts.module` is free text, so they log progress through the existing
`POST /api/attempts` flow): **Coloring** (`/coloring` — finger-paint on a
canvas over a faded grayscale render of the bundled official artwork; palette
swatches narrate color names), **Tracing** (`/tracing` — letters A–Z, numbers
0–9, and shapes traced with a finger; lenient pixel-coverage check, success
only, never a failure state), **Connect the Dots** (`/dots` — numbered dots
are generated at runtime by tracing the alpha-channel outline of bundled
artwork in `src/lib/contour.ts`, so any bundled Pokémon works with zero new
assets; completing the loop reveals the artwork), and **Memory Match**
(`/match` — flip-card pairs of bundled artwork). Difficulty keys off
`profile.age` like math (age ≤ 3 gets fewer dots/pairs and looser tracing).
All four follow the kiosk rules: offline-only bundled assets, ≥88 px touch
targets, positive feedback only, narration via the ADR-005 TTS path with
prefetch, music stays menu-only with the completion fanfare/jingle.

## ADR-007 — Box-side TTS prompt cache with cloned voice (2026-06-11)
**Context:** The owner is adding `POST /tts/prompt` to the TTS box (per their
spec; implementation in progress box-side): it normalizes + hashes the text,
returns a cached MP3 path immediately when known, and otherwise synthesizes
with Qwen3-TTS **voice clone** (authorized local reference sample,
`voice_clone.py`) and converts to MP3. This builds a persistent prompt-audio
library on the box, shared by every kiosk, in the cloned voice.

**Decision:** The kiosk proxy (`routes/tts.ts`) prefers that endpoint:
`POST {TTS_PROMPT_URL}/tts/prompt {text, language}` (default
`http://10.0.100.137:8765`, the owner's chosen port) → download the
returned MP3 → cache under `TTS_CACHE_DIR` keyed with voice marker `clone`
(never collides with legacy Vivian wavs). If the endpoint is missing or the
connection fails, that's negative-cached for 5 minutes and the existing
Gradio "Vivian" flow is used — today's behavior is unchanged until the box
endpoint ships. Phrases that only have a legacy wav are served instantly and
re-synthesized with the cloned voice in the background, strictly one at a
time (the box runner loads the model per call), so the library migrates
voice without ever making a child wait. The prompt call gets a 120 s timeout
for the same reason. Frontend and offline guarantees are untouched
(SpeechSynthesis fallback stands; the app never requires the box).

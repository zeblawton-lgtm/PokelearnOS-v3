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

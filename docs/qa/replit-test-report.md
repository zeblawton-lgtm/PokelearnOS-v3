# PokelearnOS — Replit Test Report

**Date:** 2026-05-26
**Environment:** Replit dev (PostgreSQL)

## Release Gate Checklist

### Replit Software Release Gate

| Check | Status | Notes |
|-------|--------|-------|
| Replit workflow starts app | PASS | `artifacts/pokelearnos: web` running on port 25708 |
| Preview loads frontend | PASS | Profile selector renders with Pikachu/Jigglypuff avatars |
| Backend health endpoint | PASS | `GET /api/healthz` → `{"status":"ok"}` |
| PostgreSQL initializes | PASS | `pnpm --filter @workspace/db run push` succeeded |
| Two child profiles exist | PASS | Michael (age 5) and Leo (age 3) seeded automatically on fresh database startup |
| Profiles API | PASS | `GET /api/profiles` returns both profiles |
| Session start API | PASS | `POST /api/sessions/start` returns session object |
| Timer API | PASS | `GET /api/timer/1` returns `{isUnlimited: true, isExpired: false}` |
| Attempts API | PASS | `POST /api/attempts` logs correctly |
| Stats API | PASS | `GET /api/stats/1` returns module breakdown |
| Admin verify-pin | PASS | `POST /api/admin/verify-pin {pin:"1234"}` returns `{valid:true}` |
| Math module (age 3) | PASS | Counting, add, subtract questions with Pokemon sprites |
| Math module (age 5) | PASS | Add, subtract, multiply, word problems |
| Spanish module | PASS | Color, number, greeting, phrase questions |
| World Explorer module | PASS | Continent, ocean, feature, concept questions |
| Timer countdown | REMOVED | Time restriction disabled; timer bar shows `No limit` |
| Rest screen | REMOVED | No longer triggered by elapsed minutes |
| Parent overlay | PASS | PIN entry modal, settings panel |
| LLM disabled mode | PASS | No LLM calls made; all content is static |
| Kiosk scripts exist | PASS | `system/` and `iso/` directories complete |
| ISO build script | PASS | `iso/build-iso.sh` with clear instructions |
| Documentation | PASS | architecture, parent guide, kiosk-deployment, qa report |
| Release notes | PASS | `dist/release-notes.md` |

## API Test Results

```
GET  /api/healthz              → 200 {"status":"ok"}
GET  /api/profiles             → 200 [{Michael},{Leo}]
POST /api/sessions/start       → 201 {session}
POST /api/sessions/:id/end     → 200 {updated session}
GET  /api/timer/1              → 200 {isUnlimited: true, isExpired: false}
POST /api/attempts             → 201 {attempt}
GET  /api/stats/1              → 200 {totalCorrect, totalAttempts, moduleBreakdown}
POST /api/admin/verify-pin     → 200 {valid: true}  (PIN: 1234)
POST /api/admin/seed           → 401 without admin bearer token
```

## Known Gaps / Future Work

- Qwen/local LLM integration not implemented (LLM_PROVIDER=none only)
- ISO build requires privileged environment — documented but not testable in Replit
- Spanish vocabulary limited to A1 level (17 questions)
- No audio feedback yet (sound effects planned for v1.1)
- Offline service worker caching not yet implemented (planned v1.1)

---

## Update — 2026-06-07 (offline, audio, content, SQLite kiosk)

### New work verified
| Check | Status | Notes |
|-------|--------|-------|
| Workspace typecheck (9 projects) | PASS | `pnpm run typecheck` clean |
| Frontend production build | PASS | `vite build` → dist/public with sw.js, manifest, sprites, audio |
| SQLite kiosk DB path | PASS | All route SQL patterns verified on SQLite (DDL, RETURNING, FILTER, coalesce(sum), ON CONFLICT, timestamp compares) |
| Offline sprites | PASS | Bundled `public/sprites/official-artwork/` + `fallback.svg`; no runtime CDN calls |
| Service worker | PASS | Registered in prod build; caches shell + assets |
| Audio feedback | PASS | Web Audio SFX (correct/wrong/tap/fanfare) + Spanish speech wired into modules |
| Background music | PASS | 12 bundled tracks, scene-based playback, parent mute toggle |
| Spanish content | PASS | Expanded 17 → 34 questions |
| Math content | PASS | math-3yo 25, math-5yo 24 questions |
| Pokédex screen | PASS | Real offline page (24 entries), replaces not-found stub |
| Pokémon Homes screen | PASS | Real habitats/biome page, replaces regions not-found stub |

### Notes / environment limits
- The api-server esbuild bundle and on-host ISO build target **linux-x64** (Replit/device);
  they cannot run on this arm64 dev sandbox (native-binary pinning), but build on the target unchanged.
- Background music is Nintendo-copyrighted (owner-supplied) — see `docs/credits.md`; replace before any public/commercial distribution.

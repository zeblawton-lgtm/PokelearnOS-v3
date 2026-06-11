# PokelearnOS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chromium Browser                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │          React Frontend (pokelearnos)             │  │
│  │                                                   │  │
│  │  ProfileSelect → Home Hub → [Math|Spanish|Geo|   │  │
│  │     Coloring|Tracing|Dots|Match]                  │  │
│  │  TopBar (top) ───── ParentOverlay (modal)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │ HTTP /api/*
┌─────────────────────────────────────────────────────────┐
│              Node.js Express Backend (api-server)         │
│                                                           │
│  /api/profiles      GET profiles; admin POST/PATCH       │
│  /api/sessions      POST start/end sessions              │
│  /api/attempts      POST log question attempts           │
│  /api/stats/:id     GET per-profile accuracy stats       │
│  /api/admin/*       PIN verify, settings, change-pin     │
│  /api/tts           GET voice proxy → LAN Qwen3-TTS box  │
│                     (disk-cached wav; 503 → SpeechSynth) │
│  /api/healthz       GET health check                     │
└─────────────────────────────────────────────────────────┘
                           │ Drizzle ORM
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL (Replit dev) / SQLite (kiosk)         │
│                                                           │
│  profiles    id, name, age, avatarPokemonId,             │
│              dailyLimitMinutes (unused legacy), createdAt │
│  sessions    id, profileId, startedAt, endedAt,         │
│              minutesUsed                                  │
│  attempts    id, sessionId, profileId, module,          │
│              questionId, correct, answeredAt             │
│  settings    id, key, value, updatedAt                   │
│              (parent_pin_hash; timer_adjustment rows ignored)    │
└─────────────────────────────────────────────────────────┘
```

## Frontend Component Tree

```
App
├── SessionProvider (context: profile, session, overlay state)
│   ├── TopBar (fixed top bar: home + parent lock buttons)
│   ├── Routes
│   │   ├── /          → ProfileSelect (loads profiles from API)
│   │   ├── /home      → Home Hub (module + creative tiles + progress)
│   │   ├── /math      → MathPage (age-branched question pool)
│   │   ├── /spanish   → SpanishPage (vocabulary questions)
│   │   ├── /geography → GeographyPage (world knowledge)
│   │   ├── /coloring  → ColoringPage (canvas painting over artwork)
│   │   ├── /tracing   → TracingPage (letters/numbers/shapes, ADR-006)
│   │   ├── /dots      → DotsPage (runtime outline dots via lib/contour.ts)
│   │   ├── /match     → MatchPage (flip-card pairs)
│   │   ├── /progress  → Progress (stats from API)
│   └── ParentOverlay (PIN modal + settings sheet)
```

## Session Lifecycle

```
1. User taps profile card
   → POST /api/sessions/start {profileId}
   → SessionContext starts an unrestricted learning session

2. While learning
   → Each question is narrated by the Vivian voice (GET /api/tts, cached;
     SpeechSynthesis fallback) — background music is menu-only (ADR-005)
   → User answers questions
   → POST /api/attempts {sessionId, profileId, module, questionId, correct}

3. Session bookkeeping
   → Backend records minutes used per session (Progress page history only —
     nothing enforces a limit; there are no timer endpoints)

4. Parent unlocks
   → POST /api/admin/verify-pin {pin}
   → If end: POST /api/sessions/:id/end, navigate to ProfileSelect
```

## Educational Content

All educational content is **bundled in the frontend** (TypeScript files in `src/content/`).
No runtime API calls to PokeAPI for content or sprites. Pokémon artwork is served
from files bundled under `artifacts/pokelearnos/public/sprites/`.

```
src/content/
├── math-3yo.ts     19 questions: count, add, subtract (0–5)
├── math-5yo.ts     19 questions: add/subtract/multiply/word (0–20)
├── spanish.ts      17 questions: color, number, greeting, phrase
└── geography.ts    19 questions: continent, ocean, feature, concept
```

Questions are shuffled per session — children see different orders each time.
World Explorer questions can include bundled visual scenes for places such as
the Sahara, Amazon rainforest, Antarctica, reefs, and the equator. Pokédex
entries derive child-friendly real-world habitat/climate examples from Pokémon
types plus a few curated overrides.

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Child exits kiosk | Chromium kiosk mode, no address bar |
| Child accesses OS | GDM autologin as restricted `kids` user |
| Parent PIN brute force | SHA-256 hash with app salt plus rate limiting |
| Network exposure | Backend binds to 127.0.0.1 in kiosk mode |
| Content safety | All content is static, curated, bundled |
| LLM misuse | LLM disabled (LLM_PROVIDER=none) by default |

# PokelearnOS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chromium Browser                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │          React Frontend (pokelearnos)             │  │
│  │                                                   │  │
│  │  ProfileSelect → Home Hub → [Math|Spanish|Geo]   │  │
│  │  TimerBar (top) ─── ParentOverlay (modal)        │  │
│  │  RestScreen (timer expired)                       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │ HTTP /api/*
┌─────────────────────────────────────────────────────────┐
│              Node.js Express Backend (api-server)         │
│                                                           │
│  /api/profiles      GET/POST/PATCH profiles              │
│  /api/sessions      POST start/end sessions              │
│  /api/timer/:id     GET daily time remaining             │
│  /api/attempts      POST log question attempts           │
│  /api/stats/:id     GET per-profile accuracy stats       │
│  /api/admin/*       PIN verify, settings, change-pin     │
│  /api/admin/seed    POST seed default profiles           │
│  /api/healthz       GET health check                     │
└─────────────────────────────────────────────────────────┘
                           │ Drizzle ORM
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL (Replit dev) / SQLite (kiosk)         │
│                                                           │
│  profiles    id, name, age, avatarPokemonId,             │
│              dailyLimitMinutes, createdAt                │
│  sessions    id, profileId, startedAt, endedAt,         │
│              minutesUsed                                  │
│  attempts    id, sessionId, profileId, module,          │
│              questionId, correct, answeredAt             │
│  settings    id, key, value, updatedAt                   │
│              (parent_pin_hash stored here)               │
└─────────────────────────────────────────────────────────┘
```

## Frontend Component Tree

```
App
├── SessionProvider (context: profile, session, timer, overlay state)
│   ├── TimerBar (fixed top bar, countdown, parent lock button)
│   ├── Routes
│   │   ├── /          → ProfileSelect (loads profiles from API)
│   │   ├── /home      → Home Hub (3 module tiles + progress)
│   │   ├── /math      → MathPage (age-branched question pool)
│   │   ├── /spanish   → SpanishPage (vocabulary questions)
│   │   ├── /geography → GeographyPage (world knowledge)
│   │   ├── /progress  → Progress (stats from API)
│   │   └── <rest>     → RestScreen (when isResting=true)
│   └── ParentOverlay (PIN modal + settings sheet)
```

## Session Lifecycle

```
1. User taps profile card
   → POST /api/sessions/start {profileId}
   → SessionContext starts countdown timer (dailyLimitMinutes × 60 seconds)

2. While learning
   → User answers questions
   → POST /api/attempts {sessionId, profileId, module, questionId, correct}
   → Timer counts down every second

3. Timer reaches 0
   → isResting = true
   → RestScreen displayed (fullscreen overlay)
   → Only parent PIN can unlock (extendSession) or end session

4. Parent unlocks
   → POST /api/admin/verify-pin {pin}
   → If valid: extendSession(+15 min) OR endSession()
   → If end: POST /api/sessions/:id/end, navigate to ProfileSelect
```

## Educational Content

All educational content is **bundled in the frontend** (TypeScript files in `src/content/`).
No runtime API calls to PokeAPI for content — sprites use static GitHub CDN URLs.

```
src/content/
├── math-3yo.ts     19 questions: count, add, subtract (0–5)
├── math-5yo.ts     19 questions: add/subtract/multiply/word (0–20)
├── spanish.ts      17 questions: color, number, greeting, phrase
└── geography.ts    19 questions: continent, ocean, feature, concept
```

Questions are shuffled per session — children see different orders each time.

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Child exits kiosk | Chromium kiosk mode, no address bar |
| Child accesses OS | GDM autologin as restricted user |
| Parent PIN brute force | SHA-256 hash with app salt |
| Network exposure | Backend binds to 127.0.0.1 in kiosk mode |
| Content safety | All content is static, curated, bundled |
| LLM misuse | LLM disabled (LLM_PROVIDER=none) in v1 |

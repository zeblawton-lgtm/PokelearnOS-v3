# AGENTS.md — PokéLearnOS v3 Project Conventions

Canonical conventions for any AI agent working on this repo (Claude Code,
ChatGPT, Cursor, Windsurf, etc.). Read it before doing anything. Claude Code
auto-loads `CLAUDE.md`, which imports this file via `@AGENTS.md`.

## Source of Truth

`GOAL.md` is the project spec (target hardware, deliverable, release gate).
`DECISIONS.md` is the append-only architecture decision log — new decisions go
there with a date. If a request contradicts `GOAL.md`, push back and ask the
user to update `GOAL.md` first; do not silently drift.

## Stack (as actually built in v3)

- **Monorepo:** pnpm workspaces. Packages under `artifacts/*` and `lib/*`.
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + wouter +
  framer-motion (`artifacts/pokelearnos`). Offline PWA (service worker).
- **Backend:** Node + Express 5 + TypeScript, bundled with esbuild
  (`artifacts/api-server`).
- **Database:** Drizzle ORM. **Postgres in dev/Replit, SQLite on the kiosk** —
  driver auto-selected from `DATABASE_URL` (see `lib/db/src/driver.ts`).
- **Shared libs:** `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`.
- **Target OS:** Ubuntu LTS, Chromium kiosk, on a Dell Inspiron 7306 (x64).

## Commands

```bash
pnpm install
pnpm run typecheck                              # whole workspace — must stay green
pnpm --filter @workspace/pokelearnos build      # frontend -> dist/public
pnpm --filter @workspace/api-server build        # backend bundle
python3 scripts/cache-assets.py                  # optional sprite refresh (network)
python3 scripts/generate-asset-manifest.py       # rebuild asset manifest
```

Note: the esbuild/rollup/lightningcss native binaries are pinned to **linux-x64**
(Replit/the Dell). Builds run there and in CI; they will not run on arm64.

## Repository Layout (v3)

```
PokelearnOS-v3/
├── GOAL.md            # source of truth (spec, hardware, release gate)
├── AGENTS.md          # this file
├── CLAUDE.md          # @AGENTS.md stub for Claude Code auto-load
├── DECISIONS.md       # append-only decision log
├── .claude/
│   ├── commands/goal.md
│   └── agents/*.md
├── artifacts/
│   ├── pokelearnos/   # React/Vite frontend (+ public/ bundled assets)
│   └── api-server/    # Express/TS backend
├── lib/               # db, api-spec, api-zod, api-client-react
├── scripts/           # install.sh, cache-assets.py, asset manifest, dev
├── system/            # systemd unit, kiosk launcher, lockdown, polkit
├── iso/               # ISO build scripts
└── docs/              # architecture, parent guide, credits, qa/, security/
```

## Coding Conventions

- **Touch targets:** min 88×88 px; no critical UI in the top 80 px of the
  viewport. Optimised for 4K @ 200% scaling.
- **Positive feedback only for the 3yo profile** — no streaks/negative framing.
- **No API keys in the frontend.** The backend proxies any LLM calls.
- **Offline-first:** no network at runtime. Sprites load locally with an SVG
  fallback (`lib/sprites.ts`); PokéAPI is build-time/admin refresh only.
- **Math is template-based, never LLM-generated.**
- **DB:** keep the Postgres and SQLite schemas structurally identical
  (`lib/db/src/schema/*` and `schema-sqlite.ts`). SQLite tables init via the
  idempotent DDL on first boot — no destructive migrations without sign-off.
- **Tests/checks:** keep `pnpm run typecheck` green; add tests under `tests/`.

## Handoff Protocol

When a subagent finishes it produces a short report: (1) files changed,
(2) how to verify (one command/steps), (3) what's left for the next agent,
(4) any decision that belongs in `DECISIONS.md`.

## Safety Rails

- The `kids` user must never have sudo, a shell, or a desktop. Anyone suggesting
  otherwise is wrong.
- Parent PIN is a salted hash in the DB — never plaintext, never in env vars.
- Code that writes to `/etc`, `/opt`, or installs packages must be produced as a
  script for a human to run — agents do not execute it.
- Never commit `.env` or anything with secrets (it is gitignored).

## What Not To Do

- Do not call PokéAPI from the running app — local assets only, degrade to the
  fallback sprite.
- Do not generate math questions with an LLM — templates only.
- Do not add features outside the current `GOAL.md` scope without surfacing the
  decision first.
- Do not redistribute the bundled music/sprites publicly — see `docs/credits.md`.

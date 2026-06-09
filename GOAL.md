# GOAL.md — PokéLearnOS

> Source of truth for the project. The full product vision also lives in the
> Claude "Pokelearn" project instructions; this file is the in-repo spec that
> Claude Code and other tools read. New architectural decisions are logged in
> `DECISIONS.md` (append-only, dated).

## 1. Final Deliverable

A single bootable `dist/pokelearnos.iso` for a Dell Inspiron 7306 2-in-1 that,
after install, boots straight into a full-screen, touch-first, Pokémon-themed
educational game for two children — fully offline, with per-child progress and
a parent-only admin/recovery flow.

## 2. Target Hardware (fixed — do NOT re-validate)

Dell Inspiron 7306 2-in-1 · i7-1165G7 · Iris Xe · 13.3" 3840×2160 touchscreen ·
16 GB RAM · ~477 GB NVMe · Wi-Fi 6 AX201 · UEFI + Secure Boot + TPM present.
Assume this profile is accurate. Do not block on hardware confirmation.

## 3. Display & Touch

- Native 3840×2160 at 200% scaling.
- Touch targets ≥ 88×88 px (prefer ≥120 px). Nothing critical in the top 80 px.
- Usable by a 3-year-old and a 5-year-old; large legible text; touch is primary.

## 4. Stack (as built — see AGENTS.md)

pnpm monorepo · React/Vite/TS/Tailwind frontend · Express/TS backend · Drizzle
ORM with Postgres (dev) / SQLite (kiosk) · Chromium kiosk on Ubuntu LTS.

## 5. Educational Modules

- **Math** — 3yo: counting, add/subtract, quantity matching (visual, sprite
  based). 5yo: add/subtract, intro multiply, simple word problems, patterns.
- **Geography / World Explorer** — continents, oceans, land features, directions,
  near/far. Pokémon are imaginative guides only; never present fictional regions
  as real places.
- **Spanish** — colors, numbers, greetings, simple phrases, matching.

Plus exploration screens: an offline **Pokédex** and **Pokémon Homes** (habitats).

## 6. Session Control

- No time-based blocking (ADR-004): no daily limit, countdown, or rest screen.
  Children can play as long as they like; sessions record minutes used for the
  Progress page only.
- Parent PIN/password overlay can end the session.

## 7. Offline & Assets

- No internet at runtime. Sprites/audio are bundled and served locally; missing
  sprites fall back to a bundled SVG. PokéAPI is build-time/admin refresh only.

## 8. Kiosk Lockdown

- Autologin restricted `kids` user (no sudo, no shell, no desktop), app launches
  full-screen, escape shortcuts blocked, no terminal/browser/file-manager/
  settings access. Parent-only exit via hidden gesture + PIN.

## 9. Release Gate (Definition of Done)

The project is complete only when: repo structure exists; app launches locally;
frontend loads local assets; backend API starts; database initialises; two child
profiles exist; sessions start and run without time-based blocking;
parent admin overlay works; LLM can be disabled without breaking the app; offline
mode works; `pnpm run typecheck` passes; the ISO build command exists and is
reproducible; docs, QA report, and security report are complete.

## Non-Goals (v1)

- No child free-chat with an LLM. No LLM-generated math. No runtime PokéAPI.
- No public/commercial redistribution of bundled Nintendo assets (`docs/credits.md`).

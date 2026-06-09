# PokéLearnOS v3

An offline-first educational kiosk for Leo & Michael — Pokémon-themed learning modules (math, Spanish, geography, Pokédex/Habitats) running on a locked-down Dell Inspiron 7306 touchscreen.

This repository is the only active source for PokéLearnOS. The sibling
`pokelearnos/` and `pokelearnos-v2/` folders are archived planning/scaffold
material and must not be edited, built, or deployed.

## Stack

- **Frontend** — React 19 + Vite + TypeScript + Tailwind v4 (`artifacts/pokelearnos`)
- **Backend** — Express 5, bundled to a single ESM file with esbuild (`artifacts/api-server`)
- **Database** — Drizzle ORM, dual-dialect: Postgres in dev, SQLite on the kiosk (`lib/db`, see ADR-001 in `DECISIONS.md`)
- **Shared libs** — `lib/api-zod` (schemas), `lib/api-spec` (OpenAPI), `lib/api-client-react` (hooks)

## Develop

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/pokelearnos build
pnpm --filter @workspace/api-server build
```

CI runs the same install, typecheck, frontend build, backend build, and shell
syntax checks on Linux x64.

## Deploy to the kiosk

- Fresh machine: build the bootable image with `sudo bash iso/build-iso.sh` and flash `dist/pokelearnos.iso`, or run `scripts/install.sh` on an existing Ubuntu install.
- Update an installed kiosk: `sudo bash scripts/update.sh` (pull → build → rsync → restart; data preserved).
- See `docs/kiosk-deployment.md` for the full procedure, touch config, and escape flows.

## Docs

- `GOAL.md` — project spec
- `AGENTS.md` — stack & coding conventions (canonical)
- `DECISIONS.md` — architecture decision records
- `docs/parent-guide.md` — profiles, PIN flow
- `docs/credits.md` — asset licensing

> ⚠️ Bundled sprites/audio are Nintendo-owned, private-use only. Do not make this repository or its builds public.

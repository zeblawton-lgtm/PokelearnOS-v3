# PokéLearnOS v3 — Release Notes

## Unreleased (2026-06-07)
### Added
- **Offline-first assets:** Pokémon sprites bundled locally with an SVG fallback; service worker + web app manifest for full offline operation. No network needed during gameplay.
- **Audio:** synthesised correct/incorrect/tap/celebration sound effects (Web Audio), Spanish word pronunciation (offline speech), and bundled background music with parent mute controls.
- **SQLite kiosk database path:** the app now runs on a local SQLite file on-device (no Postgres server) while keeping Postgres for Replit dev. Tables auto-initialise on first boot.
- **Pokédex** screen (24 Pokémon, offline) and **Pokémon Homes** habitats screen — replacing previous placeholder pages.
- Expanded Spanish (17 → 34 questions) and additional math questions.
- `.env.example`, asset scripts (`cache-assets.py`, `generate-asset-manifest.py`), `DECISIONS.md`, `docs/credits.md`.

### Fixed / hardened
- `.gitignore` now excludes `.env` and local `*.sqlite` files (previously `.env` was not ignored).

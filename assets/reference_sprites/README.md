# Reference sprite seed

This directory is the pre-bundled asset seed (GOAL §6). Drop licensed/owned
Pokémon artwork here named by National Dex id (e.g. `25.png`).

The build copies sprites into the app at
`artifacts/pokelearnos/public/sprites/official-artwork/<id>.png`, which the ISO
ships. At runtime the app loads sprites **locally only** — if an id is missing it
shows the bundled `fallback.svg` Poké Ball, so gameplay always works offline.

To (re)populate from PokéAPI at build time (network required, optional):

    python3 scripts/cache-assets.py
    python3 scripts/generate-asset-manifest.py

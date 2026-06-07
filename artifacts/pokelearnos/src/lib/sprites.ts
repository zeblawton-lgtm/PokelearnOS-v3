// ---------------------------------------------------------------------------
// Offline-first sprite resolution.
//
// Sprites are served from the app's own origin (bundled into the build under
// public/sprites/). scripts/cache-assets.py populates these at build time from
// the PokéAPI sprite repository. At runtime the app NEVER calls the network for
// sprites — if a file is missing it falls back to a bundled SVG Poké Ball, so
// gameplay always works with no internet (GOAL §6).
// ---------------------------------------------------------------------------

// Vite injects BASE_URL (e.g. "/" or "/pokelearnos/"). Honour it so assets
// resolve correctly whatever the deploy base path is.
const BASE: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
  "/";

const root = BASE.endsWith("/") ? BASE : BASE + "/";

export const SPRITE_FALLBACK = `${root}sprites/fallback.svg`;

// Official-artwork style image (used everywhere the app showed Pokémon art).
export function ARTWORK(id: number): string {
  return `${root}sprites/official-artwork/${id}.png`;
}

// Small pixel sprite (kept for parity; same fallback applies).
export function SPRITE(id: number): string {
  return `${root}sprites/pokemon/${id}.png`;
}

// onError handler for <img>: swap to the bundled fallback exactly once so we
// never loop or hit the network.
export function onSpriteError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) {
  const img = e.currentTarget;
  if (img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  img.src = SPRITE_FALLBACK;
}

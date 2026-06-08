#!/usr/bin/env python3
"""
cache-assets.py — OPTIONAL development/admin-time sprite refresh.

Downloads official-artwork PNGs from the PokéAPI sprite repository into the
app's bundled asset directory so they ship inside the ISO. Gameplay NEVER calls
this — it is a build-time / parent-admin convenience only (GOAL §6).

Offline-safe: if the network is unavailable, existing bundled sprites (and the
SVG fallback) are used and the build still succeeds.

Usage:
    python3 scripts/cache-assets.py            # default curated id set
    python3 scripts/cache-assets.py 1 4 7 25   # specific national-dex ids
"""
import os
import sys
import urllib.request

DEST = os.path.join(
    os.path.dirname(__file__), "..",
    "artifacts", "pokelearnos", "public", "sprites", "official-artwork",
)
CDN = ("https://raw.githubusercontent.com/PokeAPI/sprites/master/"
       "sprites/pokemon/other/official-artwork/{id}.png")

# Curated set: app content + Pokédex screen + avatars.
DEFAULT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 35, 37, 39, 40, 52, 53, 54,
               55, 58, 60, 79, 87, 92, 94, 113, 129, 130, 131, 133, 143, 147,
               148, 149, 150, 151, 172, 175, 196, 197, 448, 778]


def main(argv):
    ids = [int(x) for x in argv] if argv else DEFAULT_IDS
    os.makedirs(DEST, exist_ok=True)
    got = skipped = failed = 0
    for pid in ids:
        out = os.path.join(DEST, f"{pid}.png")
        if os.path.exists(out):
            skipped += 1
            continue
        try:
            req = urllib.request.Request(CDN.format(id=pid),
                                         headers={"User-Agent": "PokeLearnOS/3"})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            with open(out, "wb") as f:
                f.write(data)
            got += 1
            print(f"  downloaded {pid}.png ({len(data)//1024} KB)")
        except Exception as e:  # noqa: BLE001 - best-effort, offline tolerant
            failed += 1
            print(f"  WARN could not fetch {pid}: {e}", file=sys.stderr)
    print(f"\ncache-assets: {got} new, {skipped} already bundled, {failed} failed")
    if failed and got == 0 and skipped == 0:
        print("No assets available — the app will use the bundled SVG fallback.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

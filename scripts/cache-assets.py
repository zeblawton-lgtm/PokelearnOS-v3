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

# Curated set: app content + Pokédex screen + avatars + home-tile mascots
# (65 Alakazam=Memory, 100 Voltorb=Dots, 201 Unown=Tracing, 235 Smeargle=
# Coloring, 385 Jirachi=Progress, 479 Rotom=Pokédex).
DEFAULT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 35, 37, 39, 40, 52, 53, 54,
               55, 58, 60, 65, 79, 87, 92, 94, 100, 113, 129, 130, 131, 133,
               143, 145, 147, 148, 149, 150, 151, 172, 175, 196, 197, 201,
               235, 385, 448, 479, 778, 882]


# National Dex covers ids 1..1025 (through Gen 9). The full Pokédex screen
# needs every sprite; fetch them with `cache-assets.py all`.
MAX_DEX_ID = 1025


def parse_ids(argv):
    if not argv:
        return DEFAULT_IDS
    if len(argv) == 1 and argv[0] == "all":
        return list(range(1, MAX_DEX_ID + 1))
    out = []
    for a in argv:
        if "-" in a:                      # range form, e.g. 1-1025
            lo, hi = a.split("-", 1)
            out.extend(range(int(lo), int(hi) + 1))
        else:
            out.append(int(a))
    return out


def fetch_one(pid):
    out = os.path.join(DEST, f"{pid}.png")
    if os.path.exists(out) and os.path.getsize(out) > 0:
        return "skip"
    try:
        req = urllib.request.Request(CDN.format(id=pid),
                                     headers={"User-Agent": "PokeLearnOS/3"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        tmp = out + ".part"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, out)              # atomic — a partial fetch never lands
        return "got"
    except Exception as e:  # noqa: BLE001 - best-effort, offline tolerant
        print(f"  WARN could not fetch {pid}: {e}", file=sys.stderr)
        return "fail"


def main(argv):
    from concurrent.futures import ThreadPoolExecutor
    ids = parse_ids(argv)
    os.makedirs(DEST, exist_ok=True)
    got = skipped = failed = 0
    with ThreadPoolExecutor(max_workers=12) as ex:
        for i, res in enumerate(ex.map(fetch_one, ids), 1):
            if res == "got": got += 1
            elif res == "skip": skipped += 1
            else: failed += 1
            if got and got % 100 == 0 and res == "got":
                print(f"  …{i}/{len(ids)} ({got} downloaded)")
    print(f"\ncache-assets: {got} new, {skipped} already bundled, {failed} failed")
    if failed and got == 0 and skipped == 0:
        print("No assets available — the app will use the bundled SVG fallback.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

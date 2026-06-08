#!/usr/bin/env python3
"""
gen-pokedex.py — generate the full offline Pokédex dataset (artifacts/pokelearnos/
src/content/pokedex.ts) for National Dex ids 1..MAX from PokeAPI.

For each Pokémon it pulls name + types (/pokemon/{id}) and a kid-readable fact
from the species flavor text (/pokemon-species/{id}). Hand-written facts already
present in the existing pokedex.ts are PRESERVED as overrides (the popular early
Pokémon were tuned for ages 3-5).

Run once on a machine with internet; the generated .ts is committed. Sprites are
fetched separately by cache-assets.py.

    python3 scripts/gen-pokedex.py            # all 1025
    python3 scripts/gen-pokedex.py 251        # first 251
"""
import os
import re
import sys
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MAX_ID = 1025
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "artifacts", "pokelearnos", "src", "content", "pokedex.ts")
API = "https://pokeapi.co/api/v2"

TYPE_ORDER = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
              "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
              "Dragon", "Dark", "Steel", "Fairy"]

TYPE_COLORS = {
    "Normal": "bg-gray-400", "Fire": "bg-orange-500", "Water": "bg-blue-500",
    "Electric": "bg-yellow-400", "Grass": "bg-green-500", "Ice": "bg-cyan-400",
    "Fighting": "bg-red-700", "Poison": "bg-purple-500", "Ground": "bg-amber-600",
    "Flying": "bg-sky-400", "Psychic": "bg-fuchsia-500", "Bug": "bg-lime-600",
    "Rock": "bg-stone-500", "Ghost": "bg-indigo-500", "Dragon": "bg-indigo-600",
    "Dark": "bg-gray-700", "Steel": "bg-slate-500", "Fairy": "bg-pink-400",
}


def fetch_json(url, tries=4):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "PokeLearnOS/3"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception:
            if attempt == tries - 1:
                return None
    return None


def title(s):
    # "mr-mime" / "nidoran-f" → "Mr Mime" / "Nidoran F"
    return " ".join(w.capitalize() for w in re.split(r"[-_ ]", s) if w)


def clean_fact(text):
    if not text:
        return ""
    # Flavor text is littered with hard line breaks / form feeds.
    t = text.replace("\f", " ").replace("\n", " ").replace("­", "")
    t = re.sub(r"\s+", " ", t).strip()
    t = t.replace("POKéMON", "Pokémon").replace("POKeMON", "Pokémon")
    return t


def best_flavor(species):
    if not species:
        return None
    entries = [e for e in species.get("flavor_text_entries", [])
               if e.get("language", {}).get("name") == "en"]
    # Prefer a recent, gentle generation's wording if available.
    for ver in ("sword", "shield", "lets-go-pikachu", "sun", "x", "omega-ruby"):
        for e in entries:
            if e.get("version", {}).get("name") == ver:
                return clean_fact(e["flavor_text"])
    return clean_fact(entries[0]["flavor_text"]) if entries else None


def parse_overrides(path):
    """Pull existing id -> fact (and name/types) from a current pokedex.ts so
    hand-written facts survive regeneration."""
    overrides = {}
    if not os.path.exists(path):
        return overrides
    src = open(path, encoding="utf-8").read()
    for m in re.finditer(
        r'\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*types:\s*\[([^\]]*)\],\s*fact:\s*"((?:[^"\\]|\\.)*)"',
        src,
    ):
        pid = int(m.group(1))
        types = [t.strip().strip('"') for t in m.group(3).split(",") if t.strip()]
        overrides[pid] = {
            "name": m.group(2),
            "types": types,
            "fact": m.group(4).replace('\\"', '"'),
        }
    return overrides


def build_entry(pid, overrides):
    if pid in overrides:
        o = overrides[pid]
        return {"id": pid, "name": o["name"], "types": o["types"], "fact": o["fact"]}
    poke = fetch_json(f"{API}/pokemon/{pid}")
    species = fetch_json(f"{API}/pokemon-species/{pid}")
    if not poke:
        return {"id": pid, "name": f"#{pid}", "types": ["Normal"],
                "fact": "A mysterious Pokémon."}
    name = title((species or {}).get("name") or poke["name"])
    types = [title(t["type"]["name"]) for t in
             sorted(poke["types"], key=lambda t: t["slot"])]
    fact = best_flavor(species) or f"{name} is a {' / '.join(types)} type Pokémon."
    # Keep facts short for young readers.
    if len(fact) > 180:
        fact = fact[:177].rstrip() + "…"
    return {"id": pid, "name": name, "types": types, "fact": fact}


def js_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main(argv):
    max_id = int(argv[0]) if argv else MAX_ID
    overrides = parse_overrides(OUT)
    print(f"Generating Pokédex 1..{max_id} ({len(overrides)} hand-written facts preserved)")

    ids = list(range(1, max_id + 1))
    entries = [None] * len(ids)
    done = 0
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(build_entry, pid, overrides): i for i, pid in enumerate(ids)}
        for fut in futs:
            pass
        for fut, i in futs.items():
            entries[i] = fut.result()
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(ids)}")

    type_colors_lines = ",\n  ".join(
        f'{t}: "{TYPE_COLORS[t]}"' for t in TYPE_ORDER
    )
    lines = []
    lines.append("// Offline Pokédex dataset — National Dex #1..#%d." % max_id)
    lines.append("// Generated by scripts/gen-pokedex.py from PokeAPI; hand-written")
    lines.append("// facts for the early/popular Pokémon are preserved across regen.")
    lines.append("// Sprites are fetched on-device by scripts/cache-assets.py.")
    lines.append("export interface PokedexEntry {")
    lines.append("  id: number;")
    lines.append("  name: string;")
    lines.append("  types: string[];")
    lines.append("  fact: string;")
    lines.append("}")
    lines.append("")
    lines.append("export const pokedex: PokedexEntry[] = [")
    for e in entries:
        types = ", ".join(js_str(t) for t in e["types"])
        lines.append(
            f'  {{ id: {e["id"]}, name: {js_str(e["name"])}, '
            f'types: [{types}], fact: {js_str(e["fact"])} }},'
        )
    lines.append("];")
    lines.append("")
    lines.append("export const TYPE_COLORS: Record<string, string> = {")
    lines.append("  " + type_colors_lines + ",")
    lines.append("};")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUT} ({len(entries)} entries)")


if __name__ == "__main__":
    main(sys.argv[1:])

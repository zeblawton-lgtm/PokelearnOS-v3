// ---------------------------------------------------------------------------
// Pokémon name pronunciation for the TTS voice (ADR-005).
//
// The TTS box reads plain text, and many Pokémon names trip it up
// ("Gengar", "Arceus", "Rayquaza"...). PRONUNCIATIONS maps names to phonetic
// respellings sourced from Smogon's official pronunciation guide. Only the
// string SENT TO the TTS is transformed — on-screen text always shows the
// real name. Unmapped names (incl. Gens 6–9, which the guide doesn't cover)
// pass through unchanged.
// ---------------------------------------------------------------------------
// Relative import (not "@/") so Node tooling like scripts/warm-tts.ts can
// load this module without tsconfig path-alias resolution.
import { PRONUNCIATIONS } from "../content/pronunciations";

let pattern: RegExp | null = null;

function namePattern(): RegExp {
  if (!pattern) {
    const names = Object.keys(PRONUNCIATIONS)
      .sort((a, b) => b.length - a.length) // longest first ("mr mime" before "mime")
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    pattern = new RegExp(`\\b(${names.join("|")})\\b`, "gi");
  }
  return pattern;
}

/** Spoken form of a single Pokémon name. */
export function spokenName(name: string): string {
  return PRONUNCIATIONS[name.toLowerCase()] ?? name;
}

/** Replace every known Pokémon name inside a narration sentence. */
export function spokenText(text: string): string {
  return text.replace(namePattern(), (m) => PRONUNCIATIONS[m.toLowerCase()] ?? m);
}

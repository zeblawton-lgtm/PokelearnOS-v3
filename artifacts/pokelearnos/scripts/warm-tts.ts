#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// warm-tts.ts — Pre-warm the TTS cache for every narration phrase in
// PokéLearnOS, so kids never wait for synthesis at runtime.
//
// Usage:
//   tsx scripts/warm-tts.ts [--dry-run]
//
// --dry-run prints per-module counts + 3 sample phrases each, no network.
//
// Real warm:
//   TTS_PROMPT_URL=http://10.0.100.137:8765 tsx scripts/warm-tts.ts
//
// The TTS box must expose POST /tts/prompt  { text: string, language: string }
// and return a JSON body with a "cached" boolean (or any body on 200).
// Cache key on the server: lang\ntext  (matching what the frontend uses).
// ---------------------------------------------------------------------------

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Resolve the repo root relative to this script.
// scripts/ is one level under artifacts/pokelearnos/.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = join(__dirname, "../src");

// ---------------------------------------------------------------------------
// Pure content + lib imports via relative paths (avoids @/ alias under tsx).
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { math3YoQuestions } = await import(join(SRC, "content/math-3yo.ts")) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { math5YoQuestions } = await import(join(SRC, "content/math-5yo.ts")) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { spanishQuestions } = await import(join(SRC, "content/spanish.ts")) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { pokedex } = await import(join(SRC, "content/pokedex.ts")) as any;

// The REAL builders and transforms the app uses — single source of truth.
// spoken-math.ts only has type-only "@/" imports (erased at runtime) and
// pronounce.ts uses relative imports, so both load fine under plain tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { POKEMON_POOL, getSpokenQuestion, getSpokenExplanation } =
  await import(join(SRC, "lib/spoken-math.ts")) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { spokenName, spokenText } = await import(join(SRC, "lib/pronounce.ts")) as any;

// ---------------------------------------------------------------------------
// Lang mapping: en/es/auto -> human labels + server strings
// ---------------------------------------------------------------------------
const LANG_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  auto: "Auto",
};

// ---------------------------------------------------------------------------
// Phrase record
// ---------------------------------------------------------------------------
interface Phrase {
  text: string;
  lang: "en" | "es" | "auto";
  module: string;
}

// ---------------------------------------------------------------------------
// Build phase lists
// ---------------------------------------------------------------------------

function buildMathPhrases(): Phrase[] {
  const phrases: Phrase[] = [];

  // --- 3yo questions (getSpokenQuestion, is3yo=true, wrapped in spokenText)
  for (const q of math3YoQuestions) {
    for (const pokemon of POKEMON_POOL) {
      const raw = getSpokenQuestion(q, pokemon.name, true);
      const text = spokenText(raw);
      phrases.push({ text, lang: "en", module: "math" });
    }
  }

  // --- 3yo explanations (getSpokenExplanation for 3yo questions, wrapped in spokenText)
  for (const q of math3YoQuestions) {
    const raw = getSpokenExplanation(q);
    const text = spokenText(raw);
    phrases.push({ text, lang: "en", module: "math" });
  }

  // --- 5yo questions (getSpokenQuestion, is3yo=false, wrapped in spokenText)
  for (const q of math5YoQuestions) {
    const raw = getSpokenQuestion(q, "", false);
    const text = spokenText(raw);
    // word problems already carry their own Pokemon name; add/sub/multiply have no name
    phrases.push({ text, lang: "en", module: "math" });
  }

  // --- 5yo explanations (getSpokenExplanation for 5yo questions, wrapped in spokenText)
  for (const q of math5YoQuestions) {
    const raw = getSpokenExplanation(q);
    const text = spokenText(raw);
    phrases.push({ text, lang: "en", module: "math" });
  }

  return phrases;
}

function buildSpanishPhrases(): Phrase[] {
  const phrases: Phrase[] = [];
  for (const q of spanishQuestions) {
    // Spanish word (es, no transform)
    if (q.spanishWord) {
      phrases.push({ text: q.spanishWord as string, lang: "es", module: "spanish" });
    }
    // Wrong-answer: spokenName(q.answer) with lang "auto"
    const spoken = spokenName(q.answer as string);
    phrases.push({ text: spoken, lang: "auto", module: "spanish" });
  }
  return phrases;
}

function buildTracingPhrases(): Phrase[] {
  const phrases: Phrase[] = [];
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const NUMBERS = "0123456789".split("");
  const SHAPE_NAMES = ["Circle", "Square", "Triangle", "Star", "Heart"];

  for (const l of LETTERS) {
    phrases.push({ text: `Letter ${l}!`, lang: "en", module: "tracing" });
  }
  for (const n of NUMBERS) {
    phrases.push({ text: `Number ${n}!`, lang: "en", module: "tracing" });
  }
  for (const s of SHAPE_NAMES) {
    phrases.push({ text: `${s}!`, lang: "en", module: "tracing" });
  }
  return phrases;
}

function buildDotsPhrases(): Phrase[] {
  const phrases: Phrase[] = [];
  // Count utterances 1..14
  for (let i = 1; i <= 14; i++) {
    phrases.push({ text: String(i), lang: "en", module: "dots" });
  }
  // Reveal phrases: It's <spokenName>!
  const DOTS_POOL_IDS = [25, 1, 4, 7, 133, 39, 143, 6, 131, 151, 54, 129, 35, 52, 113, 175];
  for (const id of DOTS_POOL_IDS) {
    const entry = (pokedex as Array<{ id: number; name: string }>).find((e) => e.id === id);
    const name = entry?.name ?? `#${id}`;
    const text = `It's ${spokenName(name)}!`;
    phrases.push({ text, lang: "en", module: "dots" });
  }
  return phrases;
}

function buildMatchPhrases(): Phrase[] {
  const MATCH_POOL_IDS = [25, 1, 4, 7, 133, 39, 143, 6, 131, 151, 52, 54, 129, 35, 94, 175];
  const phrases: Phrase[] = [];
  for (const id of MATCH_POOL_IDS) {
    const entry = (pokedex as Array<{ id: number; name: string }>).find((e) => e.id === id);
    const name = entry?.name ?? `#${id}`;
    const text = spokenName(name);
    phrases.push({ text, lang: "en", module: "match" });
  }
  return phrases;
}

function buildColoringPhrases(): Phrase[] {
  const PALETTE = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Brown", "Black", "White"];
  return PALETTE.map((name) => ({ text: name, lang: "en" as const, module: "coloring" }));
}

function buildRegionsPhrases(): Phrase[] {
  const HABITATS = [
    { name: "Rainforest", climate: "Warm and wet" },
    { name: "Desert", climate: "Hot and dry" },
    { name: "Ocean Reef", climate: "Warm water" },
    { name: "Mountain", climate: "Cool and windy" },
    { name: "Grassland", climate: "Sunny and open" },
    { name: "Snowy Land", climate: "Cold and icy" },
  ];
  return HABITATS.map((h) => ({
    text: spokenText(`${h.name}. ${h.climate}.`),
    lang: "en" as const,
    module: "regions",
  }));
}

async function buildPokedexPhrases(): Promise<Phrase[]> {
  const artworkDir = join(__dirname, "../public/sprites/official-artwork");
  const files = await readdir(artworkDir);
  const bundledIds = new Set(
    files
      .filter((f) => f.endsWith(".png"))
      .map((f) => parseInt(f.replace(".png", ""), 10))
      .filter((n) => !Number.isNaN(n)),
  );
  const phrases: Phrase[] = [];
  for (const entry of pokedex as Array<{ id: number; name: string }>) {
    if (bundledIds.has(entry.id)) {
      phrases.push({ text: spokenName(entry.name), lang: "en", module: "pokedex" });
    }
  }
  return phrases;
}

// ---------------------------------------------------------------------------
// Dedup: cache key is lang + "\n" + text  (mirrors the frontend tts.ts logic)
// ---------------------------------------------------------------------------
function dedup(phrases: Phrase[]): Phrase[] {
  const seen = new Set<string>();
  const out: Phrase[] = [];
  for (const p of phrases) {
    const key = `${p.lang}\n${p.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Network: POST each phrase to the TTS box
// ---------------------------------------------------------------------------
const TTS_BASE = process.env.TTS_PROMPT_URL ?? "http://10.0.100.137:8765";
const REQUEST_TIMEOUT_MS = 240_000;

async function postPhrase(p: Phrase): Promise<{ ok: boolean; cached: boolean }> {
  const language = LANG_MAP[p.lang] ?? p.lang;
  const body = JSON.stringify({ text: p.text, language });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${TTS_BASE}/tts/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, cached: false };
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: true, cached: json.cached === true };
  } catch {
    clearTimeout(timer);
    return { ok: false, cached: false };
  }
}

async function warmPhrase(p: Phrase): Promise<{ ok: boolean; cached: boolean }> {
  const first = await postPhrase(p);
  if (first.ok) return first;
  // one retry
  return postPhrase(p);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Build all phrase lists
  const mathPhrases = dedup(buildMathPhrases());
  const spanishPhrases = dedup(buildSpanishPhrases());
  const tracingPhrases = dedup(buildTracingPhrases());
  const dotsPhrases = dedup(buildDotsPhrases());
  const matchPhrases = dedup(buildMatchPhrases());
  const coloringPhrases = dedup(buildColoringPhrases());
  const regionsPhrases = dedup(buildRegionsPhrases());
  const pokedexPhrases = dedup(await buildPokedexPhrases());

  const allPhrases = dedup([
    ...mathPhrases,
    ...spanishPhrases,
    ...tracingPhrases,
    ...dotsPhrases,
    ...matchPhrases,
    ...coloringPhrases,
    ...regionsPhrases,
    ...pokedexPhrases,
  ]);

  const modules = [
    { name: "math", phrases: mathPhrases },
    { name: "spanish", phrases: spanishPhrases },
    { name: "tracing", phrases: tracingPhrases },
    { name: "dots", phrases: dotsPhrases },
    { name: "match", phrases: matchPhrases },
    { name: "coloring", phrases: coloringPhrases },
    { name: "regions", phrases: regionsPhrases },
    { name: "pokedex", phrases: pokedexPhrases },
  ];

  if (dryRun) {
    console.log("\n=== warm-tts DRY RUN ===\n");
    for (const mod of modules) {
      console.log(`[${mod.name}] ${mod.phrases.length} phrases`);
      for (const p of mod.phrases.slice(0, 3)) {
        console.log(`  (${p.lang}) "${p.text}"`);
      }
    }
    console.log(`\nGRAND TOTAL (deduplicated): ${allPhrases.length} phrases`);
    console.log(`\nTo warm the cache, run:`);
    console.log(`  TTS_PROMPT_URL=http://10.0.100.137:8765 tsx scripts/warm-tts.ts`);
    return;
  }

  // ---- Real warm ----
  const total = allPhrases.length;
  let done = 0;
  let failed = 0;
  let cacheHits = 0;
  const times: number[] = [];

  console.log(`\nWarming ${total} phrases against ${TTS_BASE} ...\n`);

  for (const p of allPhrases) {
    const t0 = Date.now();
    const result = await warmPhrase(p);
    const elapsed = Date.now() - t0;
    times.push(elapsed);
    done++;
    if (result.ok) {
      if (result.cached) cacheHits++;
    } else {
      failed++;
      console.error(`  FAIL [${p.lang}] "${p.text}"`);
    }

    if (done % 10 === 0 || done === total) {
      const pct = Math.round((done / total) * 100);
      const hitPct = Math.round((cacheHits / done) * 100);
      const avgMs = times.slice(-20).reduce((s, v) => s + v, 0) / Math.min(times.length, 20);
      const etaSec = Math.round(((total - done) * avgMs) / 1000);
      const etaStr = etaSec > 60
        ? `${Math.floor(etaSec / 60)}m${etaSec % 60}s`
        : `${etaSec}s`;
      console.log(
        `  ${done}/${total} (${pct}%) | cache-hits ${hitPct}% | ETA ${done < total ? etaStr : "done"} | failed ${failed}`,
      );
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  Total:      ${total}`);
  console.log(`  Succeeded:  ${total - failed}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Cache hits: ${cacheHits} (${Math.round((cacheHits / total) * 100)}%)`);

  if (failed / total > 0.1) {
    console.error(`\nERROR: ${failed}/${total} phrases failed (>${Math.round((failed / total) * 100)}% > 10% threshold).`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

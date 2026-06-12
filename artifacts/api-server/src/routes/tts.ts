// ---------------------------------------------------------------------------
// Voice narration proxy (ADR-005, ADR-007).
//
// The kiosk frontend only ever talks to its own origin, so speech is proxied
// here: GET /api/tts?text=...&lang=en|es|auto asks the LAN Qwen3-TTS box for
// audio and streams it back. Two box protocols, in preference order:
//
//   1. POST {TTS_PROMPT_URL}/tts/prompt {text, language} -> {audio: mp3Path}
//      (ADR-007 — the box's own prompt-cache endpoint, voice-cloned speaker,
//      persistent box-side MP3 library shared by every kiosk). If the
//      endpoint is missing/unreachable we remember that for a few minutes
//      instead of probing on every utterance.
//   2. The Gradio app — POST /gradio_api/call/run_instruct, read the SSE
//      result stream, download the generated wav ("Vivian" voice).
//
// Audio is cached on disk keyed by voice+lang+text, so the finite question
// banks converge to zero TTS-box traffic and previously heard phrases keep
// working even while the box is offline. Phrases that only have a legacy
// Vivian wav are served instantly and re-synthesized with the cloned voice
// in the background, one at a time. When all synthesis fails the route
// returns 503 and the frontend falls back to SpeechSynthesis — the app
// never *requires* the TTS box.
// ---------------------------------------------------------------------------
import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Logger } from "pino";

const router = Router();

const TTS_URL = (process.env["TTS_URL"] ?? "http://10.0.100.137:8000").replace(/\/+$/, "");
// The box's prompt-cache server (ADR-007) lives on its own port.
const TTS_PROMPT_URL = (process.env["TTS_PROMPT_URL"] ?? "http://10.0.100.137:8765").replace(/\/+$/, "");
const TTS_VOICE = process.env["TTS_VOICE"] ?? "Vivian";
const TTS_INSTRUCT =
  process.env["TTS_INSTRUCT"] ??
  "Speak warmly, clearly and a little slowly, like a friendly teacher talking to a young child.";
const CACHE_DIR = process.env["TTS_CACHE_DIR"] ?? path.join(os.tmpdir(), "pokelearnos-tts");
const REQUEST_TIMEOUT_MS = 30_000;
// voice_clone.py loads the model per invocation, so first synthesis of a
// phrase can take a long time. Prefetch absorbs this in the background.
const PROMPT_TIMEOUT_MS = 120_000;
const PROMPT_RETRY_MS = 5 * 60_000;
// Cache-key voice marker for prompt-cache audio (the cloned speaker), so
// legacy Vivian wavs and cloned mp3s never collide.
const CLONE_VOICE = "clone";
const MAX_TEXT_LENGTH = 400;

// Qwen3-TTS language dropdown values for the langs the app uses.
const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  auto: "Auto",
};

export function ttsCacheKey(text: string, lang: string, voice: string): string {
  return crypto.createHash("sha256").update(`${voice}\n${lang}\n${text}`).digest("hex");
}

// Pull the generated file URL out of a finished /gradio_api/call SSE body.
export function parseGradioFileUrl(sse: string, baseUrl: string): string | null {
  let lastEvent = "";
  for (const line of sse.split("\n")) {
    if (line.startsWith("event:")) lastEvent = line.slice("event:".length).trim();
    if (line.startsWith("data:") && lastEvent === "complete") {
      try {
        const data: unknown = JSON.parse(line.slice("data:".length).trim());
        const file = Array.isArray(data) ? (data[0] as { url?: string; path?: string } | null) : null;
        if (file?.url) return file.url;
        if (file?.path) return `${baseUrl}/gradio_api/file=${file.path}`;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function synthesize(text: string, lang: string): Promise<Buffer> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const call = await fetch(`${TTS_URL}/gradio_api/call/run_instruct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text, LANGUAGES[lang], TTS_VOICE, TTS_INSTRUCT] }),
    signal,
  });
  if (!call.ok) throw new Error(`TTS call failed: ${call.status}`);
  const { event_id: eventId } = (await call.json()) as { event_id?: string };
  if (!eventId) throw new Error("TTS call returned no event id");

  const stream = await fetch(`${TTS_URL}/gradio_api/call/run_instruct/${eventId}`, { signal });
  if (!stream.ok) throw new Error(`TTS result stream failed: ${stream.status}`);
  const fileUrl = parseGradioFileUrl(await stream.text(), TTS_URL);
  if (!fileUrl) throw new Error("TTS produced no audio file");

  const audio = await fetch(fileUrl, { signal });
  if (!audio.ok) throw new Error(`TTS audio download failed: ${audio.status}`);
  return Buffer.from(await audio.arrayBuffer());
}

// ---------------------------------------------------------------------------
// ADR-007 — box-side prompt cache (cloned voice, mp3)
// ---------------------------------------------------------------------------

// While > now, skip the prompt-cache endpoint entirely (it 404'd or the
// connection failed) instead of paying its timeout on every utterance.
let promptDownUntil = 0;

async function synthesizeViaPromptCache(text: string, lang: string): Promise<Buffer> {
  const signal = AbortSignal.timeout(PROMPT_TIMEOUT_MS);

  let call: Response;
  try {
    call = await fetch(`${TTS_PROMPT_URL}/tts/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: LANGUAGES[lang] }),
      signal,
    });
  } catch (err) {
    promptDownUntil = Date.now() + PROMPT_RETRY_MS;
    throw err;
  }
  if (call.status === 404 || call.status === 405) {
    // Endpoint not deployed (yet) on this box — don't probe per-utterance.
    promptDownUntil = Date.now() + PROMPT_RETRY_MS;
    throw new Error(`prompt cache endpoint missing (${call.status})`);
  }
  if (!call.ok) throw new Error(`prompt cache call failed: ${call.status}`);

  const { audio: audioPath } = (await call.json()) as { audio?: string };
  if (!audioPath) throw new Error("prompt cache returned no audio path");
  const audioUrl = /^https?:/i.test(audioPath)
    ? audioPath
    : `${TTS_PROMPT_URL}/${audioPath.replace(/^\/+/, "")}`;

  const audio = await fetch(audioUrl, { signal });
  if (!audio.ok) throw new Error(`prompt cache audio download failed: ${audio.status}`);
  return Buffer.from(await audio.arrayBuffer());
}

function writeCache(file: string, audio: Buffer) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, audio);
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------------------
// Pending-upgrade queue: re-synthesize legacy Vivian wavs with the cloned
// voice in the background, but only when there are no foreground requests
// in flight. This ensures background work never slows down a waiting child.
// ---------------------------------------------------------------------------

const UPGRADE_QUEUE_MAX = 500;

interface UpgradeEntry {
  text: string;
  lang: string;
  mp3File: string;
}

// Map keyed by `${lang}\n${text}` to avoid duplicate entries.
const upgradeQueue = new Map<string, UpgradeEntry>();
let upgradeBusy = false;

function scheduleVoiceUpgrade(text: string, lang: string, mp3File: string, _log: Logger) {
  if (upgradeQueue.size >= UPGRADE_QUEUE_MAX) return;
  const key = `${lang}\n${text}`;
  if (!upgradeQueue.has(key)) {
    upgradeQueue.set(key, { text, lang, mp3File });
  }
  drainUpgrades(_log);
}

function drainUpgrades(log: Logger) {
  // Yield to foreground: don't run if requests are in flight.
  if (upgradeBusy || inFlight.size > 0) return;
  if (upgradeQueue.size === 0) return;
  // If the prompt endpoint is currently negative-cached, leave the queue
  // intact — a later drain trigger (after the window expires) will process it.
  if (Date.now() < promptDownUntil) return;

  const [key, entry] = upgradeQueue.entries().next().value as [string, UpgradeEntry];
  upgradeQueue.delete(key);

  // Skip if the mp3 was already written by a concurrent foreground synthesis.
  if (fs.existsSync(entry.mp3File)) {
    drainUpgrades(log);
    return;
  }

  upgradeBusy = true;
  synthesizeViaPromptCache(entry.text, entry.lang)
    .then((audio) => writeCache(entry.mp3File, audio))
    .catch((err: unknown) => log.debug({ err }, "voice upgrade skipped"))
    .finally(() => {
      upgradeBusy = false;
      drainUpgrades(log);
    });
}

interface TtsResult {
  audio: Buffer;
  contentType: string;
}

async function obtain(text: string, lang: string, log: Logger): Promise<TtsResult> {
  const mp3File = path.join(CACHE_DIR, `${ttsCacheKey(text, lang, CLONE_VOICE)}.mp3`);
  const wavFile = path.join(CACHE_DIR, `${ttsCacheKey(text, lang, TTS_VOICE)}.wav`);

  // 1. Cloned-voice mp3 cache — the preferred, final state for a phrase.
  if (fs.existsSync(mp3File)) {
    return { audio: fs.readFileSync(mp3File), contentType: "audio/mpeg" };
  }

  // 2. Legacy Vivian wav cache — serve instantly, upgrade in the background.
  if (fs.existsSync(wavFile)) {
    scheduleVoiceUpgrade(text, lang, mp3File, log);
    return { audio: fs.readFileSync(wavFile), contentType: "audio/wav" };
  }

  // 3. Box prompt-cache endpoint (cloned voice).
  if (Date.now() >= promptDownUntil) {
    try {
      const audio = await synthesizeViaPromptCache(text, lang);
      writeCache(mp3File, audio);
      return { audio, contentType: "audio/mpeg" };
    } catch (err) {
      log.debug({ err }, "prompt cache unavailable, trying Gradio");
    }
  }

  // 4. Gradio flow (Vivian).
  const audio = await synthesize(text, lang);
  writeCache(wavFile, audio);
  return { audio, contentType: "audio/wav" };
}

// Collapse concurrent requests for the same utterance into one synthesis.
const inFlight = new Map<string, Promise<TtsResult>>();

/** Test hook: clear negative caching, in-flight state, and upgrade queue between cases. */
export function resetTtsRuntimeState() {
  promptDownUntil = 0;
  inFlight.clear();
  upgradeQueue.clear();
  upgradeBusy = false;
}

router.get("/tts", async (req, res) => {
  const text = String(req.query["text"] ?? "").trim();
  const lang = String(req.query["lang"] ?? "en");
  if (!text || text.length > MAX_TEXT_LENGTH) {
    res.status(400).json({ error: `text is required (max ${MAX_TEXT_LENGTH} chars)` });
    return;
  }
  if (!(lang in LANGUAGES)) {
    res.status(400).json({ error: "lang must be one of: en, es, auto" });
    return;
  }

  const flightKey = `${lang}\n${text}`;
  const log = req.log;
  try {
    let pending = inFlight.get(flightKey);
    if (!pending) {
      pending = obtain(text, lang, log).finally(() => {
        inFlight.delete(flightKey);
        drainUpgrades(log);
      });
      inFlight.set(flightKey, pending);
    }
    const { audio, contentType } = await pending;
    res
      .set("Content-Type", contentType)
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .send(audio);
  } catch (err) {
    log.warn({ err }, "TTS unavailable");
    res.status(503).json({ error: "TTS unavailable" });
  }
});

export default router;

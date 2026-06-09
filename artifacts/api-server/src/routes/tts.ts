// ---------------------------------------------------------------------------
// Voice narration proxy (ADR-005).
//
// The kiosk frontend only ever talks to its own origin, so speech is proxied
// here: GET /api/tts?text=...&lang=en|es|auto calls the LAN Qwen3-TTS box
// (a Gradio app — POST /gradio_api/call/run_instruct, then read the SSE
// result stream, then download the generated wav) and streams the audio back.
//
// Generated audio is cached on disk keyed by voice+lang+text, so the finite
// question banks converge to zero TTS-box traffic and previously heard
// phrases keep working even while the box is offline. When synthesis fails
// the route returns 503 and the frontend falls back to SpeechSynthesis —
// the app never *requires* the TTS box.
// ---------------------------------------------------------------------------
import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const router = Router();

const TTS_URL = (process.env["TTS_URL"] ?? "http://10.0.100.137:8000").replace(/\/+$/, "");
const TTS_VOICE = process.env["TTS_VOICE"] ?? "Vivian";
const TTS_INSTRUCT =
  process.env["TTS_INSTRUCT"] ??
  "Speak warmly, clearly and a little slowly, like a friendly teacher talking to a young child.";
const CACHE_DIR = process.env["TTS_CACHE_DIR"] ?? path.join(os.tmpdir(), "pokelearnos-tts");
const REQUEST_TIMEOUT_MS = 30_000;
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

// Collapse concurrent requests for the same utterance into one synthesis.
const inFlight = new Map<string, Promise<Buffer>>();

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

  const key = ttsCacheKey(text, lang, TTS_VOICE);
  const cacheFile = path.join(CACHE_DIR, `${key}.wav`);
  try {
    let audio: Buffer;
    if (fs.existsSync(cacheFile)) {
      audio = fs.readFileSync(cacheFile);
    } else {
      let pending = inFlight.get(key);
      if (!pending) {
        pending = synthesize(text, lang).finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
      }
      audio = await pending;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const tmp = `${cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, audio);
      fs.renameSync(tmp, cacheFile);
    }
    res
      .set("Content-Type", "audio/wav")
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .send(audio);
  } catch (err) {
    req.log.warn({ err }, "TTS unavailable");
    res.status(503).json({ error: "TTS unavailable" });
  }
});

export default router;

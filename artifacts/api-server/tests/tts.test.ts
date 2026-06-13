import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ADMIN_AUTH_SECRET = "test-admin-auth-secret";
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/pokelearnos_test";
process.env.TTS_CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "pokelearnos-tts-test-"));

// ---------------------------------------------------------------------------
// Mock Qwen3-TTS Gradio server: call endpoint -> event id -> SSE result
// stream -> wav file download.
// ---------------------------------------------------------------------------
const WAV = Buffer.from("RIFFfake-wav-bytes-for-test");
const MP3 = Buffer.from("ID3fake-mp3-bytes-for-test");
let synthCalls = 0;
let promptCalls = 0;
// The ADR-007 prompt-cache endpoint is toggleable so tests can cover both
// "deployed" and "not deployed yet" box states.
let promptEnabled = false;
let mockPort = 0;

const mock = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/tts/prompt") {
    promptCalls += 1;
    if (!promptEnabled) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ audio: "assets/audio/prompts/qwen3-tts-test.mp3", cached: false }));
    return;
  }
  if (req.url === "/assets/audio/prompts/qwen3-tts-test.mp3") {
    res.setHeader("Content-Type", "audio/mpeg");
    res.end(MP3);
    return;
  }
  if (req.method === "POST" && req.url === "/gradio_api/call/run_instruct") {
    synthCalls += 1;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ event_id: "ev123" }));
    return;
  }
  if (req.url === "/gradio_api/call/run_instruct/ev123") {
    res.setHeader("Content-Type", "text/event-stream");
    res.end(
      `event: complete\ndata: [{"path": "/tmp/audio.wav", "url": "http://127.0.0.1:${mockPort}/gradio_api/file=/tmp/audio.wav", "meta": {"_type": "gradio.FileData"}}, "Finished"]\n\n`,
    );
    return;
  }
  if (req.url?.startsWith("/gradio_api/file=")) {
    res.setHeader("Content-Type", "audio/wav");
    res.end(WAV);
    return;
  }
  res.statusCode = 404;
  res.end();
});

mock.listen(0, "127.0.0.1");
await once(mock, "listening");
mockPort = (mock.address() as AddressInfo).port;
process.env.TTS_URL = `http://127.0.0.1:${mockPort}`;
process.env.TTS_PROMPT_URL = `http://127.0.0.1:${mockPort}`;

// Import AFTER env is set — the tts route reads TTS_URL at module load.
const { parseGradioFileUrl, ttsCacheKey, resetTtsRuntimeState } = await import("../src/routes/tts");
const { default: app } = await import("../src/app");

let baseUrl = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  mock.close();
});

test("parseGradioFileUrl extracts the file url from a complete event", () => {
  const sse = `event: complete\ndata: [{"path": "/tmp/x.wav", "url": "http://box/gradio_api/file=/tmp/x.wav"}, "ok"]\n\n`;
  assert.equal(parseGradioFileUrl(sse, "http://box"), "http://box/gradio_api/file=/tmp/x.wav");
});

test("parseGradioFileUrl builds a url from path when url is missing", () => {
  const sse = `event: complete\ndata: [{"path": "/tmp/x.wav"}, "ok"]\n\n`;
  assert.equal(parseGradioFileUrl(sse, "http://box"), "http://box/gradio_api/file=/tmp/x.wav");
});

test("parseGradioFileUrl returns null for error events", () => {
  assert.equal(parseGradioFileUrl(`event: error\ndata: null\n\n`, "http://box"), null);
});

test("ttsCacheKey is deterministic and varies by language", () => {
  assert.equal(ttsCacheKey("hola", "es", "Vivian"), ttsCacheKey("hola", "es", "Vivian"));
  assert.notEqual(ttsCacheKey("hola", "es", "Vivian"), ttsCacheKey("hola", "en", "Vivian"));
});

test("GET /tts falls back to Gradio when the prompt cache is absent, and negative-caches the absence", async () => {
  resetTtsRuntimeState();
  promptEnabled = false;
  const promptCallsBefore = promptCalls;

  const first = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type")?.includes("audio/wav"), true);
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), WAV);
  assert.equal(synthCalls, 1);
  assert.equal(promptCalls, promptCallsBefore + 1); // probed once, got 404

  const second = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
  assert.equal(second.status, 200);
  assert.deepEqual(Buffer.from(await second.arrayBuffer()), WAV);
  assert.equal(synthCalls, 1); // served from the disk cache

  // A different uncached phrase: the 404 is negative-cached, so the prompt
  // endpoint must NOT be probed again — straight to Gradio.
  const third = await fetch(`${baseUrl}/tts?text=something%20else&lang=en`);
  assert.equal(third.status, 200);
  assert.equal(third.headers.get("content-type")?.includes("audio/wav"), true);
  assert.equal(synthCalls, 2);
  assert.equal(promptCalls, promptCallsBefore + 1);
});

test("GET /tts prefers the box prompt cache (mp3) when deployed", async () => {
  resetTtsRuntimeState();
  promptEnabled = true;
  const synthCallsBefore = synthCalls;
  const promptCallsBefore = promptCalls;

  const first = await fetch(`${baseUrl}/tts?text=cloned%20voice%20phrase&lang=en`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type")?.includes("audio/mpeg"), true);
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), MP3);
  assert.equal(promptCalls, promptCallsBefore + 1);
  assert.equal(synthCalls, synthCallsBefore); // Gradio untouched

  const second = await fetch(`${baseUrl}/tts?text=cloned%20voice%20phrase&lang=en`);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("content-type")?.includes("audio/mpeg"), true);
  assert.equal(promptCalls, promptCallsBefore + 1); // served from the disk cache
});

test("GET /tts serves a legacy wav instantly and upgrades it to the cloned voice in the background", async () => {
  resetTtsRuntimeState();
  promptEnabled = true;
  const promptCallsBefore = promptCalls;

  // "hello there" was wav-cached by the Gradio fallback test above.
  const res = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type")?.includes("audio/wav"), true); // instant legacy hit

  // The background upgrade re-synthesizes via the prompt cache...
  for (let i = 0; i < 100 && promptCalls === promptCallsBefore; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(promptCalls, promptCallsBefore + 1);

  // ...so the phrase serves as cloned-voice mp3 afterwards.
  let upgraded: Response | null = null;
  for (let i = 0; i < 100; i++) {
    upgraded = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
    if (upgraded.headers.get("content-type")?.includes("audio/mpeg")) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(upgraded?.headers.get("content-type")?.includes("audio/mpeg"), true);
  assert.deepEqual(Buffer.from(await upgraded!.arrayBuffer()), MP3);
});

test("GET /tts validates text and lang", async () => {
  const missing = await fetch(`${baseUrl}/tts`);
  assert.equal(missing.status, 400);

  const badLang = await fetch(`${baseUrl}/tts?text=hi&lang=de`);
  assert.equal(badLang.status, 400);

  const tooLong = await fetch(`${baseUrl}/tts?text=${"a".repeat(401)}&lang=en`);
  assert.equal(tooLong.status, 400);
});

test("GET /tts returns 503 when the TTS box is unreachable", async () => {
  // Uncached text + the mock taken down = synthesis must fail gracefully.
  resetTtsRuntimeState();
  mock.close();
  await once(mock, "close");
  const res = await fetch(`${baseUrl}/tts?text=never%20cached&lang=en`);
  assert.equal(res.status, 503);
  mock.listen(mockPort, "127.0.0.1");
  await once(mock, "listening");
});

test("upgrade queue processes multiple legacy-wav entries sequentially", async () => {
  resetTtsRuntimeState();
  promptEnabled = true;

  const cacheDir = process.env["TTS_CACHE_DIR"]!;
  const TTS_VOICE_LOCAL = process.env["TTS_VOICE"] ?? "Vivian";
  const CLONE_VOICE_LOCAL = "clone";

  // Write two wav-only cache entries directly so the route treats them as
  // legacy-Vivian phrases that need upgrading.
  const phrase1 = "queue test alpha";
  const phrase2 = "queue test beta";
  const lang = "en";

  const wav1 = path.join(cacheDir, `${ttsCacheKey(phrase1, lang, TTS_VOICE_LOCAL)}.wav`);
  const wav2 = path.join(cacheDir, `${ttsCacheKey(phrase2, lang, TTS_VOICE_LOCAL)}.wav`);
  const mp3_1 = path.join(cacheDir, `${ttsCacheKey(phrase1, lang, CLONE_VOICE_LOCAL)}.mp3`);
  const mp3_2 = path.join(cacheDir, `${ttsCacheKey(phrase2, lang, CLONE_VOICE_LOCAL)}.mp3`);

  // Ensure mp3s are absent, wavs are present.
  if (fs.existsSync(mp3_1)) fs.unlinkSync(mp3_1);
  if (fs.existsSync(mp3_2)) fs.unlinkSync(mp3_2);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(wav1, WAV);
  fs.writeFileSync(wav2, WAV);

  const promptCallsBefore = promptCalls;

  // Request both phrases — each should return the wav instantly and enqueue
  // a background upgrade.
  const res1 = await fetch(`${baseUrl}/tts?text=${encodeURIComponent(phrase1)}&lang=${lang}`);
  assert.equal(res1.status, 200);
  assert.ok(res1.headers.get("content-type")?.includes("audio/wav"), "phrase1 should be served as wav");

  const res2 = await fetch(`${baseUrl}/tts?text=${encodeURIComponent(phrase2)}&lang=${lang}`);
  assert.equal(res2.status, 200);
  assert.ok(res2.headers.get("content-type")?.includes("audio/wav"), "phrase2 should be served as wav");

  // Poll until both mp3 files appear on disk (the queue drains in the
  // background after the requests finish, one entry at a time).
  for (let i = 0; i < 200 && (!fs.existsSync(mp3_1) || !fs.existsSync(mp3_2)); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }

  assert.ok(fs.existsSync(mp3_1), "mp3 for phrase1 should exist after queue drains");
  assert.ok(fs.existsSync(mp3_2), "mp3 for phrase2 should exist after queue drains");
  assert.equal(promptCalls, promptCallsBefore + 2, "prompt endpoint should have been called twice");
});

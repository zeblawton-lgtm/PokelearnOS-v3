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
let synthCalls = 0;
let mockPort = 0;

const mock = http.createServer((req, res) => {
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

// Import AFTER env is set — the tts route reads TTS_URL at module load.
const { parseGradioFileUrl, ttsCacheKey } = await import("../src/routes/tts");
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

test("GET /tts synthesizes via the TTS box and caches on disk", async () => {
  const first = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type")?.includes("audio/wav"), true);
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), WAV);
  assert.equal(synthCalls, 1);

  const second = await fetch(`${baseUrl}/tts?text=hello%20there&lang=en`);
  assert.equal(second.status, 200);
  assert.deepEqual(Buffer.from(await second.arrayBuffer()), WAV);
  assert.equal(synthCalls, 1); // served from the disk cache
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
  mock.close();
  await once(mock, "close");
  const res = await fetch(`${baseUrl}/tts?text=never%20cached&lang=en`);
  assert.equal(res.status, 503);
  mock.listen(mockPort, "127.0.0.1");
  await once(mock, "listening");
});

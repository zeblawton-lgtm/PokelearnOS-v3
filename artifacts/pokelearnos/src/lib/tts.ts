// ---------------------------------------------------------------------------
// Voice narration (ADR-005).
//
// Speech comes from the LAN Qwen3-TTS box ("Vivian" voice) via the backend
// proxy at /api/tts, so the frontend stays same-origin. Utterance audio is
// cached as object URLs. When the proxy is unavailable, falls back to the
// offline SpeechSynthesis voice from lib/sound. Respects the parent sound
// mute toggle.
// ---------------------------------------------------------------------------
import { isMuted, speak as speakFallback } from "@/lib/sound";

export type SpeechLang = "en" | "es" | "auto";

export interface Utterance {
  text: string;
  lang: SpeechLang;
}

const MAX_CACHE = 150;
const cache = new Map<string, string>(); // "lang\ntext" -> object URL

let el: HTMLAudioElement | null = null;
let generation = 0;

function fallbackLang(lang: SpeechLang): string {
  return lang === "es" ? "es-ES" : "en-US";
}

async function fetchUtterance(text: string, lang: SpeechLang): Promise<string> {
  const key = `${lang}\n${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
  if (!res.ok) throw new Error(`tts request failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());

  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      URL.revokeObjectURL(cache.get(oldest)!);
      cache.delete(oldest);
    }
  }
  cache.set(key, url);
  return url;
}

function playUrl(url: string): Promise<void> {
  if (!el) el = new Audio();
  const audio = el;
  audio.src = url;
  audio.currentTime = 0;
  return new Promise((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.onpause = () => resolve(); // stopSpeaking() pauses mid-utterance
    void audio.play().catch(() => resolve());
  });
}

// Cancel any current and queued narration.
export function stopSpeaking() {
  generation += 1;
  if (el) {
    el.onended = null;
    el.pause();
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* best-effort */
    }
  }
}

// Speak utterances in order, cancelling whatever was playing before.
export async function speakSequence(parts: Utterance[]): Promise<void> {
  if (isMuted() || typeof window === "undefined") return;
  stopSpeaking();
  const gen = generation;

  for (const part of parts) {
    const text = part.text.trim();
    if (!text || gen !== generation) return;
    try {
      const url = await fetchUtterance(text, part.lang);
      if (gen !== generation) return;
      await playUrl(url);
    } catch {
      if (gen !== generation) return;
      // Degraded mode: offline robot voice (fire-and-forget, no sequencing).
      speakFallback(text, fallbackLang(part.lang));
    }
  }
}

export async function speakText(text: string, lang: SpeechLang = "en"): Promise<void> {
  return speakSequence([{ text, lang }]);
}

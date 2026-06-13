// ---------------------------------------------------------------------------
// Finger-tracing module — letters, numbers, and shapes.
// Route: /tracing
// ---------------------------------------------------------------------------
import { playCorrect, playTap } from "@/lib/sound";
import { speakText, stopSpeaking, prefetch } from "@/lib/tts";
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, RotateCcw, Volume2, Star } from "lucide-react";
import { useSession } from "@/context/SessionContext";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

type Category = "ABC" | "123" | "Shapes";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = "0123456789".split("");
const SHAPE_NAMES = ["Circle", "Square", "Triangle", "Star", "Heart"] as const;
type ShapeName = (typeof SHAPE_NAMES)[number];

function utteranceFor(cat: Category, item: string): string {
  if (cat === "ABC") return `Letter ${item}!`;
  if (cat === "123") return `Number ${item}!`;
  return `${item}!`;
}

function questionIdFor(cat: Category, item: string): string {
  if (cat === "ABC") return `abc-${item}`;
  if (cat === "123") return `123-${item}`;
  return `shape-${item.toLowerCase()}`;
}

function itemsFor(cat: Category): string[] {
  if (cat === "ABC") return LETTERS;
  if (cat === "123") return NUMBERS;
  return [...SHAPE_NAMES];
}

// ---------------------------------------------------------------------------
// Canvas guide drawing
// ---------------------------------------------------------------------------

const GUIDE_COLOR = "#e5e7eb"; // pale gray
const GUIDE_FILL = "#d1d5db";
const START_DOT_COLOR = "#22c55e"; // green-500

/** Draw the glyph (letter/number) guide onto a canvas. */
function drawLetterGuide(
  canvas: HTMLCanvasElement,
  glyph: string,
  dpr: number,
) {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const fontSize = Math.round(h * 0.76);
  ctx.font = `900 ${fontSize}px system-ui, "Arial Black", sans-serif`;
  ctx.fillStyle = GUIDE_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, w / 2, h / 2 + fontSize * 0.04);

  // Green start-dot — top-left region of the glyph
  const metrics = ctx.measureText(glyph);
  const glyphLeft =
    w / 2 - (metrics.actualBoundingBoxLeft ?? metrics.width / 2);
  const glyphTop =
    h / 2 -
    (metrics.actualBoundingBoxAscent ?? fontSize / 2) +
    fontSize * 0.04;
  const dotR = Math.max(14, w * 0.025);
  ctx.beginPath();
  ctx.arc(glyphLeft + dotR * 1.4, glyphTop + dotR * 1.4, dotR, 0, Math.PI * 2);
  ctx.fillStyle = START_DOT_COLOR;
  ctx.fill();

  ctx.restore();
}

/** Draw a shape guide onto a canvas. */
function drawShapeGuide(
  canvas: HTMLCanvasElement,
  shape: ShapeName,
  dpr: number,
) {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = GUIDE_FILL;
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 6;

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  ctx.beginPath();
  if (shape === "Circle") {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (shape === "Square") {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else if (shape === "Triangle") {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.97, cy + r * 0.82);
    ctx.lineTo(cx - r * 0.97, cy + r * 0.82);
    ctx.closePath();
  } else if (shape === "Star") {
    const spikes = 5;
    const outerR = r;
    const innerR = r * 0.42;
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const rr = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === "Heart") {
    // Simple cubic-bezier heart centred at (cx, cy)
    const s = r * 0.95;
    ctx.moveTo(cx, cy + s * 0.72);
    ctx.bezierCurveTo(
      cx - s * 1.6,
      cy - s * 0.1,
      cx - s * 1.6,
      cy - s * 1.2,
      cx,
      cy - s * 0.5,
    );
    ctx.bezierCurveTo(
      cx + s * 1.6,
      cy - s * 1.2,
      cx + s * 1.6,
      cy - s * 0.1,
      cx,
      cy + s * 0.72,
    );
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // Start dot — top-centre-ish
  const dotR = Math.max(14, w * 0.025);
  let dotX = cx;
  let dotY = cy - r - dotR * 0.5;
  if (shape === "Triangle") dotY = cy - r + dotR * 0.5;
  if (shape === "Heart") dotY = cy - r * 0.35;

  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = START_DOT_COLOR;
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Guide-point sampling (for coverage check)
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

function sampleGuidePoints(canvas: HTMLCanvasElement, gridPx: number): Point[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const pts: Point[] = [];
  for (let py = 0; py < height; py += gridPx) {
    for (let px = 0; px < width; px += gridPx) {
      const i = (py * width + px) * 4;
      if (data[i + 3] > 30) {
        // ignore the pure-green start dot (skip those pixels)
        const isGreenDot = data[i + 1] > 180 && data[i] < 100;
        if (!isGreenDot) {
          pts.push({ x: px, y: py });
        }
      }
    }
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Star-burst celebration overlay
// ---------------------------------------------------------------------------

const STAR_COLORS = [
  "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c",
];

function StarBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const dist = 120 + Math.random() * 80;
            const color = STAR_COLORS[i % STAR_COLORS.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((angle * Math.PI) / 180) * dist,
                  y: Math.sin((angle * Math.PI) / 180) * dist,
                  scale: 1.5,
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                style={{ position: "absolute" }}
              >
                <Star size={36} color={color} fill={color} />
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Tracing canvas component
// ---------------------------------------------------------------------------

interface TracingCanvasProps {
  category: Category;
  item: string;
  is3yo: boolean;
  onSuccess: () => void;
  clearToken: number; // bump to clear
}

function TracingCanvas({
  category,
  item,
  is3yo,
  onSuccess,
  clearToken,
}: TracingCanvasProps) {
  const guideRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tracedPts = useRef<Point[]>([]);
  const succeeded = useRef(false);
  const isDrawing = useRef(false);
  const dprRef = useRef(1);

  // Size canvases to container
  const sizeCanvases = useCallback(() => {
    const container = containerRef.current;
    const guide = guideRef.current;
    const trace = traceRef.current;
    if (!container || !guide || !trace) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const { width, height } = container.getBoundingClientRect();
    const sz = Math.min(width, height);
    guide.width = sz * dpr;
    guide.height = sz * dpr;
    guide.style.width = `${sz}px`;
    guide.style.height = `${sz}px`;
    trace.width = sz * dpr;
    trace.height = sz * dpr;
    trace.style.width = `${sz}px`;
    trace.style.height = `${sz}px`;
  }, []);

  // Redraw guide whenever item changes or canvas is resized
  const drawGuide = useCallback(() => {
    const canvas = guideRef.current;
    if (!canvas) return;
    if (category === "Shapes") {
      drawShapeGuide(canvas, item as ShapeName, dprRef.current);
    } else {
      drawLetterGuide(canvas, item, dprRef.current);
    }
  }, [category, item]);

  // Reset trace layer
  const clearTrace = useCallback(() => {
    const canvas = traceRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    tracedPts.current = [];
    succeeded.current = false;
  }, []);

  // Initial setup + resize observer
  useEffect(() => {
    sizeCanvases();
    drawGuide();
    clearTrace();
    const ro = new ResizeObserver(() => {
      sizeCanvases();
      drawGuide();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sizeCanvases, drawGuide, clearTrace]);

  // Clear trace on clearToken change
  useEffect(() => {
    clearTrace();
  }, [clearToken, clearTrace]);

  // Coverage check
  const checkCoverage = useCallback(() => {
    if (succeeded.current) return;
    const minPoints = 30;
    if (tracedPts.current.length < minPoints) return;
    const guideCanvas = guideRef.current;
    if (!guideCanvas) return;
    const guidePts = sampleGuidePoints(guideCanvas, 16);
    if (guidePts.length === 0) return;

    const dpr = dprRef.current;
    const threshold = 36 * dpr; // within 36 CSS px
    const threshold2 = threshold * threshold;

    let covered = 0;
    for (const gp of guidePts) {
      for (const tp of tracedPts.current) {
        const dx = gp.x - tp.x;
        const dy = gp.y - tp.y;
        if (dx * dx + dy * dy <= threshold2) {
          covered++;
          break;
        }
      }
    }
    const ratio = covered / guidePts.length;
    const minRatio = is3yo ? 0.45 : 0.6;
    if (ratio >= minRatio) {
      succeeded.current = true;
      onSuccess();
    }
  }, [is3yo, onSuccess]);

  // Pointer event handlers
  const getCanvasPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = traceRef.current!;
      const rect = canvas.getBoundingClientRect();
      const dpr = dprRef.current;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      const pt = getCanvasPoint(e);
      tracedPts.current.push(pt);
      const canvas = traceRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    },
    [getCanvasPoint],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pt = getCanvasPoint(e);
      tracedPts.current.push(pt);
      const canvas = traceRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = dprRef.current;
      ctx.lineWidth = 26 * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    },
    [getCanvasPoint],
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    checkCoverage();
  }, [checkCoverage]);

  const onPointerCancel = useCallback(() => {
    isDrawing.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full"
    >
      {/* Guide layer (bottom) */}
      <canvas
        ref={guideRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl"
        aria-hidden="true"
      />
      {/* Trace layer (top, receives touch events) */}
      <canvas
        ref={traceRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ cursor: "crosshair" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TracingPage() {
  const { profile, logAttempt } = useSession();
  const [, navigate] = useLocation();
  const is3yo = (profile?.age ?? 5) <= 3;

  const [category, setCategory] = useState<Category>("ABC");
  const [itemIdx, setItemIdx] = useState(0);
  const [clearToken, setClearToken] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const items = useMemo(() => itemsFor(category), [category]);
  const item = items[itemIdx];

  // Prefetch utterances when category changes
  useEffect(() => {
    void prefetch(
      items.map((it) => ({ text: utteranceFor(category, it), lang: "en" as const })),
    );
  }, [category, items]);

  // Speak item name on mount and item change
  useEffect(() => {
    void speakText(utteranceFor(category, item), "en");
  }, [category, item]);

  // Cleanup on unmount
  useEffect(() => () => stopSpeaking(), []);

  const handleTabChange = useCallback(
    (cat: Category) => {
      playTap();
      stopSpeaking();
      setCategory(cat);
      setItemIdx(0);
      setClearToken((t) => t + 1);
      setShowBurst(false);
    },
    [],
  );

  const handlePrev = useCallback(() => {
    playTap();
    setItemIdx((i) => (i - 1 + items.length) % items.length);
    setClearToken((t) => t + 1);
    setShowBurst(false);
  }, [items.length]);

  const handleNext = useCallback(() => {
    playTap();
    setItemIdx((i) => (i + 1) % items.length);
    setClearToken((t) => t + 1);
    setShowBurst(false);
  }, [items.length]);

  const handleClear = useCallback(() => {
    playTap();
    setClearToken((t) => t + 1);
    setShowBurst(false);
  }, []);

  const handleSpeak = useCallback(() => {
    playTap();
    void speakText(utteranceFor(category, item), "en");
  }, [category, item]);

  const handleSuccess = useCallback(() => {
    playCorrect();
    setShowBurst(true);
    void speakText(utteranceFor(category, item), "en");
    void logAttempt("tracing", questionIdFor(category, item), true);
    // Auto-advance after 1.6 s
    setTimeout(() => {
      setShowBurst(false);
      setItemIdx((i) => (i + 1) % items.length);
      setClearToken((t) => t + 1);
    }, 1600);
  }, [category, item, items.length, logAttempt]);

  // Board size: min(62vh, 56vw) as a CSS value used via inline style
  const boardSize = "min(62vh, 56vw)";

  const TABS: Category[] = ["ABC", "123", "Shapes"];

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-3">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate("/home")}
          className="w-[88px] h-[88px] rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Back to home"
        >
          <ArrowLeft size={40} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black text-gray-500 leading-tight">Tracing</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${category}-${item}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-4xl font-black text-[#3b82f6] leading-tight truncate"
            >
              Trace: {item}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Speaker button */}
        <button
          onClick={handleSpeak}
          className="w-[88px] h-[88px] rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0"
          aria-label="Hear the name"
        >
          <Volume2 size={40} className="text-[#3b82f6]" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-3 flex-shrink-0">
        {TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => handleTabChange(cat)}
            className={[
              "flex-1 h-[88px] rounded-2xl text-2xl font-black transition-all",
              category === cat
                ? "bg-[#3b82f6] text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-600",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tracing board + nav controls */}
      <div className="flex items-center justify-center gap-4 flex-1 min-h-0">
        {/* Prev button */}
        <button
          onClick={handlePrev}
          className="w-[100px] h-[100px] rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Previous"
        >
          <ArrowLeft size={44} className="text-gray-600" />
        </button>

        {/* Board container */}
        <div
          className="relative flex-shrink-0 bg-white rounded-3xl shadow-xl border-4 border-gray-200 overflow-hidden"
          style={{ width: boardSize, height: boardSize }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${item}-${clearToken}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              <TracingCanvas
                category={category}
                item={item}
                is3yo={is3yo}
                onSuccess={handleSuccess}
                clearToken={clearToken}
              />
            </motion.div>
          </AnimatePresence>

          {/* Star burst overlay */}
          <StarBurst show={showBurst} />

          {/* "Well done!" celebration text */}
          <AnimatePresence>
            {showBurst && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center z-40"
              >
                <div className="bg-white/90 rounded-3xl px-8 py-5 shadow-2xl text-center">
                  <Star size={52} className="text-yellow-400 fill-yellow-400 mx-auto mb-2" />
                  <p className="text-4xl font-black text-[#3b82f6]">
                    {is3yo ? "Yay!" : "Great job!"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint text (always visible, non-blocking) */}
          {!showBurst && (
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center z-10">
              <span className="text-base font-bold text-gray-400 bg-white/70 rounded-full px-4 py-1">
                Trace the shape with your finger!
              </span>
            </div>
          )}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-[100px] h-[100px] rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Next"
        >
          <ArrowRight size={44} className="text-gray-600" />
        </button>
      </div>

      {/* Bottom controls row */}
      <div className="flex justify-center gap-4 flex-shrink-0 pb-1">
        {/* Clear / try again */}
        <button
          onClick={handleClear}
          className="h-[88px] px-8 rounded-2xl bg-orange-100 text-orange-700 text-xl font-black flex items-center gap-3"
          aria-label="Clear — try again"
        >
          <RotateCcw size={32} />
          Try Again
        </button>
      </div>
    </div>
  );
}

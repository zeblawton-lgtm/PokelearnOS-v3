import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { playCorrect, playWrong, playFanfare } from "@/lib/sound";
import { playJingle } from "@/lib/music";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { math3YoQuestions, type Math3YoQuestion } from "@/content/math-3yo";
import { math5YoQuestions, type Math5YoQuestion } from "@/content/math-5yo";

const SPRITE = ARTWORK;

const POKEMON_POOL = [
  { id: 25, name: "Pikachu" },
  { id: 39, name: "Jigglypuff" },
  { id: 133, name: "Eevee" },
  { id: 175, name: "Togepi" },
  { id: 54, name: "Psyduck" },
  { id: 7, name: "Squirtle" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 52, name: "Meowth" },
  { id: 143, name: "Snorlax" },
  { id: 35, name: "Clefairy" },
  { id: 79, name: "Slowpoke" },
  { id: 172, name: "Pichu" },
  { id: 37, name: "Vulpix" },
  { id: 113, name: "Chansey" },
  { id: 58, name: "Growlithe" },
  { id: 92, name: "Gastly" },
  { id: 60, name: "Poliwag" },
];

type AnyQuestion = Math3YoQuestion | Math5YoQuestion;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function spriteClass(total: number) {
  if (total <= 5) return "w-36 h-36";
  if (total <= 10) return "w-28 h-28";
  if (total <= 15) return "w-20 h-20";
  return "w-16 h-16";
}

// ─── Visual components ───────────────────────────────────────────────────────

function CountVisual({ count, id, name }: { count: number; id: number; name: string }) {
  const sz = spriteClass(count);
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <motion.img
          key={i}
          src={SPRITE(id)}
          onError={onSpriteError}
          alt={name}
          className={`${sz} object-contain`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 18 }}
        />
      ))}
    </div>
  );
}

function AddVisual({ a, b, id, name }: { a: number; b: number; id: number; name: string }) {
  const total = a + b;
  const sz = spriteClass(total);
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <div className="flex flex-wrap justify-center gap-1 bg-blue-50 border-2 border-blue-200 rounded-2xl p-2">
        {Array.from({ length: a }).map((_, i) => (
          <motion.img
            key={`a${i}`}
            src={SPRITE(id)}
            onError={onSpriteError}
            alt={name}
            className={`${sz} object-contain`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 18 }}
          />
        ))}
      </div>
      <span className="text-5xl font-black text-gray-400">+</span>
      <div className="flex flex-wrap justify-center gap-1 bg-amber-50 border-2 border-amber-200 rounded-2xl p-2">
        {Array.from({ length: b }).map((_, i) => (
          <motion.img
            key={`b${i}`}
            src={SPRITE(id)}
            onError={onSpriteError}
            alt={name}
            className={`${sz} object-contain`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: (a + i) * 0.05, type: "spring", stiffness: 320, damping: 18 }}
          />
        ))}
      </div>
    </div>
  );
}

function SubtractVisual({ a, b, id, name }: { a: number; b: number; id: number; name: string }) {
  const remaining = a - b;
  const sz = spriteClass(a);
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {/* Remaining sprites — bright */}
      {Array.from({ length: remaining }).map((_, i) => (
        <motion.img
          key={`r${i}`}
          src={SPRITE(id)}
          onError={onSpriteError}
          alt={name}
          className={`${sz} object-contain`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 18 }}
        />
      ))}
      {/* Subtracted sprites — faded + X */}
      {Array.from({ length: b }).map((_, i) => (
        <motion.div
          key={`d${i}`}
          className={`${sz} relative shrink-0`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (remaining + i) * 0.04, type: "spring", stiffness: 320, damping: 18 }}
        >
          <img
            src={SPRITE(id)}
            onError={onSpriteError}
            alt=""
            className={`${sz} object-contain opacity-20 grayscale`}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-red-500 font-black leading-none" style={{ fontSize: "clamp(14px, 3vw, 22px)" }}>✕</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MultiplyVisual({ a, b, id, name }: { a: number; b: number; id: number; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {Array.from({ length: a }).map((_, row) => (
        <div key={row} className="flex gap-1 bg-purple-50 border-2 border-purple-200 rounded-xl px-2 py-1">
          {Array.from({ length: b }).map((_, col) => (
            <motion.img
              key={col}
              src={SPRITE(id)}
              onError={onSpriteError}
              alt={name}
              className="w-20 h-20 object-contain"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (row * b + col) * 0.06, type: "spring", stiffness: 320, damping: 18 }}
            />
          ))}
        </div>
      ))}
      <p className="text-sm text-gray-400 font-bold mt-1">{a} groups of {b}</p>
    </div>
  );
}

function QuestionVisual({
  q, pokemonId, pokemonName, is3yo,
}: {
  q: AnyQuestion; pokemonId: number; pokemonName: string; is3yo: boolean;
}) {
  const q3 = q as Math3YoQuestion;
  const q5 = q as Math5YoQuestion;

  if (q3.type === "count" && q3.count != null) {
    return <CountVisual count={q3.count} id={pokemonId} name={pokemonName} />;
  }
  if (q3.type === "add" || q5.type === "add") {
    return <AddVisual a={q3.a ?? 0} b={q3.b ?? 0} id={pokemonId} name={pokemonName} />;
  }
  if (q3.type === "subtract" || q5.type === "subtract") {
    return <SubtractVisual a={q3.a ?? 0} b={q3.b ?? 0} id={pokemonId} name={pokemonName} />;
  }
  if (q5.type === "multiply") {
    return <MultiplyVisual a={q5.a ?? 2} b={q5.b ?? 2} id={pokemonId} name={pokemonName} />;
  }
  // Word problem — large sprite of the named Pokémon
  return <img src={SPRITE(q.pokemonId)} onError={onSpriteError} alt={pokemonName} className="w-56 h-56 object-contain mx-auto drop-shadow-lg" />;
}

// Shown under a wrong answer so the child learns why, not just that.
function getExplanation(q: AnyQuestion): string {
  const q3 = q as Math3YoQuestion;
  const q5 = q as Math5YoQuestion;
  if (q3.type === "count") return `Count them one by one — there are ${q.answer}.`;
  if (q3.type === "add" || q5.type === "add") return `${q.a} + ${q.b} = ${q.answer}`;
  if (q3.type === "subtract" || q5.type === "subtract") return `${q.a} − ${q.b} = ${q.answer}`;
  if (q5.type === "multiply") return `${q5.a} × ${q5.b} = ${q.answer}`;
  return `The answer is ${q.answer}.`;
}

function getPrompt(q: AnyQuestion, pokemonName: string, is3yo: boolean): string {
  const q3 = q as Math3YoQuestion;
  const q5 = q as Math5YoQuestion;

  if (is3yo) {
    if (q3.type === "count") return `How many ${pokemonName}?`;
    if (q3.type === "add") return `${q3.a} ${pokemonName} + ${q3.b} ${pokemonName} = ?`;
    return `${q3.a} ${pokemonName} − ${q3.b} ${pokemonName} = ?`;
  } else {
    if (q5.type === "word") return q5.wordProblem!;
    if (q5.type === "add") return `${q5.a} ${pokemonName} + ${q5.b} ${pokemonName} = ?`;
    if (q5.type === "subtract") return `${q5.a} ${pokemonName} − ${q5.b} ${pokemonName} = ?`;
    return `${q5.a} × ${q5.b} = ?`;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MathPage() {
  const { profile, logAttempt } = useSession();
  const [, navigate] = useLocation();
  const is3yo = (profile?.age ?? 5) <= 3;

  const [gamePokemon] = useState(() => shuffle(POKEMON_POOL)[0]);

  const [questions] = useState<AnyQuestion[]>(() =>
    shuffle(is3yo
      ? (math3YoQuestions as AnyQuestion[])
      : (math5YoQuestions as AnyQuestion[])
    ).slice(0, 10)
  );

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState(false);

  const q = questions[idx];
  // Shuffle answer positions per question — the authored choices arrays put
  // the correct answer in a predictable slot.
  const choices = useMemo(() => shuffle(q.choices), [q]);
  const isWordProblem = (q as Math5YoQuestion).type === "word";
  const displayId = isWordProblem ? q.pokemonId : gamePokemon.id;
  const displayName = isWordProblem ? q.pokemonName : gamePokemon.name;

  const advance = useCallback(() => {
    if (idx + 1 >= questions.length) { setDone(true); playFanfare(); playJingle(); }
    else { setIdx(i => i + 1); setSelected(null); setWrong(false); }
  }, [idx, questions.length]);

  const handleAnswer = useCallback(async (choice: number) => {
    if (selected !== null) return;
    setSelected(choice);
    const correct = choice === q.answer;
    if (correct) playCorrect(); else playWrong();
    if (correct) { setScore(s => s + 1); if (!is3yo) setStreak(s => s + 1); }
    else { setStreak(0); }
    await logAttempt("math", q.id, correct);
    // Correct → auto-advance. Wrong → hold on the explanation until "Next".
    if (correct) setTimeout(advance, 1100);
    else setWrong(true);
  }, [selected, q, is3yo, logAttempt, advance]);

  // ─── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <img
            src={SPRITE(gamePokemon.id)}
            onError={onSpriteError}
            alt={gamePokemon.name}
            className="w-64 h-64 mx-auto mb-4 drop-shadow-xl"
          />
          <h2 className="text-5xl font-black text-pokemon-red mb-2">Great job!</h2>
          <p className="text-3xl font-bold text-gray-700 mb-6">
            {score} / {questions.length} correct
          </p>
          <div className="flex gap-1 justify-center mb-8">
            {questions.map((_, i) => (
              <Star
                key={i}
                size={32}
                className={i < score ? "text-pokemon-yellow fill-pokemon-yellow" : "text-gray-300"}
              />
            ))}
          </div>
          <button
            onClick={() => navigate("/home")}
            className="bg-pokemon-red text-white text-2xl font-black px-10 py-5 rounded-3xl shadow-lg min-h-[72px]"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Question screen ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate("/home")}
          className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft size={28} />
        </button>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-500">
            Question {idx + 1} of {questions.length}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
            <div
              className="bg-pokemon-red h-3 rounded-full transition-all"
              style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-pokemon-red">{score}</p>
          <p className="text-sm text-gray-500">pts</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          className="flex flex-col items-center flex-1"
        >
          <div className="bg-white rounded-3xl shadow-md p-5 w-full mb-5 text-center">
            <div className="min-h-[320px] flex items-center justify-center mb-4">
              <QuestionVisual
                q={q}
                pokemonId={displayId}
                pokemonName={displayName}
                is3yo={is3yo}
              />
            </div>
            <p className="text-2xl font-black text-gray-800 leading-snug">
              {getPrompt(q, gamePokemon.name, is3yo)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            {choices.map((choice) => {
              let bg = "bg-white border-4 border-gray-200 text-gray-800";
              if (selected !== null) {
                if (choice === q.answer) bg = "bg-green-400 border-green-500 text-white";
                else if (choice === selected) bg = "bg-red-400 border-red-500 text-white";
              }
              return (
                <motion.button
                  key={choice}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleAnswer(choice)}
                  className={`${bg} rounded-3xl py-6 text-4xl font-black shadow transition-all min-h-[100px]`}
                >
                  {choice}
                </motion.button>
              );
            })}
          </div>

          {wrong && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 w-full bg-amber-50 border-4 border-amber-200 rounded-3xl p-5 text-center"
            >
              <p className="text-xl font-black text-amber-700 mb-1">Not quite!</p>
              <p className="text-3xl font-black text-gray-800 mb-4">{getExplanation(q)}</p>
              <button
                onClick={advance}
                className="bg-pokemon-red text-white text-2xl font-black px-10 py-4 rounded-2xl shadow min-h-[68px]"
              >
                Next →
              </button>
            </motion.div>
          )}

          {!wrong && !is3yo && streak >= 3 && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-4 text-2xl font-black text-pokemon-yellow"
            >
              {streak} in a row!
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

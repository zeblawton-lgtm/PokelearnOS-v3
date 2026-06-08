import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { playCorrect, playWrong, playFanfare } from "@/lib/sound";
import { playJingle } from "@/lib/music";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { geographyQuestions } from "@/content/geography";

const SPRITE = ARTWORK;

const TYPE_LABEL: Record<string, string> = {
  continent: "Continent",
  ocean: "Ocean",
  feature: "Land Feature",
  concept: "Explore",
};

const TYPE_COLOR: Record<string, string> = {
  continent: "bg-green-500",
  ocean: "bg-pokemon-blue",
  feature: "bg-orange-500",
  concept: "bg-purple-500",
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function GeographyPage() {
  const { logAttempt } = useSession();
  const [, navigate] = useLocation();
  const [questions] = useState(() => shuffle(geographyQuestions).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const q = questions[idx];
  // Shuffle answer positions per question — the authored choices arrays put
  // the correct answer in a predictable slot.
  const choices = useMemo(() => shuffle(q.choices), [q]);

  const handleAnswer = useCallback(async (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);
    const correct = choice === q.answer;
    if (correct) playCorrect(); else playWrong();
    if (correct) setScore(s => s + 1);
    await logAttempt("geography", q.id, correct);
    setShowHint(false);
    setTimeout(() => {
      if (idx + 1 >= questions.length) { setDone(true); playFanfare(); playJingle(); }
      else { setIdx(i => i + 1); setSelected(null); }
    }, 1200);
  }, [selected, q, idx, questions.length, logAttempt]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className="text-8xl mb-4">🌍</div>
          <h2 className="text-5xl font-black text-green-600 mb-2">World Expert!</h2>
          <p className="text-3xl font-bold text-gray-700 mb-6">{score} / {questions.length} correct</p>
          <div className="flex gap-1 justify-center mb-8">
            {questions.map((_, i) => (
              <Star key={i} size={32} className={i < score ? "text-pokemon-yellow fill-pokemon-yellow" : "text-gray-300"} />
            ))}
          </div>
          <button
            onClick={() => navigate("/home")}
            className="bg-green-500 text-white text-2xl font-black px-10 py-5 rounded-3xl shadow-lg min-h-[72px]"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const typeColor = TYPE_COLOR[q.type] ?? "bg-gray-500";
  const typeLabel = TYPE_LABEL[q.type] ?? q.type;

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate("/home")} className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={28} />
        </button>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-500">Question {idx + 1} of {questions.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-2xl font-black text-green-600">{score} pts</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
          className="flex flex-col items-center flex-1"
        >
          <div className="bg-white rounded-3xl shadow-md p-5 w-full mb-5 text-center">
            <span className={`inline-block ${typeColor} text-white text-base font-black px-4 py-1 rounded-full mb-3`}>
              {typeLabel}
            </span>
            {q.pokemonId && (
              <img src={SPRITE(q.pokemonId)} alt={q.pokemonName} className="w-60 h-60 mx-auto mb-2" />
            )}
            <p className="text-2xl font-bold text-gray-800 leading-snug">{q.question}</p>
            {showHint && q.hint && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xl text-green-600 font-bold">
                Hint: {q.hint}
              </motion.p>
            )}
          </div>

          <div className="flex flex-col gap-4 w-full">
            {choices.map((choice) => {
              let bg = "bg-white border-4 border-gray-200 text-gray-800";
              if (selected !== null) {
                if (choice === q.answer) bg = "bg-green-400 border-green-500 text-white";
                else if (choice === selected) bg = "bg-red-400 border-red-500 text-white";
              }
              return (
                <motion.button
                  key={choice} whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(choice)}
                  className={`${bg} rounded-3xl py-5 text-2xl font-black shadow transition-all min-h-[80px]`}
                >
                  {choice}
                </motion.button>
              );
            })}
          </div>

          {!showHint && q.hint && selected === null && (
            <button onClick={() => setShowHint(true)} className="mt-4 text-lg font-bold text-green-600 underline">
              Need a hint?
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

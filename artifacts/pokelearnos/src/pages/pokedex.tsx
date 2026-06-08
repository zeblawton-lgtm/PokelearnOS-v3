import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { pokedex, TYPE_COLORS, type PokedexEntry } from "@/content/pokedex";
import { playTap, speak } from "@/lib/sound";
import { markPokemonLearned } from "@/lib/storage";

export default function PokedexPage() {
  const [, navigate] = useLocation();
  const [active, setActive] = useState<PokedexEntry | null>(null);

  const open = (p: PokedexEntry) => {
    playTap();
    speak(p.name, "en-US");
    markPokemonLearned(p.id);
    setActive(p);
  };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate("/home")} className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-3xl font-black text-pokemon-red">Pokédex</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {pokedex.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            whileTap={{ scale: 0.94 }}
            onClick={() => open(p)}
            className="bg-white rounded-3xl shadow border-4 border-gray-100 p-3 flex flex-col items-center gap-1 min-h-[140px]"
          >
            <img
              src={ARTWORK(p.id)}
              onError={onSpriteError}
              alt={p.name}
              className="w-40 h-40 object-contain drop-shadow"
            />
            <span className="text-lg font-black text-gray-800">{p.name}</span>
            <span className="text-xs font-bold text-gray-400">#{p.id}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="bg-white rounded-4xl w-full max-w-sm p-6 text-center relative"
            >
              <button onClick={() => setActive(null)} className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center" aria-label="Close">
                <X size={20} />
              </button>
              <img src={ARTWORK(active.id)} onError={onSpriteError} alt={active.name} className="w-80 h-80 object-contain mx-auto drop-shadow-xl mb-2" />
              <h2 className="text-4xl font-black text-gray-800">{active.name}</h2>
              <div className="flex gap-2 justify-center my-3">
                {active.types.map((t) => (
                  <span key={t} className={`${TYPE_COLORS[t] ?? "bg-gray-400"} text-white text-base font-black px-4 py-1 rounded-full`}>{t}</span>
                ))}
              </div>
              <p className="text-xl font-bold text-gray-600 leading-snug">{active.fact}</p>
              <button
                onClick={() => speak(active.name, "en-US")}
                className="mt-5 bg-pokemon-blue text-white text-xl font-black px-8 py-4 rounded-3xl min-h-[64px]"
              >
                🔊 Say the name
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

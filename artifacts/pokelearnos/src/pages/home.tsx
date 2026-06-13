import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useSession } from "@/context/SessionContext";
import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { playTap } from "@/lib/sound";
import { Users } from "lucide-react";

const SPRITE = ARTWORK;

// Big "type card" subjects — each learning module is fronted by a starter
// Pokémon and styled like its type (kid-recognizable, pre-reader friendly).
const subjects = [
  {
    id: "math", label: "Math", typePill: "🔥 Fire Type", pokemonId: 4, path: "/math",
    gradient: "linear-gradient(160deg,#ff7c45,#e85d2a)", shadow: "0 8px 0 #c44a1d",
  },
  {
    id: "spanish", label: "Spanish", typePill: "💧 Water Type", pokemonId: 7, path: "/spanish",
    gradient: "linear-gradient(160deg,#4aa8ff,#2b86e0)", shadow: "0 8px 0 #1e6bbd",
  },
  {
    id: "geography", label: "World", typePill: "🌿 Grass Type", pokemonId: 1, path: "/geography",
    gradient: "linear-gradient(160deg,#52c46a,#36a350)", shadow: "0 8px 0 #27843e",
  },
];

// Each fun tile gets its own thematic Pokémon mascot (bundled artwork):
// Smeargle paints, Unown is the letter Pokémon, Voltorb is a dot, Alakazam
// is the genius, Rotom powers the Pokédex, Lapras ferries explorers, and
// Jirachi is the wishing star on the gold Progress tile.
const fun = [
  { id: "coloring", label: "Coloring", pokemonId: 235, path: "/coloring", gold: false },
  { id: "tracing", label: "Tracing", pokemonId: 201, path: "/tracing", gold: false },
  { id: "dots", label: "Dots", pokemonId: 100, path: "/dots", gold: false },
  { id: "match", label: "Memory", pokemonId: 65, path: "/match", gold: false },
  { id: "pokedex", label: "Pokédex", pokemonId: 479, path: "/pokedex", gold: false },
  { id: "regions", label: "Regions", pokemonId: 131, path: "/regions", gold: false },
  { id: "progress", label: "Progress", pokemonId: 385, path: "/progress", gold: true },
];

// A soft cartoon cloud drifting across the sky. Built from plain divs so it
// needs no assets; starts off-screen left and loops.
function Cloud({ top, duration, delay, scale }: { top: string; duration: number; delay: number; scale: number }) {
  return (
    <motion.div
      aria-hidden
      className="absolute pointer-events-none opacity-80"
      style={{ top, left: 0, scale }}
      initial={{ x: "-180px" }}
      animate={{ x: "105vw" }}
      transition={{ repeat: Infinity, duration, delay, ease: "linear" }}
    >
      <div className="relative">
        <div className="w-36 h-11 bg-white rounded-full" />
        <div className="absolute w-14 h-14 bg-white rounded-full -top-7 left-6" />
        <div className="absolute w-11 h-11 bg-white rounded-full -top-4 left-16" />
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { profile, endSession } = useSession();
  const [, navigate] = useLocation();

  // Ending the session drops profile to null, so the app returns to the
  // profile picker — that's where Leo/Michael switch who's playing.
  const handleSwitchPlayer = () => { playTap(); void endSession(); };

  const go = (path: string) => { playTap(); navigate(path); };

  return (
    <div className="relative flex flex-col h-full px-6 py-3 overflow-hidden">
      {/* Sky backdrop + drifting clouds (fixed so it sits under the TopBar too) */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ background: "linear-gradient(180deg,#8ed4ff 0%,#c8ecff 55%,#d8f5cf 100%)" }}
      />
      <Cloud top="9%" duration={65} delay={0} scale={1} />
      <Cloud top="20%" duration={90} delay={12} scale={0.7} />

      {/* Greeting: the child's own avatar bounces next to a speech bubble */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 mt-1 mb-2"
      >
        <motion.img
          src={SPRITE(profile?.avatarPokemonId ?? 25)}
          onError={onSpriteError}
          alt=""
          className="w-36 h-36 object-contain drop-shadow-xl"
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          draggable={false}
        />
        <div className="relative bg-white rounded-3xl px-7 py-4" style={{ boxShadow: "0 5px 0 rgba(0,0,0,0.08)" }}>
          <div aria-hidden className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />
          <h1 className="text-5xl font-black text-gray-800 leading-tight">Hi, {profile?.name}!</h1>
          <p className="text-xl font-bold text-gray-500">Tap a friend to start learning</p>
        </div>

        <button
          onClick={handleSwitchPlayer}
          className="ml-auto flex items-center gap-2 bg-white rounded-2xl px-5 h-16"
          style={{ boxShadow: "0 5px 0 rgba(0,0,0,0.08)" }}
        >
          <Users size={28} className="text-pokemon-blue" />
          <span className="text-base font-black text-gray-700">Switch Player</span>
        </button>
      </motion.div>

      {/* Subject type cards — artwork intentionally overflows the card top */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="flex gap-10 justify-center items-stretch w-full max-w-6xl mt-14">
          {subjects.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => go(s.path)}
              className="flex-1 max-w-[430px] rounded-[36px] px-5 pb-8 text-white flex flex-col items-center gap-3"
              style={{ background: s.gradient, boxShadow: s.shadow }}
            >
              <motion.img
                src={SPRITE(s.pokemonId)}
                onError={onSpriteError}
                alt=""
                className="w-56 h-56 object-contain -mt-16"
                style={{ filter: "drop-shadow(0 6px 5px rgba(0,0,0,0.25))" }}
                whileHover={{ scale: 1.08, rotate: -3 }}
                draggable={false}
              />
              <span className="text-5xl font-black" style={{ textShadow: "0 2px 0 rgba(0,0,0,0.18)" }}>
                {s.label}
              </span>
              <span className="bg-white/30 rounded-full px-6 py-1.5 text-xl font-bold">{s.typePill}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Fun row — creative corner + explore screens as chunky white tiles */}
      <div className="flex gap-4 justify-center flex-wrap mb-1">
        {fun.map((f, i) => (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 220 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => go(f.path)}
            className={`w-[210px] h-[180px] rounded-3xl flex flex-col items-center justify-center gap-1 text-2xl font-black ${
              f.gold ? "text-amber-900" : "text-gray-700"
            }`}
            style={{
              background: f.gold ? "linear-gradient(160deg,#ffe27a,#ffc83d)" : "#ffffff",
              boxShadow: f.gold ? "0 6px 0 #d99e16" : "0 6px 0 rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={SPRITE(f.pokemonId)}
              onError={onSpriteError}
              alt=""
              className="w-28 h-28 object-contain"
              style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.18))" }}
              draggable={false}
            />
            {f.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

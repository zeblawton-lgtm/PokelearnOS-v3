import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useSession } from "@/context/SessionContext";
import { BookOpen, Globe, MessageCircle, Trophy, Sparkles, Map, Users, Palette, Pencil, Share2, Brain } from "lucide-react";

const modules = [
  { id: "math", label: "Math", sublabel: "Count, Add, Subtract", icon: BookOpen, color: "bg-pokemon-red", path: "/math" },
  { id: "spanish", label: "Spanish", sublabel: "Colors, Numbers, Greetings", icon: MessageCircle, color: "bg-pokemon-blue", path: "/spanish" },
  { id: "geography", label: "World Explorer", sublabel: "Regions, climates, maps", icon: Globe, color: "bg-green-500", path: "/geography" },
];

const creative = [
  { id: "coloring", label: "Coloring", icon: Palette, color: "bg-pink-500", path: "/coloring" },
  { id: "tracing", label: "Tracing", icon: Pencil, color: "bg-purple-500", path: "/tracing" },
  { id: "dots", label: "Connect Dots", icon: Share2, color: "bg-orange-500", path: "/dots" },
  { id: "match", label: "Memory Match", icon: Brain, color: "bg-teal-500", path: "/match" },
];

export default function Home() {
  const { profile, endSession } = useSession();
  const [, navigate] = useLocation();

  // Ending the session drops profile to null, so the app returns to the
  // profile picker — that's where Leo/Michael switch who's playing.
  const handleSwitchPlayer = () => { void endSession(); };

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <button
          onClick={handleSwitchPlayer}
          className="absolute top-20 right-5 inline-flex items-center gap-2 bg-white border-2 border-gray-200 rounded-2xl px-4 py-2 shadow-sm"
        >
          <Users size={31} className="text-pokemon-blue" />
          <span className="text-base font-black text-gray-700">Switch Player</span>
        </button>
        <h1 className="text-4xl font-black text-pokemon-red">Hi, {profile?.name}!</h1>
        <p className="text-xl text-gray-600 mt-1 font-bold">What do you want to learn today?</p>
        <div className="inline-flex items-center gap-2 bg-pokemon-yellow/20 rounded-2xl px-5 py-2 mt-3">
          <span className="text-2xl font-black text-pokemon-darkred">
            No time limit
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-4 flex-1">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(mod.path)}
              className={`${mod.color} rounded-3xl px-6 py-4 flex items-center gap-6 shadow-lg text-white min-h-[110px]`}
            >
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Icon size={52} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-black">{mod.label}</p>
                <p className="text-lg font-bold text-white/80">{mod.sublabel}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        {creative.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 200 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(mod.path)}
              className={`${mod.color} rounded-3xl py-4 flex flex-col items-center justify-center gap-2 shadow-lg text-white min-h-[124px]`}
            >
              <Icon size={44} className="text-white" />
              <span className="text-xl font-black">{mod.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/pokedex")}
          className="bg-pokemon-yellow/90 rounded-3xl py-4 flex flex-col items-center justify-center gap-1 shadow-md min-h-[104px]"
        >
          <Sparkles size={36} className="text-pokemon-darkred" />
          <span className="text-xl font-black text-pokemon-darkred">Pokédex</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/regions")}
          className="bg-green-400 rounded-3xl py-4 flex flex-col items-center justify-center gap-1 shadow-md min-h-[104px]"
        >
          <Map size={36} className="text-white" />
          <span className="text-xl font-black text-white">Regions</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/progress")}
          className="bg-pokemon-yellow rounded-3xl py-4 flex flex-col items-center justify-center gap-1 shadow-md min-h-[104px]"
        >
          <Trophy size={36} className="text-pokemon-darkred" />
          <span className="text-xl font-black text-pokemon-darkred">My Progress</span>
        </motion.button>
      </div>
    </div>
  );
}

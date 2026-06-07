import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useSession } from "@/context/SessionContext";
import { BookOpen, Globe, MessageCircle, Trophy, Sparkles, Map } from "lucide-react";

const modules = [
  { id: "math", label: "Math", sublabel: "Count, Add, Subtract", icon: BookOpen, color: "bg-pokemon-red", path: "/math" },
  { id: "spanish", label: "Spanish", sublabel: "Colors, Numbers, Greetings", icon: MessageCircle, color: "bg-pokemon-blue", path: "/spanish" },
  { id: "geography", label: "World Explorer", sublabel: "Continents and Oceans", icon: Globe, color: "bg-green-500", path: "/geography" },
];

export default function Home() {
  const { profile, secondsRemaining } = useSession();
  const [, navigate] = useLocation();
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-4xl font-black text-pokemon-red">Hi, {profile?.name}!</h1>
        <p className="text-xl text-gray-600 mt-1 font-bold">What do you want to learn today?</p>
        <div className="inline-flex items-center gap-2 bg-pokemon-yellow/20 rounded-2xl px-5 py-2 mt-3">
          <span className="text-2xl font-black text-pokemon-darkred">
            {minutes}:{seconds.toString().padStart(2, "0")} left today
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-5 flex-1">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(mod.path)}
              className={`${mod.color} rounded-3xl p-6 flex items-center gap-6 shadow-lg text-white min-h-[100px]`}
            >
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Icon size={40} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-black">{mod.label}</p>
                <p className="text-lg font-bold text-white/80">{mod.sublabel}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/pokedex")}
          className="bg-pokemon-yellow/90 rounded-3xl py-5 flex flex-col items-center justify-center gap-1 shadow-md min-h-[96px]"
        >
          <Sparkles size={28} className="text-pokemon-darkred" />
          <span className="text-xl font-black text-pokemon-darkred">Pokédex</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/regions")}
          className="bg-green-400 rounded-3xl py-5 flex flex-col items-center justify-center gap-1 shadow-md min-h-[96px]"
        >
          <Map size={28} className="text-white" />
          <span className="text-xl font-black text-white">Pokémon Homes</span>
        </motion.button>
      </div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        onClick={() => navigate("/progress")}
        className="mt-5 flex items-center justify-center gap-3 bg-pokemon-yellow rounded-3xl py-5 shadow-md min-h-[72px]"
      >
        <Trophy size={28} className="text-pokemon-darkred" />
        <span className="text-2xl font-black text-pokemon-darkred">My Progress</span>
      </motion.button>
    </div>
  );
}

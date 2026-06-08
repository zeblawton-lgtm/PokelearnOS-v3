import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { playTap, speak } from "@/lib/sound";

// "Pokémon Homes" — teaches real-world habitat/biome concepts (forests, oceans,
// mountains, caves, grasslands, icy places) using Pokémon as friendly examples.
// These are REAL places on Earth — Pokémon are only imaginative guides (GOAL §9.2:
// do not present fictional regions as real).
interface Habitat {
  name: string;
  emoji: string;
  color: string;
  pokemonId: number;
  pokemonName: string;
  fact: string;
}

const HABITATS: Habitat[] = [
  { name: "Forest", emoji: "🌳", color: "bg-green-500", pokemonId: 1, pokemonName: "Bulbasaur", fact: "Forests are full of tall trees and lots of plants." },
  { name: "Ocean", emoji: "🌊", color: "bg-blue-500", pokemonId: 131, pokemonName: "Lapras", fact: "The ocean is a huge body of salty water." },
  { name: "Mountain", emoji: "⛰️", color: "bg-orange-500", pokemonId: 6, pokemonName: "Charizard", fact: "Mountains are very tall and rocky, high in the sky." },
  { name: "Cave", emoji: "🕳️", color: "bg-gray-600", pokemonId: 94, pokemonName: "Gengar", fact: "Caves are dark holes inside rocks and mountains." },
  { name: "Grassland", emoji: "🌾", color: "bg-lime-500", pokemonId: 25, pokemonName: "Pikachu", fact: "Grasslands are wide, open fields of grass." },
  { name: "Snowy Land", emoji: "❄️", color: "bg-cyan-500", pokemonId: 87, pokemonName: "Dewgong", fact: "Some places are cold and covered in ice and snow." },
];

export default function RegionsPage() {
  const [, navigate] = useLocation();

  const tap = (h: Habitat) => { playTap(); speak(h.name, "en-US"); };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate("/home")} className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-3xl font-black text-green-600">Pokémon Homes</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pb-6">
        {HABITATS.map((h, i) => (
          <motion.button
            key={h.name}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => tap(h)}
            className={`${h.color} rounded-3xl p-4 flex items-center gap-4 shadow-lg text-white min-h-[120px] text-left`}
          >
            <div className="w-24 h-24 bg-white/25 rounded-2xl flex items-center justify-center flex-shrink-0 relative">
              <span className="text-5xl">{h.emoji}</span>
              <img src={ARTWORK(h.pokemonId)} onError={onSpriteError} alt={h.pokemonName} className="w-20 h-20 object-contain absolute -bottom-2 -right-2 drop-shadow" />
            </div>
            <div>
              <p className="text-3xl font-black">{h.name}</p>
              <p className="text-base font-bold text-white/90 leading-snug">{h.fact}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

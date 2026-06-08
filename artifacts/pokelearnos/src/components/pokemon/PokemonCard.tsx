import { motion } from "framer-motion";
import { getOfficialArtworkUrl } from "@/lib/pokeapi";
import { TypeBadge } from "./TypeBadge";
import { pokedex } from "@/content/pokedex";
import { onSpriteError } from "@/lib/sprites";

export function PokemonCard({ name, url, onClick }: { name: string, url: string, onClick?: (id: number) => void }) {
  // Extract ID from a PokéAPI-style URL or any local route ending in /:id/.
  const idMatch = url.match(/\/(\d+)\/?$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 1;
  
  const details = pokedex.find((entry) => entry.id === id);

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick && onClick(id)}
      className="bg-white rounded-3xl p-4 shadow-md cursor-pointer border-4 border-transparent hover:border-secondary transition-colors"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-black text-xl text-gray-800 capitalize">{name}</span>
        <span className="font-bold text-gray-400 text-lg">#{id.toString().padStart(3, '0')}</span>
      </div>
      
      <div className="relative w-full aspect-square bg-gray-50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center">
        <img 
          src={getOfficialArtworkUrl(id)} 
          onError={onSpriteError}
          alt={name}
          className="w-3/4 h-3/4 object-contain drop-shadow-xl"
          loading="lazy"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {details?.types.map((type) => (
          <TypeBadge key={type} type={type.toLowerCase()} />
        ))}
      </div>
    </motion.div>
  );
}

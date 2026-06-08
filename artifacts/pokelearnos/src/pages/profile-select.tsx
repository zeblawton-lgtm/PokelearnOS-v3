import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { api, type Profile } from "@/lib/api";
import { useSession } from "@/context/SessionContext";
import { playTap } from "@/lib/sound";

const SPRITE = ARTWORK;

export default function ProfileSelect() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startSession, isLoading } = useSession();
  const [, navigate] = useLocation();

  useEffect(() => {
    api.getProfiles()
      .then(setProfiles)
      .catch(() => {
        setError("Could not load profiles. Make sure the server is running.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (profile: Profile) => {
    playTap();
    await startSession(profile, profile.dailyLimitMinutes);
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-24 h-24 border-8 border-pokemon-red border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-2xl font-bold text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">!</div>
          <h2 className="text-3xl font-black text-pokemon-red mb-4">Oops!</h2>
          <p className="text-xl text-gray-600 mb-6">{error}</p>
          <button
            className="bg-pokemon-red text-white text-2xl font-black px-8 py-4 rounded-3xl"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8 px-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <img
          src={SPRITE(25)}
          alt="Pikachu"
          className="w-32 h-32 mx-auto mb-4 drop-shadow-xl"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <h1 className="text-5xl font-black text-pokemon-red">PokelearnOS</h1>
        <p className="text-2xl text-gray-600 mt-2 font-bold">Who is learning today?</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-2xl">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(profile)}
            disabled={isLoading}
            className="flex-1 bg-white rounded-4xl shadow-xl border-4 border-gray-100 p-8 flex flex-col items-center gap-4 hover:border-pokemon-yellow hover:shadow-2xl transition-all"
          >
            <div className="w-48 h-48 rounded-full bg-pokemon-yellow/20 flex items-center justify-center overflow-hidden">
              <img
                src={SPRITE(profile.avatarPokemonId)}
                alt={profile.name}
                className="w-44 h-44 object-contain drop-shadow-md"
                onError={e => { (e.target as HTMLImageElement).src = SPRITE(25); }}
              />
            </div>
            <div>
              <p className="text-4xl font-black text-gray-800">{profile.name}</p>
              <p className="text-xl text-gray-500 font-bold mt-1">Age {profile.age}</p>
            </div>
            <div className="bg-pokemon-yellow/20 rounded-2xl px-4 py-2">
              <p className="text-lg font-bold text-pokemon-darkred">{profile.dailyLimitMinutes} min/day</p>
            </div>
          </motion.button>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-xl text-gray-500">No profiles found.</p>
          <button
            className="mt-4 bg-pokemon-blue text-white text-xl font-black px-6 py-3 rounded-3xl"
            onClick={() => fetch("/api/admin/seed", { method: "POST" }).then(() => window.location.reload())}
          >
            Setup Profiles
          </button>
        </div>
      )}
    </div>
  );
}

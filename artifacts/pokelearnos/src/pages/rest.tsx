import { ARTWORK, onSpriteError } from "@/lib/sprites";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/context/SessionContext";
import { useLocation } from "wouter";
import { api, clearAdminAuth, type Profile } from "@/lib/api";

const SPRITE = ARTWORK;

export default function RestScreen() {
  const { profile, extendSession, endSession, startSession } = useSession();
  const [, navigate] = useLocation();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  // The other kid's profile — each has their own daily limit, so when one
  // kid's time is up the other can take their turn right from this screen.
  const [other, setOther] = useState<Profile | null>(null);

  useEffect(() => {
    api.getProfiles()
      .then((ps) => setOther(ps.find((p) => p.id !== profile?.id) ?? null))
      .catch(() => setOther(null));
  }, [profile?.id]);

  const handleSwitch = async () => {
    if (!other) return;
    await endSession();
    await startSession(other);
    navigate("/home");
  };

  const handleDigit = (d: string) => {
    if (pin.length < 4) setPin(p => p + d);
  };
  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleVerify = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const { valid } = await api.verifyPin(pin);
      if (valid) {
        setPinError(false);
        setShowPin(false);
        setPin("");
        await extendSession(15);
        clearAdminAuth();
        navigate("/home");
      } else {
        setPinError(true);
        setPin("");
      }
    } catch {
      setPinError(true);
      setPin("");
      clearAdminAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleEndDay = async () => {
    await endSession();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col items-center justify-center px-8 text-center z-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <img src={SPRITE(143)} onError={onSpriteError} alt="Snorlax" className="w-72 h-72 drop-shadow-2xl mb-6" />
        </motion.div>

        <h1 className="text-5xl font-black text-white mb-3">Rest Time!</h1>
        <p className="text-2xl text-indigo-200 font-bold mb-2">
          Great learning today, {profile?.name}!
        </p>
        <p className="text-xl text-indigo-300 mb-10">
          Time to take a break and rest your eyes.
        </p>

        {!showPin ? (
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {other && (
              <button
                onClick={handleSwitch}
                className="bg-pokemon-yellow text-gray-900 text-2xl font-black py-4 rounded-3xl min-h-[96px] flex items-center justify-center gap-4 shadow-xl"
              >
                <img
                  src={SPRITE(other.avatarPokemonId)}
                  onError={onSpriteError}
                  alt={other.name}
                  className="w-20 h-20 object-contain drop-shadow"
                />
                {other.name}&rsquo;s Turn!
              </button>
            )}
            <button
              onClick={() => setShowPin(true)}
              className="bg-white/20 text-white text-xl font-black py-5 rounded-3xl border-2 border-white/30 min-h-[72px]"
            >
              Parent Unlock
            </button>
            <button
              onClick={handleEndDay}
              className="bg-indigo-700 text-white text-xl font-black py-5 rounded-3xl min-h-[72px]"
            >
              Done for Today
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <p className="text-xl font-black text-gray-800 mb-4">Enter Parent PIN</p>
            <div className="flex gap-3 justify-center mb-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center text-3xl font-black
                  ${pin.length > i ? "border-pokemon-blue bg-pokemon-blue/10 text-pokemon-blue" : "border-gray-200 bg-gray-50"}`}>
                  {pin.length > i ? "●" : ""}
                </div>
              ))}
            </div>
            {pinError && <p className="text-red-500 font-bold mb-2">Wrong PIN, try again</p>}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                <button
                  key={i}
                  onClick={() => d === "⌫" ? handleDelete() : d ? handleDigit(d) : undefined}
                  disabled={!d}
                  className={`py-4 rounded-2xl text-2xl font-black min-h-[60px]
                    ${d === "⌫" ? "bg-red-100 text-red-600" : d ? "bg-gray-100 text-gray-800" : "invisible"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPin(false); setPin(""); setPinError(false); }}
                className="flex-1 py-4 rounded-2xl bg-gray-200 text-gray-700 text-lg font-black min-h-[60px]"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={pin.length !== 4 || loading}
                className="flex-1 py-4 rounded-2xl bg-pokemon-blue text-white text-lg font-black disabled:opacity-50 min-h-[60px]"
              >
                Unlock
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

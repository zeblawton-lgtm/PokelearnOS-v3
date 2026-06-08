import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, LogOut, KeyRound } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { api, clearAdminAuth } from "@/lib/api";
import { useLocation } from "wouter";
import { isMuted, setMuted } from "@/lib/sound";
import { isMusicMuted, setMusicMuted } from "@/lib/music";

type Mode = "pin" | "settings";

export function ParentOverlay() {
  const {
    isParentOverlayOpen,
    closeParentOverlay,
    extendSession,
    resetTodayTimer,
    endSession,
    profile,
    updateDailyLimit,
  } = useSession();
  const [mode, setMode] = useState<Mode>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [soundOff, setSoundOff] = useState(isMuted());
  const [musicOff, setMusicOff] = useState(isMusicMuted());
  const [, navigate] = useLocation();

  const handleClose = () => {
    clearAdminAuth();
    closeParentOverlay();
    setMode("pin");
    setPin("");
    setPinError(false);
    setCurrentPin("");
    setNewPin("");
    setSettingsError("");
    setSettingsMessage("");
  };

  const handleDigit = (d: string) => { if (pin.length < 4) setPin(p => p + d); };
  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleVerify = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const { valid } = await api.verifyPin(pin);
      if (valid) { setPinError(false); setPin(""); setMode("settings"); }
      else { setPinError(true); setPin(""); }
    } finally { setLoading(false); }
  };

  const handleEndSession = async () => {
    handleClose();
    await endSession();
    navigate("/");
  };

  const handleLimitChange = async (nextLimit: number) => {
    setLoading(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      await updateDailyLimit(Math.max(10, Math.min(30, nextLimit)));
    } catch {
      setSettingsError("Could not update the daily limit.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendTime = async (extraMinutes: number) => {
    setLoading(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      await extendSession(extraMinutes);
    } catch {
      setSettingsError("Could not update today's time.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetToday = async () => {
    setLoading(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      await resetTodayTimer();
      setSettingsMessage("Timer reset for today.");
    } catch {
      setSettingsError("Could not reset today's timer.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (currentPin.length !== 4 || newPin.length !== 4) return;
    setLoading(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      await api.changePin(currentPin, newPin);
      setCurrentPin("");
      setNewPin("");
      setSettingsMessage("PIN changed.");
    } catch {
      setSettingsError("PIN change failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isParentOverlayOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-4xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black text-gray-800">
                {mode === "pin" ? "Parent Area" : "Parent Settings"}
              </h2>
              <button onClick={handleClose} className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                <X size={20} />
              </button>
            </div>

            {mode === "pin" ? (
              <>
                <p className="text-lg text-gray-500 mb-4 font-bold">Enter your 4-digit PIN</p>
                <div className="flex gap-3 justify-center mb-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center text-3xl font-black
                      ${pin.length > i ? "border-pokemon-blue bg-pokemon-blue/10 text-pokemon-blue" : "border-gray-200 bg-gray-50"}`}>
                      {pin.length > i ? "●" : ""}
                    </div>
                  ))}
                </div>
                {pinError && <p className="text-center text-red-500 font-bold mb-2">Incorrect PIN</p>}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => d === "⌫" ? handleDelete() : d ? handleDigit(d) : undefined}
                      disabled={!d}
                      className={`py-4 rounded-2xl text-2xl font-black min-h-[56px]
                        ${d === "⌫" ? "bg-red-100 text-red-600" : d ? "bg-gray-100 text-gray-800 active:bg-gray-200" : "invisible"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleVerify}
                  disabled={pin.length !== 4 || loading}
                  className="w-full py-4 rounded-2xl bg-pokemon-blue text-white text-lg font-black disabled:opacity-50 min-h-[56px]"
                >
                  {loading ? "Checking..." : "Unlock"}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                {(settingsError || settingsMessage) && (
                  <p className={`text-center text-base font-black ${settingsError ? "text-red-500" : "text-green-600"}`}>
                    {settingsError || settingsMessage}
                  </p>
                )}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-base font-bold text-gray-500 mb-3">Audio</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { const v = !musicOff; setMusicMuted(v); setMusicOff(v); }}
                      className={`flex-1 py-3 rounded-2xl text-base font-black min-h-[56px] ${musicOff ? "bg-gray-200 text-gray-500" : "bg-pokemon-blue text-white"}`}
                    >
                      Music: {musicOff ? "Off" : "On"}
                    </button>
                    <button
                      onClick={() => { const v = !soundOff; setMuted(v); setSoundOff(v); }}
                      className={`flex-1 py-3 rounded-2xl text-base font-black min-h-[56px] ${soundOff ? "bg-gray-200 text-gray-500" : "bg-pokemon-blue text-white"}`}
                    >
                      Sounds: {soundOff ? "Off" : "On"}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-base font-bold text-gray-500 mb-2">Today's Timer</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void handleExtendTime(-5)}
                      disabled={loading || !profile}
                      className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                      <Minus size={24} />
                    </button>
                    <p className="flex-1 text-center text-xl font-black text-gray-700">+/- 5 min</p>
                    <button
                      onClick={() => void handleExtendTime(5)}
                      disabled={loading || !profile}
                      className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                      <Plus size={24} />
                    </button>
                  </div>
                  <button
                    onClick={() => void handleResetToday()}
                    disabled={loading || !profile}
                    className="mt-3 w-full bg-pokemon-yellow text-pokemon-darkred rounded-2xl py-3 text-base font-black min-h-[52px] disabled:opacity-50"
                  >
                    Reset Today
                  </button>
                </div>

                {profile && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-base font-bold text-gray-500 mb-2">Daily Limit for {profile.name}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLimitChange(profile.dailyLimitMinutes - 5)}
                        disabled={loading || profile.dailyLimitMinutes <= 10}
                        className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                        <Minus size={24} />
                      </button>
                      <p className="flex-1 text-center text-xl font-black text-gray-700">{profile.dailyLimitMinutes} min</p>
                      <button
                        onClick={() => handleLimitChange(profile.dailyLimitMinutes + 5)}
                        disabled={loading || profile.dailyLimitMinutes >= 30}
                        className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-base font-bold text-gray-500 mb-3">Change PIN</p>
                  <div className="flex gap-3 mb-3">
                    <input
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      type="password"
                      placeholder="Current"
                      className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg font-black"
                    />
                    <input
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      type="password"
                      placeholder="New"
                      className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg font-black"
                    />
                  </div>
                  <button
                    onClick={handleChangePin}
                    disabled={loading || currentPin.length !== 4 || newPin.length !== 4}
                    className="w-full flex items-center justify-center gap-2 bg-pokemon-blue text-white rounded-2xl py-3 text-base font-black min-h-[56px] disabled:opacity-50"
                  >
                    <KeyRound size={20} />
                    Change PIN
                  </button>
                </div>

                <button
                  onClick={handleEndSession}
                  className="flex items-center justify-center gap-3 bg-red-50 text-red-600 rounded-2xl py-4 text-lg font-black min-h-[64px]"
                >
                  <LogOut size={22} />
                  End Session
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

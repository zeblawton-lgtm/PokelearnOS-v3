import { useLocation } from "wouter";
import { useSession } from "@/context/SessionContext";
import { Lock } from "lucide-react";

export function TopBar() {
  const { profile, openParentOverlay } = useSession();
  const [, navigate] = useLocation();

  if (!profile) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm px-4 pt-2 pb-2">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl bg-pokemon-red/10 flex items-center justify-center flex-shrink-0"
          aria-label="Home"
        >
          <span className="text-pokemon-red font-black text-sm">HOME</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={openParentOverlay}
          className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Parent controls"
        >
          <Lock size={25} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}

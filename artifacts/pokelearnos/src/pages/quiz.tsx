import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Globe, MessageCircle } from "lucide-react";

export default function QuizRedirect() {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
      <h2 className="text-3xl font-black text-gray-800">Choose a module</h2>
      {[
        { label: "Math", icon: BookOpen, color: "bg-pokemon-red", path: "/math" },
        { label: "Spanish", icon: MessageCircle, color: "bg-pokemon-blue", path: "/spanish" },
        { label: "World Explorer", icon: Globe, color: "bg-green-500", path: "/geography" },
      ].map(m => {
        const Icon = m.icon;
        return (
          <motion.button key={m.path} whileTap={{ scale: 0.96 }} onClick={() => navigate(m.path)}
            className={`${m.color} w-full rounded-3xl p-5 flex items-center gap-5 text-white shadow-lg`}>
            <Icon size={36} />
            <span className="text-2xl font-black">{m.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

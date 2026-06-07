import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api, type Profile, type SessionInfo } from "@/lib/api";
import * as music from "@/lib/music";

interface SessionState {
  profile: Profile | null;
  session: SessionInfo | null;
  secondsRemaining: number;
  isResting: boolean;
  isParentOverlayOpen: boolean;
  isLoading: boolean;
}

interface SessionActions {
  startSession: (profile: Profile, limitMinutes: number) => Promise<void>;
  endSession: () => Promise<void>;
  extendSession: (extraMinutes: number) => void;
  openParentOverlay: () => void;
  closeParentOverlay: () => void;
  logAttempt: (module: string, questionId: string, correct: boolean) => Promise<void>;
}

const SessionContext = createContext<(SessionState & SessionActions) | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isParentOverlayOpen, setIsParentOverlayOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setSecondsRemaining(seconds);
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          stopTimer();
          setIsResting(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startSession = useCallback(async (p: Profile, limitMinutes: number) => {
    music.playScene("menu"); // begin music within the user gesture (autoplay unlock)
    setIsLoading(true);
    try {
      const sess = await api.startSession(p.id);
      setProfile(p);
      setSession(sess);
      setIsResting(false);
      startTimer(limitMinutes * 60);
    } finally {
      setIsLoading(false);
    }
  }, [startTimer]);

  const endSession = useCallback(async () => {
    music.stop();
    stopTimer();
    if (session) {
      await api.endSession(session.id).catch(() => {});
    }
    setProfile(null);
    setSession(null);
    setSecondsRemaining(0);
    setIsResting(false);
    setIsParentOverlayOpen(false);
  }, [session, stopTimer]);

  const extendSession = useCallback((extraMinutes: number) => {
    const extra = extraMinutes * 60;
    setSecondsRemaining(prev => prev + extra);
    setIsResting(false);
    startTimer(secondsRemaining + extra);
  }, [secondsRemaining, startTimer]);

  const logAttempt = useCallback(async (module: string, questionId: string, correct: boolean) => {
    if (!session || !profile) return;
    await api.logAttempt({ sessionId: session.id, profileId: profile.id, module, questionId, correct }).catch(() => {});
  }, [session, profile]);

  return (
    <SessionContext.Provider value={{
      profile, session, secondsRemaining, isResting, isParentOverlayOpen, isLoading,
      startSession, endSession, extendSession,
      openParentOverlay: () => setIsParentOverlayOpen(true),
      closeParentOverlay: () => setIsParentOverlayOpen(false),
      logAttempt,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

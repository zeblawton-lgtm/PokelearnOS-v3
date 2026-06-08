import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api, type Profile, type SessionInfo, type TimerState } from "@/lib/api";
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
  startSession: (profile: Profile) => Promise<void>;
  endSession: () => Promise<void>;
  extendSession: (extraMinutes: number) => Promise<void>;
  updateDailyLimit: (dailyLimitMinutes: number) => Promise<void>;
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
  const sessionRef = useRef<SessionInfo | null>(null);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const expireSession = useCallback(() => {
    const current = sessionRef.current;
    if (current) {
      void api.endSession(current.id).catch(() => {});
    }
    setSession(null);
    setSecondsRemaining(0);
    setIsResting(true);
  }, []);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setSecondsRemaining(seconds);
    if (seconds <= 0) {
      expireSession();
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          stopTimer();
          expireSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [expireSession, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const applyTimerState = useCallback((timer: TimerState) => {
    setSecondsRemaining(timer.secondsRemaining);
    if (timer.isExpired) {
      stopTimer();
      setSession(null);
      setIsResting(true);
      return;
    }
    setIsResting(false);
    startTimer(timer.secondsRemaining);
  }, [startTimer, stopTimer]);

  const startSession = useCallback(async (p: Profile) => {
    music.playScene("menu"); // begin music within the user gesture (autoplay unlock)
    setIsLoading(true);
    try {
      const timer = await api.getTimer(p.id);
      setProfile({ ...p, dailyLimitMinutes: timer.dailyLimitMinutes });
      if (timer.isExpired) {
        setSession(null);
        applyTimerState(timer);
        return;
      }

      const sess = await api.startSession(p.id);
      setProfile({ ...p, dailyLimitMinutes: sess.dailyLimitMinutes });
      setSession(sess);
      setIsResting(false);
      startTimer(sess.secondsRemaining);
    } finally {
      setIsLoading(false);
    }
  }, [applyTimerState, startTimer]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    const refreshTimer = async () => {
      const timer = await api.getTimer(profile.id).catch(() => null);
      if (!timer || cancelled) return;
      setProfile(prev => {
        if (!prev || prev.dailyLimitMinutes === timer.dailyLimitMinutes) return prev;
        return { ...prev, dailyLimitMinutes: timer.dailyLimitMinutes };
      });
      applyTimerState(timer);
    };
    const id = setInterval(refreshTimer, 15000);
    void refreshTimer();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [applyTimerState, profile?.id]);

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

  const updateDailyLimit = useCallback(async (dailyLimitMinutes: number) => {
    const current = profileRef.current;
    if (!current) return;
    const updated = await api.updateProfile(current.id, { dailyLimitMinutes });
    setProfile(updated);
    const timer = await api.getTimer(updated.id);
    applyTimerState(timer);
  }, [applyTimerState]);

  const extendSession = useCallback(async (extraMinutes: number) => {
    const current = profileRef.current;
    if (!current) return;
    const nextLimit = Math.max(10, Math.min(30, current.dailyLimitMinutes + extraMinutes));
    const updated = await api.updateProfile(current.id, { dailyLimitMinutes: nextLimit });
    setProfile(updated);
    const timer = await api.getTimer(updated.id);
    if (!timer.isExpired && !sessionRef.current) {
      const sess = await api.startSession(updated.id);
      setSession(sess);
      setIsResting(false);
      startTimer(sess.secondsRemaining);
      return;
    }
    applyTimerState(timer);
  }, [applyTimerState, startTimer]);

  const logAttempt = useCallback(async (module: string, questionId: string, correct: boolean) => {
    if (!session || !profile) return;
    await api.logAttempt({ sessionId: session.id, profileId: profile.id, module, questionId, correct }).catch(() => {});
  }, [session, profile]);

  return (
    <SessionContext.Provider value={{
      profile, session, secondsRemaining, isResting, isParentOverlayOpen, isLoading,
      startSession, endSession, extendSession, updateDailyLimit,
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

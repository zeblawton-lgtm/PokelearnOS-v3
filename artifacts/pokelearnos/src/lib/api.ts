const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export interface Profile {
  id: number;
  name: string;
  age: number;
  avatarPokemonId: number;
  dailyLimitMinutes: number;
}

export interface SessionInfo {
  id: number;
  profileId: number;
  startedAt: string;
  minutesUsed: number;
}

export interface TimerState {
  sessionId: number;
  profileId: number;
  dailyLimitMinutes: number;
  minutesUsedToday: number;
  minutesRemaining: number;
  isExpired: boolean;
}

export const api = {
  getProfiles: () => req<Profile[]>("GET", "/profiles"),

  startSession: (profileId: number) =>
    req<SessionInfo>("POST", "/sessions/start", { profileId }),

  endSession: (sessionId: number) =>
    req<{ ok: true }>("POST", `/sessions/${sessionId}/end`),

  getTimer: (profileId: number) =>
    req<TimerState>("GET", `/timer/${profileId}`),

  logAttempt: (data: {
    sessionId: number;
    profileId: number;
    module: string;
    questionId: string;
    correct: boolean;
  }) => req<{ ok: true }>("POST", "/attempts", data),

  verifyPin: (pin: string) =>
    req<{ valid: boolean }>("POST", "/admin/verify-pin", { pin }),

  getSettings: () =>
    req<Record<string, string>>("GET", "/admin/settings"),

  updateSetting: (key: string, value: string) =>
    req<{ ok: true }>("PUT", "/admin/settings", { key, value }),

  updateProfile: (id: number, data: Partial<Pick<Profile, "dailyLimitMinutes">>) =>
    req<Profile>("PATCH", `/profiles/${id}`, data),

  getStats: (profileId: number) =>
    req<{ totalCorrect: number; totalAttempts: number; moduleBreakdown: Record<string, { correct: number; total: number }> }>(
      "GET", `/stats/${profileId}`
    ),
};

const BASE = "/api";

let adminToken: string | null = null;
let adminTokenExpiresAt = 0;

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (adminToken && Date.now() < adminTokenExpiresAt) {
    headers.set("Authorization", `Bearer ${adminToken}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) clearAdminAuth();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function setAdminAuth(token: string, expiresAt: string) {
  const expiresAtMs = Date.parse(expiresAt);
  adminToken = token;
  adminTokenExpiresAt = Number.isNaN(expiresAtMs) ? 0 : expiresAtMs;
}

export function clearAdminAuth() {
  adminToken = null;
  adminTokenExpiresAt = 0;
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
  dailyLimitMinutes: number;
  minutesRemaining: number;
  secondsRemaining: number;
  isExpired: boolean;
  openSessionCount: number;
}

export interface TimerState {
  sessionId: number | null;
  profileId: number;
  dailyLimitMinutes: number;
  minutesUsedToday: number;
  minutesRemaining: number;
  secondsRemaining: number;
  openSessionCount: number;
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

  verifyPin: async (pin: string) => {
    const result = await req<{ valid: boolean; token?: string; expiresAt?: string }>(
      "POST",
      "/admin/verify-pin",
      { pin },
    );
    if (result.valid && result.token && result.expiresAt) {
      setAdminAuth(result.token, result.expiresAt);
    } else {
      clearAdminAuth();
    }
    return result;
  },

  getSettings: () =>
    req<Record<string, string>>("GET", "/admin/settings"),

  updateSetting: (key: string, value: string) =>
    req<{ ok: true }>("PUT", "/admin/settings", { key, value }),

  changePin: (currentPin: string, newPin: string) =>
    req<{ ok: true }>("POST", "/admin/change-pin", { currentPin, newPin }),

  updateProfile: (id: number, data: Partial<Pick<Profile, "dailyLimitMinutes">>) =>
    req<Profile>("PATCH", `/profiles/${id}`, data),

  getStats: (profileId: number) =>
    req<{ totalCorrect: number; totalAttempts: number; moduleBreakdown: Record<string, { correct: number; total: number }> }>(
      "GET", `/stats/${profileId}`
    ),
};

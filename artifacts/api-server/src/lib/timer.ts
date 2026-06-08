const SECOND_MS = 1000;

export type SessionUsage = {
  id: number;
  startedAt: Date | string | number;
  endedAt: Date | string | number | null;
  minutesUsed: number;
};

export type TimerUsageState = {
  activeSessionId: number | null;
  openSessionCount: number;
  timeAdjustmentSeconds: number;
  secondsUsedToday: number;
  minutesUsedToday: number;
  secondsRemaining: number;
  minutesRemaining: number;
  isExpired: boolean;
};

export function startOfLocalDay(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function localDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sessionElapsedSeconds(
  session: Pick<SessionUsage, "startedAt" | "endedAt">,
  now = new Date(),
): number {
  const endMs = session.endedAt ? toMillis(session.endedAt) : now.getTime();
  const startMs = toMillis(session.startedAt);
  return Math.max(0, Math.ceil((endMs - startMs) / SECOND_MS));
}

export function persistedMinutesForSession(
  session: Pick<SessionUsage, "startedAt" | "endedAt">,
  now = new Date(),
): number {
  const seconds = sessionElapsedSeconds(session, now);
  return seconds === 0 ? 0 : Math.ceil(seconds / 60);
}

export function calculateTimerUsage(
  dailyLimitMinutes: number,
  sessions: SessionUsage[],
  now = new Date(),
  timeAdjustmentSeconds = 0,
): TimerUsageState {
  const todayStartMs = startOfLocalDay(now).getTime();
  const dailyLimitSeconds = Math.max(0, dailyLimitMinutes * 60);
  let secondsUsedToday = 0;
  let activeSessionId: number | null = null;
  let openSessionCount = 0;

  for (const session of sessions) {
    if (toMillis(session.startedAt) < todayStartMs) continue;

    if (session.endedAt) {
      secondsUsedToday += Math.max(0, session.minutesUsed) * 60;
      continue;
    }

    openSessionCount += 1;
    activeSessionId ??= session.id;
    secondsUsedToday += sessionElapsedSeconds(session, now);
  }

  const adjustedLimitSeconds = Math.max(0, dailyLimitSeconds + timeAdjustmentSeconds);
  const secondsRemaining = Math.max(0, adjustedLimitSeconds - secondsUsedToday);

  return {
    activeSessionId,
    openSessionCount,
    timeAdjustmentSeconds,
    secondsUsedToday,
    minutesUsedToday: Math.ceil(secondsUsedToday / 60),
    secondsRemaining,
    minutesRemaining: Math.ceil(secondsRemaining / 60),
    isExpired: secondsRemaining <= 0,
  };
}

function toMillis(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

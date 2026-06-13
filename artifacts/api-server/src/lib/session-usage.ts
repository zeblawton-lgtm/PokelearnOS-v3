const SECOND_MS = 1000;

export type SessionTimestamps = {
  startedAt: Date | string | number;
  endedAt: Date | string | number | null;
};

export function sessionElapsedSeconds(
  session: SessionTimestamps,
  now = new Date(),
): number {
  const endMs = session.endedAt ? toMillis(session.endedAt) : now.getTime();
  const startMs = toMillis(session.startedAt);
  return Math.max(0, Math.ceil((endMs - startMs) / SECOND_MS));
}

// Minutes persisted on sessions.minutesUsed — Progress-page history only;
// nothing enforces a limit on it (ADR-004).
export function persistedMinutesForSession(
  session: SessionTimestamps,
  now = new Date(),
): number {
  const seconds = sessionElapsedSeconds(session, now);
  return seconds === 0 ? 0 : Math.ceil(seconds / 60);
}

function toMillis(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

import assert from "node:assert/strict";
import test from "node:test";
import type { TimerUsageState } from "../src/lib/timer";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ADMIN_AUTH_SECRET = "test-admin-auth-secret";
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/pokelearnos_test";

const { toPublicTimerState } = await import("../src/routes/sessions");

test("public timer state is unlimited even when recorded usage is over the old limit", () => {
  const expiredUsage: TimerUsageState = {
    activeSessionId: 12,
    openSessionCount: 1,
    timeAdjustmentSeconds: 0,
    secondsUsedToday: 30 * 60,
    minutesUsedToday: 30,
    secondsRemaining: 0,
    minutesRemaining: 0,
    isExpired: true,
  };

  const timer = toPublicTimerState(
    1,
    { dailyLimitMinutes: 20 },
    expiredUsage,
  );

  assert.equal(timer.isUnlimited, true);
  assert.equal(timer.isExpired, false);
  assert.equal(timer.minutesRemaining, null);
  assert.equal(timer.secondsRemaining, null);
  assert.equal(timer.sessionId, 12);
  assert.equal(timer.openSessionCount, 1);
  assert.equal(timer.minutesUsedToday, 30);
});

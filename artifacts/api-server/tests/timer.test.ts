import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTimerUsage,
  persistedMinutesForSession,
  startOfLocalDay,
} from "../src/lib/timer";

const NOW = new Date("2026-06-08T15:30:00.000Z");

test("timer usage counts persisted ended sessions against today's limit", () => {
  const usage = calculateTimerUsage(20, [
    {
      id: 1,
      startedAt: "2026-06-08T14:00:00.000Z",
      endedAt: "2026-06-08T14:07:00.000Z",
      minutesUsed: 7,
    },
  ], NOW);

  assert.equal(usage.openSessionCount, 0);
  assert.equal(usage.activeSessionId, null);
  assert.equal(usage.minutesUsedToday, 7);
  assert.equal(usage.secondsRemaining, 13 * 60);
  assert.equal(usage.isExpired, false);
});

test("timer usage includes elapsed seconds from an active open session", () => {
  const usage = calculateTimerUsage(10, [
    {
      id: 11,
      startedAt: "2026-06-08T15:26:30.000Z",
      endedAt: null,
      minutesUsed: 0,
    },
  ], NOW);

  assert.equal(usage.openSessionCount, 1);
  assert.equal(usage.activeSessionId, 11);
  assert.equal(usage.secondsUsedToday, 210);
  assert.equal(usage.secondsRemaining, 390);
  assert.equal(usage.minutesRemaining, 7);
});

test("timer usage ignores sessions before the local day boundary", () => {
  const todayStart = startOfLocalDay(NOW);
  const yesterday = new Date(todayStart.getTime() - 60_000);

  const usage = calculateTimerUsage(15, [
    {
      id: 21,
      startedAt: yesterday,
      endedAt: todayStart,
      minutesUsed: 15,
    },
  ], NOW);

  assert.equal(usage.minutesUsedToday, 0);
  assert.equal(usage.secondsRemaining, 15 * 60);
  assert.equal(usage.isExpired, false);
});

test("timer usage expires when active elapsed time reaches the limit", () => {
  const usage = calculateTimerUsage(5, [
    {
      id: 31,
      startedAt: "2026-06-08T15:24:59.000Z",
      endedAt: null,
      minutesUsed: 0,
    },
  ], NOW);

  assert.equal(usage.openSessionCount, 1);
  assert.equal(usage.secondsRemaining, 0);
  assert.equal(usage.minutesRemaining, 0);
  assert.equal(usage.isExpired, true);
});

test("persisted session minutes round partial minutes up", () => {
  const session = {
    startedAt: "2026-06-08T15:28:01.000Z",
    endedAt: null,
  };

  assert.equal(persistedMinutesForSession(session, NOW), 2);
});

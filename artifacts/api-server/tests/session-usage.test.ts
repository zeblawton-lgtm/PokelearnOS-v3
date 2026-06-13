import assert from "node:assert/strict";
import test from "node:test";
import {
  persistedMinutesForSession,
  sessionElapsedSeconds,
} from "../src/lib/session-usage";

const NOW = new Date("2026-06-08T15:30:00.000Z");

test("elapsed seconds use the end timestamp for ended sessions", () => {
  const seconds = sessionElapsedSeconds({
    startedAt: "2026-06-08T14:00:00.000Z",
    endedAt: "2026-06-08T14:07:00.000Z",
  }, NOW);

  assert.equal(seconds, 7 * 60);
});

test("elapsed seconds run to now for open sessions", () => {
  const seconds = sessionElapsedSeconds({
    startedAt: "2026-06-08T15:26:30.000Z",
    endedAt: null,
  }, NOW);

  assert.equal(seconds, 210);
});

test("persisted session minutes round partial minutes up", () => {
  const session = {
    startedAt: "2026-06-08T15:28:01.000Z",
    endedAt: null,
  };

  assert.equal(persistedMinutesForSession(session, NOW), 2);
});

test("zero-length sessions persist zero minutes", () => {
  const session = {
    startedAt: "2026-06-08T15:30:00.000Z",
    endedAt: "2026-06-08T15:30:00.000Z",
  };

  assert.equal(persistedMinutesForSession(session, NOW), 0);
});

import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, profilesTable, settingsTable } from "@workspace/db/schema";
import { eq, and, gte, isNull, lt } from "drizzle-orm";
import {
  calculateTimerUsage,
  localDayKey,
  persistedMinutesForSession,
  startOfLocalDay,
  type SessionUsage,
} from "../lib/timer";
import { requireAdminAuth } from "../lib/admin-auth";

const router = Router();

router.post("/sessions/start", async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }
  const id = Number(profileId);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "profileId must be an integer" }); return; }

  await closeOpenSessions(id);
  const timer = await getTimerState(id);
  if (!timer) { res.status(404).json({ error: "Profile not found" }); return; }
  if (timer.isExpired) { res.status(403).json({ error: "Daily limit reached", timer }); return; }

  const [session] = await db.insert(sessionsTable)
    .values({ profileId: id })
    .returning();
  const activeTimer = await getTimerState(id);
  res.status(201).json({ ...session, ...activeTimer });
});

router.post("/sessions/:id/end", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const session = await db.query.sessionsTable.findFirst({ where: eq(sessionsTable.id, id) });
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.endedAt) { res.json(session); return; }

  const minutesUsed = persistedMinutesForSession(session);

  const [updated] = await db.update(sessionsTable)
    .set({ endedAt: new Date(), minutesUsed })
    .where(eq(sessionsTable.id, id))
    .returning();
  res.json(updated);
});

router.get("/timer/:profileId", async (req, res) => {
  const profileId = parseInt(String(req.params.profileId), 10);
  const timer = await getTimerState(profileId);
  if (!timer) { res.status(404).json({ error: "Profile not found" }); return; }

  if (timer.isExpired && timer.openSessionCount > 0) {
    await closeOpenSessions(profileId);
    const persisted = await getTimerState(profileId);
    res.json(persisted);
    return;
  }

  res.json(timer);
});

router.post("/timer/:profileId/adjust", requireAdminAuth, async (req, res) => {
  const profileId = parseInt(String(req.params.profileId), 10);
  if (!Number.isInteger(profileId)) { res.status(400).json({ error: "profileId must be an integer" }); return; }

  const minutes = Number(req.body?.minutes);
  if (!Number.isInteger(minutes) || minutes < -30 || minutes > 30 || minutes === 0) {
    res.status(400).json({ error: "minutes must be an integer from -30 to 30, excluding 0" }); return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const current = await getTimerAdjustmentSeconds(profileId);
  await setTimerAdjustmentSeconds(profileId, current + minutes * 60);

  const timer = await getTimerState(profileId);
  if (!timer) { res.status(404).json({ error: "Profile not found" }); return; }

  if (timer.isExpired && timer.openSessionCount > 0) {
    await closeOpenSessions(profileId);
    res.json(await getTimerState(profileId));
    return;
  }

  res.json(timer);
});

router.post("/timer/:profileId/reset", requireAdminAuth, async (req, res) => {
  const profileId = parseInt(String(req.params.profileId), 10);
  if (!Number.isInteger(profileId)) { res.status(400).json({ error: "profileId must be an integer" }); return; }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  await closeOpenSessions(profileId);
  const now = new Date();
  const today = startOfLocalDay(now);
  const sessions = await db.select()
    .from(sessionsTable)
    .where(and(
      eq(sessionsTable.profileId, profileId),
      gte(sessionsTable.startedAt, today),
    ));
  const usage = calculateTimerUsage(profile.dailyLimitMinutes, sessions as SessionUsage[], now, 0);
  await setTimerAdjustmentSeconds(profileId, usage.secondsUsedToday);

  res.json(await getTimerState(profileId, now));
});

async function getTimerState(profileId: number, now = new Date()) {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) return null;

  const today = startOfLocalDay(now);
  await closeOpenSessionsBefore(profileId, today);

  const sessions = await db.select()
    .from(sessionsTable)
    .where(and(
      eq(sessionsTable.profileId, profileId),
      gte(sessionsTable.startedAt, today),
    ));

  const usage = calculateTimerUsage(
    profile.dailyLimitMinutes,
    sessions as SessionUsage[],
    now,
    await getTimerAdjustmentSeconds(profileId, now),
  );

  return {
    sessionId: usage.activeSessionId,
    profileId,
    dailyLimitMinutes: profile.dailyLimitMinutes,
    timeAdjustmentSeconds: usage.timeAdjustmentSeconds,
    timeAdjustmentMinutes: Math.ceil(usage.timeAdjustmentSeconds / 60),
    minutesUsedToday: usage.minutesUsedToday,
    minutesRemaining: usage.minutesRemaining,
    secondsRemaining: usage.secondsRemaining,
    openSessionCount: usage.openSessionCount,
    isExpired: usage.isExpired,
  };
}

async function getTimerAdjustmentSeconds(profileId: number, now = new Date()): Promise<number> {
  const setting = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, timerAdjustmentKey(profileId, now)),
  });
  const seconds = Number(setting?.value ?? 0);
  return Number.isFinite(seconds) ? Math.trunc(seconds) : 0;
}

async function setTimerAdjustmentSeconds(profileId: number, seconds: number, now = new Date()): Promise<void> {
  const key = timerAdjustmentKey(profileId, now);
  const value = String(Math.trunc(seconds));
  await db.insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

function timerAdjustmentKey(profileId: number, now = new Date()): string {
  return `timer_adjustment:${profileId}:${localDayKey(now)}`;
}

async function closeOpenSessionsBefore(profileId: number, before: Date): Promise<void> {
  const openSessions = await db.select()
    .from(sessionsTable)
    .where(and(
      eq(sessionsTable.profileId, profileId),
      isNull(sessionsTable.endedAt),
      lt(sessionsTable.startedAt, before),
    ));

  for (const session of openSessions) {
    await db.update(sessionsTable)
      .set({
        endedAt: new Date(),
        minutesUsed: persistedMinutesForSession(session),
      })
      .where(eq(sessionsTable.id, session.id));
  }
}

async function closeOpenSessions(profileId: number): Promise<void> {
  const openSessions = await db.select()
    .from(sessionsTable)
    .where(and(
      eq(sessionsTable.profileId, profileId),
      isNull(sessionsTable.endedAt),
    ));

  for (const session of openSessions) {
    await db.update(sessionsTable)
      .set({
        endedAt: new Date(),
        minutesUsed: persistedMinutesForSession(session),
      })
      .where(eq(sessionsTable.id, session.id));
  }
}

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, profilesTable } from "@workspace/db/schema";
import { eq, and, gte, isNull, lt } from "drizzle-orm";
import {
  calculateTimerUsage,
  persistedMinutesForSession,
  startOfLocalDay,
  type SessionUsage,
} from "../lib/timer";

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

async function getTimerState(profileId: number) {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) return null;

  const today = startOfLocalDay();
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
  );

  return {
    sessionId: usage.activeSessionId,
    profileId,
    dailyLimitMinutes: profile.dailyLimitMinutes,
    minutesUsedToday: usage.minutesUsedToday,
    minutesRemaining: usage.minutesRemaining,
    secondsRemaining: usage.secondsRemaining,
    openSessionCount: usage.openSessionCount,
    isExpired: usage.isExpired,
  };
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

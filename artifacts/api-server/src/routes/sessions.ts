import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, profilesTable } from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const router = Router();

router.post("/sessions/start", async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const [session] = await db.insert(sessionsTable)
    .values({ profileId })
    .returning();
  res.status(201).json(session);
});

router.post("/sessions/:id/end", async (req, res) => {
  const id = parseInt(req.params.id);
  const session = await db.query.sessionsTable.findFirst({ where: eq(sessionsTable.id, id) });
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const started = new Date(session.startedAt).getTime();
  const minutesUsed = Math.round((Date.now() - started) / 60000);

  const [updated] = await db.update(sessionsTable)
    .set({ endedAt: new Date(), minutesUsed })
    .where(eq(sessionsTable.id, id))
    .returning();
  res.json(updated);
});

router.get("/timer/:profileId", async (req, res) => {
  const profileId = parseInt(req.params.profileId);

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db.select({ total: sql<number>`coalesce(sum(${sessionsTable.minutesUsed}), 0)` })
    .from(sessionsTable)
    .where(and(
      eq(sessionsTable.profileId, profileId),
      gte(sessionsTable.startedAt, today),
    ));

  const minutesUsedToday = Number(rows[0]?.total ?? 0);
  const minutesRemaining = Math.max(0, profile.dailyLimitMinutes - minutesUsedToday);

  res.json({
    sessionId: null,
    profileId,
    dailyLimitMinutes: profile.dailyLimitMinutes,
    minutesUsedToday,
    minutesRemaining,
    isExpired: minutesRemaining <= 0,
  });
});

export default router;

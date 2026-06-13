import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, profilesTable } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { persistedMinutesForSession } from "../lib/session-usage";

const router = Router();

router.post("/sessions/start", async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }
  const id = Number(profileId);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "profileId must be an integer" }); return; }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, id));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  await closeOpenSessions(id);
  const [session] = await db.insert(sessionsTable)
    .values({ profileId: id })
    .returning();
  res.status(201).json(session);
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

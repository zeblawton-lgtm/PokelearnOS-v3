import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, insertProfileSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminAuth } from "../lib/admin-auth";

const router = Router();

router.get("/profiles", async (req, res) => {
  const profiles = await db.select().from(profilesTable).orderBy(profilesTable.id);
  res.json(profiles);
});

router.post("/profiles", requireAdminAuth, async (req, res) => {
  const parsed = insertProfileSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [profile] = await db.insert(profilesTable).values(parsed.data).returning();
  res.status(201).json(profile);
});

router.patch("/profiles/:id", requireAdminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { dailyLimitMinutes } = req.body;
  if (typeof dailyLimitMinutes !== "number" || dailyLimitMinutes < 1) {
    res.status(400).json({ error: "dailyLimitMinutes must be a positive number" }); return;
  }
  const [updated] = await db.update(profilesTable)
    .set({ dailyLimitMinutes })
    .where(eq(profilesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json(updated);
});

export default router;

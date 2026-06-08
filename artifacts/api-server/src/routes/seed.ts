import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { requireAdminAuth } from "../lib/admin-auth";

const router = Router();

router.post("/admin/seed", requireAdminAuth, async (_req, res) => {
  const existing = await db.select().from(profilesTable);
  if (existing.length >= 2) {
    res.json({ ok: true, message: "Already seeded", profiles: existing });
    return;
  }

  const profiles = await db.insert(profilesTable).values([
    { name: "Michael", age: 5, avatarPokemonId: 25, dailyLimitMinutes: 20 },
    { name: "Leo", age: 3, avatarPokemonId: 39, dailyLimitMinutes: 15 },
  ]).returning();

  res.status(201).json({ ok: true, message: "Seeded", profiles });
});

export default router;

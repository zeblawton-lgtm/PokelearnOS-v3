import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// Auto-seed default profiles on a fresh database (kiosk first boot), and apply
// small data migrations to already-seeded databases. Same defaults as the
// protected manual re-seeding endpoint.
async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(profilesTable);
  if (existing.length === 0) {
    await db.insert(profilesTable).values([
      { name: "Michael", age: 5, avatarPokemonId: 25, dailyLimitMinutes: 20 },
      { name: "Leo", age: 3, avatarPokemonId: 778, dailyLimitMinutes: 15 },
    ]);
    logger.info("Fresh database — seeded default profiles (Michael, Leo)");
    return;
  }
  // Migration: Leo's avatar moved from Jigglypuff (39) to Mimikyu (778).
  const leo = existing.find((p) => p.name === "Leo");
  if (leo && leo.avatarPokemonId === 39) {
    await db.update(profilesTable)
      .set({ avatarPokemonId: 778 })
      .where(eq(profilesTable.id, leo.id));
    logger.info("Migrated Leo's avatar 39 → 778 (Mimikyu)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);
const host = "127.0.0.1";

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedIfEmpty().catch((err) => {
  // Non-fatal: the kiosk can still serve; profiles can be seeded manually.
  logger.error({ err }, "Auto-seed failed");
});

app.listen(port, host, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ host, port }, "Server listening");
});

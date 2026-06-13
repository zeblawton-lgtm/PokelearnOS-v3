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
      { name: "Michael", age: 5, avatarPokemonId: 882 },
      { name: "Leo", age: 3, avatarPokemonId: 145 },
    ]);
    logger.info("Fresh database — seeded default profiles (Michael, Leo)");
    return;
  }
  // Migrations for already-seeded kiosk databases (avatar changes).
  const leo = existing.find((p) => p.name === "Leo");
  if (leo && [39, 778].includes(leo.avatarPokemonId)) {
    await db.update(profilesTable)
      .set({ avatarPokemonId: 145 })
      .where(eq(profilesTable.id, leo.id));
    logger.info({ from: leo.avatarPokemonId, to: 145 }, "Migrated Leo's avatar to Zapdos");
  }
  const michael = existing.find((p) => p.name === "Michael");
  if (michael && [25, 448].includes(michael.avatarPokemonId)) {
    await db.update(profilesTable)
      .set({ avatarPokemonId: 882 })
      .where(eq(profilesTable.id, michael.id));
    logger.info({ from: michael.avatarPokemonId, to: 882 }, "Migrated Michael's avatar to Dracovish");
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

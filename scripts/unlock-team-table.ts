import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Unlocking Team, TeamMember, and ProjectTeam tables in CockroachDB...");
    await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Team" SET (schema_locked = false);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "TeamMember" SET (schema_locked = false);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "ProjectTeam" SET (schema_locked = false);`);
    console.log("Tables unlocked.");
  } catch (err: any) {
    console.log("Note during unlock:", err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

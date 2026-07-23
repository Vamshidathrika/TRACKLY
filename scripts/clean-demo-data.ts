import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning demo users and demo workspaces from database...");

  // 1. Delete Demo Site and its cascading projects/issues
  const deletedSites = await prisma.site.deleteMany({
    where: {
      OR: [
        { slug: "demo-workspace" },
        { name: { contains: "Demo", mode: "insensitive" } },
      ],
    },
  });
  console.log(`Deleted ${deletedSites.count} demo sites.`);

  // 2. Delete Demo Users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "demo@trackly.dev" },
        { email: { contains: "demo", mode: "insensitive" } },
        { name: { contains: "Demo", mode: "insensitive" } },
      ],
    },
  });
  console.log(`Deleted ${deletedUsers.count} demo users.`);

  console.log("Demo data cleanup complete!");
}

main()
  .catch((e) => {
    console.error("Error cleaning demo data:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

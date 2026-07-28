/**
 * Removes the seeded demo workspace and demo user.
 *
 * This script previously matched with `contains: "demo"` (case-insensitive) on
 * Site.name, User.name and User.email, with no environment guard. Run against a
 * real database that meant deleting a customer workspace called "Demo Corp", or
 * a real person named "Demond" / "demo.ops@acme.com", cascading every project
 * and issue they owned. Matching is now restricted to the exact identifiers
 * written by prisma/seed.ts, it refuses to run in production, and it reports
 * what it would delete unless you pass --confirm.
 *
 *   npx tsx scripts/clean-demo-data.ts             # dry run
 *   npx tsx scripts/clean-demo-data.ts --confirm   # actually delete
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_SITE_SLUG = "demo-workspace";
const DEMO_USER_EMAIL = "demo@trackly.dev";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run against NODE_ENV=production. This script deletes workspaces and users."
    );
  }

  const confirmed = process.argv.includes("--confirm");

  const siteWhere = { slug: DEMO_SITE_SLUG };
  const userWhere = { email: DEMO_USER_EMAIL };

  const [sites, users] = await Promise.all([
    prisma.site.findMany({ where: siteWhere, select: { id: true, name: true, slug: true } }),
    prisma.user.findMany({ where: userWhere, select: { id: true, email: true } }),
  ]);

  if (sites.length === 0 && users.length === 0) {
    console.log("Nothing to clean — no seeded demo workspace or demo user found.");
    return;
  }

  for (const s of sites) console.log(`site  ${s.slug}  (${s.name})`);
  for (const u of users) console.log(`user  ${u.email}`);

  if (!confirmed) {
    console.log(
      `\nDry run. ${sites.length} site(s) and ${users.length} user(s) match. ` +
        "Re-run with --confirm to delete them and everything they cascade to."
    );
    return;
  }

  const deletedSites = await prisma.site.deleteMany({ where: siteWhere });
  const deletedUsers = await prisma.user.deleteMany({ where: userWhere });

  console.log(`\nDeleted ${deletedSites.count} demo site(s) and ${deletedUsers.count} demo user(s).`);
}

main()
  .catch((e) => {
    console.error("Error cleaning demo data:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

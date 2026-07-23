/**
 * One-time migration: Grant all existing workspace members
 * ProjectMember access to all existing projects in their workspace.
 *
 * This bridges the gap between the old model (all site members see all projects)
 * and the new model (per-project access control via ProjectMember).
 *
 * Run with: npx tsx scripts/migrate-project-members.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migrating existing members to ProjectMember records...\n");

  // Get all sites with their memberships and projects
  const sites = await prisma.site.findMany({
    include: {
      memberships: { select: { userId: true, role: true } },
      projects: { select: { id: true, key: true } },
    },
  });

  let totalCreated = 0;

  for (const site of sites) {
    console.log(`📋 Site: ${site.name} (${site.slug})`);
    console.log(`   Members: ${site.memberships.length}, Projects: ${site.projects.length}`);

    if (site.projects.length === 0 || site.memberships.length === 0) {
      console.log("   ⏩ Skipping (no projects or members)\n");
      continue;
    }

    // Build ProjectMember records for all member×project combinations
    const records: Array<{ projectId: string; userId: string; role: "ADMIN" | "MEMBER" | "VIEWER" }> = [];

    for (const member of site.memberships) {
      for (const project of site.projects) {
        records.push({
          projectId: project.id,
          userId: member.userId,
          // Workspace ADMINs get project ADMIN; MEMBERs get project MEMBER
          role: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
        });
      }
    }

    const result = await prisma.projectMember.createMany({
      data: records,
      skipDuplicates: true,
    });

    totalCreated += result.count;
    console.log(`   ✅ Created ${result.count} ProjectMember records\n`);
  }

  console.log(`\n🎉 Migration complete! Created ${totalCreated} ProjectMember records total.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

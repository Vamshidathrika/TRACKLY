import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  const email = "demo@trackly.dev";
  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create or update Demo User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Demo User",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    },
  });

  // 2. Create or update Demo Site
  const site = await prisma.site.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
    },
  });

  // 3. Create Membership
  await prisma.membership.upsert({
    where: { userId_siteId: { userId: user.id, siteId: site.id } },
    update: { role: "ADMIN" },
    create: {
      userId: user.id,
      siteId: site.id,
      role: "ADMIN",
    },
  });

  // 4. Create Demo Project
  let project = await prisma.project.findFirst({
    where: { siteId: site.id, key: "DEMO" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        siteId: site.id,
        name: "Demo Software Project",
        key: "DEMO",
        type: "KANBAN",
        leadId: user.id,
        issueCounter: 4,
      },
    });

    // 5. Create Sample Issues
    await prisma.issue.createMany({
      data: [
        {
          projectId: project.id,
          number: 1,
          key: "DEMO-1",
          summary: "Set up team project repository and database models",
          description: "Scaffold Next.js 15 app with Prisma ORM, Postgres, and design system.",
          type: "TASK",
          status: "DONE",
          priority: "HIGH",
          storyPoints: 3,
          reporterId: user.id,
          assigneeId: user.id,
          labels: ["setup", "database"],
        },
        {
          projectId: project.id,
          number: 2,
          key: "DEMO-2",
          summary: "Design Atlassian-style UI primitives and layout shell",
          description: "Build TopNav, Sidebar, Button, Input, Dropdown, and Avatar components.",
          type: "STORY",
          status: "DONE",
          priority: "HIGHEST",
          storyPoints: 5,
          reporterId: user.id,
          assigneeId: user.id,
          labels: ["ui", "design-system"],
        },
        {
          projectId: project.id,
          number: 3,
          key: "DEMO-3",
          summary: "Build Issue Detail view with inline updates & activity feed",
          description: "Allow inline editing of status, priority, and post comments on issue page.",
          type: "STORY",
          status: "IN_PROGRESS",
          priority: "HIGH",
          storyPoints: 8,
          reporterId: user.id,
          assigneeId: user.id,
          labels: ["frontend", "feature"],
        },
        {
          projectId: project.id,
          number: 4,
          key: "DEMO-4",
          summary: "Fix navigation dropdown alignment on small screens",
          description: "Ensure top navigation dropdown menu aligns to the right side of the avatar.",
          type: "BUG",
          status: "TO_DO",
          priority: "MEDIUM",
          storyPoints: 2,
          reporterId: user.id,
          assigneeId: user.id,
          labels: ["bugfix", "ui"],
        },
      ],
    });

    // Add a sample comment to DEMO-3
    const issue3 = await prisma.issue.findFirst({ where: { key: "DEMO-3" } });
    if (issue3) {
      await prisma.comment.create({
        data: {
          issueId: issue3.id,
          authorId: user.id,
          body: "Inline status update actions and comment submission have been tested and verified!",
        },
      });
    }
  }

  console.log("Seeding complete! Demo account: demo@trackly.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

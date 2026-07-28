import { prisma } from "./prisma";

export async function createRelease(input: {
  projectId: string;
  name: string;
  description?: string;
  releaseDate?: Date;
}) {
  return prisma.release.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      releaseDate: input.releaseDate,
      status: "UNRELEASED",
    },
  });
}

export async function updateRelease(
  releaseId: string,
  data: { name?: string; description?: string; releaseDate?: Date | null }
) {
  return prisma.release.update({
    where: { id: releaseId },
    data,
  });
}

export async function deleteRelease(releaseId: string) {
  // Issue.releaseId is onDelete: SetNull — deleting a release un-tags its
  // issues rather than deleting them.
  return prisma.release.delete({ where: { id: releaseId } });
}

export async function setReleaseStatus(releaseId: string, status: "UNRELEASED" | "RELEASED" | "ARCHIVED") {
  return prisma.release.update({
    where: { id: releaseId },
    data: { status },
  });
}

export async function updateReleaseNotes(releaseId: string, notesMarkdown: string) {
  return prisma.release.update({
    where: { id: releaseId },
    data: { notesMarkdown },
  });
}

export async function getReleasesByProject(projectId: string) {
  const releases = await prisma.release.findMany({
    where: { projectId },
    include: {
      issues: { select: { id: true, status: true } },
    },
    orderBy: [{ releaseDate: "desc" }, { createdAt: "desc" }],
  });

  // completedIssues/totalIssues are always derived here, never stored — a
  // hand-typed count drifts the moment an issue moves; this can't.
  return releases.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    releaseDate: r.releaseDate,
    notesMarkdown: r.notesMarkdown,
    totalIssues: r.issues.length,
    completedIssues: r.issues.filter((i) => i.status === "DONE").length,
  }));
}

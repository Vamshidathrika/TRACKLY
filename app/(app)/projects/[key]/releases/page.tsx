import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
import { getReleasesByProject } from "@/lib/releases";
import { BoardNotFound } from "@/components/projects/BoardNotFound";
import { AccessRevokedBanner } from "@/components/projects/AccessRevokedBanner";
import { getAdminContactForSite } from "@/lib/tenant";
import { ReleaseHub } from "@/components/projects/ReleaseHub";

export default async function ReleasesPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { userId, siteId } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={false} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) {
    const adminContact = await getAdminContactForSite(project.siteId);
    return (
      <AccessRevokedBanner
        projectKey={project.key}
        projectName={project.name}
        adminName={adminContact.name ?? "Workspace Admin"}
        adminEmail={adminContact.email}
      />
    );
  }

  const releases = await getReleasesByProject(project.id);

  return (
    <ReleaseHub
      projectId={project.id}
      projectKey={project.key}
      initialReleases={releases.map((r) => ({
        ...r,
        releaseDate: r.releaseDate ? r.releaseDate.toISOString().split("T")[0] : null,
      }))}
    />
  );
}

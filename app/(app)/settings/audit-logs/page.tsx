import { requireAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import {
  SecurityAuditLogsView,
  type AuditLogRecord,
} from "@/components/settings/SecurityAuditLogsView";

/**
 * Audit records come from the database, not from a literal in the component.
 *
 * Only board deletions are durably recorded today (DeletedBoardLog), so that is
 * all this shows. The page previously rendered five invented events attributed
 * to a real person and IP address. Showing fewer real events beats showing
 * convincing fake ones on the screen used for investigations.
 *
 * requireAdmin, not requireMembership: these rows carry member names and emails.
 */
export default async function AuditLogsSettingsPage() {
  const { siteId } = await requireAdmin();

  const deletions = await prisma.deletedBoardLog.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const logs: AuditLogRecord[] = deletions.map((d) => ({
    id: d.id,
    timestamp: d.createdAt.toISOString().replace("T", " ").slice(0, 19),
    actor: d.deletedByName,
    actorEmail: d.deletedByEmail,
    category: "DATA",
    action: "Deleted board",
    target: `${d.projectKey} — ${d.projectName}`,
    // Not captured anywhere. An em dash is honest; a plausible address is not.
    ip: "—",
  }));

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Security Audit Stream" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Security Audit Log</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Recorded administrative actions in this workspace. Board deletions are captured today;
          login, token, and permission events are not yet recorded.
        </p>
      </div>

      <SettingsNav />
      <SecurityAuditLogsView logs={logs} />
    </div>
  );
}

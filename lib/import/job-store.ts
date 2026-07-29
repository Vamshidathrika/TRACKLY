/**
 * Optional durable run history.
 *
 * The ImportJob / ImportRow models proposed in .plan/import-schema.prisma are
 * NOT in prisma/schema.prisma yet (that file is owned by another change in
 * flight). Rather than block the importer on them, this module feature-detects
 * them on the Prisma client at runtime:
 *
 *   - models absent  -> every function is a no-op, the importer works, and the
 *                       report lives only as long as the page
 *   - models present -> runs are recorded with no further code changes
 *
 * The `any` casts are deliberate and confined to this file. They exist because
 * the generated client has no types for models that do not exist yet; the rest
 * of lib/import/** stays fully typed.
 */
import { prisma } from "../prisma";
import type { ImportReport, ImportSource } from "./types";

type MaybeDelegate = { create: (args: unknown) => Promise<{ id: string }>; update: (args: unknown) => Promise<unknown> } | undefined;

function jobDelegate(): MaybeDelegate {
  return (prisma as unknown as Record<string, MaybeDelegate>).importJob;
}

function rowDelegate(): { createMany: (args: unknown) => Promise<unknown> } | undefined {
  return (prisma as unknown as Record<string, { createMany: (args: unknown) => Promise<unknown> } | undefined>).importRow;
}

/** True when the proposed schema has been applied. */
export function isJobHistoryEnabled(): boolean {
  return typeof jobDelegate()?.create === "function";
}

export type StartJobInput = {
  siteId: string;
  startedById: string;
  source: ImportSource;
  filename: string | null;
  dryRun: boolean;
};

/**
 * Returns the job id, or null when history is unavailable. Callers must treat
 * null as "carry on" — losing the audit row is not a reason to refuse an
 * import the admin asked for.
 */
export async function startImportJob(input: StartJobInput): Promise<string | null> {
  const delegate = jobDelegate();
  if (!delegate) return null;

  try {
    const job = await delegate.create({
      data: {
        siteId: input.siteId,
        startedById: input.startedById,
        source: input.source,
        filename: input.filename,
        dryRun: input.dryRun,
        status: "RUNNING",
      },
      select: { id: true },
    });
    return job.id;
  } catch (e) {
    console.error("[import] could not record ImportJob:", e);
    return null;
  }
}

export async function finishImportJob(jobId: string | null, report: ImportReport): Promise<void> {
  const delegate = jobDelegate();
  if (!jobId || !delegate) return;

  const errorCount = report.rowIssues.filter((r) => r.severity === "error").length;

  try {
    await delegate.update({
      where: { id: jobId },
      data: {
        status: errorCount > 0 ? "PARTIAL" : "SUCCEEDED",
        totalRows: report.sourceRowCount,
        createdCount: report.summary.issues.created,
        updatedCount: report.summary.issues.updated,
        skippedCount: report.summary.issues.skipped,
        errorCount,
        report: report as unknown as Record<string, unknown>,
        finishedAt: new Date(),
      },
    });

    const rows = rowDelegate();
    if (rows) {
      // Only failures are persisted per-row: a clean 5,000-issue import does
      // not need 5,000 audit rows saying "fine".
      const data = report.rowIssues
        .filter((r) => r.jiraKey)
        .map((r) => ({
          jobId,
          rowNumber: r.row,
          externalKey: r.jiraKey!,
          outcome: r.severity === "error" ? "ERROR" : "SKIPPED",
          message: r.message,
        }));
      if (data.length > 0) await rows.createMany({ data, skipDuplicates: true });
    }
  } catch (e) {
    console.error("[import] could not finalise ImportJob:", e);
  }
}

export async function failImportJob(jobId: string | null, message: string): Promise<void> {
  const delegate = jobDelegate();
  if (!jobId || !delegate) return;
  try {
    await delegate.update({
      where: { id: jobId },
      data: { status: "FAILED", finishedAt: new Date(), report: { error: message } },
    });
  } catch (e) {
    console.error("[import] could not mark ImportJob failed:", e);
  }
}

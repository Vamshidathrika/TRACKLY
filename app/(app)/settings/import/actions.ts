"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/tenant";
import {
  parseImportFile,
  planImport,
  runImport,
  startImportJob,
  finishImportJob,
  failImportJob,
  MAX_IMPORT_BYTES,
} from "@/lib/import";
import type { ImportReport } from "@/lib/import";

/**
 * Options accepted from the browser. Validated rather than trusted: a server
 * action is POST-able directly, and `grantMembershipToStubs` decides whether
 * imported email addresses get workspace access (see lib/import/users.ts).
 */
const optionsSchema = z.object({
  dryRun: z.boolean(),
  createMissingUsers: z.boolean(),
  grantMembershipToStubs: z.boolean(),
  projectKeyOverrides: z.record(z.string(), z.string()).default({}),
});

const requestSchema = z.object({
  fileText: z.string().min(1, "Select a Jira export file first").max(MAX_IMPORT_BYTES, "File exceeds the import size limit"),
  filename: z.string().max(255).optional(),
  options: optionsSchema,
});

export type ImportActionResult =
  | { success: true; report: ImportReport }
  | { success: false; error: string };

/**
 * Analyse a Jira export and report exactly what would happen. Writes nothing.
 * Same code path as the real run — see lib/import/run.ts.
 */
export async function previewJiraImportAction(input: unknown): Promise<ImportActionResult> {
  return execute(input, true);
}

/** Analyse and then apply. Idempotent: re-running the same file is safe. */
export async function runJiraImportAction(input: unknown): Promise<ImportActionResult> {
  const result = await execute(input, false);
  if (result.success) {
    revalidatePath("/projects");
    revalidatePath("/settings/import");
    revalidatePath("/your-work");
  }
  return result;
}

async function execute(input: unknown, forceDryRun: boolean): Promise<ImportActionResult> {
  // requireAdmin redirects non-admins, which throws NEXT_REDIRECT. That must
  // propagate, so it sits outside the try block below.
  const { siteId, userId } = await requireAdmin();

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const options = { ...parsed.data.options, dryRun: forceDryRun || parsed.data.options.dryRun };

  let jobId: string | null = null;

  try {
    const source = parseImportFile(parsed.data.fileText);

    jobId = await startImportJob({
      siteId,
      startedById: userId,
      source: source.source,
      filename: parsed.data.filename ?? null,
      dryRun: options.dryRun,
    });

    const plan = planImport({
      source: source.source,
      issues: source.issues,
      rowIssues: source.rowIssues,
      sourceRowCount: source.sourceRowCount,
      projectKeyOverrides: options.projectKeyOverrides,
    });

    if (plan.projects.length === 0) {
      const detail = plan.rowIssues.length
        ? ` ${plan.rowIssues.length} row(s) could not be read — the first says: ${plan.rowIssues[0].message}`
        : "";
      await failImportJob(jobId, "No importable issues");
      return {
        success: false,
        error: `No importable issues were found in this file.${detail}`,
      };
    }

    const report = await runImport({ siteId, importerUserId: userId, plan, options });
    await finishImportJob(jobId, report);
    return { success: true, report };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    await failImportJob(jobId, message);
    // Report the failure rather than throwing it: the caller renders the
    // message inline, per DEVELOPING.md's server-action convention.
    return { success: false, error: message };
  }
}

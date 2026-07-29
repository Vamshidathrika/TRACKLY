"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSearch, Loader2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { previewJiraImportAction, runJiraImportAction } from "./actions";
import type { ImportReport, ImportSummary } from "@/lib/import";

const ACCEPTED = ".json,.csv,application/json,text/csv";

/** Mirrors ImportOptions minus dryRun, which each button decides for itself. */
type Options = {
  createMissingUsers: boolean;
  grantMembershipToStubs: boolean;
  projectKeyOverrides: Record<string, string>;
};

const SUMMARY_ROWS: { key: keyof ImportSummary; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "issues", label: "Issues" },
  { key: "sprints", label: "Sprints" },
  { key: "comments", label: "Comments" },
  { key: "history", label: "History entries" },
  { key: "workLogs", label: "Work logs" },
  { key: "attachments", label: "Attachments" },
  { key: "links", label: "Issue links" },
  { key: "components", label: "Components" },
  { key: "customFields", label: "Custom fields" },
  { key: "users", label: "Users" },
];

export function JiraImportView() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fileText, setFileText] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [options, setOptions] = useState<Options>({
    createMissingUsers: true,
    grantMembershipToStubs: false,
    projectKeyOverrides: {},
  });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewed" | "imported">("idle");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setReport(null);
    setError(null);
    setPhase("idle");
    if (!file) {
      setFileText(null);
      setFilename(null);
      return;
    }
    try {
      setFileText(await file.text());
      setFilename(file.name);
    } catch {
      setFileText(null);
      setFilename(null);
      setError("The file could not be read. Try re-exporting it from Jira.");
    }
  };

  const submit = (dryRun: boolean) => {
    if (!fileText) {
      setError("Select a Jira export file first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const action = dryRun ? previewJiraImportAction : runJiraImportAction;
      const res = await action({
        fileText,
        filename: filename ?? undefined,
        options: { ...options, dryRun },
      });

      if (!res.success) {
        setError(res.error);
        setReport(null);
        return;
      }

      setReport(res.report);
      setPhase(dryRun ? "previewed" : "imported");
      // The import created projects and issues the rest of the app renders
      // from server data, so reconcile rather than trusting local state.
      if (!dryRun) router.refresh();
    });
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackly_jira_import_report_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorCount = report?.rowIssues.filter((r) => r.severity === "error").length ?? 0;
  const warningCount = report?.rowIssues.filter((r) => r.severity === "warning").length ?? 0;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-default">1. Choose a Jira export</h2>
          <p className="text-xs text-subtle">
            Preferred: the JSON response from{" "}
            <code className="rounded bg-neutral px-1 py-0.5 text-[11px]">
              /rest/api/3/search?jql=project=ACME&amp;fields=*all&amp;expand=changelog,renderedFields,names
            </code>
            . Jira&apos;s CSV export also works, but it carries no change history and identifies users by display
            name, so authorship is less accurate.
          </p>
        </div>

        <div className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-default">Jira export file</h3>
              <p className="text-xs text-subtle">{filename ?? "No file selected"}</p>
            </div>
          </div>

          <input
            type="file"
            accept={ACCEPTED}
            onChange={handleFile}
            className="block text-xs text-subtle file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neutral file:text-default hover:file:bg-neutral-hovered cursor-pointer"
          />

          <div className="flex flex-col gap-2 pt-3 border-t border-border-default">
            <label className="flex items-start gap-2 text-xs text-default cursor-pointer">
              <input
                type="checkbox"
                checked={options.createMissingUsers}
                onChange={(e) => setOptions((o) => ({ ...o, createMissingUsers: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="font-bold">Create accounts for unknown Jira users</span>
                <span className="block text-subtle">
                  Matches by email address first. Unmatched people get a placeholder account so their comments and
                  work logs keep the right author. Turn this off and everything they wrote is attributed to you.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-default cursor-pointer">
              <input
                type="checkbox"
                checked={options.grantMembershipToStubs}
                onChange={(e) => setOptions((o) => ({ ...o, grantMembershipToStubs: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  Also give those accounts access to this workspace
                </span>
                <span className="block text-subtle">
                  Off by default. Anyone able to sign in with an email address from the export would gain workspace
                  access without an invite. Leave this off and invite people through Members &amp; Access instead.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border-default">
            <Button
              appearance="default"
              onClick={() => submit(true)}
              disabled={isPending || !fileText}
              className="flex items-center gap-2"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <FileSearch size={15} />}
              <span>Dry run — show me what would happen</span>
            </Button>

            <Button
              appearance="primary"
              onClick={() => submit(false)}
              disabled={isPending || !fileText || phase === "idle"}
              className="flex items-center gap-2"
              title={phase === "idle" ? "Run the dry run first" : undefined}
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              <span>Import for real</span>
            </Button>

            {phase === "idle" && fileText && (
              <span className="text-xs text-subtle">Dry run first — the import button unlocks afterwards.</span>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Import failed</span>
              <span>{error}</span>
            </div>
          </div>
        )}
      </section>

      {report && (
        <section className="flex flex-col gap-4 border-t border-border-default pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-default">
                {report.dryRun ? "2. Dry run results — nothing was written" : "2. Import complete"}
              </h2>
              <p className="text-xs text-subtle">
                {report.source === "JIRA_CSV" ? "Jira CSV export" : "Jira REST JSON export"} ·{" "}
                {report.sourceRowCount} row(s) read · {report.plannedIssueCount} issue(s) importable
              </p>
            </div>
            <Button appearance="subtle" onClick={downloadReport} className="flex items-center gap-1.5 shrink-0">
              <Download size={14} />
              <span>Download report</span>
            </Button>
          </div>

          {phase === "imported" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              <span>
                Import finished. Re-running the same file is safe — it updates the same issues instead of duplicating
                them.
              </span>
            </div>
          )}

          <SummaryTable summary={report.summary} dryRun={report.dryRun} />

          {report.projects.length > 0 && (
            <Panel title="Projects">
              <ul className="flex flex-col gap-1 text-xs text-default">
                {report.projects.map((p) => (
                  <li key={p.jiraProjectKey} className="flex items-center gap-2">
                    <code className="rounded bg-neutral px-1.5 py-0.5 font-mono text-[11px]">{p.jiraProjectKey}</code>
                    <span className="text-subtle">→</span>
                    <code className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[11px] text-brand">
                      {p.tracklyKey}
                    </code>
                    <span className="text-subtle">{p.issueCount} issue(s)</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {report.warnings.length > 0 && (
            <Panel title={`Things to know (${report.warnings.length})`} tone="warning">
              <ul className="flex flex-col gap-1.5 text-xs">
                {report.warnings.map((w) => (
                  <li key={w.code} className="flex items-start gap-2">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {report.unmapped.length > 0 && (
            <Panel title={`Values with no Trackly equivalent (${report.unmapped.length})`} tone="warning">
              <table className="w-full text-xs">
                <thead className="text-subtle">
                  <tr className="text-left">
                    <th className="pb-1 font-medium">Kind</th>
                    <th className="pb-1 font-medium">Jira value</th>
                    <th className="pb-1 font-medium">Imported as</th>
                    <th className="pb-1 font-medium text-right">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unmapped.map((u) => (
                    <tr key={`${u.kind}-${u.sourceValue}`} className="border-t border-border-default/60">
                      <td className="py-1 text-subtle">{u.kind}</td>
                      <td className="py-1 font-medium">{u.sourceValue}</td>
                      <td className="py-1 font-mono text-[11px]">{u.fallback}</td>
                      <td className="py-1 text-right tabular-nums">{u.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {report.users.length > 0 && (
            <Panel title={`Users (${report.users.length})`}>
              <div className="flex items-center gap-2 pb-2 text-xs text-subtle">
                <Users size={13} />
                <span>Placeholder addresses end in @imported.invalid and can never receive mail.</span>
              </div>
              <table className="w-full text-xs">
                <thead className="text-subtle">
                  <tr className="text-left">
                    <th className="pb-1 font-medium">Jira user</th>
                    <th className="pb-1 font-medium">Trackly account</th>
                    <th className="pb-1 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {report.users.map((u) => (
                    <tr key={`${u.displayName}-${u.tracklyEmail}`} className="border-t border-border-default/60">
                      <td className="py-1 font-medium">{u.displayName}</td>
                      <td className="py-1 font-mono text-[11px] text-subtle">{u.tracklyEmail ?? "—"}</td>
                      <td className="py-1">{u.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {report.rowIssues.length > 0 && (
            <Panel
              title={`Per-row report — ${errorCount} error(s), ${warningCount} warning(s)`}
              tone={errorCount > 0 ? "danger" : "warning"}
            >
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-subtle sticky top-0 bg-surface">
                    <tr className="text-left">
                      <th className="pb-1 font-medium w-14">Row</th>
                      <th className="pb-1 font-medium w-24">Issue</th>
                      <th className="pb-1 font-medium w-20">Field</th>
                      <th className="pb-1 font-medium">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rowIssues.map((r, i) => (
                      <tr key={`${r.row}-${r.jiraKey}-${i}`} className="border-t border-border-default/60 align-top">
                        <td className="py-1 tabular-nums text-subtle">{r.row || "—"}</td>
                        <td className="py-1 font-mono text-[11px]">{r.jiraKey ?? "—"}</td>
                        <td className="py-1 text-subtle">{r.field ?? "—"}</td>
                        <td
                          className={`py-1 ${r.severity === "error" ? "text-rose-700 dark:text-rose-400" : "text-default"}`}
                        >
                          {r.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryTable({ summary, dryRun }: { summary: ImportSummary; dryRun: boolean }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-4 shadow-xs">
      <table className="w-full text-xs">
        <thead className="text-subtle">
          <tr className="text-left">
            <th className="pb-1.5 font-medium">Entity</th>
            <th className="pb-1.5 font-medium text-right">{dryRun ? "Would create" : "Created"}</th>
            <th className="pb-1.5 font-medium text-right">{dryRun ? "Would update" : "Updated"}</th>
            <th className="pb-1.5 font-medium text-right">Unchanged</th>
          </tr>
        </thead>
        <tbody>
          {SUMMARY_ROWS.map(({ key, label }) => {
            const counts = summary[key];
            if (counts.created === 0 && counts.updated === 0 && counts.skipped === 0) return null;
            return (
              <tr key={key} className="border-t border-border-default/60">
                <td className="py-1 font-medium text-default">{label}</td>
                <td className="py-1 text-right tabular-nums text-emerald-600">{counts.created || "—"}</td>
                <td className="py-1 text-right tabular-nums text-brand">{counts.updated || "—"}</td>
                <td className="py-1 text-right tabular-nums text-subtle">{counts.skipped || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Panel({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: "neutral" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-500/30 bg-rose-500/5"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-border-default bg-surface";

  return (
    <div className={`rounded-xl border p-4 shadow-xs ${toneClass}`}>
      <h3 className="text-sm font-bold text-default mb-2">{title}</h3>
      {children}
    </div>
  );
}

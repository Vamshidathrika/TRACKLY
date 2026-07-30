"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Upload, Database, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportWorkspaceDataAction } from "@/app/(app)/settings/export/actions";

export function WorkspaceExportView({ siteName }: { siteName: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setExportComplete(false);

    const res = await exportWorkspaceDataAction();
    setIsExporting(false);

    if (res.success && res.backupData) {
      const jsonStr = JSON.stringify(res.backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trackly_backup_${siteName.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 4000);
    } else {
      alert(`Export failed: ${res.error}`);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* SECTION 1: EXPORT */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-default">Workspace Data Export & Full Backup</h2>
          <p className="text-xs text-subtle">
            Generate a full JSON data snapshot containing all projects, Kanban issues, custom fields, members, and automation rules.
          </p>
        </div>

        <div className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold shadow-2xs">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-default">{siteName} Data Snapshot</h3>
              <p className="text-xs text-subtle">Includes issues, history, comments, projects, sprint boards, and webhooks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border-default">
            <Button
              appearance="primary"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{isExporting ? "Compiling Backup..." : "Export Full Workspace JSON"}</span>
            </Button>

            {exportComplete && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={16} /> Backup downloaded successfully!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: IMPORT */}
      <div className="flex flex-col gap-4 border-t border-border-default pt-6">
        <div>
          <h2 className="text-base font-bold text-default">Import from Jira</h2>
          <p className="text-xs text-subtle">Bring in projects, issues, comments and work logs from a Jira Cloud export</p>
        </div>

        <Link
          href="/settings/import"
          className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex items-center gap-4 hover:border-brand/40 hover:bg-neutral/40 transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 font-bold shadow-2xs shrink-0">
            <Upload size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-default">Import from Jira (JSON or CSV)</h3>
            <p className="text-xs text-subtle">Dry-run preview, per-row error report, then a real run</p>
          </div>
          <ArrowRight size={16} className="text-subtle group-hover:text-brand transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}

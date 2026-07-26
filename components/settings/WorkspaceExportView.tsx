"use client";

import { useState } from "react";
import { Download, Upload, ShieldCheck, Database, FileText, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportWorkspaceDataAction, importWorkspaceDataAction } from "@/app/(app)/settings/export/actions";

export function WorkspaceExportView({ siteName }: { siteName: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; summary?: string; error?: string } | null>(null);

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

  const handleValidateImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsValidating(true);
    setValidationResult(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setParsedData(json);
        setIsValidating(false);
        if (json.version || json.exportedAt || json.entityCounts || json.projects) {
          setValidationResult({
            valid: true,
            summary: `Valid backup file! Contains ${json.entityCounts?.issues || json.issues?.length || 0} issues, ${json.entityCounts?.projects || json.projects?.length || 0} projects, and ${json.entityCounts?.members || json.members?.length || 0} members. Ready to restore.`,
          });
        } else {
          setValidationResult({
            valid: false,
            error: "File lacks valid Trackly schema metadata.",
          });
        }
      } catch {
        setIsValidating(false);
        setValidationResult({
          valid: false,
          error: "Invalid JSON syntax. Please select a valid Trackly or Jira backup file.",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedData || !validationResult?.valid) return;
    setIsRestoring(true);
    const res = await importWorkspaceDataAction(parsedData);
    setIsRestoring(false);
    if (res.success) {
      setRestoreSuccess(true);
    } else {
      alert(`Restore failed: ${res.error}`);
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
          <h2 className="text-base font-bold text-default">Import Jira / Trackly Backup</h2>
          <p className="text-xs text-subtle">Restore workspace items or import data from Jira Cloud export files</p>
        </div>

        <div className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 font-bold shadow-2xs">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-default">Restore Backup JSON File</h3>
              <p className="text-xs text-subtle">Select a `.json` backup file to perform schema dry-run validation before importing</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-border-default">
            <input
              type="file"
              accept=".json"
              onChange={handleValidateImport}
              className="block text-xs text-subtle file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neutral file:text-default hover:file:bg-neutral-hovered cursor-pointer"
            />

            {isValidating && (
              <p className="text-xs font-bold text-brand flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Validating backup file schema...
              </p>
            )}

            {validationResult && (
              <div className="flex flex-col gap-2">
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    validationResult.valid
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {validationResult.valid ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                  <div>
                    <span className="font-bold block">
                      {validationResult.valid ? "Validation Succeeded" : "Validation Failed"}
                    </span>
                    <span>{validationResult.summary || validationResult.error}</span>
                  </div>
                </div>

                {validationResult.valid && (
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      appearance="primary"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                      className="flex items-center gap-2 text-xs"
                    >
                      {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{isRestoring ? "Restoring Workspace Data..." : "Restore / Import Workspace Data"}</span>
                    </Button>
                    {restoreSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Workspace data restored successfully!
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

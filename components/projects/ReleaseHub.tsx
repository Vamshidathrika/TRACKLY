"use client";

import { useState } from "react";
import { Package, Plus, CheckCircle2, Clock, Copy, Check, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ReleaseVersion = {
  id: string;
  name: string; // e.g. "v1.0.0"
  description?: string;
  status: "UNRELEASED" | "RELEASED" | "ARCHIVED";
  releaseDate?: string;
  completedIssues: number;
  totalIssues: number;
  notesMarkdown?: string;
};

export function ReleaseHub({
  projectKey,
  initialReleases = [],
}: {
  projectKey: string;
  initialReleases?: ReleaseVersion[];
}) {
  const [releases, setReleases] = useState<ReleaseVersion[]>(
    initialReleases.length > 0
      ? initialReleases
      : [
          {
            id: "rel-1",
            name: "v1.0.0 - Initial Launch",
            description: "Production MVP release with Kanban, JQL search, and Teams CRUD",
            status: "RELEASED",
            releaseDate: "2026-07-24",
            completedIssues: 12,
            totalIssues: 12,
            notesMarkdown: `## 🚀 Release v1.0.0 Notes\n\n### New Features\n- 🎨 **Multi-Dimensional Swimlanes**: Assignee & Priority board grouping.\n- 🔍 **Visual JQL Builder**: Interactive filter drawer with workspace sharing.\n- 👥 **Teams Management**: Workload capacity indicators and member CRUD.\n\n### Fixes & Improvements\n- 🛡️ **Tenant Security Isolation**: Workspace-scoped permissions and auto-healing access.`,
          },
          {
            id: "rel-2",
            name: "v1.1.0 - Superpowers Edition",
            description: "Automated Release Hub, Sprint Retrospective Suite, and AI Query Copilot",
            status: "UNRELEASED",
            releaseDate: "2026-08-01",
            completedIssues: 5,
            totalIssues: 8,
            notesMarkdown: `## 🚀 Release v1.1.0 Notes (Draft)\n\n### New Features\n- 📦 **Release Versioning Hub**: Version progress tracking and 1-click Markdown release notes.\n- ❇️ **Sprint Retrospective Board**: 3-column retro suite with 1-click issue conversion.`,
          },
        ]
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");
  const [activeNotes, setActiveNotes] = useState<ReleaseVersion | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateVersion = () => {
    if (!newVersionName.trim()) return;
    const newRel: ReleaseVersion = {
      id: `rel-${Date.now()}`,
      name: newVersionName.trim(),
      description: newVersionDesc.trim() || undefined,
      status: "UNRELEASED",
      releaseDate: new Date().toISOString().split("T")[0],
      completedIssues: 0,
      totalIssues: 0,
      notesMarkdown: `## 🚀 Release ${newVersionName.trim()} Notes\n\n### New Features\n- Initial feature work under development.`,
    };
    setReleases((prev) => [newRel, ...prev]);
    setNewVersionName("");
    setNewVersionDesc("");
    setShowCreateModal(false);
  };

  const handleCopyNotes = (rel: ReleaseVersion) => {
    if (!rel.notesMarkdown) return;
    navigator.clipboard.writeText(rel.notesMarkdown);
    setCopiedId(rel.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex flex-1 flex-col p-6 max-w-6xl mx-auto w-full gap-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border-default pb-4">
        <div>
          <h1 className="text-xl font-bold text-default flex items-center gap-2">
            <Package className="h-6 w-6 text-brand" />
            <span>Releases & Versioning</span>
          </h1>
          <p className="text-xs text-subtle mt-0.5">
            Manage release versions, track fixVersion progress, and generate release notes for {projectKey}.
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 text-xs">
          <Plus size={14} />
          <span>New Version</span>
        </Button>
      </div>

      {/* Version Cards Grid */}
      {releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border-default bg-surface text-center gap-3">
          <Package className="h-10 w-10 text-subtle" />
          <div>
            <h3 className="font-bold text-default text-base">No Release Versions Yet</h3>
            <p className="text-xs text-subtle mt-1">Create your first version tag (e.g. v1.0.0) to track progress and generate release notes.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="text-xs mt-2">
            Create Version
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {releases.map((rel) => {
          const pct = rel.totalIssues > 0 ? Math.round((rel.completedIssues / rel.totalIssues) * 100) : 0;
          return (
            <div
              key={rel.id}
              className="flex flex-col rounded-xl border border-border-default bg-surface p-5 shadow-xs hover:shadow-md transition-all gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-default text-base">{rel.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rel.status === "RELEASED"
                          ? "bg-success/15 text-success"
                          : rel.status === "UNRELEASED"
                          ? "bg-brand/15 text-brand"
                          : "bg-neutral text-subtle"
                      }`}
                    >
                      {rel.status}
                    </span>
                  </div>
                  {rel.description && <p className="text-xs text-subtle mt-1">{rel.description}</p>}
                </div>

                <div className="flex items-center gap-1 text-xs text-subtle font-mono">
                  <Calendar size={13} />
                  <span>{rel.releaseDate || "No date"}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-subtle">
                  <span>Progress ({pct}%)</span>
                  <span>
                    {rel.completedIssues} of {rel.totalIssues} issues completed
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rel.status === "RELEASED" ? "bg-success" : "bg-brand"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setActiveNotes(rel)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <FileText size={13} />
                  <span>View Release Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyNotes(rel)}
                  className="flex items-center gap-1 text-xs font-semibold text-subtle hover:text-default transition-colors"
                >
                  {copiedId === rel.id ? (
                    <>
                      <Check size={13} className="text-success" />
                      <span className="text-success font-bold">Copied Markdown!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Notes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex flex-col w-full max-w-md rounded-2xl bg-surface border border-border-default p-6 shadow-2xl gap-4">
            <h2 className="text-lg font-bold text-default">Create Release Version</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-subtle uppercase">Version Name</label>
                <input
                  type="text"
                  placeholder="e.g. v1.2.0 - Sprint 4 Release"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-default bg-surface p-2.5 text-xs outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-subtle uppercase">Description</label>
                <textarea
                  placeholder="Brief summary of version scope..."
                  value={newVersionDesc}
                  onChange={(e) => setNewVersionDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border-default bg-surface p-2.5 text-xs outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-subtle hover:bg-neutral"
              >
                Cancel
              </button>
              <Button onClick={handleCreateVersion} className="text-xs">
                Create Version
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Release Notes Modal */}
      {activeNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex flex-col w-full max-w-2xl rounded-2xl bg-surface border border-border-default p-6 shadow-2xl gap-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h2 className="text-lg font-bold text-default">{activeNotes.name} - Release Notes</h2>
              <button
                type="button"
                onClick={() => setActiveNotes(null)}
                className="text-subtle hover:text-default font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-neutral/40 rounded-xl p-4 font-mono text-xs text-default whitespace-pre-wrap max-h-96 overflow-y-auto">
              {activeNotes.notesMarkdown}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleCopyNotes(activeNotes)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20"
              >
                <Copy size={13} />
                <span>Copy Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveNotes(null)}
                className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hovered"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

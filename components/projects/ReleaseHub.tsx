"use client";

import { useState, useEffect, useTransition } from "react";
import { Package, Plus, CheckCircle2, Copy, Check, FileText, Calendar, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectRepoModal } from "@/components/dev/ConnectRepoModal";
import { fetchDevDashboardDataAction } from "@/app/(app)/projects/[key]/dev/actions";
import { createReleaseAction, getReleasesAction, updateReleaseNotesAction } from "@/app/(app)/projects/[key]/releases/actions";

export type ReleaseVersion = {
  id: string;
  name: string; // e.g. "v1.0.0"
  description?: string | null;
  status: "UNRELEASED" | "RELEASED" | "ARCHIVED";
  releaseDate?: string | null;
  completedIssues: number;
  totalIssues: number;
  notesMarkdown?: string | null;
};

/**
 * Real Release rows (see lib/releases.ts), not localStorage. completedIssues
 * and totalIssues come from real Issue.releaseId links and are recomputed by
 * the server on every fetch — they can't drift the way a hand-typed count
 * used to. "AI Generate Notes" was removed: no generation backend exists for
 * it, so it was fabricating markdown on a click.
 */
export function ReleaseHub({
  projectId = "demo-proj",
  projectKey,
  initialReleases = [],
}: {
  projectId?: string;
  projectKey: string;
  initialReleases?: ReleaseVersion[];
}) {
  const hasRealProject = !projectId.startsWith("demo-");
  const [, startTransition] = useTransition();
  const [hasConnectedRepo, setHasConnectedRepo] = useState(false);

  useEffect(() => {
    if (!hasRealProject) return;
    fetchDevDashboardDataAction(projectId).then((res) => {
      setHasConnectedRepo(res?.hasConnectedRepo ?? false);
    });
  }, [projectId]);

  const [releases, setReleases] = useState<ReleaseVersion[]>(initialReleases);

  const refreshReleases = async () => {
    if (!hasRealProject) return;
    const res = await getReleasesAction(projectId);
    if (res.success) setReleases(res.releases as ReleaseVersion[]);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");
  const [activeNotes, setActiveNotes] = useState<ReleaseVersion | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openNotes = (rel: ReleaseVersion) => {
    setActiveNotes(rel);
    setNotesDraft(rel.notesMarkdown || "");
  };

  const handleSaveNotes = () => {
    if (!activeNotes) return;
    const updated = { ...activeNotes, notesMarkdown: notesDraft };
    setReleases((prev) => prev.map((r) => (r.id === activeNotes.id ? updated : r)));
    setActiveNotes(updated);
    if (!hasRealProject || activeNotes.id.startsWith("pending-")) return;
    startTransition(async () => {
      await updateReleaseNotesAction(activeNotes.id, notesDraft);
    });
  };

  const handleCreateVersion = () => {
    const name = newVersionName.trim();
    if (!name) return;
    const description = newVersionDesc.trim() || undefined;
    setNewVersionName("");
    setNewVersionDesc("");
    setShowCreateModal(false);

    const optimisticId = `pending-${Date.now()}`;
    setReleases((prev) => [
      { id: optimisticId, name, description, status: "UNRELEASED", completedIssues: 0, totalIssues: 0 },
      ...prev,
    ]);

    if (!hasRealProject) return;
    startTransition(async () => {
      const res = await createReleaseAction(projectId, name, description);
      if (res?.error) {
        setReleases((prev) => prev.filter((r) => r.id !== optimisticId));
        return;
      }
      await refreshReleases();
    });
  };

  const handleCopyNotes = (rel: ReleaseVersion) => {
    if (!rel.notesMarkdown) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(rel.notesMarkdown);
    }
    setCopiedId(rel.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex flex-1 flex-col p-6 max-w-6xl mx-auto w-full gap-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-default flex items-center gap-2">
              <Package className="h-6 w-6 text-brand" />
              <span>Releases & Versioning</span>
            </h1>
            {hasConnectedRepo ? (
              <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> ● GitHub Sync Active
              </span>
            ) : (
              <ConnectRepoModal
                projectId={projectId}
                onSuccess={() => setHasConnectedRepo(true)}
                trigger={
                  <button className="text-[11px] font-extrabold font-mono px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer">
                    <FolderGit2 size={13} /> + Connect Repository
                  </button>
                }
              />
            )}
          </div>
          <p className="text-xs text-subtle mt-0.5">
            Manage release versions and track fixVersion progress for {projectKey}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasConnectedRepo && (
            <ConnectRepoModal
              projectId={projectId}
              onSuccess={() => setHasConnectedRepo(true)}
              trigger={
                <button className="px-3 py-1.5 rounded-full border border-border bg-neutral/40 hover:bg-neutral text-xs font-bold text-text flex items-center gap-1.5 cursor-pointer transition-all">
                  <FolderGit2 size={14} className="text-brand" />
                  <span>Connect Repo</span>
                </button>
              }
            />
          )}
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 text-xs">
            <Plus size={14} />
            <span>New Version</span>
          </Button>
        </div>
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
                      {rel.completedIssues} of {rel.totalIssues} issues done
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
                <div className="flex items-center justify-between pt-2 border-t border-border-default flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openNotes(rel)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    <FileText size={13} />
                    <span>View Release Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyNotes(rel)}
                    className="flex items-center gap-1 text-xs font-semibold text-subtle hover:text-default transition-colors ml-auto"
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

            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write release notes in Markdown..."
              rows={10}
              className="bg-neutral/40 rounded-xl p-4 font-mono text-xs text-default whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed outline-none focus:ring-1 focus:ring-brand resize-none"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleCopyNotes(activeNotes)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20"
              >
                <Copy size={13} />
                <span>Copy Markdown</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveNotes(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-subtle hover:bg-neutral"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => {
                    handleSaveNotes();
                    setActiveNotes(null);
                  }}
                  className="text-xs"
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

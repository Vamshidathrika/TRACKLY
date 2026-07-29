"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, X, Sparkles, FolderDown, CalendarPlus, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { completeSprintAction } from "@/app/(app)/projects/[key]/backlog/actions";

interface SprintSummaryData {
  id: string;
  name: string;
  projectId: string;
  projectKey: string;
  issues: Array<{
    id: string;
    status: string;
    storyPoints?: number | null;
  }>;
  availableTargetSprints?: Array<{ id: string; name: string }>;
}

interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: SprintSummaryData;
  onCompleted?: () => void;
  onOpenRetro?: () => void;
}

export function CompleteSprintModal({
  isOpen,
  onClose,
  sprint,
  onCompleted,
  onOpenRetro,
}: CompleteSprintModalProps) {
  const [destination, setDestination] = useState<"BACKLOG" | "NEXT_SPRINT" | "NEW_SPRINT">("BACKLOG");
  const [selectedTargetSprintId, setSelectedTargetSprintId] = useState<string>(
    sprint.availableTargetSprints?.[0]?.id || ""
  );
  const [newSprintName, setNewSprintName] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const completedIssues = sprint.issues.filter((i) => i.status === "DONE");
  const incompleteIssues = sprint.issues.filter((i) => i.status !== "DONE");

  const completedPoints = completedIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
  const incompletePoints = incompleteIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeSprintAction(sprint.id, {
        destination,
        targetSprintId: destination === "NEXT_SPRINT" ? selectedTargetSprintId : undefined,
        newSprintName: destination === "NEW_SPRINT" && newSprintName ? newSprintName : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsSuccess(true);
        if (onCompleted) onCompleted();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Complete {sprint.name}</h3>
                <p className="text-xs text-slate-400">Wrap up sprint activities and route remaining tasks.</p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Stats Breakdown */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{completedIssues.length} Completed</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{completedPoints} Story Points finished</p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold text-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{incompleteIssues.length} Open</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{incompletePoints} Story Points remaining</p>
              </div>
            </div>

            {/* Incomplete Issues Routing */}
            {incompleteIssues.length > 0 && (
              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Where should incomplete tasks go?
                </label>
                <div className="space-y-2">
                  {/* Option 1: Backlog */}
                  <label
                    onClick={() => setDestination("BACKLOG")}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                      destination === "BACKLOG"
                        ? "border-indigo-500/50 bg-indigo-500/10 text-slate-100"
                        : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FolderDown className="h-4 w-4 text-indigo-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Move to Backlog</div>
                        <div className="text-xs text-slate-400">Return open items to project backlog pool</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "BACKLOG"}
                      onChange={() => setDestination("BACKLOG")}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  {/* Option 2: Next Sprint (if available) */}
                  {sprint.availableTargetSprints && sprint.availableTargetSprints.length > 0 && (
                    <label
                      onClick={() => setDestination("NEXT_SPRINT")}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                        destination === "NEXT_SPRINT"
                          ? "border-indigo-500/50 bg-indigo-500/10 text-slate-100"
                          : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-indigo-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-200">Move to Next Planned Sprint</div>
                          <div className="text-xs text-slate-400">Attach open items to next upcoming sprint</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="destination"
                        checked={destination === "NEXT_SPRINT"}
                        onChange={() => setDestination("NEXT_SPRINT")}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  )}

                  {/* Dropdown for Next Sprint */}
                  {destination === "NEXT_SPRINT" && sprint.availableTargetSprints && (
                    <div className="pl-7 pt-1">
                      <select
                        value={selectedTargetSprintId}
                        onChange={(e) => setSelectedTargetSprintId(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {sprint.availableTargetSprints.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Option 3: Create New Sprint */}
                  <label
                    onClick={() => setDestination("NEW_SPRINT")}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                      destination === "NEW_SPRINT"
                        ? "border-indigo-500/50 bg-indigo-500/10 text-slate-100"
                        : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarPlus className="h-4 w-4 text-indigo-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Create New Sprint</div>
                        <div className="text-xs text-slate-400">Automatically spin up new planned sprint</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "NEW_SPRINT"}
                      onChange={() => setDestination("NEW_SPRINT")}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  {/* Input for New Sprint Name */}
                  {destination === "NEW_SPRINT" && (
                    <div className="pl-7 pt-1">
                      <input
                        type="text"
                        placeholder="New Sprint Name (Optional)"
                        value={newSprintName}
                        onChange={(e) => setNewSprintName(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-4">
              <Button appearance="subtle" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleComplete} disabled={isPending}>
                {isPending ? "Completing..." : `Complete ${sprint.name}`}
              </Button>
            </div>
          </>
        ) : (
          /* Success Screen with Retrospective Handoff */
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-100">{sprint.name} Completed!</h3>
            <p className="mt-1 text-xs text-slate-400">
              {completedIssues.length} issues finished ({completedPoints} pts). Incomplete tasks have been routed successfully.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button appearance="default" onClick={onClose}>
                Close
              </Button>
              {onOpenRetro && (
                <Button
                  appearance="primary"
                  onClick={() => {
                    onClose();
                    onOpenRetro();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <span>Open Retrospective</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

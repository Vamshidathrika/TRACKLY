"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { createSubtaskAction } from "@/app/(app)/issues/actions";

export type SubtaskItem = {
  id: string;
  key: string;
  summary: string;
  status: string;
};

export function SubtaskList({
  parentIssueId,
  projectId,
  subtasks: initialSubtasks,
  onUpdate,
}: {
  parentIssueId: string;
  projectId: string;
  subtasks: SubtaskItem[];
  onUpdate?: () => void;
}) {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(initialSubtasks);
  const [newSummary, setNewSummary] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const completedCount = subtasks.filter((s) => s.status === "DONE").length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSummary.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createSubtaskAction({
        parentIssueId,
        projectId,
        summary: newSummary.trim(),
      });
      const newItem: SubtaskItem = {
        id: created.id,
        key: created.key,
        summary: created.summary,
        status: created.status,
      };
      setSubtasks((prev) => [...prev, newItem]);
      setNewSummary("");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mt-6 rounded-md border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-default flex items-center gap-2">
          Subtasks
          <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-subtle font-normal">
            {completedCount}/{subtasks.length}
          </span>
        </h4>
        {subtasks.length > 0 && (
          <span className="text-xs text-subtles font-medium">{progressPercent}% complete</span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-neutral">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="space-y-2 mb-3">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center justify-between rounded-ds border border-border-default bg-surface-raised px-3 py-2 text-sm hover:bg-neutral-hovered transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {st.status === "DONE" ? (
                <CheckCircle2 size={16} className="text-success shrink-0" />
              ) : (
                <Circle size={16} className="text-subtlest shrink-0" />
              )}
              <span className="font-mono text-xs font-semibold text-brand shrink-0">{st.key}</span>
              <span className={`truncate text-default ${st.status === "DONE" ? "line-through text-subtlest" : ""}`}>
                {st.summary}
              </span>
            </div>
            <span className="rounded bg-neutral px-2 py-0.5 text-[11px] font-medium text-subtle uppercase tracking-wider shrink-0">
              {st.status.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a subtask..."
          value={newSummary}
          onChange={(e) => setNewSummary(e.target.value)}
          className="flex-1 rounded-ds border border-border-default bg-surface px-3 py-1.5 text-sm text-default outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!newSummary.trim() || isCreating}
          className="flex items-center gap-1 rounded-ds bg-neutral px-3 py-1.5 text-sm font-medium text-default hover:bg-neutral-hovered disabled:opacity-50"
        >
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  );
}

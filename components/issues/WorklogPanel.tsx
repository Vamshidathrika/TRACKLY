"use client";

import { useState } from "react";
import { Clock, Plus } from "lucide-react";
import { logWorkAction } from "@/app/(app)/issues/actions";

export type WorklogItem = {
  id: string;
  hours: number;
  description: string | null;
  createdAt: Date | string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

export function WorklogPanel({
  issueId,
  originalEstimate,
  workLogs: initialWorklogs,
}: {
  issueId: string;
  originalEstimate?: number | null;
  workLogs: WorklogItem[];
}) {
  const [workLogs, setWorkLogs] = useState<WorklogItem[]>(initialWorklogs);
  const [showModal, setShowModal] = useState(false);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const totalLogged = workLogs.reduce((acc, w) => acc + w.hours, 0);
  const estimate = originalEstimate || 0;
  const remaining = Math.max(0, estimate - totalLogged);
  const progressPercent = estimate > 0 ? Math.min(100, Math.round((totalLogged / estimate) * 100)) : 0;

  async function handleLogWork(e: React.FormEvent) {
    e.preventDefault();
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || isLogging) return;
    setIsLogging(true);
    try {
      const created = await logWorkAction({
        issueId,
        hours: h,
        description: description.trim() || undefined,
      });
      const newLog: WorklogItem = {
        id: created.id,
        hours: created.hours,
        description: created.description,
        createdAt: created.createdAt,
        author: { id: created.authorId, name: "You", avatarUrl: null },
      };
      setWorkLogs((prev) => [newLog, ...prev]);
      setHours("");
      setDescription("");
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <div className="mt-6 rounded-md border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-default flex items-center gap-2">
          <Clock size={16} className="text-subtle" />
          Time Tracking & Worklog
        </h4>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 rounded-ds bg-neutral px-2.5 py-1 text-xs font-medium text-default hover:bg-neutral-hovered"
        >
          <Plus size={13} /> Log Work
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 rounded-md border border-border-default bg-surface-raised p-3 text-center">
        <div>
          <span className="block text-[11px] font-semibold text-subtlest uppercase">Logged</span>
          <span className="text-sm font-bold text-default">{totalLogged}h</span>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-subtlest uppercase">Remaining</span>
          <span className="text-sm font-bold text-default">{estimate > 0 ? `${remaining}h` : "N/A"}</span>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-subtlest uppercase">Original Est.</span>
          <span className="text-sm font-bold text-default">{estimate > 0 ? `${estimate}h` : "Unset"}</span>
        </div>
      </div>

      {estimate > 0 && (
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-neutral">
          <div
            className={`h-full transition-all duration-300 ${
              totalLogged > estimate ? "bg-danger" : "bg-success"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {workLogs.length > 0 ? (
        <div className="space-y-2">
          {workLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-ds border border-border-default bg-surface-raised px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-default">{log.author.name}</span>
                <span className="text-subtlest font-mono">logged {log.hours}h</span>
                {log.description && (
                  <span className="text-subtle italic truncate max-w-64">"{log.description}"</span>
                )}
              </div>
              <span className="text-subtlest text-[11px]">
                {new Date(log.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-subtles italic">No work logged yet.</p>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border-default bg-surface p-5 shadow-lg">
            <h3 className="text-base font-semibold text-default mb-4">Log Work</h3>
            <form onSubmit={handleLogWork} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-subtle mb-1">Time Spent (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  placeholder="e.g. 2.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full rounded-ds border border-border-default bg-surface px-3 py-1.5 text-sm text-default outline-none focus:border-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-subtle mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="What work did you accomplish?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-ds border border-border-default bg-surface px-3 py-1.5 text-sm text-default outline-none focus:border-brand"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-ds px-3 py-1.5 text-sm font-medium text-subtle hover:bg-neutral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hours || isLogging}
                  className="rounded-ds bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hovered disabled:opacity-50"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

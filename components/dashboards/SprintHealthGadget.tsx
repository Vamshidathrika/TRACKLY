"use client";

import { Sparkles, Clock } from "lucide-react";

export type SprintHealthData = {
  sprintNames: string[];
  daysRemaining: number | null;
  totalPoints: number;
  donePoints: number;
  inProgressPoints: number;
  toDoPoints: number;
};

/**
 * Renders the real active sprint(s) computed by the dashboard page from
 * Sprint + Issue rows. This used to be a single hardcoded sprint
 * ("Sprint 14 — No-Code Automation & Superpowers") shown regardless of
 * whether any sprint was actually running.
 */
export function SprintHealthGadget({ data }: { data: SprintHealthData }) {
  const { sprintNames, daysRemaining, totalPoints, donePoints, inProgressPoints, toDoPoints } = data;

  if (sprintNames.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-purple-500" />
          <h3 className="text-sm font-bold text-default">Active Sprint Health & Velocity</h3>
        </div>
        <p className="text-xs text-subtle italic py-4 text-center">No active sprint right now.</p>
      </div>
    );
  }

  const progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-purple-500" />
          <h3 className="text-sm font-bold text-default">Active Sprint Health & Velocity</h3>
        </div>
        {daysRemaining !== null && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <Clock size={11} /> {Math.max(0, daysRemaining)} Days Left
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-default">{sprintNames.join(", ")}</h4>
        <span className="text-[11px] text-subtle font-mono">
          {donePoints} of {totalPoints} Story Points Completed ({progressPercent}%)
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-full rounded-full bg-neutral/50 flex overflow-hidden p-0.5 gap-0.5">
          {totalPoints > 0 && (
            <>
              <div style={{ width: `${(donePoints / totalPoints) * 100}%` }} className="h-full bg-emerald-500 rounded-full" title="Done" />
              <div style={{ width: `${(inProgressPoints / totalPoints) * 100}%` }} className="h-full bg-blue-500 rounded-full" title="In Progress" />
              <div style={{ width: `${(toDoPoints / totalPoints) * 100}%` }} className="h-full bg-neutral-400 rounded-full" title="To Do" />
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 block">{donePoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">Done</span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="font-bold text-blue-600 block">{inProgressPoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">In Progress</span>
          </div>
          <div className="p-2 rounded-lg bg-neutral border border-border-default">
            <span className="font-bold text-default block">{toDoPoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">To Do</span>
          </div>
        </div>
      </div>
    </div>
  );
}

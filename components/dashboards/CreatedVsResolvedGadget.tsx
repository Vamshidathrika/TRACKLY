"use client";

import { TrendingUp } from "lucide-react";

export type CreatedVsResolvedPoint = { label: string; created: number; resolved: number };

/**
 * Renders the real last-7-days created/resolved counts computed by the
 * dashboard page from Issue.createdAt and IssueHistory status transitions.
 * This used to be a fixed Mon-Sun array of invented numbers, shown
 * identically no matter what day it was or what had actually happened.
 */
export function CreatedVsResolvedGadget({ points }: { points: CreatedVsResolvedPoint[] }) {
  const totalCreated = points.reduce((acc, curr) => acc + curr.created, 0);
  const totalResolved = points.reduce((acc, curr) => acc + curr.resolved, 0);
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.created, p.resolved)));

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={17} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-default">Created vs. Resolved (Last 7 Days)</h3>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-bold border-b border-border-default pb-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-rose-500" />
          <span className="text-default">Created ({totalCreated})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-default">Resolved ({totalResolved})</span>
        </div>
      </div>

      {totalCreated === 0 && totalResolved === 0 ? (
        <p className="text-xs text-subtle italic py-4 text-center">No activity in the last 7 days.</p>
      ) : (
        <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
          {points.map((pt) => (
            <div key={pt.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex items-end gap-1 w-full justify-center h-full">
                <div
                  style={{ height: `${(pt.created / maxValue) * 100}%` }}
                  className="w-2.5 bg-rose-500 rounded-t-sm transition-all duration-300"
                  title={`Created on ${pt.label}: ${pt.created}`}
                />
                <div
                  style={{ height: `${(pt.resolved / maxValue) * 100}%` }}
                  className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300"
                  title={`Resolved on ${pt.label}: ${pt.resolved}`}
                />
              </div>
              <span className="text-[10px] font-mono text-subtle">{pt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

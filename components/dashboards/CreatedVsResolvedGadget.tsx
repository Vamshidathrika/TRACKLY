"use client";

import { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";

export function CreatedVsResolvedGadget() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  const graphPoints = [
    { day: "Mon", created: 8, resolved: 6 },
    { day: "Tue", created: 12, resolved: 10 },
    { day: "Wed", created: 6, resolved: 14 },
    { day: "Thu", created: 15, resolved: 11 },
    { day: "Fri", created: 9, resolved: 13 },
    { day: "Sat", created: 3, resolved: 4 },
    { day: "Sun", created: 2, resolved: 5 },
  ];

  const totalCreated = graphPoints.reduce((acc, curr) => acc + curr.created, 0);
  const totalResolved = graphPoints.reduce((acc, curr) => acc + curr.resolved, 0);

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={17} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-default">Created vs. Resolved Velocity</h3>
        </div>

        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="h-7 rounded-lg border border-border-default bg-surface px-2 text-xs font-bold text-default outline-none focus:border-brand cursor-pointer"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Summary Legend */}
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

      {/* Bar Chart Visual */}
      <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
        {graphPoints.map((pt) => (
          <div key={pt.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="flex items-end gap-1 w-full justify-center h-full">
              {/* Created Bar */}
              <div
                style={{ height: `${(pt.created / 18) * 100}%` }}
                className="w-2.5 bg-rose-500 rounded-t-sm transition-all duration-300"
                title={`Created on ${pt.day}: ${pt.created}`}
              />
              {/* Resolved Bar */}
              <div
                style={{ height: `${(pt.resolved / 18) * 100}%` }}
                className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300"
                title={`Resolved on ${pt.day}: ${pt.resolved}`}
              />
            </div>
            <span className="text-[10px] font-mono text-subtle">{pt.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

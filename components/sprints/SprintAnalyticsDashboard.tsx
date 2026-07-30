"use client";

import React, { useState } from "react";
import { TrendingDown, BarChart2, Activity, Zap, CheckCircle2 } from "lucide-react";

interface TimelinePoint {
  day: string;
  ideal: number;
  actual: number;
}

interface SprintAnalyticsDashboardProps {
  sprintName?: string;
  totalPoints?: number;
  pointsDone?: number;
  pointsRemaining?: number;
  timeline?: TimelinePoint[];
  velocityHistory?: { name: string; committed: number; completed: number }[];
}

export function SprintAnalyticsDashboard({
  sprintName = "Sprint 14",
  totalPoints = 34,
  pointsDone = 22,
  pointsRemaining = 12,
  timeline = [
    { day: "Day 1", ideal: 34, actual: 34 },
    { day: "Day 2", ideal: 30, actual: 32 },
    { day: "Day 3", ideal: 26, actual: 28 },
    { day: "Day 4", ideal: 22, actual: 25 },
    { day: "Day 5", ideal: 19, actual: 20 },
    { day: "Day 6", ideal: 15, actual: 18 },
    { day: "Day 7", ideal: 11, actual: 14 },
    { day: "Day 8", ideal: 7, actual: 12 },
    { day: "Day 9", ideal: 3, actual: 12 },
    { day: "Day 10", ideal: 0, actual: 12 },
  ],
  velocityHistory = [
    { name: "Sprint 11", committed: 30, completed: 28 },
    { name: "Sprint 12", committed: 32, completed: 32 },
    { name: "Sprint 13", committed: 35, completed: 30 },
    { name: "Sprint 14", committed: 34, completed: 22 },
  ],
}: SprintAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"burndown" | "velocity">("burndown");

  const completionPct = totalPoints > 0 ? Math.round((pointsDone / totalPoints) * 100) : 0;
  const maxVal = Math.max(...timeline.map((t) => Math.max(t.ideal, t.actual)), totalPoints, 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">{sprintName} Analytics</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time sprint progress, ideal trajectory, and team velocity metrics.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("burndown")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === "burndown"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Burndown Chart
          </button>
          <button
            onClick={() => setActiveTab("velocity")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === "velocity"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Velocity Trend
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
          <span className="text-xs text-slate-400 font-medium">Total Scope</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalPoints} <span className="text-xs font-normal text-slate-400">PTS</span></div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
          <span className="text-xs text-slate-400 font-medium">Completed</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{pointsDone} <span className="text-xs font-normal text-slate-400">PTS</span></div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
          <span className="text-xs text-slate-400 font-medium">Remaining</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pointsRemaining} <span className="text-xs font-normal text-slate-400">PTS</span></div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
          <span className="text-xs text-slate-400 font-medium">Completion Rate</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{completionPct}%</div>
        </div>
      </div>

      {/* Main Visualizations */}
      {activeTab === "burndown" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500 rounded"></span> Ideal Guideline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-400 rounded"></span> Actual Remaining
              </span>
            </div>
            <span>Day 1 to 10 Timeline</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-56 flex items-end justify-between gap-2 relative overflow-hidden">
            {timeline.map((pt, idx) => {
              const idealH = Math.round((pt.ideal / maxVal) * 100);
              const actualH = Math.round((pt.actual / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-44 relative">
                    {/* Ideal Bar */}
                    <div
                      style={{ height: `${idealH}%` }}
                      className="w-1.5 bg-slate-700/60 rounded-t transition-all group-hover:bg-slate-500"
                    />
                    {/* Actual Bar */}
                    <div
                      style={{ height: `${actualH}%` }}
                      className="w-2.5 bg-indigo-500 rounded-t transition-all group-hover:bg-indigo-400 shadow-sm"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">{pt.day.replace("Day ", "D")}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-700 rounded-sm"></span> Committed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Completed
              </span>
            </div>
            <span>Last 4 Sprints</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-56 flex items-end justify-around gap-4">
            {velocityHistory.map((s, idx) => {
              const maxVelocity = 40;
              const committedH = Math.round((s.committed / maxVelocity) * 100);
              const completedH = Math.round((s.completed / maxVelocity) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end">
                  <div className="flex items-end gap-2 h-44">
                    <div
                      style={{ height: `${committedH}%` }}
                      className="w-6 bg-slate-800 rounded-t border-t border-slate-600 flex items-start justify-center pt-1 text-[10px] text-slate-400 font-mono"
                    >
                      {s.committed}
                    </div>
                    <div
                      style={{ height: `${completedH}%` }}
                      className="w-6 bg-emerald-600 rounded-t border-t border-emerald-400 flex items-start justify-center pt-1 text-[10px] text-white font-bold font-mono"
                    >
                      {s.completed}
                    </div>
                  </div>
                  <span className="text-xs text-slate-300 font-medium mt-2">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

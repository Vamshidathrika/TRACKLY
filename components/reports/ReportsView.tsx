"use client";

import { useState } from "react";
import { LineChart, BarChart2, Layers } from "lucide-react";
import { Tag } from "@/components/ui/Tag";

export type BurndownData = {
  sprintName: string;
  totalPoints: number;
  pointsDone: number;
  pointsRemaining: number;
  timeline: { day: string; ideal: number; actual: number }[];
};

export type VelocityData = {
  name: string;
  committed: number;
  completed: number;
}[];

export type CumulativeData = {
  status: string;
  count: number;
}[];

export function ReportsView({
  burndown,
  velocity,
  cumulative,
}: {
  burndown: BurndownData;
  velocity: VelocityData;
  cumulative: CumulativeData;
}) {
  const [activeTab, setActiveTab] = useState<"burndown" | "velocity" | "cumulative">("burndown");

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: "burndown", label: "Burndown Chart", icon: LineChart },
          { id: "velocity", label: "Velocity Chart", icon: BarChart2 },
          { id: "cumulative", label: "Cumulative Flow", icon: Layers },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 rounded-ds px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === id
                ? "bg-brand text-white"
                : "border border-border bg-surface text-text hover:bg-[#EBECF0]"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* BURNDOWN CHART TAB */}
      {activeTab === "burndown" && (
        <div className="flex flex-col gap-4 rounded-ds border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text">{burndown.sprintName} Burndown</h3>
              <p className="text-xs text-text-subtle">
                Ideal remaining story points vs actual progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tag color="blue">Total: {burndown.totalPoints} pts</Tag>
              <Tag color="green">Done: {burndown.pointsDone} pts</Tag>
              <Tag color="gray">Remaining: {burndown.pointsRemaining} pts</Tag>
            </div>
          </div>

          {/* SVG Burndown Visual */}
          <div className="mt-4 flex h-64 w-full items-end justify-between gap-2 border-b border-l border-border/80 px-4 pb-2">
            {burndown.timeline.map((pt, idx) => (
              <div key={pt.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-48 w-full items-end justify-center gap-1">
                  {/* Ideal Line Bar */}
                  <div
                    style={{ height: `${(pt.ideal / (burndown.totalPoints || 1)) * 100}%` }}
                    className="w-3 rounded-t bg-[#DFE1E6] transition-all"
                    title={`Ideal: ${pt.ideal}`}
                  />
                  {/* Actual Line Bar */}
                  <div
                    style={{ height: `${(pt.actual / (burndown.totalPoints || 1)) * 100}%` }}
                    className="w-3 rounded-t bg-brand transition-all"
                    title={`Actual: ${pt.actual}`}
                  />
                </div>
                <span className="font-mono text-[10px] text-text-subtle">{pt.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#DFE1E6]" /> Ideal Guideline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Actual Remaining
            </span>
          </div>
        </div>
      )}

      {/* VELOCITY CHART TAB */}
      {activeTab === "velocity" && (
        <div className="flex flex-col gap-4 rounded-ds border border-border bg-surface p-6 shadow-xs">
          <div>
            <h3 className="text-base font-semibold text-text">Sprint Velocity Chart</h3>
            <p className="text-xs text-text-subtle">
              Story points committed vs completed per sprint
            </p>
          </div>

          <div className="mt-4 flex h-64 w-full items-end justify-around border-b border-l border-border/80 px-4 pb-2">
            {velocity.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle italic">
                No closed sprint velocity data available yet.
              </div>
            ) : (
              velocity.map((v) => (
                <div key={v.name} className="flex flex-col items-center gap-2">
                  <div className="flex h-48 items-end gap-2">
                    <div
                      style={{ height: `${Math.min(100, v.committed * 8)}%` }}
                      className="w-6 rounded-t bg-brand/40 transition-all"
                      title={`Committed: ${v.committed}`}
                    />
                    <div
                      style={{ height: `${Math.min(100, v.completed * 8)}%` }}
                      className="w-6 rounded-t bg-success transition-all"
                      title={`Completed: ${v.completed}`}
                    />
                  </div>
                  <span className="font-semibold text-xs text-text">{v.name}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand/40" /> Committed Points
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> Completed Points
            </span>
          </div>
        </div>
      )}

      {/* CUMULATIVE FLOW TAB */}
      {activeTab === "cumulative" && (
        <div className="flex flex-col gap-4 rounded-ds border border-border bg-surface p-6 shadow-xs">
          <div>
            <h3 className="text-base font-semibold text-text">Cumulative Flow Diagram</h3>
            <p className="text-xs text-text-subtle">
              Distribution of issues across workflow statuses
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {cumulative.map((item) => (
              <div key={item.status} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-text">{item.status.replace("_", " ")}</span>
                  <span className="text-text-subtle">{item.count} issues</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#EBECF0] overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, item.count * 20)}%` }}
                    className={`h-full transition-all ${
                      item.status === "DONE"
                        ? "bg-success"
                        : item.status === "IN_PROGRESS"
                        ? "bg-brand"
                        : item.status === "IN_REVIEW"
                        ? "bg-warning"
                        : "bg-[#7A869A]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

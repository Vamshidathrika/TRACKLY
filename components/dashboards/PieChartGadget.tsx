"use client";

import { useState } from "react";
import { PieChart, Filter, MoreHorizontal, ChevronDown } from "lucide-react";
import { Tag } from "@/components/ui/Tag";

export type DistributionMetric = "PRIORITY" | "STATUS" | "ASSIGNEE";

export function PieChartGadget() {
  const [metric, setMetric] = useState<DistributionMetric>("PRIORITY");

  const dataMap: Record<DistributionMetric, { label: string; count: number; percent: number; color: string }[]> = {
    PRIORITY: [
      { label: "Highest", count: 8, percent: 19, color: "bg-rose-500" },
      { label: "High", count: 14, percent: 33, color: "bg-amber-500" },
      { label: "Medium", count: 12, percent: 29, color: "bg-blue-500" },
      { label: "Low", count: 5, percent: 12, color: "bg-emerald-500" },
      { label: "Lowest", count: 3, percent: 7, color: "bg-neutral-500" },
    ],
    STATUS: [
      { label: "Backlog / To Do", count: 15, percent: 36, color: "bg-neutral-500" },
      { label: "In Progress", count: 16, percent: 38, color: "bg-blue-500" },
      { label: "In Review", count: 6, percent: 14, color: "bg-purple-500" },
      { label: "Done", count: 5, percent: 12, color: "bg-emerald-500" },
    ],
    ASSIGNEE: [
      { label: "Vamshi Dathrika", count: 18, percent: 43, color: "bg-brand" },
      { label: "Alex Rivera", count: 12, percent: 29, color: "bg-purple-500" },
      { label: "Sarah Chen", count: 8, percent: 19, color: "bg-sky-500" },
      { label: "Unassigned", count: 4, percent: 9, color: "bg-neutral-400" },
    ],
  };

  const currentData = dataMap[metric];
  const totalCount = currentData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={17} className="text-brand" />
          <h3 className="text-sm font-bold text-default">Issue Distribution Breakdown</h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as DistributionMetric)}
            className="h-7 rounded-lg border border-border-default bg-surface px-2 text-xs font-bold text-default outline-none focus:border-brand cursor-pointer"
          >
            <option value="PRIORITY">By Priority</option>
            <option value="STATUS">By Status</option>
            <option value="ASSIGNEE">By Assignee</option>
          </select>
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded-full bg-neutral/50 flex overflow-hidden p-0.5 gap-0.5">
          {currentData.map((d) => (
            <div
              key={d.label}
              style={{ width: `${d.percent}%` }}
              className={`h-full ${d.color} rounded-full transition-all duration-300`}
              title={`${d.label}: ${d.count} issues (${d.percent}%)`}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono text-subtle text-right">Total Analyzed: {totalCount} Issues</span>
      </div>

      {/* Breakdown Rows */}
      <div className="flex flex-col divide-y divide-border-default text-xs pt-1">
        {currentData.map((d) => (
          <div key={d.label} className="py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
              <span className="font-bold text-default">{d.label}</span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="font-bold text-default">{d.count} issues</span>
              <span className="text-subtle w-10 text-right">{d.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

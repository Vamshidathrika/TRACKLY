"use client";

import { useState } from "react";
import { PieChart } from "lucide-react";

export type DistributionMetric = "PRIORITY" | "STATUS" | "ASSIGNEE";
export type DistributionSlice = { label: string; count: number; color: string };

/**
 * Renders whatever distribution the dashboard page computed from real Issue
 * rows (see app/(app)/dashboards/page.tsx). This used to carry its own
 * hardcoded counts, including a slice literally labelled with a specific
 * person's name, unrelated to whatever issues actually existed.
 */
export function PieChartGadget({
  data,
}: {
  data: Record<DistributionMetric, DistributionSlice[]>;
}) {
  const [metric, setMetric] = useState<DistributionMetric>("PRIORITY");

  const currentData = data[metric].filter((d) => d.count > 0);
  const totalCount = currentData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={17} className="text-brand" />
          <h3 className="text-sm font-bold text-default">Issue Distribution Breakdown</h3>
        </div>

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

      {totalCount === 0 ? (
        <p className="text-xs text-subtle italic py-4 text-center">No issues yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-full rounded-full bg-neutral/50 flex overflow-hidden p-0.5 gap-0.5">
              {currentData.map((d) => {
                const percent = Math.round((d.count / totalCount) * 100);
                return (
                  <div
                    key={d.label}
                    style={{ width: `${percent}%` }}
                    className={`h-full ${d.color} rounded-full transition-all duration-300`}
                    title={`${d.label}: ${d.count} issues (${percent}%)`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-subtle text-right">Total Analyzed: {totalCount} Issues</span>
          </div>

          <div className="flex flex-col divide-y divide-border-default text-xs pt-1">
            {currentData.map((d) => {
              const percent = Math.round((d.count / totalCount) * 100);
              return (
                <div key={d.label} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
                    <span className="font-bold text-default">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="font-bold text-default">{d.count} issues</span>
                    <span className="text-subtle w-10 text-right">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

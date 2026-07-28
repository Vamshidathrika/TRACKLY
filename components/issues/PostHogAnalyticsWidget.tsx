"use client";

import { useState } from "react";
import { Activity, ExternalLink, TrendingDown, Users, AlertTriangle } from "lucide-react";

export function PostHogAnalyticsWidget({
  affectedUsers = 1240,
  rageClickRate = "14.2%",
}: {
  affectedUsers?: number;
  rageClickRate?: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-neutral/20 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Activity size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs flex items-center gap-1.5">
              <span>PostHog Product Analytics & Funnel Insights</span>
              <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded font-bold">LIVE IMPACT</span>
            </h4>
            <p className="text-[11px] text-text-subtle">
              Quantify the real business impact and user drop-off rate for this issue.
            </p>
          </div>
        </div>

        <a
          href="https://app.posthog.com"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
        >
          <ExternalLink size={12} /> PostHog App
        </a>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-subtle font-semibold block">Affected Users</span>
            <span className="font-mono text-sm font-extrabold text-text">{affectedUsers.toLocaleString()}</span>
          </div>
          <Users size={18} className="text-indigo-500" />
        </div>

        <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-subtle font-semibold block">Rage Click Rate</span>
            <span className="font-mono text-sm font-extrabold text-rose-600">{rageClickRate}</span>
          </div>
          <AlertTriangle size={18} className="text-rose-500" />
        </div>
      </div>

      {/* Funnel Visual Progress Bar */}
      <div className="p-3 rounded-lg border border-border bg-surface flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-text-subtle">Checkout Step 1 (Cart) ➔ Step 2 (Payment)</span>
          <span className="text-rose-600 flex items-center gap-1 font-mono">
            <TrendingDown size={12} /> -28% Drop-off
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-neutral/50 overflow-hidden flex">
          <div className="h-full bg-indigo-600 rounded-l-full" style={{ width: "72%" }} />
          <div className="h-full bg-rose-500 rounded-r-full" style={{ width: "28%" }} />
        </div>
      </div>
    </div>
  );
}

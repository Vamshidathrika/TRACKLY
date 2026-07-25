"use client";

import { useState } from "react";
import { Flag, CheckCircle2, Sliders, Shield, Zap } from "lucide-react";

export function FeatureFlagToggleCard({
  flagKey = "enable_new_checkout_flow",
  initialEnabled = true,
}: {
  flagKey?: string;
  initialEnabled?: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [rolloutPct, setRolloutPct] = useState(100);

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-neutral/20 text-xs w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Flag size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-text text-xs truncate">LaunchDarkly Flag Control</h4>
            <p className="text-[10px] text-text-subtle font-mono truncate">
              flag_key: <code className="text-text font-bold">{flagKey}</code>
            </p>
          </div>
        </div>

        {/* Live Toggle Switch */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold ${enabled ? "text-emerald-600" : "text-text-subtle"}`}>
            {enabled ? "ON" : "OFF"}
          </span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              enabled ? "bg-emerald-600" : "bg-neutral-400 dark:bg-neutral-600"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Rollout Slider */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-surface text-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-text-subtle font-medium min-w-0 text-[11px]">
          <Sliders size={13} className="text-orange-500 shrink-0" />
          <span className="truncate">Rollout:</span>
          <span className="font-mono font-bold text-text shrink-0">{rolloutPct}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={rolloutPct}
          onChange={(e) => setRolloutPct(parseInt(e.target.value, 10))}
          className="w-20 accent-orange-500 cursor-pointer shrink-0"
        />
      </div>
    </div>
  );
}

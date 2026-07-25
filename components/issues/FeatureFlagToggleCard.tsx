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
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-neutral/20 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <Flag size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs flex items-center gap-1.5">
              <span>LaunchDarkly Feature Flag Control</span>
              <span className="text-[9px] font-mono bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded font-bold">LIVE TOGGLE</span>
            </h4>
            <p className="text-[11px] text-text-subtle font-mono">
              flag_key: <code className="text-text font-bold">{flagKey}</code>
            </p>
          </div>
        </div>

        {/* Live Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold ${enabled ? "text-emerald-600" : "text-text-subtle"}`}>
            {enabled ? "ENABLED" : "DISABLED"}
          </span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              enabled ? "bg-emerald-600" : "bg-neutral-400 dark:bg-neutral-600"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Rollout Slider */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface text-xs">
        <div className="flex items-center gap-2 text-text-subtle font-medium">
          <Sliders size={14} className="text-orange-500" />
          <span>Rollout Percentage:</span>
          <span className="font-mono font-bold text-text">{rolloutPct}% Users</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={rolloutPct}
          onChange={(e) => setRolloutPct(parseInt(e.target.value, 10))}
          className="w-32 accent-orange-500 cursor-pointer"
        />
      </div>
    </div>
  );
}

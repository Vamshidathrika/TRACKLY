"use client";

import { ShieldAlert, AlertTriangle } from "lucide-react";

export type RiskItem = {
  id: string;
  severity: "HIGH" | "MEDIUM";
  issueKey: string;
  summary: string;
  riskMessage: string;
};

/**
 * Renders real risk signals computed by the dashboard page: issues past
 * their due date, and issues still blocked by an unresolved dependency. This
 * used to be three invented rows (a fake OAuth ticket, a fake Snyk CVE
 * finding) rendered on every load regardless of what actually existed.
 *
 * "AI" here is the existing product-wide label for this kind of surfaced
 * insight (see other gadgets); the detection itself is a deterministic
 * overdue/blocked-dependency query, not a model call.
 */
export function AIRiskDetectorGadget({ risks }: { risks: RiskItem[] }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-surface p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={17} className="text-rose-500" />
          <h3 className="text-sm font-bold text-default">Risk & SLA Bottleneck Detector</h3>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
          {risks.length} Risks Flagged
        </span>
      </div>

      {risks.length === 0 ? (
        <p className="text-xs text-subtle italic py-4 text-center">No overdue or blocked issues right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {risks.map((r) => (
            <div key={r.id} className="p-3.5 rounded-xl border border-border-default bg-neutral/30 flex flex-col gap-1.5 hover:bg-neutral/50 transition-colors text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-brand">{r.issueKey}</span>
                  <span className="font-bold text-default truncate">{r.summary}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.severity === "HIGH"
                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  {r.severity} RISK
                </span>
              </div>

              <p className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                <AlertTriangle size={13} /> {r.riskMessage}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

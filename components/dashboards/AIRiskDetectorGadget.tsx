"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

type RiskItem = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  issueKey: string;
  summary: string;
  riskMessage: string;
  recommendation: string;
};

export function AIRiskDetectorGadget() {
  const [risks] = useState<RiskItem[]>([
    {
      id: "r1",
      severity: "HIGH",
      issueKey: "TRK-14",
      summary: "Refactor Authentication Flow for OAuth Providers",
      riskMessage: "Blocked for 3 days awaiting backend API review",
      recommendation: "Re-assign Code Reviewer or ping Slack #dev-auth",
    },
    {
      id: "r2",
      severity: "HIGH",
      issueKey: "MOB-8",
      summary: "Push Notification Gateway Integration",
      riskMessage: "SLA Overdue by 18 hours (Target Due Date: Yesterday)",
      recommendation: "Increase priority or split into sub-tasks",
    },
    {
      id: "r3",
      severity: "MEDIUM",
      issueKey: "TRK-22",
      summary: "Snyk Vulnerability Patching in Core Dependencies",
      riskMessage: "3 High Severity CVEs detected in package lockfile",
      recommendation: "Run automated Snyk fix PR agent",
    },
  ]);

  return (
    <div className="rounded-xl border border-rose-500/30 bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={17} className="text-rose-500" />
          <h3 className="text-sm font-bold text-default">AI Risk & SLA Bottleneck Detector</h3>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
          {risks.length} Risks Flagged
        </span>
      </div>

      {/* Risk Items Stream */}
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

            <div className="text-[11px] text-subtle font-medium flex items-center justify-between pt-1 border-t border-border-default">
              <span>💡 {r.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { GitBranch, CheckCircle2, Zap, ArrowRight, Layers, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

type WorkflowScheme = {
  id: string;
  name: string;
  description: string;
  statuses: string[];
  isDefault: boolean;
  rules: string[];
};

export function WorkflowSchemesView() {
  const [schemes, setSchemes] = useState<WorkflowScheme[]>([
    {
      id: "wf-1",
      name: "Software Kanban Workflow",
      description: "Standard 4-stage pipeline for fast iterative product development",
      statuses: ["Backlog", "In Progress", "Code Review", "Done"],
      isDefault: true,
      rules: ["Auto-assign issue to active user on transition to 'In Progress'", "Require PR link before transitioning to 'Code Review'", "Require Resolution Code when moving to 'Done'"],
    },
    {
      id: "wf-2",
      name: "Scrum Sprint Pipeline",
      description: "Sprint-based workflow with QA testing & acceptance verification",
      statuses: ["To Do", "In Progress", "In QA Test", "Accepted", "Done"],
      isDefault: false,
      rules: ["Require Story Point estimate before moving to Sprint To Do", "Auto-notify QA leads when status changes to 'In QA Test'"],
    },
    {
      id: "wf-3",
      name: "Incident Response War Room",
      description: "High-urgency triage pipeline for production incident management",
      statuses: ["Reported", "Investigating", "Mitigated", "Resolved"],
      isDefault: false,
      rules: ["Auto-generate Opsgenie war room link on 'Investigating'", "Post PostHog error metrics to Slack channel on 'Reported'"],
    },
  ]);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetDefault = (id: string, name: string) => {
    setSchemes((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    showToast(`"${name}" is now the default workflow scheme.`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg animate-fade-in-up flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-default">Workflow Schemes & Transition Post-Functions</h2>
          <p className="text-xs text-subtle">Define board status lifecycle pipelines, transition validators, and automated post-functions</p>
        </div>
      </div>

      {/* Workflow Schemes Cards */}
      <div className="flex flex-col gap-4">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold shadow-2xs">
                  <GitBranch size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-default">{scheme.name}</h3>
                    {scheme.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Check size={11} /> Default Scheme
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-subtle mt-0.5">{scheme.description}</p>
                </div>
              </div>

              {!scheme.isDefault && (
                <Button
                  appearance="subtle"
                  onClick={() => handleSetDefault(scheme.id, scheme.name)}
                  className="text-xs font-bold hover:bg-neutral"
                >
                  Make Default Scheme
                </Button>
              )}
            </div>

            {/* Visual Status Nodes Sequence */}
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-neutral/40 border border-border-default">
              <span className="text-[10px] font-mono font-bold text-subtlest uppercase tracking-wider">Pipeline Flow:</span>
              {scheme.statuses.map((status, idx) => (
                <div key={status} className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-surface border border-border-default text-xs font-bold text-default shadow-2xs">
                    {status}
                  </span>
                  {idx < scheme.statuses.length - 1 && <ArrowRight size={13} className="text-subtlest shrink-0" />}
                </div>
              ))}
            </div>

            {/* Transition Rules */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-subtle flex items-center gap-1">
                <Zap size={13} className="text-amber-500" /> Automated Transition Post-Functions ({scheme.rules.length}):
              </span>
              <div className="flex flex-col gap-1">
                {scheme.rules.map((rule) => (
                  <div key={rule} className="text-xs text-default flex items-center gap-2 pl-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

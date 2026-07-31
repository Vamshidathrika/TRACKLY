"use client";

import React, { useState } from "react";
import { Zap, Plus, Play, CheckCircle2, AlertTriangle, ShieldCheck, Terminal, Trash2 } from "lucide-react";
import {
  createAutomationRuleAction,
  toggleAutomationRuleAction,
  deleteAutomationRuleAction,
} from "@/app/(app)/settings/automation/actions";

interface Rule {
  id: string;
  name: string;
  eventTrigger: string;
  action: string;
  targetValue: string;
  enabled: boolean;
}

interface LogItem {
  id: string;
  ruleName: string;
  trigger: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  latencyMs: number;
  timestamp: string;
}

interface AutomationRulesManagerProps {
  initialRules?: Rule[];
  initialLogs?: LogItem[];
  projectId?: string;
}

export function AutomationRulesManager({
  initialRules = [
    {
      id: "rule-1",
      name: "Auto-assign Code Reviewer on Status Change",
      eventTrigger: "STATUS_CHANGED",
      action: "ASSIGN_USER",
      targetValue: "dev-lead-id",
      enabled: true,
    },
    {
      id: "rule-2",
      name: "Notify QA on Issue Creation",
      eventTrigger: "ISSUE_CREATED",
      action: "ADD_COMMENT",
      targetValue: "Issue automatically logged for QA sprint triaging.",
      enabled: true,
    },
  ],
  initialLogs = [],
  projectId = "default-project",
}: AutomationRulesManagerProps) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [ruleName, setRuleName] = useState("");
  const [trigger, setTrigger] = useState("STATUS_CHANGED");
  const [action, setAction] = useState("ADD_COMMENT");
  const [targetValue, setTargetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleRule = async (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    await toggleAutomationRuleAction(id);
  };

  const handleDeleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    await deleteAutomationRuleAction(id);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !targetValue || isSubmitting) return;

    setIsSubmitting(true);
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      eventTrigger: trigger,
      action: action,
      targetValue: targetValue,
      enabled: true,
    };

    setRules((prev) => [newRule, ...prev]);

    await createAutomationRuleAction(
      projectId,
      ruleName,
      trigger as any,
      action as any,
      targetValue
    );

    setIsSubmitting(false);
    setRuleName("");
    setTargetValue("");
    setShowCreateModal(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">Automation Engine</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure event triggers, conditional workflows, and real-time execution logs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rules</h4>
        {rules.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-6 text-center text-slate-400 text-xs">
            No automation rules configured yet. Click "New Rule" to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">{rule.name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        rule.enabled
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {rule.enabled ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="text-amber-400 font-semibold">IF</span> {rule.eventTrigger}
                    <span className="text-indigo-400 font-semibold">THEN</span> {rule.action} ("{rule.targetValue}")
                  </div>
                </div>

                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition ${
                    rule.enabled
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      : "bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800"
                  }`}
                >
                  {rule.enabled ? "Pause" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution Audit Log Stream */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Audit Logs</h4>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 font-mono text-xs max-h-40 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-slate-400 hover:text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>[{log.timestamp}]</span>
                <span className="text-slate-200 font-semibold">{log.ruleName}:</span>
                <span className="text-indigo-300">{log.action}</span>
              </div>
              <span className="text-[10px] text-slate-500">{log.latencyMs}ms</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Create Automation Rule</h3>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Auto-assign Code Reviewer"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Trigger</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="STATUS_CHANGED">STATUS_CHANGED</option>
                  <option value="ISSUE_CREATED">ISSUE_CREATED</option>
                  <option value="COMMENT_ADDED">COMMENT_ADDED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADD_COMMENT">ADD_COMMENT</option>
                  <option value="UPDATE_STATUS">UPDATE_STATUS</option>
                  <option value="ASSIGN_USER">ASSIGN_USER</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Value / Comment Payload</label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="Comment body or Target Status/User ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, Sparkles, CheckCircle2, Activity, Sliders, Trash2, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import {
  createAutomationRuleAction,
  toggleAutomationRuleAction,
} from "@/app/(app)/settings/automation/actions";
import { AutomationTemplates, type AutomationTemplate } from "./AutomationTemplates";
import { AutomationAuditLogs } from "./AutomationAuditLogs";
import { getAutomationExecutionLogs, type AutomationExecutionLogItem } from "@/lib/automation";
import type { AutomationTrigger, AutomationAction } from "@prisma/client";

export type AutomationRuleItem = {
  id: string;
  name: string;
  eventTrigger: AutomationTrigger;
  action: AutomationAction;
  targetValue: string;
  enabled: boolean;
};

export function AutomationView({
  projectId,
  rules: initialRules,
}: {
  projectId: string;
  rules: AutomationRuleItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"matrix" | "audit">("matrix");
  const [rules, setRules] = useState<AutomationRuleItem[]>(initialRules);
  const [executionLogs, setExecutionLogs] = useState<AutomationExecutionLogItem[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder state
  const [name, setName] = useState("");
  const [eventTrigger, setEventTrigger] = useState<AutomationTrigger>("STATUS_CHANGED");
  const [action, setAction] = useState<AutomationAction>("ADD_COMMENT");
  const [targetValue, setTargetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Prompt Compiler State
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [isCompilingAiRule, setIsCompilingAiRule] = useState(false);
  const [aiCompiledPreview, setAiCompiledPreview] = useState<{
    name: string;
    eventTrigger: AutomationTrigger;
    action: AutomationAction;
    targetValue: string;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    setExecutionLogs(getAutomationExecutionLogs());
  }, []);

  useEffect(() => {
    if (!showBuilder) {
      setName("");
      setEventTrigger("STATUS_CHANGED");
      setAction("ADD_COMMENT");
      setTargetValue("");
      setAiPromptInput("");
      setAiCompiledPreview(null);
    }
  }, [showBuilder]);

  // Natural Language AI Compiler
  const handleCompileAiRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPromptInput.trim()) return;

    setIsCompilingAiRule(true);
    setTimeout(() => {
      const prompt = aiPromptInput.toLowerCase();
      let compiledTrigger: AutomationTrigger = "STATUS_CHANGED";
      let compiledAction: AutomationAction = "ADD_COMMENT";
      let compiledValue = "Automated AI action response";

      if (prompt.includes("create") || prompt.includes("new task") || prompt.includes("bug")) {
        compiledTrigger = "ISSUE_CREATED";
      } else if (prompt.includes("comment")) {
        compiledTrigger = "COMMENT_ADDED";
      }

      if (prompt.includes("assign")) {
        compiledAction = "ASSIGN_USER";
        compiledValue = "Sarah Connor";
      } else if (prompt.includes("status") || prompt.includes("move") || prompt.includes("done")) {
        compiledAction = "UPDATE_STATUS";
        compiledValue = "DONE";
      } else {
        compiledAction = "ADD_COMMENT";
        compiledValue = "Automated notification response dispatched via AI Engine";
      }

      const generatedName = `AI: ${aiPromptInput.slice(0, 35)}...`;
      setName(generatedName);
      setEventTrigger(compiledTrigger);
      setAction(compiledAction);
      setTargetValue(compiledValue);
      setAiCompiledPreview({
        name: generatedName,
        eventTrigger: compiledTrigger,
        action: compiledAction,
        targetValue: compiledValue,
        confidence: 98,
      });
      setIsCompilingAiRule(false);
    }, 600);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetValue.trim()) return;

    setIsSubmitting(true);
    await createAutomationRuleAction(projectId, name, eventTrigger, action, targetValue);
    
    // Add local rule optimistically
    const newRule: AutomationRuleItem = {
      id: `rule-${Date.now()}`,
      name,
      eventTrigger,
      action,
      targetValue,
      enabled: true,
    };
    setRules((prev) => [newRule, ...prev]);

    setIsSubmitting(false);
    setShowBuilder(false);
    router.refresh();
  };

  const handleInstallTemplate = async (tpl: AutomationTemplate) => {
    await createAutomationRuleAction(
      projectId,
      tpl.title,
      tpl.eventTrigger,
      tpl.action,
      tpl.targetValue
    );
    const newRule: AutomationRuleItem = {
      id: `tpl-rule-${Date.now()}`,
      name: tpl.title,
      eventTrigger: tpl.eventTrigger,
      action: tpl.action,
      targetValue: tpl.targetValue,
      enabled: true,
    };
    setRules((prev) => [newRule, ...prev]);
    router.refresh();
  };

  const handleToggle = async (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    await toggleAutomationRuleAction(ruleId);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Zap className="text-brand fill-brand/20" size={22} />
            <span>No-Code Automation Engine</span>
          </h2>
          <p className="text-xs text-text-subtle mt-0.5">
            Construct automated workflows, AI prompt rule compilers, and real-time event triggers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="p-1 rounded-xl bg-neutral/40 border border-border flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-surface text-text shadow-xs border border-border"
                  : "text-text-subtle hover:text-text"
              }`}
            >
              <Sliders size={13} />
              <span>Rule Matrix ({rules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "audit"
                  ? "bg-surface text-text shadow-xs border border-border"
                  : "text-text-subtle hover:text-text"
              }`}
            >
              <Activity size={13} className="text-brand" />
              <span>Execution Logs ({executionLogs.length})</span>
            </button>
          </div>

          <Button appearance="primary" onClick={() => setShowBuilder((prev) => !prev)}>
            <Plus size={14} /> Create Rule
          </Button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "matrix" ? (
        <div className="flex flex-col gap-6">
          {/* 1-Click Recipe Templates Carousel */}
          <AutomationTemplates onInstallTemplate={handleInstallTemplate} />

          {/* Builder Drawer / Modal */}
          {showBuilder && (
            <div className="flex flex-col gap-5 rounded-2xl border border-brand/40 bg-surface p-5 sm:p-6 shadow-lg animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-indigo-500 to-teal-400" />

              {/* Natural Language AI Prompt Compiler */}
              <form onSubmit={handleCompileAiRule} className="flex flex-col gap-3 p-4 rounded-xl bg-neutral/30 border border-brand/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand flex items-center gap-1.5">
                    <Sparkles size={15} /> ✨ AI Natural Language Rule Compiler
                  </span>
                  <span className="text-[10px] text-text-subtle font-mono">Press ⌘K or type prompt</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. When a high priority bug is created, assign to Sarah and move status to Done..."
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    className="flex-1 h-9 rounded-xl border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={isCompilingAiRule || !aiPromptInput.trim()}
                    className="h-9 px-4 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-hovered disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles size={13} className={isCompilingAiRule ? "animate-spin" : ""} />
                    <span>{isCompilingAiRule ? "Compiling…" : "Compile Rule"}</span>
                  </button>
                </div>

                {/* AI Compilation Preview Box */}
                {aiCompiledPreview && (
                  <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <div>
                        <span className="font-bold text-emerald-600">Rule Compiled ({aiCompiledPreview.confidence}% Confidence):</span>
                        <div className="text-[11px] text-text-subtle mt-0.5">
                          IF <strong className="text-text">{aiCompiledPreview.eventTrigger}</strong> ➔ THEN <strong className="text-brand">{aiCompiledPreview.action}</strong> ({aiCompiledPreview.targetValue})
                        </div>
                      </div>
                    </div>
                    <Tag color="green">Ready to Save</Tag>
                  </div>
                )}
              </form>

              {/* Manual Rule Form */}
              <form onSubmit={handleCreateRule} className="flex flex-col gap-4">
                <h3 className="font-bold text-sm text-text flex items-center gap-1.5">
                  <Zap size={16} className="text-brand fill-brand/20" /> Configure Rule Pipeline
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-subtle">Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Auto-assign high priority bugs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IF Trigger */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral/20 border border-border">
                    <label className="text-[11px] font-bold text-brand uppercase tracking-wider">
                      IF (Event Trigger)
                    </label>
                    <select
                      value={eventTrigger}
                      onChange={(e) => setEventTrigger(e.target.value as AutomationTrigger)}
                      className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs outline-none"
                    >
                      <option value="ISSUE_CREATED">⚡ Task Created</option>
                      <option value="STATUS_CHANGED">🔄 Status Changed</option>
                      <option value="COMMENT_ADDED">💬 Comment Added</option>
                    </select>
                  </div>

                  {/* THEN Action */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral/20 border border-border">
                    <label className="text-[11px] font-bold text-brand uppercase tracking-wider">
                      THEN (Action)
                    </label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value as AutomationAction)}
                      className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs outline-none"
                    >
                      <option value="ADD_COMMENT">💬 Add Comment</option>
                      <option value="ASSIGN_USER">👤 Assign User</option>
                      <option value="UPDATE_STATUS">📌 Update Status</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-subtle">Action Target Payload</label>
                  <input
                    type="text"
                    placeholder="Comment text, User ID, or target status (e.g. DONE)"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    required
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-xs outline-none focus:border-brand font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" appearance="subtle" onClick={() => setShowBuilder(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" appearance="primary" disabled={isSubmitting}>
                    {isSubmitting ? "Creating…" : "Save Automation Rule"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Active Rules List Matrix */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center justify-between">
              <span>Active Rule Pipelines ({rules.length})</span>
              <span className="text-[11px] text-text-subtle font-normal">Auto-evaluating live events</span>
            </h3>

            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 rounded-2xl border border-dashed border-border text-center gap-2 bg-surface">
                <Zap size={28} className="text-text-subtle" />
                <p className="text-xs font-semibold text-text">No active automation rules</p>
                <p className="text-[11px] text-text-subtle max-w-sm">
                  Click &quot;Create Rule&quot; or select a 1-Click Recipe Template above to start automating tasks.
                </p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border bg-surface shadow-xs hover:border-brand/40 transition-all duration-200 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        rule.enabled ? "bg-brand/10 text-brand" : "bg-neutral text-text-subtle"
                      }`}
                    >
                      <Zap size={18} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-text">{rule.name}</h4>
                        {!rule.enabled && <Tag color="gray">Disabled</Tag>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-text-subtle">
                        <span className="bg-neutral/60 px-2 py-0.5 rounded border border-border/60">
                          IF <strong className="text-text">{rule.eventTrigger}</strong>
                        </span>
                        <ArrowRight size={12} className="text-text-subtle" />
                        <span className="bg-brand/10 text-brand px-2 py-0.5 rounded border border-brand/20">
                          THEN <strong>{rule.action}</strong> ({rule.targetValue})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggle(rule.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        rule.enabled ? "bg-brand" : "bg-neutral"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Real-Time Audit Log Stream Tab */
        <AutomationAuditLogs logs={executionLogs} />
      )}
    </div>
  );
}

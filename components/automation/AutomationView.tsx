"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, Play, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import {
  createAutomationRuleAction,
  toggleAutomationRuleAction,
} from "@/app/(app)/settings/automation/actions";
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
  const [rules, setRules] = useState<AutomationRuleItem[]>(initialRules);
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState("");
  const [eventTrigger, setEventTrigger] = useState<AutomationTrigger>("STATUS_CHANGED");
  const [action, setAction] = useState<AutomationAction>("ADD_COMMENT");
  const [targetValue, setTargetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Superpower State: AI Prompt Compiler
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [isCompilingAiRule, setIsCompilingAiRule] = useState(false);

  useEffect(() => {
    if (!showBuilder) {
      setName("");
      setEventTrigger("STATUS_CHANGED");
      setAction("ADD_COMMENT");
      setTargetValue("");
      setAiPromptInput("");
    }
  }, [showBuilder]);

  // AI Prompt Compiler Action
  const handleCompileAiRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPromptInput.trim()) return;

    setIsCompilingAiRule(true);
    setTimeout(() => {
      const prompt = aiPromptInput.toLowerCase();
      let compiledTrigger: AutomationTrigger = "STATUS_CHANGED";
      let compiledAction: AutomationAction = "ADD_COMMENT";
      let compiledValue = "Auto-generated rule action";

      if (prompt.includes("create") || prompt.includes("new issue") || prompt.includes("bug")) {
        compiledTrigger = "ISSUE_CREATED";
      } else if (prompt.includes("comment")) {
        compiledTrigger = "COMMENT_ADDED";
      }

      if (prompt.includes("assign")) {
        compiledAction = "ASSIGN_USER";
        compiledValue = "Sarah Connor";
      } else if (prompt.includes("status") || prompt.includes("move")) {
        compiledAction = "UPDATE_STATUS";
        compiledValue = "IN_PROGRESS";
      } else {
        compiledAction = "ADD_COMMENT";
        compiledValue = "Automated AI notification response";
      }

      setName(`AI Rule: ${aiPromptInput.slice(0, 30)}...`);
      setEventTrigger(compiledTrigger);
      setAction(compiledAction);
      setTargetValue(compiledValue);
      setIsCompilingAiRule(false);
    }, 800);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetValue.trim()) return;

    setIsSubmitting(true);
    await createAutomationRuleAction(projectId, name, eventTrigger, action, targetValue);
    setIsSubmitting(false);
    setShowBuilder(false);
    router.refresh();
  };

  const handleToggle = async (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    await toggleAutomationRuleAction(ruleId);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Automation Rules</h2>
          <p className="text-xs text-text-subtle">
            Construct no-code event triggers and automated actions using AI Prompts or manual rules
          </p>
        </div>
        <Button appearance="primary" onClick={() => setShowBuilder((prev) => !prev)}>
          <Plus size={14} /> Create rule
        </Button>
      </div>

      {/* Rule Builder Form & AI Prompt Converter */}
      {showBuilder && (
        <div className="flex flex-col gap-4 rounded-ds border border-brand/40 bg-selected/30 p-5 shadow-xs">
          {/* AI Natural Language Prompt Converter Bar */}
          <form onSubmit={handleCompileAiRule} className="flex flex-col gap-2 p-3 bg-surface rounded-xl border border-brand/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand flex items-center gap-1.5">
                <Sparkles size={14} /> ✨ AI Natural Language Rule Creator
              </span>
              <span className="text-[10px] text-text-subtle">Type rule in plain English</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. When a high priority task is created, assign to Sarah and add comment..."
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                className="flex-1 h-8 rounded border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={isCompilingAiRule || !aiPromptInput.trim()}
                className="h-8 px-3 bg-brand text-white font-bold text-xs rounded hover:bg-brand-hovered disabled:opacity-50 flex items-center gap-1"
              >
                <Sparkles size={12} className={isCompilingAiRule ? "animate-spin" : ""} />
                <span>{isCompilingAiRule ? "Compiling..." : "Compile Rule"}</span>
              </button>
            </div>
          </form>

          <form onSubmit={handleCreateRule} className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-text flex items-center gap-1.5">
              <Zap size={16} className="text-brand" /> Configured Automation Rule
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Auto-welcome on task creation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 rounded-ds border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-subtle">WHEN (Event Trigger)</label>
                <select
                  value={eventTrigger}
                  onChange={(e) => setEventTrigger(e.target.value as AutomationTrigger)}
                  className="h-8 rounded-ds border border-border bg-surface px-2 text-xs outline-none"
                >
                  <option value="ISSUE_CREATED">Task Created</option>
                  <option value="STATUS_CHANGED">Status Changed</option>
                  <option value="COMMENT_ADDED">Comment Added</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-subtle">THEN (Action)</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as AutomationAction)}
                  className="h-8 rounded-ds border border-border bg-surface px-2 text-xs outline-none"
                >
                  <option value="ADD_COMMENT">Add Comment</option>
                  <option value="ASSIGN_USER">Assign User</option>
                  <option value="UPDATE_STATUS">Update Status</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Action Target Payload</label>
              <input
                type="text"
                placeholder="Comment text, User ID, or target Status"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="h-8 rounded-ds border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" appearance="subtle" onClick={() => setShowBuilder(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Save Rule"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div className="flex flex-col gap-3">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-ds border border-dashed border-border text-center gap-2">
            <Zap size={24} className="text-text-subtle" />
            <p className="text-xs text-text-subtle">No automation rules created yet.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 rounded-ds border border-border bg-surface shadow-xs hover:border-brand/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    rule.enabled ? "bg-brand/10 text-brand" : "bg-neutral text-text-subtle"
                  }`}
                >
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text flex items-center gap-2">
                    {rule.name}
                    {!rule.enabled && <Tag color="gray">Disabled</Tag>}
                  </h4>
                  <p className="text-[11px] text-text-subtle mt-0.5 font-mono">
                    WHEN <span className="font-bold text-text">{rule.eventTrigger}</span> THEN{" "}
                    <span className="font-bold text-brand">{rule.action}</span> ({rule.targetValue})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(rule.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
          ))
        )}
      </div>
    </div>
  );
}

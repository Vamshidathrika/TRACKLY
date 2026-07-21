"use client";

import { useState } from "react";
import { Plus, Zap, Play, CheckCircle2 } from "lucide-react";
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
  const [rules, setRules] = useState<AutomationRuleItem[]>(initialRules);
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState("");
  const [eventTrigger, setEventTrigger] = useState<AutomationTrigger>("STATUS_CHANGED");
  const [action, setAction] = useState<AutomationAction>("ADD_COMMENT");
  const [targetValue, setTargetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetValue.trim()) return;

    setIsSubmitting(true);
    await createAutomationRuleAction(projectId, name, eventTrigger, action, targetValue);
    window.location.reload();
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
            Construct no-code event triggers and automated actions
          </p>
        </div>
        <Button appearance="primary" onClick={() => setShowBuilder((prev) => !prev)}>
          <Plus size={14} /> Create rule
        </Button>
      </div>

      {/* Rule Builder Form */}
      {showBuilder && (
        <form
          onSubmit={handleCreateRule}
          className="flex flex-col gap-4 rounded-ds border border-brand/40 bg-selected/30 p-5 shadow-xs"
        >
          <h3 className="font-semibold text-sm text-text flex items-center gap-1.5">
            <Zap size={16} className="text-brand" /> New Automation Rule
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-subtle">Rule Name</label>
            <input
              type="text"
              placeholder="e.g. Auto-welcome on issue creation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 rounded-ds border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">WHEN (Trigger)</label>
              <select
                value={eventTrigger}
                onChange={(e) => setEventTrigger(e.target.value as AutomationTrigger)}
                className="h-8 rounded-ds border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
              >
                <option value="ISSUE_CREATED">An issue is created</option>
                <option value="STATUS_CHANGED">Status changes</option>
                <option value="COMMENT_ADDED">A comment is posted</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">THEN (Action)</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as AutomationAction)}
                className="h-8 rounded-ds border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
              >
                <option value="ADD_COMMENT">Add automated comment</option>
                <option value="UPDATE_STATUS">Update status to...</option>
                <option value="ASSIGN_USER">Assign to user ID...</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-subtle">Target Value / Content</label>
            <input
              type="text"
              placeholder={
                action === "ADD_COMMENT"
                  ? "Comment body text..."
                  : action === "UPDATE_STATUS"
                  ? "IN_PROGRESS / DONE"
                  : "User ID..."
              }
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="h-8 rounded-ds border border-border bg-surface px-2.5 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button appearance="subtle" type="button" onClick={() => setShowBuilder(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button appearance="primary" type="submit" disabled={isSubmitting} className="h-8 text-xs">
              Save Rule
            </Button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="flex flex-col gap-3">
        {rules.length === 0 ? (
          <div className="rounded-ds border border-dashed border-border p-8 text-center text-xs text-text-subtle italic">
            No automation rules created yet for this project.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-ds border border-border bg-surface p-4 shadow-xs"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-brand" />
                  <span className="font-semibold text-sm text-text">{rule.name}</span>
                  <Tag color={rule.enabled ? "green" : "gray"}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </Tag>
                </div>
                <p className="text-xs text-text-subtle">
                  <span className="font-semibold">WHEN</span> {rule.eventTrigger.replace("_", " ")}{" "}
                  <span className="font-semibold">THEN</span> {rule.action.replace("_", " ")} (&quot;{rule.targetValue}&quot;)
                </p>
              </div>

              <button
                onClick={() => handleToggle(rule.id)}
                className={`flex h-7 items-center gap-1.5 rounded-ds px-3 text-xs font-semibold transition-colors ${
                  rule.enabled
                    ? "bg-success text-white"
                    : "border border-border-default bg-neutral text-subtle hover:bg-neutral-hovered"
                }`}
              >
                <CheckCircle2 size={12} /> {rule.enabled ? "Enabled" : "Enable"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

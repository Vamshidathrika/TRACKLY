"use client";

import { useState } from "react";
import { Zap, GitPullRequest, AlertTriangle, Rocket, ArrowRight, Check, CheckSquare, ShieldAlert, ArrowUpRight } from "lucide-react";
import type { AutomationTrigger, AutomationAction } from "@prisma/client";

export interface AutomationTemplate {
  id: string;
  title: string;
  category: "Jira Core Rules" | "DevOps & VCS" | "Triage & SLA" | "Sprint & Release";
  description: string;
  eventTrigger: AutomationTrigger;
  action: AutomationAction;
  targetValue: string;
  badgeColor: string;
  jiraPattern: string;
}

export const PREBUILT_JIRA_TEMPLATES: AutomationTemplate[] = [
  {
    id: "jira-tpl-1",
    title: "Auto-close Parent Task when all Sub-tasks are Done",
    category: "Jira Core Rules",
    description: "When all child sub-tasks transition to Done, automatically move the parent story to Done",
    eventTrigger: "STATUS_CHANGED",
    action: "UPDATE_STATUS",
    targetValue: "DONE",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    jiraPattern: "Sub-task ➔ Parent Sync",
  },
  {
    id: "jira-tpl-2",
    title: "PR Merged ➔ Transition Issue to Done & Notify Slack",
    category: "DevOps & VCS",
    description: "When a GitHub/GitLab Pull Request is merged, automatically move linked issue to Done",
    eventTrigger: "STATUS_CHANGED",
    action: "UPDATE_STATUS",
    targetValue: "DONE",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    jiraPattern: "Smart Commit / PR Sync",
  },
  {
    id: "jira-tpl-3",
    title: "Auto-assign High Priority Bugs to QA Lead",
    category: "Triage & SLA",
    description: "When a high or highest priority bug is reported, assign to Lead Developer immediately",
    eventTrigger: "ISSUE_CREATED",
    action: "ASSIGN_USER",
    targetValue: "Lead Engineer",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    jiraPattern: "Auto-Routing Triage",
  },
  {
    id: "jira-tpl-4",
    title: "In Review ➔ Assign to Code Reviewer & Comment",
    category: "Jira Core Rules",
    description: "When issue is moved to 'In Review', prompt reviewer and post review guidelines comment",
    eventTrigger: "STATUS_CHANGED",
    action: "ADD_COMMENT",
    targetValue: "🔍 Task moved to In Review. Code reviewer assigned for PR audit.",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    jiraPattern: "Peer Review Workflow",
  },
  {
    id: "jira-tpl-5",
    title: "Sprint Completed ➔ Move Unfinished Issues to Backlog",
    category: "Sprint & Release",
    description: "When active sprint is completed, rollover open tasks back to the project backlog",
    eventTrigger: "STATUS_CHANGED",
    action: "UPDATE_STATUS",
    targetValue: "TO_DO",
    badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    jiraPattern: "Sprint Rollover Guard",
  },
  {
    id: "jira-tpl-6",
    title: "Sentry Production Crash ➔ Auto-Create Bug & Alert",
    category: "DevOps & VCS",
    description: "When Sentry logs a fatal production crash, automatically create a Bug task and alert team",
    eventTrigger: "ISSUE_CREATED",
    action: "ADD_COMMENT",
    targetValue: "🚨 Sentry crash trace recorded: Auto-created task with full stacktrace",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    jiraPattern: "APM Auto-Incident",
  },
];

export function AutomationTemplates({
  onInstallTemplate,
}: {
  onInstallTemplate: (template: AutomationTemplate) => void;
}) {
  const [installedId, setInstalledId] = useState<string | null>(null);

  const handleInstall = (template: AutomationTemplate) => {
    setInstalledId(template.id);
    onInstallTemplate(template);
    setTimeout(() => setInstalledId(null), 1500);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Jira Core Rules":
        return <CheckSquare size={14} className="text-blue-500" />;
      case "DevOps & VCS":
        return <GitPullRequest size={14} className="text-purple-500" />;
      case "Triage & SLA":
        return <ShieldAlert size={14} className="text-rose-500" />;
      case "Sprint & Release":
        return <Rocket size={14} className="text-teal-500" />;
      default:
        return <Zap size={14} />;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <Zap size={14} className="text-brand" /> Valid Jira Automation Rules & Templates
        </h3>
        <span className="text-[11px] text-text-subtle font-medium">Enterprise Jira workflow patterns</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PREBUILT_JIRA_TEMPLATES.map((tpl) => {
          const isJustInstalled = installedId === tpl.id;
          return (
            <div
              key={tpl.id}
              className="flex flex-col justify-between p-4 rounded-2xl border border-border bg-surface hover:border-brand/50 shadow-xs transition-all duration-200 group relative overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${tpl.badgeColor}`}>
                    {getCategoryIcon(tpl.category)}
                    <span>{tpl.category}</span>
                  </span>
                  <span className="text-[10px] font-mono text-text-subtle bg-neutral/50 px-2 py-0.5 rounded border border-border/50">
                    {tpl.jiraPattern}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-text group-hover:text-brand transition-colors leading-snug mt-1">
                  {tpl.title}
                </h4>
                <p className="text-[11px] text-text-subtle leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-subtle">
                  WHEN <strong>{tpl.eventTrigger}</strong> ➔ THEN <strong className="text-brand">{tpl.action}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleInstall(tpl)}
                  className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all duration-180 flex items-center gap-1 cursor-pointer ${
                    isJustInstalled
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-brand/10 hover:bg-brand text-brand hover:text-white"
                  }`}
                >
                  {isJustInstalled ? (
                    <>
                      <Check size={12} />
                      <span>Installed</span>
                    </>
                  ) : (
                    <>
                      <span>Add Rule</span>
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

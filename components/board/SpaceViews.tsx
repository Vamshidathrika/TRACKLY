"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DevIntegrationsView } from "@/components/dev/DevIntegrationsView";
import { submitCopilotCommandAction } from "@/app/(app)/ai/actions";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart2,
  Calendar as CalendarIcon,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Code2,
  FileText,
  Send,
  Plus,
  X,
  Zap,
  UserPlus,
  Sparkles,
  ExternalLink,
  Layers,
  TrendingUp,
  Activity,
  ShieldCheck,
  FolderGit2,
} from "lucide-react";
import { type BoardIssue } from "./IssueCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import type { IssueType, IssuePriority } from "@prisma/client";

// 1. Summary View Component
export function SummaryView({ issues, projectName }: { issues: BoardIssue[]; projectName: string }) {
  const todoCount = issues.filter((i) => i.status === "TO_DO").length;
  const inProgressCount = issues.filter((i) => i.status === "IN_PROGRESS").length;
  const doneCount = issues.filter((i) => i.status === "DONE").length;
  const total = issues.length || 1;

  const donePercent = Math.round((doneCount / total) * 100);
  const inProgressPercent = Math.round((inProgressCount / total) * 100);
  const todoPercent = Math.round((todoCount / total) * 100);

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Issues</span>
            <Layers size={16} className="text-brand" />
          </div>
          <p className="text-2xl font-bold text-text">{issues.length}</p>
          <span className="text-xs text-text-subtle">Active in sprint</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{doneCount}</p>
          <span className="text-xs text-emerald-600 font-medium">{donePercent}% completed</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <Clock size={16} className="text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-sky-600">{inProgressCount}</p>
          <span className="text-xs text-sky-600 font-medium">{inProgressPercent}% of workload</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">To Do</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{todoCount}</p>
          <span className="text-xs text-amber-600 font-medium">{todoPercent}% pending</span>
        </div>
      </div>

      {/* Progress & Workload Bar */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
        <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand" /> Workload Status Distribution
        </h3>
        <div className="flex h-3 w-full rounded-full bg-neutral overflow-hidden mb-3">
          <div style={{ width: `${donePercent}%` }} className="bg-emerald-500 transition-all" title="Done" />
          <div style={{ width: `${inProgressPercent}%` }} className="bg-sky-500 transition-all" title="In Progress" />
          <div style={{ width: `${todoPercent}%` }} className="bg-amber-400 transition-all" title="To Do" />
        </div>
        <div className="flex items-center gap-6 text-xs text-text-subtle">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Done ({doneCount})
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> In Progress ({inProgressCount})
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> To Do ({todoCount})
          </div>
        </div>
      </div>

      {/* Recent Activity & Issues overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <Activity size={16} className="text-brand" /> Recent Activity Feed
          </h3>
          <div className="flex flex-col gap-3">
            {issues.slice(0, 5).map((issue) => (
              <div key={issue.id} className="flex items-start justify-between border-b border-border/50 pb-2.5 last:border-0">
                <div className="flex items-start gap-2.5">
                  <Avatar name={issue.assignee?.name ?? "User"} size={26} />
                  <div>
                    <p className="text-xs font-semibold text-text">
                      <span className="font-mono text-text-subtle mr-1.5">{issue.key}</span>
                      {issue.summary}
                    </p>
                    <span className="text-[11px] text-text-subtle">Updated status to {issue.status.replace("_", " ")}</span>
                  </div>
                </div>
                <Tag color={issue.status === "DONE" ? "green" : issue.status === "IN_PROGRESS" ? "blue" : "gray"}>
                  {issue.status.replace("_", " ")}
                </Tag>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand" /> Health & Team Pulse
          </h3>
          <div className="flex flex-col gap-3 text-xs">
            <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="font-semibold">Sprint Pace:</span> On track to complete {donePercent}% of planned items.
            </div>
            <div className="p-3 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
              <span className="font-semibold">Active Contributors:</span> {new Set(issues.map(i => i.assignee?.name).filter(Boolean)).size || 1} team members assigned.
            </div>
            <div className="p-3 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <span className="font-semibold">Attention Needed:</span> {todoCount} tasks pending assignment or start.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Timeline / Gantt View Component
export function TimelineView({ issues }: { issues: BoardIssue[] }) {
  const dates = ["Jul 1", "Jul 8", "Jul 15", "Jul 22", "Jul 29", "Aug 5", "Aug 12"];

  return (
    <div className="flex flex-col gap-4 py-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <BarChart2 size={16} className="text-brand" /> Project Timeline & Gantt Schedule
        </h3>
        <span className="text-xs text-text-subtle">July 2026 - August 2026</span>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-xs overflow-x-auto">
        {/* Timeline Header */}
        <div className="flex border-b border-border bg-neutral/50 min-w-[700px]">
          <div className="w-64 p-3 text-xs font-bold text-text border-r border-border">Work Item</div>
          <div className="flex-1 grid grid-cols-7 text-center py-3 text-xs font-semibold text-text-subtle">
            {dates.map((d) => (
              <div key={d} className="border-r border-border/40 last:border-0">{d}</div>
            ))}
          </div>
        </div>

        {/* Timeline Rows */}
        <div className="divide-y divide-border/60 min-w-[700px]">
          {issues.map((issue, idx) => {
            const startCol = (idx % 4) + 1;
            const spanCols = Math.min(3, 7 - startCol);
            return (
              <div key={issue.id} className="flex items-center hover:bg-neutral/30 transition-colors">
                <div className="w-64 p-3 border-r border-border truncate flex items-center gap-2">
                  <span className="font-mono text-xs text-text-subtle font-semibold">{issue.key}</span>
                  <span className="text-xs font-medium text-text truncate">{issue.summary}</span>
                </div>
                <div className="flex-1 grid grid-cols-7 py-2 px-2 items-center relative">
                  <div
                    style={{ gridColumn: `${startCol} / span ${spanCols}` }}
                    className={`h-7 rounded-md px-2.5 flex items-center justify-between text-xs font-semibold text-white shadow-xs transition-all ${
                      issue.status === "DONE"
                        ? "bg-emerald-500"
                        : issue.status === "IN_PROGRESS"
                        ? "bg-brand"
                        : "bg-amber-500"
                    }`}
                  >
                    <span className="truncate">{issue.summary}</span>
                    <span className="text-[10px] opacity-90">{issue.status.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 3. Calendar View Component
//
// This previously hardcoded "July 2026", always drew exactly 31 cells, and
// placed issues by ARRAY INDEX (`idx % 31`) rather than by date — so every
// issue appeared on an arbitrary day and `dueDate` was never read at all.
// Planning from it was actively misleading.
export function CalendarView({ issues }: { issues: BoardIssue[] }) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year, month } = cursor;
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  // Bucket by local calendar day. Parsing to a Date first means an ISO string
  // and a Date instance land in the same bucket.
  const byDay = new Map<number, BoardIssue[]>();
  for (const issue of issues) {
    if (!issue.dueDate) continue;
    const d = new Date(issue.dueDate);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    const bucket = byDay.get(day);
    if (bucket) bucket.push(issue);
    else byDay.set(day, [issue]);
  }

  const undated = issues.filter((i) => !i.dueDate).length;
  const step = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <div className="flex flex-col gap-4 py-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <CalendarIcon size={16} className="text-brand" /> {monthLabel}
        </h3>
        <div className="flex items-center gap-2">
          {undated > 0 && (
            <span className="text-[11px] text-text-subtle">
              {undated} without a due date
            </span>
          )}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="px-2 py-1 rounded-md border border-border text-xs font-bold text-text hover:bg-neutral/40 cursor-pointer"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="px-2 py-1 rounded-md border border-border text-xs font-bold text-text hover:bg-neutral/40 cursor-pointer"
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-xs overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border bg-neutral/60 text-center py-2 text-xs font-bold text-text-subtle">
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 min-h-[420px]">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} className="p-1 sm:p-2 min-h-[70px] sm:min-h-[90px] bg-neutral/10" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayIssues = byDay.get(day) ?? [];
            return (
              <div key={day} className="p-1 sm:p-2 min-h-[70px] sm:min-h-[90px] flex flex-col gap-1 bg-surface hover:bg-neutral/20">
                <span className="text-xs font-bold text-text-subtle">{day}</span>
                {dayIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-1 rounded bg-brand/10 border border-brand/20 text-[11px] font-semibold text-brand truncate"
                    title={`${issue.key}: ${issue.summary}`}
                  >
                    {issue.key}: {issue.summary}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 4. Forms View Component
export function FormsView({
  projectName,
  projectId,
  projectKey,
}: {
  projectName: string;
  projectId?: string;
  projectKey?: string;
}) {
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>("TASK");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !projectId) return;

    setIsSubmitting(true);
    const { quickCreateIssueAction } = await import("@/app/(app)/projects/[key]/backlog/actions");
    const res = await quickCreateIssueAction({
      projectId,
      summary: summary.trim(),
      type,
      status: "TO_DO",
    });

    setIsSubmitting(false);
    if (res?.success && res.issue) {
      setSubmittedKey(res.issue.key);
      setSummary("");
      setDescription("");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-center py-6 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-[14px] border border-border-default bg-surface p-6 shadow-md">
        <div className="flex items-center gap-3 border-b border-border-default pb-4 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand/10 text-brand">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-default">{projectName} Intake Form</h3>
            <p className="text-[12px] text-subtle">Submit issues, feature requests, or bug reports directly into the project backlog.</p>
          </div>
        </div>

        {submittedKey ? (
          <div className="text-center py-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-[16px] font-bold text-default">Request Submitted!</h4>
            <p className="text-[13px] text-subtle max-w-xs">
              Issue <strong className="font-mono text-brand">{submittedKey}</strong> has been created and added directly to the project backlog.
            </p>
            <Button appearance="subtle" onClick={() => setSubmittedKey(null)} className="mt-2 text-[12px]">
              Submit another request
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[12px] font-bold text-default mb-1">Issue Summary *</label>
              <input
                required
                type="text"
                placeholder="Brief summary of the issue or feature request"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[13px] outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-default mb-1">Detailed Description</label>
              <textarea
                rows={3}
                placeholder="Describe what needs to be built or fixed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-[8px] border border-border-default bg-surface p-3 text-[13px] outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-default mb-1">Issue Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IssueType)}
                  className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[12px] outline-none focus:border-brand cursor-pointer"
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                  <option value="EPIC">Epic</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-default mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[12px] outline-none focus:border-brand cursor-pointer"
                >
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="HIGHEST">Highest</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 rounded-[8px] bg-brand text-white text-[13px] font-semibold hover:bg-brand-hovered transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.97] disabled:opacity-50"
              >
                <Send size={13} /> {isSubmitting ? "Submitting…" : "Submit Issue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// 5. Development View Component
export function DevView({ projectId = "demo-proj", projectKey = "VAM" }: { projectId?: string; projectKey?: string }) {
  return <DevIntegrationsView projectId={projectId} projectKey={projectKey} initialTab="ALL" />;
}

// 6. Code View Component
export function CodeView({ projectId = "demo-proj", projectKey = "VAM" }: { projectId?: string; projectKey?: string }) {
  return <DevIntegrationsView projectId={projectId} projectKey={projectKey} initialTab="GITHUB" />;
}

// 7. Modals: Automation Modal
export function AutomationModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [rules, setRules] = useState<{ title: string; desc: string; active: boolean }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRules([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSuccess?.();
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text p-2 sm:p-1 -m-2 sm:m-0">
          <X size={16} />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-brand" size={20} />
          <h3 className="text-base font-bold text-text">Project Automation Rules</h3>
        </div>
        <div className="flex flex-col gap-3 mb-5 text-xs">
          {rules.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-subtle border border-dashed border-border rounded-lg bg-neutral/20 flex flex-col items-center gap-1.5">
              <Zap size={20} className="text-text-subtle opacity-50" />
              <p className="font-semibold text-text">No active automation rules for this project</p>
              <p className="text-[11px]">Configure rules in Project Settings to automate task transitions.</p>
            </div>
          ) : (
            rules.map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-md border border-border bg-neutral/30">
                <div>
                  <p className="font-bold text-text">{rule.title}</p>
                  <p className="text-[11px] text-text-subtle">{rule.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].active = e.target.checked;
                    setRules(updated);
                  }}
                  className="h-4 w-4 accent-brand cursor-pointer"
                />
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button appearance="subtle" onClick={onClose} className="text-xs">Close</Button>
          <Button appearance="primary" onClick={handleSave} className="bg-brand text-white text-xs font-bold">Save Rules</Button>
        </div>
      </div>
    </div>
  );
}

// 8. Modals: Invite Modal
export function InviteModal({
  isOpen,
  onClose,
  projectId,
  defaultRole = "MEMBER",
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  defaultRole?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setRole(defaultRole);
      setInviteUrl(null);
      setIsSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen, defaultRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("email", email.trim());
    formData.set("role", role);
    if (projectId) formData.set("projectId", projectId);

    const { inviteMemberAction } = await import("@/app/(app)/settings/members/actions");
    const res = await inviteMemberAction({}, formData);

    setIsSubmitting(false);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.link) {
      setInviteUrl(res.link);
      onSuccess?.();
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md rounded-[16px] border border-border-default bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-subtlest hover:text-default p-2 sm:p-1 -m-2 sm:m-0">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="text-brand" size={20} />
          <h3 className="text-[16px] font-bold text-default">Invite Team Members</h3>
        </div>

        {inviteUrl ? (
          <div className="py-4 flex flex-col gap-3">
            <div className="p-3 rounded-[8px] bg-success/10 border border-success/20 text-success text-[12px] font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Invitation created for {email}!
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-subtlest mb-1">Invite Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 h-9 rounded-[8px] border border-border-default bg-neutral px-3 text-[12px] font-mono text-subtle outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                  }}
                  className="h-9 px-3 rounded-[8px] bg-brand text-white text-[12px] font-semibold hover:bg-brand-hovered transition-all"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setInviteUrl(null);
                  setEmail("");
                  onClose();
                }}
                className="h-9 px-4 rounded-[8px] bg-neutral text-default text-[13px] font-medium hover:bg-neutral-hovered"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-[13px]">
            {errorMsg && (
              <div className="p-2.5 rounded-[8px] bg-danger/10 text-danger border border-danger/20 text-[12px] font-semibold">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block font-semibold text-default mb-1">Email Address *</label>
              <input
                required
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 outline-none focus:border-brand text-[13px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-default mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 outline-none text-[12px] cursor-pointer"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-[8px] text-[13px] font-medium text-subtle hover:bg-neutral"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 rounded-[8px] bg-brand text-white font-semibold text-[13px] hover:bg-brand-hovered disabled:opacity-50"
              >
                {isSubmitting ? "Inviting…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// 9. Modals: Add View Modal
export function AddViewModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (name: string) => void }) {
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setViewName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text p-2 sm:p-1 -m-2 sm:m-0">
          <X size={16} />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="text-brand" size={20} />
          <h3 className="text-base font-bold text-text">Add Custom View / Tab</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (viewName.trim()) {
              onAdd(viewName.trim());
              setViewName("");
              onClose();
            }
          }}
          className="flex flex-col gap-4 text-xs"
        >
          <div>
            <label className="block font-bold text-text mb-1">View Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Analytics, Milestones, Support"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="w-full h-9 rounded border border-border bg-surface px-3 outline-none focus:border-brand"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button appearance="subtle" onClick={onClose} className="text-xs">Cancel</Button>
            <Button appearance="primary" type="submit" className="bg-brand text-white text-xs font-bold">Add View</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 10. AI Assistant Sidepanel Drawer
export function AIAssistantDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "⚡ **Hello! I am your AI Product Manager Co-Pilot.**\nSelect a superpower below or describe a feature to auto-breakdown into tasks!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setIsThinking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuperpower = async (action: "breakdown" | "releasenotes" | "audit") => {
    setIsThinking(true);
    let userMsg = "";
    if (action === "breakdown") userMsg = "Breakdown top feature into tasks and subtasks";
    else if (action === "releasenotes") userMsg = "Generate release notes for active sprint";
    else if (action === "audit") userMsg = "Audit project risks and bottlenecks";

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      const res = await submitCopilotCommandAction(userMsg);
      setMessages((prev) => [...prev, { role: "assistant", text: res.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Failed to connect to AI workspace assistant." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const prompt = input.trim();
    setInput("");
    setIsThinking(true);

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);

    try {
      const res = await submitCopilotCommandAction(prompt);
      setMessages((prev) => [...prev, { role: "assistant", text: res.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Failed to process command." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 border-l border-border bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border bg-neutral/40">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand" size={18} />
          <h3 className="text-sm font-bold text-text">AI PM Co-Pilot</h3>
        </div>
        <button onClick={onClose} className="text-text-subtle hover:text-text p-2 sm:p-1 -m-2 sm:m-0">
          <X size={16} />
        </button>
      </div>

      {/* Quick Superpower Action Chips */}
      <div className="p-3 border-b border-border bg-neutral/20 flex flex-col gap-2">
        <span className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">AI Superpower Actions</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleSuperpower("breakdown")}
            className="px-3 py-2 sm:px-2.5 sm:py-1 rounded-full bg-brand/10 hover:bg-brand/20 border border-brand/30 text-[11px] font-semibold text-brand transition-colors text-left flex items-center gap-1"
          >
            <Zap size={12} /> Auto-Breakdown Feature
          </button>
          <button
            onClick={() => handleSuperpower("releasenotes")}
            className="px-3 py-2 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-semibold text-emerald-600 transition-colors text-left flex items-center gap-1"
          >
            <FileText size={12} /> Release Notes
          </button>
          <button
            onClick={() => handleSuperpower("audit")}
            className="px-3 py-2 sm:px-2.5 sm:py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[11px] font-semibold text-purple-600 transition-colors text-left flex items-center gap-1"
          >
            <ShieldCheck size={12} /> Risk Audit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-brand text-white ml-6 self-end shadow-xs"
                : "bg-neutral text-text border border-border/60 mr-4 self-start shadow-xs"
            }`}
          >
            {m.text}
          </div>
        ))}
        {isThinking && (
          <div className="p-3 rounded-lg text-xs bg-neutral text-text-subtle animate-pulse self-start">
            Analyzing project context...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask AI or type feature request..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 h-10 sm:h-8 rounded border border-border px-2.5 text-xs outline-none focus:border-brand"
        />
        <button type="submit" className="h-10 w-10 sm:h-8 sm:w-8 rounded bg-brand text-white flex items-center justify-center hover:bg-brand-hovered transition-all">
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}

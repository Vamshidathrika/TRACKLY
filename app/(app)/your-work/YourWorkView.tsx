"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Folder, UserCheck, Plus, AlertCircle, Layout, Layers, Calendar, Sparkles, Zap, ArrowRight } from "lucide-react";
import { IssueTable, type IssueListItem } from "@/components/issues/IssueTable";
import { IssueFilterToolbar, type TeammateUser } from "@/components/issues/IssueFilterToolbar";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/Button";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type UserWorkIssue = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  updatedAt: Date;
  project: { key: string; name: string };
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
};

export type UserWorkProject = {
  id: string;
  key: string;
  name: string;
  _count: { issues: number };
};

export function YourWorkView({
  assignedIssues,
  reportedIssues,
  userProjects,
  userName,
  availableUsers = [],
}: {
  assignedIssues: UserWorkIssue[];
  reportedIssues: UserWorkIssue[];
  userProjects: UserWorkProject[];
  userName: string;
  availableUsers?: TeammateUser[];
}) {
  const [activeTab, setActiveTab] = useState<"assigned" | "reported" | "projects">("assigned");

  // Filters state for assigned / reported tabs
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filterIssues = (issues: UserWorkIssue[]) => {
    return issues.filter((i) => {
      const matchesSearch =
        !searchQuery ||
        i.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.key.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesUser = true;
      if (filterUnassigned) {
        matchesUser = !i.assignee;
      } else if (selectedUserId) {
        matchesUser = i.assignee?.id === selectedUserId;
      }

      const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || i.priority === priorityFilter;
      const matchesType = typeFilter === "ALL" || i.type === typeFilter;

      return matchesSearch && matchesUser && matchesStatus && matchesPriority && matchesType;
    });
  };

  const handleClearFilters = () => {
    setSelectedUserId(null);
    setFilterUnassigned(false);
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
  };

  // Memoize heavy computed values to prevent re-computation on every render
  const formattedAssigned: IssueListItem[] = useMemo(
    () =>
      filterIssues(assignedIssues).map((i) => ({
        id: i.id,
        key: i.key,
        summary: i.summary,
        type: i.type,
        status: i.status,
        priority: i.priority,
        projectKey: i.project?.key ?? "PRJ",
        assignee: i.assignee,
      })),
    [assignedIssues, searchQuery, selectedUserId, filterUnassigned, statusFilter, priorityFilter, typeFilter]
  );

  const formattedReported: IssueListItem[] = useMemo(
    () =>
      filterIssues(reportedIssues).map((i) => ({
        id: i.id,
        key: i.key,
        summary: i.summary,
        type: i.type,
        status: i.status,
        priority: i.priority,
        projectKey: i.project?.key ?? "PRJ",
        assignee: i.assignee,
      })),
    [reportedIssues, searchQuery, selectedUserId, filterUnassigned, statusFilter, priorityFilter, typeFilter]
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const highPriorityCount = useMemo(
    () => assignedIssues.filter((i) => i.priority === "HIGHEST" || i.priority === "HIGH").length,
    [assignedIssues]
  );

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-6xl mx-auto w-full gap-6">
      {/* Toast Notice */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span>{toastMsg}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">Your Work</h1>
          <p className="text-xs text-text-subtle mt-0.5">Welcome back, {userName}. Here is an overview of your active tasks and spaces.</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary" className="bg-brand text-white hover:bg-brand-hovered rounded-full px-4 font-bold shadow-xs"><Plus size={15} /> Create task</Button>} />
      </div>

      {/* Productivity Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">Assigned Tasks</p>
            <p className="text-2xl font-extrabold text-text font-mono mt-1">{assignedIssues.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">High Priority</p>
            <p className="text-2xl font-extrabold text-amber-500 font-mono mt-1">{highPriorityCount}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">Worked / Reported</p>
            <p className="text-2xl font-extrabold text-text font-mono mt-1">{reportedIssues.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">Workspace Spaces</p>
            <p className="text-2xl font-extrabold text-text font-mono mt-1">{userProjects.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Folder size={20} />
          </div>
        </div>
      </div>

      {/* AI Daily Action Plan Banner (Renders when active tasks exist) */}
      {assignedIssues.length > 0 && (
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-default tracking-tight flex items-center gap-2">
                  <span>✨ AI Daily Action Plan</span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 uppercase font-mono border border-purple-500/20">
                    Rovo Agent Sync
                  </span>
                </h3>
                <p className="text-xs text-subtle mt-0.5 font-normal">
                  AI-prioritized daily sequence based on task urgency, status, and project deadlines.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setToastMsg("AI Daily Action Plan updated with latest task priorities!");
                setTimeout(() => setToastMsg(null), 3500);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/25 text-xs font-bold hover:bg-purple-500/20 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            >
              <Zap size={13} />
              <span>Re-Analyze Plan</span>
            </button>
          </div>

          {/* Top Focus Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assignedIssues
              .slice()
              .sort((a, b) => {
                const priorityMap: Record<string, number> = { HIGHEST: 4, HIGH: 3, MEDIUM: 2, LOW: 1, LOWEST: 0 };
                const statusMap: Record<string, number> = { IN_PROGRESS: 4, IN_REVIEW: 3, TO_DO: 2, DONE: 1 };
                const pDiff = (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
                if (pDiff !== 0) return pDiff;
                return (statusMap[b.status] || 0) - (statusMap[a.status] || 0);
              })
              .slice(0, 3)
              .map((task, index) => (
                <div
                  key={task.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs gap-2.5 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-mono">
                      Priority #{index + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-text-subtle">{task.key}</span>
                  </div>

                  <Link
                    href={`/projects/${task.project.key}/issues/${task.key}`}
                    className="font-bold text-xs text-text hover:text-brand truncate"
                  >
                    {task.summary}
                  </Link>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span className="font-extrabold text-brand font-mono">{task.status}</span>
                    <Link
                      href={`/projects/${task.project.key}/issues/${task.key}`}
                      className="flex items-center gap-1 font-bold text-purple-600 hover:underline"
                    >
                      <span>Focus Task</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* No Board Alert Banner */}
      {userProjects.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-brand/40 bg-brand/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text">No board found in your workspace</h3>
            <p className="text-xs text-text-subtle mt-0.5">Create your first board to start organizing tasks, tracking progress, and running sprints.</p>
          </div>
          <CreateProjectModal
            trigger={
              <button className="h-10 px-5 rounded-full bg-brand text-white text-xs font-bold hover:bg-brand-hovered transition-all shadow-xs flex items-center gap-2 shrink-0">
                <Plus size={15} />
                Create Board to Continue
              </button>
            }
          />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border text-sm font-semibold text-text-subtle gap-6">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "assigned" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <UserCheck size={16} /> Assigned to me
          <span className="rounded-full bg-neutral px-2.5 py-0.5 text-xs text-text font-mono font-bold">{assignedIssues.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("reported")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "reported" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <Clock size={16} /> Worked / Reported by me
          <span className="rounded-full bg-neutral px-2.5 py-0.5 text-xs text-text font-mono font-bold">{reportedIssues.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "projects" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <Folder size={16} /> Workspace Spaces
          <span className="rounded-full bg-neutral px-2.5 py-0.5 text-xs text-text font-mono font-bold">{userProjects.length}</span>
        </button>
      </div>

      {/* Profile Circles Filter Toolbar */}
      {activeTab !== "projects" && (
        <IssueFilterToolbar
          users={availableUsers}
          selectedUserId={selectedUserId}
          onSelectUser={(id) => {
            setFilterUnassigned(false);
            setSelectedUserId(id);
          }}
          filterUnassigned={filterUnassigned}
          onToggleUnassigned={() => {
            setSelectedUserId(null);
            setFilterUnassigned((prev) => !prev);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Tab Content: Assigned to Me */}
      {activeTab === "assigned" && (
        <div className="flex flex-col gap-3">
          {assignedIssues.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-neutral/20">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="text-base font-bold text-text">No active tasks assigned to you</h3>
              <p className="text-xs text-text-subtle mt-1 mb-4">You&apos;re all caught up! Create a new task or assign existing tasks to yourself.</p>
              <CreateIssueModal trigger={<Button appearance="primary" className="mx-auto bg-brand text-white rounded-full px-4 font-bold">Create First Task</Button>} />
            </div>
          ) : (
            <div className="border border-border rounded-[16px] bg-surface p-4 shadow-xs">
              <IssueTable
                issues={formattedAssigned}
                projectKey={assignedIssues[0]?.project.key ?? "PROJ"}
                availableUsers={availableUsers}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Reported / Worked by Me */}
      {activeTab === "reported" && (
        <div className="flex flex-col gap-3">
          {reportedIssues.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-neutral/20">
              <Clock size={36} className="mx-auto text-text-subtle mb-2" />
              <h3 className="text-base font-bold text-text">No reported tasks yet</h3>
              <p className="text-xs text-text-subtle mt-1">Tasks created by you will appear here.</p>
            </div>
          ) : (
            <div className="border border-border rounded-[16px] bg-surface p-4 shadow-xs">
              <IssueTable
                issues={formattedReported}
                projectKey={reportedIssues[0]?.project.key ?? "PROJ"}
                availableUsers={availableUsers}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Workspace Spaces */}
      {activeTab === "projects" && (
        userProjects.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border p-12 text-center bg-neutral/20">
            <Folder size={36} className="mx-auto text-brand mb-2" />
            <h3 className="text-base font-bold text-text">No board found in your workspace</h3>
            <p className="text-xs text-text-subtle mt-1 mb-4">Create your first board to start managing tasks and collaborating with your team.</p>
            <CreateProjectModal
              trigger={
                <button className="h-10 px-5 mx-auto rounded-full bg-brand text-white text-xs font-bold hover:bg-brand-hovered transition-all shadow-xs flex items-center gap-2">
                  <Plus size={15} />
                  Create Board to Continue
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-[16px] border border-border bg-surface p-4.5 shadow-xs hover:border-brand/50 transition-all gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Folder size={18} />
                    </div>
                    <Link href={`/projects/${p.key}/board`} className="font-extrabold text-sm text-text hover:text-brand truncate">
                      {p.name}
                    </Link>
                  </div>
                  <span className="font-mono bg-neutral px-2 py-0.5 rounded-full text-[11px] font-bold text-text shrink-0">
                    {p.key}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                  <span className="font-semibold text-text-subtle font-mono">{p._count.issues} tasks</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${p.key}/board`}
                      className="p-1.5 text-text-subtle hover:text-brand rounded-md hover:bg-neutral transition-colors"
                      title="Kanban Board"
                    >
                      <Layout size={14} />
                    </Link>
                    <Link
                      href={`/projects/${p.key}/backlog`}
                      className="p-1.5 text-text-subtle hover:text-brand rounded-md hover:bg-neutral transition-colors"
                      title="Sprint Backlog"
                    >
                      <Layers size={14} />
                    </Link>
                    <Link
                      href={`/projects/${p.key}/timeline`}
                      className="p-1.5 text-text-subtle hover:text-brand rounded-md hover:bg-neutral transition-colors"
                      title="Roadmap Timeline"
                    >
                      <Calendar size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}


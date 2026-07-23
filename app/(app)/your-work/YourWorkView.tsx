"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Folder, UserCheck, Plus } from "lucide-react";
import { IssueTable, type IssueListItem } from "@/components/issues/IssueTable";
import { IssueFilterToolbar, type TeammateUser } from "@/components/issues/IssueFilterToolbar";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
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

  const formattedAssigned: IssueListItem[] = filterIssues(assignedIssues).map((i) => ({
    id: i.id,
    key: i.key,
    summary: i.summary,
    type: i.type,
    status: i.status,
    priority: i.priority,
    projectKey: i.project?.key ?? "PRJ",
    assignee: i.assignee,
  }));

  const formattedReported: IssueListItem[] = filterIssues(reportedIssues).map((i) => ({
    id: i.id,
    key: i.key,
    summary: i.summary,
    type: i.type,
    status: i.status,
    priority: i.priority,
    projectKey: i.project?.key ?? "PRJ",
    assignee: i.assignee,
  }));

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Your Work</h1>
          <p className="text-xs text-text-subtle">Welcome back, {userName}. Here is an overview of your active tasks and spaces.</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary" className="bg-brand text-white hover:bg-brand-hovered"><Plus size={15} /> Create issue</Button>} />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border text-sm font-semibold text-text-subtle gap-6 mb-6">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "assigned" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <UserCheck size={16} /> Assigned to me
          <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-text">{assignedIssues.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("reported")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "reported" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <Clock size={16} /> Worked / Reported by me
          <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-text">{reportedIssues.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "projects" ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
          }`}
        >
          <Folder size={16} /> Workspace Spaces
          <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-text">{userProjects.length}</span>
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
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-success mb-2" />
              <h3 className="text-base font-semibold text-text">No active tasks assigned to you</h3>
              <p className="text-xs text-text-subtle mt-1 mb-4">You&apos;re all caught up! Create a new ticket or assign existing issues to yourself.</p>
              <CreateIssueModal trigger={<Button appearance="primary" className="mx-auto bg-brand text-white">Create First Task</Button>} />
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-surface p-4 shadow-xs">
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
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Clock size={32} className="mx-auto text-text-subtle mb-2" />
              <h3 className="text-base font-semibold text-text">No reported issues yet</h3>
              <p className="text-xs text-text-subtle mt-1">Issues created by you will appear here.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-surface p-4 shadow-xs">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {userProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.key}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:border-brand transition-colors"
            >
              <div className="flex items-center gap-2">
                <Folder size={18} className="text-brand shrink-0" />
                <span className="font-bold text-sm text-text truncate">{p.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-subtle mt-2">
                <span className="font-mono bg-neutral px-1.5 py-0.5 rounded">{p.key}</span>
                <span>{p._count.issues} issues</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

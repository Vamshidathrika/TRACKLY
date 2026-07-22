"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Folder, UserCheck, Plus } from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Tag } from "@/components/ui/Tag";
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
}: {
  assignedIssues: UserWorkIssue[];
  reportedIssues: UserWorkIssue[];
  userProjects: UserWorkProject[];
  userName: string;
}) {
  const [activeTab, setActiveTab] = useState<"assigned" | "reported" | "projects">("assigned");

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

      {/* Tab Content: Assigned to Me */}
      {activeTab === "assigned" && (
        <div className="flex flex-col gap-3">
          {assignedIssues.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-success mb-2" />
              <h3 className="text-base font-semibold text-text">No active tasks assigned to you</h3>
              <p className="text-xs text-text-subtle mt-1 mb-4">You're all caught up! Create a new ticket or assign existing issues to yourself.</p>
              <CreateIssueModal trigger={<Button appearance="primary" className="mx-auto bg-brand text-white">Create First Task</Button>} />
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
              {assignedIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/projects/${issue.project.key}/issues/${issue.key}`}
                  className="flex items-center justify-between p-4 hover:bg-neutral/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TypeIcon type={issue.type} size={16} />
                    <span className="font-mono text-xs font-bold text-text-subtle group-hover:text-brand">{issue.key}</span>
                    <span className="text-sm font-semibold text-text truncate">{issue.summary}</span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-text-subtle hidden sm:inline">{issue.project.name}</span>
                    <PriorityIcon priority={issue.priority} size={14} />
                    <Tag appearance={issue.status === "DONE" ? "success" : issue.status === "IN_PROGRESS" ? "brand" : "default"}>
                      {issue.status.replace("_", " ")}
                    </Tag>
                  </div>
                </Link>
              ))}
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
            <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
              {reportedIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/projects/${issue.project.key}/issues/${issue.key}`}
                  className="flex items-center justify-between p-4 hover:bg-neutral/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TypeIcon type={issue.type} size={16} />
                    <span className="font-mono text-xs font-bold text-text-subtle group-hover:text-brand">{issue.key}</span>
                    <span className="text-sm font-semibold text-text truncate">{issue.summary}</span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-text-subtle hidden sm:inline">{issue.project.name}</span>
                    <PriorityIcon priority={issue.priority} size={14} />
                    <Tag appearance={issue.status === "DONE" ? "success" : issue.status === "IN_PROGRESS" ? "brand" : "default"}>
                      {issue.status.replace("_", " ")}
                    </Tag>
                  </div>
                </Link>
              ))}
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

"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { type BoardIssue } from "./IssueCard";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueStatus } from "@prisma/client";

export function KanbanBoard({
  issues: initialIssues,
  currentUserId,
}: {
  issues: BoardIssue[];
  currentUserId?: string;
}) {
  const [issues, setIssues] = useState<BoardIssue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    // Optimistic UI update
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );
    await updateIssueFieldAction(issueId, "status", newStatus);
  };

  const filteredIssues = issues.filter((i) => {
    const matchesSearch =
      i.summary.toLowerCase().includes(search.toLowerCase()) ||
      i.key.toLowerCase().includes(search.toLowerCase());
    const matchesUser = !onlyMine || (currentUserId && i.assignee?.id === currentUserId);
    return matchesSearch && matchesUser;
  });

  const columns: IssueStatus[] = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Filters Header */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search size={14} className="absolute top-2.5 left-2 text-text-subtle" />
          <input
            type="text"
            placeholder="Search board..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-ds border-2 border-border bg-surface pl-7 pr-2 text-sm outline-none transition-colors focus:border-brand"
          />
        </div>

        <button
          onClick={() => setOnlyMine((prev) => !prev)}
          className={`flex h-8 items-center gap-1.5 rounded-ds px-3 text-xs font-semibold transition-colors ${
            onlyMine ? "bg-brand text-white" : "border border-border bg-surface text-text hover:bg-[#EBECF0]"
          }`}
        >
          <Filter size={12} /> Only my issues
        </button>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((colStatus) => (
          <BoardColumn
            key={colStatus}
            status={colStatus}
            issues={filteredIssues.filter((i) => i.status === colStatus)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

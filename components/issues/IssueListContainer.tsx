"use client";

import { useState, useMemo } from "react";
import { IssueFilterToolbar, type TeammateUser } from "./IssueFilterToolbar";
import { IssueTable, type IssueListItem } from "./IssueTable";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";

export function IssueListContainer({
  issues: initialIssues,
  projectKey,
  availableUsers: passedUsers = [],
  title = "Issues",
}: {
  issues: IssueListItem[];
  projectKey: string;
  availableUsers?: TeammateUser[];
  title?: string;
}) {
  const [issues, setIssues] = useState<IssueListItem[]>(initialIssues);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Sync initial issues if count or list changes externally
  const currentIssues = initialIssues.length !== issues.length ? initialIssues : issues;

  // Extract all users from issues + passed users
  const allUsers = useMemo(() => {
    const userMap = new Map<string, TeammateUser>();

    passedUsers.forEach((u) => userMap.set(u.id, u));

    currentIssues.forEach((i) => {
      if (i.assignee) {
        userMap.set(i.assignee.id, {
          id: i.assignee.id,
          name: i.assignee.name,
          avatarUrl: i.assignee.avatarUrl,
        });
      }
    });

    return Array.from(userMap.values());
  }, [currentIssues, passedUsers]);

  const filteredIssues = useMemo(() => {
    return currentIssues.filter((i) => {
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
  }, [currentIssues, searchQuery, filterUnassigned, selectedUserId, statusFilter, priorityFilter, typeFilter]);

  const handleClearFilters = () => {
    setSelectedUserId(null);
    setFilterUnassigned(false);
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
        <h2 className="text-base font-bold text-text">
          {title} ({filteredIssues.length})
        </h2>
      </div>

      {/* Top Filter Toolbar with Teammates Profile Circles */}
      <IssueFilterToolbar
        users={allUsers}
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

      {/* Interactive Table with Status, Priority, Assignee & Type Dropdowns */}
      <IssueTable
        issues={filteredIssues}
        projectKey={projectKey}
        availableUsers={allUsers}
        onStatusChange={(id, newStatus) => {
          setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
        }}
        onPriorityChange={(id, newPriority) => {
          setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, priority: newPriority } : i)));
        }}
        onTypeChange={(id, newType) => {
          setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, type: newType } : i)));
        }}
        onAssigneeChange={(id, assigneeId) => {
          const u = allUsers.find((user) => user.id === assigneeId);
          setIssues((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, assignee: u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl } : null } : i
            )
          );
        }}
      />
    </div>
  );
}

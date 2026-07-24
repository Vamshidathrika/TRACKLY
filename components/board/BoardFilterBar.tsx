"use client";

import { memo } from "react";
import { Search, Filter, UserCheck, Layers, LayoutGrid, List as ListIcon, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type BoardUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
};

type BoardFilterBarProps = {
  search: string;
  onSearchChange: (val: string) => void;
  boardUsers: BoardUser[];
  selectedUserId: string | null;
  onSelectUser: (id: string | null) => void;
  myIssuesOnly: boolean;
  onToggleMyIssues: () => void;
  filterUnassigned: boolean;
  onToggleUnassigned: () => void;
  filterType: string;
  onFilterTypeChange: (val: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (val: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
  groupBy: "None" | "Assignee" | "Priority";
  onGroupByChange: (val: "None" | "Assignee" | "Priority") => void;
};

function BoardFilterBarComponent({
  search,
  onSearchChange,
  boardUsers,
  selectedUserId,
  onSelectUser,
  myIssuesOnly,
  onToggleMyIssues,
  filterUnassigned,
  onToggleUnassigned,
  filterType,
  onFilterTypeChange,
  filterPriority,
  onFilterPriorityChange,
  onClearFilters,
  hasActiveFilters,
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
}: BoardFilterBarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-3 border-b border-border/60">
      {/* Left side: Search & Avatar Filters */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Search input */}
        <div className="relative w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues…"
            className="w-full h-8 pl-8 pr-3 text-xs bg-surface border border-border rounded-lg outline-none focus:border-brand transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* User Avatars Filter Row */}
        <div className="flex items-center gap-1 pl-1">
          {boardUsers.slice(0, 5).map((u) => {
            const isSelected = selectedUserId === u.id;
            return (
              <button
                key={u.id}
                onClick={() => onSelectUser(isSelected ? null : u.id)}
                title={`Filter by: ${u.name}`}
                className={`relative rounded-full transition-transform hover:scale-105 ${
                  isSelected ? "ring-2 ring-brand ring-offset-1 scale-105" : "opacity-80 hover:opacity-100"
                }`}
              >
                <Avatar name={u.name} src={u.avatarUrl} size={26} />
              </button>
            );
          })}
        </div>

        {/* "Only My Issues" quick filter */}
        <button
          onClick={onToggleMyIssues}
          className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
            myIssuesOnly
              ? "bg-brand/10 border-brand text-brand"
              : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
          }`}
        >
          <UserCheck size={13} /> Only my issues
        </button>

        {/* "Unassigned" quick filter */}
        <button
          onClick={onToggleUnassigned}
          className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
            filterUnassigned
              ? "bg-brand/10 border-brand text-brand"
              : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
          }`}
        >
          Unassigned
        </button>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="h-8 px-2.5 text-xs bg-surface border border-border rounded-lg outline-none text-text-subtle font-medium cursor-pointer"
        >
          <option value="ALL">All Types</option>
          <option value="STORY">Story</option>
          <option value="TASK">Task</option>
          <option value="BUG">Bug</option>
          <option value="EPIC">Epic</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => onFilterPriorityChange(e.target.value)}
          className="h-8 px-2.5 text-xs bg-surface border border-border rounded-lg outline-none text-text-subtle font-medium cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="HIGHEST">Highest</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="LOWEST">Lowest</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="h-8 px-2.5 text-xs font-semibold text-danger hover:bg-danger/10 rounded-lg transition-colors flex items-center gap-1"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Right side: Group By & View Switcher */}
      <div className="flex items-center gap-2">
        {/* Group By selector */}
        <div className="flex items-center gap-1.5 text-xs text-text-subtle font-medium">
          <Layers size={13} />
          <span>Group:</span>
          <select
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as "None" | "Assignee" | "Priority")}
            className="h-8 px-2 bg-surface border border-border rounded-lg text-xs outline-none text-text font-semibold cursor-pointer"
          >
            <option value="None">None</option>
            <option value="Assignee">Assignee</option>
            <option value="Priority">Priority</option>
          </select>
        </div>

        {/* Board vs List view toggle */}
        <div className="flex bg-surface border border-border rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("board")}
            title="Board View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "board" ? "bg-brand text-white font-semibold" : "text-text-subtle hover:text-text"
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            title="List View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list" ? "bg-brand text-white font-semibold" : "text-text-subtle hover:text-text"
            }`}
          >
            <ListIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export const BoardFilterBar = memo(BoardFilterBarComponent);

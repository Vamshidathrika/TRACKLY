"use client";

import { useState } from "react";
import { Search, Filter, User, X, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";

export type TeammateUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

// Dynamic initials generator
function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// User avatar color generator
const userColorPalette = [
  "bg-blue-600 border-blue-700 text-white",
  "bg-sky-600 border-sky-700 text-white",
  "bg-slate-800 border-slate-900 text-white",
  "bg-indigo-700 border-indigo-800 text-white",
  "bg-amber-600 border-amber-700 text-white",
  "bg-teal-600 border-teal-700 text-white",
  "bg-purple-600 border-purple-700 text-white",
  "bg-emerald-600 border-emerald-700 text-white",
];

function getUserColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % userColorPalette.length;
  return userColorPalette[idx];
}

export function IssueFilterToolbar({
  users = [],
  selectedUserId,
  onSelectUser,
  filterUnassigned = false,
  onToggleUnassigned,
  searchQuery = "",
  onSearchChange,
  statusFilter = "ALL",
  onStatusFilterChange,
  priorityFilter = "ALL",
  onPriorityFilterChange,
  typeFilter = "ALL",
  onTypeFilterChange,
  onClearFilters,
}: {
  users?: TeammateUser[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  filterUnassigned?: boolean;
  onToggleUnassigned?: () => void;
  searchQuery?: string;
  onSearchChange?: (search: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  priorityFilter?: string;
  onPriorityFilterChange?: (priority: string) => void;
  typeFilter?: string;
  onTypeFilterChange?: (type: string) => void;
  onClearFilters?: () => void;
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const activeFilterCount =
    (selectedUserId ? 1 : 0) +
    (filterUnassigned ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (priorityFilter !== "ALL" ? 1 : 0) +
    (typeFilter !== "ALL" ? 1 : 0);

  const displayedUsers = Array.from(
    new Map(users.map((u) => [(u.name || u.id).toLowerCase().trim(), u])).values()
  ).slice(0, 7);
  const extraUserCount = Math.max(0, users.length - displayedUsers.length);

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Teammates Profile Circles & Filters Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Teammates Profile Circles Header */}
          {(displayedUsers.length > 0 || onToggleUnassigned) && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-subtle mr-1 hidden sm:inline">Teammates:</span>

              {/* Unassigned Avatar Circle */}
              {onToggleUnassigned && (
                <button
                  onClick={onToggleUnassigned}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all border ${
                    filterUnassigned
                      ? "bg-slate-800 text-white border-slate-900 ring-2 ring-brand ring-offset-1 scale-110 shadow-md"
                      : "bg-neutral text-text-subtle border-border hover:bg-neutral-hovered hover:scale-105"
                  }`}
                  title="Filter Unassigned Tickets"
                >
                  <User size={14} />
                </button>
              )}

              {/* Teammates Profile Circles */}
              {displayedUsers.map((usr) => {
                const isSelected = selectedUserId === usr.id;
                const userColor = getUserColor(usr.name || usr.id);
                return (
                  <button
                    key={usr.id}
                    onClick={() => onSelectUser(isSelected ? null : usr.id)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all border shadow-xs ${userColor} ${
                      isSelected
                        ? "ring-2 ring-brand ring-offset-2 border-brand scale-110 z-10 shadow-md"
                        : "hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100"
                    }`}
                    title={`Show tickets for ${usr.name}`}
                  >
                    {usr.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={usr.avatarUrl} alt={usr.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(usr.name)
                    )}
                    {isSelected && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-1 ring-white" />
                    )}
                  </button>
                );
              })}

              {extraUserCount > 0 && (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral text-xs font-bold text-text-subtle border border-border"
                  title={`${extraUserCount} more team members`}
                >
                  +{extraUserCount}
                </span>
              )}
            </div>
          )}

          {/* Active User Filter Badge if selected */}
          {selectedUserId && (
            <div className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded-full text-xs font-semibold border border-brand/20">
              <span>{users.find((u) => u.id === selectedUserId)?.name || "Selected User"}</span>
              <button onClick={() => onSelectUser(null)} className="hover:text-brand-hovered">
                <X size={12} />
              </button>
            </div>
          )}

          {filterUnassigned && (
            <div className="flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-xs font-semibold border border-slate-300">
              <span>Unassigned only</span>
              <button onClick={onToggleUnassigned} className="hover:text-slate-900">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right Side Search & Quick Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          {onSearchChange && (
            <div className="relative">
              <Search size={14} className="absolute top-2.5 left-2.5 text-text-subtle" />
              <input
                type="text"
                placeholder="Filter tickets..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 w-44 rounded-md border border-border bg-surface pl-8 pr-2.5 text-xs outline-none transition-all focus:w-60 focus:border-brand"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute top-2.5 right-2 text-text-subtle hover:text-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Status Select Filter */}
          {onStatusFilterChange && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text outline-none focus:border-brand cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="TO_DO">TO DO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="DONE">DONE</option>
            </select>
          )}

          {/* Priority Select Filter */}
          {onPriorityFilterChange && (
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text outline-none focus:border-brand cursor-pointer hidden md:inline-block"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGHEST">Highest</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="LOWEST">Lowest</option>
            </select>
          )}

          {/* Type Select Filter */}
          {onTypeFilterChange && (
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text outline-none focus:border-brand cursor-pointer hidden lg:inline-block"
            >
              <option value="ALL">All Types</option>
              <option value="STORY">Story</option>
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="EPIC">Epic</option>
            </select>
          )}

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="h-8 px-2.5 rounded-md text-xs font-semibold text-brand bg-brand/10 border border-brand/20 hover:bg-brand/20 transition-colors flex items-center gap-1"
            >
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, Bookmark, SlidersHorizontal, Code, Share2, Globe, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IssueTable, type IssueListItem } from "@/components/issues/IssueTable";
import { IssueFilterToolbar, type TeammateUser } from "@/components/issues/IssueFilterToolbar";
import { getJQLSuggestions } from "@/lib/jql";
import { executeJQLQueryAction, saveFilterAction } from "@/app/(app)/filters/actions";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type JQLIssue = {
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

export type SavedFilterItem = {
  id: string;
  name: string;
  jql: string;
  visibility?: string;
};

export function JQLNavigator({
  initialJql = "",
  initialIssues = [],
  savedFilters: initialSaved = [],
  availableUsers = [],
}: {
  initialJql?: string;
  initialIssues?: JQLIssue[];
  savedFilters?: SavedFilterItem[];
  availableUsers?: TeammateUser[];
}) {
  const [jql, setJql] = useState(initialJql);
  const [issues, setIssues] = useState<JQLIssue[]>(initialIssues);
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<"PRIVATE" | "PROJECT" | "WORKSPACE">("WORKSPACE");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [builderMode, setBuilderMode] = useState<"VISUAL" | "RAW">("VISUAL");

  // Visual Builder State
  const [visualProject, setVisualProject] = useState<string>("");
  const [visualStatus, setVisualStatus] = useState<string>("");
  const [visualType, setVisualType] = useState<string>("");
  const [visualPriority, setVisualPriority] = useState<string>("");

  // Client side quick filters state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const buildJQLFromVisual = (proj: string, st: string, ty: string, pr: string) => {
    const parts: string[] = [];
    if (proj) parts.push(`project = "${proj}"`);
    if (st) parts.push(`status = "${st}"`);
    if (ty) parts.push(`type = "${ty}"`);
    if (pr) parts.push(`priority = "${pr}"`);
    return parts.join(" AND ");
  };

  const handleVisualChange = (field: "project" | "status" | "type" | "priority", value: string) => {
    let p = visualProject, s = visualStatus, t = visualType, pr = visualPriority;
    if (field === "project") { p = value; setVisualProject(value); }
    if (field === "status") { s = value; setVisualStatus(value); }
    if (field === "type") { t = value; setVisualType(value); }
    if (field === "priority") { pr = value; setVisualPriority(value); }

    const constructed = buildJQLFromVisual(p, s, t, pr);
    setJql(constructed);
  };

  const handleSearch = async (queryToRun = jql) => {
    const res = await executeJQLQueryAction(queryToRun);
    setIssues(res);
    setShowSuggestions(false);
  };

  const handleInputChange = (val: string) => {
    setJql(val);
    const suggs = getJQLSuggestions(val);
    setSuggestions(suggs);
    setShowSuggestions(suggs.length > 0);
  };

  const applySuggestion = (sugg: string) => {
    const parts = jql.trim().split(/\s+/);
    parts.pop();
    const newJql = (parts.length > 0 ? parts.join(" ") + " " : "") + sugg;
    setJql(newJql);
    setShowSuggestions(false);
  };

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) return;
    setIsSaving(true);
    const res = await saveFilterAction(filterName, jql);
    if (res.filter) {
      setSavedFilters([{ ...res.filter, visibility: filterVisibility }, ...savedFilters]);
      setFilterName("");
      setShowSaveModal(false);
    }
    setIsSaving(false);
  };

  const filteredIssues = issues.filter((i) => {
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

  const handleClearFilters = () => {
    setSelectedUserId(null);
    setFilterUnassigned(false);
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
    setVisualProject("");
    setVisualStatus("");
    setVisualType("");
    setVisualPriority("");
    setJql("");
  };

  const formattedIssues: IssueListItem[] = filteredIssues.map((i) => ({
    id: i.id,
    key: i.key,
    summary: i.summary,
    type: i.type,
    status: i.status,
    priority: i.priority,
    projectKey: i.project.key,
    assignee: i.assignee,
  }));

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Search Header Mode Toggle & Search Control */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text uppercase tracking-wider">Query Mode:</span>
            <div className="flex items-center rounded-lg bg-neutral p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setBuilderMode("VISUAL")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  builderMode === "VISUAL" ? "bg-surface text-brand shadow-xs" : "text-text-subtle hover:text-text"
                }`}
              >
                <SlidersHorizontal size={13} /> Visual Builder
              </button>
              <button
                type="button"
                onClick={() => setBuilderMode("RAW")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  builderMode === "RAW" ? "bg-surface text-brand shadow-xs" : "text-text-subtle hover:text-text"
                }`}
              >
                <Code size={13} /> JQL Syntax
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              appearance="subtle"
              onClick={() => setShowSaveModal(true)}
              disabled={!jql.trim()}
              className="border border-border bg-surface text-xs font-semibold flex items-center gap-1.5"
            >
              <Share2 size={13} /> Share & Save Filter
            </Button>
            <Button appearance="primary" onClick={() => handleSearch()} className="text-xs font-bold">
              Run Search
            </Button>
          </div>
        </div>

        {/* Visual Builder Mode Controls */}
        {builderMode === "VISUAL" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-text-subtle uppercase block mb-1">Project Key</label>
              <input
                type="text"
                placeholder="e.g. SOU, TES"
                value={visualProject}
                onChange={(e) => handleVisualChange("project", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-subtle uppercase block mb-1">Status</label>
              <select
                value={visualStatus}
                onChange={(e) => handleVisualChange("status", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              >
                <option value="">Any Status</option>
                <option value="TO_DO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-subtle uppercase block mb-1">Issue Type</label>
              <select
                value={visualType}
                onChange={(e) => handleVisualChange("type", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              >
                <option value="">Any Type</option>
                <option value="TASK">Task</option>
                <option value="STORY">Story</option>
                <option value="BUG">Bug</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-subtle uppercase block mb-1">Priority</label>
              <select
                value={visualPriority}
                onChange={(e) => handleVisualChange("priority", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              >
                <option value="">Any Priority</option>
                <option value="HIGHEST">Highest</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        )}

        {/* RAW JQL Input Control */}
        {builderMode === "RAW" && (
          <div className="relative pt-1">
            <Search size={16} className="absolute top-4 left-3 text-text-subtle" />
            <input
              type="text"
              placeholder='Try JQL: project = "TES" AND status = IN_PROGRESS'
              value={jql}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-4 text-xs font-mono outline-none focus:border-brand"
            />
            {showSuggestions && (
              <div className="absolute top-12 left-0 z-50 w-72 rounded-md border border-border bg-surface shadow-md p-2">
                <span className="text-[10px] font-bold text-text-subtle uppercase block mb-1">Suggestions</span>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="rounded bg-neutral px-2 py-0.5 font-mono text-xs font-semibold text-default hover:bg-brand hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save & Share Filter Modal Drawer */}
      {showSaveModal && (
        <form onSubmit={handleSaveFilter} className="flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/5 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-brand/20 pb-2">
            <h3 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark size={14} /> Save & Share Filter View
            </h3>
            <span className="text-[11px] font-mono text-text-subtle truncate max-w-xs">{jql}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">Filter Title</label>
              <input
                type="text"
                placeholder="e.g. Active High Priority Sprint Bugs"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">Sharing & Visibility Scope</label>
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
              >
                <option value="WORKSPACE">🌐 Shared with Workspace Members</option>
                <option value="PROJECT">📁 Shared with Project Team</option>
                <option value="PRIVATE">🔒 Private (Only Me)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button appearance="subtle" type="button" onClick={() => setShowSaveModal(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button appearance="primary" type="submit" disabled={isSaving} className="h-8 text-xs font-bold">
              Save Filter
            </Button>
          </div>
        </form>
      )}

      {/* Saved Filters Chips */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-subtle">Saved Filters:</span>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setJql(f.jql);
                  handleSearch(f.jql);
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text hover:border-brand hover:text-brand transition-colors shadow-2xs"
              >
                <Bookmark size={12} className="text-brand" /> {f.name}
                {f.visibility === "PRIVATE" ? <Lock size={10} className="text-text-subtle" /> : <Globe size={10} className="text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Circles Filter Toolbar */}
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

      {/* Search Results Table with Dropdowns */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
          <span className="text-sm font-bold text-text">
            Matching Issues ({formattedIssues.length})
          </span>
        </div>

        <IssueTable
          issues={formattedIssues}
          projectKey={formattedIssues[0]?.projectKey ?? "PROJ"}
          availableUsers={availableUsers}
        />
      </div>
    </div>
  );
}

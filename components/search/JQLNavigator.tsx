"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bookmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
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
};

export function JQLNavigator({
  initialJql = "",
  initialIssues = [],
  savedFilters: initialSaved = [],
}: {
  initialJql?: string;
  initialIssues?: JQLIssue[];
  savedFilters?: SavedFilterItem[];
}) {
  const [jql, setJql] = useState(initialJql);
  const [issues, setIssues] = useState<JQLIssue[]>(initialIssues);
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    parts.pop(); // replace last incomplete token
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
      setSavedFilters([res.filter, ...savedFilters]);
      setFilterName("");
      setShowSaveModal(false);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Search Bar & Actions Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute top-3 left-3 text-text-subtle" />
            <input
              type="text"
              placeholder='Try JQL: project = DEMO AND status = IN_PROGRESS or summary ~ "login"'
              value={jql}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10 w-full rounded-ds border-2 border-border bg-surface pl-9 pr-4 text-sm font-mono outline-none transition-colors focus:border-brand"
            />
          </div>

          <Button appearance="primary" onClick={() => handleSearch()}>
            Search
          </Button>

          <Button
            appearance="subtle"
            onClick={() => setShowSaveModal(true)}
            disabled={!jql.trim()}
            className="border border-border bg-surface"
          >
            <Bookmark size={14} /> Save filter
          </Button>
        </div>

        {/* Autocomplete Suggestions Box */}
        {showSuggestions && (
          <div className="absolute top-11 left-0 z-50 w-72 rounded-ds border border-border bg-surface shadow-md p-1.5">
            <span className="px-2 text-[10px] font-bold text-text-subtle uppercase">Suggestions</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
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

      {/* Save Filter Modal */}
      {showSaveModal && (
        <form onSubmit={handleSaveFilter} className="flex items-center gap-3 rounded-ds border border-brand/40 bg-selected/30 p-3">
          <span className="text-xs font-semibold text-text">Filter name:</span>
          <input
            type="text"
            placeholder="e.g. Open High Priority Bugs"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="h-8 flex-1 rounded-ds border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
          />
          <Button appearance="primary" type="submit" disabled={isSaving} className="h-8 text-xs">
            Save
          </Button>
          <Button appearance="subtle" type="button" onClick={() => setShowSaveModal(false)} className="h-8 text-xs">
            Cancel
          </Button>
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
                className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text hover:border-brand hover:text-brand transition-colors"
              >
                <Bookmark size={12} className="text-brand" /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Table */}
      <div className="rounded-ds border border-border bg-surface overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-3 border-b border-border bg-surface-sunken">
          <span className="text-xs font-bold text-text-subtle">
            Matching Issues ({issues.length})
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-subtle italic">
            No issues match the search query. Try modifying your JQL terms.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-subtle font-semibold">
                <th className="p-3">Type</th>
                <th className="p-3">Key</th>
                <th className="p-3">Summary</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-neutral transition-colors">
                  <td className="p-3">
                    <TypeIcon type={issue.type} size={14} />
                  </td>
                  <td className="p-3 font-mono font-semibold">
                    <Link href={`/projects/${issue.project.key}/issues/${issue.key}`} className="hover:text-brand">
                      {issue.key}
                    </Link>
                  </td>
                  <td className="p-3 font-medium text-text">
                    <Link href={`/projects/${issue.project.key}/issues/${issue.key}`} className="hover:underline">
                      {issue.summary}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Tag>{issue.status.replace("_", " ")}</Tag>
                  </td>
                  <td className="p-3">
                    <PriorityIcon priority={issue.priority} size={14} />
                  </td>
                  <td className="p-3">
                    <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={20} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

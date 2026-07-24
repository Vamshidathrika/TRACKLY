"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import { BoardHeader } from "./BoardHeader";
import { BoardFilterBar } from "./BoardFilterBar";
import { BoardColumn } from "./BoardColumn";
import { IssueDetailDrawer } from "./IssueDetailDrawer";
import { IssueTable } from "@/components/issues/IssueTable";
import { type BoardIssue } from "./IssueCard";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { toggleStarAction } from "@/app/(app)/chrome-actions";
import type { IssueStatus } from "@prisma/client";

// Dynamically import heavy secondary views & modals to cut initial bundle size
const SummaryView = dynamic(() => import("./SpaceViews").then((m) => m.SummaryView), { ssr: false });
const TimelineView = dynamic(() => import("./SpaceViews").then((m) => m.TimelineView), { ssr: false });
const CalendarView = dynamic(() => import("./SpaceViews").then((m) => m.CalendarView), { ssr: false });
const DevView = dynamic(() => import("./SpaceViews").then((m) => m.DevView), { ssr: false });
const CodeView = dynamic(() => import("./SpaceViews").then((m) => m.CodeView), { ssr: false });
const AutomationModal = dynamic(() => import("./SpaceViews").then((m) => m.AutomationModal), { ssr: false });
const AIAssistantDrawer = dynamic(() => import("./SpaceViews").then((m) => m.AIAssistantDrawer), { ssr: false });

export type SprintOption = {
  id: string;
  name: string;
  goal?: string | null;
  status: "ACTIVE" | "FUTURE" | "CLOSED";
  startDate?: Date | null;
  endDate?: Date | null;
  issues?: BoardIssue[];
};

export function KanbanBoard({
  issues: initialIssues,
  sprints = [],
  availableUsers = [],
  currentUserId,
  projectName = "Board",
  projectKey = "PROJ",
  projectId,
  isStarred: initialIsStarred = false,
}: {
  issues: BoardIssue[];
  sprints?: SprintOption[];
  availableUsers?: { id: string; name: string; avatarUrl?: string | null }[];
  currentUserId?: string;
  projectName?: string;
  projectKey?: string;
  projectId?: string;
  isStarred?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [isStarred, setIsStarred] = useState(initialIsStarred);
  const [issues, setIssues] = useState<BoardIssue[]>(initialIssues);

  // Selected issue for Jira slide-over detail drawer
  const [selectedIssue, setSelectedIssue] = useState<BoardIssue | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [myIssuesOnly, setMyIssuesOnly] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const [groupBy, setGroupBy] = useState<"None" | "Assignee" | "Priority">("None");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [activeTab, setActiveTab] = useState("Board");

  // Modals state
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const boardUsers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatarUrl?: string | null; initials: string; color: string }
    >();

    availableUsers.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        initials: u.name.slice(0, 2).toUpperCase(),
        color: "bg-brand text-white",
      });
    });

    issues.forEach((i) => {
      if (i.assignee && !map.has(i.assignee.id)) {
        map.set(i.assignee.id, {
          id: i.assignee.id,
          name: i.assignee.name,
          avatarUrl: i.assignee.avatarUrl,
          initials: i.assignee.name.slice(0, 2).toUpperCase(),
          color: "bg-brand text-white",
        });
      }
    });

    return Array.from(map.values());
  }, [availableUsers, issues]);

  const handleToggleStar = async () => {
    setShowSpaceMenu(false);
    if (!projectId) return;
    const res = await toggleStarAction(projectId);
    setIsStarred(Boolean(res?.starred));
    showToast(res?.starred ? "Project starred" : "Project unstarred");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Board link copied to clipboard!");
    }
  };

  const handleExport = () => {
    setShowSpaceMenu(false);
    const payload = {
      project: { key: projectKey, name: projectName },
      exportedAt: new Date().toISOString(),
      issues: filteredIssues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectKey}-board-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredIssues.length} issues as JSON`);
  };

  const handleFullscreen = () => {
    if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Optimistic Status Change Handler
  const handleStatusChange = useCallback((issueId: string, newStatus: IssueStatus) => {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "status", newStatus);
    });
  }, []);

  // Optimistic Assignee Change Handler
  const handleAssigneeChange = useCallback((issueId: string, assigneeId: string | null) => {
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id !== issueId) return i;
        const target = availableUsers.find((u) => u.id === assigneeId);
        return {
          ...i,
          assignee: target ? { id: target.id, name: target.name, avatarUrl: target.avatarUrl } : null,
        };
      })
    );
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "assigneeId", assigneeId || "");
    });
  }, [availableUsers]);

  // Update issue from Slide Drawer
  const handleUpdateIssue = useCallback((updated: BoardIssue) => {
    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedIssue(updated);
  }, []);

  // Delete issue from Slide Drawer
  const handleDeleteIssue = useCallback((issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedUserId(null);
    setMyIssuesOnly(false);
    setFilterUnassigned(false);
    setFilterType("ALL");
    setFilterPriority("ALL");
  }, []);

  const hasActiveFilters = Boolean(
    search || selectedUserId || myIssuesOnly || filterUnassigned || filterType !== "ALL" || filterPriority !== "ALL"
  );

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesKey = i.key.toLowerCase().includes(q);
        const matchesSummary = i.summary.toLowerCase().includes(q);
        if (!matchesKey && !matchesSummary) return false;
      }

      if (myIssuesOnly && currentUserId) {
        if (i.assignee?.id !== currentUserId) return false;
      }

      if (filterUnassigned) {
        if (i.assignee != null) return false;
      } else if (selectedUserId) {
        if (i.assignee?.id !== selectedUserId) return false;
      }

      if (filterType !== "ALL" && i.type !== filterType) return false;
      if (filterPriority !== "ALL" && i.priority !== filterPriority) return false;

      return true;
    });
  }, [issues, search, myIssuesOnly, currentUserId, filterUnassigned, selectedUserId, filterType, filterPriority]);

  const issuesByStatus = useMemo(() => {
    return {
      TO_DO: filteredIssues.filter((i) => i.status === "TO_DO"),
      IN_PROGRESS: filteredIssues.filter((i) => i.status === "IN_PROGRESS"),
      IN_REVIEW: filteredIssues.filter((i) => i.status === "IN_REVIEW"),
      DONE: filteredIssues.filter((i) => i.status === "DONE"),
    };
  }, [filteredIssues]);

  const mainTabs = ["Board", "Summary", "Timeline", "Calendar", "Dev", "Code"];

  return (
    <div className="flex flex-1 flex-col overflow-hidden max-w-full">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Board Header */}
      <BoardHeader
        projectName={projectName}
        projectKey={projectKey}
        isStarred={isStarred}
        onToggleStar={handleToggleStar}
        onShare={handleShare}
        onExport={handleExport}
        onFullscreen={handleFullscreen}
        onToggleAIDrawer={() => setShowAIDrawer((v) => !v)}
        onOpenSpaceMenu={() => setShowSpaceMenu((v) => !v)}
        showSpaceMenu={showSpaceMenu}
      />

      {/* Secondary Tab Navigation Bar */}
      <div className="flex items-center gap-6 border-b border-border text-xs font-semibold text-text-subtle pt-2">
        {mainTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === tab ? "border-brand text-brand font-bold" : "border-transparent hover:text-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Primary Board View */}
      {activeTab === "Board" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filter Toolbar */}
          <BoardFilterBar
            search={search}
            onSearchChange={setSearch}
            boardUsers={boardUsers}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            myIssuesOnly={myIssuesOnly}
            onToggleMyIssues={() => setMyIssuesOnly((v) => !v)}
            filterUnassigned={filterUnassigned}
            onToggleUnassigned={() => setFilterUnassigned((v) => !v)}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterPriority={filterPriority}
            onFilterPriorityChange={setFilterPriority}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />

          {/* Kanban Columns Grid OR List View */}
          {viewMode === "board" ? (
            <div className="flex-1 overflow-x-auto overflow-y-hidden py-4">
              <div className="flex gap-4 h-full min-w-max pb-2">
                <BoardColumn
                  status="TO_DO"
                  issues={issuesByStatus.TO_DO}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onSelectIssue={setSelectedIssue}
                  availableUsers={boardUsers}
                  currentUserId={currentUserId}
                  projectId={projectId}
                  projectKey={projectKey}
                  onQuickCreated={(newIssue) => setIssues((prev) => [newIssue, ...prev])}
                />
                <BoardColumn
                  status="IN_PROGRESS"
                  issues={issuesByStatus.IN_PROGRESS}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onSelectIssue={setSelectedIssue}
                  availableUsers={boardUsers}
                  currentUserId={currentUserId}
                  projectId={projectId}
                  projectKey={projectKey}
                  onQuickCreated={(newIssue) => setIssues((prev) => [newIssue, ...prev])}
                />
                <BoardColumn
                  status="IN_REVIEW"
                  issues={issuesByStatus.IN_REVIEW}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onSelectIssue={setSelectedIssue}
                  availableUsers={boardUsers}
                  currentUserId={currentUserId}
                  projectId={projectId}
                  projectKey={projectKey}
                  onQuickCreated={(newIssue) => setIssues((prev) => [newIssue, ...prev])}
                />
                <BoardColumn
                  status="DONE"
                  issues={issuesByStatus.DONE}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onSelectIssue={setSelectedIssue}
                  availableUsers={boardUsers}
                  currentUserId={currentUserId}
                  projectId={projectId}
                  projectKey={projectKey}
                  onQuickCreated={(newIssue) => setIssues((prev) => [newIssue, ...prev])}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4">
              <IssueTable
                issues={filteredIssues.map((i) => ({ ...i, projectKey }))}
                projectKey={projectKey}
                availableUsers={availableUsers}
              />
            </div>
          )}
        </div>
      )}

      {/* Lazy Loaded Secondary Views */}
      {activeTab === "Summary" && <SummaryView issues={issues} projectName={projectName} />}
      {activeTab === "Timeline" && <TimelineView issues={issues} />}
      {activeTab === "Calendar" && <CalendarView issues={issues} />}
      {activeTab === "Dev" && <DevView />}
      {activeTab === "Code" && <CodeView />}

      {/* Modals & Drawers */}
      {showAutomationModal && (
        <AutomationModal isOpen={showAutomationModal} onClose={() => setShowAutomationModal(false)} />
      )}
      {showAIDrawer && (
        <AIAssistantDrawer isOpen={showAIDrawer} onClose={() => setShowAIDrawer(false)} />
      )}

      {/* Jira Slide-Over Issue Detail Drawer */}
      {selectedIssue && (
        <IssueDetailDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdateIssue={handleUpdateIssue}
          onDeleteIssue={handleDeleteIssue}
          availableUsers={availableUsers}
        />
      )}
    </div>
  );
}

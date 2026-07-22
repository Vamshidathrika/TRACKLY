"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Share2,
  Zap,
  MessageSquare,
  Maximize2,
  MoreHorizontal,
  Plus,
  LineChart,
  Sliders,
  X,
  Lightbulb,
  Check,
  ChevronDown,
  User,
  Layers,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { type BoardIssue } from "./IssueCard";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { toggleStarAction } from "@/app/(app)/chrome-actions";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { IssueTable } from "@/components/issues/IssueTable";
import {
  SummaryView,
  TimelineView,
  CalendarView,
  FormsView,
  DevView,
  CodeView,
  AutomationModal,
  InviteModal,
  AddViewModal,
  AIAssistantDrawer,
} from "./SpaceViews";
import { Button } from "@/components/ui/Button";
import type { IssueStatus, IssueType, IssuePriority } from "@prisma/client";

// Dynamic initials generator
function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// Dynamic color palette generator
const userColorPalette = [
  "bg-blue-600 border-blue-700 text-white",
  "bg-sky-600 border-sky-700 text-white",
  "bg-slate-800 border-slate-900 text-white",
  "bg-indigo-900 border-indigo-950 text-white",
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

export function KanbanBoard({
  issues: initialIssues,
  currentUserId,
  projectName = "My Kanban Space",
  projectKey = "DEMO",
  projectId,
  isStarred: initialIsStarred = false,
}: {
  issues: BoardIssue[];
  currentUserId?: string;
  projectName?: string;
  projectKey?: string;
  projectId?: string;
  isStarred?: boolean;
}) {
  const [isStarred, setIsStarred] = useState(initialIsStarred);
  const [issues, setIssues] = useState<BoardIssue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const [groupBy, setGroupBy] = useState<"None" | "Assignee" | "Priority">("None");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [activeTab, setActiveTab] = useState("Board");

  // Modals & Drawers state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showAddViewModal, setShowAddViewModal] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const [showMoreTabsMenu, setShowMoreTabsMenu] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom tabs added via + button
  const [extraTabs, setExtraTabs] = useState<string[]>([]);

  // Close open dropdowns on outside clicks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowGroupDropdown(false);
        setShowFilterDropdown(false);
        setShowMoreTabsMenu(false);
        setShowSpaceMenu(false);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 100% Dynamic extraction of board users from actual issues & default team
  const boardUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatarUrl?: string | null; initials: string; color: string }>();

    issues.forEach((i) => {
      if (i.assignee) {
        map.set(i.assignee.id, {
          id: i.assignee.id,
          name: i.assignee.name,
          avatarUrl: i.assignee.avatarUrl,
          initials: getInitials(i.assignee.name),
          color: getUserColor(i.assignee.name || i.assignee.id),
        });
      }
      if (i.reporter) {
        map.set(i.reporter.id, {
          id: i.reporter.id,
          name: i.reporter.name,
          avatarUrl: i.reporter.avatarUrl,
          initials: getInitials(i.reporter.name),
          color: getUserColor(i.reporter.name || i.reporter.id),
        });
      }
    });

    const defaultTeam = [
      { id: "user-vd", name: "Vikram Dev" },
      { id: "user-ns", name: "Nani Sharma" },
      { id: "user-nk", name: "Neha Kumar" },
      { id: "user-ss", name: "Swati Sen" },
      { id: "user-sa", name: "Sameer Agarwal" },
    ];

    defaultTeam.forEach((d) => {
      if (!map.has(d.id)) {
        map.set(d.id, {
          id: d.id,
          name: d.name,
          initials: getInitials(d.name),
          color: getUserColor(d.name),
        });
      }
    });

    return Array.from(map.values());
  }, [issues]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Space link copied to clipboard!");
    }
  };

  const handleToggleStar = async () => {
    setShowSpaceMenu(false);
    if (!projectId) return;
    const res = await toggleStarAction(projectId);
    setIsStarred(Boolean(res?.starred));
    showToast(res?.starred ? "Space starred" : "Space unstarred");
  };

  const handleExport = () => {
    setShowSpaceMenu(false);
    // Export what the board is actually showing, respecting active filters.
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

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );
    await updateIssueFieldAction(issueId, "status", newStatus);
  };

  const handleAssigneeChange = async (issueId: string, assigneeId: string | null) => {
    const targetUser = boardUsers.find((u) => u.id === assigneeId);
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId
          ? { ...i, assignee: targetUser ? { id: targetUser.id, name: targetUser.name, avatarUrl: targetUser.avatarUrl } : null }
          : i
      )
    );
    showToast(targetUser ? `Reassigned ticket to ${targetUser.name}` : "Set ticket to Unassigned");
    await updateIssueFieldAction(issueId, "assigneeId", assigneeId ?? "");
  };

  const filteredIssues = issues.filter((i) => {
    const matchesSearch =
      i.summary.toLowerCase().includes(search.toLowerCase()) ||
      i.key.toLowerCase().includes(search.toLowerCase());

    let matchesUser = true;
    if (filterUnassigned) {
      matchesUser = !i.assignee;
    } else if (selectedUserId) {
      matchesUser = i.assignee?.id === selectedUserId || i.reporter?.id === selectedUserId;
    }

    const matchesType = filterType === "ALL" || i.type === filterType;
    const matchesPriority = filterPriority === "ALL" || i.priority === filterPriority;

    return matchesSearch && matchesUser && matchesType && matchesPriority;
  });

  const columns: IssueStatus[] = ["TO_DO", "IN_PROGRESS", "DONE"];

  const mainTabs = [
    "Summary",
    "Timeline",
    "Board",
    "Calendar",
    "List",
    "Forms",
    "Development",
    "Code",
    ...extraTabs,
  ];

  const moreTabOptions = ["Reports & Analytics", "Release Notes", "Archived Issues"];

  // Calculate active filter count for badge [ ☰ N ]
  const activeFilterCount =
    (selectedUserId ? 1 : 0) +
    (filterUnassigned ? 1 : 0) +
    (filterType !== "ALL" ? 1 : 0) +
    (filterPriority !== "ALL" ? 1 : 0) +
    (search ? 1 : 0);

  const displayedUsers = boardUsers.slice(0, 5);
  const extraUserCount = Math.max(0, boardUsers.length - 5);

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-100px)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg animate-in fade-in duration-200">
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals & Drawers */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
      <AutomationModal isOpen={showAutomationModal} onClose={() => setShowAutomationModal(false)} />
      <AddViewModal
        isOpen={showAddViewModal}
        onClose={() => setShowAddViewModal(false)}
        onAdd={(name) => {
          setExtraTabs((prev) => [...prev, name]);
          setActiveTab(name);
          showToast(`Added custom view: ${name}`);
        }}
      />
      <AIAssistantDrawer isOpen={showAIDrawer} onClose={() => setShowAIDrawer(false)} />

      {/* 1. Spaces & Project Context Sub-Header */}
      <div className="flex flex-col gap-1.5 pb-3">
        <span className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">SPACES</span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 relative dropdown-container">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-selected text-selected-text">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text">{projectName}</h2>

            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-md p-1 hover:bg-neutral-hovered transition-colors"
              title="Invite team members"
            >
              <User size={16} className="text-text-subtle" />
            </button>

            <button
              onClick={() => setShowSpaceMenu((prev) => !prev)}
              className="rounded-md p-1 hover:bg-neutral-hovered transition-colors"
              title="More space options"
            >
              <MoreHorizontal size={16} className="text-text-subtle" />
            </button>

            {showSpaceMenu && (
              <div className="absolute top-9 left-36 z-30 w-48 rounded-md border border-border bg-surface py-1 shadow-lg text-xs">
                <button
                  onClick={() => {
                    setShowSpaceMenu(false);
                    navigator.clipboard.writeText(projectKey);
                    showToast(`Copied Project Key: ${projectKey}`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-hovered text-text font-medium"
                >
                  Copy Key ({projectKey})
                </button>
                <button
                  onClick={handleToggleStar}
                  disabled={!projectId}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-hovered text-text font-medium disabled:opacity-50"
                >
                  {isStarred ? "Unstar Space" : "Star Space"}
                </button>
                <button
                  onClick={handleExport}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-hovered text-text font-medium border-t border-border"
                >
                  Export Space Data
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="flex h-8 items-center gap-1.5 rounded bg-neutral px-3 text-xs font-semibold text-text hover:bg-neutral-hovered transition-colors"
              title="Share space link"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              onClick={() => setShowAutomationModal(true)}
              className="flex h-8 items-center gap-1.5 rounded bg-neutral px-3 text-xs font-semibold text-text hover:bg-neutral-hovered transition-colors"
              title="Manage automation rules"
            >
              <Zap size={13} /> Automation
            </button>
            <button
              onClick={() => setShowAIDrawer((prev) => !prev)}
              className={`flex h-8 items-center justify-center rounded w-8 h-8 transition-colors ${
                showAIDrawer ? "bg-brand text-white" : "bg-neutral hover:bg-neutral-hovered text-text-subtle"
              }`}
              title="AI Assistant Chat"
            >
              <MessageSquare size={14} />
            </button>
            <button
              onClick={handleFullscreen}
              className="flex h-8 items-center justify-center rounded bg-neutral w-8 h-8 hover:bg-neutral-hovered text-text-subtle transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation bar */}
      <div className="flex items-center justify-between border-b border-border mb-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 pb-2.5 text-xs font-semibold transition-all relative whitespace-nowrap ${
                  isActive ? "text-brand font-bold" : "text-text-subtle hover:text-text"
                }`}
              >
                {tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand rounded-t" />
                )}
              </button>
            );
          })}

          <div className="relative dropdown-container">
            <button
              onClick={() => setShowMoreTabsMenu((prev) => !prev)}
              className="flex items-center gap-1 px-3 pb-2.5 text-xs font-semibold text-text-subtle hover:text-text transition-colors whitespace-nowrap"
            >
              More {moreTabOptions.length} <ChevronDown size={12} />
            </button>

            {showMoreTabsMenu && (
              <div className="absolute top-8 left-0 z-30 w-44 rounded-md border border-border bg-surface py-1 shadow-lg text-xs">
                {moreTabOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setActiveTab(opt);
                      setShowMoreTabsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-hovered text-text font-medium"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddViewModal(true)}
            className="px-3 pb-2.5 text-xs font-bold text-text-subtle hover:text-text transition-colors"
            title="Add view or tab"
          >
            +
          </button>
        </div>
      </div>

      {/* 3. Render Active Tab View Content */}
      {activeTab === "Board" && (
        <>
          {/* Dynamic Filter Controls Toolbar (Matching Image 02) */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input field */}
              <div className="relative">
                <Search size={14} className="absolute top-2.5 left-2.5 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Search board..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-40 rounded border border-border bg-surface pl-8 pr-2.5 text-xs outline-none transition-all focus:w-56 focus:border-brand"
                />
              </div>

              {/* Unassigned Bubble Filter */}
              <button
                onClick={() => {
                  setFilterUnassigned((prev) => !prev);
                  setSelectedUserId(null);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all border ${
                  filterUnassigned
                    ? "bg-slate-700 text-white border-slate-900 ring-2 ring-brand ring-offset-1 scale-105"
                    : "bg-neutral text-text-subtle border-border hover:bg-neutral-hovered"
                }`}
                title="Filter Unassigned Issues"
              >
                <User size={13} />
              </button>

              {/* DYNAMIC USER AVATAR BUBBLES (Extracted 100% dynamically from users/tickets!) */}
              <div className="flex items-center gap-1">
                {displayedUsers.map((usr) => {
                  const isSelected = selectedUserId === usr.id;
                  return (
                    <button
                      key={usr.id}
                      onClick={() => {
                        setFilterUnassigned(false);
                        setSelectedUserId((prev) => (prev === usr.id ? null : usr.id));
                      }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all border shadow-xs ${usr.color} ${
                        isSelected
                          ? "ring-2 ring-brand ring-offset-1 border-brand scale-110 z-10"
                          : "hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100"
                      }`}
                      title={`Filter tickets for ${usr.name}`}
                    >
                      {usr.initials}
                    </button>
                  );
                })}

                {extraUserCount > 0 && (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral text-[11px] font-bold text-text-subtle border border-border"
                    title={`${extraUserCount} more team members`}
                  >
                    +{extraUserCount}
                  </span>
                )}
              </div>

              {/* Active Filter Counter Badge Button [ ☰ N ] (Matching Image 02!) */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowFilterDropdown((prev) => !prev)}
                  className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-all ${
                    activeFilterCount > 0
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/30"
                      : "border-border bg-surface text-text hover:bg-neutral-hovered"
                  }`}
                >
                  <Filter size={13} />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Options Dropdown Panel */}
                {showFilterDropdown && (
                  <div className="absolute top-9 left-0 z-40 w-56 rounded-md border border-border bg-surface p-3 shadow-xl text-xs flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-bold text-text">Filter Board</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedUserId(null);
                            setFilterUnassigned(false);
                            setFilterType("ALL");
                            setFilterPriority("ALL");
                            setSearch("");
                          }}
                          className="text-[11px] text-brand hover:underline font-semibold"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-subtle uppercase mb-1">Issue Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full h-7 rounded border border-border bg-surface px-2 outline-none"
                      >
                        <option value="ALL">All Types</option>
                        <option value="STORY">Story</option>
                        <option value="TASK">Task</option>
                        <option value="BUG">Bug</option>
                        <option value="EPIC">Epic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-subtle uppercase mb-1">Priority</label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full h-7 rounded border border-border bg-surface px-2 outline-none"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="HIGHEST">Highest</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Group Dropdown [ 📚 Group ] (Matching Image 02!) */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowGroupDropdown((prev) => !prev)}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-text hover:bg-neutral-hovered transition-colors"
                >
                  <Layers size={13} className="text-text-subtle" />
                  <span>Group: <strong className="text-brand">{groupBy}</strong></span>
                  <ChevronDown size={12} />
                </button>

                {showGroupDropdown && (
                  <div className="absolute top-9 left-0 z-40 w-40 rounded-md border border-border bg-surface py-1 shadow-xl text-xs">
                    {(["None", "Assignee", "Priority"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setGroupBy(opt);
                          setShowGroupDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-neutral-hovered text-text font-medium ${
                          groupBy === opt ? "bg-selected/40 font-bold" : ""
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Mode Toggles [ 🍱 ] [ 📄 ] */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded-md border border-border bg-neutral p-0.5">
                <button
                  onClick={() => setViewMode("board")}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs transition-colors ${
                    viewMode === "board" ? "bg-surface text-brand shadow-xs font-bold" : "text-text-subtle hover:text-text"
                  }`}
                  title="Board View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs transition-colors ${
                    viewMode === "list" ? "bg-surface text-brand shadow-xs font-bold" : "text-text-subtle hover:text-text"
                  }`}
                  title="List View"
                >
                  <ListIcon size={14} />
                </button>
              </div>

              <button className="flex h-8 items-center justify-center rounded bg-neutral w-8 h-8 hover:bg-neutral-hovered text-text-subtle">
                <Sliders size={14} />
              </button>
            </div>
          </div>

          {/* 4. Kanban Board Content (Board Grid vs List View) */}
          {viewMode === "list" ? (
            <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
              <IssueTable
                issues={filteredIssues.map((i) => ({
                  ...i,
                  type: (i.type ?? "TASK") as IssueType,
                  priority: (i.priority ?? "MEDIUM") as IssuePriority,
                  storyPoints: i.storyPoints ?? null,
                  projectKey,
                }))}
                projectKey={projectKey}
                onAssigneeChange={handleAssigneeChange}
                availableUsers={boardUsers}
              />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6">
              {columns.map((colStatus) => (
                <div key={colStatus} className="flex flex-col gap-2">
                  <BoardColumn
                    status={colStatus}
                    issues={filteredIssues.filter((i) => i.status === colStatus)}
                    onStatusChange={handleStatusChange}
                    onAssigneeChange={handleAssigneeChange}
                    availableUsers={boardUsers}
                    currentUserId={currentUserId}
                  />

                  <div className="px-1 mt-1">
                    <CreateIssueModal
                      trigger={
                        <button className="flex w-full items-center gap-1.5 rounded-md py-1.5 px-2.5 text-xs font-semibold text-text-subtle hover:bg-neutral-hovered hover:text-text transition-colors">
                          <span className="text-sm font-bold">+</span> Create
                        </button>
                      }
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-start pt-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border bg-neutral text-text-subtle hover:bg-neutral-hovered hover:text-text transition-all hover:border-brand">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "Summary" && <SummaryView issues={issues} projectName={projectName} />}
      {activeTab === "Timeline" && <TimelineView issues={issues} />}
      {activeTab === "Calendar" && <CalendarView issues={issues} />}
      {activeTab === "List" && (
        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <IssueTable
            issues={issues.map((i) => ({
              ...i,
              type: (i.type ?? "TASK") as IssueType,
              priority: (i.priority ?? "MEDIUM") as IssuePriority,
              storyPoints: i.storyPoints ?? null,
              projectKey,
            }))}
            projectKey={projectKey}
            onAssigneeChange={handleAssigneeChange}
            availableUsers={boardUsers}
          />
        </div>
      )}
      {activeTab === "Forms" && <FormsView projectName={projectName} />}
      {activeTab === "Development" && <DevView />}
      {activeTab === "Code" && <CodeView />}

      {!["Board", "Summary", "Timeline", "Calendar", "List", "Forms", "Development", "Code"].includes(activeTab) && (
        <SummaryView issues={issues} projectName={projectName} />
      )}

    </div>
  );
}



"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import {
  Search,
  Filter,
  Share2,
  Zap,
  MessageSquare,
  Maximize2,
  MoreHorizontal,
  Plus,
  Sliders,
  ChevronDown,
  User,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Check,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  Target,
} from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { type BoardIssue } from "./IssueCard";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { completeSprintAction } from "@/app/(app)/projects/[key]/backlog/actions";
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
import { Avatar } from "@/components/ui/Avatar";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";

// Dynamic initials generator
function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

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

  // Board Mode: 'scrum' or 'kanban'
  const [boardType, setBoardType] = useState<"scrum" | "kanban">("kanban");

  // Selected Sprint in Scrum mode
  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === "ACTIVE") ?? sprints[0],
    [sprints]
  );
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(
    activeSprint?.id ?? null
  );

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

  const [extraTabs, setExtraTabs] = useState<string[]>([]);

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
        initials: getInitials(u.name),
        color: getUserColor(u.name || u.id),
      });
    });

    issues.forEach((i) => {
      if (i.assignee && !map.has(i.assignee.id)) {
        map.set(i.assignee.id, {
          id: i.assignee.id,
          name: i.assignee.name,
          avatarUrl: i.assignee.avatarUrl,
          initials: getInitials(i.assignee.name),
          color: getUserColor(i.assignee.name || i.assignee.id),
        });
      }
    });

    return Array.from(map.values());
  }, [availableUsers, issues]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Board link copied to clipboard!");
    }
  };

  const handleToggleStar = async () => {
    setShowSpaceMenu(false);
    if (!projectId) return;
    const res = await toggleStarAction(projectId);
    setIsStarred(Boolean(res?.starred));
    showToast(res?.starred ? "Project starred" : "Project unstarred");
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

  const handleStatusChange = (issueId: string, newStatus: IssueStatus) => {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "status", newStatus);
    });
  };

  const handleAssigneeChange = (issueId: string, assigneeId: string | null) => {
    const targetUser = boardUsers.find((u) => u.id === assigneeId);
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId
          ? {
              ...i,
              assignee: targetUser
                ? { id: targetUser.id, name: targetUser.name, avatarUrl: targetUser.avatarUrl }
                : null,
            }
          : i
      )
    );
    showToast(targetUser ? `Reassigned ticket to ${targetUser.name}` : "Set ticket to Unassigned");
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "assigneeId", assigneeId ?? "");
    });
  };

  const handleQuickCreated = (newIssue: BoardIssue) => {
    setIssues((prev) => [newIssue, ...prev.filter((i) => i.id !== newIssue.id)]);
    showToast(`Created issue ${newIssue.key}`);
  };

  const currentSprintObj = useMemo(() => {
    return sprints.find((s) => s.id === selectedSprintId) ?? activeSprint;
  }, [sprints, selectedSprintId, activeSprint]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      // In Scrum Mode, filter to selected sprint
      if (boardType === "scrum" && currentSprintObj) {
        // match sprintId if present
        if (i.sprintId && i.sprintId !== currentSprintObj.id) return false;
      }

      const matchesSearch =
        !search ||
        i.summary.toLowerCase().includes(search.toLowerCase()) ||
        i.key.toLowerCase().includes(search.toLowerCase());

      let matchesUser = true;
      if (myIssuesOnly && currentUserId) {
        matchesUser = i.assignee?.id === currentUserId;
      } else if (filterUnassigned) {
        matchesUser = !i.assignee;
      } else if (selectedUserId) {
        matchesUser = i.assignee?.id === selectedUserId || i.reporter?.id === selectedUserId;
      }

      const matchesType = filterType === "ALL" || i.type === filterType;
      const matchesPriority = filterPriority === "ALL" || i.priority === filterPriority;

      return matchesSearch && matchesUser && matchesType && matchesPriority;
    });
  }, [
    issues,
    boardType,
    currentSprintObj,
    search,
    myIssuesOnly,
    currentUserId,
    filterUnassigned,
    selectedUserId,
    filterType,
    filterPriority,
  ]);

  const columns: IssueStatus[] = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  const mainTabs = [
    "Board",
    "Summary",
    "Timeline",
    "Calendar",
    "List",
    "Forms",
    "Development",
    "Code",
    ...extraTabs,
  ];

  const moreTabOptions = ["Reports & Analytics", "Release Notes", "Archived Issues"];

  const activeFilterCount =
    (selectedUserId ? 1 : 0) +
    (myIssuesOnly ? 1 : 0) +
    (filterUnassigned ? 1 : 0) +
    (filterType !== "ALL" ? 1 : 0) +
    (filterPriority !== "ALL" ? 1 : 0) +
    (search ? 1 : 0);

  const displayedUsers = boardUsers.slice(0, 5);
  const extraUserCount = Math.max(0, boardUsers.length - 5);

  // Calculate Scrum progress
  const scrumTotalPoints = filteredIssues.reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
  const scrumDonePoints = filteredIssues
    .filter((i) => i.status === "DONE")
    .reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
  const scrumPct = scrumTotalPoints > 0 ? Math.round((scrumDonePoints / scrumTotalPoints) * 100) : 0;

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-100px)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[12px] bg-[#1C1C1E]/95 backdrop-blur-md px-4 py-3 text-[13px] font-semibold text-white shadow-xl animate-toast flex items-center gap-2.5 border border-white/10">
          <Check size={15} className="text-[#30D158] shrink-0" />
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

      {/* 1. Project Context Sub-Header */}
      <div className="flex flex-col gap-1 pb-3">
        <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest">Project</span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 relative dropdown-container">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand/10 text-brand font-bold text-[15px]">
              {projectName[0]?.toUpperCase() ?? "P"}
            </div>
            <h2 className="text-[18px] font-bold text-default tracking-tight">{projectName}</h2>
            {isStarred && <span title="Starred" className="text-warning">★</span>}

            <button
              onClick={() => setShowSpaceMenu((prev) => !prev)}
              className="rounded-[6px] p-1.5 text-subtle hover:bg-neutral hover:text-default transition-all"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>

            {showSpaceMenu && (
              <div className="absolute top-10 left-20 z-30 w-52 rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl py-1.5 shadow-lg text-[13px] animate-fade-in-down">
                <button
                  onClick={() => {
                    setShowSpaceMenu(false);
                    navigator.clipboard.writeText(projectKey);
                    showToast(`Copied project key: ${projectKey}`);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-neutral text-default font-medium transition-colors"
                >
                  Copy key ({projectKey})
                </button>
                <button
                  onClick={handleToggleStar}
                  disabled={!projectId}
                  className="w-full text-left px-3.5 py-2 hover:bg-neutral text-default font-medium transition-colors disabled:opacity-50"
                >
                  {isStarred ? "Remove from starred" : "Add to starred"}
                </button>
                <div className="border-t border-border-default my-1" />
                <button
                  onClick={handleExport}
                  className="w-full text-left px-3.5 py-2 hover:bg-neutral text-default font-medium transition-colors"
                >
                  Export as JSON
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Board Type Switch: Scrum vs Kanban */}
            <div className="flex items-center rounded-[8px] border border-border-default bg-neutral p-0.5 mr-2">
              <button
                onClick={() => setBoardType("kanban")}
                className={`flex h-7 items-center gap-1 px-2.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                  boardType === "kanban"
                    ? "bg-surface text-brand shadow-xs"
                    : "text-subtle hover:text-default"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setBoardType("scrum")}
                className={`flex h-7 items-center gap-1 px-2.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                  boardType === "scrum"
                    ? "bg-surface text-brand shadow-xs"
                    : "text-subtle hover:text-default"
                }`}
              >
                <Flame size={13} />
                <span>Scrum Board</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="flex h-8 items-center gap-1.5 rounded-[8px] border border-border-default bg-surface px-3 text-[12px] font-semibold text-subtle hover:bg-neutral hover:text-default transition-all"
              title="Share space link"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              onClick={() => setShowAutomationModal(true)}
              className="flex h-8 items-center gap-1.5 rounded-[8px] border border-border-default bg-surface px-3 text-[12px] font-semibold text-subtle hover:bg-neutral hover:text-default transition-all"
              title="Manage automation rules"
            >
              <Zap size={13} /> Automation
            </button>
            <button
              onClick={() => setShowAIDrawer((prev) => !prev)}
              className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition-all ${
                showAIDrawer
                  ? "bg-brand border-brand text-white"
                  : "border-border-default bg-surface text-subtle hover:bg-neutral hover:text-default"
              }`}
              title="AI PM Co-Pilot"
            >
              <MessageSquare size={14} />
            </button>
            <button
              onClick={handleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border-default bg-surface text-subtle hover:bg-neutral hover:text-default transition-all"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation bar */}
      <div className="flex items-center justify-between border-b border-border-default mb-4">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap ${
                  isActive ? "text-brand font-semibold" : "text-subtle hover:text-default"
                }`}
              >
                {tab}
                {isActive && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand rounded-full" />}
              </button>
            );
          })}

          <div className="relative dropdown-container">
            <button
              onClick={() => setShowMoreTabsMenu((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium text-subtle hover:text-default transition-colors whitespace-nowrap"
            >
              More <ChevronDown size={12} />
            </button>

            {showMoreTabsMenu && (
              <div className="absolute top-10 left-0 z-30 w-52 rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl py-1.5 shadow-lg text-[13px] animate-fade-in-down">
                {moreTabOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setActiveTab(opt);
                      setShowMoreTabsMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral text-default font-medium transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddViewModal(true)}
            className="px-3 py-2.5 text-[13px] font-medium text-subtlest hover:text-brand transition-colors"
            title="Add custom view"
          >
            +
          </button>
        </div>
      </div>

      {/* Scrum Active Sprint Banner (when in Scrum Mode) */}
      {activeTab === "Board" && boardType === "scrum" && (
        <div className="mb-4 rounded-[14px] border border-border-default bg-surface p-4 shadow-xs animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand/10 text-brand">
                <Flame size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-default">
                    {currentSprintObj ? currentSprintObj.name : "Active Sprint"}
                  </span>
                  {currentSprintObj && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        currentSprintObj.status === "ACTIVE"
                          ? "bg-brand/10 text-brand"
                          : "bg-neutral text-subtle"
                      }`}
                    >
                      {currentSprintObj.status}
                    </span>
                  )}
                </div>
                {currentSprintObj?.goal && (
                  <p className="text-[12px] text-subtle italic flex items-center gap-1 mt-0.5">
                    <Target size={11} className="text-brand" /> {currentSprintObj.goal}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sprint selector */}
              {sprints.length > 1 && (
                <select
                  value={selectedSprintId ?? ""}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="h-8 rounded-[8px] border border-border-default bg-surface px-2.5 text-[12px] font-semibold text-default outline-none hover:bg-neutral cursor-pointer"
                >
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              )}

              {currentSprintObj?.status === "ACTIVE" && (
                <button
                  onClick={async () => {
                    await completeSprintAction(currentSprintObj.id);
                    showToast(`Completed ${currentSprintObj.name}!`);
                  }}
                  className="h-8 px-3 rounded-[8px] border border-border-default bg-surface text-[12px] font-semibold text-success hover:bg-success/10 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Complete sprint
                </button>
              )}
            </div>
          </div>

          {/* Sprint Velocity / Burnup Bar */}
          <div className="flex items-center gap-4 border-t border-border-default pt-3 text-[12px]">
            <div className="flex-1">
              <div className="flex items-center justify-between text-subtle font-medium mb-1">
                <span>Sprint Progress</span>
                <span className="font-semibold text-default">
                  {scrumDonePoints}/{scrumTotalPoints} points ({scrumPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                <div
                  style={{ width: `${scrumPct}%` }}
                  className="h-full rounded-full bg-brand transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Active Tab View Content */}
      {activeTab === "Board" && (
        <>
          {/* Dynamic Filter Controls Toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input field */}
              <div className="relative">
                <Search size={14} className="absolute top-2.5 left-2.5 text-subtlest" />
                <input
                  type="text"
                  placeholder="Search board…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-40 rounded-[8px] border border-border-default bg-surface pl-8 pr-2.5 text-[13px] text-default outline-none transition-all focus:w-56 focus:border-brand placeholder:text-subtlest"
                />
              </div>

              {/* Only My Issues 1-Click Filter Button */}
              {currentUserId && (
                <button
                  onClick={() => {
                    setMyIssuesOnly((prev) => !prev);
                    setSelectedUserId(null);
                    setFilterUnassigned(false);
                  }}
                  className={`h-8 px-3 rounded-[8px] border text-[12px] font-semibold transition-all ${
                    myIssuesOnly
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/30"
                      : "border-border-default bg-surface text-subtle hover:bg-neutral hover:text-default"
                  }`}
                >
                  Only my issues
                </button>
              )}

              {/* Unassigned Filter Bubble */}
              <button
                onClick={() => {
                  setFilterUnassigned((prev) => !prev);
                  setSelectedUserId(null);
                  setMyIssuesOnly(false);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-all border ${
                  filterUnassigned
                    ? "bg-slate-700 text-white border-slate-900 ring-2 ring-brand"
                    : "bg-neutral text-subtle border-border-default hover:bg-neutral-hovered"
                }`}
                title="Filter Unassigned Issues"
              >
                <User size={13} />
              </button>

              {/* Teammate Avatar Filter Circles */}
              <div className="flex items-center gap-1">
                {displayedUsers.map((usr) => {
                  const isSelected = selectedUserId === usr.id;
                  return (
                    <button
                      key={usr.id}
                      onClick={() => {
                        setFilterUnassigned(false);
                        setMyIssuesOnly(false);
                        setSelectedUserId((prev) => (prev === usr.id ? null : usr.id));
                      }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all border shadow-xs ${usr.color} ${
                        isSelected
                          ? "ring-2 ring-brand ring-offset-1 border-brand scale-110 z-10"
                          : "hover:scale-105 opacity-90 hover:opacity-100"
                      }`}
                      title={`Filter tickets for ${usr.name}`}
                    >
                      {usr.initials}
                    </button>
                  );
                })}

                {extraUserCount > 0 && (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral text-[11px] font-bold text-subtle border border-border-default"
                    title={`${extraUserCount} more team members`}
                  >
                    +{extraUserCount}
                  </span>
                )}
              </div>

              {/* Filter Counter Dropdown */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowFilterDropdown((prev) => !prev)}
                  className={`flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-semibold transition-all ${
                    activeFilterCount > 0
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/30"
                      : "border-border-default bg-surface text-subtle hover:bg-neutral hover:text-default"
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

                {showFilterDropdown && (
                  <div className="absolute top-10 left-0 z-40 w-56 rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl p-3 shadow-lg text-[12px] flex flex-col gap-3 animate-fade-in-down">
                    <div className="flex items-center justify-between border-b border-border-default pb-2">
                      <span className="font-bold text-default">Filter Board</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedUserId(null);
                            setMyIssuesOnly(false);
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
                      <label className="block text-[10px] font-bold text-subtlest uppercase mb-1">Issue Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full h-8 rounded-[6px] border border-border-default bg-surface px-2 outline-none text-[12px]"
                      >
                        <option value="ALL">All Types</option>
                        <option value="STORY">Story</option>
                        <option value="TASK">Task</option>
                        <option value="BUG">Bug</option>
                        <option value="EPIC">Epic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-subtlest uppercase mb-1">Priority</label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full h-8 rounded-[6px] border border-border-default bg-surface px-2 outline-none text-[12px]"
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

              {/* Swimlanes / Grouping Dropdown */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowGroupDropdown((prev) => !prev)}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-border-default bg-surface px-3 text-[12px] font-semibold text-subtle hover:bg-neutral hover:text-default transition-all"
                >
                  <Layers size={13} className="text-subtle" />
                  <span>Group: <strong className="text-brand">{groupBy}</strong></span>
                  <ChevronDown size={12} />
                </button>

                {showGroupDropdown && (
                  <div className="absolute top-10 left-0 z-40 w-44 rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl py-1.5 shadow-lg text-[13px] animate-fade-in-down">
                    {(["None", "Assignee", "Priority"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setGroupBy(opt);
                          setShowGroupDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-neutral text-default font-medium transition-colors ${
                          groupBy === opt ? "bg-brand/10 text-brand font-semibold" : ""
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Mode Toggles [ Board ] [ List ] */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded-[8px] border border-border-default bg-neutral p-0.5">
                <button
                  onClick={() => setViewMode("board")}
                  className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-xs transition-colors ${
                    viewMode === "board" ? "bg-surface text-brand shadow-xs font-bold" : "text-subtle hover:text-default"
                  }`}
                  title="Board View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-xs transition-colors ${
                    viewMode === "list" ? "bg-surface text-brand shadow-xs font-bold" : "text-subtle hover:text-default"
                  }`}
                  title="List View"
                >
                  <ListIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Kanban / Swimlane Board Content */}
          {viewMode === "list" ? (
            <div className="rounded-[14px] border border-border-default bg-surface p-4 shadow-xs">
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
          ) : groupBy === "None" ? (
            /* Standard Column Layout */
            <div className="flex gap-4 overflow-x-auto pb-6">
              {columns.map((colStatus) => (
                <BoardColumn
                  key={colStatus}
                  status={colStatus}
                  issues={filteredIssues.filter((i) => i.status === colStatus)}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  availableUsers={boardUsers}
                  currentUserId={currentUserId}
                  wipLimit={boardType === "kanban" && colStatus === "IN_PROGRESS" ? 5 : null}
                  projectId={projectId}
                  projectKey={projectKey}
                  sprintId={currentSprintObj?.id}
                  onQuickCreated={handleQuickCreated}
                />
              ))}
            </div>
          ) : groupBy === "Assignee" ? (
            /* Swimlanes grouped by Assignee */
            <div className="flex flex-col gap-6 overflow-x-auto pb-6">
              {[...boardUsers, { id: "unassigned", name: "Unassigned", avatarUrl: null }].map((usr) => {
                const groupIssues = filteredIssues.filter((i) =>
                  usr.id === "unassigned" ? !i.assignee : i.assignee?.id === usr.id
                );
                if (groupIssues.length === 0) return null;

                return (
                  <div key={usr.id} className="flex flex-col gap-2 rounded-[14px] border border-border-default bg-surface p-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-default">
                      <Avatar name={usr.name} src={usr.avatarUrl} size={24} />
                      <span className="font-bold text-[14px] text-default">{usr.name}</span>
                      <span className="text-[12px] font-semibold text-subtlest font-mono">({groupIssues.length})</span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pt-2">
                      {columns.map((colStatus) => (
                        <BoardColumn
                          key={colStatus}
                          status={colStatus}
                          issues={groupIssues.filter((i) => i.status === colStatus)}
                          onStatusChange={handleStatusChange}
                          onAssigneeChange={handleAssigneeChange}
                          availableUsers={boardUsers}
                          currentUserId={currentUserId}
                          projectId={projectId}
                          projectKey={projectKey}
                          sprintId={currentSprintObj?.id}
                          onQuickCreated={handleQuickCreated}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Swimlanes grouped by Priority */
            <div className="flex flex-col gap-6 overflow-x-auto pb-6">
              {(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const).map((prio) => {
                const groupIssues = filteredIssues.filter((i) => i.priority === prio);
                if (groupIssues.length === 0) return null;

                return (
                  <div key={prio} className="flex flex-col gap-2 rounded-[14px] border border-border-default bg-surface p-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-default">
                      <span className="font-bold text-[14px] text-default capitalize">{prio.toLowerCase()} Priority</span>
                      <span className="text-[12px] font-semibold text-subtlest font-mono">({groupIssues.length})</span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pt-2">
                      {columns.map((colStatus) => (
                        <BoardColumn
                          key={colStatus}
                          status={colStatus}
                          issues={groupIssues.filter((i) => i.status === colStatus)}
                          onStatusChange={handleStatusChange}
                          onAssigneeChange={handleAssigneeChange}
                          availableUsers={boardUsers}
                          currentUserId={currentUserId}
                          projectId={projectId}
                          projectKey={projectKey}
                          sprintId={currentSprintObj?.id}
                          onQuickCreated={handleQuickCreated}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "Summary" && <SummaryView issues={issues} projectName={projectName} />}
      {activeTab === "Timeline" && <TimelineView issues={issues} />}
      {activeTab === "Calendar" && <CalendarView issues={issues} />}
      {activeTab === "List" && (
        <div className="rounded-[14px] border border-border-default bg-surface p-4 shadow-xs">
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
      {activeTab === "Forms" && (
        <FormsView projectName={projectName} projectId={projectId} projectKey={projectKey} />
      )}
      {activeTab === "Development" && <DevView />}
      {activeTab === "Code" && <CodeView />}

      {!["Board", "Summary", "Timeline", "Calendar", "List", "Forms", "Development", "Code"].includes(activeTab) && (
        <SummaryView issues={issues} projectName={projectName} />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Share2,
  Zap,
  MessageSquare,
  Maximize2,
  MoreHorizontal,
  Plus,
  UserPlus,
  LineChart,
  Sliders,
  X,
  Lightbulb,
  Check,
  Sparkles,
} from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { type BoardIssue } from "./IssueCard";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { IssueStatus } from "@prisma/client";

export function KanbanBoard({
  issues: initialIssues,
  currentUserId,
  projectName = "My Kanban Space",
  projectKey = "DEMO",
}: {
  issues: BoardIssue[];
  currentUserId?: string;
  projectName?: string;
  projectKey?: string;
}) {
  const [issues, setIssues] = useState<BoardIssue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [showQuickstart, setShowQuickstart] = useState(true);
  const [activeTab, setActiveTab] = useState("Board");

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
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

  const columns: IssueStatus[] = ["TO_DO", "IN_PROGRESS", "DONE"];

  const tabs = [
    "Summary",
    "Timeline",
    "Board",
    "Calendar",
    "List",
    "Forms",
    "Development",
    "Code",
    "More 3",
  ];

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-100px)]">
      {/* 1. Spaces & Project Context Sub-Header */}
      <div className="flex flex-col gap-1.5 pb-3">
        <span className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">Spaces</span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Space Bucket Icon */}
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#DEEBFF] text-brand">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text">{projectName}</h2>
            <button className="rounded-md p-1 hover:bg-[#EBECF0]">
              <UserPlus size={16} className="text-text-subtle" />
            </button>
            <button className="rounded-md p-1 hover:bg-[#EBECF0]">
              <MoreHorizontal size={16} className="text-text-subtle" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="flex h-8 items-center gap-1.5 rounded bg-[#F4F5F7] px-3 text-xs font-semibold text-text hover:bg-[#EBECF0]">
              <Share2 size={13} /> Share
            </button>
            <button className="flex h-8 items-center gap-1.5 rounded bg-[#F4F5F7] px-3 text-xs font-semibold text-text hover:bg-[#EBECF0]">
              <Zap size={13} /> Automation
            </button>
            <button className="flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0]">
              <MessageSquare size={14} className="text-text-subtle" />
            </button>
            <button className="flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0]">
              <Maximize2 size={14} className="text-text-subtle" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation bar */}
      <div className="flex items-center justify-between border-b border-border mb-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 pb-2.5 text-xs font-semibold transition-all relative ${
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
          <button className="px-3 pb-2.5 text-xs font-bold text-text-subtle hover:text-text">+</button>
        </div>
      </div>

      {/* 3. Filter Controls Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Magnifying glass button and field */}
          <div className="relative">
            <Search size={14} className="absolute top-2.5 left-2.5 text-text-subtle" />
            <input
              type="text"
              placeholder="Search board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded border border-border bg-surface pl-8 pr-2.5 text-xs outline-none transition-all focus:w-60 focus:border-brand"
            />
          </div>

          {/* User initials bubble button */}
          <button
            onClick={() => setOnlyMine((prev) => !prev)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all border ${
              onlyMine
                ? "bg-brand text-white border-brand ring-2 ring-brand/20 scale-105"
                : "bg-[#0052CC] text-white border-transparent hover:scale-105"
            }`}
            title="Filter by my issues"
          >
            VD
          </button>

          <button
            onClick={() => setOnlyMine((prev) => !prev)}
            className={`flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0] transition-colors ${
              onlyMine ? "bg-[#DEEBFF] text-brand" : ""
            }`}
            title="Filters"
          >
            <Filter size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded bg-[#F4F5F7] px-2.5 py-1 text-xs font-semibold text-text-subtle">
            <span>Group:</span>
            <select className="bg-transparent font-bold text-text outline-none cursor-pointer">
              <option>None</option>
              <option>Assignee</option>
              <option>Priority</option>
            </select>
          </div>
          <button className="flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0]">
            <LineChart size={14} className="text-text-subtle" />
          </button>
          <button className="flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0]">
            <Sliders size={14} className="text-text-subtle" />
          </button>
          <button className="flex h-8 items-center justify-center rounded bg-[#F4F5F7] w-8 h-8 hover:bg-[#EBECF0]">
            <MoreHorizontal size={14} className="text-text-subtle" />
          </button>
        </div>
      </div>

      {/* 4. Kanban Board Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {columns.map((colStatus) => (
          <div key={colStatus} className="flex flex-col gap-2">
            <BoardColumn
              status={colStatus}
              issues={filteredIssues.filter((i) => i.status === colStatus)}
              onStatusChange={handleStatusChange}
              currentUserId={currentUserId}
            />

            {/* + Create trigger directly inside column footer */}
            <div className="px-1 mt-1">
              <CreateIssueModal
                trigger={
                  <button className="flex w-full items-center gap-1.5 rounded-md py-1.5 px-2.5 text-xs font-semibold text-text-subtle hover:bg-[#EBECF0] hover:text-text transition-colors">
                    <span className="text-sm font-bold">+</span> Create
                  </button>
                }
              />
            </div>
          </div>
        ))}

        {/* Add column button */}
        <div className="flex items-start pt-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border bg-[#F4F5F7] text-text-subtle hover:bg-[#EBECF0] hover:text-text transition-all hover:border-brand">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* 5. Confluence Promo Widget Dialog */}
      {showPromo && (
        <div className="absolute bottom-6 left-6 z-30 max-w-sm rounded-md border border-border bg-surface p-5 shadow-xl animate-in fade-in duration-300">
          <button
            onClick={() => setShowPromo(false)}
            className="absolute top-3 right-3 text-text-subtle hover:text-text"
          >
            <X size={14} />
          </button>
          <h4 className="text-sm font-bold text-text mb-2">Unlock clarity for all teams</h4>
          <p className="text-xs text-text-subtle mb-4 leading-relaxed">
            Imagine a single source of truth for team and company-wide knowledge. It&apos;s possible with Confluence.
          </p>
          <Button
            appearance="primary"
            onClick={() => setShowPromo(false)}
            className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs font-bold px-3 py-1.5 rounded-sm"
          >
            Explore today
          </Button>
        </div>
      )}

      {/* 6. Floating Quickstart Pill Widget */}
      {showQuickstart && (
        <div className="fixed bottom-6 right-36 z-30 flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105">
          <Lightbulb size={13} className="text-yellow-400" />
          <span>Quickstart</span>
          <button
            onClick={() => setShowQuickstart(false)}
            className="ml-1 rounded-full p-0.5 hover:bg-white/20"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

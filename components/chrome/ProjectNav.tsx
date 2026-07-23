"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Folder, List, Columns3, BarChart3, Calendar, Settings, Star, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { NavItem } from "./GlobalSidebar";
import { toggleStarAction } from "@/app/(app)/chrome-actions";

export function ProjectNav({
  projectKey,
  projectName,
  projectId,
  initiallyStarred,
}: {
  projectKey: string;
  projectName: string;
  projectId: string;
  initiallyStarred: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [starred, setStarred] = useState(initiallyStarred);
  const [isPending, startTransition] = useTransition();

  const handleStarClick = () => {
    // Optimistic update
    setStarred((prev) => !prev);
    startTransition(async () => {
      try {
        const res = await toggleStarAction(projectId);
        setStarred(res.starred);
      } catch (err) {
        // Revert on error
        setStarred((prev) => !prev);
      }
    });
  };

  if (collapsed) {
    return (
      <aside className="relative flex w-12 shrink-0 flex-col items-center border-r border-border-default bg-surface py-4 gap-4">
        <button
          aria-label="Expand project navigation"
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-8 z-10 rounded-full border border-border-default bg-surface p-1 shadow-[0_2px_4px_rgba(9,30,66,0.08)] hover:bg-neutral-hovered text-default transition-all"
        >
          <ChevronRight size={12} />
        </button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand text-xs font-bold text-white uppercase select-none">
          {projectKey.slice(0, 2)}
        </div>

        <button
          aria-label="Star project"
          onClick={handleStarClick}
          disabled={isPending}
          className="rounded-ds p-1.5 hover:bg-neutral-hovered text-default"
        >
          <Star size={16} className={starred ? "fill-warning stroke-warning" : "text-subtlest"} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="relative flex w-60 shrink-0 flex-col border-r border-border-default bg-surface px-2 py-4 gap-4">
      <button
        aria-label="Collapse project navigation"
        onClick={() => setCollapsed(true)}
        className="absolute -right-3 top-8 z-10 rounded-full border border-border-default bg-surface p-1 shadow-[0_2px_4px_rgba(9,30,66,0.08)] hover:bg-neutral-hovered text-default transition-all"
      >
        <ChevronLeft size={12} />
      </button>

      {/* Project Header */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand text-xs font-bold text-white uppercase select-none">
          {projectKey.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-default leading-tight">{projectName}</p>
          <p className="text-xs text-subtle leading-tight">Software project</p>
        </div>
        <button
          aria-label="Star project"
          onClick={handleStarClick}
          disabled={isPending}
          className="rounded-ds p-1 hover:bg-neutral-hovered text-default shrink-0"
        >
          <Star size={16} className={starred ? "fill-warning stroke-warning" : "text-subtlest"} />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        <NavItem href={`/projects/${projectKey}/summary`} label="Summary" icon={LayoutDashboard} />
        <NavItem href={`/projects/${projectKey}`} label="Tickets List" icon={Folder} />
        <NavItem href={`/projects/${projectKey}/backlog`} label="Backlog" icon={List} />
        <NavItem href={`/projects/${projectKey}/board`} label="Board" icon={Columns3} />
        <NavItem href={`/projects/${projectKey}/reports`} label="Reports" icon={BarChart3} />
        <NavItem href={`/projects/${projectKey}/timeline`} label="Timeline" icon={Calendar} />
        <NavItem href={`/projects/${projectKey}/settings`} label="Settings" icon={Settings} />
      </nav>
    </aside>
  );
}

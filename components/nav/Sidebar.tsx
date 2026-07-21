"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, List, Columns3, BarChart3, Settings } from "lucide-react";

const planning = [
  { label: "Timeline", icon: Calendar },
  { label: "Backlog", icon: List },
  { label: "Board", icon: Columns3 },
  { label: "Reports", icon: BarChart3 },
];

export function Sidebar({ projectName, projectKey }: { projectName: string; projectKey: string }) {
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <aside className="relative w-5 border-r border-border bg-surface">
        <button
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="absolute top-8 -right-3 z-10 rounded-full border border-border bg-surface p-1 shadow-sm hover:bg-brand hover:text-white"
        >
          <ChevronRight size={12} />
        </button>
      </aside>
    );
  }
  return (
    <aside className="relative flex w-60 flex-col border-r border-border bg-surface">
      <button
        aria-label="Collapse sidebar"
        onClick={() => setCollapsed(true)}
        className="absolute top-8 -right-3 z-10 rounded-full border border-border bg-surface p-1 shadow-sm hover:bg-brand hover:text-white"
      >
        <ChevronLeft size={12} />
      </button>
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-ds bg-brand text-xs font-bold text-white">
          {projectKey.slice(0, 2)}
        </span>
        <div>
          <p className="text-sm font-medium">{projectName}</p>
          <p className="text-xs text-text-subtle">Software project</p>
        </div>
      </div>
      <p className="px-4 pb-1 text-[11px] font-bold tracking-wide text-text-subtle uppercase">Planning</p>
      <nav className="flex flex-col">
        {planning.map(({ label, icon: Icon }) => (
          <button
            key={label}
            disabled
            title="Coming in a later phase"
            className="flex cursor-not-allowed items-center gap-3 px-4 py-2 text-sm text-text-subtle opacity-60"
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-border">
        <a href="/settings/members" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#F4F5F7]">
          <Settings size={16} /> Project settings
        </a>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Folder,
  List,
  Columns3,
  BarChart3,
  Calendar,
  Settings,
  Star,
  LayoutDashboard,
} from "lucide-react";
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
  const pathname = usePathname();
  const [starred, setStarred] = useState(initiallyStarred);
  const [isPending, startTransition] = useTransition();

  const handleStarClick = () => {
    setStarred((prev) => !prev);
    startTransition(async () => {
      try {
        const res = await toggleStarAction(projectId);
        setStarred(res.starred);
      } catch (err) {
        setStarred((prev) => !prev);
      }
    });
  };

  const navItems = [
    { href: `/projects/${projectKey}/summary`, label: "Summary", icon: LayoutDashboard },
    { href: `/projects/${projectKey}`, label: "Tasks List", icon: Folder, exact: true },
    { href: `/projects/${projectKey}/backlog`, label: "Backlog", icon: List },
    { href: `/projects/${projectKey}/board`, label: "Board", icon: Columns3 },
    { href: `/projects/${projectKey}/reports`, label: "Reports", icon: BarChart3 },
    { href: `/projects/${projectKey}/timeline`, label: "Timeline", icon: Calendar },
    { href: `/projects/${projectKey}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <header className="w-full border-b border-border-default bg-surface px-6 pt-3 pb-1 shadow-2xs flex flex-col gap-2 shrink-0">
      {/* Top Header Row: Project Badge, Title & Star Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-mono font-bold text-white uppercase select-none shadow-xs">
            {projectKey.slice(0, 2)}
          </div>
          <div>
            <h2 className="text-base font-bold text-default leading-tight tracking-tight">
              {projectName}
            </h2>
            <p className="text-[11px] font-mono text-subtle leading-tight">
              Key: {projectKey} • Software Project
            </p>
          </div>
        </div>

        <button
          aria-label="Star project"
          onClick={handleStarClick}
          disabled={isPending}
          className="rounded-lg border border-border-default bg-surface p-1.5 hover:bg-neutral-hovered text-default transition-all shadow-xs"
          title={starred ? "Unstar project" : "Star project"}
        >
          <Star size={16} className={starred ? "fill-warning stroke-warning" : "text-subtlest"} />
        </button>
      </div>

      {/* Bottom Horizontal Tab Navigation Bar */}
      <nav className="flex items-center gap-1 overflow-x-auto pt-1 font-medium text-xs">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md border-b-2 text-xs transition-all whitespace-nowrap ${
                isActive
                  ? "border-brand bg-brand/10 text-brand font-bold shadow-2xs"
                  : "border-transparent text-subtle hover:text-default hover:bg-neutral/60"
              }`}
            >
              <Icon size={14} className={isActive ? "text-brand" : "text-subtlest"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

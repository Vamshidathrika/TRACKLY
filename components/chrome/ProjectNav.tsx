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
  CalendarDays,
  GitBranch,
  Code2,
  Settings,
  Star,
  LayoutDashboard,
  Package,
  Sparkles,
} from "lucide-react";
import { toggleStarAction } from "@/app/(app)/chrome-actions";

export function ProjectNav({
  projectKey,
  projectName,
  projectId,
  initiallyStarred,
  isStarred,
}: {
  projectKey: string;
  projectName: string;
  projectId?: string;
  initiallyStarred?: boolean;
  isStarred?: boolean;
}) {
  const pathname = usePathname();
  const [starred, setStarred] = useState(isStarred ?? initiallyStarred ?? false);
  const [isPending, startTransition] = useTransition();

  const handleStarClick = () => {
    if (!projectId) return;
    setStarred((prev) => !prev);
    startTransition(async () => {
      try {
        const res = await toggleStarAction(projectId);
        if (typeof res?.starred === "boolean") {
          setStarred(res.starred);
        }
      } catch {
        setStarred((prev) => !prev);
      }
    });
  };

  const navItems = [
    { href: `/projects/${projectKey}/board`, label: "Board", icon: Columns3 },
    { href: `/projects/${projectKey}/backlog`, label: "Backlog", icon: List },
    { href: `/projects/${projectKey}/summary`, label: "Summary", icon: LayoutDashboard },
    { href: `/projects/${projectKey}/timeline`, label: "Timeline", icon: Calendar },
    { href: `/projects/${projectKey}/calendar`, label: "Calendar", icon: CalendarDays },
    { href: `/projects/${projectKey}/dev`, label: "Dev", icon: GitBranch },
    { href: `/projects/${projectKey}/code`, label: "Code", icon: Code2 },
    { href: `/projects/${projectKey}/releases`, label: "Releases", icon: Package },
    { href: `/projects/${projectKey}/retro`, label: "Retro", icon: Sparkles },
    { href: `/projects/${projectKey}/reports`, label: "Reports", icon: BarChart3 },
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
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-default leading-none">{projectName}</h1>
              <button
                type="button"
                onClick={handleStarClick}
                disabled={isPending}
                className="text-subtle hover:text-amber-400 transition-colors"
                title={starred ? "Unstar project" : "Star project"}
              >
                <Star
                  size={14}
                  className={starred ? "fill-amber-400 text-amber-400" : "text-subtlest"}
                />
              </button>
            </div>
            <span className="text-[11px] font-mono text-subtle">Software project</span>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Tab Navigation Bar */}
      <nav className="flex items-center gap-1 overflow-x-auto pt-1 font-medium text-xs">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl border-b-2 text-xs transition-all duration-180 whitespace-nowrap cursor-pointer ${
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

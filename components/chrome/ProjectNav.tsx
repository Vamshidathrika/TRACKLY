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
  projectType,
}: {
  projectKey: string;
  projectName: string;
  projectId?: string;
  initiallyStarred?: boolean;
  isStarred?: boolean;
  projectType?: string;
}) {
  const pathname = usePathname();
  const [starred, setStarred] = useState(isStarred ?? initiallyStarred ?? false);
  const [isPending, startTransition] = useTransition();

  const formattedType = projectType
    ? `${projectType.charAt(0).toUpperCase()}${projectType.slice(1).toLowerCase()} project`
    : "Kanban project";

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

  const basePath = `/projects/${projectKey}`;

  const navItems = [
    { label: "Board", href: `${basePath}/board`, icon: Columns3 },
    { label: "Backlog", href: `${basePath}/backlog`, icon: List },
    { label: "Summary", href: `${basePath}/summary`, icon: LayoutDashboard },
    { label: "Timeline", href: `${basePath}/timeline`, icon: CalendarDays },
    { label: "Calendar", href: `${basePath}/calendar`, icon: Calendar },
    { label: "Dev", href: `${basePath}/dev`, icon: GitBranch },
    { label: "Code", href: `${basePath}/code`, icon: Code2 },
    { label: "Releases", href: `${basePath}/releases`, icon: Package },
    { label: "Retro", href: `${basePath}/retro`, icon: Sparkles },
    { label: "Reports", href: `${basePath}/reports`, icon: BarChart3 },
    { label: "Settings", href: `${basePath}/settings`, icon: Settings },
  ];

  return (
    <div className="flex flex-col border-b border-border bg-surface px-4 pt-3.5 pb-0 shadow-2xs gap-3">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-mono text-xs font-bold text-white shadow-2xs">
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
            <span className="text-[11px] font-mono text-subtle">{formattedType}</span>
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
    </div>
  );
}

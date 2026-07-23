"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Clock,
  Star,
  Folder,
  Filter,
  LayoutDashboard,
  Users,
  Map,
  ChevronRight,
  Settings,
  Plus,
} from "lucide-react";

type Proj = { id: string; key: string; name: string };

/** Generate a deterministic color class from a string */
function getProjectColor(str: string): string {
  const colors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function NavItem({
  href,
  label,
  icon: Icon,
  disabled,
  title,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  title?: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = !disabled && (pathname === href || (href !== "/your-work" && pathname.startsWith(href)));

  if (disabled) {
    return (
      <span
        title={title}
        className={`flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-subtlest opacity-40 ${collapsed ? "justify-center" : ""}`}
      >
        <Icon size={16} />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`relative flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-all group
        ${collapsed ? "justify-center" : ""}
        ${active
          ? "bg-brand/10 text-brand font-semibold"
          : "text-default hover:bg-neutral font-medium"
        }`}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-brand" />
      )}
      <Icon
        size={16}
        className={`shrink-0 ${active ? "text-brand" : "text-subtle group-hover:text-default transition-colors"}`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function ProjectItem({ proj, collapsed }: { proj: Proj; collapsed: boolean }) {
  const pathname = usePathname();
  const href = `/projects/${proj.key}`;
  const active = pathname.startsWith(href);
  const color = getProjectColor(proj.key);
  const initial = proj.name[0]?.toUpperCase() ?? "P";

  return (
    <Link
      href={href}
      title={collapsed ? proj.name : undefined}
      className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[13px] transition-all group
        ${collapsed ? "justify-center" : ""}
        ${active
          ? "bg-brand/10 text-brand font-semibold"
          : "text-default hover:bg-neutral font-medium"
        }`}
    >
      <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-bold text-white ${color}`}>
        {initial}
      </span>
      {!collapsed && (
        <>
          <span className="truncate flex-1">{proj.name}</span>
          {active && <ChevronRight size={12} className="text-brand/60 shrink-0" />}
        </>
      )}
    </Link>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  collapsed,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className="flex flex-col gap-0.5">{children}</div>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest text-subtlest uppercase">
        <Icon size={10} />
        {title}
      </p>
      {children}
    </div>
  );
}

export function GlobalSidebar({
  projects,
  starredProjectIds,
  collapsed,
}: {
  projects: Proj[];
  starredProjectIds: string[];
  collapsed: boolean;
}) {
  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecentKeys(JSON.parse(localStorage.getItem("trackly-recent-projects") ?? "[]"));
    } catch { /* ignore */ }
  }, []);

  const starred = projects.filter((p) => starredProjectIds.includes(p.id));
  const recent = recentKeys
    .map((k) => projects.find((p) => p.key === k))
    .filter(Boolean) as Proj[];

  const w = collapsed ? "w-[52px]" : "w-[232px]";

  return (
    <nav
      className={`${w} shrink-0 flex flex-col border-r border-border-default bg-surface overflow-hidden transition-[width] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 flex flex-col gap-4 px-2">
        {/* My Work */}
        <div className="flex flex-col gap-0.5">
          <NavItem href="/your-work" label="My Work" icon={Briefcase} collapsed={collapsed} />
        </div>

        {/* Starred */}
        {starred.length > 0 && (
          <Section title="Starred" icon={Star} collapsed={collapsed}>
            {starred.map((p) => (
              <ProjectItem key={p.id} proj={p} collapsed={collapsed} />
            ))}
          </Section>
        )}

        {/* Recent */}
        {recent.length > 0 && (
          <Section title="Recent" icon={Clock} collapsed={collapsed}>
            {recent.slice(0, 4).map((p) => (
              <ProjectItem key={p.id} proj={p} collapsed={collapsed} />
            ))}
          </Section>
        )}

        {/* All Projects */}
        <Section title="Projects" icon={Folder} collapsed={collapsed}>
          {projects.slice(0, 8).map((p) => (
            <ProjectItem key={p.id} proj={p} collapsed={collapsed} />
          ))}
          {projects.length > 8 && (
            <Link
              href="/projects"
              className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[12px] text-subtle hover:bg-neutral font-medium transition-all ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? "View all projects" : undefined}
            >
              <Plus size={14} className="shrink-0" />
              {!collapsed && <span>{projects.length - 8} more…</span>}
            </Link>
          )}
          {!collapsed && (
            <Link
              href="/projects"
              className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-brand font-semibold hover:underline"
            >
              View all projects
            </Link>
          )}
        </Section>

        {/* Workspace */}
        <div className="border-t border-border-default pt-3 flex flex-col gap-0.5">
          <NavItem href="/teams" label="Teams & Workload" icon={Users} collapsed={collapsed} />
          <NavItem href="/filters/search" label="Filters" icon={Filter} collapsed={collapsed} />
          <NavItem href="/dashboards" label="Dashboards" icon={LayoutDashboard} collapsed={collapsed} />
          <NavItem href="/plans" label="Plans & Roadmap" icon={Map} collapsed={collapsed} />
        </div>
      </div>

      {/* Bottom: Settings link */}
      <div className="border-t border-border-default px-2 py-2">
        <NavItem href="/settings/members" label="Settings" icon={Settings} collapsed={collapsed} />
      </div>
    </nav>
  );
}

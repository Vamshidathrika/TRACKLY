"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Clock, Star, Folder, Filter, LayoutDashboard, Users, Map } from "lucide-react";

type Proj = { id: string; key: string; name: string };

export function Item({ href, label, icon: Icon, disabled, title }: {
  href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; disabled?: boolean; title?: string;
}) {
  const pathname = usePathname();
  const active = !disabled && (pathname === href || (href !== "/your-work" && pathname.startsWith(href)));
  if (disabled) {
    return (
      <span title={title} className="flex cursor-not-allowed items-center gap-3 rounded-ds px-3 py-1.5 text-sm text-subtlest opacity-60">
        <Icon size={16} /> {label}
      </span>
    );
  }
  return (
    <Link href={href}
      className={`relative flex items-center gap-3 rounded-ds px-3 py-1.5 text-sm ${active ? "bg-selected text-selected-text before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded before:bg-brand" : "text-default hover:bg-neutral-hovered"}`}>
      <Icon size={16} /> {label}
    </Link>
  );
}

export function GlobalSidebar({ projects, starredProjectIds, collapsed }: {
  projects: Proj[]; starredProjectIds: string[]; collapsed: boolean;
}) {
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  useEffect(() => {
    try { setRecentKeys(JSON.parse(localStorage.getItem("trackly-recent-projects") ?? "[]")); } catch { /* ignore */ }
  }, []);
  if (collapsed) return null;
  const starred = projects.filter((p) => starredProjectIds.includes(p.id));
  const recent = recentKeys.map((k) => projects.find((p) => p.key === k)).filter(Boolean) as Proj[];
  return (
    <nav className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border-default bg-surface px-2 py-3">
      <div className="flex flex-col gap-0.5">
        <Item href="/your-work" label="Your work" icon={Briefcase} />
      </div>
      {recent.length > 0 && (
        <Section title="Recent" icon={Clock}>
          {recent.slice(0, 5).map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        </Section>
      )}
      {starred.length > 0 && (
        <Section title="Starred" icon={Star}>
          {starred.map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        </Section>
      )}
      <Section title="Projects" icon={Folder}>
        {projects.map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        <Item href="/projects" label="View all projects" icon={Folder} />
      </Section>
      <div className="flex flex-col gap-0.5">
        <Item href="/filters/search" label="Filters" icon={Filter} />
        <Item href="/dashboards" label="Dashboards" icon={LayoutDashboard} />
        <Item href="/teams" label="Teams" icon={Users} disabled title="Coming soon" />
        <Item href="/plans" label="Plans" icon={Map} disabled title="Coming in V2-8" />
      </div>
    </nav>
  );
}

export function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-2 px-3 py-1 text-[11px] font-bold tracking-wide text-subtlest uppercase"><Icon size={12} /> {title}</p>
      {children}
    </div>
  );
}

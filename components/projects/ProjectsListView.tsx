"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, LayoutGrid, List, Settings, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { DeleteProjectModal } from "./DeleteProjectModal";

export type ProjectListItem = {
  id: string;
  name: string;
  key: string;
  type: string;
  lead?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  _count: { issues: number };
};

export function ProjectsListView({
  projects,
  isAdmin,
}: {
  projects: ProjectListItem[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "KANBAN" | "SCRUM">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase()) ||
      (p.lead?.name && p.lead.name.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6 mt-4 max-w-5xl">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Live Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search projects by name or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border-default bg-surface pl-9 pr-3 text-xs outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral p-1 rounded-xl border border-border-default">
            {(["ALL", "KANBAN", "SCRUM"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 sm:px-3 sm:py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  typeFilter === t
                    ? "bg-surface text-brand font-bold shadow-2xs"
                    : "text-subtle hover:text-default"
                }`}
              >
                {t === "ALL" ? "All Types" : t}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-neutral p-1 rounded-xl border border-border-default self-end sm:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`p-2.5 sm:p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "table" ? "bg-surface text-brand shadow-2xs" : "text-subtle hover:text-default"
            }`}
            title="Table View"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 sm:p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "grid" ? "bg-surface text-brand shadow-2xs" : "text-subtle hover:text-default"
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-border-default bg-surface text-xs text-subtle">
          No projects matching your search criteria.
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-default bg-neutral/40 text-subtle font-bold">
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-3">Key</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Project Lead</th>
                <th className="py-3 px-3">Issues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredProjects.map((p) => (
                <tr key={p.id} className="hover:bg-neutral/40 transition-colors group">
                  <td className="py-3 px-4 font-bold">
                    <Link
                      href={`/projects/${p.key}/board`}
                      className="text-brand hover:underline flex items-center gap-2"
                    >
                      <span className="w-7 h-7 rounded-lg bg-brand/10 text-brand font-mono font-bold text-[11px] flex items-center justify-center border border-brand/20">
                        {p.key.slice(0, 2)}
                      </span>
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-subtle">{p.key}</td>
                  <td className="py-3 px-3">
                    <Tag color={p.type === "SCRUM" ? "blue" : "gray"}>{p.type}</Tag>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.lead?.name ?? p.lead?.email ?? "Lead"} src={p.lead?.avatarUrl} size={22} />
                      <span className="font-medium text-default">{p.lead?.name ?? p.lead?.email ?? "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-subtle font-semibold">{p._count.issues} issues</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/projects/${p.key}/settings`}
                        className="p-1.5 rounded-lg text-subtle hover:text-default hover:bg-neutral transition-colors"
                        title="Project Settings"
                      >
                        <Settings size={14} />
                      </Link>
                      {isAdmin && (
                        <DeleteProjectModal
                          projectId={p.id}
                          projectKey={p.key}
                          projectName={p.name}
                          trigger={
                            <button
                              className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <Settings size={14} className="hidden" />
                              <span className="text-xs font-bold text-danger hover:underline">Delete</span>
                            </button>
                          }
                        />
                      )}
                      <Link
                        href={`/projects/${p.key}/board`}
                        className="p-1.5 rounded-lg text-brand hover:bg-brand/10 transition-colors flex items-center gap-1 font-bold text-xs"
                      >
                        Open <ArrowRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="flex flex-col justify-between p-5 rounded-xl border border-border-default bg-surface hover:border-brand/40 shadow-2xs hover:shadow-xs transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand font-mono font-bold text-xs flex items-center justify-center border border-brand/20">
                    {p.key.slice(0, 3)}
                  </span>
                  <Tag color={p.type === "SCRUM" ? "blue" : "gray"}>{p.type}</Tag>
                </div>
                <h3 className="font-bold text-sm text-default group-hover:text-brand transition-colors mb-1">
                  <Link href={`/projects/${p.key}/board`}>{p.name}</Link>
                </h3>
                <p className="font-mono text-xs text-subtle mb-4">{p.key}</p>
              </div>

              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={p.lead?.name ?? p.lead?.email ?? "Lead"} src={p.lead?.avatarUrl} size={22} />
                  <span className="text-xs text-subtle truncate max-w-[100px]">{p.lead?.name ?? "Lead"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${p.key}/settings`}
                    className="p-1 rounded-lg text-subtle hover:text-default hover:bg-neutral"
                  >
                    <Settings size={14} />
                  </Link>
                  <Link
                    href={`/projects/${p.key}/board`}
                    className="h-7 px-3 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hovered transition-colors flex items-center gap-1"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

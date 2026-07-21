"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, FolderKanban, Sliders } from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { quickSearchAction } from "@/app/(app)/search/actions";
import type { IssueType, IssueStatus } from "@prisma/client";

export type SearchIssueResult = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  project: { key: string };
};

export type SearchProjectResult = {
  id: string;
  key: string;
  name: string;
};

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<SearchIssueResult[]>([]);
  const [projects, setProjects] = useState<SearchProjectResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setIssues([]);
      setProjects([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const res = await quickSearchAction(query);
      setIssues(res.issues);
      setProjects(res.projects);
      setIsLoading(false);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative mr-1">
      <div className="relative">
        <Search size={14} className="absolute top-2.5 left-2 text-text-subtle" />
        <input
          type="text"
          placeholder="Search issues, projects..."
          value={query}
          onFocus={() => query.trim() && setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-50 rounded-ds border-2 border-border bg-surface pr-2 pl-7 text-sm outline-none transition-all focus:w-70 focus:border-brand"
        />
      </div>

      {isOpen && (
        <div className="absolute top-10 left-0 z-50 w-80 rounded-ds border border-border bg-surface shadow-lg outline-none flex flex-col max-h-[80vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-text-subtle">Searching...</div>
          ) : issues.length === 0 && projects.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-subtle">No matching results</div>
          ) : (
            <>
              {/* Projects Group */}
              {projects.length > 0 && (
                <div className="flex flex-col border-b border-border/60 p-2">
                  <span className="px-2 py-1 text-[11px] font-bold text-text-subtle uppercase tracking-wider">
                    Projects
                  </span>
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.key}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-ds px-2 py-1.5 text-xs text-default hover:bg-neutral"
                    >
                      <FolderKanban size={14} className="text-brand" />
                      <span className="font-semibold">{p.name}</span>
                      <span className="font-mono text-text-subtle">({p.key})</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Issues Group */}
              {issues.length > 0 && (
                <div className="flex flex-col p-2">
                  <span className="px-2 py-1 text-[11px] font-bold text-text-subtle uppercase tracking-wider">
                    Issues
                  </span>
                  {issues.map((i) => (
                    <Link
                      key={i.id}
                      href={`/projects/${i.project.key}/issues/${i.key}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-ds px-2 py-1.5 text-xs text-default hover:bg-neutral"
                    >
                      <TypeIcon type={i.type} size={14} />
                      <span className="font-mono font-semibold text-text-subtle">{i.key}</span>
                      <span className="truncate flex-1 font-medium">{i.summary}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* JQL Search Footer Link */}
              <div className="border-t border-border-default bg-surface-sunken p-2">
                <Link
                  href={`/filters/search?jql=${encodeURIComponent(query)}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  <Sliders size={12} /> Advanced search for &quot;{query}&quot;
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

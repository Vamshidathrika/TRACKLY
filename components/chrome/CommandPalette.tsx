"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Folder,
  Sliders,
  Briefcase,
  LayoutDashboard,
  Palette,
  FileText,
  Clock,
  ChevronRight,
  Hash,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { quickSearchAction } from "@/app/(app)/search/actions";

type Proj = { id: string; key: string; name: string };
type ThemePref = "light" | "dark" | "system";

type ListItem = {
  id: string;
  type: "recent" | "action" | "project" | "issue";
  label: string;
  sublabel?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  handler: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  projects,
  onCreateIssue,
  onSetTheme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Proj[];
  onCreateIssue: () => void;
  onSetTheme: (theme: ThemePref) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      try {
        setRecentSearches(JSON.parse(localStorage.getItem("trackly-recent-searches") ?? "[]"));
      } catch {
        setRecentSearches([]);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setIssues([]);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await quickSearchAction(query);
        setIssues(res.issues);
      } catch {
        setIssues([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const close = () => onOpenChange(false);

  const actionsList: ListItem[] = [
    {
      id: "action-create",
      type: "action",
      label: "Create issue",
      sublabel: "Press C anywhere",
      icon: Zap,
      handler: () => { onCreateIssue(); close(); },
    },
    {
      id: "action-theme",
      type: "action",
      label: "Toggle theme",
      sublabel: "Light / Dark",
      icon: Palette,
      handler: () => {
        onSetTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
        close();
      },
    },
    {
      id: "nav-work",
      type: "action",
      label: "Go to My Work",
      icon: Briefcase,
      handler: () => { router.push("/your-work"); close(); },
    },
    {
      id: "nav-projects",
      type: "action",
      label: "Go to Projects",
      icon: Folder,
      handler: () => { router.push("/projects"); close(); },
    },
    {
      id: "nav-filters",
      type: "action",
      label: "Go to Filters",
      icon: Sliders,
      handler: () => { router.push("/filters/search"); close(); },
    },
    {
      id: "nav-dashboards",
      type: "action",
      label: "Go to Dashboards",
      icon: LayoutDashboard,
      handler: () => { router.push("/dashboards"); close(); },
    },
  ];

  const filteredActions = query.trim()
    ? actionsList.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actionsList;

  const filteredProjects = query.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.key.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Build grouped sections
  const sections: { label: string; items: ListItem[] }[] = [];

  if (query.trim() === "" && recentSearches.length > 0) {
    sections.push({
      label: "Recent",
      items: recentSearches.map((s) => ({
        id: `recent-${s}`,
        type: "recent" as const,
        label: s,
        icon: Clock,
        handler: () => { setQuery(s); },
      })),
    });
  }

  if (filteredActions.length > 0) {
    sections.push({ label: query ? "Actions" : "Quick Actions", items: filteredActions });
  }

  if (filteredProjects.length > 0) {
    sections.push({
      label: "Projects",
      items: filteredProjects.map((proj) => ({
        id: `project-${proj.id}`,
        type: "project" as const,
        label: proj.name,
        sublabel: proj.key,
        icon: Folder,
        handler: () => {
          saveRecentSearch(query);
          router.push(`/projects/${proj.key}`);
          close();
        },
      })),
    });
  }

  if (issues.length > 0) {
    sections.push({
      label: "Issues",
      items: issues.map((issue) => ({
        id: `issue-${issue.id}`,
        type: "issue" as const,
        label: issue.summary,
        sublabel: issue.key,
        icon: Hash,
        handler: () => {
          saveRecentSearch(query);
          router.push(`/projects/${issue.project.key}/issues/${issue.key}`);
          close();
        },
      })),
    });
  }

  // Flatten for keyboard navigation
  const flatItems = sections.flatMap((s) => s.items);

  const saveRecentSearch = (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (!trimmed) return;
    try {
      const existing: string[] = JSON.parse(localStorage.getItem("trackly-recent-searches") ?? "[]");
      const updated = [trimmed, ...existing.filter((s) => s !== trimmed)].slice(0, 5);
      localStorage.setItem("trackly-recent-searches", JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(Math.max(0, prev), Math.max(0, flatItems.length - 1)));
  }, [flatItems.length]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-selected="true"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatItems[selectedIndex]?.handler();
    } else if (e.key === "Escape") {
      close();
    }
  };

  // Compute running index for each section
  let runningIndex = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[15vh] left-1/2 z-50 w-full max-w-[580px] -translate-x-1/2 rounded-[16px] border border-border-default bg-surface shadow-xl outline-none overflow-hidden animate-scale-in">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border-default px-4">
            <Search size={16} className="text-subtlest shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or jump to…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              className="h-13 w-full bg-transparent py-4 text-[15px] text-default outline-none placeholder:text-subtlest"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="shrink-0 text-[11px] font-semibold text-subtlest bg-neutral hover:bg-neutral-hovered px-2 py-0.5 rounded-[4px] transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <span className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
              </div>
            )}

            {!isLoading && flatItems.length === 0 && query.trim() && (
              <div className="py-12 text-center">
                <p className="text-[13px] font-medium text-subtle">No results for &quot;{query}&quot;</p>
                <p className="text-[11px] text-subtlest mt-1">Try a different search term</p>
              </div>
            )}

            {!isLoading && sections.map((section) => {
              const sectionStart = runningIndex;
              runningIndex += section.items.length;

              return (
                <div key={section.label} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-subtlest">
                    {section.label}
                  </p>
                  {section.items.map((item, i) => {
                    const globalIdx = sectionStart + i;
                    const active = globalIdx === selectedIndex;
                    const Icon = item.icon ?? FileText;
                    return (
                      <button
                        key={item.id}
                        data-selected={active}
                        onClick={item.handler}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          active ? "bg-brand/8" : "hover:bg-neutral/60"
                        }`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] ${
                          active ? "bg-brand/15" : "bg-neutral"
                        }`}>
                          <Icon size={14} className={active ? "text-brand" : "text-subtle"} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[13px] font-medium truncate ${active ? "text-brand" : "text-default"}`}>
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span className="text-[11px] text-subtlest font-mono">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                        {active && <ChevronRight size={13} className="shrink-0 text-brand/60 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer hints */}
          <div className="flex items-center justify-between border-t border-border-default bg-neutral/30 px-4 py-2.5">
            <div className="flex items-center gap-3 text-[11px] text-subtlest">
              <span><kbd className="px-1.5 py-0.5 rounded-[4px] bg-surface border border-border-default font-mono font-bold text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 rounded-[4px] bg-surface border border-border-default font-mono font-bold text-[10px]">↵</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 rounded-[4px] bg-surface border border-border-default font-mono font-bold text-[10px]">ESC</kbd> Close</span>
            </div>
            <span className="text-[11px] font-semibold text-brand">Press &quot;C&quot; to create</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

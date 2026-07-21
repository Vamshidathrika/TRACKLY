"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Folder, Sliders, Briefcase, LayoutDashboard, Palette, FileText, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { quickSearchAction } from "@/app/(app)/search/actions";

type Proj = { id: string; key: string; name: string };
type ThemePref = "light" | "dark" | "system";

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

  // Load recent searches
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

  // Live issue search with debounce
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
      } catch (err) {
        setIssues([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Actions list
  const actionsList = [
    { id: "action-create", type: "action", label: "Create issue", icon: FileText, handler: () => { onCreateIssue(); onOpenChange(false); } },
    { id: "action-theme", type: "action", label: "Toggle theme (Light/Dark)", icon: Palette, handler: () => { onSetTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); onOpenChange(false); } },
    { id: "nav-work", type: "action", label: "Go to Your work", icon: Briefcase, handler: () => { router.push("/your-work"); onOpenChange(false); } },
    { id: "nav-projects", type: "action", label: "Go to Projects", icon: Folder, handler: () => { router.push("/projects"); onOpenChange(false); } },
    { id: "nav-filters", type: "action", label: "Go to Filters", icon: Sliders, handler: () => { router.push("/filters/search"); onOpenChange(false); } },
    { id: "nav-dashboards", type: "action", label: "Go to Dashboards", icon: LayoutDashboard, handler: () => { router.push("/dashboards"); onOpenChange(false); } },
  ];

  // Filter actions & projects based on query
  const filteredActions = query.trim()
    ? actionsList.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actionsList;

  const filteredProjects = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.key.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Combine items to list them sequentially for keyboard navigation
  const listItems: any[] = [];
  
  if (query.trim() === "") {
    // Show recent searches headers if any
    recentSearches.forEach((s) => {
      listItems.push({ id: `recent-${s}`, type: "recent", label: s, handler: () => { setQuery(s); } });
    });
  }

  filteredActions.forEach((act) => listItems.push(act));
  
  filteredProjects.forEach((proj) => {
    listItems.push({
      id: `project-${proj.id}`,
      type: "project",
      label: `${proj.name} (${proj.key})`,
      icon: Folder,
      handler: () => {
        // Track recent search
        saveRecentSearch(query);
        router.push(`/projects/${proj.key}`);
        onOpenChange(false);
      },
    });
  });

  issues.forEach((issue) => {
    listItems.push({
      id: `issue-${issue.id}`,
      type: "issue",
      label: `${issue.key}: ${issue.summary}`,
      icon: FileText,
      handler: () => {
        saveRecentSearch(query);
        router.push(`/projects/${issue.project.key}/issues/${issue.key}`);
        onOpenChange(false);
      },
    });
  });

  const saveRecentSearch = (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (!trimmed) return;
    try {
      const existing: string[] = JSON.parse(localStorage.getItem("trackly-recent-searches") ?? "[]");
      const updated = [trimmed, ...existing.filter((s) => s !== trimmed)].slice(0, 5);
      localStorage.setItem("trackly-recent-searches", JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Keep index within bounds
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(Math.max(0, prev), Math.max(0, listItems.length - 1)));
  }, [listItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % listItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + listItems.length) % listItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (listItems[selectedIndex]) {
        listItems[selectedIndex].handler();
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#091E42]/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-[120px] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 rounded-md border border-border-default bg-surface shadow-xl outline-none overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="relative flex items-center border-b border-border-default px-4">
            <Search size={18} className="text-subtlest" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or jump to..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 w-full bg-transparent pl-3 text-sm text-default outline-none placeholder-subtlest"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2 flex flex-col gap-1">
            {listItems.length === 0 && !isLoading && (
              <div className="p-8 text-center text-sm text-subtlest">No results found for &quot;{query}&quot;</div>
            )}

            {isLoading && (
              <div className="p-4 text-center text-xs text-subtlest font-medium">Searching issues...</div>
            )}

            {/* List Groups */}
            {recentSearches.length > 0 && query === "" && listItems.some((item) => item.type === "recent") && (
              <div className="px-2 py-1.5 text-[11px] font-bold text-subtlest uppercase tracking-wide">Recent Searches</div>
            )}
            
            {listItems.map((item, idx) => {
              const active = idx === selectedIndex;
              const Icon = item.icon || Clock;

              return (
                <button
                  key={item.id}
                  onClick={item.handler}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    active ? "bg-neutral text-default font-semibold" : "text-subtle hover:bg-neutral/40"
                  }`}
                >
                  <Icon size={16} className={active ? "text-brand" : "text-subtlest"} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active && <ChevronRight size={14} className="text-subtlest" />}
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

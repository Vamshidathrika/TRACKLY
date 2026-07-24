"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { TopBar, type ChromeUser } from "./TopBar";
import { GlobalSidebar } from "./GlobalSidebar";
import { NavigationProgress } from "@/components/nav/NavigationProgress";
import { useShortcuts } from "@/lib/shortcuts";
import { setThemeAction } from "@/app/(app)/chrome-actions";
import { useRouter } from "next/navigation";

const CreateIssueModal = dynamic(
  () => import("@/components/issues/CreateIssueModal").then((m) => m.CreateIssueModal),
  { ssr: false }
);
const AICopilotDrawer = dynamic(
  () => import("@/components/ai/AICopilotDrawer").then((m) => m.AICopilotDrawer),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((m) => m.CommandPalette),
  { ssr: false }
);
const ShortcutsHelp = dynamic(
  () => import("./ShortcutsHelp").then((m) => m.ShortcutsHelp),
  { ssr: false }
);

type Proj = { id: string; key: string; name: string };

export function AppShell({ user, projects, starredProjectIds, children }: {
  user: ChromeUser; projects: Proj[]; starredProjectIds: string[]; children: React.ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const createTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("trackly-sidebar-collapsed") === "1");
  }, []);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setThemeAction(next as any);
  };

  useShortcuts({
    "mod+k": () => setPaletteOpen(true),
    "c": () => createTriggerRef.current?.click(),
    "/": () => setPaletteOpen(true),
    "?": () => setHelpOpen(true),
    "g d": () => router.push("/dashboards"),
    "g p": () => router.push("/projects"),
    "g y": () => router.push("/your-work"),
    "\\": toggleTheme,
  });

  function toggleSidebar() {
    setCollapsed((c) => {
      localStorage.setItem("trackly-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <TopBar
        user={user}
        onToggleSidebar={toggleSidebar}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenCreate={() => createTriggerRef.current?.click()}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <GlobalSidebar projects={projects} starredProjectIds={starredProjectIds} collapsed={collapsed} />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <GlobalCreate triggerRef={createTriggerRef} />
      {/* AI Copilot floats over all (app) routes (restored from pre-chrome layout) */}
      <AICopilotDrawer />
      
      {/* command palette and help modals */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        projects={projects}
        onCreateIssue={() => createTriggerRef.current?.click()}
        onSetTheme={(pref) => {
          setThemeAction(pref);
          const resolved = pref === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : pref;
          document.documentElement.setAttribute("data-theme", resolved);
        }}
      />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

// Thin adapter around the existing CreateIssueModal. The modal exposes only a
// `trigger` prop and self-manages open/close, so we hand it a hidden trigger button
// and let AppShell's Create button click it. The modal fetches its own projects.
function GlobalCreate({ triggerRef }: { triggerRef: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <CreateIssueModal
      trigger={<button ref={triggerRef} type="button" tabIndex={-1} className="hidden" />}
    />
  );
}

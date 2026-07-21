"use client";
import { useEffect, useRef, useState } from "react";
import { TopBar, type ChromeUser } from "./TopBar";
import { GlobalSidebar } from "./GlobalSidebar";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";

type Proj = { id: string; key: string; name: string };

export function AppShell({ user, projects, starredProjectIds, children }: {
  user: ChromeUser; projects: Proj[]; starredProjectIds: string[]; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // CreateIssueModal is self-contained (owns its open state + project picker), so it
  // can't be driven as a controlled global-create. We open it by clicking a hidden
  // trigger the TopBar's Create button targets via this ref (see GlobalCreate below).
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setCollapsed(localStorage.getItem("trackly-sidebar-collapsed") === "1");
  }, []);
  function toggleSidebar() {
    setCollapsed((c) => {
      localStorage.setItem("trackly-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }
  return (
    <div className="flex h-screen flex-col">
      <TopBar
        user={user}
        onToggleSidebar={toggleSidebar}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenCreate={() => createTriggerRef.current?.click()}
      />
      <div className="flex min-h-0 flex-1">
        <GlobalSidebar projects={projects} starredProjectIds={starredProjectIds} collapsed={collapsed} />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <GlobalCreate triggerRef={createTriggerRef} />
      {/* palette mounts in Task 6 */}
      {paletteOpen && null}
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

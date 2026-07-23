"use client";
import Link from "next/link";
import { Menu, Search, Plus, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { UserMenu } from "@/components/nav/UserMenu";
import { SettingsMenu } from "./SettingsMenu";

export type ChromeUser = { name: string; email: string; avatarUrl: string | null };

export function TopBar({
  user,
  onToggleSidebar,
  onOpenPalette,
  onOpenCreate,
  onOpenHelp,
  hideRemote = false,
}: {
  user: ChromeUser;
  onToggleSidebar(): void;
  onOpenPalette(): void;
  onOpenCreate(): void;
  onOpenHelp?(): void;
  hideRemote?: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-default bg-surface px-3 z-30">
      {/* Sidebar toggle */}
      <Tooltip content="Toggle sidebar (⌘ /)">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-neutral text-subtle hover:text-default transition-all"
        >
          <Menu size={17} />
        </button>
      </Tooltip>

      {/* Logo */}
      <Link
        href="/your-work"
        className="flex items-center gap-1.5 px-1 mr-1 group"
      >
        <div className="w-6 h-6 bg-brand rounded-[6px] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.65" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.45" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" />
          </svg>
        </div>
        <span className="text-[15px] font-bold text-brand tracking-tight">Trackly</span>
      </Link>

      {/* Search bar — opens command palette */}
      <div className="relative mx-auto w-full max-w-[520px]">
        <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-subtlest pointer-events-none" />
        <input
          placeholder="Search issues, projects..."
          readOnly
          onClick={onOpenPalette}
          onFocus={onOpenPalette}
          className="h-8 w-full cursor-pointer rounded-[8px] border border-border-default bg-neutral pl-8 pr-14 text-sm text-subtle outline-none hover:bg-neutral-hovered transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-semibold text-subtlest bg-surface border border-border-default rounded-[4px] px-1.5 py-0.5 pointer-events-none">
          ⌘K
        </kbd>
      </div>

      {/* Create button */}
      <Tooltip content="Create issue (C)">
        <button
          onClick={onOpenCreate}
          className="flex h-8 items-center gap-1.5 rounded-[8px] bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hovered transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Create</span>
        </button>
      </Tooltip>

      {/* Right icons */}
      <div className="flex items-center gap-0.5 ml-0.5">
        {!hideRemote && <NotificationBell />}

        <Tooltip content="Keyboard shortcuts (?)">
          <button
            aria-label="Keyboard shortcuts"
            onClick={onOpenHelp}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-subtle hover:bg-neutral hover:text-default transition-all"
          >
            <HelpCircle size={17} />
          </button>
        </Tooltip>

        <SettingsMenu />
        {!hideRemote && <UserMenu user={user} />}
      </div>
    </header>
  );
}

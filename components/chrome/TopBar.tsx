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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-strong bg-surface/90 backdrop-blur-xl px-3 z-30 select-none">
      {/* Sidebar toggle */}
      <Tooltip content="Toggle sidebar (⌘ /)">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl hover:bg-neutral text-subtle hover:text-default transition-all duration-180 active:scale-[0.96] cursor-pointer"
        >
          <Menu size={17} />
        </button>
      </Tooltip>

      {/* Logo */}
      <Link
        href="/your-work"
        className="flex items-center gap-2 px-1 mr-1 group cursor-pointer"
      >
        <div className="w-7 h-7 bg-brand rounded-xl flex items-center justify-center shadow-sm shadow-brand/20 group-hover:scale-105 transition-transform duration-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
        </div>
        <span className="text-[15px] font-black text-default tracking-tight">Trackly</span>
      </Link>

      {/* Search bar — opens command palette */}
      <div className="relative mx-auto w-full max-w-[520px]">
        <Search size={14} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-subtlest pointer-events-none" />
        <input
          placeholder="Search tasks, projects, code..."
          readOnly
          onClick={onOpenPalette}
          onFocus={onOpenPalette}
          className="h-8.5 w-full cursor-pointer rounded-xl border border-border-default bg-surface-sunken/80 pl-9 pr-14 text-xs font-medium text-subtle outline-none hover:bg-surface hover:border-border-strong focus:border-brand focus:ring-3 focus:ring-brand/10 transition-all duration-200"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-bold text-subtlest bg-surface border border-border-default rounded-md px-1.5 py-0.5 pointer-events-none shadow-2xs">
          ⌘K
        </kbd>
      </div>

      {/* Create button */}
      <Tooltip content="Create task (C)">
        <button
          onClick={onOpenCreate}
          className="flex h-8.5 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-hovered transition-all duration-180 shadow-xs hover:shadow-md active:scale-[0.97] cursor-pointer"
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
            className="flex h-8 w-8 items-center justify-center rounded-xl text-subtle hover:bg-neutral hover:text-default transition-all duration-180 active:scale-[0.96] cursor-pointer"
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

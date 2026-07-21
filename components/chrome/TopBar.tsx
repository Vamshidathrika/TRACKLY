"use client";
import Link from "next/link";
import { Menu, Search, HelpCircle } from "lucide-react";
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
  hideRemote = false,
}: {
  user: ChromeUser;
  onToggleSidebar(): void;
  onOpenPalette(): void;
  onOpenCreate(): void;
  hideRemote?: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-default bg-surface px-3">
      <Tooltip content="Toggle sidebar">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="rounded-ds p-1.5 hover:bg-neutral-hovered"
        >
          <Menu size={18} className="text-subtle" />
        </button>
      </Tooltip>
      <Link
        href="/your-work"
        className="mr-2 flex items-center gap-1.5 px-1 text-[15px] font-bold text-brand"
      >
        Trackly
      </Link>
      <div className="relative mx-auto w-full max-w-195">
        <Search size={14} className="absolute top-2 left-2.5 text-subtlest" />
        <input
          placeholder="Search"
          readOnly
          onClick={onOpenPalette}
          onFocus={onOpenPalette}
          className="h-8 w-full cursor-pointer rounded-[5px] border border-border-default bg-surface pl-8 text-sm outline-none hover:bg-neutral"
        />
      </div>
      <button
        onClick={onOpenCreate}
        className="flex h-8 items-center rounded-ds bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hovered"
      >
        Create
      </button>
      {!hideRemote && <NotificationBell />}
      <Tooltip content="Help">
        <button aria-label="Help" className="rounded-full p-1.5 hover:bg-neutral-hovered">
          <HelpCircle size={18} className="text-subtle" />
        </button>
      </Tooltip>
      <SettingsMenu />
      {!hideRemote && <UserMenu user={user} />}
    </header>
  );
}

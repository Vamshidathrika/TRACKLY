"use client";

import Link from "next/link";
import { Grid3X3, HelpCircle, Settings, LayoutGrid, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { QuickSearch } from "@/components/search/QuickSearch";

export type NavUser = { name: string; email: string; avatarUrl: string | null };

export function TopNav({ user }: { user: NavUser }) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 shadow-xs">
      {/* App Switcher & Spaces launcher */}
      <div className="flex items-center gap-1">
        <button aria-label="App switcher" className="rounded-md p-1.5 hover:bg-[#EBECF0]">
          <Grid3X3 size={18} className="text-text" />
        </button>
        <button aria-label="Spaces switcher" className="rounded-md p-1.5 hover:bg-[#EBECF0]">
          <LayoutGrid size={18} className="text-text" />
        </button>
      </div>

      {/* Blue Jira Logo */}
      <Link href="/your-work" className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0052cc] fill-current animate-pulse" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.923 1.258a.86.86 0 00-1.21 0l-9.84 9.84a.86.86 0 000 1.21l9.84 9.84a.86.86 0 001.21 0l9.84-9.84a.86.86 0 000-1.21l-9.84-9.84zM6.924 11.3a.43.43 0 01.608 0l4.468 4.468a.43.43 0 010 .608l-4.468 4.468a.43.43 0 01-.608 0l-4.468-4.468a.43.43 0 010-.608L6.924 11.3z" />
        </svg>
      </Link>

      <nav className="hidden md:flex items-center gap-1.5">
        <Dropdown trigger="Your work" items={[{ label: "Go to your work", href: "/your-work" }]} />
        <Dropdown trigger="Projects" items={[{ label: "View all projects", href: "/projects" }]} />
        <Dropdown trigger="Filters" items={[{ label: "View all filters", href: "/filters/search" }]} />
        <Dropdown trigger="Dashboards" items={[{ label: "View default dashboard", href: "/dashboards" }]} />
        <Dropdown trigger="Teams" items={[{ label: "Coming soon" }]} />
      </nav>

      {/* Search Input, Actions & Utilities */}
      <div className="ml-auto flex items-center gap-2">
        <QuickSearch />

        <CreateIssueModal
          trigger={
            <Button
              appearance="primary"
              className="bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold text-xs px-3.5 h-8 rounded-sm shadow-xs flex items-center gap-1 transition-transform active:scale-95"
            >
              <span className="text-sm font-bold">+</span> Create
            </Button>
          }
        />

        <Button
          appearance="primary"
          className="bg-[#7F33DE] hover:bg-[#6C28C4] text-white font-semibold text-xs px-3.5 h-8 rounded-sm shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Zap size={13} className="fill-current text-white animate-bounce" /> Upgrade
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <NotificationBell />

        {[
          { icon: HelpCircle, label: "Help" },
          { icon: Settings, label: "Settings" },
        ].map(({ icon: Icon, label }) => (
          <Tooltip key={label} content={label}>
            <button aria-label={label} className="rounded-full p-1.5 hover:bg-[#EBECF0]">
              <Icon size={18} className="text-text-subtle" />
            </button>
          </Tooltip>
        ))}

        <UserMenu user={user} />
      </div>
    </header>
  );
}

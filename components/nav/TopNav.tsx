"use client";
import Link from "next/link";
import { Grid3X3, Search, Bell, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

export type NavUser = { name: string; email: string; avatarUrl: string | null };

export function TopNav({ user }: { user: NavUser }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-surface px-4">
      <button aria-label="App switcher" className="rounded-ds p-1.5 hover:bg-[#EBECF0]">
        <Grid3X3 size={16} className="text-text-subtle" />
      </button>
      <Link href="/your-work" className="mr-2 flex items-center gap-1 text-base font-bold text-brand">
        Trackly
      </Link>
      <nav className="flex items-center gap-1">
        <Dropdown trigger="Your work" items={[{ label: "Go to your work", href: "/your-work" }]} />
        <Dropdown trigger="Projects" items={[{ label: "View all projects", href: "/projects" }]} />
        <Dropdown trigger="Filters" items={[{ label: "Coming soon" }]} />
        <Dropdown trigger="Dashboards" items={[{ label: "Coming soon" }]} />
        <Dropdown trigger="Teams" items={[{ label: "Coming soon" }]} />
        <CreateIssueModal trigger={<Button appearance="primary" className="ml-1">Create</Button>} />
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <div className="relative mr-1">
          <Search size={14} className="absolute top-2.5 left-2 text-text-subtle" />
          <input
            placeholder="Search"
            className="h-8 w-50 rounded-ds border-2 border-border bg-surface pr-2 pl-7 text-sm outline-none transition-all focus:w-70 focus:border-brand"
          />
        </div>
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

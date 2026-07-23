"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Avatar } from "@/components/ui/Avatar";
import { Settings, LogOut, ExternalLink } from "lucide-react";

export type UserMenuProps = { name: string; email: string; avatarUrl: string | null };

export function UserMenu({ user }: { user: UserMenuProps }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          aria-label="Your profile"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:ring-2 hover:ring-brand/30 transition-all ml-0.5"
        >
          <Avatar name={user.name} src={user.avatarUrl} size={28} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[220px] rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl py-1.5 shadow-lg animate-fade-in-down"
        >
          {/* Profile header */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border-default">
            <Avatar name={user.name} src={user.avatarUrl} size={34} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-default truncate">{user.name}</p>
              <p className="text-[11px] text-subtlest truncate">{user.email}</p>
            </div>
          </div>

          <div className="py-1">
            <DM.Item asChild>
              <a
                href="/settings/members"
                className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-default font-medium cursor-pointer outline-none hover:bg-neutral rounded-[6px] mx-1 transition-colors"
              >
                <Settings size={14} className="text-subtle" />
                Settings
              </a>
            </DM.Item>
          </div>

          <div className="border-t border-border-default py-1">
            <DM.Item asChild>
              <button
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-danger font-medium cursor-pointer outline-none hover:bg-danger/6 rounded-[6px] mx-1 transition-colors"
                onClick={() => { window.location.href = "/api/auth/signout"; }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </DM.Item>
          </div>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

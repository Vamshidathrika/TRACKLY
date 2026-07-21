"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Avatar } from "@/components/ui/Avatar";
import type { NavUser } from "./TopNav";

export function UserMenu({ user }: { user: NavUser }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button aria-label="Your profile" className="ml-1 rounded-full p-0.5 hover:opacity-80">
          <Avatar name={user.name} src={user.avatarUrl} size={24} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={4}
          className="z-50 min-w-55 rounded-ds border border-border bg-surface py-2 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]">
          <div className="flex items-center gap-2 px-4 pb-2">
            <Avatar name={user.name} src={user.avatarUrl} size={32} />
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-text-subtle">{user.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <DM.Item asChild className="cursor-pointer px-4 py-1.5 text-sm outline-none data-[highlighted]:bg-[#F4F5F7]">
            <a href="/settings/members">Site settings</a>
          </DM.Item>
          <DM.Item asChild className="cursor-pointer px-4 py-1.5 text-sm outline-none data-[highlighted]:bg-[#F4F5F7]">
            <button className="w-full text-left" onClick={() => { window.location.href = "/api/auth/signout"; }}>
              Log out
            </button>
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

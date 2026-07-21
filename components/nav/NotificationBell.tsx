"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { fetchUserNotificationsAction, markReadAction } from "@/app/(app)/notifications/actions";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Date;
  actor: { name: string; avatarUrl?: string | null };
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = async () => {
    const data = await fetchUserNotificationsAction();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10s for live updates
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    await markReadAction();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-full p-1.5 hover:bg-[#EBECF0] transition-colors"
        >
          <Bell size={18} className="text-text-subtle" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold text-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-ds border border-border bg-surface shadow-lg outline-none max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="font-semibold text-sm text-text">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="flex flex-col overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-subtle italic">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 p-3 transition-colors hover:bg-[#F4F5F7] ${
                    !n.read ? "bg-[#DEEBFF]/30 font-medium" : ""
                  }`}
                >
                  <Avatar name={n.actor.name} src={n.actor.avatarUrl} size={28} />
                  <div className="flex flex-col text-xs gap-0.5">
                    <span className="font-semibold text-text">{n.title}</span>
                    <span className="text-text-subtle">{n.message}</span>
                    <span className="text-[10px] text-text-subtle opacity-70 mt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

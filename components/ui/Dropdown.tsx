"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

export type DropdownItem = { label: string; onSelect?: () => void; href?: string };

export function Dropdown({ trigger, items, align = "start" }:
  { trigger: React.ReactNode; items: DropdownItem[]; align?: "start" | "end" }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button className="flex h-8 items-center gap-1 rounded-ds px-2 text-sm font-medium text-text hover:bg-[#EBECF0] data-[state=open]:bg-[#DEEBFF] data-[state=open]:text-brand">
          {trigger}
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align={align} sideOffset={4}
          className="z-50 min-w-45 rounded-ds border border-border bg-surface py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]">
          {items.map((item) => (
            <DM.Item key={item.label} onSelect={item.onSelect}
              className="cursor-pointer px-4 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-[#F4F5F7]">
              {item.href ? <Link href={item.href} className="block">{item.label}</Link> : item.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

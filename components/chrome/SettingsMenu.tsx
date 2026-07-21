"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Settings } from "lucide-react";
import { setThemeAction } from "@/app/(app)/chrome-actions";
import type { ThemePref } from "@/lib/theme";

const options: { label: string; value: ThemePref }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Match system", value: "system" },
];

export function SettingsMenu() {
  async function choose(pref: ThemePref) {
    const resolved =
      pref === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : pref;
    document.documentElement.setAttribute("data-theme", resolved);
    await setThemeAction(pref);
  }
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button aria-label="Settings" className="rounded-full p-1.5 hover:bg-neutral-hovered">
          <Settings size={18} className="text-subtle" />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-45 rounded-ds border border-border-default bg-surface-overlay py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]"
        >
          <p className="px-4 py-1 text-[11px] font-bold tracking-wide text-subtlest uppercase">Theme</p>
          {options.map((o) => (
            <DM.Item
              key={o.value}
              onSelect={() => choose(o.value)}
              className="cursor-pointer px-4 py-1.5 text-sm text-default outline-none data-[highlighted]:bg-neutral-hovered"
            >
              {o.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

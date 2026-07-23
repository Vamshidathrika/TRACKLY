"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Settings, Sun, Moon, Monitor, Check } from "lucide-react";
import { setThemeAction } from "@/app/(app)/chrome-actions";
import { resolveTheme, type ThemePref } from "@/lib/theme";

const options: { label: string; value: ThemePref; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "System", value: "system", icon: Monitor },
];

export function SettingsMenu() {
  const currentTheme =
    typeof window !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") as ThemePref | null) ?? "system"
      : "system";

  async function choose(pref: ThemePref) {
    const resolved = resolveTheme(pref, window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", resolved);
    await setThemeAction(pref);
  }

  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          aria-label="Display settings"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-subtle hover:bg-neutral hover:text-default transition-all"
        >
          <Settings size={17} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[160px] rounded-[12px] border border-border-default bg-surface-overlay backdrop-blur-xl py-1.5 shadow-lg animate-fade-in-down"
        >
          <p className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-subtlest">
            Appearance
          </p>
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <DM.Item
                key={o.value}
                onSelect={() => choose(o.value)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-default font-medium cursor-pointer outline-none hover:bg-neutral rounded-[6px] mx-1 transition-colors"
              >
                <Icon size={14} className="text-subtle" />
                <span className="flex-1">{o.label}</span>
              </DM.Item>
            );
          })}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

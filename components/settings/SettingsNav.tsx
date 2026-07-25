"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ShieldCheck, Layers, Sliders, ShieldAlert, GitBranch, Bell, Workflow, Zap, Activity, Palette, Download } from "lucide-react";

export function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    { label: "Members & Access", href: "/settings/members", icon: Users },
    { label: "Permissions Matrix", href: "/settings/permissions", icon: ShieldCheck },
    { label: "Issue Types", href: "/settings/issue-types", icon: Layers },
    { label: "Field Configurations", href: "/settings/fields", icon: Sliders },
    { label: "Priorities & Resolutions", href: "/settings/priorities", icon: ShieldAlert },
    { label: "Workflow Schemes", href: "/settings/workflows", icon: GitBranch },
    { label: "Notification Schemes", href: "/settings/notifications", icon: Bell },
    { label: "Integrations & Apps", href: "/settings/integrations", icon: Workflow },
    { label: "Automation Engine", href: "/settings/automation", icon: Zap },
    { label: "Security Audit Stream", href: "/settings/audit-logs", icon: Activity },
    { label: "Branding & Themes", href: "/settings/branding", icon: Palette },
    { label: "Data Backup & Export", href: "/settings/export", icon: Download },
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border-default pb-0 mb-6 font-medium text-xs">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl border-b-2 text-xs transition-all duration-180 whitespace-nowrap cursor-pointer ${
              isActive
                ? "border-brand bg-brand/10 text-brand font-bold shadow-2xs"
                : "border-transparent text-subtle hover:text-default hover:bg-neutral/60"
            }`}
          >
            <Icon size={15} className={isActive ? "text-brand" : "text-subtlest"} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

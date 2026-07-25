"use client";

import { useState } from "react";
import { Palette, CheckCircle2, Globe, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function WorkspaceBrandingView({ siteName }: { siteName: string }) {
  const [name, setName] = useState(siteName);
  const [subdomain, setSubdomain] = useState(siteName.toLowerCase().replace(/\s+/g, "-"));
  const [selectedTheme, setSelectedTheme] = useState("jira_blue");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const themes = [
    { id: "jira_blue", name: "Jira Classic Blue", brandHex: "#0052CC", bgHex: "#091E42", badge: "Default Jira Theme" },
    { id: "linear_dark", name: "Linear Dark Obsidian", brandHex: "#5E6AD2", bgHex: "#121316", badge: "Minimalist Developer Dark" },
    { id: "emerald_pro", name: "Emerald Pro Suite", brandHex: "#10B981", bgHex: "#064E3B", badge: "High-Contrast Green" },
    { id: "violet_cyber", name: "Violet Cyberpunk", brandHex: "#8B5CF6", bgHex: "#2E1065", badge: "Modern AI Accent" },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-default">Workspace Branding & Custom Themes</h2>
          <p className="text-xs text-subtle">Customize your organization identity, custom subdomains, and UI theme accents</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Workspace Identity Form */}
        <div className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold text-default border-b border-border-default pb-3">
            Organization Identity & Subdomain
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Workspace Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-lg border border-border-default bg-surface px-3 text-xs font-medium text-default outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Workspace Custom Subdomain</label>
              <div className="flex items-center rounded-lg border border-border-default bg-surface overflow-hidden">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="h-9 flex-1 bg-transparent px-3 text-xs font-mono font-bold text-default outline-none"
                />
                <span className="bg-neutral px-3 py-2 text-xs font-mono font-bold text-subtle border-l border-border-default">
                  .trackly.dev
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Accent Picker */}
        <div className="rounded-xl border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold text-default border-b border-border-default pb-3 flex items-center gap-2">
            <Palette className="text-brand" size={18} />
            <span>Theme Accent Palette</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTheme(t.id)}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedTheme === t.id
                    ? "border-brand bg-brand/10 shadow-2xs"
                    : "border-border-default bg-surface hover:bg-neutral/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs"
                    style={{ backgroundColor: t.brandHex }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-default">{t.name}</h4>
                    <span className="text-[10px] text-subtle font-mono">{t.badge}</span>
                  </div>
                </div>

                {selectedTheme === t.id && (
                  <span className="h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center">
                    <Check size={14} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button appearance="primary" type="submit">
            Save Branding Changes
          </Button>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle2 size={16} /> Branding updated successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, ShieldAlert, AlertCircle, ArrowUp, ArrowDown, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

export type PriorityItem = {
  id: string;
  name: string;
  level: number;
  badgeColor: string;
  description: string;
};

export type ResolutionItem = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
};

export function PrioritiesSettings() {
  const [priorities] = useState<PriorityItem[]>([
    { id: "p-1", name: "Highest", level: 1, badgeColor: "red", description: "Blocks production or critical release path" },
    { id: "p-2", name: "High", level: 2, badgeColor: "orange", description: "Major impact on functionality or user experience" },
    { id: "p-3", name: "Medium", level: 3, badgeColor: "blue", description: "Normal work item with moderate impact" },
    { id: "p-4", name: "Low", level: 4, badgeColor: "gray", description: "Minor issue or non-urgent improvement" },
    { id: "p-5", name: "Lowest", level: 5, badgeColor: "teal", description: "Trivial tweak or optional enhancement" },
  ]);

  const [resolutions, setResolutions] = useState<ResolutionItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trackly_resolution_codes");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      { id: "r-1", name: "Fixed", description: "A fix for this issue has been checked in and verified.", isDefault: true },
      { id: "r-2", name: "Won't Fix", description: "The problem described will not be fixed.", isDefault: false },
      { id: "r-3", name: "Duplicate", description: "The problem is a duplicate of an existing issue.", isDefault: false },
      { id: "r-4", name: "Cannot Reproduce", description: "All attempts to reproduce this issue failed.", isDefault: false },
      { id: "r-5", name: "Incomplete", description: "The description lacks required information to act upon.", isDefault: false },
    ];
  });

  const [resName, setResName] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const saveResolutions = (next: ResolutionItem[]) => {
    setResolutions(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("trackly_resolution_codes", JSON.stringify(next));
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) return;

    const newRes: ResolutionItem = {
      id: `r-${Date.now()}`,
      name: resName.trim(),
      description: resDesc.trim() || "Custom resolution outcome",
      isDefault: false,
    };

    const next = [...resolutions, newRes];
    saveResolutions(next);
    setResName("");
    setResDesc("");
    showToast(`Resolution code "${newRes.name}" added and saved!`);
  };

  const handleDeleteResolution = (id: string, name: string) => {
    const next = resolutions.filter((r) => r.id !== id);
    saveResolutions(next);
    showToast(`Resolution code "${name}" removed.`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg animate-fade-in-up flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* SECTION 1: PRIORITIES */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-default">Priority Scheme Manager</h2>
          <p className="text-xs text-subtle">Define global issue priority levels, SLA urgencies, and badge colors</p>
        </div>

        <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-border-default bg-neutral/40">
            <span className="text-xs font-bold text-subtle">Active Priority Hierarchy ({priorities.length} Levels)</span>
          </div>

          <div className="divide-y divide-border-default text-xs">
            {priorities.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral/80 border border-border-default text-subtle">
                    Level {p.level}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag color={p.badgeColor as any}>{p.name}</Tag>
                    </div>
                    <p className="text-subtle text-[11px] mt-0.5">{p.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: RESOLUTION CODES */}
      <div className="flex flex-col gap-4 border-t border-border-default pt-6">
        <div>
          <h2 className="text-base font-bold text-default">Resolution Codes Manager</h2>
          <p className="text-xs text-subtle">Configure outcome status codes applied when closing or resolving issues</p>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddResolution} className="flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-xs">
          <h3 className="font-bold text-xs text-default flex items-center gap-1.5">
            <Plus size={15} className="text-brand" /> Add Resolution Code
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Resolution Name</label>
              <input
                type="text"
                placeholder="e.g. Obsolete, Deferred, Works As Intended..."
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-subtle">Description</label>
              <input
                type="text"
                placeholder="Explanation of when this resolution applies..."
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button appearance="primary" type="submit" disabled={!resName.trim()} className="h-8 text-xs">
              Add Resolution Code
            </Button>
          </div>
        </form>

        {/* List */}
        <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-border-default bg-neutral/40 flex items-center justify-between">
            <span className="text-xs font-bold text-subtle">Configured Resolution Codes ({resolutions.length})</span>
          </div>

          <div className="divide-y divide-border-default text-xs">
            {resolutions.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral/30 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-default">{r.name}</h4>
                    {r.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Check size={11} /> Default Code
                      </span>
                    )}
                  </div>
                  <p className="text-subtle text-[11px]">{r.description}</p>
                </div>

                {!r.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteResolution(r.id, r.name)}
                    className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
                    title="Delete Resolution"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

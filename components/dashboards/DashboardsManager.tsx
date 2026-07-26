"use client";

import { useState } from "react";
import { LayoutGrid, Plus, Pencil, Trash2, CheckCircle2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type DashboardEntry = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isFavorite: boolean;
  owner: string;
  lastModified: string;
};

type Props = {
  activeDashboardId: string;
  onSwitch: (id: string) => void;
};

export function DashboardsManager({ activeDashboardId, onSwitch }: Props) {
  const [dashboards, setDashboards] = useState<DashboardEntry[]>([
    {
      id: "dash-1",
      name: "Main Engineering Dashboard",
      description: "Full-stack engineering overview with sprint health, risk flags, and velocity",
      isDefault: true,
      isFavorite: true,
      owner: "You",
      lastModified: "Just now",
    },
    {
      id: "dash-2",
      name: "QA & Release Tracking",
      description: "Release burndown, bug triage queue, and created vs resolved metrics",
      isDefault: false,
      isFavorite: false,
      owner: "You",
      lastModified: "2 hours ago",
    },
    {
      id: "dash-3",
      name: "Executive Product Snapshot",
      description: "High-level KPI summary across all projects for leadership review",
      isDefault: false,
      isFavorite: false,
      owner: "You",
      lastModified: "Yesterday",
    },
  ]);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created: DashboardEntry = {
      id: `dash-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || "Custom workspace dashboard",
      isDefault: false,
      isFavorite: false,
      owner: "You",
      lastModified: "Just now",
    };

    setDashboards((prev) => [...prev, created]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    showToast(`Dashboard "${created.name}" created!`);
  };

  const handleDelete = (id: string) => {
    if (dashboards.find((d) => d.id === id)?.isDefault) return;
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    if (activeDashboardId === id) onSwitch("dash-1");
    showToast("Dashboard deleted.");
  };

  const toggleFavorite = (id: string) => {
    setDashboards((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
    );
  };

  const setDefault = (id: string) => {
    setDashboards((prev) =>
      prev.map((d) => ({ ...d, isDefault: d.id === id }))
    );
    showToast("Default dashboard updated.");
  };

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-brand" />
          <span className="text-sm font-bold text-default">My Dashboards</span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">{dashboards.length}</span>
        </div>
        <Button appearance="primary" onClick={() => setShowCreate(true)} className="h-7 text-xs flex items-center gap-1.5">
          <Plus size={13} /> New Dashboard
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl border border-brand/40 bg-brand/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-default">Create New Dashboard</span>
            <button type="button" onClick={() => setShowCreate(false)} className="text-subtlest hover:text-default">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Dashboard name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
            autoFocus
          />
          <input
            type="text"
            placeholder="Short description (optional)..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-2">
            <Button appearance="subtle" type="button" onClick={() => setShowCreate(false)} className="text-xs h-7">Cancel</Button>
            <Button appearance="primary" type="submit" disabled={!newName.trim()} className="text-xs h-7">Create</Button>
          </div>
        </form>
      )}

      {/* Dashboard List */}
      <div className="flex flex-col gap-2">
        {dashboards.map((d) => (
          <div
            key={d.id}
            onClick={() => onSwitch(d.id)}
            className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
              activeDashboardId === d.id
                ? "border-brand bg-brand/5 shadow-xs"
                : "border-border-default bg-surface hover:bg-neutral/30"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-extrabold shrink-0 ${
                activeDashboardId === d.id ? "bg-brand text-white" : "bg-neutral text-subtle"
              }`}>
                {d.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-default truncate">{d.name}</span>
                  {d.isDefault && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-subtle truncate">{d.description}</p>
                <span className="text-[10px] text-subtlest font-mono">Last modified: {d.lastModified}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleFavorite(d.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${d.isFavorite ? "text-amber-400" : "text-subtlest hover:text-amber-400"}`}
                title={d.isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Star size={14} fill={d.isFavorite ? "currentColor" : "none"} />
              </button>
              {!d.isDefault && (
                <button
                  onClick={() => setDefault(d.id)}
                  className="p-1.5 rounded-lg text-subtlest hover:text-brand transition-colors cursor-pointer"
                  title="Set as Default"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
              {!d.isDefault && (
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-lg text-subtlest hover:text-danger transition-colors cursor-pointer"
                  title="Delete Dashboard"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

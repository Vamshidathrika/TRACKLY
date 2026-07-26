"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Bookmark, Bug, CheckSquare, Layers, ShieldAlert, Sparkles, Sliders } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

export type IssueTypeScheme = {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  iconName: string;
  isSubtask: boolean;
  fields: string[];
};

export function IssueTypesSettings() {
  const [types, setTypes] = useState<IssueTypeScheme[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trackly_issue_types_scheme");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      { id: "it-1", name: "Story", description: "User functionality requirement or user story", badgeColor: "green", iconName: "Bookmark", isSubtask: false, fields: ["Summary", "Description", "Assignee", "Priority", "Sprint"] },
      { id: "it-2", name: "Bug", description: "Problem or error impairing system function", badgeColor: "red", iconName: "Bug", isSubtask: false, fields: ["Summary", "Description", "Environment", "Stacktrace", "Severity"] },
      { id: "it-3", name: "Task", description: "General work item or technical chore", badgeColor: "blue", iconName: "CheckSquare", isSubtask: false, fields: ["Summary", "Description", "Assignee", "Due Date"] },
      { id: "it-4", name: "Epic", description: "Large body of work encompassing multiple stories", badgeColor: "purple", iconName: "Layers", isSubtask: false, fields: ["Summary", "Description", "Target Date", "Epic Color"] },
      { id: "it-5", name: "Sub-task", description: "Smaller piece of work belonging to a parent issue", badgeColor: "teal", iconName: "Bookmark", isSubtask: true, fields: ["Summary", "Parent Issue", "Assignee"] },
    ];
  });

  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [color, setColor] = useState("blue");
  const [isSubtask, setIsSubtask] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const saveTypes = (next: IssueTypeScheme[]) => {
    setTypes(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("trackly_issue_types_scheme", JSON.stringify(next));
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    const newType: IssueTypeScheme = {
      id: `it-${Date.now()}`,
      name: typeName.trim(),
      description: typeDesc.trim() || "Custom issue type requirement",
      badgeColor: color,
      iconName: "Bookmark",
      isSubtask,
      fields: ["Summary", "Description", "Assignee", "Priority"],
    };

    const next = [...types, newType];
    saveTypes(next);
    setTypeName("");
    setTypeDesc("");
    showToast(`Issue type "${newType.name}" created and saved!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete issue type "${name}"? Existing tasks will be migrated to Task.`)) return;
    const next = types.filter((t) => t.id !== id);
    saveTypes(next);
    showToast(`Issue type "${name}" removed.`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg animate-fade-in-up flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-default">Issue Types & Screen Field Schemes</h2>
          <p className="text-xs text-subtle">Define issue categories, icons, colors, and required screen input fields</p>
        </div>
      </div>

      {/* Create Form */}
      <form onSubmit={handleCreateType} className="flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-xs">
        <h3 className="font-bold text-xs text-default flex items-center gap-1.5">
          <Plus size={15} className="text-brand" /> Create Custom Issue Type
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Type Name</label>
            <input
              type="text"
              placeholder="e.g. Milestone, Risk, Spike..."
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Description</label>
            <input
              type="text"
              placeholder="Purpose of this issue type..."
              value={typeDesc}
              onChange={(e) => setTypeDesc(e.target.value)}
              className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Badge Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 rounded-lg border border-border-default bg-surface px-2 text-xs font-medium outline-none focus:border-brand cursor-pointer"
            >
              <option value="green">Green (Story / Feature)</option>
              <option value="red">Red (Bug / Incident)</option>
              <option value="blue">Blue (Task / Chore)</option>
              <option value="purple">Purple (Epic / Initiative)</option>
              <option value="teal">Teal (Sub-task)</option>
              <option value="orange">Orange (Risk / Alert)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs font-bold text-default cursor-pointer">
            <input
              type="checkbox"
              checked={isSubtask}
              onChange={(e) => setIsSubtask(e.target.checked)}
              className="rounded border-border-default text-brand"
            />
            Is Sub-task Type (Requires parent issue reference)
          </label>
          <Button appearance="primary" type="submit" disabled={!typeName.trim()} className="h-8 text-xs">
            Create Issue Type
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-border-default bg-neutral/40 flex items-center justify-between">
          <span className="text-xs font-bold text-subtle">Configured Issue Types ({types.length})</span>
        </div>

        <div className="divide-y divide-border-default text-xs">
          {types.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral/30 transition-colors">
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Tag color={t.badgeColor as any}>{t.name}</Tag>
                  {t.isSubtask && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral text-subtle border border-border-default">
                      Sub-task
                    </span>
                  )}
                </div>
                <p className="text-subtle text-[11px] truncate">{t.description}</p>

                {/* Screen Fields */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-subtlest uppercase tracking-wider font-bold">Fields:</span>
                  {t.fields.map((f) => (
                    <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral/60 border border-border-default text-default">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(t.id, t.name)}
                className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
                title="Delete Issue Type"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

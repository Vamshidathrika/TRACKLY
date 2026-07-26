"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, CheckCircle2, Sliders, Type, Hash, Calendar, User, Link as LinkIcon, List, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { createCustomFieldAction, deleteCustomFieldAction } from "@/app/(app)/settings/fields/actions";

export type GlobalFieldItem = {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "Required" | "Optional" | "Hidden";
  screenContext: string;
};

export function FieldConfigurationsView() {
  const [fields, setFields] = useState<GlobalFieldItem[]>([
    { id: "gf-1", name: "Target Environment", type: "SELECT", description: "Target deployment environment (Production, Staging, QA)", status: "Required", screenContext: "Bug & Incident Forms" },
    { id: "gf-2", name: "Story Point Estimate", type: "NUMBER", description: "Fibonacci story point effort complexity score", status: "Optional", screenContext: "Story & Task Forms" },
    { id: "gf-3", name: "Figma Canvas URL", type: "URL", description: "Direct embed link to Figma design frame", status: "Optional", screenContext: "Story & Epic Forms" },
    { id: "gf-4", name: "Component Lead", type: "USER", description: "Lead engineer responsible for code module", status: "Optional", screenContext: "All Issue Screens" },
    { id: "gf-5", name: "Target Release Date", type: "DATE", description: "Target release milestone date", status: "Required", screenContext: "Epic & Milestone Forms" },
  ]);

  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");
  const [status, setStatus] = useState<"Required" | "Optional" | "Hidden">("Optional");
  const [desc, setDesc] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await createCustomFieldAction({
        name: name.trim(),
        type,
        status,
        description: desc.trim(),
      });

      const newField: GlobalFieldItem = {
        id: result.field?.id || `gf-${Date.now()}`,
        name: name.trim(),
        type,
        description: desc.trim() || "Global custom field requirement",
        status,
        screenContext: "All Issue Screens",
      };

      setFields((prev) => [...prev, newField]);
      setName("");
      setDesc("");
      showToast(`Global field "${newField.name}" created in database!`);
    });
  };

  const handleDelete = (id: string, name: string) => {
    startTransition(async () => {
      if (!id.startsWith("gf-")) {
        await deleteCustomFieldAction(id);
      }
      setFields((prev) => prev.filter((f) => f.id !== id));
      showToast(`Field "${name}" removed from configuration scheme.`);
    });
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
          <h2 className="text-base font-bold text-default">Global Field Configurations & Schemes</h2>
          <p className="text-xs text-subtle">Define custom field definitions, validation rules, and screen form visibility</p>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddField} className="flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-xs">
        <h3 className="font-bold text-xs text-default flex items-center gap-1.5">
          <Plus size={15} className="text-brand" /> Create Global Custom Field
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Field Name</label>
            <input
              type="text"
              placeholder="e.g. Severity, Customer Tier..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Field Data Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-8 rounded-lg border border-border-default bg-surface px-2 text-xs font-medium outline-none focus:border-brand cursor-pointer"
            >
              <option value="TEXT">Short Text String</option>
              <option value="SELECT">Single Dropdown Select</option>
              <option value="MULTI_SELECT">Multi-Select List</option>
              <option value="NUMBER">Numeric Value</option>
              <option value="DATE">Date Picker</option>
              <option value="USER">User / Assignee Picker</option>
              <option value="URL">Web URL Link</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-subtle">Visibility Scheme</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-8 rounded-lg border border-border-default bg-surface px-2 text-xs font-medium outline-none focus:border-brand cursor-pointer"
            >
              <option value="Required">Required (Must be filled)</option>
              <option value="Optional">Optional</option>
              <option value="Hidden">Hidden on Create Form</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <input
            type="text"
            placeholder="Field description or help text..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-1 max-w-md h-8 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
          />
          <Button appearance="primary" type="submit" disabled={!name.trim() || isPending} className="h-8 text-xs">
            {isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
            <span>{isPending ? "Creating..." : "Add Field"}</span>
          </Button>
        </div>
      </form>

      {/* Field Directory Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-border-default bg-neutral/40 flex items-center justify-between">
          <span className="text-xs font-bold text-subtle">Global Fields Directory ({fields.length})</span>
        </div>

        <div className="divide-y divide-border-default text-xs">
          {fields.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral/30 transition-colors">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-default">{f.name}</h4>
                  <Tag color="blue">{f.type}</Tag>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      f.status === "Required"
                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        : f.status === "Optional"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-neutral text-subtle border border-border-default"
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <p className="text-subtle text-[11px]">{f.description}</p>
                <span className="text-[10px] font-mono text-subtlest">Screen Context: {f.screenContext}</span>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(f.id, f.name)}
                className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
                title="Delete Field"
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

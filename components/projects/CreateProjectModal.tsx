"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Layers, Plus, Check, SlidersHorizontal, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createProjectAction } from "@/app/(app)/projects/actions";
import { generateProjectKey } from "@/lib/projects";

type ColumnConfig = {
  id: string;
  name: string;
  status: string;
  wipLimit: number | "";
  enabled: boolean;
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "col-todo", name: "To Do", status: "TO_DO", wipLimit: "", enabled: true },
  { id: "col-inprogress", name: "In Progress", status: "IN_PROGRESS", wipLimit: 5, enabled: true },
  { id: "col-inreview", name: "In Review", status: "IN_REVIEW", wipLimit: 3, enabled: true },
  { id: "col-testing", name: "QA / Testing", status: "IN_REVIEW", wipLimit: 4, enabled: true },
  { id: "col-done", name: "Done", status: "DONE", wipLimit: "", enabled: true },
];

export function CreateProjectModal({
  trigger,
  defaultType = "KANBAN",
  onSuccess,
}: {
  trigger?: React.ReactNode;
  defaultType?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [projectType, setProjectType] = useState<string>("KANBAN");
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [customStageName, setCustomStageName] = useState("");

  const [state, action, pending] = useActionState(createProjectAction, {} as { error?: string; success?: boolean; projectKey?: string });

  useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setKey("");
      setProjectType(defaultType);
      setColumns(DEFAULT_COLUMNS);
    }
  }, [open, defaultType]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setName("");
      setKey("");
      onSuccess?.();
      router.refresh();
      if (state.projectKey) {
        router.push(`/projects/${state.projectKey}/board`);
      }
    }
  }, [state.success, state.projectKey, router, onSuccess]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setKey(generateProjectKey(val));
  };

  const handleToggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleWipLimitChange = (id: string, limitVal: string) => {
    const num = limitVal !== "" ? parseInt(limitVal, 10) : "";
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, wipLimit: isNaN(num as number) ? "" : num } : c))
    );
  };

  const handleAddCustomColumn = () => {
    if (!customStageName.trim()) return;
    const id = `col-custom-${Date.now()}`;
    setColumns((prev) => [
      ...prev.slice(0, prev.length - 1),
      { id, name: customStageName.trim(), status: "IN_PROGRESS", wipLimit: 4, enabled: true },
      prev[prev.length - 1],
    ]);
    setCustomStageName("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || <Button appearance="primary">Create project</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[100] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-brand/10 text-brand">
                <Layers size={18} />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text">
                  Create Project {step === 2 && "— Custom Board Workflow"}
                </Dialog.Title>
                <p className="text-xs text-text-subtle">
                  {step === 1
                    ? "Step 1 of 2: Basic Project Information & Template"
                    : "Step 2 of 2: Configure Board Columns & WIP Capacity Limits"}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-lg p-1.5 hover:bg-neutral-hovered transition-colors">
                <X size={16} className="text-text-subtle" />
              </button>
            </Dialog.Close>
          </div>

          <form action={action} className="mt-4 flex flex-col gap-4">
            {step === 1 ? (
              <>
                <Input
                  name="name"
                  label="Project Name"
                  placeholder="e.g. Mobile App Redesign"
                  value={name}
                  onChange={handleNameChange}
                  required
                />
                <Input
                  name="key"
                  label="Project Key"
                  placeholder="e.g. MAR"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-subtle">Board Template Preset</label>
                  <select
                    name="type"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-all focus:border-brand"
                  >
                    <option value="KANBAN">Software Kanban (Continuous Flow)</option>
                    <option value="SCRUM">Scrum Backlog (Sprint Sprints)</option>
                    <option value="BUG_TRACKING">Bug Tracking (Quality Assurance)</option>
                  </select>
                </div>

                <div className="mt-2 flex justify-end gap-2 border-t border-border/40 pt-4">
                  <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    appearance="primary"
                    disabled={!name.trim() || !key.trim()}
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5"
                  >
                    Next: Custom Columns <ArrowRight size={14} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="type" value={projectType} />

                <div className="flex items-center justify-between text-xs font-bold text-text-subtle mb-1">
                  <span>ACTIVE BOARD STAGES</span>
                  <span>WIP CAPACITY LIMIT</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        col.enabled
                          ? "bg-surface border-border hover:border-brand/40"
                          : "bg-surface/40 border-border/30 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleColumn(col.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            col.enabled
                              ? "bg-brand border-brand text-white"
                              : "border-border text-transparent"
                          }`}
                        >
                          <Check size={12} />
                        </button>
                        <span className="text-xs font-semibold text-text">{col.name}</span>
                      </div>

                      {col.enabled && col.status !== "DONE" && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-text-subtle">Max:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            placeholder="None"
                            value={col.wipLimit}
                            onChange={(e) => handleWipLimitChange(col.id, e.target.value)}
                            className="w-16 h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-center outline-none focus:border-brand"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Custom Stage Field */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="+ Add custom column stage (e.g. Staging)..."
                    value={customStageName}
                    onChange={(e) => setCustomStageName(e.target.value)}
                    className="flex-1 h-8 rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColumn}
                    disabled={!customStageName.trim()}
                    className="h-8 px-3 rounded-lg bg-brand/10 text-brand font-semibold text-xs hover:bg-brand/20 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Stage
                  </button>
                </div>

                {state.error && <p className="text-xs text-danger font-semibold">{state.error}</p>}

                <div className="mt-4 flex justify-between gap-2 border-t border-border/40 pt-4">
                  <Button type="button" appearance="subtle" onClick={() => setStep(1)} className="flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" appearance="primary" disabled={pending}>
                      {pending ? "Creating Project…" : "Create Project"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

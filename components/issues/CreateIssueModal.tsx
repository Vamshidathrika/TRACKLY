"use client";

import { useState, useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle, BookOpen, Bug, Layers, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createIssueAction, fetchUserProjectsAction, fetchWorkspaceMembersAction } from "@/app/(app)/issues/actions";

type IssueTypeMeta = {
  value: string;
  label: string;
  color: string;
  icon: React.ReactNode;
};

const ISSUE_TYPES: IssueTypeMeta[] = [
  {
    value: "STORY",
    label: "Story",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: <BookOpen size={13} className="text-emerald-600" />,
  },
  {
    value: "TASK",
    label: "Task",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: <span className="w-3.5 h-3.5 rounded-sm bg-blue-500 inline-block shrink-0" />,
  },
  {
    value: "BUG",
    label: "Bug",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: <Bug size={13} className="text-red-600" />,
  },
  {
    value: "EPIC",
    label: "Epic",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    icon: <Layers size={13} className="text-violet-600" />,
  },
  {
    value: "SUBTASK",
    label: "Sub-task",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    icon: <span className="w-3 h-3 rounded-full border-2 border-gray-400 inline-block shrink-0" />,
  },
];

const PRIORITIES = [
  { value: "HIGHEST", label: "Highest", color: "text-red-600" },
  { value: "HIGH", label: "High", color: "text-orange-500" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-500" },
  { value: "LOW", label: "Low", color: "text-blue-500" },
  { value: "LOWEST", label: "Lowest", color: "text-gray-400" },
];

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-[12px] font-semibold text-subtle">
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
  );
}

function FieldInput({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

const inputClass =
  "h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[13px] text-default outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-subtlest";

const selectClass =
  "h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[13px] text-default outline-none cursor-pointer hover:bg-neutral transition-all focus:border-brand";

import { useRouter } from "next/navigation";

export function CreateIssueModal({
  trigger,
  defaultProjectId,
  defaultStatus,
  defaultSprintId,
  defaultAssigneeId,
  defaultType = "STORY",
  onSuccess,
}: {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
  defaultStatus?: string;
  defaultSprintId?: string;
  defaultAssigneeId?: string;
  defaultType?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; key: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedType, setSelectedType] = useState(defaultType);
  const [state, action, pending] = useActionState(createIssueAction, {} as { error?: string; success?: boolean });

  useEffect(() => {
    if (open) {
      setSelectedType(defaultType);
      fetchUserProjectsAction().then(setProjects);
      fetchWorkspaceMembersAction().then(setMembers);
    }
  }, [open, defaultType]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  const selectedTypeMeta = ISSUE_TYPES.find((t) => t.value === selectedType) ?? ISSUE_TYPES[0];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? <Button appearance="primary">Create</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-border-default bg-surface shadow-xl outline-none max-h-[90vh] overflow-y-auto animate-scale-in">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-default">
            <Dialog.Title className="text-[16px] font-bold text-default">
              Create task
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-subtle hover:bg-neutral hover:text-default transition-all"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <form action={action} className="flex flex-col gap-4 px-6 py-5">
            {defaultStatus && <input type="hidden" name="status" value={defaultStatus} />}
            {defaultSprintId && <input type="hidden" name="sprintId" value={defaultSprintId} />}

            {/* Task Type — pill selector */}
            <FieldInput>
              <FieldLabel label="Task type" required />
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedType(t.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[12px] font-semibold transition-all ${
                      selectedType === t.value
                        ? t.color
                        : "border-border-default text-subtle hover:bg-neutral"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={selectedType} />
            </FieldInput>

            {/* Project */}
            <FieldInput>
              <FieldLabel label="Project" required />
              <select name="projectId" defaultValue={defaultProjectId} required className={selectClass}>
                {projects.length === 0 ? (
                  <option value="">No projects available — create one first</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))
                )}
              </select>
            </FieldInput>

            {/* Summary */}
            <FieldInput>
              <FieldLabel label="Summary" required />
              <input
                name="summary"
                type="text"
                placeholder="What needs to be done?"
                required
                className={inputClass}
              />
            </FieldInput>

            {/* Description */}
            <FieldInput>
              <FieldLabel label="Description" />
              <textarea
                name="description"
                rows={3}
                placeholder="Add more detail or context…"
                className="rounded-[8px] border border-border-default bg-surface p-3 text-[13px] text-default outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-subtlest resize-none"
              />
            </FieldInput>

            {/* Assignee + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <FieldInput>
                <FieldLabel label="Assignee" />
                <select name="assigneeId" defaultValue={defaultAssigneeId || ""} className={selectClass}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </FieldInput>

              <FieldInput>
                <FieldLabel label="Priority" />
                <select name="priority" defaultValue="MEDIUM" className={selectClass}>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FieldInput>
            </div>

            {/* Due Date + Story Points */}
            <div className="grid grid-cols-2 gap-3">
              <FieldInput>
                <FieldLabel label="Due date" />
                <input
                  name="dueDate"
                  type="date"
                  className={inputClass}
                />
              </FieldInput>

              <FieldInput>
                <FieldLabel label="Story points" />
                <input
                  name="storyPoints"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 3"
                  className={inputClass}
                />
              </FieldInput>
            </div>

            {/* Error */}
            {state.error && (
              <div className="flex items-center gap-2 rounded-[8px] bg-danger/8 border border-danger/20 px-3 py-2.5">
                <AlertCircle size={14} className="text-danger shrink-0" />
                <span className="text-[12px] text-danger font-medium">{state.error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t border-border-default mt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 px-4 rounded-[8px] text-[13px] font-medium text-subtle hover:bg-neutral transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || projects.length === 0}
                className="h-9 px-5 rounded-[8px] bg-brand text-white text-[13px] font-semibold hover:bg-brand-hovered active:scale-[0.97] transition-all disabled:opacity-50 shadow-sm"
              >
                {pending ? "Creating…" : "Create task"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

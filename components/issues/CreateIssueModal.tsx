"use client";

import { useState, useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createIssueAction, fetchUserProjectsAction } from "@/app/(app)/issues/actions";

export function CreateIssueModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; key: string }[]>([]);
  const [state, action, pending] = useActionState(createIssueAction, {} as { error?: string; success?: boolean });

  useEffect(() => {
    if (open) {
      fetchUserProjectsAction().then(setProjects);
    }
  }, [open]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? <Button appearance="primary">Create</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-ds border border-border bg-surface p-6 shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4">
            <Dialog.Title className="text-lg font-semibold text-text">Create Issue</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-ds p-1 hover:bg-neutral-hovered">
                <X size={16} className="text-text-subtle" />
              </button>
            </Dialog.Close>
          </div>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Project</label>
              <select
                name="projectId"
                required
                className="h-9 rounded-ds border-2 border-border bg-surface px-2 text-sm outline-none transition-colors focus:border-brand"
              >
                {projects.length === 0 ? (
                  <option value="">No projects available (create one first)</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Issue Type</label>
              <select
                name="type"
                defaultValue="STORY"
                className="h-9 rounded-ds border-2 border-border bg-surface px-2 text-sm outline-none transition-colors focus:border-brand"
              >
                <option value="STORY">Story 🟢</option>
                <option value="TASK">Task 🟦</option>
                <option value="BUG">Bug 🔴</option>
                <option value="EPIC">Epic 🟣</option>
                <option value="SUBTASK">Sub-task ⚪</option>
              </select>
            </div>

            <Input name="summary" label="Summary" placeholder="What needs to be done?" required />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Add more detail..."
                className="rounded-ds border-2 border-border bg-surface p-2 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-subtle">Priority</label>
                <select
                  name="priority"
                  defaultValue="MEDIUM"
                  className="h-9 rounded-ds border-2 border-border bg-surface px-2 text-sm outline-none transition-colors focus:border-brand"
                >
                  <option value="HIGHEST">Highest</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                  <option value="LOWEST">Lowest</option>
                </select>
              </div>

              <Input name="storyPoints" type="number" step="0.5" label="Story Points" placeholder="e.g. 3" />
            </div>

            {state.error && <p className="text-xs text-danger">{state.error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" disabled={pending || projects.length === 0}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

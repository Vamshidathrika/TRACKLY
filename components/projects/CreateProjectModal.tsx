"use client";

import { useState, useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createProjectAction } from "@/app/(app)/projects/actions";
import { generateProjectKey } from "@/lib/projects";

export function CreateProjectModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [state, action, pending] = useActionState(createProjectAction, {} as { error?: string; success?: boolean });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setName("");
      setKey("");
    }
  }, [state.success]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setKey(generateProjectKey(val));
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || <Button appearance="primary">Create project</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-ds border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-center justify-between pb-4">
            <Dialog.Title className="text-lg font-semibold text-text">Create Project</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-ds p-1 hover:bg-neutral-hovered">
                <X size={16} className="text-text-subtle" />
              </button>
            </Dialog.Close>
          </div>
          <form action={action} className="flex flex-col gap-4">
            <Input
              name="name"
              label="Project Name"
              placeholder="e.g. Mobile App"
              value={name}
              onChange={handleNameChange}
              required
            />
            <Input
              name="key"
              label="Project Key"
              placeholder="e.g. MA"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Project Type</label>
              <select
                name="type"
                defaultValue="KANBAN"
                className="h-9 rounded-ds border-2 border-border bg-surface px-2 text-sm outline-none transition-colors focus:border-brand"
              >
                <option value="KANBAN">Kanban (Continuous flow)</option>
                <option value="SCRUM">Scrum (Sprint-based)</option>
              </select>
            </div>
            {state.error && <p className="text-xs text-danger">{state.error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" disabled={pending}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

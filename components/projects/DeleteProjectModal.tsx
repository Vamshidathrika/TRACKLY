"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteProjectAction } from "@/app/(app)/projects/[key]/settings/actions";

export function DeleteProjectModal({
  projectId,
  projectKey,
  projectName,
  trigger,
}: {
  projectId: string;
  projectKey: string;
  projectName: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim().toUpperCase() === projectKey.trim().toUpperCase();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteProjectAction(projectId);
      if (res && res.error) {
        setError(res.error);
        setIsDeleting(false);
      } else {
        setOpen(false);
        router.push("/projects");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred while deleting the project.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <Button appearance="danger" type="button">
            Delete Project
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-danger/30 bg-surface p-6 shadow-2xl">
          <div className="flex items-start justify-between pb-3">
            <div className="flex items-center gap-2.5 text-danger font-bold text-base">
              <div className="p-2 rounded-lg bg-danger/10 text-danger">
                <AlertTriangle size={20} />
              </div>
              Delete Project "{projectName}"?
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-lg p-1.5 hover:bg-neutral text-subtle">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-subtle leading-relaxed mb-4">
            This action <strong className="text-danger font-bold">cannot be undone</strong>. Deleting this project will permanently remove all associated issues, sprints, custom fields, automation rules, and member roles.
          </p>

          <form onSubmit={handleDelete} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-default">
                Type <span className="font-mono font-bold text-danger select-all">{projectKey}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={projectKey}
                className="h-9 rounded-lg border border-border-default bg-surface px-3 font-mono text-xs outline-none focus:border-danger"
              />
            </div>

            {error && <p className="text-xs text-danger font-medium">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                appearance="danger"
                disabled={!isConfirmed || isDeleting}
              >
                {isDeleting ? "Deleting..." : "Permanently Delete Project"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X, ShieldAlert, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteProjectAction, leaveProjectAction } from "@/app/(app)/projects/[key]/settings/actions";

export function DeleteProjectModal({
  projectId,
  projectKey,
  projectName,
  isOwnerOrAdmin = true,
  trigger,
}: {
  projectId: string;
  projectKey: string;
  projectName: string;
  isOwnerOrAdmin?: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim().toUpperCase() === projectKey.trim().toUpperCase();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || !isOwnerOrAdmin) return;

    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteProjectAction(projectId);
      if (res && "error" in res && res.error) {
        if (res.error === "ONLY_OWNER_OR_ADMIN_CAN_DELETE") {
          setError("Only board admins or workspace owners can delete this project. Please contact your workspace administrator.");
        } else {
          setError(res.error);
        }
        setIsDeleting(false);
      } else {
        try {
          const storageKey = "trackly-recent-projects";
          const existing: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
          const updated = existing.filter((k) => k.toUpperCase() !== projectKey.toUpperCase());
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch { /* ignore */ }
        setOpen(false);
        router.push("/projects");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred while deleting the project.");
      setIsDeleting(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);
    try {
      const res = await leaveProjectAction(projectId);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setIsLeaving(false);
      } else {
        setOpen(false);
        router.push("/projects");
        router.refresh();
      }
    } catch {
      setError("An error occurred while exiting the project.");
      setIsLeaving(false);
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
              Delete Project &quot;{projectName}&quot;?
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-lg p-1.5 hover:bg-neutral text-subtle">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {!isOwnerOrAdmin ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldAlert size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-extrabold">Admin Permission Required</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    Only board admins or workspace owners can delete this project. Please contact your workspace administrator to request project deletion.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-neutral/30 p-3 text-xs flex items-start justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-brand shrink-0" />
                  <div>
                    <p className="font-bold text-default">Want to leave this board?</p>
                    <p className="text-[11px] text-subtle">You can exit this board to remove it from your sidebar.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  appearance="subtle"
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="shrink-0 text-xs font-bold border border-border flex items-center gap-1.5"
                >
                  <LogOut size={13} /> {isLeaving ? "Exiting..." : "Exit Board"}
                </Button>
              </div>

              {error && <p className="text-xs text-danger font-medium">{error}</p>}

              <div className="flex justify-end pt-2">
                <Button type="button" appearance="subtle" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


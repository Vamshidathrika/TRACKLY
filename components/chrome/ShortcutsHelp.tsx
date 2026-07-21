"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const shortcuts = [
    { keys: ["Cmd+K", "/"], description: "Open Command Palette" },
    { keys: ["C"], description: "Create Issue" },
    { keys: ["?"], description: "Open Keyboard Shortcuts Help" },
    { keys: ["G D"], description: "Go to Dashboards" },
    { keys: ["G P"], description: "Go to Projects" },
    { keys: ["G Y"], description: "Go to Your Work" },
    { keys: ["\\"], description: "Toggle Light/Dark Theme" },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#091E42]/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border-default bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <Dialog.Title className="text-base font-bold text-default">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-neutral-hovered text-subtle">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <table className="w-full text-sm text-default">
              <thead>
                <tr className="border-b border-border-default text-left text-xs font-bold text-subtlest uppercase tracking-wider">
                  <th className="pb-2">Shortcut</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/40">
                {shortcuts.map((s, i) => (
                  <tr key={i} className="hover:bg-neutral/20">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {s.keys.map((k, idx) => (
                        <span key={idx}>
                          <kbd className="rounded border border-border-default bg-surface-sunken px-1.5 py-0.5 shadow-xs font-bold text-default">
                            {k}
                          </kbd>
                          {idx < s.keys.length - 1 && <span className="mx-1 text-subtlest">or</span>}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 text-subtle font-medium">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

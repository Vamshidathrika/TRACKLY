"use client";
import { useActionState, useState } from "react";
import { inviteMemberAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Check, Copy, Mail } from "lucide-react";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, {} as {
    error?: string;
    link?: string;
    emailSent?: boolean;
    recipient?: string;
  });
  const [copied, setCopied] = useState(false);

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-ds border border-border-default bg-surface p-4 max-w-2xl">
      <form action={action} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            name="email"
            type="email"
            label="Invite a teammate to your workspace"
            placeholder="teammate@company.com"
            required
          />
        </div>
        <Button appearance="primary" type="submit" disabled={pending} className="gap-1.5 bg-brand hover:bg-brand-hovered text-white">
          <Mail size={16} />
          {pending ? "Inviting…" : "Send Invite"}
        </Button>
      </form>

      {state.error && <p className="text-xs font-semibold text-danger">{state.error}</p>}

      {state.link && (
        <div className="flex flex-col gap-2 rounded-ds bg-neutral p-3 border border-border">
          {state.emailSent ? (
            <p className="text-xs font-semibold text-success flex items-center gap-1.5">
              <Check size={14} /> Invitation email sent to {state.recipient}!
            </p>
          ) : (
            <p className="text-xs text-text-subtle">
              Invite link generated:
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={state.link}
              className="flex-1 rounded border border-border bg-surface px-2.5 py-1 text-xs font-mono text-text outline-none"
            />
            <Button
              appearance="default"
              type="button"
              onClick={() => handleCopy(state.link!)}
              className="text-xs gap-1"
            >
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

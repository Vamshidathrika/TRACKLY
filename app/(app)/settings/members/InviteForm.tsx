"use client";
import { useActionState, useState } from "react";
import { inviteMemberAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Check, Copy, Mail, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

export type ProjectOption = {
  id: string;
  name: string;
  key: string;
};

export function InviteForm({ projects = [] }: { projects?: ProjectOption[] }) {
  const [state, action, pending] = useActionState(inviteMemberAction, {} as {
    error?: string;
    link?: string;
    emailSent?: boolean;
    recipient?: string;
    results?: Array<{ email: string; link: string; emailSent: boolean }>;
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 3000);
  }

  return (
    <div className="mb-6 flex flex-col gap-3.5 rounded-xl border border-border-default bg-surface p-4 sm:p-5 max-w-3xl shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-default flex items-center gap-2">
            <Mail size={16} className="text-brand" /> Invite Teammates to Workspace
          </h3>
          <p className="text-xs text-subtle">
            Enter one or more email addresses (separated by commas) to dispatch instant email invitations.
          </p>
        </div>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 w-full">
            <input
              name="email"
              type="text"
              required
              placeholder="alex@company.com, sam@company.com"
              className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface text-xs font-medium text-default outline-none focus:border-brand placeholder:text-subtlest"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              name="role"
              defaultValue="MEMBER"
              className="h-10 px-3 rounded-lg border border-border-default bg-surface text-xs font-semibold text-default outline-none focus:border-brand cursor-pointer shrink-0"
              title="Select Workspace Role"
            >
              <option value="MEMBER">Role: Member</option>
              <option value="ADMIN">Role: Admin</option>
            </select>

            {projects.length > 0 && (
              <select
                name="projectId"
                defaultValue=""
                className="h-10 px-3 rounded-lg border border-border-default bg-surface text-xs font-medium text-default outline-none focus:border-brand cursor-pointer shrink-0 max-w-[160px] truncate"
                title="Limit to specific project"
              >
                <option value="">Scope: All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            )}

            <Button
              appearance="primary"
              type="submit"
              disabled={pending}
              className="h-10 px-4 text-xs font-bold gap-1.5 bg-brand hover:bg-brand-hovered text-white shrink-0"
            >
              <Mail size={15} />
              {pending ? "Sending…" : "Send Invite"}
            </Button>
          </div>
        </div>
      </form>

      {state.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {state.error}
        </div>
      )}

      {/* Single Email Result Banner */}
      {state.link && !state.results && (
        <div className="flex flex-col gap-2 rounded-lg bg-neutral/60 p-3 border border-border-default text-xs">
          {state.emailSent ? (
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check size={14} /> Invitation email automatically sent to {state.recipient}!
            </p>
          ) : (
            <p className="text-subtle font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand" /> Invite generated for {state.recipient}. (Email delivery not configured in dev — copy URL below):
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={state.link}
              className="flex-1 rounded border border-border-default bg-surface px-2.5 py-1.5 text-xs font-mono text-default outline-none select-all"
            />
            <Button
              appearance="default"
              type="button"
              onClick={() => handleCopy(state.link!)}
              className="text-xs h-8 gap-1.5"
            >
              {copiedLink === state.link ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copiedLink === state.link ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      )}

      {/* Multi-Email Results Banner */}
      {state.results && state.results.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-neutral/60 p-3.5 border border-border-default text-xs">
          <div className="flex items-center justify-between border-b border-border-default pb-2">
            <span className="font-bold text-default flex items-center gap-1.5">
              <Check size={15} className="text-emerald-500" /> Dispatched {state.results.length} invitations
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pt-1">
            {state.results.map((r, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-surface border border-border-default">
                <div className="flex items-center gap-2 font-mono text-[11px] truncate">
                  <Mail size={13} className="text-subtle shrink-0" />
                  <span className="font-semibold text-default font-sans">{r.email}</span>
                  {r.emailSent ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold font-sans">
                      Email Sent
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold font-sans">
                      Link Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={r.link}
                    className="w-44 h-7 rounded border border-border-default bg-neutral/50 px-2 font-mono text-[10px] text-subtle outline-none"
                  />
                  <Button
                    appearance="subtle"
                    type="button"
                    onClick={() => handleCopy(r.link)}
                    className="h-7 text-[11px] px-2 gap-1 font-semibold"
                  >
                    {copiedLink === r.link ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copiedLink === r.link ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Mail, Copy, Check, Trash2, RotateCw, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resendInviteAction, revokeInviteAction } from "@/app/(app)/settings/members/actions";
import type { Role } from "@prisma/client";

export type PendingInviteItem = {
  id: string;
  email: string | null;
  role: Role;
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  project?: {
    id: string;
    name: string;
    key: string;
  } | null;
};

export function PendingInvitesList({
  invites: initialInvites,
}: {
  invites: PendingInviteItem[];
}) {
  const [invites, setInvites] = useState<PendingInviteItem[]>(initialInvites);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleResend = async (invite: PendingInviteItem) => {
    setResendingId(invite.id);
    setActionNotice(null);
    const res = await resendInviteAction(invite.id);
    setResendingId(null);

    if (res.error) {
      setActionNotice({ id: invite.id, type: "error", text: res.error });
    } else if (res.emailSent) {
      setActionNotice({ id: invite.id, type: "success", text: `Invitation email resent to ${invite.email}` });
    } else {
      setActionNotice({ id: invite.id, type: "success", text: "Invite link refreshed. Copy link to share." });
    }

    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    setRevokingId(inviteId);
    setActionNotice(null);
    const res = await revokeInviteAction(inviteId);
    setRevokingId(null);

    if (res.error) {
      setActionNotice({ id: inviteId, type: "error", text: res.error });
    } else {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
  };

  const handleCopy = (invite: PendingInviteItem) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${baseUrl}/invite/${invite.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (invites.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col gap-3 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-default flex items-center gap-2">
            <Clock size={16} className="text-brand" /> Pending Invitations ({invites.length})
          </h2>
          <p className="text-xs text-subtle">
            Workspace invites that have been dispatched but not yet accepted
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-semibold text-subtle">
              <th className="px-4 py-3">Recipient Email</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Sent Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {invites.map((invite) => {
              const isResending = resendingId === invite.id;
              const isRevoking = revokingId === invite.id;
              const isCopied = copiedId === invite.id;
              const createdDate = new Date(invite.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <tr key={invite.id} className="hover:bg-neutral/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-default font-mono text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-default font-sans font-semibold">
                        <Mail size={13} className="text-subtle shrink-0" />
                        {invite.email || "Shareable Link"}
                      </span>
                      {actionNotice?.id === invite.id && (
                        <span
                          className={`text-[10px] font-medium font-sans ${
                            actionNotice.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
                          }`}
                        >
                          {actionNotice.text}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        invite.role === "ADMIN"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      <ShieldCheck size={11} />
                      {invite.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-subtle">
                    {invite.project ? (
                      <span className="px-2 py-0.5 rounded bg-neutral font-mono text-[10px]">
                        {invite.project.key}
                      </span>
                    ) : (
                      <span className="text-[11px]">Workspace</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-subtle text-[11px]">{createdDate}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        appearance="subtle"
                        type="button"
                        onClick={() => handleCopy(invite)}
                        className="h-7 text-[11px] px-2 gap-1 font-medium"
                        title="Copy invite URL"
                      >
                        {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {isCopied ? "Copied" : "Copy Link"}
                      </Button>
                      <Button
                        appearance="subtle"
                        type="button"
                        onClick={() => handleResend(invite)}
                        disabled={isResending}
                        className="h-7 text-[11px] px-2 gap-1 font-medium text-brand hover:bg-brand/10"
                        title="Resend invitation email"
                      >
                        <RotateCw size={12} className={isResending ? "animate-spin" : ""} />
                        {isResending ? "Sending..." : "Resend Mail"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(invite.id)}
                        disabled={isRevoking}
                        className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-all cursor-pointer disabled:opacity-50"
                        title="Revoke invitation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

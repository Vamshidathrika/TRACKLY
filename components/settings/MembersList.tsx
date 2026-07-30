"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Download, UserMinus, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";
import { updateMemberRoleAction, removeMemberAction, inviteMemberAction } from "@/app/(app)/settings/members/actions";
import type { Role } from "@prisma/client";

export type MemberItem = {
  id: string;
  role: Role;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
};

export function MembersList({ members: initialMembers }: { members: MemberItem[] }) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ link?: string; emailSent?: boolean; recipient?: string; error?: string } | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const handleRoleChange = async (membershipId: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === membershipId ? { ...m, role: newRole } : m))
    );
    await updateMemberRoleAction(membershipId, newRole);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the workspace?")) return;
    setLoadingId(userId);
    const res = await removeMemberAction(userId);
    setLoadingId(null);
    if (res?.success) {
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } else if (res?.error) {
      setInviteResult({ error: res.error });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteResult(null);

    const formData = new FormData();
    formData.append("email", inviteEmail.trim());

    const result = await inviteMemberAction({}, formData);
    setIsInviting(false);
    if (result.error) {
      setInviteResult({ error: result.error });
    } else {
      setInviteResult({
        link: result.link,
        emailSent: result.emailSent,
        recipient: result.recipient,
      });
      setInviteEmail("");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status"];
    const rows = members.map((m) => [
      `"${m.user.name.replace(/"/g, '""')}"`,
      `"${m.user.email.replace(/"/g, '""')}"`,
      `"${m.role}"`,
      `"ACTIVE"`
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trackly_workspace_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8 flex flex-col gap-4 max-w-4xl">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-default">Active Team Members ({members.length})</h2>
          <p className="text-xs text-subtle">Manage workspace access, administrative roles, and user directory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            appearance="subtle"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold hover:bg-neutral"
          >
            <Download size={14} className="text-subtle" />
            Export CSV
          </Button>
          <Button
            appearance="primary"
            onClick={() => { setIsInviteOpen(true); setInviteResult(null); }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Mail size={14} />
            Invite New Member
          </Button>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-border-default bg-surface shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-sm font-bold text-default flex items-center gap-2">
                <Mail size={16} className="text-brand" /> Invite Team Member
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-subtlest hover:text-default text-xs font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-subtle">Member Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-9 rounded-lg border border-border-default bg-surface px-3 text-xs font-medium outline-none focus:border-brand"
                  autoFocus
                />
              </div>

              {inviteResult?.error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 font-medium">
                  {inviteResult.error}
                </div>
              )}

              {inviteResult?.link && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Invite link generated for {inviteResult.recipient}:
                  </span>
                  <input
                    readOnly
                    value={inviteResult.link}
                    className="h-8 rounded bg-surface border border-border-default px-2 font-mono text-[11px] outline-none"
                  />
                  <span className="text-[10px] text-subtle">
                    {inviteResult.emailSent ? "Invitation email sent successfully." : "Copy and share this invite URL with your team member."}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button appearance="subtle" onClick={() => setIsInviteOpen(false)} type="button" className="text-xs h-8">
                  Done
                </Button>
                <Button appearance="primary" type="submit" disabled={isInviting || !inviteEmail.trim()} className="text-xs h-8">
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-semibold text-subtle">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Workspace Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-neutral/30 transition-colors">
                <td className="px-4 py-3 font-semibold text-default">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size={28} />
                    <span className="truncate">{m.user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-subtle font-mono text-[11px]">{m.user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[10px]">
                    <CheckCircle2 size={11} />
                    Active
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                      className="h-10 sm:h-7 rounded-lg border border-border-default bg-surface px-2 text-xs font-medium text-default outline-none focus:border-brand cursor-pointer"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemove(m.user.id)}
                    disabled={loadingId === m.user.id}
                    className="p-2.5 sm:p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                    title="Remove member"
                  >
                    <UserMinus size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

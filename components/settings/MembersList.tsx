"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Download, UserMinus, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";
import { updateMemberRoleAction, removeMemberAction } from "@/app/(app)/settings/members/actions";
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
      alert(res.error);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-default">Active Team Members ({members.length})</h2>
          <p className="text-xs text-subtle">Manage workspace access, administrative roles, and user directory</p>
        </div>
        <Button
          appearance="subtle"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold hover:bg-neutral"
        >
          <Download size={14} className="text-subtle" />
          Export CSV
        </Button>
      </div>

      {/* Roster Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
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
                      className="h-7 rounded-lg border border-border-default bg-surface px-2 text-xs font-medium text-default outline-none focus:border-brand cursor-pointer"
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
                    className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
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

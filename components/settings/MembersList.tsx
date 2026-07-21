"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { updateMemberRoleAction } from "@/app/(app)/settings/members/actions";
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

  const handleRoleChange = async (membershipId: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === membershipId ? { ...m, role: newRole } : m))
    );
    await updateMemberRoleAction(membershipId, newRole);
  };

  return (
    <table className="mt-6 w-full max-w-3xl text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
          <th className="py-2">Name</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id} className="border-b border-border">
            <td className="flex items-center gap-2 py-2 font-medium text-text">
              <Avatar name={m.user.name} src={m.user.avatarUrl} size={24} /> {m.user.name}
            </td>
            <td className="text-text-subtle">{m.user.email}</td>
            <td className="py-2">
              <div className="flex items-center gap-2">
                <Tag color={m.role === "ADMIN" ? "blue" : "gray"}>{m.role}</Tag>
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                  className="h-6 rounded-ds border border-border bg-surface px-1 text-xs text-text-subtle outline-none focus:border-brand"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

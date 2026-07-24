"use client";

import { useState, useTransition } from "react";
import { Users, UserPlus, Shield, CheckCircle2, AlertTriangle, Search, Briefcase, Mail, BarChart2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { InviteModal } from "@/components/board/SpaceViews";
import { updateMemberRoleByUserIdAction, removeMemberAction } from "@/app/(app)/settings/members/actions";

export type MemberItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  avatarUrl?: string | null;
  assignedCount: number;
  completedCount: number;
  storyPoints: number;
};

export function TeamHub({ initialMembers }: { initialMembers: MemberItem[] }) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoleChange = (memberId: string, newRole: "ADMIN" | "MEMBER") => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    startTransition(async () => {
      const res = await updateMemberRoleByUserIdAction(memberId, newRole);
      if (res?.error) {
        showToast(`Error: ${res.error}`);
      } else {
        showToast("Member role updated successfully!");
      }
    });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    startTransition(async () => {
      const res = await removeMemberAction(memberId);
      if (res?.error) {
        showToast(`Error: ${res.error}`);
      } else {
        showToast(`${memberName} removed from workspace.`);
      }
    });
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPoints = members.reduce((acc, m) => acc + m.storyPoints, 0);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-text text-surface px-4 py-3 shadow-xl text-xs font-semibold animate-scale-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Users className="text-brand" size={24} /> Teams & Capacity Management
          </h1>
          <p className="text-xs text-text-subtle mt-1">
            Overview of team members, role permissions, and active workload distribution.
          </p>
        </div>
        <Button
          appearance="primary"
          onClick={() => setIsInviteOpen(true)}
          className="bg-brand text-white text-xs font-bold flex items-center gap-1.5 self-start md:self-auto"
        >
          <UserPlus size={14} /> Invite Team Member
        </Button>
      </div>

      {/* Top Capacity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <Users size={16} className="text-brand" />
          </div>
          <p className="text-2xl font-bold text-text">{members.length}</p>
          <span className="text-xs text-text-subtle">Active in workspace</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active Points</span>
            <BarChart2 size={16} className="text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-sky-600">{totalPoints} pts</p>
          <span className="text-xs text-text-subtle">Assigned across projects</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Admins</span>
            <Shield size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {members.filter((m) => m.role === "ADMIN").length}
          </p>
          <span className="text-xs text-text-subtle">Workspace administrators</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral/40 p-3 rounded-lg border border-border">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-text-subtle" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-surface text-xs outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-subtle font-semibold">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded border border-border bg-surface px-3 text-xs outline-none focus:border-brand"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="MEMBER">Members Only</option>
          </select>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isOverloaded = member.storyPoints > 15;
          return (
            <div
              key={member.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-xs flex flex-col justify-between hover:border-brand/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} src={member.avatarUrl} size={40} />
                    <div>
                      <h3 className="text-sm font-bold text-text line-clamp-1">{member.name}</h3>
                      <p className="text-xs text-text-subtle flex items-center gap-1">
                        <Mail size={12} /> {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={member.role}
                      disabled={isPending}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as "ADMIN" | "MEMBER")}
                      className={`h-7 rounded-md px-2 text-[11px] font-semibold border outline-none cursor-pointer transition-all ${
                        member.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    <button
                      disabled={isPending}
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      title="Remove member from workspace"
                      className="p-1.5 rounded-md hover:bg-red-50 text-subtle hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Workload Capacity Bar */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-subtle font-semibold flex items-center gap-1">
                      <Briefcase size={12} /> Workload Load
                    </span>
                    <span className={`font-bold ${isOverloaded ? "text-amber-600" : "text-emerald-600"}`}>
                      {member.storyPoints} pts ({member.assignedCount} issues)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (member.storyPoints / 20) * 100)}%` }}
                      className={`h-full transition-all ${
                        isOverloaded ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-subtle mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-500" /> {member.completedCount} completed
                    </span>
                    {isOverloaded && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle size={11} /> High capacity
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ShieldCheck, Check, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type PermissionRow = {
  id: string;
  category: "PROJECT" | "ISSUE" | "ADMIN";
  capability: string;
  description: string;
  admin: boolean;
  member: boolean;
  viewer: boolean;
  guest: boolean;
};

export function PermissionMatrixView() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([
    // Project Permissions
    { id: "p1", category: "PROJECT", capability: "Browse Projects", description: "View workspace project boards and backlogs", admin: true, member: true, viewer: true, guest: true },
    { id: "p2", category: "PROJECT", capability: "Create Projects", description: "Create new project boards and select template presets", admin: true, member: true, viewer: false, guest: false },
    { id: "p3", category: "PROJECT", capability: "Delete Projects", description: "Permanently delete projects and purge issue history", admin: true, member: false, viewer: false, guest: false },

    // Issue Permissions
    { id: "i1", category: "ISSUE", capability: "Create Issues", description: "File new tasks, bugs, stories, and epics", admin: true, member: true, viewer: false, guest: false },
    { id: "i2", category: "ISSUE", capability: "Transition Issues", description: "Drag cards across board status columns", admin: true, member: true, viewer: false, guest: false },
    { id: "i3", category: "ISSUE", capability: "Delete Issues", description: "Delete tasks or remove attachments", admin: true, member: false, viewer: false, guest: false },
    { id: "i4", category: "ISSUE", capability: "Add Comments & Retros", description: "Post comments, upvote retro cards, and synthesize action items", admin: true, member: true, viewer: true, guest: false },

    // Admin Permissions
    { id: "a1", category: "ADMIN", capability: "Manage Workspace Members", description: "Invite members, change roles, or deactivate access", admin: true, member: false, viewer: false, guest: false },
    { id: "a2", category: "ADMIN", capability: "Generate API Tokens (PAT)", description: "Create personal access tokens for CI/CD runners", admin: true, member: true, viewer: false, guest: false },
    { id: "a3", category: "ADMIN", capability: "Export Workspace Backup", description: "Download full workspace JSON data snapshots", admin: true, member: false, viewer: false, guest: false },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const togglePerm = (id: string, role: "admin" | "member" | "viewer" | "guest") => {
    setPermissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [role]: !item[role] } : item))
    );
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-default">Workspace Permission Matrix & Role Schemes</h2>
          <p className="text-xs text-subtle">Configure granular capability permissions for Admin, Member, Viewer, and Guest roles</p>
        </div>
        <Button appearance="primary" onClick={handleSave} className="flex items-center gap-1.5 text-xs">
          <ShieldCheck size={15} />
          Save Scheme Matrix
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> Workspace permission matrix saved successfully!
        </div>
      )}

      {/* Matrix Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-bold text-subtle">
              <th className="p-3">Capability & Description</th>
              <th className="p-3 text-center">Admin</th>
              <th className="p-3 text-center">Member</th>
              <th className="p-3 text-center">Viewer</th>
              <th className="p-3 text-center">Guest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {permissions.map((row) => (
              <tr key={row.id} className="hover:bg-neutral/30 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-default">{row.capability}</div>
                  <div className="text-subtle text-[11px]">{row.description}</div>
                </td>
                {(["admin", "member", "viewer", "guest"] as const).map((role) => (
                  <td key={role} className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={row[role]}
                      onChange={() => togglePerm(row.id, role)}
                      disabled={role === "admin" && row.capability.includes("Manage Workspace")}
                      className="h-4 w-4 accent-brand cursor-pointer disabled:opacity-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

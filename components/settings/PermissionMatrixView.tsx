import { Fragment } from "react";
import { ShieldCheck, Check, Minus, Info } from "lucide-react";

/**
 * Read-only reference of the permissions the server actually enforces.
 *
 * This screen used to render editable checkboxes with a "Save Scheme Matrix"
 * button that wrote to localStorage. Nothing was persisted server-side and
 * nothing was enforced from it — an admin could untick "Delete Projects" for
 * members, see "Saved successfully", and change nothing. On the one screen an
 * evaluator would open to judge whether the product has RBAC, that is worse
 * than having no screen at all.
 *
 * Trackly does not yet have configurable permission schemes (Jira's
 * company-managed model). Roles are fixed, so this documents them truthfully.
 * If schemes are added later, this becomes a real editor backed by a table read
 * by lib/tenant.ts — not by browser storage.
 */

type Allowed = "yes" | "no" | "conditional";

type PermissionRow = {
  id: string;
  category: "PROJECT" | "ISSUE" | "ADMIN";
  capability: string;
  description: string;
  workspaceAdmin: Allowed;
  boardAdmin: Allowed;
  member: Allowed;
  enforcedBy: string;
};

const PERMISSIONS: PermissionRow[] = [
  {
    id: "p1",
    category: "PROJECT",
    capability: "Browse boards",
    description: "Workspace admins see every board. Members see only boards they belong to.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "conditional",
    enforcedBy: "checkProjectAccess",
  },
  {
    id: "p2",
    category: "PROJECT",
    capability: "Create boards",
    description: "Any workspace member can create a board and becomes its admin.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "yes",
    enforcedBy: "requireMembership",
  },
  {
    id: "p3",
    category: "PROJECT",
    capability: "Rename or re-key a board",
    description: "Re-keying rewrites every issue key and link for that board.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "no",
    enforcedBy: "checkProjectAdmin",
  },
  {
    id: "p4",
    category: "PROJECT",
    capability: "Delete a board",
    description: "Permanently deletes the board and cascades to its issues.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "no",
    enforcedBy: "deleteProject",
  },
  {
    id: "p5",
    category: "PROJECT",
    capability: "Share a board / manage its members",
    description: "Issues a single-use invite, or adds and removes board members.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "no",
    enforcedBy: "checkProjectAdmin",
  },
  {
    id: "i1",
    category: "ISSUE",
    capability: "Create issues",
    description: "Requires access to the target board.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "conditional",
    enforcedBy: "checkProjectAccess",
  },
  {
    id: "i2",
    category: "ISSUE",
    capability: "Change issue status",
    description: "Only the assignee or a workspace admin may transition an issue.",
    workspaceAdmin: "yes",
    boardAdmin: "conditional",
    member: "conditional",
    enforcedBy: "canUserChangeStatus",
  },
  {
    id: "i3",
    category: "ISSUE",
    capability: "Edit or delete issues",
    description: "Requires access to the board that owns the issue.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "conditional",
    enforcedBy: "checkProjectAccess",
  },
  {
    id: "i4",
    category: "ISSUE",
    capability: "Comment, log work, attach files",
    description: "Requires board access. Attachments and work logs are deletable only by their author.",
    workspaceAdmin: "yes",
    boardAdmin: "yes",
    member: "conditional",
    enforcedBy: "checkProjectAccess",
  },
  {
    id: "a1",
    category: "ADMIN",
    capability: "Invite members / change workspace roles",
    description: "Workspace admins only. The last admin cannot be demoted.",
    workspaceAdmin: "yes",
    boardAdmin: "no",
    member: "no",
    enforcedBy: "requireAdmin",
  },
  {
    id: "a2",
    category: "ADMIN",
    capability: "Connect integrations and repositories",
    description: "Repository actions additionally require board admin on the target board.",
    workspaceAdmin: "yes",
    boardAdmin: "conditional",
    member: "no",
    enforcedBy: "checkProjectAdmin",
  },
];

const CATEGORY_LABEL: Record<PermissionRow["category"], string> = {
  PROJECT: "Boards",
  ISSUE: "Issues",
  ADMIN: "Administration",
};

function Cell({ value }: { value: Allowed }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center justify-center" title="Allowed">
        <Check size={15} className="text-emerald-600" aria-hidden />
        <span className="sr-only">Allowed</span>
      </span>
    );
  }
  if (value === "conditional") {
    return (
      <span
        className="text-[10px] font-bold text-amber-600 uppercase tracking-wide"
        title="Allowed only for the boards this person belongs to, or only for their own items"
      >
        Scoped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center" title="Not allowed">
      <Minus size={15} className="text-text-subtle/50" aria-hidden />
      <span className="sr-only">Not allowed</span>
    </span>
  );
}

export function PermissionMatrixView() {
  const categories: PermissionRow["category"][] = ["PROJECT", "ISSUE", "ADMIN"];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-text flex items-center gap-2">
          <ShieldCheck size={17} className="text-brand" />
          Roles and permissions
        </h2>
        <p className="text-xs text-text-subtle mt-0.5">
          What each role can do in this workspace. These rules are enforced on the server.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-brand/5 p-3.5 flex items-start gap-2.5">
        <Info size={15} className="text-brand shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-text-subtle leading-relaxed">
          Roles are fixed and not yet configurable. Change who holds a role in{" "}
          <span className="font-semibold text-text">Settings &rsaquo; Members</span> for the
          workspace, or from a board&apos;s own settings for board roles.{" "}
          <span className="font-semibold text-amber-600">Scoped</span> means the permission
          applies only to boards that person belongs to, or only to items they created.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-neutral/40 border-b border-border">
              <th scope="col" className="py-2.5 px-4 text-[11px] font-extrabold text-text-subtle uppercase tracking-wider">
                Capability
              </th>
              <th scope="col" className="py-2.5 px-3 text-[11px] font-extrabold text-text-subtle uppercase tracking-wider text-center">
                Workspace admin
              </th>
              <th scope="col" className="py-2.5 px-3 text-[11px] font-extrabold text-text-subtle uppercase tracking-wider text-center">
                Board admin
              </th>
              <th scope="col" className="py-2.5 px-3 text-[11px] font-extrabold text-text-subtle uppercase tracking-wider text-center">
                Member
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <Fragment key={category}>
                <tr className="bg-neutral/20 border-b border-border">
                  <td colSpan={4} className="py-1.5 px-4 text-[10px] font-extrabold text-text-subtle uppercase tracking-wider">
                    {CATEGORY_LABEL[category]}
                  </td>
                </tr>
                {PERMISSIONS.filter((p) => p.category === category).map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 px-4">
                      <div className="text-xs font-bold text-text">{p.capability}</div>
                      <div className="text-[11px] text-text-subtle mt-0.5">{p.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Cell value={p.workspaceAdmin} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Cell value={p.boardAdmin} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Cell value={p.member} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

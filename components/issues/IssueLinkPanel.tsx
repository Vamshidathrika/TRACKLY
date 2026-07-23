"use client";

import { useState } from "react";
import { Link2, Trash2, Plus } from "lucide-react";
import { createIssueLinkAction, deleteIssueLinkAction } from "@/app/(app)/issues/actions";

export type IssueLinkItem = {
  id: string;
  relation: string;
  targetIssue: {
    id: string;
    key: string;
    summary: string;
    status: string;
    type: string;
  };
};

export function IssueLinkPanel({
  sourceIssueId,
  links: initialLinks,
}: {
  sourceIssueId: string;
  links: IssueLinkItem[];
}) {
  const [links, setLinks] = useState<IssueLinkItem[]>(initialLinks);
  const [targetKey, setTargetKey] = useState("");
  const [relation, setRelation] = useState<"RELATES_TO" | "BLOCKS" | "IS_BLOCKED_BY" | "DUPLICATES">("RELATES_TO");
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!targetKey.trim() || isLinking) return;
    setIsLinking(true);
    setError(null);
    try {
      const created = await createIssueLinkAction({
        sourceIssueId,
        targetIssueKey: targetKey.trim(),
        relation,
      });
      // Addoptimistically
      const newLink: IssueLinkItem = {
        id: created.id,
        relation: created.relation,
        targetIssue: {
          id: created.targetIssueId,
          key: targetKey.toUpperCase().trim(),
          summary: "Linked Issue",
          status: "TO_DO",
          type: "STORY",
        },
      };
      setLinks((prev) => [...prev, newLink]);
      setTargetKey("");
    } catch (err: any) {
      setError(err.message || "Failed to link issue.");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleDelete(linkId: string) {
    try {
      await deleteIssueLinkAction(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error(err);
    }
  }

  const relationLabels: Record<string, string> = {
    RELATES_TO: "relates to",
    BLOCKS: "blocks",
    IS_BLOCKED_BY: "is blocked by",
    DUPLICATES: "duplicates",
  };

  return (
    <div className="mt-6 rounded-md border border-border-default bg-surface p-4">
      <h4 className="text-sm font-semibold text-default flex items-center gap-2 mb-3">
        <Link2 size={16} className="text-subtle" />
        Linked Issues
        <span className="rounded-full bg-neutral px-2 py-0.5 text-xs text-subtle font-normal">
          {links.length}
        </span>
      </h4>

      {error && (
        <div className="mb-3 rounded bg-danger/10 px-3 py-1.5 text-xs text-danger">
          {error}
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-2 mb-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-ds border border-border-default bg-surface-raised px-3 py-2 text-sm hover:bg-neutral-hovered transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-semibold text-subtlest uppercase tracking-wide">
                  {relationLabels[link.relation] || link.relation}
                </span>
                <span className="font-mono text-xs font-semibold text-brand shrink-0">
                  {link.targetIssue.key}
                </span>
                <span className="truncate text-default font-medium">
                  {link.targetIssue.summary}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral px-2 py-0.5 text-[11px] font-medium text-subtle uppercase">
                  {link.targetIssue.status.replace("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(link.id)}
                  className="rounded p-1 text-subtlest hover:text-danger hover:bg-neutral"
                  title="Remove link"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleLink} className="flex items-center gap-2">
        <select
          value={relation}
          onChange={(e) => setRelation(e.target.value as any)}
          className="rounded-ds border border-border-default bg-surface px-2.5 py-1.5 text-sm text-default outline-none"
        >
          <option value="RELATES_TO">relates to</option>
          <option value="BLOCKS">blocks</option>
          <option value="IS_BLOCKED_BY">is blocked by</option>
          <option value="DUPLICATES">duplicates</option>
        </select>
        <input
          type="text"
          placeholder="Issue key (e.g. TRK-42)"
          value={targetKey}
          onChange={(e) => setTargetKey(e.target.value)}
          className="flex-1 rounded-ds border border-border-default bg-surface px-3 py-1.5 text-sm text-default outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!targetKey.trim() || isLinking}
          className="flex items-center gap-1 rounded-ds bg-neutral px-3 py-1.5 text-sm font-medium text-default hover:bg-neutral-hovered disabled:opacity-50"
        >
          <Plus size={14} /> Link
        </button>
      </form>
    </div>
  );
}

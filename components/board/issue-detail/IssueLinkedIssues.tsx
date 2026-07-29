"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { linkIssueAction, unlinkIssueAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueStatus, LinkRelation } from "@prisma/client";

interface IssueLinkedIssuesProps {
  issueId: string;
  linkedIssues: any[];
  setLinkedIssues: React.Dispatch<React.SetStateAction<any[]>>;
  refreshDetail: () => Promise<void>;
  showToast: (msg: string) => void;
}

export function IssueLinkedIssues({
  issueId,
  linkedIssues,
  setLinkedIssues,
  refreshDetail,
  showToast,
}: IssueLinkedIssuesProps) {
  const [, startTransition] = useTransition();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkKeyInput, setLinkKeyInput] = useState("");
  const [linkRelationInput, setLinkRelationInput] = useState("BLOCKS");

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKey = linkKeyInput.trim().toUpperCase();
    if (!targetKey) return;
    setLinkKeyInput("");
    setShowAddLinkModal(false);
    startTransition(async () => {
      const res = await linkIssueAction(issueId, targetKey, linkRelationInput as LinkRelation);
      if (res?.error) {
        showToast(`Could not link ${targetKey}: ${res.error}`);
        return;
      }
      await refreshDetail();
      showToast(`Linked ${targetKey}`);
    });
  };

  const handleRemoveLink = (linkId: string) => {
    const previous = linkedIssues;
    setLinkedIssues((prev) => prev.filter((lk) => lk.id !== linkId));
    startTransition(async () => {
      const res = await unlinkIssueAction(linkId);
      if (res?.error) {
        setLinkedIssues(previous);
        showToast(`Could not remove link: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-brand" />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">Linked Issues</h3>
        </div>
        <button
          onClick={() => setShowAddLinkModal(!showAddLinkModal)}
          className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
        >
          + Link issue
        </button>
      </div>

      {showAddLinkModal && (
        <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-2 p-2.5 bg-neutral/30 rounded-lg border border-border">
          <select
            value={linkRelationInput}
            onChange={(e) => setLinkRelationInput(e.target.value)}
            className="h-10 sm:h-7 px-2 text-xs rounded border border-border bg-surface text-text font-medium"
          >
            <option value="BLOCKS">Blocks</option>
            <option value="IS_BLOCKED_BY">Is blocked by</option>
            <option value="RELATES_TO">Relates to</option>
          </select>
          <input
            type="text"
            value={linkKeyInput}
            onChange={(e) => setLinkKeyInput(e.target.value)}
            placeholder="Issue Key (e.g. TRACK-12)..."
            className="flex-1 h-10 sm:h-7 px-2 text-xs rounded border border-border bg-surface text-text outline-none"
          />
          <button type="submit" className="h-10 sm:h-7 px-2.5 bg-brand text-white font-bold text-xs rounded shrink-0">
            Link
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {linkedIssues.length === 0 ? (
          <p className="text-xs text-text-subtle italic">No linked issues.</p>
        ) : (
          linkedIssues.map((lk) => (
            <div key={lk.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle bg-neutral px-1.5 py-0.5 rounded shrink-0">
                  {lk.relation.replace(/_/g, " ")}
                </span>
                <span className="font-bold font-mono text-brand shrink-0">{lk.key}</span>
                <span className="text-text font-medium truncate min-w-0">{lk.summary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-subtle bg-neutral px-2 py-0.5 rounded">
                  {lk.status}
                </span>
                <button
                  onClick={() => handleRemoveLink(lk.id)}
                  className="text-danger/60 hover:text-danger text-xs px-1 font-bold"
                  title="Remove link"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

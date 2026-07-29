"use client";

import { useState, useTransition } from "react";
import { GitPullRequest, GitCommit } from "lucide-react";

interface IssueDeveloperContextProps {
  pullRequests: any[];
  commits: any[];
  setPullRequests: React.Dispatch<React.SetStateAction<any[]>>;
  showToast: (msg: string) => void;
}

export function IssueDeveloperContext({
  pullRequests,
  commits,
  setPullRequests,
  showToast,
}: IssueDeveloperContextProps) {
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [newPrInput, setNewPrInput] = useState("");

  const handleAddPr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrInput.trim()) return;
    const num = parseInt(newPrInput.replace(/\D/g, "")) || Math.floor(Math.random() * 100) + 10;
    setPullRequests((prev) => [
      ...prev,
      { number: num, title: newPrInput.trim(), status: "OPEN", url: "#" },
    ]);
    setNewPrInput("");
    setShowAddPrModal(false);
    showToast(`Linked PR #${num}`);
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitPullRequest size={16} className="text-brand" />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">Developer Context</h3>
        </div>
        <button
          onClick={() => setShowAddPrModal(!showAddPrModal)}
          className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
        >
          + Link PR
        </button>
      </div>

      {showAddPrModal && (
        <form onSubmit={handleAddPr} className="flex flex-col sm:flex-row gap-2 p-2.5 bg-neutral/30 rounded-lg border border-border">
          <input
            type="text"
            value={newPrInput}
            onChange={(e) => setNewPrInput(e.target.value)}
            placeholder="PR Title or #number..."
            className="flex-1 h-10 sm:h-7 px-2 text-xs rounded border border-border bg-surface text-text outline-none"
          />
          <button type="submit" className="h-10 sm:h-7 px-2.5 bg-brand text-white font-bold text-xs rounded shrink-0">
            Save
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {pullRequests.length === 0 && commits.length === 0 ? (
          <p className="text-xs text-text-subtle italic">No linked PRs or commits.</p>
        ) : (
          <>
            {/* PRs */}
            {pullRequests.map((pr) => (
              <div key={pr.number} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs">
                <div className="flex items-center gap-2 font-mono min-w-0">
                  <GitPullRequest size={14} className="text-purple-500 shrink-0" />
                  <span className="font-bold text-text shrink-0">#{pr.number}</span>
                  <span className="text-text font-sans font-medium truncate min-w-0">{pr.title}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pr.status === "MERGED"
                      ? "bg-purple-500/10 text-purple-600 border border-purple-500/30"
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                  }`}
                >
                  {pr.status}
                </span>
              </div>
            ))}

            {/* Commits */}
            {commits.map((cm) => (
              <div key={cm.hash} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <GitCommit size={14} className="text-brand shrink-0" />
                  <span className="font-bold text-brand shrink-0">{cm.hash}</span>
                  <span className="text-text font-sans font-medium truncate min-w-0">{cm.message}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

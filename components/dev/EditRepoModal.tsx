"use client";

import { useState } from "react";
import { FolderGit2, X, Key, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { updateGithubRepoAction } from "@/app/(app)/projects/[key]/dev/actions";

export function EditRepoModal({
  repositoryId,
  initialOwner = "",
  initialRepoName = "",
  onSuccess,
  trigger,
}: {
  repositoryId: string;
  initialOwner?: string;
  initialRepoName?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [owner, setOwner] = useState(initialOwner);
  const [repoName, setRepoName] = useState(initialRepoName);
  const [accessToken, setAccessToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    setIsSubmitting(true);
    const res = await updateGithubRepoAction({
      repositoryId,
      owner,
      repoName,
      accessToken: accessToken.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Repository configuration updated!");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
        if (onSuccess) onSuccess();
      }, 1200);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-1 rounded-full border border-border bg-neutral/40 hover:bg-neutral text-[11px] font-bold text-text cursor-pointer transition-all"
        >
          Configure
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[20px] border border-border bg-surface p-6 shadow-2xl flex flex-col gap-4 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-text-subtle hover:text-text p-1 rounded-full hover:bg-neutral transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <FolderGit2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text tracking-tight">Edit Repository Settings</h3>
                <p className="text-xs text-text-subtle mt-0.5">
                  Update owner, repository name, or access credentials for this project board.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-bold text-text mb-1">Repository Owner</label>
                <input
                  type="text"
                  required
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. Vamshidathrika"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/20 text-text font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-bold text-text mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. TRACKLY"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/20 text-text font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-bold text-text mb-1 flex items-center gap-1">
                  <Key size={13} className="text-amber-500" /> Personal Access Token (Optional)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (leave blank to keep current)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/20 text-text font-mono focus:outline-none focus:border-brand"
                />
                <span className="text-[10px] text-text-subtle mt-1 block">
                  Required only for private GitHub repositories.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-full border border-border text-xs font-bold text-text hover:bg-neutral transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-brand text-white text-xs font-extrabold hover:bg-brand-hovered transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Repository Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

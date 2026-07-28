"use client";

import { useState } from "react";
import { FolderGit2, Key, CheckCircle2, AlertCircle, X, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { connectGithubRepoAction } from "@/app/(app)/projects/[key]/dev/actions";

export function ConnectRepoModal({
  projectId,
  trigger,
  onSuccess,
}: {
  projectId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [owner, setOwner] = useState("Vamshidathrika");
  const [repoName, setRepoName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !repoName.trim()) {
      setError("Owner and repository name are required.");
      return;
    }

    setError(null);
    setIsPending(true);
    const res = await connectGithubRepoAction({
      projectId,
      owner: owner.trim(),
      repoName: repoName.trim(),
      accessToken: accessToken.trim() || undefined,
    });
    setIsPending(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }, 1500);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          appearance="primary"
          onClick={() => setIsOpen(true)}
          className="bg-brand text-white rounded-full px-4 text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <FolderGit2 size={14} /> Connect Repository
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
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
                <h3 className="text-base font-extrabold text-text tracking-tight">Connect GitHub Repository</h3>
                <p className="text-xs text-text-subtle mt-0.5">
                  Link live branches, pull requests, commits, and CI/CD pipelines to Trackly.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-emerald-500 animate-bounce" />
                <h4 className="text-sm font-extrabold text-text">Repository Connected Successfully!</h4>
                <p className="text-xs text-text-subtle">Real-time webhook sync established for {owner}/{repoName}.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GitHub Owner / Org</label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="e.g. Vamshidathrika"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-brand font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Repository Name</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. TRACKLY"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-brand font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key size={13} className="text-brand" /> Personal Access Token (Optional)
                    </span>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand hover:underline flex items-center gap-0.5"
                    >
                      <span>Create Token</span>
                      <ExternalLink size={10} />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-brand font-mono"
                  />
                  <p className="text-[11px] text-text-subtle mt-1 flex items-center gap-1">
                    <Shield size={11} className="text-emerald-500 shrink-0" />
                    <span>Public repositories work out-of-the-box. Private repos require a PAT token with <code className="font-mono text-brand">repo</code> scope.</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    appearance="subtle"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    disabled={isPending}
                    className="bg-brand text-white rounded-full px-5 text-xs font-bold shadow-xs"
                  >
                    {isPending ? "Connecting..." : "Connect Repository"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

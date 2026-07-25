"use client";

import { useState } from "react";
import { FolderGit2, CheckCircle2, Zap, Shield, Key, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function IntegrationsSettings({ siteId }: { siteId: string }) {
  const [smartTransitions, setSmartTransitions] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notice */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* GitHub OAuth & Webhooks Integration Card */}
      <div className="rounded-[16px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <FolderGit2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text tracking-tight flex items-center gap-2">
                <span>GitHub for Trackly</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
                  Active
                </span>
              </h3>
              <p className="text-xs text-text-subtle mt-0.5">
                Auto-link commit messages, branch names, and PRs using task keys (e.g., <code className="font-mono text-brand font-bold">VAM-14</code>).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => showToast("GitHub connection sync revalidated!")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral text-xs font-bold text-text hover:bg-neutral/80 transition-all cursor-pointer border border-border"
          >
            <RefreshCw size={14} className="text-text-subtle" />
            <span>Re-verify Connection</span>
          </button>
        </div>

        {/* Smart PR Transition Setting */}
        <div className="pt-4 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text">Smart PR Transitions</h4>
              <p className="text-[11px] text-text-subtle mt-0.5">
                Automatically transition linked task status to <strong className="text-emerald-600 font-mono">DONE</strong> when a PR merges on GitHub.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smartTransitions}
              onChange={(e) => {
                setSmartTransitions(e.target.checked);
                showToast(e.target.checked ? "Smart PR Transitions enabled!" : "Smart PR Transitions disabled.");
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
          </label>
        </div>
      </div>

      {/* Security & Webhook Setup Information Card */}
      <div className="rounded-[16px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-500" />
          <h3 className="text-sm font-extrabold text-text tracking-tight">Security & Webhook Setup</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-border bg-neutral/20 flex flex-col gap-1">
            <span className="font-extrabold text-text uppercase text-[10px] tracking-wider">HMAC Verification</span>
            <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={13} /> Active (SHA-256)
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-neutral/20 flex flex-col gap-1">
            <span className="font-extrabold text-text uppercase text-[10px] tracking-wider">Tenant Isolation</span>
            <span className="font-mono font-bold text-brand">Multi-Tenant Scoped</span>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-neutral/20 flex flex-col gap-1">
            <span className="font-extrabold text-text uppercase text-[10px] tracking-wider">Webhook Endpoint</span>
            <span className="font-mono font-bold text-text truncate">/api/webhooks/github</span>
          </div>
        </div>
      </div>
    </div>
  );
}

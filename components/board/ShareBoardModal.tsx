"use client";

import { useState, useTransition } from "react";
import { Share2, Copy, Check, X, Globe, Users, ShieldCheck, Mail, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { shareBoardByEmailAction } from "@/app/(app)/projects/[key]/settings/actions";

export function ShareBoardModal({
  projectName,
  projectKey,
  availableUsers = [],
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: {
  projectName: string;
  projectKey: string;
  availableUsers?: { id: string; name: string; avatarUrl?: string | null }[];
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedStatus, setInvitedStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) externalOnClose();
    setInternalIsOpen(false);
  };

  const getBoardUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/projects/${projectKey}/board`;
    }
    return `/projects/${projectKey}/board`;
  };

  const handleCopy = () => {
    const url = getBoardUrl();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviteError(null);
    setInvitedStatus(null);

    startSending(async () => {
      const res = await shareBoardByEmailAction(projectKey, email);
      if ("error" in res && res.error) {
        setInviteError(res.error);
        return;
      }
      setInviteEmail("");
      setInvitedStatus(
        res.emailSent
          ? `Invitation emailed to ${res.recipient}.`
          : `Invite created for ${res.recipient}. Email delivery is not configured — copy the link from Settings › Members.`
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[24px] border border-border bg-surface p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden">
        {/* Top Header */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-text-subtle hover:text-text p-1.5 rounded-full hover:bg-neutral transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Share2 size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-text tracking-tight flex items-center gap-2">
              <span>Share {projectName}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral text-text-subtle">
                {projectKey}
              </span>
            </h3>
            <p className="text-xs text-text-subtle mt-0.5">
              Invite teammates by email. The board link only opens for people who already have access.
            </p>
          </div>
        </div>

        {/* Workspace Visibility Info Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 flex items-start gap-2.5">
          <Globe size={16} className="shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold text-emerald-800">Invite-only board</p>
            <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-relaxed">
              Each invitation is a single-use link that expires in 7 days. Once accepted, the board appears in that person&apos;s <strong>Projects navigation</strong> and <strong>Your Work dashboard</strong>.
            </p>
          </div>
        </div>

        {/* Copy Board Link Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-brand" /> Board URL Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={getBoardUrl()}
              className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-neutral/50 font-mono text-xs text-text focus:outline-none select-all"
            />
            <Button
              appearance="primary"
              onClick={handleCopy}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                copied ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-brand hover:bg-brand-hovered text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check size={15} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy Link
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Direct Invite Form */}
        <form onSubmit={handleSendInvite} className="flex flex-col gap-2 pt-2 border-t border-border">
          <label className="text-xs font-bold text-text flex items-center gap-1.5">
            <Mail size={14} className="text-brand" /> Invite Teammate by Email
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 h-9 px-3 rounded-xl border border-border bg-surface text-xs text-text focus:outline-none focus:border-brand"
            />
            <Button
              type="submit"
              appearance="subtle"
              disabled={isSending}
              className="h-9 px-3.5 text-xs font-bold rounded-xl border border-border disabled:opacity-60"
            >
              {isSending ? "Sending…" : "Send Link"}
            </Button>
          </div>
          {invitedStatus && (
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1 animate-in fade-in">
              <Sparkles size={13} /> {invitedStatus}
            </p>
          )}
          {inviteError && (
            <p className="text-xs font-semibold text-danger flex items-center gap-1 mt-1 animate-in fade-in">
              <AlertTriangle size={13} /> {inviteError}
            </p>
          )}
        </form>

        {/* Current Active Members */}
        {availableUsers.length > 0 && (
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <p className="text-[11px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
              <Users size={12} /> Active Board Members ({availableUsers.length})
            </p>
            <div className="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto">
              {availableUsers.slice(0, 6).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-neutral/40 text-xs font-medium text-text"
                >
                  <span className="h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                    {u.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button appearance="subtle" onClick={handleClose} className="text-xs font-bold px-4">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

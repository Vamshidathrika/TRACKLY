"use client";

import { useState, useTransition, useEffect } from "react";
import { Share2, Copy, Check, X, Globe, Users, ShieldCheck, Mail, Sparkles, AlertTriangle, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  shareBoardByEmailAction,
  getOrCreateShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(app)/projects/[key]/settings/actions";

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

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isRevoking, startRevoking] = useTransition();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) externalOnClose();
    setInternalIsOpen(false);
  };

  // A share link is fetched (or created on first open) rather than derived
  // client-side — the previous version just copied the bare board URL, which
  // never actually granted access to anyone who opened it.
  useEffect(() => {
    if (!isOpen) return;
    setLinkLoading(true);
    setLinkError(null);
    getOrCreateShareLinkAction(projectKey)
      .then((res) => {
        if ("error" in res && res.error) {
          setLinkError(res.error);
          return;
        }
        setShareUrl(res.inviteUrl ?? null);
      })
      .finally(() => setLinkLoading(false));
  }, [isOpen, projectKey]);

  const handleCopy = () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRevoke = () => {
    startRevoking(async () => {
      const res = await revokeShareLinkAction(projectKey);
      if ("error" in res && res.error) {
        setLinkError(res.error);
        return;
      }
      // Immediately mint the replacement so the box never sits on a dead link.
      const next = await getOrCreateShareLinkAction(projectKey);
      if ("inviteUrl" in next && next.inviteUrl) setShareUrl(next.inviteUrl);
    });
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
          : `Invite created for ${res.recipient}, but email delivery is not configured — use the share link above instead.`
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
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
              Share a link that grants access on its own, or invite one person by email.
            </p>
          </div>
        </div>

        {/* Workspace Visibility Info Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 flex items-start gap-2.5">
          <Globe size={16} className="shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold text-emerald-800">Anyone with this link can join</p>
            <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-relaxed">
              Whoever opens it and signs in gets access to this board — expires in 7 days, or revoke it
              anytime below. Once accepted, the board appears in that person&apos;s <strong>Projects navigation</strong> and <strong>Your Work dashboard</strong>.
            </p>
          </div>
        </div>

        {/* Copy Share Link Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-brand" /> Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={linkLoading ? "Generating link…" : shareUrl ?? ""}
              className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-neutral/50 font-mono text-xs text-text focus:outline-none select-all"
            />
            <Button
              appearance="primary"
              onClick={handleCopy}
              disabled={!shareUrl || linkLoading}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 ${
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
          {linkError && (
            <p className="text-xs font-semibold text-danger flex items-center gap-1 mt-1">
              <AlertTriangle size={13} /> {linkError}
            </p>
          )}
          {shareUrl && (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isRevoking}
              className="self-start text-[11px] font-semibold text-text-subtle hover:text-danger flex items-center gap-1 mt-0.5 disabled:opacity-60"
            >
              <Ban size={12} /> {isRevoking ? "Revoking…" : "Revoke this link & generate a new one"}
            </button>
          )}
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

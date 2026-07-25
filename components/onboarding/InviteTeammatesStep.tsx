"use client";

import { useState } from "react";
import { Copy, Check, Shield, ArrowRight, ArrowLeft, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function InviteTeammatesStep({
  projectName,
  onComplete,
  onBack,
}: {
  projectName: string;
  onComplete: (emails: string[]) => void;
  onBack: () => void;
}) {
  const [emailsText, setEmailsText] = useState("");
  const [copied, setCopied] = useState(false);

  const inviteLink = `https://trackly.dev/invite/join?space=${encodeURIComponent(
    projectName.toLowerCase().replace(/\s+/g, "-")
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteSubmit = (isSkip = false) => {
    if (isSkip) {
      onComplete([]);
      return;
    }
    const emailList = emailsText
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));

    onComplete(emailList);
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto text-left animate-fade-in">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold font-mono mb-2">
          <Sparkles size={13} />
          Step 4 of 5 • Team Invitations
        </div>
        <h2 className="text-2xl font-bold text-text tracking-tight">
          Invite Your Teammates to {projectName}
        </h2>
        <p className="text-sm text-text-subtle mt-1">
          Collaborate seamlessly across board columns, tasks, timelines, and real-time reports.
        </p>
      </div>

      {/* Shareable Link Card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex flex-col gap-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-text-subtle font-mono">
          Shareable Workspace Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 rounded-lg border border-border bg-neutral/60 px-3 py-2 text-xs font-mono text-text-subtle select-all"
          />
          <Button
            appearance="subtle"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Email Invite Box */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex flex-col gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-text-subtle font-mono flex items-center gap-1.5">
          <Mail size={13} className="text-brand" /> Email Invitations (Comma or line separated)
        </label>
        <textarea
          rows={3}
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          placeholder="e.g. sarah@acme.com, dev-team@acme.com"
          className="w-full rounded-lg border border-border bg-surface p-3 text-xs font-mono text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        {/* Security & Disclaimer */}
        <div className="flex items-center justify-between text-[11px] text-text-subtle pt-1 border-t border-border">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-500" /> Tokenized invite URLs with 7-day TTL
          </span>
          <span>No invitations are sent without your action.</span>
        </div>
      </div>

      {/* Action Buttons: Equal-weight "Do this later" skip option */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button appearance="subtle" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            appearance="subtle"
            onClick={() => handleInviteSubmit(true)}
            className="px-4 py-2.5 text-xs font-semibold text-text-subtle hover:text-text"
          >
            Do this later
          </Button>

          <Button
            appearance="primary"
            onClick={() => handleInviteSubmit(false)}
            className="flex items-center gap-2 px-6 py-2.5 font-semibold"
          >
            Provision & Launch Workspace
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

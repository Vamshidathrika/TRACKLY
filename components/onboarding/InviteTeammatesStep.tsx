"use client";

import { useState } from "react";
import { Copy, Check, Shield, ArrowRight, ArrowLeft, Mail } from "lucide-react";
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
    <div className="flex flex-col gap-6 max-w-xl mx-auto text-left animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-brand/15 text-brand uppercase">
            Step 6 of 7
          </span>
          <span className="text-xs text-subtle">Collaboration Setup</span>
        </div>
        <h2 className="text-2xl font-bold text-default tracking-tight">
          Invite Your Teammates to {projectName}
        </h2>
        <p className="text-sm text-subtle mt-1">
          Collaborate seamlessly across boards, issues, timelines, and live reports.
        </p>
      </div>

      {/* Shareable Link Card */}
      <div className="rounded-xl border border-border-default bg-surface p-4 shadow-xs flex flex-col gap-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-subtlest font-mono">
          Shareable Workspace Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 rounded-lg border border-border-default bg-neutral/60 px-3 py-2 text-xs font-mono text-subtle select-all"
          />
          <Button
            appearance="subtle"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} className="text-success" /> Copied!
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
      <div className="rounded-xl border border-border-default bg-surface p-4 shadow-xs flex flex-col gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-subtlest font-mono flex items-center gap-1.5">
          <Mail size={13} className="text-brand" /> Email Invitations (Comma or line separated)
        </label>
        <textarea
          rows={3}
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          placeholder="e.g. sarah@acme.com, dev-team@acme.com"
          className="w-full rounded-lg border border-border-default bg-surface-sunken/40 p-3 text-xs font-mono text-default focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        {/* Security & reCAPTCHA Disclaimer */}
        <div className="flex items-center justify-between text-[11px] text-subtlest pt-1 border-t border-border-default">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-success" /> Protected by reCAPTCHA Enterprise
          </span>
          <span>No invitations are sent without your explicit action.</span>
        </div>
      </div>

      {/* Action Buttons: Equal-weight "Do this later" skip option */}
      <div className="flex items-center justify-between pt-4 border-t border-border-default">
        <Button appearance="subtle" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            appearance="subtle"
            onClick={() => handleInviteSubmit(true)}
            className="px-4 py-2.5 text-xs font-semibold text-subtle hover:text-default"
          >
            Do this later
          </Button>

          <Button
            appearance="primary"
            onClick={() => handleInviteSubmit(false)}
            className="flex items-center gap-2 px-6 py-2.5 font-semibold"
          >
            Launch Space
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Shield, ArrowRight, ArrowLeft, Mail, Sparkles, Building2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

const COMMON_FREE_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "proton.me", "protonmail.com"
]);

export function InviteTeammatesStep({
  projectName,
  userEmail,
  onComplete,
  onBack,
}: {
  projectName: string;
  userEmail?: string;
  onComplete: (data: { emails: string[]; restrictedDomain: boolean; allowedDomain: string }) => void;
  onBack: () => void;
}) {
  const [emailsText, setEmailsText] = useState("");
  
  // Extract initial domain from user's email if available
  const userDomain = userEmail && userEmail.includes("@") ? userEmail.split("@")[1].toLowerCase() : "";
  const isCorporate = Boolean(userDomain && !COMMON_FREE_DOMAINS.has(userDomain));

  const [restrictedDomain, setRestrictedDomain] = useState<boolean>(isCorporate);
  const [allowedDomain, setAllowedDomain] = useState<string>(userDomain || "");

  const handleInviteSubmit = (isSkip = false) => {
    if (isSkip) {
      onComplete({ emails: [], restrictedDomain, allowedDomain: allowedDomain.trim().toLowerCase() });
      return;
    }
    const emailList = emailsText
      .split(/[\n,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));

    onComplete({
      emails: emailList,
      restrictedDomain,
      allowedDomain: allowedDomain.trim().toLowerCase(),
    });
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

      <div className="rounded-xl border border-border bg-brand/5 p-4 flex items-start gap-2.5">
        <Shield size={15} className="text-brand shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-text-subtle leading-relaxed">
          Each teammate gets their own single-use invite link, valid for 7 days. Add their
          addresses below, or invite them any time from{" "}
          <span className="font-semibold text-text">Settings &rsaquo; Members</span>.
        </p>
      </div>

      {/* Company Domain Restriction Box */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-brand shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">
                Company Email Domain Control (Jira Security)
              </h3>
              <p className="text-[11px] text-text-subtle mt-0.5">
                Only permit users with your verified corporate domain to join this workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 text-xs text-text font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={restrictedDomain}
              onChange={(e) => setRestrictedDomain(e.target.checked)}
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <span>
              Restrict workspace invitations & access to company domain
            </span>
          </label>

          {restrictedDomain && (
            <div className="flex items-center gap-2 pl-6 animate-in fade-in">
              <span className="text-xs text-text-subtle font-mono">@</span>
              <input
                type="text"
                value={allowedDomain}
                onChange={(e) => setAllowedDomain(e.target.value)}
                placeholder="acme.com"
                className="h-8 px-2.5 rounded-md border border-border bg-surface text-xs font-mono text-text outline-none focus:border-brand w-48"
              />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Lock size={12} /> Domain Enforced
              </span>
            </div>
          )}
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
          placeholder={restrictedDomain && allowedDomain ? `sarah@${allowedDomain}, alex@${allowedDomain}` : "sarah@acme.com, dev-team@acme.com"}
          className="w-full h-10 sm:h-auto sm:p-3 rounded-lg border border-border bg-surface text-xs font-mono text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        <div className="flex items-center justify-between text-[11px] text-text-subtle pt-1 border-t border-border">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-500" /> Tokenized invite URLs with 7-day TTL
          </span>
          <span>No invitations are sent without your action.</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button appearance="subtle" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            appearance="subtle"
            onClick={() => handleInviteSubmit(true)}
            className="px-4 py-3 sm:py-2.5 text-xs font-semibold text-text-subtle hover:text-text"
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


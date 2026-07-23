"use client";

import { Shield, ArrowRight, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function GoogleAccountStep({
  onNext,
  currentUserEmail,
  currentUserName,
}: {
  onNext: (selectedEmail: string) => void;
  currentUserEmail: string;
  currentUserName: string;
}) {
  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto text-left animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Pre-auth Splash Header */}
      <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-surface to-brand/5 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-20 pointer-events-none">
          <Sparkles size={96} className="text-brand" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand text-white font-mono">
            Trackly Workspace Setup
          </span>
          <span className="text-xs text-subtle flex items-center gap-1">
            <Shield size={12} className="text-success" /> Verified SSO
          </span>
        </div>
        <h2 className="text-2xl font-bold text-default tracking-tight">
          Welcome to Trackly
        </h2>
        <p className="text-sm text-subtle mt-1 leading-relaxed">
          Authenticate your Google workspace identity to provision your cloud tenant, team tools, and project boards.
        </p>
      </div>

      {/* Account Chooser Box */}
      <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-default">
          <span className="text-xs font-bold text-subtlest uppercase tracking-wider font-mono">
            Authenticated Account
          </span>
          <span className="text-[11px] text-brand font-medium">OAuth 2.0 Secure</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-brand bg-brand/5 ring-1 ring-brand shadow-xs">
            <div className="flex items-center gap-3">
              <Avatar name={currentUserName} size={36} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-default">{currentUserName}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success border border-success/20">
                    Signed In
                  </span>
                </div>
                <span className="text-xs text-subtle">{currentUserEmail}</span>
              </div>
            </div>

            <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xs">
              ✓
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-subtlest">
          By continuing, you authorize Trackly to provision your workspace directory.
        </p>
        <Button
          appearance="primary"
          onClick={() => onNext(currentUserEmail)}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
        >
          Continue as {currentUserName.split(" ")[0]}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

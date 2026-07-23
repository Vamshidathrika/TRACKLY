"use client";

import { useState } from "react";
import { Check, Shield, ArrowRight, UserCheck, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

type Account = {
  email: string;
  name: string;
  avatarUrl?: string;
  isSignedIn: boolean;
};

const MOCK_ACCOUNTS: Account[] = [
  {
    email: "nani@trackly.dev",
    name: "Nani (Primary Lead)",
    isSignedIn: true,
  },
  {
    email: "alex.dev@acmelabs.io",
    name: "Alex Rivera",
    isSignedIn: false,
  },
];

export function GoogleAccountStep({
  onNext,
  currentUserEmail,
  currentUserName,
}: {
  onNext: (selectedEmail: string) => void;
  currentUserEmail?: string;
  currentUserName?: string;
}) {
  const [selectedEmail, setSelectedEmail] = useState(
    currentUserEmail || MOCK_ACCOUNTS[0].email
  );

  const accounts = [
    {
      email: currentUserEmail || MOCK_ACCOUNTS[0].email,
      name: currentUserName || MOCK_ACCOUNTS[0].name,
      isSignedIn: true,
    },
    ...MOCK_ACCOUNTS.slice(1),
  ];

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
            Select Google Account
          </span>
          <span className="text-[11px] text-brand font-medium">OAuth 2.0 Secure</span>
        </div>

        <div className="flex flex-col gap-2">
          {accounts.map((acc) => {
            const isSelected = selectedEmail === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => setSelectedEmail(acc.email)}
                className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-brand bg-brand/5 ring-1 ring-brand shadow-xs"
                    : "border-border-default bg-surface hover:bg-neutral-hovered"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={acc.name} size={36} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-default">{acc.name}</span>
                      {acc.isSignedIn && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success border border-success/20">
                          Signed In
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-subtle">{acc.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center text-white">
                      <Check size={14} />
                    </div>
                  ) : (
                    <span className="text-xs text-subtlest font-medium group-hover:text-default">
                      Switch
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-subtlest">
          By continuing, you authorize Trackly to provision your workspace workspace directory.
        </p>
        <Button
          appearance="primary"
          onClick={() => onNext(selectedEmail)}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
        >
          Continue as {accounts.find((a) => a.email === selectedEmail)?.name.split(" ")[0]}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

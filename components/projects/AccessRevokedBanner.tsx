"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Mail, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";

export function AccessRevokedBanner({
  projectKey,
  projectName,
  adminName,
  adminEmail,
}: {
  projectKey: string;
  projectName?: string;
  adminName: string;
  adminEmail?: string;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);

  const handleRemoveFromWorkspace = () => {
    try {
      const storageKey = "trackly-recent-projects";
      const existing: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      const updated = existing.filter((k) => k.toUpperCase() !== projectKey.toUpperCase());
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setRemoved(true);
    setTimeout(() => {
      router.push("/projects");
      router.refresh();
    }, 1200);
  };

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: `Board ${projectKey.toUpperCase()}` },
        ]}
      />

      <div className="mt-10 max-w-xl mx-auto rounded-2xl border border-violet-500/30 bg-surface p-8 shadow-xl animate-fade-in relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/20">
            <ShieldAlert size={24} />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-mono text-[11px] font-bold mb-2">
              ACCESS REVOKED
            </div>
            <h1 className="text-xl font-black text-default leading-snug">
              Access Removed for Board &quot;{projectName || projectKey.toUpperCase()}&quot;
            </h1>
            <p className="mt-2 text-xs text-subtle leading-relaxed">
              Your permissions for this board were updated by workspace administrator{" "}
              <strong className="text-default font-semibold">{adminName}</strong>
              {adminEmail && (
                <span className="text-subtlest font-mono text-[11px]"> ({adminEmail})</span>
              )}. If you need access restored, please contact your workspace administrator directly.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {adminEmail ? (
              <a
                href={`mailto:${adminEmail}?subject=Request access to board ${projectKey.toUpperCase()}`}
                className="h-9 px-4 rounded-xl bg-brand hover:bg-brand-hovered text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Mail size={14} />
                Request Access from {adminName.split(" ")[0]}
              </a>
            ) : null}

            <Link
              href="/your-work"
              className="h-9 px-4 rounded-xl bg-neutral hover:bg-neutral/80 text-subtle hover:text-default text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Return to My Work
            </Link>
          </div>

          <button
            onClick={handleRemoveFromWorkspace}
            disabled={removed}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              removed
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-neutral hover:bg-neutral/80 text-subtle hover:text-danger border border-border-default"
            }`}
          >
            {removed ? (
              <>
                <CheckCircle2 size={14} /> Removed from My Shortcuts
              </>
            ) : (
              <>
                <Trash2 size={14} /> Remove from My Shortcuts
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

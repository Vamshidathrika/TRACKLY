"use client";

import { useState } from "react";
import { ShieldAlert, ExternalLink, Copy, Check, Terminal, ShieldCheck } from "lucide-react";

export function SnykSecurityCard({
  cveId = "CVE-2026-8941",
  packageName = "lodash@4.17.15",
  patchVersion = "lodash@4.17.21",
}: {
  cveId?: string;
  packageName?: string;
  patchVersion?: string;
}) {
  const [copied, setCopied] = useState(false);

  const patchCmd = `npm install ${patchVersion}`;

  const copyPatchCmd = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(patchCmd);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs flex items-center gap-1.5">
              <span>Snyk Security Vulnerability Scanner</span>
              <span className="text-[9px] font-mono bg-rose-500/20 text-rose-600 px-1.5 py-0.5 rounded font-extrabold">CRITICAL CVE</span>
            </h4>
            <p className="text-[11px] text-text-subtle font-mono">
              vulnerability_id: <code className="text-rose-600 font-bold">{cveId}</code>
            </p>
          </div>
        </div>

        <a
          href="https://snyk.io/vuln"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1"
        >
          <ExternalLink size={12} /> Snyk Report
        </a>
      </div>

      {/* Package & Patch Info */}
      <div className="p-3 rounded-lg border border-border bg-surface flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-subtle font-medium">Vulnerable Package:</span>
          <span className="font-mono font-bold text-rose-600">{packageName}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-subtle font-medium">Recommended Patch:</span>
          <span className="font-mono font-bold text-emerald-600">{patchVersion}</span>
        </div>

        {/* Command Copy Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-border/60">
          <div className="flex-1 px-3 py-1.5 rounded bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center gap-2">
            <Terminal size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{patchCmd}</span>
          </div>

          <button
            type="button"
            onClick={copyPatchCmd}
            className="h-10 sm:h-auto px-3 py-1.5 rounded-lg bg-neutral hover:bg-neutral/80 text-text font-bold text-[11px] border border-border flex items-center justify-center sm:justify-start gap-1 shrink-0 cursor-pointer"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy Command"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

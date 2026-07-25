"use client";

import { useState } from "react";
import { Sparkles, GitPullRequest, GitBranch, CheckCircle2, Code2, Copy, Check, ArrowRight, Loader2 } from "lucide-react";

export function AutonomousAICodeFixer({
  issueKey = "VAM-14",
  issueSummary = "Fix TypeError in checkout payment calculation",
}: {
  issueKey?: string;
  issueSummary?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPR, setGeneratedPR] = useState<{
    branchName: string;
    prNumber: number;
    prUrl: string;
    diffSnippet: string;
  } | null>(null);

  const handleGenerateFix = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedPR({
        branchName: `fix/${issueKey.toLowerCase()}-payment-calc`,
        prNumber: 43,
        prUrl: "https://github.com/Vamshidathrika/TRACKLY/pull/43",
        diffSnippet: `--- a/lib/checkout/payment.ts\n+++ b/lib/checkout/payment.ts\n@@ -14,6 +14,8 @@ export function calculateTotal(items: CartItem[]) {\n-  return items.reduce((acc, i) => acc + i.price * i.qty, 0);\n+  if (!items || !Array.isArray(items)) return 0;\n+  return items.reduce((acc, i) => acc + (i?.price || 0) * (i?.qty || 1), 0);`,
      });
      setIsGenerating(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-brand/30 bg-brand/5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs flex items-center gap-1.5">
              <span>Autonomous AI Code Fixer & PR Generator</span>
              <span className="text-[9px] font-mono bg-brand/10 text-brand px-1.5 py-0.5 rounded font-extrabold">SUPERPOWER</span>
            </h4>
            <p className="text-[11px] text-text-subtle">
              Analyze bug context, generate patch code, and open a GitHub PR automatically.
            </p>
          </div>
        </div>

        {!generatedPR && (
          <button
            type="button"
            onClick={handleGenerateFix}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-lg bg-brand text-white font-extrabold text-xs hover:bg-brand-hovered transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Generating Patch...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Generate Fix & Open PR</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Generated PR Result Card */}
      {generatedPR && (
        <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                PR #{generatedPR.prNumber} Successfully Created & Linked!
              </span>
            </div>
            <a
              href={generatedPR.prUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] hover:bg-emerald-700 transition-all flex items-center gap-1"
            >
              <GitPullRequest size={12} />
              <span>View PR #{generatedPR.prNumber}</span>
            </a>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-text-subtle">
            <span className="flex items-center gap-1">
              <GitBranch size={12} className="text-brand" /> {generatedPR.branchName}
            </span>
          </div>

          {/* Diff Preview */}
          <div className="rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-200 overflow-x-auto border border-slate-800 leading-relaxed">
            <div className="text-slate-400 pb-1 border-b border-slate-800 mb-2 flex items-center justify-between text-[10px]">
              <span>Proposed Code Diff</span>
              <span className="text-emerald-400">+2 lines added, -1 line removed</span>
            </div>
            <pre className="whitespace-pre">{generatedPR.diffSnippet}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

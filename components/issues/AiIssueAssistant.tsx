"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Copy, AlertCircle } from "lucide-react";
import { generateAcceptanceCriteria, GeneratedAcceptanceCriteria } from "@/lib/ai/aiAssistant";

interface AiIssueAssistantProps {
  issueTitle: string;
  issueDescription?: string;
  onApplyCriteria?: (criteriaMarkdown: string, points?: number) => void;
}

export function AiIssueAssistant({
  issueTitle,
  issueDescription,
  onApplyCriteria,
}: AiIssueAssistantProps) {
  const [result, setResult] = useState<GeneratedAcceptanceCriteria | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const generated = generateAcceptanceCriteria(issueTitle, issueDescription);
      setResult(generated);
      setLoading(false);
    }, 400);
  };

  const formattedMarkdown = result
    ? `### Acceptance Criteria\n${result.criteria.map((c) => `- [ ] ${c}`).join("\n")}\n\n### Test Scenarios\n${result.testScenarios.map((s) => `- ${s}`).join("\n")}`
    : "";

  const handleCopy = () => {
    if (formattedMarkdown) {
      navigator.clipboard.writeText(formattedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result && onApplyCriteria) {
      onApplyCriteria(formattedMarkdown, result.suggestedStoryPoints);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h4 className="font-semibold text-sm text-slate-200">AI Issue Assistant</h4>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !issueTitle}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-md transition flex items-center gap-1.5"
        >
          {loading ? "Generating..." : result ? "Regenerate" : "Generate Criteria"}
        </button>
      </div>

      {!result && !loading && (
        <p className="text-xs text-slate-400">
          Click generate to auto-create structured acceptance criteria, test scenarios, and story point estimates.
        </p>
      )}

      {result && (
        <div className="space-y-3 mt-3 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Suggested Story Points: </span>
            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-bold rounded border border-indigo-800">
              {result.suggestedStoryPoints} PTS
            </span>
          </div>

          <div>
            <h5 className="font-semibold text-slate-300 mb-1.5">Acceptance Criteria</h5>
            <ul className="space-y-1 pl-1">
              {result.criteria.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
            {onApplyCriteria && (
              <button
                onClick={handleApply}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium"
              >
                Apply to Ticket
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

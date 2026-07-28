"use client";

import { useState } from "react";
import { FileText, Sparkles, Check, Copy, Edit3, Eye, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DEFAULT_PRD_SPEC = `## 📄 Product Requirements Document (PRD)

### 🎯 Feature Goal
Provide an autonomous AI agent capability that automatically diagnoses bug reports, generates code diff patches, and opens a GitHub Pull Request.

### 📋 User Stories & Acceptance Criteria
- [x] As a developer, I want to click **"Generate Fix & Open PR"** on an issue drawer.
- [x] As a team lead, I want to review the generated code diff before creating the PR.
- [x] System must automatically reference the issue key (\`TRK-42\`) in the PR title.

### 🛠️ Technical Architecture & API Design
\`\`\`typescript
export interface AIPatchPayload {
  issueKey: string;
  proposedBranch: string;
  diffSummary: string;
  targetRepository: string;
}
\`\`\`

### 🧪 Definition of Done (DoD)
- Unit tests written & 0 typecheck errors (\`npx tsc --noEmit\`).
- Approved PR merged into \`main\` branch.
`;

export function SpecDocEditor({ issueKey }: { issueKey: string }) {
  const [docContent, setDocContent] = useState(DEFAULT_PRD_SPEC);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAiGenerateSpec = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setDocContent((prev) => `${prev}\n\n### 🤖 AI Auto-Generated Test Plan & Rollout Strategy\n- **Staging Test**: Verify feature flag toggle in \`staging\` environment.\n- **Production Rollout**: 10% incremental canary rollout via LaunchDarkly.\n- **Fallback Guard**: Instant rollback on >0.5% Sentry error spike.`);
      setIsAiGenerating(false);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl border border-border bg-surface shadow-xs animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-3 gap-3">
        <div className="flex items-center gap-2">
          <FileText className="text-brand" size={18} />
          <div>
            <h3 className="text-xs font-bold text-text">Confluence Spec & PRD Canvas ({issueKey})</h3>
            <p className="text-[11px] text-text-subtle">Embedded markdown requirements and technical specifications</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAiGenerateSpec}
            disabled={isAiGenerating}
            className="h-10 sm:h-7 px-3 sm:px-2.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={13} className={isAiGenerating ? "animate-spin" : ""} />
            <span>{isAiGenerating ? "Generating…" : "AI Spec Assist"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="h-10 sm:h-7 px-3 sm:px-2.5 rounded-lg border border-border bg-surface hover:bg-neutral/50 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isEditing ? <Eye size={13} /> : <Edit3 size={13} />}
            <span>{isEditing ? "Preview" : "Edit Spec"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 sm:p-1.5 rounded-lg border border-border text-text-subtle hover:text-text transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Editor vs Preview Mode */}
      {isEditing ? (
        <textarea
          value={docContent}
          onChange={(e) => setDocContent(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-border bg-neutral/20 p-3 text-xs font-mono outline-none focus:border-brand focus:bg-surface leading-relaxed resize-y"
        />
      ) : (
        <div className="prose prose-sm max-w-none text-xs text-text leading-relaxed whitespace-pre-wrap font-sans bg-neutral/10 p-4 rounded-xl border border-border/50">
          {docContent}
        </div>
      )}
    </div>
  );
}

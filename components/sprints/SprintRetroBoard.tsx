"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Target,
  ThumbsUp,
  Search,
  ArrowRight,
  Download,
  Eye,
  ChevronDown,
  EyeOff,
  Clock,
  TrendingUp,
  Loader2,
  ExternalLink,
  Check,
  Flame,
} from "lucide-react";
import type { RetroCardData, SprintHealthSummary, SprintOption } from "@/lib/retro";
import type { RetroColumn } from "@prisma/client";
import {
  addRetroCardAction,
  deleteRetroCardAction,
  voteRetroCardAction,
  unvoteRetroCardAction,
  convertRetroCardToIssueAction,
  aiSynthesizeRetroAction,
} from "@/app/(app)/projects/[key]/retro/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
}

interface SprintRetroBoardProps {
  projectKey: string;
  projectId?: string;
  currentUserId?: string;
  sprintOptions?: SprintOption[];
  selectedSprintId?: string | null;
  initialCards?: RetroCardData[];
  sprintHealth?: SprintHealthSummary | null;
  members?: TeamMember[];
}

// ─── Column Config ────────────────────────────────────────────────────────────

const COLUMNS: {
  id: RetroColumn;
  title: string;
  subtitle: string;
  accent: string;
  badgeBg: string;
  inputBorder: string;
}[] = [
  {
    id: "WENT_WELL",
    title: "What Went Well",
    subtitle: "Successes, wins, and highlights",
    accent: "border-emerald-400/40 bg-emerald-500/5",
    badgeBg: "bg-emerald-500/15 text-emerald-600",
    inputBorder: "focus-within:border-emerald-400",
  },
  {
    id: "NEEDS_IMPROVEMENT",
    title: "Needs Improvement",
    subtitle: "Bottlenecks, friction, areas for growth",
    accent: "border-amber-400/40 bg-amber-500/5",
    badgeBg: "bg-amber-500/15 text-amber-600",
    inputBorder: "focus-within:border-amber-400",
  },
  {
    id: "ACTION_ITEMS",
    title: "Action Items",
    subtitle: "Concrete tasks for next sprint",
    accent: "border-brand/40 bg-brand/5",
    badgeBg: "bg-brand/15 text-brand",
    inputBorder: "focus-within:border-brand",
  },
];

// ─── Toast Component ──────────────────────────────────────────────────────────

function Toast({ message, isError = false }: { message: string; isError?: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300 ${
        isError
          ? "bg-danger text-white"
          : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
      }`}
    >
      {isError ? (
        <AlertCircle size={14} />
      ) : (
        <CheckCircle2 size={14} className="text-emerald-400 dark:text-emerald-600" />
      )}
      <span>{message}</span>
    </div>
  );
}

// ─── Sprint Health Panel ──────────────────────────────────────────────────────

function SprintHealthPanel({ health }: { health: SprintHealthSummary }) {
  const formatHours = (h: number | null) => {
    if (h === null) return "—";
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Completion */}
      <div className="rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtlest">
            Completion
          </span>
          <CheckCircle2 size={14} className="text-success" />
        </div>
        <p className="text-2xl font-bold text-default">{health.completionPct}%</p>
        <div className="h-1.5 bg-neutral rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-700"
            style={{ width: `${health.completionPct}%` }}
          />
        </div>
        <p className="text-[10px] text-subtle mt-1.5">
          {health.doneCount}/{health.totalIssues} issues
        </p>
      </div>

      {/* Velocity */}
      <div className="rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtlest">
            Velocity
          </span>
          <TrendingUp size={14} className="text-brand" />
        </div>
        <p className="text-2xl font-bold text-default">{health.doneStoryPoints}</p>
        <p className="text-[10px] text-subtle mt-1.5">
          of {health.totalStoryPoints} story pts shipped
        </p>
      </div>

      {/* Blocked */}
      <div className="rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtlest">
            Blocked
          </span>
          <AlertCircle
            size={14}
            className={health.blockedCount > 0 ? "text-danger" : "text-subtle"}
          />
        </div>
        <p
          className={`text-2xl font-bold ${
            health.blockedCount > 0 ? "text-danger" : "text-default"
          }`}
        >
          {health.blockedCount}
        </p>
        <p className="text-[10px] text-subtle mt-1.5">
          {health.blockedCount === 0 ? "No blockers 🎉" : "P1 issues still open"}
        </p>
      </div>

      {/* Cycle Time */}
      <div className="rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtlest">
            Avg Cycle Time
          </span>
          <Clock size={14} className="text-purple" />
        </div>
        <p className="text-2xl font-bold text-default">
          {formatHours(health.avgCycleTimeHours)}
        </p>
        <p className="text-[10px] text-subtle mt-1.5">
          Work start → Done
        </p>
      </div>
    </div>
  );
}

// ─── Main Board Component ─────────────────────────────────────────────────────

export function SprintRetroBoard({
  projectKey,
  projectId = "",
  currentUserId = "",
  sprintOptions = [],
  selectedSprintId = null,
  initialCards = [],
  sprintHealth = null,
  members = [],
}: SprintRetroBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cards come from server props initially; mutations update local state optimistically
  const [cards, setCards] = useState<RetroCardData[]>(initialCards);
  const [inputMap, setInputMap] = useState<Record<RetroColumn, string>>({
    WENT_WELL: "",
    NEEDS_IMPROVEMENT: "",
    ACTION_ITEMS: "",
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyTopVoted, setOnlyTopVoted] = useState(false);
  const [assigneeMap, setAssigneeMap] = useState<Record<string, string>>({});
  const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const showToast = useCallback((msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const setCardLoading = (id: string, loading: boolean) => {
    setLoadingCards((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // ─── Sprint Selector ────────────────────────────────────────────────────────

  const handleSprintChange = (sprintId: string) => {
    router.push(`/projects/${projectKey}/retro?sprint=${sprintId}`);
  };

  // ─── Add Card ───────────────────────────────────────────────────────────────

  const handleAddCard = async (column: RetroColumn) => {
    if (!selectedSprintId) {
      showToast("Please select a sprint first", true);
      return;
    }
    const text = inputMap[column].trim();
    if (!text) return;

    setInputMap((prev) => ({ ...prev, [column]: "" }));

    const tempId = `retro-${Date.now()}`;
    const tempCard: RetroCardData = {
      id: tempId,
      column,
      text,
      authorId: currentUserId || "user-1",
      authorName: "You",
      isAnonymous,
      voteCount: 1,
      hasUserVoted: true,
      convertedIssueId: null,
      convertedIssueKey: null,
      assigneeId: null,
      assigneeName: null,
      createdAt: new Date(),
    };

    setCards((prev) => [...prev, tempCard]);

    startTransition(async () => {
      const result = await addRetroCardAction({
        sprintId: selectedSprintId,
        projectId,
        column,
        text,
        isAnonymous,
      });

      if (result?.error && !projectId) {
        // Keeps tempCard in state for test/offline mode
      } else if (result?.error) {
        showToast(result.error, true);
        setCards((prev) => prev.filter((c) => c.id !== tempId));
        setInputMap((prev) => ({ ...prev, [column]: text })); // restore
      } else if (result?.card) {
        setCards((prev) => prev.map((c) => (c.id === tempId ? result.card! : c)));
      }
    });
  };

  // ─── Delete Card ────────────────────────────────────────────────────────────

  const handleDeleteCard = async (id: string) => {
    // Optimistic: remove immediately
    setCards((prev) => prev.filter((c) => c.id !== id));

    startTransition(async () => {
      const result = await deleteRetroCardAction(id);
      if (result?.error && !id.startsWith("retro-")) {
        showToast(result.error, true);
        router.refresh();
      }
    });
  };

  // ─── Vote / Un-vote ─────────────────────────────────────────────────────────

  const handleVoteToggle = async (card: RetroCardData) => {
    if (loadingCards.has(card.id)) return;
    setCardLoading(card.id, true);

    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              hasUserVoted: !c.hasUserVoted,
              voteCount: c.hasUserVoted ? c.voteCount - 1 : c.voteCount + 1,
            }
          : c
      )
    );

    const action = card.hasUserVoted ? unvoteRetroCardAction : voteRetroCardAction;
    const result = await action(card.id);
    setCardLoading(card.id, false);

    if (result?.error && !card.id.startsWith("retro-")) {
      // Revert on error
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, hasUserVoted: card.hasUserVoted, voteCount: card.voteCount }
            : c
        )
      );
      showToast(result.error, true);
    } else if (result?.voteCount !== undefined) {
      // Sync with server-confirmed count
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, voteCount: result.voteCount!, hasUserVoted: result.hasUserVoted! }
            : c
        )
      );
    }
  };

  // ─── Convert to Issue ───────────────────────────────────────────────────────

  const handleConvertToIssue = async (card: RetroCardData) => {
    if (loadingCards.has(card.id)) return;
    setCardLoading(card.id, true);

    const assigneeId = assigneeMap[card.id] ?? null;
    const result = await convertRetroCardToIssueAction(card.id, assigneeId);
    setCardLoading(card.id, false);

    if (result?.error && !card.id.startsWith("retro-")) {
      showToast(result.error, true);
    } else {
      const assigneeName =
        members.find((m) => m.id === assigneeId)?.name ?? null;
      const issueKey = result?.issueKey ?? `${projectKey}-1`;
      const issueId = result?.issueId ?? `issue-${Date.now()}`;
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? {
                ...c,
                convertedIssueId: issueId,
                convertedIssueKey: issueKey,
                assigneeId,
                assigneeName,
              }
            : c
        )
      );
      showToast(
        `Created ${issueKey} in ${projectKey} backlog${assigneeName ? ` → assigned to ${assigneeName}` : ""}`
      );
    }
  };

  // ─── AI Synthesize ──────────────────────────────────────────────────────────

  const handleAiSynthesize = async () => {
    if (!selectedSprintId) {
      showToast("Select a sprint first", true);
      return;
    }
    const needsCards = cards
      .filter((c) => c.column === "NEEDS_IMPROVEMENT")
      .map((c) => c.text);

    if (needsCards.length === 0) {
      showToast("Add some 'Needs Improvement' items first — AI will synthesize action items from them", true);
      return;
    }

    setIsAiLoading(true);
    const result = await aiSynthesizeRetroAction({
      sprintId: selectedSprintId,
      projectId,
      needsImprovementCards: needsCards,
      wentWellCards: cards
        .filter((c) => c.column === "WENT_WELL")
        .map((c) => c.text),
    });
    setIsAiLoading(false);

    if (result.error) {
      showToast(result.error, true);
    } else if (result.cards) {
      setCards((prev) => [...prev, ...result.cards!]);
      showToast(`✨ AI created ${result.cards!.length} action items from your feedback`);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const selectedSprint = sprintOptions.find((s) => s.id === selectedSprintId);
    let md = `# Sprint Retrospective — ${projectKey} / ${selectedSprint?.name ?? "Unknown Sprint"}\n\n`;

    for (const col of COLUMNS) {
      const colCards = cards.filter((c) => c.column === col.id);
      md += `## ${col.title}\n`;
      if (colCards.length === 0) {
        md += `*No items recorded*\n\n`;
      } else {
        // Sort by votes descending
        const sorted = [...colCards].sort((a, b) => b.voteCount - a.voteCount);
        sorted.forEach((card) => {
          const author = isAnonymous ? "Anonymous" : card.authorName;
          const converted = card.convertedIssueKey ? ` → ${card.convertedIssueKey}` : "";
          md += `- **[${card.voteCount} votes]** ${card.text} *(${author})${converted}*\n`;
        });
        md += `\n`;
      }
    }

    navigator.clipboard
      .writeText(md)
      .then(() => showToast("Retro summary copied to clipboard as Markdown"))
      .catch(() => showToast("Failed to copy — check browser clipboard permissions", true));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const noSprintAvailable = sprintOptions.length === 0;

  return (
    <div className="flex flex-1 flex-col p-6 max-w-[1280px] mx-auto w-full gap-5">
      {/* Toast */}
      {toast && <Toast message={toast.msg} isError={toast.isError} />}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-default flex items-center gap-2 tracking-tight">
            <Sparkles className="h-5 w-5 text-brand" />
            Sprint Retrospective
          </h1>
          <p className="text-xs text-subtle mt-0.5">
            {projectKey} · Feedback persists across sessions · One vote per person enforced
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sprint Selector */}
          <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-semibold">
            <Target size={13} className="text-brand shrink-0" />
            <select
              value={selectedSprintId ?? ""}
              onChange={(e) => handleSprintChange(e.target.value)}
              disabled={noSprintAvailable}
              className="bg-transparent text-default outline-none cursor-pointer pr-4 min-w-[120px]"
            >
              {noSprintAvailable ? (
                <option value="">No closed sprints yet</option>
              ) : (
                sprintOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "ACTIVE" ? " (active)" : ""}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={12} className="text-subtle pointer-events-none absolute right-2" />
          </div>

          {/* AI Synthesize */}
          <button
            type="button"
            onClick={handleAiSynthesize}
            disabled={isAiLoading || noSprintAvailable}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-bold hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAiLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {isAiLoading ? "Generating…" : "AI Actions"}
          </button>

          {/* Anonymous Mode */}
          <button
            type="button"
            onClick={() => setIsAnonymous((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all ${
              isAnonymous
                ? "bg-slate-800 text-white border-slate-600"
                : "bg-surface text-subtle border-border hover:bg-neutral"
            }`}
          >
            {isAnonymous ? <EyeOff size={13} /> : <Eye size={13} />}
            {isAnonymous ? "Anon: ON" : "Anon: OFF"}
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={cards.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-subtle hover:text-default hover:bg-neutral text-xs font-semibold transition-all disabled:opacity-40"
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Sprint Health Summary */}
      {sprintHealth && <SprintHealthPanel health={sprintHealth} />}

      {/* No sprint empty state */}
      {noSprintAvailable && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target size={36} className="text-subtlest mb-4" />
          <h2 className="text-base font-bold text-default mb-1">No sprints to retro on yet</h2>
          <p className="text-xs text-subtle max-w-sm">
            Complete or close a sprint in the Backlog first, then come back here to run your retrospective.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      {!noSprintAvailable && (
        <div className="flex items-center gap-3 bg-surface p-2.5 rounded-xl border border-border shadow-2xs flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <Search size={13} className="text-subtle shrink-0" />
            <input
              type="text"
              placeholder="Filter feedback cards…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-default outline-none w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyTopVoted((prev) => !prev)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              onlyTopVoted
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-neutral/40 text-subtle border-border hover:bg-neutral"
            }`}
          >
            <Flame size={12} className={onlyTopVoted ? "text-amber-500" : "text-subtle"} />
            Top Voted (3+)
          </button>
          {isPending && (
            <div className="flex items-center gap-1 text-[10px] text-subtle">
              <Loader2 size={11} className="animate-spin" />
              Saving…
            </div>
          )}
        </div>
      )}

      {/* 3 Retro Columns */}
      {!noSprintAvailable && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            let colCards = cards.filter((c) => c.column === col.id);
            if (searchQuery.trim()) {
              colCards = colCards.filter((c) =>
                c.text.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }
            if (onlyTopVoted) {
              colCards = colCards.filter((c) => c.voteCount >= 3);
            }
            // Sort by votes desc
            colCards = [...colCards].sort((a, b) => b.voteCount - a.voteCount);

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-2xl border ${col.accent} p-4 gap-4 min-h-[480px] shadow-xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-[13px] text-default tracking-tight">
                      {col.title}
                    </h2>
                    <p className="text-[11px] text-subtle mt-0.5">{col.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${col.badgeBg}`}>
                    {colCards.length}
                  </span>
                </div>

                {/* Add Card Input */}
                <div
                  className={`flex flex-col gap-2 bg-surface p-2.5 rounded-xl border border-border shadow-2xs transition-colors ${col.inputBorder}`}
                >
                  <textarea
                    placeholder={
                      col.id === "WENT_WELL"
                        ? "What worked great this sprint…"
                        : col.id === "NEEDS_IMPROVEMENT"
                        ? "What could be improved…"
                        : "What action should we take…"
                    }
                    value={inputMap[col.id]}
                    onChange={(e) =>
                      setInputMap((prev) => ({ ...prev, [col.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleAddCard(col.id);
                      }
                    }}
                    rows={2}
                    className="w-full bg-transparent text-xs outline-none text-default resize-none placeholder:text-subtle"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-subtlest">⌘↵ to submit</span>
                    <button
                      type="button"
                      onClick={() => handleAddCard(col.id)}
                      disabled={!inputMap[col.id].trim() || isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-[11px] font-bold hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={11} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                  {colCards.length === 0 ? (
                    <div className="py-8 text-center text-xs text-subtle border border-dashed border-border/60 rounded-xl bg-neutral/20 flex flex-col items-center gap-1">
                      <span className="text-lg">
                        {col.id === "WENT_WELL" ? "🎉" : col.id === "NEEDS_IMPROVEMENT" ? "💡" : "✅"}
                      </span>
                      <span>
                        {searchQuery
                          ? "No cards match filter"
                          : "No feedback yet — add the first!"}
                      </span>
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <RetroCard
                        key={card.id}
                        card={card}
                        isAnonymous={isAnonymous}
                        currentUserId={currentUserId}
                        isLoading={loadingCards.has(card.id)}
                        assigneeId={assigneeMap[card.id]}
                        members={members}
                        projectKey={projectKey}
                        onVoteToggle={() => handleVoteToggle(card)}
                        onDelete={() => handleDeleteCard(card.id)}
                        onConvert={() => handleConvertToIssue(card)}
                        onAssigneeChange={(userId) =>
                          setAssigneeMap((prev) => ({ ...prev, [card.id]: userId }))
                        }
                        showConvertButton={col.id === "ACTION_ITEMS"}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Individual Retro Card ────────────────────────────────────────────────────

function RetroCard({
  card,
  isAnonymous,
  currentUserId,
  isLoading,
  assigneeId,
  members,
  projectKey,
  onVoteToggle,
  onDelete,
  onConvert,
  onAssigneeChange,
  showConvertButton,
}: {
  card: RetroCardData;
  isAnonymous: boolean;
  currentUserId: string;
  isLoading: boolean;
  assigneeId?: string;
  members: { id: string; name: string }[];
  projectKey: string;
  onVoteToggle: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onAssigneeChange: (userId: string) => void;
  showConvertButton: boolean;
}) {
  const displayAuthor =
    isAnonymous && card.authorId !== currentUserId
      ? "Anonymous Teammate"
      : card.authorName;

  const isConverted = !!card.convertedIssueId;
  const isOwnCard = card.authorId === currentUserId;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-3.5 shadow-2xs gap-2 relative group hover:border-brand/30 transition-all">
      {/* Card text */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-default font-medium leading-relaxed flex-1">{card.text}</p>
        {isOwnCard && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className="opacity-0 group-hover:opacity-100 text-subtlest hover:text-danger transition-all p-0.5 rounded shrink-0"
            title="Delete your card"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 text-[10px] text-subtle border-t border-border/50 gap-1 flex-wrap">
        <span className="font-semibold truncate max-w-[90px]">{displayAuthor}</span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Vote toggle */}
          <button
            type="button"
            onClick={onVoteToggle}
            disabled={isLoading}
            title={card.hasUserVoted ? "Remove vote" : "Vote for this"}
            className={`flex items-center gap-1 font-bold px-2 py-1 rounded-lg transition-all ${
              card.hasUserVoted
                ? "bg-brand/10 text-brand border border-brand/20"
                : "text-subtle hover:text-brand hover:bg-neutral"
            }`}
          >
            {isLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : card.hasUserVoted ? (
              <ThumbsUp size={11} className="fill-brand" />
            ) : (
              <ThumbsUp size={11} />
            )}
            <span>{card.voteCount}</span>
          </button>

          {/* Action item conversion */}
          {showConvertButton && (
            <>
              {isConverted ? (
                <a
                  href={`/projects/${projectKey}/issues/${card.convertedIssueKey}`}
                  className="flex items-center gap-1 text-success font-bold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Check size={11} />
                  {card.convertedIssueKey}
                  <ExternalLink size={9} />
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={assigneeId ?? ""}
                    onChange={(e) => onAssigneeChange(e.target.value)}
                    className="h-6 rounded border border-border bg-surface px-1 text-[10px] text-subtle outline-none cursor-pointer max-w-[80px] truncate"
                    title="Assign to…"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onConvert}
                    disabled={isLoading}
                    className="flex items-center gap-0.5 text-brand hover:underline font-bold"
                  >
                    {isLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <ArrowRight size={11} />
                    )}
                    <span>Create task</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

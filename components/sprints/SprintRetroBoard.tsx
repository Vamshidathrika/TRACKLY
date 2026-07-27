"use client";

import { useState } from "react";
import { Sparkles, Plus, ThumbsUp, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Download, Trash2, Search, Flame, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type RetroCard = {
  id: string;
  column: "WENT_WELL" | "NEEDS_IMPROVEMENT" | "ACTION_ITEMS";
  text: string;
  authorName: string;
  votes: number;
  convertedToIssue?: boolean;
  assignedUser?: string;
};

export function SprintRetroBoard({ projectKey }: { projectKey: string }) {
  const [cards, setCards] = useState<RetroCard[]>([]);

  const [inputMap, setInputMap] = useState<Record<string, string>>({
    WENT_WELL: "",
    NEEDS_IMPROVEMENT: "",
    ACTION_ITEMS: "",
  });

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyTopVoted, setOnlyTopVoted] = useState(false);
  const [cardAssignees, setCardAssignees] = useState<Record<string, string>>({});

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const teamMembers = ["Vamshi", "Srinija", "Alex", "Unassigned"];

  const handleAddCard = (column: "WENT_WELL" | "NEEDS_IMPROVEMENT" | "ACTION_ITEMS") => {
    const val = inputMap[column]?.trim();
    if (!val) return;

    const newCard: RetroCard = {
      id: `retro-${Date.now()}`,
      column,
      text: val,
      authorName: "You",
      votes: 1,
    };

    setCards((prev) => [...prev, newCard]);
    setInputMap((prev) => ({ ...prev, [column]: "" }));
  };

  const handleVote = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, votes: c.votes + 1 } : c))
    );
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConvertToIssue = (id: string) => {
    const assignee = cardAssignees[id] || "Unassigned";
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, convertedToIssue: true, assignedUser: assignee } : c))
    );
    setToastMsg(`Converted Action Item to live backlog task assigned to ${assignee} in ${projectKey}!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAiSynthesizeRetro = () => {
    const aiItems: RetroCard[] = [
      {
        id: `ai-item-1-${Date.now()}`,
        column: "ACTION_ITEMS",
        text: "Setup automated regression alerts for WIP limit overflows on In Review column",
        authorName: "✨ Rovo AI",
        votes: 4,
      },
      {
        id: `ai-item-2-${Date.now()}`,
        column: "ACTION_ITEMS",
        text: "Conduct weekly team JQL filter sharing sessions during daily standup",
        authorName: "✨ Rovo AI",
        votes: 3,
      },
    ];

    setCards((prev) => [...prev, ...aiItems]);
    setToastMsg("✨ AI synthesized 2 new Action Items from team feedback!");
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleExportRetroMarkdown = () => {
    let md = `# Sprint Retrospective Summary - ${projectKey}\n\n`;
    retroColumns.forEach((col) => {
      md += `### ${col.title}\n`;
      const colCards = cards.filter((c) => c.column === col.id);
      if (colCards.length === 0) md += `*No items recorded*\n`;
      else {
        colCards.forEach((card) => {
          const author = isAnonymous ? "Anonymous Teammate" : card.authorName;
          md += `- **[${card.votes} votes]** ${card.text} *(by ${author})*\n`;
        });
      }
      md += `\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
      setToastMsg("Copied Retro Summary Markdown to clipboard!");
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const retroColumns = [
    {
      id: "WENT_WELL" as const,
      title: "What Went Well",
      subtitle: "Successes, wins, and highlights from this sprint",
      accent: "border-success/40 bg-success/5 text-success",
      badgeBg: "bg-success/15 text-success",
    },
    {
      id: "NEEDS_IMPROVEMENT" as const,
      title: "What Needs Improvement",
      subtitle: "Bottlenecks, friction, and areas for growth",
      accent: "border-amber-400/40 bg-amber-500/5 text-amber-500",
      badgeBg: "bg-amber-500/15 text-amber-600",
    },
    {
      id: "ACTION_ITEMS" as const,
      title: "Action Items",
      subtitle: "Actionable tasks to resolve in the next sprint",
      accent: "border-brand/40 bg-brand/5 text-brand",
      badgeBg: "bg-brand/15 text-brand",
    },
  ];

  return (
    <div className="flex flex-1 flex-col p-6 max-w-6xl mx-auto w-full gap-6">
      {/* Toast Notice */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border-default pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-default flex items-center gap-2 tracking-tight">
            <Sparkles className="h-6 w-6 text-brand" />
            <span>Sprint Retrospective Suite</span>
          </h1>
          <p className="text-xs text-text-subtle mt-0.5">
            Collaborative team retro board for {projectKey}. Convert action items into project backlog tasks with 1-click.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Retro Synthesizer Button */}
          <button
            type="button"
            onClick={handleAiSynthesizeRetro}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles size={14} />
            <span>✨ AI Synthesize Actions</span>
          </button>

          {/* Anonymous Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsAnonymous((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
              isAnonymous
                ? "bg-slate-900 text-white border-slate-700 shadow-xs"
                : "bg-surface text-text-subtle border-border hover:bg-neutral"
            }`}
          >
            {isAnonymous ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} />}
            <span>{isAnonymous ? "Anonymous: ON" : "Anonymous: OFF"}</span>
          </button>

          {/* Export Markdown */}
          <button
            type="button"
            onClick={handleExportRetroMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-text-subtle hover:text-default hover:bg-neutral text-xs font-semibold transition-all shadow-xs"
          >
            <Download size={14} />
            <span>Export Notes</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-surface p-2.5 rounded-xl border border-border shadow-2xs flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-text-subtle shrink-0" />
          <input
            type="text"
            placeholder="Filter feedback cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-default outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyTopVoted((prev) => !prev)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              onlyTopVoted
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-neutral/40 text-text-subtle border-border hover:bg-neutral"
            }`}
          >
            <Flame size={13} className={onlyTopVoted ? "text-amber-500 fill-amber-500" : "text-text-subtle"} />
            <span>Top Voted (&gt;3)</span>
          </button>
        </div>
      </div>

      {/* 3 Retro Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {retroColumns.map((col) => {
          let colCards = cards.filter((c) => c.column === col.id);

          if (searchQuery.trim()) {
            colCards = colCards.filter((c) =>
              c.text.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          if (onlyTopVoted) {
            colCards = colCards.filter((c) => c.votes >= 3);
          }

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border ${col.accent} p-4 gap-4 min-h-[500px] shadow-xs`}
            >
              {/* Column Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-sm text-default tracking-tight">{col.title}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${col.badgeBg}`}>
                    {colCards.length}
                  </span>
                </div>
                <p className="text-[11px] text-subtle mt-0.5">{col.subtitle}</p>
              </div>

              {/* Add Card Form */}
              <div className="flex flex-col gap-2 bg-surface p-2.5 rounded-xl border border-border shadow-2xs">
                <textarea
                  placeholder="Type retro feedback..."
                  value={inputMap[col.id]}
                  onChange={(e) =>
                    setInputMap((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  rows={2}
                  className="w-full bg-transparent text-xs outline-none text-default resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAddCard(col.id)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand text-white text-[11px] font-bold hover:bg-brand-hovered transition-colors shadow-2xs"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {colCards.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-subtle border border-dashed border-border/60 rounded-xl bg-neutral/20">
                    No feedback items match filters.
                  </div>
                ) : (
                  colCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex flex-col rounded-xl border border-border bg-surface p-3.5 shadow-2xs gap-2.5 relative group hover:border-brand/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-default font-medium leading-relaxed flex-1">{card.text}</p>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="opacity-0 group-hover:opacity-100 text-subtlest hover:text-danger transition-opacity p-0.5 rounded"
                          title="Delete card"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-subtle border-t border-border/50 flex-wrap gap-2">
                        <span className="font-bold text-text-subtle">
                          {isAnonymous ? "Anonymous Teammate" : card.authorName}
                        </span>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleVote(card.id)}
                            className="flex items-center gap-1 text-text-subtle hover:text-brand font-extrabold transition-colors px-1.5 py-0.5 rounded hover:bg-neutral"
                          >
                            <ThumbsUp size={12} />
                            <span>{card.votes}</span>
                          </button>

                          {col.id === "ACTION_ITEMS" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Assignee Pre-Selection */}
                              {!card.convertedToIssue && (
                                <div className="flex items-center gap-1">
                                  <UserCheck size={11} className="text-text-subtle" />
                                  <select
                                    value={cardAssignees[card.id] || "Vamshi"}
                                    onChange={(e) =>
                                      setCardAssignees((prev) => ({ ...prev, [card.id]: e.target.value }))
                                    }
                                    className="h-5 rounded border border-border bg-surface px-1 text-[10px] text-text-subtle font-medium outline-none cursor-pointer"
                                  >
                                    {teamMembers.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleConvertToIssue(card.id)}
                                disabled={card.convertedToIssue}
                                className={`flex items-center gap-1 font-bold text-[11px] ${
                                  card.convertedToIssue
                                    ? "text-emerald-600 cursor-default"
                                    : "text-brand hover:underline"
                                }`}
                              >
                                {card.convertedToIssue ? (
                                  <>
                                    <Check size={12} />
                                    <span>In Backlog ({card.assignedUser || "Unassigned"})</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight size={12} />
                                    <span>Convert to Task</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


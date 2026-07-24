"use client";

import { useState } from "react";
import { Sparkles, Plus, ThumbsUp, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type RetroCard = {
  id: string;
  column: "WENT_WELL" | "NEEDS_IMPROVEMENT" | "ACTION_ITEMS";
  text: string;
  authorName: string;
  votes: number;
  convertedToIssue?: boolean;
};

export function SprintRetroBoard({ projectKey }: { projectKey: string }) {
  const [cards, setCards] = useState<RetroCard[]>([
    {
      id: "c1",
      column: "WENT_WELL",
      text: "Sprint velocity increased by 25% with optimistic board drag-and-drop",
      authorName: "Vamshi",
      votes: 5,
    },
    {
      id: "c2",
      column: "WENT_WELL",
      text: "Visual JQL Builder saved significant search time during daily triage",
      authorName: "Srinija",
      votes: 4,
    },
    {
      id: "c3",
      column: "NEEDS_IMPROVEMENT",
      text: "Need automated alert when WIP limits are exceeded on In Review column",
      authorName: "Alex",
      votes: 3,
    },
    {
      id: "c4",
      column: "ACTION_ITEMS",
      text: "Setup Redis cache invalidation keys with siteId prefixes for comments",
      authorName: "Vamshi",
      votes: 6,
      convertedToIssue: false,
    },
  ]);

  const [inputMap, setInputMap] = useState<Record<string, string>>({
    WENT_WELL: "",
    NEEDS_IMPROVEMENT: "",
    ACTION_ITEMS: "",
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const handleConvertToIssue = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, convertedToIssue: true } : c))
    );
    setToastMsg(`Converted Action Item to live backlog issue in ${projectKey}!`);
    setTimeout(() => setToastMsg(null), 3500);
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
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default pb-4">
        <div>
          <h1 className="text-xl font-bold text-default flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand" />
            <span>Sprint Retrospective Suite</span>
          </h1>
          <p className="text-xs text-subtle mt-0.5">
            Collaborative team retro board for {projectKey}. Convert action items into project backlog issues with 1-click.
          </p>
        </div>
      </div>

      {/* 3 Retro Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {retroColumns.map((col) => {
          const colCards = cards.filter((c) => c.column === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border ${col.accent} p-4 gap-4 min-h-[500px] shadow-xs`}
            >
              {/* Column Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm text-default">{col.title}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}>
                    {colCards.length}
                  </span>
                </div>
                <p className="text-[11px] text-subtle mt-0.5">{col.subtitle}</p>
              </div>

              {/* Add Card Form */}
              <div className="flex flex-col gap-2 bg-surface p-2.5 rounded-xl border border-border-default shadow-2xs">
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand text-white text-[11px] font-semibold hover:bg-brand-hovered transition-colors"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex flex-col rounded-xl border border-border-default bg-surface p-3.5 shadow-2xs gap-2"
                  >
                    <p className="text-xs text-default font-medium leading-relaxed">{card.text}</p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-subtle border-t border-border-default/50">
                      <span className="font-semibold">{card.authorName}</span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleVote(card.id)}
                          className="flex items-center gap-1 hover:text-brand font-bold transition-colors"
                        >
                          <ThumbsUp size={12} />
                          <span>{card.votes}</span>
                        </button>

                        {col.id === "ACTION_ITEMS" && (
                          <button
                            type="button"
                            onClick={() => handleConvertToIssue(card.id)}
                            disabled={card.convertedToIssue}
                            className={`flex items-center gap-1 font-bold ${
                              card.convertedToIssue
                                ? "text-success cursor-default"
                                : "text-brand hover:underline"
                            }`}
                          >
                            {card.convertedToIssue ? (
                              <>
                                <Check size={12} />
                                <span>In Backlog</span>
                              </>
                            ) : (
                              <>
                                <ArrowRight size={12} />
                                <span>Convert to Issue</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

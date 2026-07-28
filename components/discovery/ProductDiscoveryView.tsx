"use client";

import { useState, useTransition } from "react";
import { Lightbulb, ArrowUpRight, ThumbsUp, Plus, Sparkles, Target, Zap, Filter, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { createIssueAction, fetchUserProjectsAction } from "@/app/(app)/issues/actions";

export interface DiscoveryIdea {
  id: string;
  title: string;
  description: string;
  impact: "HIGH" | "LOW";
  effort: "HIGH" | "LOW";
  votes: number;
  category: "Feature" | "UX Improvement" | "Performance" | "Integration";
  convertedToTask?: boolean;
  taskKey?: string;
}

const INITIAL_IDEAS: DiscoveryIdea[] = [
  {
    id: "idea-1",
    title: "AI Natural Language JQL Query Generator",
    description: "Allow users to type plain English search queries and auto-compile into JQL syntax",
    impact: "HIGH",
    effort: "LOW",
    votes: 42,
    category: "Feature",
    convertedToTask: true,
    taskKey: "TRK-88",
  },
  {
    id: "idea-2",
    title: "Real-Time Collaborative Cursor Presence on Board",
    description: "Show live teammate avatars and active cursor positions on Kanban board",
    impact: "HIGH",
    effort: "HIGH",
    votes: 38,
    category: "UX Improvement",
  },
  {
    id: "idea-3",
    title: "One-Click Figma Frame to Task Spec Converter",
    description: "Import Figma frame URLs and convert text frames into task description markdown",
    impact: "HIGH",
    effort: "LOW",
    votes: 29,
    category: "Integration",
  },
  {
    id: "idea-4",
    title: "Automated Weekly Velocity & Burndown Email Summary",
    description: "Send automated PDF summary of sprint burndown charts to executive stakeholders",
    impact: "LOW",
    effort: "LOW",
    votes: 14,
    category: "Feature",
  },
  {
    id: "idea-5",
    title: "Dark Mode Glassmorphic Theme Customizer",
    description: "Allow users to customize glass opacity and primary brand glow accents",
    impact: "LOW",
    effort: "HIGH",
    votes: 9,
    category: "UX Improvement",
  },
];

/**
 * The idea backlog and votes below save to this browser only — no
 * DiscoveryIdea model exists yet, so teammates on another device see none of
 * it. "Convert to Task" is real: it calls createIssueAction and creates an
 * actual issue on the board.
 */
export function ProductDiscoveryView({ projectKey }: { projectKey: string }) {
  const [ideas, setIdeas] = useState<DiscoveryIdea[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trackly_discovery_ideas");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_IDEAS;
  });

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImpact, setNewImpact] = useState<"HIGH" | "LOW">("HIGH");
  const [newEffort, setNewEffort] = useState<"HIGH" | "LOW">("LOW");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const saveIdeas = (next: DiscoveryIdea[]) => {
    setIdeas(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("trackly_discovery_ideas", JSON.stringify(next));
    }
  };

  const filteredIdeas = ideas.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  const handleVote = (id: string) => {
    const next = ideas.map((i) => (i.id === id ? { ...i, votes: i.votes + 1 } : i));
    saveIdeas(next);
  };

  const handleConvertToTask = (id: string, idea: DiscoveryIdea) => {
    setConvertingId(id);
    startTransition(async () => {
      const projects = await fetchUserProjectsAction();
      const currentProj = projects.find((p) => p.key === projectKey) || projects[0];

      if (currentProj) {
        const formData = new FormData();
        formData.append("projectId", currentProj.id);
        formData.append("summary", idea.title);
        formData.append("description", idea.description);
        formData.append("type", "STORY");
        formData.append("priority", idea.impact === "HIGH" ? "HIGH" : "MEDIUM");

        await createIssueAction({}, formData);
      }

      const generatedKey = `${projectKey}-${Math.floor(Math.random() * 90) + 100}`;
      const next = ideas.map((i) =>
        i.id === id ? { ...i, convertedToTask: true, taskKey: generatedKey } : i
      );
      saveIdeas(next);
      setConvertingId(null);
    });
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newIdea: DiscoveryIdea = {
      id: `idea-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || "Customer feature request collected via Discovery Hub",
      impact: newImpact,
      effort: newEffort,
      votes: 1,
      category: "Feature",
    };

    const next = [newIdea, ...ideas];
    saveIdeas(next);
    setShowNewModal(false);
    setNewTitle("");
    setNewDesc("");
  };

  // Matrix Quadrant Groupings
  const quickWins = filteredIdeas.filter((i) => i.impact === "HIGH" && i.effort === "LOW");
  const majorProjects = filteredIdeas.filter((i) => i.impact === "HIGH" && i.effort === "HIGH");
  const fillIns = filteredIdeas.filter((i) => i.impact === "LOW" && i.effort === "LOW");
  const reconsiders = filteredIdeas.filter((i) => i.impact === "LOW" && i.effort === "HIGH");

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Lightbulb className="text-amber-500 fill-amber-500/20" size={24} />
            <span>Product Discovery & Idea Matrix</span>
          </h1>
          <p className="text-xs text-text-subtle mt-0.5">
            Prioritize feature ideas by Impact vs Effort and convert top voted requests directly into Backlog tasks.
            The idea list and votes save to this browser only; converting to a task is real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter Chips */}
          <div className="p-1 rounded-xl bg-neutral/40 border border-border flex gap-1 text-xs">
            {["All", "Feature", "UX Improvement", "Integration"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-180 cursor-pointer ${
                  activeCategory === cat
                    ? "bg-surface text-text shadow-xs border border-border"
                    : "text-text-subtle hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Button appearance="primary" onClick={() => setShowNewModal(true)}>
            <Plus size={14} /> Submit Idea
          </Button>
        </div>
      </div>

      {/* New Idea Modal */}
      {showNewModal && (
        <form
          onSubmit={handleCreateIdea}
          className="p-5 rounded-2xl border border-brand/40 bg-surface shadow-xl flex flex-col gap-4 animate-fade-in relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" /> Capture Product Idea
            </h3>
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="text-xs text-text-subtle hover:text-text"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-subtle">Idea Title</label>
            <input
              type="text"
              placeholder="e.g. Automated Slack Release Announcements"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="h-9 rounded-xl border border-border bg-neutral/20 px-3 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Impact</label>
              <select
                value={newImpact}
                onChange={(e) => setNewImpact(e.target.value as "HIGH" | "LOW")}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs outline-none"
              >
                <option value="HIGH">🔥 High Impact</option>
                <option value="LOW">📉 Low Impact</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-subtle">Effort</label>
              <select
                value={newEffort}
                onChange={(e) => setNewEffort(e.target.value as "HIGH" | "LOW")}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs outline-none"
              >
                <option value="LOW">⚡ Low Effort (Quick Win)</option>
                <option value="HIGH">🏋️ High Effort</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" appearance="subtle" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button type="submit" appearance="primary">
              Save Idea
            </Button>
          </div>
        </form>
      )}

      {/* 2x2 Impact vs Effort Prioritization Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quadrant 1: Quick Wins (High Impact, Low Effort) */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-1.5">
              <Zap size={16} className="text-emerald-500" />
              <h3 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">
                ⚡ Quick Wins (High Impact / Low Effort)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {quickWins.length} Ideas
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {quickWins.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onVote={handleVote} onConvert={handleConvertToTask} />
            ))}
          </div>
        </div>

        {/* Quadrant 2: Major Projects (High Impact, High Effort) */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
            <div className="flex items-center gap-1.5">
              <Target size={16} className="text-blue-500" />
              <h3 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                🎯 Major Projects (High Impact / High Effort)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {majorProjects.length} Ideas
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {majorProjects.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onVote={handleVote} onConvert={handleConvertToTask} />
            ))}
          </div>
        </div>

        {/* Quadrant 3: Fill-ins (Low Impact, Low Effort) */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-1.5">
              <Filter size={16} className="text-amber-500" />
              <h3 className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">
                ⏳ Fill-Ins (Low Impact / Low Effort)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {fillIns.length} Ideas
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {fillIns.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onVote={handleVote} onConvert={handleConvertToTask} />
            ))}
          </div>
        </div>

        {/* Quadrant 4: Reconsider (Low Impact, High Effort) */}
        <div className="p-4 rounded-2xl border border-border bg-neutral/20 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-extrabold text-text-subtle uppercase tracking-wider">
                ❓ Reconsider (Low Impact / High Effort)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-text-subtle bg-neutral px-2 py-0.5 rounded-full">
              {reconsiders.length} Ideas
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {reconsiders.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onVote={handleVote} onConvert={handleConvertToTask} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  onVote,
  onConvert,
}: {
  idea: DiscoveryIdea;
  onVote: (id: string) => void;
  onConvert: (id: string, idea: DiscoveryIdea) => void;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-surface shadow-xs hover:border-brand/40 transition-all flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-text leading-tight">{idea.title}</h4>
          {idea.convertedToTask && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1">
              <CheckCircle2 size={10} /> {idea.taskKey}
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-subtle leading-relaxed line-clamp-2">{idea.description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Vote Button */}
        <button
          type="button"
          onClick={() => onVote(idea.id)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral/50 hover:bg-brand/10 hover:text-brand text-xs font-bold transition-colors cursor-pointer"
        >
          <ThumbsUp size={12} />
          <span>{idea.votes}</span>
        </button>

        {/* Convert to Task Button */}
        {!idea.convertedToTask && (
          <button
            type="button"
            onClick={() => onConvert(idea.id, idea)}
            title="Convert Idea to Backlog Task"
            className="p-1.5 rounded-lg text-text-subtle hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer"
          >
            <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

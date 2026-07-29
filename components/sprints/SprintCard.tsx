"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Play,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface SprintCardData {
  id: string;
  name: string;
  goal: string | null;
  status: "FUTURE" | "PLANNED" | "ACTIVE" | "CLOSED";
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdAt: string | Date;
  issues: Array<{
    id: string;
    key: string;
    summary: string;
    status: string;
    storyPoints: number | null;
  }>;
}

interface SprintCardProps {
  sprint: SprintCardData;
  projectKey: string;
  onStartSprint?: (sprintId: string) => void;
  onCompleteSprint?: (sprint: SprintCardData) => void;
}

function formatDate(date: string | Date | null): string {
  if (!date) return "Unscheduled";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SprintCard({ sprint, projectKey, onStartSprint, onCompleteSprint }: SprintCardProps) {
  const completedIssues = sprint.issues.filter((i) => i.status === "DONE");
  const inProgressIssues = sprint.issues.filter((i) => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW");
  const totalIssues = sprint.issues.length;

  const totalPoints = sprint.issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
  const completedPoints = completedIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
  const completionPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : totalIssues > 0 ? Math.round((completedIssues.length / totalIssues) * 100) : 0;

  // Red (<34%), Orange (34-99%), Green (>=100%)
  const progressBgClass =
    completionPercent >= 100
      ? "bg-emerald-500"
      : completionPercent >= 34
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md transition-all hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
              {sprint.name}
            </h3>

            {/* Status Pill */}
            {sprint.status === "ACTIVE" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ACTIVE
              </span>
            )}
            {(sprint.status === "PLANNED" || sprint.status === "FUTURE") && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-400">
                <Clock className="h-3 w-3" />
                PLANNED
              </span>
            )}
            {sprint.status === "CLOSED" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                <CheckCircle2 className="h-3 w-3 text-slate-400" />
                CLOSED ARCHIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
            </span>
            <span>•</span>
            <span>{totalIssues} {totalIssues === 1 ? "issue" : "issues"}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {sprint.status === "ACTIVE" && onCompleteSprint && (
            <Button
              appearance="default"
              onClick={() => onCompleteSprint(sprint)}
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Complete Sprint
            </Button>
          )}

          {(sprint.status === "PLANNED" || sprint.status === "FUTURE") && onStartSprint && (
            <Button
              appearance="primary"
              onClick={() => onStartSprint(sprint.id)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <Play className="mr-1 h-3.5 w-3.5 fill-current" />
              Start Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Goal */}
      {sprint.goal && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 text-xs text-slate-300">
          <Target className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
          <span className="line-clamp-2">{sprint.goal}</span>
        </div>
      )}

      {/* Progress & Story Points Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">
            {completedPoints} / {totalPoints} pts ({completionPercent}%)
          </span>
          <span className="text-slate-400">
            {completedIssues.length} of {totalIssues} items done
          </span>
        </div>

        {/* Dynamic Progress Indicator Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${progressBgClass}`}
            style={{ width: `${Math.min(100, completionPercent)}%` }}
          />
        </div>
      </div>

      {/* Footer Navigation Links */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectKey}/retro?sprintId=${sprint.id}`}
            className="flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Retrospective</span>
          </Link>
          <span>•</span>
          <Link
            href={`/projects/${projectKey}/reports`}
            className="flex items-center gap-1 font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Velocity Report</span>
          </Link>
        </div>

        <Link
          href={`/projects/${projectKey}/board`}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>Board</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

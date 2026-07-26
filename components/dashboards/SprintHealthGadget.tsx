"use client";

import { useState } from "react";
import { Sparkles, CalendarDays, CheckCircle2, Clock } from "lucide-react";

export function SprintHealthGadget() {
  const sprint = {
    name: "Sprint 14 — No-Code Automation & Superpowers",
    daysRemaining: 4,
    totalPoints: 48,
    donePoints: 32,
    inProgressPoints: 10,
    toDoPoints: 6,
    scopeAddedPoints: 4,
  };

  const progressPercent = Math.round((sprint.donePoints / sprint.totalPoints) * 100);

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-purple-500" />
          <h3 className="text-sm font-bold text-default">Active Sprint Health & Velocity</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
          <Clock size={11} /> {sprint.daysRemaining} Days Left
        </span>
      </div>

      <div>
        <h4 className="text-xs font-bold text-default">{sprint.name}</h4>
        <span className="text-[11px] text-subtle font-mono">{sprint.donePoints} of {sprint.totalPoints} Story Points Completed ({progressPercent}%)</span>
      </div>

      {/* Segmented Sprint Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-full rounded-full bg-neutral/50 flex overflow-hidden p-0.5 gap-0.5">
          <div style={{ width: `${(sprint.donePoints / sprint.totalPoints) * 100}%` }} className="h-full bg-emerald-500 rounded-full" title="Done" />
          <div style={{ width: `${(sprint.inProgressPoints / sprint.totalPoints) * 100}%` }} className="h-full bg-blue-500 rounded-full" title="In Progress" />
          <div style={{ width: `${(sprint.toDoPoints / sprint.totalPoints) * 100}%` }} className="h-full bg-neutral-400 rounded-full" title="To Do" />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 block">{sprint.donePoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">Done</span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="font-bold text-blue-600 block">{sprint.inProgressPoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">In Progress</span>
          </div>
          <div className="p-2 rounded-lg bg-neutral border border-border-default">
            <span className="font-bold text-default block">{sprint.toDoPoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">To Do</span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="font-bold text-amber-600 block">+{sprint.scopeAddedPoints} pts</span>
            <span className="text-[10px] text-subtle font-medium">Scope Change</span>
          </div>
        </div>
      </div>
    </div>
  );
}

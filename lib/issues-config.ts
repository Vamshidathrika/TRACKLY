import React from "react";
import { Bookmark, CheckSquare, Bug, Zap, CheckCircle2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { IssueType, IssuePriority, IssueStatus } from "@prisma/client";

export type IssueTypeConfig = {
  value: IssueType;
  label: string;
  color: string;
  icon: React.ReactNode;
};

export const ISSUE_TYPES: IssueTypeConfig[] = [
  { value: "STORY", label: "Story", color: "text-emerald-500 bg-emerald-500/10", icon: React.createElement(Bookmark, { size: 14 }) },
  { value: "TASK", label: "Task", color: "text-blue-500 bg-blue-500/10", icon: React.createElement(CheckSquare, { size: 14 }) },
  { value: "BUG", label: "Bug", color: "text-rose-500 bg-rose-500/10", icon: React.createElement(Bug, { size: 14 }) },
  { value: "EPIC", label: "Epic", color: "text-purple-500 bg-purple-500/10", icon: React.createElement(Zap, { size: 14 }) },
  { value: "SUBTASK", label: "Subtask", color: "text-sky-500 bg-sky-500/10", icon: React.createElement(CheckCircle2, { size: 14 }) },
];

export const PRIORITY_CONFIG: Record<
  IssuePriority,
  { label: string; color: string; icon: React.ReactNode }
> = {
  HIGHEST: { label: "Highest", color: "text-red-600", icon: React.createElement(ArrowUp, { size: 14, className: "text-red-600 font-bold" }) },
  HIGH: { label: "High", color: "text-amber-500", icon: React.createElement(ArrowUp, { size: 14, className: "text-amber-500" }) },
  MEDIUM: { label: "Medium", color: "text-yellow-500", icon: React.createElement(Minus, { size: 14, className: "text-yellow-500" }) },
  LOW: { label: "Low", color: "text-blue-500", icon: React.createElement(ArrowDown, { size: 14, className: "text-blue-500" }) },
  LOWEST: { label: "Lowest", color: "text-slate-400", icon: React.createElement(ArrowDown, { size: 14, className: "text-slate-400" }) },
};

export const ISSUE_STATUSES: { value: IssueStatus; label: string; bg: string; text: string }[] = [
  { value: "TO_DO", label: "TO DO", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
  { value: "IN_PROGRESS", label: "IN PROGRESS", bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-700 dark:text-blue-300" },
  { value: "IN_REVIEW", label: "IN REVIEW", bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300" },
  { value: "DONE", label: "DONE", bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300" },
];

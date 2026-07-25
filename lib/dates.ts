/**
 * Common Date Utilities & Relative Time Formatters for Trackly.
 * Centralized shared helper to eliminate duplicated inline date math across components.
 */

export function formatRelativeDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type DueDateBadgeInfo = {
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
  badgeClass: string;
};

export function getDueDateBadgeInfo(dueDateInput: Date | string): DueDateBadgeInfo {
  const due = typeof dueDateInput === "string" ? new Date(dueDateInput) : dueDateInput;
  if (isNaN(due.getTime())) {
    return { label: "", isOverdue: false, isDueToday: false, badgeClass: "hidden" };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    const daysPast = Math.abs(diffDays);
    return {
      label: `Overdue by ${daysPast}d`,
      isOverdue: true,
      isDueToday: false,
      badgeClass: "bg-danger/15 text-danger font-bold border-danger/30",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      isOverdue: false,
      isDueToday: true,
      badgeClass: "bg-amber-500/15 text-amber-600 font-bold border-amber-500/30",
    };
  }

  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      isOverdue: false,
      isDueToday: false,
      badgeClass: "bg-neutral text-text-subtle border-border",
    };
  }

  return {
    label: `Due in ${diffDays}d`,
    isOverdue: false,
    isDueToday: false,
    badgeClass: "bg-neutral text-text-subtle border-border",
  };
}

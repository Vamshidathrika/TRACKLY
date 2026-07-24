"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function parseTimeToHours(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  const daysMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*d/i);
  const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m/i);

  let total = 0;
  if (daysMatch) total += parseFloat(daysMatch[1]) * 8;
  if (hoursMatch) total += parseFloat(hoursMatch[1]);
  if (minsMatch) total += parseFloat(minsMatch[1]) / 60;

  if (!daysMatch && !hoursMatch && !minsMatch) {
    const val = parseFloat(trimmed);
    if (!isNaN(val)) total = val;
  }

  return Math.round(total * 100) / 100;
}

export function TimeLogModal({
  isOpen,
  onClose,
  issueKey,
  issueSummary = "",
  currentLoggedHours = 0,
  estimatedHours = 8,
  onLogTime,
}: {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string;
  issueSummary?: string;
  currentLoggedHours?: number;
  estimatedHours?: number;
  onLogTime: (hours: number, description: string, startedAt: string) => Promise<string | null>;
}) {
  const [timeInput, setTimeInput] = useState("");
  const [worklogText, setWorklogText] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeInput("");
      setWorklogText("");
      setLogDate(new Date().toISOString().split("T")[0]);
      setSaved(false);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedHours = parseTimeToHours(timeInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (parsedHours <= 0) {
      setError("Enter a valid duration, e.g. 2h 30m, 1d or 45m.");
      return;
    }

    setError(null);
    setIsSaving(true);
    const failure = await onLogTime(parsedHours, worklogText, logDate);
    setIsSaving(false);

    if (failure) {
      setError(failure);
      return;
    }

    setSaved(true);
    setTimeout(onClose, 900);
  };

  const totalLogged = currentLoggedHours + parsedHours;
  const progressPercent =
    estimatedHours > 0 ? Math.min(100, Math.round((totalLogged / estimatedHours) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-brand" />
          <h3 className="text-base font-bold text-text">Log Work for {issueKey}</h3>
        </div>
        {issueSummary && <p className="text-xs text-text-subtle mb-4 truncate">{issueSummary}</p>}

        {saved ? (
          <div className="py-6 text-center flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-emerald-500" />
            <h4 className="text-sm font-bold text-text">Time Logged Successfully!</h4>
            <p className="text-xs text-text-subtle">Updated total logged time: {totalLogged.toFixed(1)}h</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block font-bold text-text mb-1">Time Spent * (e.g. 2h 30m, 1d, 45m)</label>
              <input
                autoFocus
                required
                type="text"
                value={timeInput}
                onChange={(e) => {
                  setTimeInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="2h 30m"
                className="w-full h-9 rounded border border-border bg-surface px-3 outline-none focus:border-brand font-mono text-sm"
              />
              {timeInput && parsedHours > 0 && (
                <p className="mt-1 text-[11px] text-text-subtle">Parsed as {parsedHours}h</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-text mb-1">Date Started</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full h-9 rounded border border-border bg-surface px-3 outline-none focus:border-brand text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-text mb-1">Work Description / Activity</label>
              <textarea
                rows={2}
                value={worklogText}
                onChange={(e) => setWorklogText(e.target.value)}
                placeholder="Describe what work was performed..."
                className="w-full rounded border border-border bg-surface p-2.5 outline-none focus:border-brand text-xs"
              />
            </div>

            {/* Time Tracking Progress Indicator */}
            <div className="p-3 rounded-md bg-neutral border border-border flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-text-subtle">
                <span>Logged: {totalLogged.toFixed(1)}h</span>
                <span>Estimated: {estimatedHours}h</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                <div style={{ width: `${progressPercent}%` }} className="h-full bg-brand transition-all" />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button appearance="subtle" onClick={onClose} type="button" className="text-xs">
                Cancel
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={isSaving}
                className="bg-brand text-white text-xs font-bold disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Worklog"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

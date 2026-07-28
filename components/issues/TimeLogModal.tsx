"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function parseTimeToHours(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  const daysMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*d/i);
  const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m(?!s)/i);
  const secsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*s/i);

  let total = 0;
  if (daysMatch) total += parseFloat(daysMatch[1]) * 8;
  if (hoursMatch) total += parseFloat(hoursMatch[1]);
  if (minsMatch) total += parseFloat(minsMatch[1]) / 60;
  if (secsMatch) total += parseFloat(secsMatch[1]) / 3600;

  if (!daysMatch && !hoursMatch && !minsMatch && !secsMatch) {
    const val = parseFloat(trimmed);
    if (!isNaN(val)) total = val;
  }

  return Math.round(total * 10000) / 10000;
}

export function formatHoursToReadable(totalHours: number): string {
  if (totalHours <= 0) return "0h";

  const totalSeconds = Math.round(totalHours * 3600);
  const days = Math.floor(totalSeconds / (8 * 3600));
  const remSecsAfterDays = totalSeconds % (8 * 3600);
  const hours = Math.floor(remSecsAfterDays / 3600);
  const minutes = Math.floor((remSecsAfterDays % 3600) / 60);
  const seconds = remSecsAfterDays % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.length > 0 ? parts.join(" ") : "0h";
}

export function TimeLogModal({
  isOpen,
  onClose,
  issueKey,
  issueSummary = "",
  currentLoggedHours = 0,
  estimatedHours = 0,
  onLogTime,
  onUpdateEstimate,
}: {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string;
  issueSummary?: string;
  currentLoggedHours?: number;
  estimatedHours?: number;
  onLogTime: (hours: number, description: string, startedAt: string) => Promise<string | null>;
  onUpdateEstimate?: (hours: number) => Promise<void>;
}) {
  const [timeInput, setTimeInput] = useState("");
  const [worklogText, setWorklogText] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [estimateInput, setEstimateInput] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeInput("");
      setWorklogText("");
      setLogDate(new Date().toISOString().split("T")[0]);
      setEstimateInput(estimatedHours > 0 ? String(estimatedHours) : "");
      setSaved(false);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, estimatedHours]);

  if (!isOpen) return null;

  const parsedHours = parseTimeToHours(timeInput);
  const currentEstimate = estimateInput !== "" ? parseFloat(estimateInput) || 0 : estimatedHours;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (parsedHours <= 0) {
      setError("Enter a valid duration, e.g. 1h 30m 45s, 2h, 45m, or 30s.");
      return;
    }

    setError(null);
    setIsSaving(true);
    const failure = await onLogTime(parsedHours, worklogText, logDate);

    if (failure) {
      setIsSaving(false);
      setError(failure);
      return;
    }

    if (onUpdateEstimate && estimateInput !== "" && parseFloat(estimateInput) !== estimatedHours) {
      const parsedEst = parseFloat(estimateInput);
      if (!isNaN(parsedEst) && parsedEst >= 0) {
        await onUpdateEstimate(parsedEst);
      }
    }

    setIsSaving(false);
    setSaved(true);
    setTimeout(onClose, 900);
  };

  const totalLogged = currentLoggedHours + parsedHours;
  const progressPercent =
    currentEstimate > 0 ? Math.min(100, Math.round((totalLogged / currentEstimate) * 100)) : 0;

  const quickPresets = ["15m", "30m", "1h", "2h 30m", "45s"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-brand" />
          <h3 className="text-base font-bold text-text">Log Time for {issueKey}</h3>
        </div>
        {issueSummary && <p className="text-xs text-text-subtle mb-4 truncate">{issueSummary}</p>}

        {saved ? (
          <div className="py-6 text-center flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-emerald-500" />
            <h4 className="text-sm font-bold text-text">Time Logged Successfully!</h4>
            <p className="text-xs text-text-subtle">
              Updated total logged time: {formatHoursToReadable(totalLogged)} ({totalLogged.toFixed(2)}h)
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block font-bold text-text mb-1">
                Time Spent * <span className="font-normal text-text-subtle text-[11px]">(e.g. 1h 30m 45s, 2h, 45m, 30s)</span>
              </label>
              <input
                autoFocus
                required
                type="text"
                value={timeInput}
                onChange={(e) => {
                  setTimeInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 1h 30m 45s or 45m"
                className="w-full h-9 rounded border border-border bg-surface px-3 outline-none focus:border-brand font-mono text-sm"
              />

              {/* Quick preset chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-text-subtle font-semibold">Quick add:</span>
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTimeInput((prev) => (prev ? `${prev} ${preset}` : preset));
                      if (error) setError(null);
                    }}
                    className="px-2 py-0.5 rounded border border-border bg-neutral/80 hover:bg-neutral text-[11px] font-mono text-text-subtle hover:text-text transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              {timeInput && parsedHours > 0 && (
                <div className="mt-2 p-2 rounded bg-brand/5 border border-brand/20 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-brand">Duration parsed:</span>
                  <span className="font-mono font-bold text-text">
                    {formatHoursToReadable(parsedHours)} ({parsedHours.toFixed(3)} hrs)
                  </span>
                </div>
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
              <label className="block font-bold text-text mb-1">Estimated Time (hours)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                placeholder="e.g. 8"
                className="w-full h-9 rounded border border-border bg-surface px-3 outline-none focus:border-brand font-mono text-xs"
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
                <span>Logged: {formatHoursToReadable(totalLogged)} ({totalLogged.toFixed(1)}h)</span>
                <span>Estimated: {currentEstimate > 0 ? `${formatHoursToReadable(currentEstimate)} (${currentEstimate.toFixed(1)}h)` : "Not set"}</span>
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
                {isSaving ? "Saving..." : "Save Time Log"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

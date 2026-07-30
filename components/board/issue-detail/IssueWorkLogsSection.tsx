import { Clock, Plus, Loader2 } from "lucide-react";
import { formatHoursToReadable } from "@/components/issues/TimeLogModal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

interface IssueWorkLogsSectionProps {
  loggedHours: number;
  estimateHours: number | string;
  workLogsList: any[];
  isLoading?: boolean;
  onEstimateChange: (val: number | string) => void;
  onEstimateBlur: () => void;
  onLogWorkClick: () => void;
}

export function IssueWorkLogsSection({
  loggedHours,
  estimateHours,
  workLogsList,
  isLoading = false,
  onEstimateChange,
  onEstimateBlur,
  onLogWorkClick,
}: IssueWorkLogsSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-xl bg-neutral/30 border border-border flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between text-xs font-semibold flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Total Logged:{" "}
              <strong className="text-brand font-bold">{formatHoursToReadable(loggedHours)} ({loggedHours.toFixed(1)}h)</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-subtle font-medium">Estimated (h):</span>
              <input
                type="number"
                value={estimateHours}
                onChange={(e) => onEstimateChange(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={onEstimateBlur}
                placeholder="None"
                min={0}
                step={0.5}
                className="h-10 sm:h-7 w-20 px-2 text-right text-xs font-mono font-bold rounded border border-border bg-surface text-text outline-none focus:border-brand"
              />
            </div>
          </div>

          <Button
            appearance="primary"
            type="button"
            onClick={onLogWorkClick}
            className="bg-brand text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <Plus size={12} /> Log work
          </Button>
        </div>

        {(Number(estimateHours) > 0 || loggedHours > 0) && (
          <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
            {(() => {
              const estNum = Number(estimateHours);
              const pct =
                estNum > 0
                  ? Math.min(100, Math.round((loggedHours / estNum) * 100))
                  : loggedHours > 0
                  ? 100
                  : 0;
              const barColor =
                estNum > 0 && loggedHours >= estNum
                  ? "bg-red-400"
                  : loggedHours > 0
                  ? estNum > 0
                    ? "bg-brand"
                    : "bg-zinc-300 dark:bg-zinc-600"
                  : "";
              return (
                <>
                  <div className="flex justify-between text-[10px] text-text-subtle font-medium">
                    <span>Worklog Progress ({pct}%)</span>
                    <span>
                      {formatHoursToReadable(loggedHours)}{" "}
                      {estNum > 0 ? `of ${formatHoursToReadable(estNum)}` : ""}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className={`h-full transition-all duration-500 ${barColor}`} />
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 divide-y divide-border/40">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-text-subtle animate-pulse">
            <Loader2 size={14} className="animate-spin text-brand" />
            <span>Loading work logs…</span>
          </div>
        ) : workLogsList.length === 0 ? (
          <p className="text-xs text-text-subtle italic py-2">No work logged yet.</p>
        ) : (
          workLogsList.map((w) => (
            <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Avatar name={w.author?.name || "User"} src={w.author?.avatarUrl} size={24} />
                <div>
                  <p className="font-bold text-text">{w.author?.name || "User"}</p>
                  {w.description && <p className="text-text-subtle text-[11px]">{w.description}</p>}
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-brand">{formatHoursToReadable(Number(w.hours))}</span>
                <p className="text-[10px] text-text-subtle">
                  {typeof w.startedAt === "string" ? w.startedAt.split("T")[0] : "Logged"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

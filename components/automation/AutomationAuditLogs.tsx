"use client";

import { useState } from "react";
import { Activity, RotateCw, CheckCircle2, XCircle, Clock, Search, ChevronRight } from "lucide-react";
import type { AutomationExecutionLogItem } from "@/lib/automation";

export function AutomationAuditLogs({
  logs: initialLogs,
}: {
  logs: AutomationExecutionLogItem[];
}) {
  const [logs, setLogs] = useState<AutomationExecutionLogItem[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AutomationExecutionLogItem | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  const filteredLogs = logs.filter(
    (l) =>
      l.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRerun = (log: AutomationExecutionLogItem) => {
    setRerunningId(log.id);
    setTimeout(() => {
      const rerunLog: AutomationExecutionLogItem = {
        id: `rerun-${Date.now()}`,
        ruleId: log.ruleId,
        ruleName: `${log.ruleName} (Manual Rerun)`,
        trigger: log.trigger,
        action: log.action,
        status: "SUCCESS",
        latencyMs: Math.floor(Math.random() * 30) + 15,
        details: `Rerun trigger successfully dispatched. Payload verified.`,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [rerunLog, ...prev]);
      setRerunningId(null);
    }, 600);
  };

  const getLatencyBadge = (ms: number) => {
    if (ms < 50) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          ⚡ {ms}ms
        </span>
      );
    }
    if (ms < 200) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          ⏱️ {ms}ms
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
        🐢 {ms}ms
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            placeholder="Search execution logs by rule name, trigger, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-text-subtle font-medium">
          <Activity size={14} className="text-brand" />
          <span>Real-time Audit Stream</span>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="grid grid-cols-12 gap-2 p-3 border-b border-border bg-neutral/30 text-[11px] font-bold text-text-subtle uppercase tracking-wider">
          <div className="col-span-2">Status & Time</div>
          <div className="col-span-4">Rule Name</div>
          <div className="col-span-3">Trigger / Action</div>
          <div className="col-span-2">Latency</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-subtle">
              No matching execution logs found.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isRerunning = rerunningId === log.id;
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-2 p-3 items-center text-xs hover:bg-neutral/40 transition-colors"
                >
                  {/* Status & Time */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    {log.status === "SUCCESS" ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={15} className="text-rose-500 shrink-0" />
                    )}
                    <span className="text-[11px] text-text-subtle font-mono truncate">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  {/* Rule Name */}
                  <div className="col-span-4 font-bold text-text truncate flex items-center gap-1">
                    <span>{log.ruleName}</span>
                  </div>

                  {/* Trigger / Action */}
                  <div className="col-span-3 font-mono text-[11px] text-text-subtle truncate">
                    <span className="text-text font-semibold">{log.trigger}</span> ➔{" "}
                    <span className="text-brand">{log.action}</span>
                  </div>

                  {/* Latency */}
                  <div className="col-span-2 flex items-center gap-1">
                    {getLatencyBadge(log.latencyMs)}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleRerun(log)}
                      disabled={isRerunning}
                      title="Rerun rule execution"
                      className="p-1 rounded-md text-text-subtle hover:text-brand hover:bg-neutral/60 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw size={13} className={isRerunning ? "animate-spin text-brand" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      title="Inspect payload details"
                      className="p-1 rounded-md text-text-subtle hover:text-text hover:bg-neutral/60 transition-colors cursor-pointer"
                    >
                      <ChevronRight
                        size={13}
                        className={`transition-transform ${selectedLog?.id === log.id ? "rotate-90 text-brand" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Expanded Detail Drawer */}
                  {selectedLog?.id === log.id && (
                    <div className="col-span-12 mt-2 p-3 rounded-lg bg-surface-sunken border border-border/80 flex flex-col gap-2 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-subtle">
                        <span>Execution Details ID: {log.id}</span>
                        <span>Latency: {log.latencyMs}ms</span>
                      </div>
                      <p className="text-xs text-text font-medium bg-neutral/40 p-2 rounded border border-border/40 font-mono">
                        {log.details}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Clock, Video, FileText, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function IncidentCommandCenter({ issueKey }: { issueKey: string }) {
  const [seconds, setSeconds] = useState(2535); // ~42 mins active MTTR
  const [isResolved, setIsResolved] = useState(false);
  const [showPostMortem, setShowPostMortem] = useState(false);

  useEffect(() => {
    if (isResolved) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isResolved]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-xs animate-fade-in">
      {/* Opsgenie Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-rose-500/20 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShieldAlert className="text-rose-500" size={20} />
            {!isResolved && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-rose-600">Opsgenie P1 Outage Incident</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                {isResolved ? "RESOLVED" : "ACTIVE OUTAGE"}
              </span>
            </div>
            <p className="text-[11px] text-text-subtle mt-0.5">
              Live Opsgenie / PagerDuty incident escalation bridge for {issueKey}
            </p>
          </div>
        </div>

        {/* Live MTTR Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-rose-500/30 shadow-2xs font-mono text-xs font-bold text-rose-600">
          <Clock size={14} className={!isResolved ? "animate-pulse text-rose-500" : ""} />
          <span>MTTR: {formatTimer(seconds)}</span>
        </div>
      </div>

      {/* Incident Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Join War Room Video Bridge */}
        <a
          href="https://meet.jit.si/trackly-incident-warroom"
          target="_blank"
          rel="noreferrer"
          className="p-3 rounded-xl border border-border bg-surface hover:border-brand/50 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10 text-brand group-hover:scale-110 transition-transform">
              <Video size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text">Join Incident War Room</span>
              <span className="text-[10px] text-text-subtle">Live audio/video bridge</span>
            </div>
          </div>
          <span className="text-xs text-brand font-bold">Join →</span>
        </a>

        {/* Mark Resolved & Generate Post-Mortem */}
        <button
          type="button"
          onClick={() => {
            setIsResolved(true);
            setShowPostMortem(true);
          }}
          className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold">{isResolved ? "Incident Resolved" : "Resolve Incident"}</span>
              <span className="text-[10px] opacity-80">Stop timer & auto-generate Post-Mortem</span>
            </div>
          </div>
          <span className="text-xs font-bold">Resolve ✓</span>
        </button>
      </div>

      {/* Auto-Generated Post-Mortem Box */}
      {showPostMortem && (
        <div className="mt-2 p-3.5 rounded-xl bg-surface border border-border flex flex-col gap-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-text">
            <span className="flex items-center gap-1 text-brand">
              <Sparkles size={14} /> AI Incident Post-Mortem Report
            </span>
            <span className="text-[10px] font-mono text-text-subtle">MTTR: {formatTimer(seconds)}</span>
          </div>

          <div className="text-[11px] font-mono text-text-subtle bg-neutral/30 p-3 rounded-lg border border-border/50 leading-relaxed">
            <p className="font-bold text-text"># Incident Post-Mortem ({issueKey})</p>
            <p className="mt-1">**Root Cause**: Memory leak in Redis connection pool under peak load.</p>
            <p>**Resolution**: Applied connection pool recycling patch via PR #44.</p>
            <p>**Preventative Action**: Configured max memory bounds in docker container setup.</p>
          </div>
        </div>
      )}
    </div>
  );
}

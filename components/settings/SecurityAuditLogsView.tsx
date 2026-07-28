"use client";

import { useState } from "react";
import { Activity, Download, Search, ShieldCheck, Key, Users, Sliders, Database, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type AuditLogRecord = {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail: string;
  category: "AUTH" | "PERMISSIONS" | "INTEGRATIONS" | "DATA";
  action: string;
  target: string;
  ip: string;
};

/**
 * Renders REAL recorded events only.
 *
 * This component used to ship five hardcoded audit records attributed to a real
 * named person, their real email address, and IP 192.168.1.45 — complete with a
 * working CSV export. An admin investigating "who generated a PAT" would read
 * invented events and could export them as evidence. Fabricated security
 * records are worse than an empty log, so the fallback is now an honest empty
 * state and the caller supplies whatever the database actually holds.
 */
export function SecurityAuditLogsView({ logs = [] }: { logs?: AuditLogRecord[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = selectedCategory === "ALL" || log.category === selectedCategory;
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Actor", "Email", "Category", "Action", "Target", "IP Address"];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.actorEmail}"`,
      `"${l.category}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.ip}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackly_security_audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-default">Security Audit Log Stream</h2>
          <p className="text-xs text-subtle">Real-time immutable ledger of workspace security events, permissions, and administrative changes</p>
        </div>
        <Button appearance="subtle" onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-semibold">
          <Download size={14} className="text-subtle" />
          Export Audit CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral/30 border border-border-default">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search size={14} className="text-subtle shrink-0" />
          <input
            type="text"
            placeholder="Search audit actions, targets, or actors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-default outline-none placeholder:text-subtlest"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", "AUTH", "PERMISSIONS", "INTEGRATIONS", "DATA"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand text-white shadow-2xs"
                  : "text-subtle hover:text-default hover:bg-neutral"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Stream Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-bold text-subtle">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Category</th>
              <th className="p-3">Action & Target</th>
              <th className="p-3 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-xs text-subtle italic">
                  {logs.length === 0
                    ? "No audit events recorded yet."
                    : "No audit events match your filter."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral/30 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-subtle">{log.timestamp}</td>
                  <td className="p-3 font-bold text-default">
                    <div>
                      <span>{log.actor}</span>
                      <span className="block text-[10px] font-mono font-normal text-subtlest">{log.actorEmail}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.category === "AUTH"
                          ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                          : log.category === "PERMISSIONS"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : log.category === "INTEGRATIONS"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {log.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-default">{log.action}</div>
                    <div className="font-mono text-[11px] text-subtle">{log.target}</div>
                  </td>
                  <td className="p-3 text-right font-mono text-[11px] text-subtler">{log.ip}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

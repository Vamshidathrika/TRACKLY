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

export function SecurityAuditLogsView() {
  const [logs] = useState<AuditLogRecord[]>([
    { id: "audit-1", timestamp: "2026-07-25 23:58:12", actor: "Vamshi Dathrika", actorEmail: "vamshi@uskcorp.com", category: "AUTH", action: "Generated Personal Access Token", target: "PAT: GitHub Actions CI Runner", ip: "192.168.1.45" },
    { id: "audit-2", timestamp: "2026-07-25 23:42:54", actor: "Vamshi Dathrika", actorEmail: "vamshi@uskcorp.com", category: "PERMISSIONS", action: "Updated Workspace Settings", target: "SettingsNav & Route Redirects", ip: "192.168.1.45" },
    { id: "audit-3", timestamp: "2026-07-25 23:28:49", actor: "Vamshi Dathrika", actorEmail: "vamshi@uskcorp.com", category: "INTEGRATIONS", action: "Updated Automation Engine Rules", target: "No-Code Jira Rules Suite", ip: "192.168.1.45" },
    { id: "audit-4", timestamp: "2026-07-25 23:14:14", actor: "Vamshi Dathrika", actorEmail: "vamshi@uskcorp.com", category: "DATA", action: "Exported Full Workspace Backup", target: "trackly_workspace_backup.json", ip: "192.168.1.45" },
    { id: "audit-5", timestamp: "2026-07-25 22:45:00", actor: "System Agent", actorEmail: "system@trackly.dev", category: "AUTH", action: "OAuth Token Refresh", target: "GitHub Integration App", ip: "10.0.4.12" },
  ]);

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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
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
                  No security audit log records match your filter.
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

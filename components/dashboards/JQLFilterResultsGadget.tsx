"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Search, ArrowUpRight } from "lucide-react";
import { Tag } from "@/components/ui/Tag";

type SavedFilter = {
  id: string;
  name: string;
  jql: string;
  issues: { key: string; summary: string; priority: string; status: string }[];
};

export function JQLFilterResultsGadget() {
  const [selectedFilterId, setSelectedFilterId] = useState("f1");

  const filters: SavedFilter[] = [
    {
      id: "f1",
      name: "Highest Priority Blockers",
      jql: 'priority = Highest AND status != "Done"',
      issues: [
        { key: "TRK-14", summary: "OAuth Provider Handshake Timeout", priority: "Highest", status: "In Review" },
        { key: "MOB-3", summary: "iOS Crash on Launch in Dark Mode", priority: "Highest", status: "In Progress" },
        { key: "TRK-29", summary: "Prisma Connection Pool Leak", priority: "Highest", status: "Backlog" },
      ],
    },
    {
      id: "f2",
      name: "My Active Work Items",
      jql: 'assignee = currentUser() AND status = "In Progress"',
      issues: [
        { key: "TRK-45", summary: "Jira Dashboard UI/UX Superpowers", priority: "High", status: "In Progress" },
        { key: "TRK-32", summary: "Webhooks Dispatcher Retry Logic", priority: "Medium", status: "In Progress" },
      ],
    },
  ];

  const currentFilter = filters.find((f) => f.id === selectedFilterId) || filters[0];

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={17} className="text-brand" />
          <h3 className="text-sm font-bold text-default">Saved JQL Filter Query Results</h3>
        </div>

        <select
          value={selectedFilterId}
          onChange={(e) => setSelectedFilterId(e.target.value)}
          className="h-7 rounded-lg border border-border-default bg-surface px-2 text-xs font-bold text-default outline-none focus:border-brand cursor-pointer"
        >
          {filters.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* JQL Query Banner */}
      <div className="p-2.5 rounded-lg bg-neutral/50 border border-border-default font-mono text-[11px] text-brand font-bold flex items-center justify-between">
        <span>jql &gt; {currentFilter.jql}</span>
        <Link href={`/filters/search?jql=${encodeURIComponent(currentFilter.jql)}`} className="hover:underline flex items-center gap-1">
          <span>View All ({currentFilter.issues.length})</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Embedded Issue Table */}
      <div className="rounded-lg border border-border-default bg-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-bold text-subtle">
              <th className="p-2.5">Key</th>
              <th className="p-2.5">Summary</th>
              <th className="p-2.5">Priority</th>
              <th className="p-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {currentFilter.issues.map((i) => (
              <tr key={i.key} className="hover:bg-neutral/30 transition-colors">
                <td className="p-2.5 font-mono font-bold text-brand">
                  <Link href={`/projects/${i.key.split("-")[0]}/issues/${i.key}`} className="hover:underline">
                    {i.key}
                  </Link>
                </td>
                <td className="p-2.5 font-semibold text-default truncate max-w-[200px]">{i.summary}</td>
                <td className="p-2.5">
                  <Tag color={i.priority === "Highest" ? "red" : "purple"}>{i.priority}</Tag>
                </td>
                <td className="p-2.5 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    {i.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

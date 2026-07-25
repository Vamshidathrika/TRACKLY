"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Mail, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

type NotificationRule = {
  id: string;
  event: string;
  description: string;
  assignee: boolean;
  reporter: boolean;
  projectLead: boolean;
  watchers: boolean;
};

export function NotificationSchemesView() {
  const [rules, setRules] = useState<NotificationRule[]>([
    { id: "nr-1", event: "Issue Created", description: "Triggered when a new task or bug is filed", assignee: true, reporter: true, projectLead: true, watchers: false },
    { id: "nr-2", event: "Issue Assigned", description: "Triggered when assignee ownership changes", assignee: true, reporter: true, projectLead: false, watchers: true },
    { id: "nr-3", event: "Status Transitioned", description: "Triggered when board status changes (e.g. Code Review ➔ Done)", assignee: true, reporter: true, projectLead: true, watchers: true },
    { id: "nr-4", event: "Comment Added", description: "Triggered when team members reply or mention a user", assignee: true, reporter: true, projectLead: false, watchers: true },
    { id: "nr-5", event: "Sprint Started / Completed", description: "Triggered when a sprint is launched or closed", assignee: false, reporter: false, projectLead: true, watchers: true },
    { id: "nr-6", event: "Release Version Deployed", description: "Triggered when release notes & tags are published", assignee: true, reporter: true, projectLead: true, watchers: true },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleRecipient = (id: string, role: "assignee" | "reporter" | "projectLead" | "watchers") => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [role]: !r[role] } : r))
    );
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-default">Notification Scheme Event Matrix</h2>
          <p className="text-xs text-subtle">Configure automatic email, web, and Slack notification dispatch rules for workspace events</p>
        </div>
        <Button appearance="primary" onClick={handleSave} className="flex items-center gap-1.5 text-xs">
          <Bell size={15} />
          Save Scheme Rules
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> Notification scheme matrix updated successfully!
        </div>
      )}

      {/* Event Matrix Table */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default bg-neutral/40 font-bold text-subtle">
              <th className="p-3">Event Trigger & Description</th>
              <th className="p-3 text-center">Assignee</th>
              <th className="p-3 text-center">Reporter</th>
              <th className="p-3 text-center">Project Lead</th>
              <th className="p-3 text-center">Watchers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-neutral/30 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-default">{r.event}</div>
                  <div className="text-subtle text-[11px]">{r.description}</div>
                </td>
                {(["assignee", "reporter", "projectLead", "watchers"] as const).map((recipient) => (
                  <td key={recipient} className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={r[recipient]}
                      onChange={() => toggleRecipient(r.id, recipient)}
                      className="h-4 w-4 accent-brand cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

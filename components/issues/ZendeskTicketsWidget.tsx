"use client";

import { useState } from "react";
import { Headphones, ExternalLink, Plus, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { LinkedZendeskTicket } from "@/lib/integrations/types";

export function ZendeskTicketsWidget({
  initialTickets = [
    {
      id: "zd-1",
      ticketNumber: 1042,
      subject: "Payment Gateway 500 error during enterprise plan checkout",
      status: "SOLVED",
      priority: "URGENT",
      customerEmail: "acme_admin@stripe.com",
      customerName: "Sarah Connor",
      zendeskUrl: "https://support.zendesk.com/agent/tickets/1042",
      updatedAt: "2 hours ago",
    },
    {
      id: "zd-2",
      ticketNumber: 1089,
      subject: "Webhook delivery retry limit reached on custom endpoint",
      status: "PENDING",
      priority: "HIGH",
      customerEmail: "dev_lead@corp.io",
      customerName: "Alex Vance",
      zendeskUrl: "https://support.zendesk.com/agent/tickets/1089",
      updatedAt: "1 day ago",
    },
  ],
}: {
  initialTickets?: LinkedZendeskTicket[];
}) {
  const [tickets, setTickets] = useState<LinkedZendeskTicket[]>(initialTickets);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputTicketNum, setInputTicketNum] = useState("");
  const [inputSubject, setInputSubject] = useState("");

  const handleLinkTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTicketNum.trim() || !inputSubject.trim()) return;

    const newNum = parseInt(inputTicketNum.trim(), 10) || Math.floor(1000 + Math.random() * 9000);
    const newTicket: LinkedZendeskTicket = {
      id: `zd-${Date.now()}`,
      ticketNumber: newNum,
      subject: inputSubject.trim(),
      status: "OPEN",
      priority: "HIGH",
      customerEmail: "customer@company.com",
      zendeskUrl: `https://support.zendesk.com/agent/tickets/${newNum}`,
      updatedAt: "Just now",
    };

    setTickets([newTicket, ...tickets]);
    setInputTicketNum("");
    setInputSubject("");
    setShowAddModal(false);
  };

  const handleRemove = (id: string) => {
    setTickets(tickets.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-neutral/20 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Headphones size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs">Zendesk Customer Support Tickets</h4>
            <p className="text-[11px] text-text-subtle">
              Linked helpdesk tickets automatically synced with this engineering task.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-2.5 py-1 rounded-lg bg-neutral hover:bg-neutral/80 text-text font-bold text-[11px] border border-border flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} />
          <span>Link Ticket</span>
        </button>
      </div>

      {/* Ticket List */}
      <div className="flex flex-col gap-2">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="flex flex-col gap-2 p-2.5 rounded-lg border border-border bg-surface shadow-2xs text-xs hover:border-brand/30 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                #ZD-{t.ticketNumber}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                    t.status === "SOLVED"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : t.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                  }`}
                >
                  {t.status}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemove(t.id)}
                  className="text-text-subtle hover:text-red-500 transition-colors p-0.5 rounded"
                  title="Unlink ticket"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <a
                href={t.zendeskUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-text hover:text-brand hover:underline text-[11px] leading-tight block truncate flex items-center gap-1"
              >
                <span className="truncate">{t.subject}</span>
                <ExternalLink size={10} className="shrink-0 text-text-subtle" />
              </a>
              <span className="text-[10px] text-text-subtle block truncate mt-0.5">
                {t.customerName ? `${t.customerName} (${t.customerEmail})` : t.customerEmail} · {t.updatedAt}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Link Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl flex flex-col gap-4">
            <h4 className="font-extrabold text-text text-sm">Link Zendesk Support Ticket</h4>

            <form onSubmit={handleLinkTicket} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Ticket Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1042"
                  value={inputTicketNum}
                  onChange={(e) => setInputTicketNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/20 text-text font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Ticket Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Customer bug description"
                  value={inputSubject}
                  onChange={(e) => setInputSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/20 text-text focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border font-bold text-text text-xs hover:bg-neutral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700"
                >
                  Link Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

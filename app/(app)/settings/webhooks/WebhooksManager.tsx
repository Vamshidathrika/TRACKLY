"use client";

import { useState, useTransition } from "react";
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createWebhookAction,
  deleteWebhookAction,
  listWebhookDeliveriesAction,
  rotateWebhookSecretAction,
  sendTestWebhookAction,
  updateWebhookAction,
  type WebhookEndpointSummary,
} from "./actions";
import { WEBHOOK_EVENTS } from "@/lib/api/schemas";

const EVENT_LABELS: Record<(typeof WEBHOOK_EVENTS)[number], string> = {
  "issue.created": "Issue created",
  "issue.updated": "Issue updated",
  "issue.commented": "Issue commented",
};

type Delivery = Awaited<ReturnType<typeof listWebhookDeliveriesAction>>[number];

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DELIVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    FAILED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    EXHAUSTED: "bg-danger/10 text-danger",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles[status] ?? "bg-neutral text-subtle"}`}>
      {status}
    </span>
  );
}

export function WebhooksManager({ initialEndpoints }: { initialEndpoints: WebhookEndpointSummary[] }) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ label: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await createWebhookAction({
        url: url.trim(),
        description: description.trim() || null,
        events: selectedEvents as (typeof WEBHOOK_EVENTS)[number][],
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setEndpoints((prev) => [res.endpoint, ...prev]);
      setRevealedSecret({ label: "New endpoint secret", secret: res.secret });
      setUrl("");
      setDescription("");
      setSelectedEvents([...WEBHOOK_EVENTS]);
      setShowCreate(false);
    });
  };

  const handleToggleEnabled = (endpoint: WebhookEndpointSummary) => {
    setBusyId(endpoint.id);
    startTransition(async () => {
      const res = await updateWebhookAction(endpoint.id, { enabled: !endpoint.enabled });
      setBusyId(null);
      if (res.success) {
        setEndpoints((prev) => prev.map((e) => (e.id === endpoint.id ? res.endpoint : e)));
      } else {
        setError(res.error);
      }
    });
  };

  const handleDelete = (endpointId: string) => {
    if (!confirm("Delete this webhook endpoint? This cannot be undone and stops all future deliveries immediately.")) {
      return;
    }
    setBusyId(endpointId);
    startTransition(async () => {
      const res = await deleteWebhookAction(endpointId);
      setBusyId(null);
      if (res.success) {
        setEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
      } else if (res.error) {
        setError(res.error);
      }
    });
  };

  const handleRotate = (endpointId: string) => {
    if (!confirm("Rotate this endpoint's secret? The old secret stops verifying immediately.")) return;
    setBusyId(endpointId);
    startTransition(async () => {
      const res = await rotateWebhookSecretAction(endpointId);
      setBusyId(null);
      if (res.success) {
        setRevealedSecret({ label: "Rotated secret", secret: res.secret });
      } else {
        setError(res.error);
      }
    });
  };

  const handleTest = (endpointId: string) => {
    setBusyId(endpointId);
    startTransition(async () => {
      const res = await sendTestWebhookAction(endpointId);
      setBusyId(null);
      setTestResult((prev) => ({
        ...prev,
        [endpointId]: res.success
          ? `Delivered (HTTP ${res.status})`
          : res.error ?? "Delivery failed.",
      }));
    });
  };

  const toggleExpanded = (endpointId: string) => {
    if (expandedId === endpointId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(endpointId);
    if (!deliveries[endpointId]) {
      startTransition(async () => {
        const rows = await listWebhookDeliveriesAction(endpointId);
        setDeliveries((prev) => ({ ...prev, [endpointId]: rows }));
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {revealedSecret && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle size={14} />
            {revealedSecret.label} — copy it now, it will not be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-surface border border-border-default px-3 py-2 text-[12px] font-mono">
              {revealedSecret.secret}
            </code>
            <Button appearance="default" onClick={copySecret} className="gap-1.5 shrink-0">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-[11px] text-subtle">
            Use this to verify the <code>X-Trackly-Signature</code> header: HMAC-SHA256 of{" "}
            <code>{"${timestamp}.${body}"}</code>, compared to <code>X-Trackly-Signature</code> with a
            constant-time comparison. Reject deliveries where <code>X-Trackly-Timestamp</code> is more than 5
            minutes old.
          </p>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="self-end text-[11px] text-subtle hover:text-default"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-subtle">
          Workspace admins only. A webhook secret can forge a signed event for anything downstream trusts.
        </p>
        <Button appearance="primary" onClick={() => setShowCreate((v) => !v)} className="gap-1.5">
          <Plus size={14} /> New Webhook
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border-default bg-surface p-4 flex flex-col gap-4 shadow-2xs">
          <Input
            label="Endpoint URL"
            placeholder="https://example.com/webhooks/trackly"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="-mt-2 text-[11px] text-subtle">
            Must be <code>https://</code>. Addresses on your private network, localhost, or cloud metadata
            endpoints are rejected.
          </p>
          <Input
            label="Description (optional)"
            placeholder="Zapier, internal CI, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-subtle">Events</span>
            <div className="grid grid-cols-1 gap-1.5">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-[12px] text-default cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-border-default"
                  />
                  {EVENT_LABELS[event]}
                  <code className="text-[10px] text-subtlest">{event}</code>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-danger font-medium">{error}</p>}

          <div className="flex items-center gap-2 justify-end">
            <Button appearance="subtle" onClick={() => setShowCreate(false)} className="gap-1">
              <X size={14} /> Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleCreate}
              disabled={isPending || !url.trim() || selectedEvents.length === 0}
            >
              {isPending ? "Creating…" : "Create Webhook"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-2xs">
        {endpoints.length === 0 ? (
          <div className="px-4 py-8 text-center text-subtle text-xs">
            <Webhook size={20} className="mx-auto mb-2 opacity-40" />
            No webhook endpoints yet.
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(endpoint.id)}
                    className="mt-0.5 text-subtlest hover:text-default shrink-0"
                    title="Show recent deliveries"
                  >
                    {expandedId === endpoint.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[12px] text-default truncate">{endpoint.url}</span>
                      {!endpoint.enabled && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral text-[10px] font-semibold text-subtle">
                          Disabled
                        </span>
                      )}
                      {endpoint.disabledReason && (
                        <span className="text-[10px] text-danger" title={endpoint.disabledReason}>
                          Auto-disabled
                        </span>
                      )}
                    </div>
                    {endpoint.description && (
                      <p className="text-[11px] text-subtle mt-0.5">{endpoint.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {endpoint.events.map((e) => (
                        <span key={e} className="px-1.5 py-0.5 rounded bg-neutral text-[10px] font-mono">
                          {e}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-subtlest mt-1.5">
                      Last success {formatDate(endpoint.lastSuccessAt)} · Last failure{" "}
                      {formatDate(endpoint.lastFailureAt)}
                    </p>
                    {testResult[endpoint.id] && (
                      <p className="text-[11px] text-subtle mt-1">{testResult[endpoint.id]}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(endpoint.id)}
                      disabled={busyId === endpoint.id}
                      className="p-1.5 rounded-lg text-subtlest hover:text-default hover:bg-neutral transition-all disabled:opacity-50"
                      title="Send test event"
                    >
                      <Send size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(endpoint)}
                      disabled={busyId === endpoint.id}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-subtlest hover:text-default hover:bg-neutral transition-all disabled:opacity-50"
                    >
                      {endpoint.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotate(endpoint.id)}
                      disabled={busyId === endpoint.id}
                      className="p-1.5 rounded-lg text-subtlest hover:text-default hover:bg-neutral transition-all disabled:opacity-50"
                      title="Rotate secret"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(endpoint.id)}
                      disabled={busyId === endpoint.id}
                      className="p-1.5 rounded-lg text-subtlest hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                      title="Delete endpoint"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {expandedId === endpoint.id && (
                  <div className="px-4 pb-3 pl-11">
                    <div className="rounded-lg border border-border-default overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-border-default bg-neutral/40 font-semibold text-subtle">
                            <th className="px-3 py-2">Event</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Attempt</th>
                            <th className="px-3 py-2">HTTP</th>
                            <th className="px-3 py-2">When</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                          {(deliveries[endpoint.id]?.length ?? 0) === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-center text-subtle">
                                No deliveries yet.
                              </td>
                            </tr>
                          ) : (
                            deliveries[endpoint.id]?.map((d) => (
                              <tr key={d.id}>
                                <td className="px-3 py-2 font-mono">{d.event}</td>
                                <td className="px-3 py-2">
                                  <StatusPill status={d.status} />
                                </td>
                                <td className="px-3 py-2 text-subtle">
                                  {d.attempt}/{d.maxAttempts}
                                </td>
                                <td className="px-3 py-2 text-subtle">{d.responseStatus ?? d.errorCode ?? "—"}</td>
                                <td className="px-3 py-2 text-subtle">{formatDate(d.deliveredAt ?? d.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

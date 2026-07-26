"use client";

import { useState } from "react";
import { Send, CheckCircle2, MessageSquare, Plus, Trash2, Bell, Zap, Copy, Check } from "lucide-react";
import type { WebhookNotificationRule } from "@/lib/integrations/types";

export function WebhookNotificationBuilder({ siteId }: { siteId: string }) {
  const [rules, setRules] = useState<WebhookNotificationRule[]>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(`trackly_webhook_rules_${siteId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      {
        id: "rule-1",
        platform: "SLACK",
        webhookUrl: "https://hooks.slack.com/services/T000/B000/XXXXXX",
        channelName: "#dev-alerts-live",
        botName: "Trackly Dispatcher Bot",
        enabledEvents: ["issue.created", "issue.status_changed", "sentry.auto_bug"],
      },
      {
        id: "rule-2",
        platform: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/12345/abcdef",
        channelName: "#product-releases",
        botName: "Release Bot",
        enabledEvents: ["issue.status_changed"],
      },
    ];
  });

  const [platform, setPlatform] = useState<"SLACK" | "DISCORD">("SLACK");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [botName, setBotName] = useState("");
  const [testSentId, setTestSentId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const saveRules = (next: WebhookNotificationRule[]) => {
    setRules(next);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(`trackly_webhook_rules_${siteId}`, JSON.stringify(next));
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    if (!webhookUrl.trim() || !channelName.trim()) return;

    if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
      setUrlError("Webhook URL must start with http:// or https://");
      return;
    }

    const newRule: WebhookNotificationRule = {
      id: `rule-${Date.now()}`,
      platform,
      webhookUrl: webhookUrl.trim(),
      channelName: channelName.startsWith("#") ? channelName.trim() : `#${channelName.trim()}`,
      botName: botName.trim() || "Trackly Bot",
      enabledEvents: ["issue.created", "issue.status_changed"],
    };

    const next = [newRule, ...rules];
    saveRules(next);
    setWebhookUrl("");
    setChannelName("");
    setBotName("");
  };

  const handleRemove = (id: string) => {
    const next = rules.filter((r) => r.id !== id);
    saveRules(next);
  };

  const handleTestPing = (id: string) => {
    setTestSentId(id);
    setTimeout(() => setTestSentId(null), 2500);
  };

  return (
    <div className="rounded-[20px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-brand" size={18} />
          <h3 className="text-sm font-extrabold text-text">
            Slack & Discord Channel Notification Dispatcher Builder
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-subtle">
          {rules.length} Active Dispatch Routes
        </span>
      </div>

      {urlError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600">
          ❌ {urlError}
        </div>
      )}

      {/* Add Webhook Route Form */}
      <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-neutral/20 p-4 rounded-xl border border-border">
        <div>
          <label className="block font-bold text-text mb-1">Target Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text font-bold focus:outline-none focus:border-brand"
          >
            <option value="SLACK">Slack Webhook</option>
            <option value="DISCORD">Discord Webhook</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-text mb-1">Webhook URL</label>
          <input
            type="url"
            required
            placeholder="https://hooks.slack.com/services/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text font-mono text-[11px] focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block font-bold text-text mb-1">Target Channel</label>
          <input
            type="text"
            required
            placeholder="e.g. #dev-alerts-live"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text font-mono text-[11px] focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-brand text-white font-extrabold hover:bg-brand-hovered transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Route</span>
          </button>
        </div>
      </form>

      {/* Active Rules List */}
      <div className="flex flex-col gap-2 pt-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface shadow-2xs gap-3 hover:border-brand/30 transition-all flex-wrap"
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full ${
                  rule.platform === "SLACK"
                    ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                    : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                }`}
              >
                ● {rule.platform}
              </span>
              <div>
                <h4 className="font-extrabold text-text flex items-center gap-2">
                  <span>{rule.channelName}</span>
                  <span className="text-[10px] font-normal text-text-subtle font-mono truncate max-w-xs">
                    {rule.webhookUrl}
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rule.enabledEvents.map((evt, eIdx) => (
                    <span
                      key={eIdx}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral text-text-subtle border border-border"
                    >
                      {evt}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestPing(rule.id)}
                className="px-3 py-1 rounded-lg border border-border bg-neutral/40 hover:bg-neutral text-[11px] font-bold text-text flex items-center gap-1 cursor-pointer transition-all"
              >
                {testSentId === rule.id ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span>Ping Sent!</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Test Ping</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleRemove(rule.id)}
                className="p-1 rounded text-text-subtle hover:text-red-500 transition-colors"
                title="Remove route"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

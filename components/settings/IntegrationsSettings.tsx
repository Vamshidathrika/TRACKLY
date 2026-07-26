"use client";

import { useState } from "react";
import {
  FolderGit2,
  GitPullRequest,
  GitBranch,
  AlertOctagon,
  Triangle,
  CheckCircle2,
  Zap,
  Shield,
  Key,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Flame,
  MessageSquare,
  Headphones,
  Video,
  LayoutGrid,
  Activity,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditRepoModal } from "@/components/dev/EditRepoModal";
import { WebhookNotificationBuilder } from "./WebhookNotificationBuilder";
import type { IntegrationProvider, IntegrationCategory } from "@/lib/integrations/types";

function FigmaIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
    </svg>
  );
}

type ProviderCard = {
  id: IntegrationProvider;
  name: string;
  category: IntegrationCategory;
  categoryName: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  status: "Active" | "Disconnected" | "Configured";
  badges: string[];
};

export function IntegrationsSettings({ siteId }: { siteId: string }) {
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [smartTransitions, setSmartTransitions] = useState(true);
  const [sentryAutoBug, setSentryAutoBug] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider>("GITHUB");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const providers: ProviderCard[] = [
    {
      id: "GITHUB",
      name: "GitHub",
      category: "DEVOPS",
      categoryName: "Code & Version Control",
      icon: FolderGit2,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      description: "Auto-link commit messages, branch names, and PRs using task keys (e.g. VAM-14).",
      status: "Active",
      badges: ["OAuth2 Active", "Smart PR Transitions"],
    },
    {
      id: "GITLAB",
      name: "GitLab",
      category: "DEVOPS",
      categoryName: "Self-Hosted & Cloud DevOps",
      icon: GitBranch,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      description: "Sync Merge Requests, pipeline build statuses, and branch auto-transitions.",
      status: "Configured",
      badges: ["Merge Requests", "CI/CD Sync"],
    },
    {
      id: "BITBUCKET",
      name: "Bitbucket",
      category: "DEVOPS",
      categoryName: "Atlassian DevOps Suite",
      icon: GitPullRequest,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      description: "Bitbucket Pull Request state sync and automated pipeline status badges.",
      status: "Configured",
      badges: ["Pipelines", "PR Approvals"],
    },
    {
      id: "VERCEL",
      name: "Vercel",
      category: "DEVOPS",
      categoryName: "Hosting & Frontend Cloud",
      icon: Triangle,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-500/10",
      description: "Render preview deployment status badges and direct preview links on Kanban cards.",
      status: "Active",
      badges: ["Deployment Badges", "Preview Links"],
    },
    {
      id: "SENTRY",
      name: "Sentry",
      category: "MONITORING",
      categoryName: "Crash & Error Monitoring",
      icon: AlertOctagon,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10",
      description: "Automatically create BUG tasks in Trackly from production exception webhooks.",
      status: "Active",
      badges: ["Auto-Bug Generator", "Stacktrace Parser"],
    },
    {
      id: "DATADOG",
      name: "Datadog",
      category: "MONITORING",
      categoryName: "APM & Infrastructure Metrics",
      icon: Activity,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      description: "Automatically convert Datadog APM monitor alerts into urgent Trackly incident tasks.",
      status: "Configured",
      badges: ["APM Incident Tasks", "Deduplication Key"],
    },
    {
      id: "SLACK",
      name: "Slack",
      category: "COMMUNICATION",
      categoryName: "Team Chat & Dispatcher",
      icon: MessageSquare,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      description: "Interactive message unfurling cards, slash commands, and 1-click task creation.",
      status: "Active",
      badges: ["Block Kit Unfurl", "Channel Dispatch"],
    },
    {
      id: "DISCORD",
      name: "Discord",
      category: "COMMUNICATION",
      categoryName: "Dev Community & Chat",
      icon: MessageSquare,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      description: "Channel notification webhooks and rich embed cards for task status changes.",
      status: "Configured",
      badges: ["Embed Cards", "Interaction Bot"],
    },
    {
      id: "ZENDESK",
      name: "Zendesk",
      category: "SUPPORT",
      categoryName: "Customer Support & Helpdesk",
      icon: Headphones,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      description: "Convert customer helpdesk tickets into engineering tasks with resolution sync.",
      status: "Active",
      badges: ["Customer Ticket Sync", "Resolution Notes"],
    },
    {
      id: "INTERCOM",
      name: "Intercom",
      category: "SUPPORT",
      categoryName: "Live Customer Messaging",
      icon: Headphones,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      description: "Link customer feedback conversations to feature requests and bug tasks.",
      status: "Configured",
      badges: ["User Feedback", "Conversation Sync"],
    },
    {
      id: "LOOM",
      name: "Loom",
      category: "MEDIA_WHITEBOARDS",
      categoryName: "Screen Recording & Video",
      icon: Video,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      description: "Attach Loom screen recordings to bug tasks for video reproduction steps.",
      status: "Active",
      badges: ["Video Bug Player", "Inline Embed"],
    },
    {
      id: "MIRO",
      name: "Miro",
      category: "MEDIA_WHITEBOARDS",
      categoryName: "Agile Retros & Whiteboards",
      icon: LayoutGrid,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      description: "Embed live interactive Miro whiteboard canvases directly inside task drawers.",
      status: "Active",
      badges: ["Canvas Embed", "Agile Retros"],
    },
    {
      id: "FIGMA",
      name: "Figma",
      category: "MEDIA_WHITEBOARDS",
      categoryName: "Design System & Canvas",
      icon: FigmaIcon,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-500/10",
      description: "Embed live interactive Figma canvas wireframes directly inside task drawers.",
      status: "Active",
      badges: ["Live Canvas Embed", "Prototype Inspect"],
    },
    {
      id: "ZAPIER",
      name: "Zapier & Make",
      category: "DEVOPS",
      categoryName: "Universal Automation Engine",
      icon: Layers,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      description: "Connect 5,000+ apps using custom outbound webhooks and automated event pings.",
      status: "Configured",
      badges: ["5,000+ App Triggers", "JSON Webhooks"],
    },
  ];

  const filteredProviders = providers.filter((p) => {
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const webhookUrl = `https://api.trackly.dev/v1/webhooks/${selectedProvider.toLowerCase()}?siteId=${siteId}`;
  const webhookSecret = `whsec_${selectedProvider.toLowerCase()}_live_89f7a6b5c4d3e2f1`;

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Toast Notice */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-bounce flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-text tracking-tight flex items-center gap-2">
            <Zap className="text-brand" size={20} />
            <span>Developer Ecosystem & Enterprise Integrations Hub</span>
          </h2>
          <p className="text-xs text-text-subtle mt-0.5">
            Connect developer tools, chat dispatchers, helpdesks, and live whiteboards across your workspace.
          </p>
        </div>

        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 14 integrations..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs">
        {[
          { id: "ALL", label: "All Apps (14)" },
          { id: "DEVOPS", label: "🛠️ DevOps & Cloud" },
          { id: "COMMUNICATION", label: "💬 Chat & Comm" },
          { id: "SUPPORT", label: "🎧 Customer Support" },
          { id: "MEDIA_WHITEBOARDS", label: "🎨 Media & Canvas" },
          { id: "MONITORING", label: "📊 Monitoring & Alerts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as IntegrationCategory)}
            className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === tab.id
                ? "bg-brand text-white shadow-xs"
                : "bg-surface text-text-subtle hover:text-text hover:bg-neutral border border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Marketplace Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((p) => {
          const Icon = p.icon;
          const isSelected = selectedProvider === p.id;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={`rounded-[20px] border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 ${
                isSelected
                  ? "border-brand bg-brand/5 shadow-md ring-1 ring-brand/30"
                  : "border-border bg-surface hover:border-brand/30 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl ${p.bgColor} ${p.color} flex items-center justify-center font-bold`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono ${
                      p.status === "Active"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    ● {p.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-text text-sm flex items-center gap-1.5">
                  {p.name}
                </h3>
                <span className="text-[10px] font-semibold text-text-subtle block mb-2">{p.categoryName}</span>
                <p className="text-xs text-text-subtle leading-relaxed">{p.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <div className="flex flex-wrap gap-1">
                  {p.badges.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-neutral text-text-subtle border border-border"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showToast(`${p.name} configuration active!`);
                  }}
                  className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                >
                  Manage →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhook & Credentials Drawer Card */}
      <div className="rounded-[20px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Key className="text-amber-500" size={18} />
            <h3 className="text-sm font-extrabold text-text">
              {selectedProvider} Dynamic Webhook Gateway
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-subtle">
            Endpoint: <code className="text-brand font-bold">/api/webhooks/{selectedProvider.toLowerCase()}</code>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-text mb-1">Webhook Target URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/30 text-text font-mono text-[11px] select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl)}
                className="px-3 py-2 rounded-lg bg-neutral hover:bg-neutral/80 text-text font-bold flex items-center gap-1 border border-border shrink-0 cursor-pointer"
              >
                {copiedKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedKey ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-text mb-1 flex items-center justify-between">
              <span>Webhook Signing Secret</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[10px] text-brand font-bold flex items-center gap-1 cursor-pointer"
              >
                {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showSecret ? "Hide Secret" : "Reveal Secret"}</span>
              </button>
            </label>
            <input
              type={showSecret ? "text" : "password"}
              readOnly
              value={webhookSecret}
              className="w-full px-3 py-2 rounded-lg border border-border bg-neutral/30 text-text font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Provider Specific Rules */}
        {selectedProvider === "SENTRY" && (
          <div className="mt-2 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="text-rose-500" size={16} />
                <h4 className="font-extrabold text-text text-xs">Sentry Auto-Bug Ticket Generator Rules</h4>
              </div>
              <input
                type="checkbox"
                checked={sentryAutoBug}
                onChange={(e) => setSentryAutoBug(e.target.checked)}
                className="h-4 w-4 accent-rose-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-text-subtle">
              When enabled, incoming Sentry exception webhooks automatically create a formatted <code className="text-rose-600 font-bold">BUG</code> task in Trackly with full stacktrace snippets.
            </p>
          </div>
        )}
      </div>

      {/* Webhook Notification Rules Dispatcher Builder */}
      <WebhookNotificationBuilder siteId={siteId} />

      {/* Personal Access Tokens (PAT) Developer Security Center */}
      <PersonalAccessTokensSection showToast={showToast} />

      {/* Workspace Project Board Mapping */}
      <div className="rounded-[16px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-text flex items-center gap-2">
          <FolderGit2 className="text-brand" size={18} />
          <span>Project Board Repository Isolation Matrix</span>
        </h3>

        <div className="flex flex-col divide-y divide-border text-xs">
          {[
            { id: "p1", name: "Main Product Board", key: "TRK", repo: "Vamshidathrika/TRACKLY", status: "Connected", branches: 4, prs: 2 },
            { id: "p2", name: "Mobile App Development", key: "MOB", repo: "Vamshidathrika/TRACKLY-MOBILE", status: "Connected", branches: 2, prs: 1 },
            { id: "p3", name: "Design System & Canvas", key: "DS", repo: "Unlinked", status: "Unlinked", branches: 0, prs: 0 },
          ].map((board) => (
            <div key={board.id} className="py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-brand/10 text-brand">
                  {board.key}
                </span>
                <div>
                  <h4 className="font-bold text-text">{board.name}</h4>
                  <span className="font-mono text-[11px] text-text-subtle">{board.repo}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {board.status === "Connected" ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    ● {board.branches} Branches · {board.prs} PRs
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Not Connected
                  </span>
                )}
                <EditRepoModal
                  repositoryId={`repo-${board.id}`}
                  initialOwner={board.repo !== "Unlinked" ? board.repo.split("/")[0] : ""}
                  initialRepoName={board.repo !== "Unlinked" ? board.repo.split("/")[1] : ""}
                  onSuccess={() => showToast(`Repository configuration updated for ${board.key}!`)}
                  trigger={
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full border border-border bg-neutral/40 hover:bg-neutral text-[11px] font-bold text-text cursor-pointer transition-all"
                    >
                      Configure
                    </button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonalAccessTokensSection({ showToast }: { showToast: (msg: string) => void }) {
  const [tokens, setTokens] = useState<
    { id: string; name: string; token: string; createdAt: string; expiry: string; status: "Active" | "Revoked" }[]
  >([
    {
      id: "pat-1",
      name: "GitHub Actions CI Runner",
      token: "trk_pat_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c",
      createdAt: "2026-07-20",
      expiry: "90 Days",
      status: "Active",
    },
  ]);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90d");
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!name.trim()) return;
    const rawToken = `trk_pat_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const newToken = {
      id: `pat-${Date.now()}`,
      name: name.trim(),
      token: rawToken,
      createdAt: new Date().toISOString().split("T")[0],
      expiry: expiry === "30d" ? "30 Days" : expiry === "90d" ? "90 Days" : expiry === "1y" ? "1 Year" : "Never",
      status: "Active" as const,
    };
    setTokens((prev) => [newToken, ...prev]);
    setNewlyCreatedToken(rawToken);
    setName("");
    showToast("Personal Access Token generated successfully!");
  };

  const handleRevoke = (id: string) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Revoked" } : t)));
    showToast("Personal Access Token revoked.");
  };

  const handleCopy = (str: string) => {
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Token copied to clipboard!");
  };

  return (
    <div className="rounded-[16px] border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-text flex items-center gap-2">
            <Key className="text-amber-500" size={18} />
            <span>Personal Access Tokens (PAT) & API Keys</span>
          </h3>
          <p className="text-xs text-text-subtle mt-0.5">
            Authenticate scripts, CI/CD runners, and custom tools with workspace-scoped API tokens.
          </p>
        </div>
      </div>

      {/* Generator Form */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-neutral/30 border border-border">
        <input
          type="text"
          placeholder="Token Description (e.g. Jenkins Deploy Bot)..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text outline-none focus:border-brand"
        />
        <select
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-text outline-none focus:border-brand cursor-pointer"
        >
          <option value="30d">Expires in 30 Days</option>
          <option value="90d">Expires in 90 Days</option>
          <option value="1y">Expires in 1 Year</option>
          <option value="never">Never Expire</option>
        </select>
        <Button appearance="primary" onClick={handleGenerate} disabled={!name.trim()} className="text-xs">
          <Key size={14} />
          Generate Token
        </Button>
      </div>

      {/* Newly Created Token Display */}
      {newlyCreatedToken && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="font-bold text-amber-600 dark:text-amber-400 block">
              Save your token now — it won&apos;t be shown again!
            </span>
            <code className="font-mono text-[11px] text-text font-bold truncate block mt-0.5">
              {newlyCreatedToken}
            </code>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(newlyCreatedToken)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs cursor-pointer hover:bg-amber-600 transition-all shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Token"}</span>
          </button>
        </div>
      )}

      {/* Active Tokens List */}
      <div className="flex flex-col divide-y divide-border text-xs">
        {tokens.map((t) => (
          <div key={t.id} className="py-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-text">{t.name}</h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-neutral text-text-subtle border border-border"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="font-mono text-[11px] text-text-subtle mt-0.5">
                {t.token.slice(0, 16)}•••••••••••••••• · Created {t.createdAt} ({t.expiry})
              </p>
            </div>
            {t.status === "Active" && (
              <button
                type="button"
                onClick={() => handleRevoke(t.id)}
                className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


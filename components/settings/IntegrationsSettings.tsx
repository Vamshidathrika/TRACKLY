"use client";

import { useState, useEffect, useTransition } from "react";
import {
  FolderGit2, GitPullRequest, GitBranch, AlertOctagon, Triangle,
  CheckCircle2, Zap, Shield, Key, Copy, Check, Eye, EyeOff,
  ExternalLink, Plus, Flame, MessageSquare, Headphones, Video,
  LayoutGrid, Activity, Layers, Search, X, Loader2, Wifi, WifiOff,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditRepoModal } from "@/components/dev/EditRepoModal";
import { WebhookNotificationBuilder } from "./WebhookNotificationBuilder";
import {
  saveApiKeyIntegration,
  disconnectIntegration,
  testIntegrationConnection,
  generateWebhookSecret,
} from "@/lib/integrations/actions";
import type { IntegrationProvider, IntegrationCategory, IntegrationConnection } from "@/lib/integrations/types";

// ─────────────────────────────────────────────────────────────────
// Figma SVG Icon
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// Provider definitions
// ─────────────────────────────────────────────────────────────────
type ConnectType = "OAUTH" | "APIKEY" | "WEBHOOK_ONLY";

type ProviderDef = {
  id: IntegrationProvider;
  name: string;
  category: IntegrationCategory;
  categoryName: string;
  icon: React.ElementType | ((props: { className?: string }) => React.ReactElement);
  color: string;
  bgColor: string;
  description: string;
  badges: string[];
  connectType: ConnectType;
  oauthPath?: string;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  apiKeyHint?: string;
  webhookNote?: string;
  docsUrl: string;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: "GITHUB", name: "GitHub", category: "DEVOPS", categoryName: "Code & Version Control",
    icon: FolderGit2, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10",
    description: "Auto-link commit messages, branch names, and PRs using task keys (e.g. VAM-14).",
    badges: ["Personal Access Token", "Smart PR Transitions"], connectType: "APIKEY",
    apiKeyLabel: "GitHub Personal Access Token (PAT)", apiKeyPlaceholder: "ghp_... or github_pat_...",
    apiKeyHint: "Create at github.com → Settings → Developer Settings → Personal Access Tokens (repo & read:org scopes)",
    docsUrl: "https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
  },
  {
    id: "GITLAB", name: "GitLab", category: "DEVOPS", categoryName: "Self-Hosted & Cloud DevOps",
    icon: GitBranch, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10",
    description: "Sync Merge Requests, pipeline build statuses, and branch auto-transitions.",
    badges: ["Merge Requests", "CI/CD Sync"], connectType: "APIKEY",
    apiKeyLabel: "GitLab Personal Access Token", apiKeyPlaceholder: "glpat-...",
    apiKeyHint: "Create at gitlab.com → Profile → Access Tokens (api & read_user scopes)",
    docsUrl: "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html",
  },
  {
    id: "BITBUCKET", name: "Bitbucket", category: "DEVOPS", categoryName: "Atlassian DevOps Suite",
    icon: GitPullRequest, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10",
    description: "Bitbucket Pull Request state sync and automated pipeline status badges.",
    badges: ["Pipelines", "PR Approvals"], connectType: "APIKEY",
    apiKeyLabel: "Bitbucket Access Token / App Password", apiKeyPlaceholder: "AT...",
    apiKeyHint: "Create at bitbucket.org → Personal Settings → App Passwords",
    docsUrl: "https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/",
  },
  {
    id: "VERCEL", name: "Vercel", category: "DEVOPS", categoryName: "Hosting & Frontend Cloud",
    icon: Triangle, color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-500/10",
    description: "Render preview deployment status badges and direct preview links on Kanban cards.",
    badges: ["Deployment Badges", "Preview Links"], connectType: "APIKEY",
    apiKeyLabel: "Vercel API Token", apiKeyPlaceholder: "vc_...",
    apiKeyHint: "Create at vercel.com → Account Settings → Tokens",
    docsUrl: "https://vercel.com/docs/rest-api",
  },
  {
    id: "SENTRY", name: "Sentry", category: "MONITORING", categoryName: "Crash & Error Monitoring",
    icon: AlertOctagon, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10",
    description: "Automatically create BUG tasks in Trackly from production exception webhooks.",
    badges: ["Auto-Bug Generator", "Stacktrace Parser"], connectType: "APIKEY",
    apiKeyLabel: "Sentry Auth Token", apiKeyPlaceholder: "sntryu_...",
    apiKeyHint: "Create at sentry.io → Settings → Auth Tokens",
    docsUrl: "https://docs.sentry.io/product/integrations/",
  },
  {
    id: "DATADOG", name: "Datadog", category: "MONITORING", categoryName: "APM & Infrastructure",
    icon: Activity, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10",
    description: "Convert Datadog APM monitor alerts into urgent Trackly incident tasks.",
    badges: ["APM Incident Tasks", "Deduplication"], connectType: "APIKEY",
    apiKeyLabel: "API Key || App Key", apiKeyPlaceholder: "apikey||appkey",
    apiKeyHint: "Format: <DD_API_KEY>||<DD_APP_KEY> — both from Datadog Organization Settings",
    docsUrl: "https://docs.datadoghq.com/api/",
  },
  {
    id: "SLACK", name: "Slack", category: "COMMUNICATION", categoryName: "Team Chat & Dispatcher",
    icon: MessageSquare, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10",
    description: "Interactive message unfurling cards, slash commands, and 1-click task creation.",
    badges: ["Bot Token", "Channel Dispatch"], connectType: "APIKEY",
    apiKeyLabel: "Slack Bot User OAuth Token", apiKeyPlaceholder: "xoxb-...",
    apiKeyHint: "Create at api.slack.com/apps → OAuth & Permissions (xoxb- token)",
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
  },
  {
    id: "DISCORD", name: "Discord", category: "COMMUNICATION", categoryName: "Dev Community & Chat",
    icon: MessageSquare, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-500/10",
    description: "Channel notification webhooks and rich embed cards for task status changes.",
    badges: ["Embed Cards", "Interaction Bot"], connectType: "APIKEY",
    apiKeyLabel: "Discord Webhook URL", apiKeyPlaceholder: "https://discord.com/api/webhooks/...",
    apiKeyHint: "Server → Channel Settings → Integrations → Webhooks → Copy URL",
    docsUrl: "https://discord.com/developers/docs/resources/webhook",
  },
  {
    id: "ZENDESK", name: "Zendesk", category: "SUPPORT", categoryName: "Customer Support & Helpdesk",
    icon: Headphones, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10",
    description: "Convert customer helpdesk tickets into engineering tasks with resolution sync.",
    badges: ["Customer Ticket Sync", "Resolution Notes"], connectType: "APIKEY",
    apiKeyLabel: "Subdomain || Email/token:APIToken", apiKeyPlaceholder: "mycompany||admin@acme.com/token:abc123",
    apiKeyHint: "Format: <subdomain>||<email>/token:<api_token>",
    docsUrl: "https://developer.zendesk.com/api-reference/",
  },
  {
    id: "INTERCOM", name: "Intercom", category: "SUPPORT", categoryName: "Live Customer Messaging",
    icon: Headphones, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10",
    description: "Link customer feedback conversations to feature requests and bug tasks.",
    badges: ["User Feedback", "Conversation Sync"], connectType: "APIKEY",
    apiKeyLabel: "Intercom Access Token", apiKeyPlaceholder: "dG9rOjE...",
    apiKeyHint: "Create at app.intercom.com → Settings → Developers → Your Apps",
    docsUrl: "https://developers.intercom.com/docs/references/rest-api/",
  },
  {
    id: "FIGMA", name: "Figma", category: "MEDIA_WHITEBOARDS", categoryName: "Design System & Canvas",
    icon: FigmaIcon, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-500/10",
    description: "Embed live interactive Figma canvas wireframes directly inside task drawers.",
    badges: ["Live Canvas Embed", "Prototype Inspect"], connectType: "APIKEY",
    apiKeyLabel: "Figma Personal Access Token", apiKeyPlaceholder: "figd_...",
    apiKeyHint: "Figma → Account Settings → Personal Access Tokens → Create new token",
    docsUrl: "https://www.figma.com/developers/api",
  },
  {
    id: "LOOM", name: "Loom", category: "MEDIA_WHITEBOARDS", categoryName: "Screen Recording & Video",
    icon: Video, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-500/10",
    description: "Attach Loom screen recordings to bug tasks for video reproduction steps.",
    badges: ["Video Bug Player", "Inline Embed"], connectType: "APIKEY",
    apiKeyLabel: "Loom API Key", apiKeyPlaceholder: "loom_...",
    apiKeyHint: "Loom workspace settings → Integrations → API",
    docsUrl: "https://dev.loom.com/",
  },
  {
    id: "MIRO", name: "Miro", category: "MEDIA_WHITEBOARDS", categoryName: "Agile Retros & Whiteboards",
    icon: LayoutGrid, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10",
    description: "Embed live interactive Miro whiteboard canvases directly inside task drawers.",
    badges: ["Canvas Embed", "Agile Retros"], connectType: "APIKEY",
    apiKeyLabel: "Miro API Key", apiKeyPlaceholder: "eyJt...",
    apiKeyHint: "miro.com → Profile → Your Apps → Create new app",
    docsUrl: "https://developers.miro.com/",
  },
  {
    id: "ZAPIER", name: "Zapier & Make", category: "DEVOPS", categoryName: "Universal Automation",
    icon: Layers, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10",
    description: "Connect 5,000+ apps using custom outbound webhooks and automated event pings.",
    badges: ["5,000+ App Triggers", "JSON Webhooks"], connectType: "WEBHOOK_ONLY",
    webhookNote: "Copy your Trackly Webhook URL and paste it into your Zapier/Make trigger.",
    docsUrl: "https://zapier.com/apps",
  },
];

// ─────────────────────────────────────────────────────────────────
// API Key Configure Modal
// ─────────────────────────────────────────────────────────────────
type ApiKeyModalProps = {
  provider: ProviderDef;
  onClose: () => void;
  onSaved: (provider: string, accountName: string) => void;
};

function ApiKeyModal({ provider, onClose, onSaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "saving" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleTest = () => {
    if (!apiKey.trim()) return;
    setStatus("testing");
    setErrorMsg("");
    startTransition(async () => {
      const result = await testIntegrationConnection(provider.id, apiKey.trim());
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(result.error || "Connection test failed");
      }
    });
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setStatus("saving");
    startTransition(async () => {
      const testResult = await testIntegrationConnection(provider.id, apiKey.trim());
      if (!testResult.success) {
        setStatus("error");
        setErrorMsg(testResult.error || "Failed to validate credentials");
        return;
      }

      const saveResult = await saveApiKeyIntegration(
        provider.id,
        apiKey.trim(),
        webhookSecret || undefined,
        {
          accountName: testResult.accountName || provider.name,
          accountAvatar: testResult.accountAvatar,
        }
      );

      if (saveResult.success) {
        onSaved(provider.id, testResult.accountName || provider.name);
        onClose();
      } else {
        setStatus("error");
        setErrorMsg(saveResult.error || "Failed to save");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-border-default bg-surface shadow-2xl p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${provider.bgColor}`}>
              <provider.icon className={`w-5 h-5 ${provider.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-default">Connect {provider.name}</p>
              <p className="text-[11px] text-subtle">{provider.categoryName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-subtlest hover:text-default p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* API Key field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default">{provider.apiKeyLabel}</label>
          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); }}
              placeholder={provider.apiKeyPlaceholder}
              className="w-full h-10 sm:h-9 rounded-lg border border-border-default bg-neutral px-3 pr-10 text-xs font-mono outline-none focus:border-brand"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 text-subtlest hover:text-default"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {provider.apiKeyHint && (
            <p className="text-[11px] text-subtlest">{provider.apiKeyHint}</p>
          )}
        </div>

        {/* Webhook signing secret (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default">
            Webhook Signing Secret <span className="text-subtlest font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_..."
            className="h-10 sm:h-9 rounded-lg border border-border-default bg-neutral px-3 text-xs font-mono outline-none focus:border-brand"
          />
          <p className="text-[11px] text-subtlest">
            Used to verify inbound webhook HMAC signatures from {provider.name}.
          </p>
        </div>

        {/* Status feedback */}
        {status === "error" && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger font-medium">
            <AlertTriangle size={13} /> {errorMsg}
          </div>
        )}
        {status === "success" && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={13} /> Connection verified! Click Save to connect.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand flex items-center gap-1 hover:underline"
          >
            <ExternalLink size={12} /> API Docs
          </a>
          <div className="flex gap-2">
            <Button appearance="subtle" onClick={handleTest} disabled={!apiKey.trim() || isPending} className="text-xs h-10 sm:h-8">
              {status === "testing" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              <span className="ml-1">Test</span>
            </Button>
            <Button appearance="primary" onClick={handleSave} disabled={!apiKey.trim() || isPending} className="text-xs h-10 sm:h-8">
              {status === "saving" ? <Loader2 size={12} className="animate-spin" /> : null}
              <span className="ml-1">Save & Connect</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Webhook-only Connect Modal
// ─────────────────────────────────────────────────────────────────
type WebhookOnlyModalProps = {
  provider: ProviderDef;
  siteId: string;
  onClose: () => void;
  onSaved: (provider: string) => void;
};

function WebhookOnlyModal({ provider, siteId, onClose, onSaved }: WebhookOnlyModalProps) {
  const [webhookSecret, setWebhookSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://trackly.vercel.app"}/api/webhooks/${provider.id.toLowerCase()}?siteId=${siteId}`;

  const copyUrl = () => {
    navigator.clipboard?.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const genSecret = () => {
    startTransition(async () => {
      const { secret } = await generateWebhookSecret(provider.id);
      setWebhookSecret(secret);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveApiKeyIntegration(
        provider.id,
        webhookSecret || "webhook-only",
        webhookSecret || undefined,
        { accountName: `${provider.name} Webhook` }
      );
      onSaved(provider.id);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-border-default bg-surface shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${provider.bgColor}`}>
              <provider.icon className={`w-5 h-5 ${provider.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-default">Configure {provider.name}</p>
              <p className="text-[11px] text-subtle">Webhook Integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-subtlest hover:text-default p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {provider.webhookNote && (
          <div className="rounded-lg bg-brand/5 border border-brand/20 px-3 py-2 text-xs text-subtle">
            {provider.webhookNote}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default">Your Trackly Webhook URL</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 h-10 sm:h-9 rounded-lg border border-border-default bg-neutral px-3 text-[11px] font-mono text-subtle outline-none"
            />
            <button
              onClick={copyUrl}
              className="h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border border-border-default bg-neutral hover:bg-neutral/70 text-subtle transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-default">Signing Secret</label>
            <button onClick={genSecret} className="text-[11px] text-brand hover:underline flex items-center gap-1">
              <RefreshCw size={10} /> Generate
            </button>
          </div>
          <input
            readOnly
            value={webhookSecret}
            placeholder="Click Generate to create a new secret"
            className="h-10 sm:h-9 rounded-lg border border-border-default bg-neutral px-3 text-[11px] font-mono text-subtle outline-none"
          />
          <p className="text-[11px] text-subtlest">Paste this secret in {provider.name}&apos;s webhook configuration to verify payloads.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button appearance="subtle" onClick={onClose} className="text-xs h-10 sm:h-8">Cancel</Button>
          <Button appearance="primary" onClick={handleSave} disabled={isPending} className="text-xs h-10 sm:h-8">
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            <span className="ml-1">Mark as Configured</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Connection Status Badge
// ─────────────────────────────────────────────────────────────────
function ConnectionBadge({ status }: { status: string }) {
  if (status === "CONNECTED") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Connected
    </span>
  );
  if (status === "ERROR") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
      <AlertTriangle size={10} /> Error
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral text-subtlest border border-border-default">
      <WifiOff size={10} /> Not Connected
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main IntegrationsSettings Component
// ─────────────────────────────────────────────────────────────────
type Props = {
  siteId: string;
  initialConnections?: IntegrationConnection[];
};

export function IntegrationsSettings({ siteId, initialConnections = [] }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [modalProvider, setModalProvider] = useState<ProviderDef | null>(null);
  const [modalType, setModalType] = useState<"apikey" | "webhook" | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Local connection state — seeded from DB, updated optimistically
  const [connections, setConnections] = useState<Map<string, IntegrationConnection>>(() => {
    const map = new Map<string, IntegrationConnection>();
    for (const c of initialConnections) {
      map.set(c.provider, c);
    }
    return map;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const connected = params.get("connected");

    if (err === "github_not_configured" || err === "github_denied" || err === "github_token") {
      showToast("GitHub OAuth not configured or denied. Connect using a Personal Access Token (PAT) below!", "error");
      const githubProv = PROVIDERS.find((p) => p.id === "GITHUB");
      if (githubProv) {
        setModalProvider(githubProv);
        setModalType("apikey");
      }
    } else if (err === "slack_not_configured" || err === "slack_denied") {
      showToast("Slack OAuth not configured or denied. Connect using a Bot Token (xoxb-...) below!", "error");
      const slackProv = PROVIDERS.find((p) => p.id === "SLACK");
      if (slackProv) {
        setModalProvider(slackProv);
        setModalType("apikey");
      }
    } else if (connected) {
      showToast(`${connected.toUpperCase()} connected successfully!`, "success");
    }
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const getConnection = (providerId: string): IntegrationConnection | undefined =>
    connections.get(providerId);

  const isConnected = (providerId: string) =>
    connections.get(providerId)?.status === "CONNECTED";

  const handleConnectOAuth = (path: string) => {
    window.location.href = path;
  };

  const handleOpenModal = (provider: ProviderDef) => {
    setModalProvider(provider);
    setModalType(provider.connectType === "WEBHOOK_ONLY" ? "webhook" : "apikey");
  };

  const handleApiKeySaved = (providerId: string, accountName: string) => {
    setConnections((prev) => {
      const next = new Map(prev);
      next.set(providerId, {
        provider: providerId,
        status: "CONNECTED",
        accountName,
        connectedAt: new Date(),
      });
      return next;
    });
    showToast(`${providerId} connected successfully!`);
  };

  const handleWebhookSaved = (providerId: string) => {
    setConnections((prev) => {
      const next = new Map(prev);
      next.set(providerId, {
        provider: providerId,
        status: "CONNECTED",
        accountName: `${providerId} Webhook`,
        connectedAt: new Date(),
      });
      return next;
    });
    showToast(`${providerId} webhook configured!`);
  };

  const handleDisconnect = (providerId: string) => {
    startTransition(async () => {
      const result = await disconnectIntegration(providerId);
      if (result.success) {
        setConnections((prev) => {
          const next = new Map(prev);
          next.delete(providerId);
          return next;
        });
        showToast(`${providerId} disconnected.`, "success");
      } else {
        showToast(`Failed to disconnect: ${result.error}`, "error");
      }
    });
  };

  const CATEGORIES: { id: IntegrationCategory; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "DEVOPS", label: "DevOps" },
    { id: "COMMUNICATION", label: "Communication" },
    { id: "MONITORING", label: "Monitoring" },
    { id: "SUPPORT", label: "Support" },
    { id: "MEDIA_WHITEBOARDS", label: "Media" },
  ];

  const connectedCount = Array.from(connections.values()).filter((c) => c.status === "CONNECTED").length;

  const filtered = PROVIDERS.filter((p) => {
    const catMatch = selectedCategory === "ALL" || p.category === selectedCategory;
    const search = searchQuery.toLowerCase();
    const textMatch = !search || p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
    return catMatch && textMatch;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 ${
          toastType === "error" ? "bg-danger text-white" : "bg-slate-900 text-white"
        }`}>
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* API Key Modal */}
      {modalProvider && modalType === "apikey" && (
        <ApiKeyModal
          provider={modalProvider}
          onClose={() => { setModalProvider(null); setModalType(null); }}
          onSaved={handleApiKeySaved}
        />
      )}

      {/* Webhook-only Modal */}
      {modalProvider && modalType === "webhook" && (
        <WebhookOnlyModal
          provider={modalProvider}
          siteId={siteId}
          onClose={() => { setModalProvider(null); setModalType(null); }}
          onSaved={handleWebhookSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-text tracking-tight flex items-center gap-2">
            <Zap className="text-brand" size={20} />
            Connected Apps
          </h2>
          <p className="text-xs text-text-subtle mt-0.5">
            {connectedCount} of {PROVIDERS.length} integrations active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection summary pills */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
              <Wifi size={11} /> {connectedCount} Active
            </span>
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral text-subtlest font-semibold border border-border-default">
              <WifiOff size={11} /> {PROVIDERS.length - connectedCount} Available
            </span>
          </div>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtlest" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 sm:h-9 rounded-xl border border-border-default bg-surface pl-9 pr-3 text-xs outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedCategory === cat.id
                  ? "bg-brand text-white border-brand"
                  : "bg-surface text-subtle border-border-default hover:bg-neutral"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((provider) => {
          const conn = getConnection(provider.id);
          const connected = conn?.status === "CONNECTED";
          const expanded = expandedProvider === provider.id;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border transition-all ${
                connected
                  ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                  : "border-border-default bg-surface"
              }`}
            >
              {/* Card Header Row */}
              <div className="flex items-center gap-3 p-4">
                {/* Icon */}
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${provider.bgColor}`}>
                  <provider.icon className={`w-5 h-5 ${provider.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-default">{provider.name}</span>
                    <ConnectionBadge status={conn?.status || "DISCONNECTED"} />
                    {provider.badges.map((b) => (
                      <span key={b} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral text-subtle border border-border-default">
                        {b}
                      </span>
                    ))}
                  </div>
                  {connected && conn?.accountName && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      ✓ {conn.accountName}
                      {conn.connectedAt && ` · Connected ${new Date(conn.connectedAt).toLocaleDateString()}`}
                    </p>
                  )}
                  {!connected && (
                    <p className="text-[11px] text-subtle truncate mt-0.5">{provider.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {connected ? (
                    <>
                      <button
                        onClick={() => setExpandedProvider(expanded ? null : provider.id)}
                        className="text-xs text-subtle hover:text-default flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1.5 rounded-lg border border-border-default hover:bg-neutral transition-colors"
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Details
                      </button>
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={isPending}
                        className="text-xs text-danger hover:text-danger/80 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-danger/30 hover:bg-danger/5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X size={12} /> Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-subtlest hover:text-default rounded-lg hover:bg-neutral transition-colors"
                        title="View Docs"
                      >
                        <ExternalLink size={14} />
                      </a>
                      {provider.connectType === "OAUTH" ? (
                        <button
                          onClick={() => handleConnectOAuth(provider.oauthPath!)}
                          className="flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors cursor-pointer"
                        >
                          <Shield size={13} /> Connect with {provider.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(provider)}
                          className="flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-neutral border border-border-default text-xs font-bold text-default hover:bg-neutral/70 transition-colors cursor-pointer"
                        >
                          <Key size={13} /> Configure
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Connection Details */}
              {connected && expanded && (
                <div className="border-t border-border-default px-4 pb-4 pt-3 flex flex-col gap-3">
                  <p className="text-xs text-subtle">{provider.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-neutral border border-border-default p-3">
                      <p className="text-subtlest font-medium mb-1">Webhook URL</p>
                      <p className="font-mono text-[10px] text-subtle break-all">
                        {`/api/webhooks/${provider.id.toLowerCase()}?siteId=${siteId}`}
                      </p>
                    </div>
                    <div className="rounded-lg bg-neutral border border-border-default p-3">
                      <p className="text-subtlest font-medium mb-1">Provider</p>
                      <p className="font-bold text-default">{provider.categoryName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(provider)}
                      className="text-xs text-brand hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Reconfigure
                    </button>
                    <span className="text-subtlest">·</span>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-subtle hover:text-default flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Docs
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-subtle text-sm">
            No integrations match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Webhook Gateway Section */}
      <div className="rounded-2xl border border-border-default bg-surface p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Flame size={16} className="text-brand" />
          </div>
          <div>
            <p className="text-sm font-bold text-default">Inbound Webhook Gateway</p>
            <p className="text-[11px] text-subtle">
              All providers send events to a single endpoint — Trackly routes by provider
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-neutral border border-border-default p-3">
          <p className="text-[10px] text-subtlest font-mono font-semibold mb-1">ENDPOINT</p>
          <p className="text-xs font-mono text-default break-all">
            https://trackly.vercel.app/api/webhooks/<span className="text-brand">[provider]</span>?siteId=<span className="text-brand">{siteId}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-subtle">
          <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> HMAC SHA-256 signature verification</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Multi-tenant site isolation</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Idempotent event deduplication</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Auto issue key extraction from payloads</div>
        </div>
      </div>

      {/* Webhook Notification Builder */}
      <WebhookNotificationBuilder siteId={siteId} />

      {/* Personal Access Tokens */}
      <PersonalAccessTokensSection siteId={siteId} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Personal Access Tokens Section
// ─────────────────────────────────────────────────────────────────
type TokenEntry = { id: string; description: string; expiry: string; lastUsed: string; masked: string };

function PersonalAccessTokensSection({ siteId: _siteId }: { siteId: string }) {
  const [tokens, setTokens] = useState<TokenEntry[]>([
    { id: "tok-1", description: "CI/CD Pipeline Token", expiry: "Dec 31, 2025", lastUsed: "2 hours ago", masked: "trk_live_••••••••••••••••••4f2a" },
    { id: "tok-2", description: "Local Dev Environment", expiry: "Never", lastUsed: "Yesterday", masked: "trk_live_••••••••••••••••••8c19" },
  ]);
  const [newDesc, setNewDesc] = useState("");
  const [newExpiry, setNewExpiry] = useState("90d");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const generateToken = () => {
    if (!newDesc.trim()) return;
    const raw = `trk_live_${crypto.getRandomValues(new Uint8Array(20)).join("").slice(0, 24)}`;
    const masked = `${raw.slice(0, 14)}••••••••••••••••••${raw.slice(-4)}`;
    const expiryLabel = newExpiry === "never" ? "Never" : newExpiry === "30d" ? "30 days" : newExpiry === "90d" ? "90 days" : "1 year";
    setTokens((prev) => [...prev, {
      id: `tok-${Date.now()}`,
      description: newDesc.trim(),
      expiry: expiryLabel,
      lastUsed: "Never",
      masked,
    }]);
    setNewToken(raw);
    setNewDesc("");
    setShowForm(false);
  };

  const copyToken = () => {
    if (newToken) navigator.clipboard?.writeText(newToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const revokeToken = (id: string) => setTokens((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="rounded-2xl border border-border-default bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-neutral flex items-center justify-center">
            <Key size={16} className="text-subtle" />
          </div>
          <div>
            <p className="text-sm font-bold text-default">Personal Access Tokens</p>
            <p className="text-[11px] text-subtle">For CI/CD pipelines and API automation</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer"
        >
          <Plus size={13} /> Generate Token
        </button>
      </div>

      {/* Generate Token Form */}
      {showForm && (
        <div className="flex flex-col gap-3 p-3 rounded-xl border border-brand/30 bg-brand/5">
          <input
            type="text"
            placeholder="Token description (e.g. GitHub Actions)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="h-9 rounded-lg border border-border-default bg-surface px-3 text-xs outline-none focus:border-brand"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="h-9 rounded-lg border border-border-default bg-surface px-2 text-xs outline-none focus:border-brand"
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="never">Never expires</option>
            </select>
            <Button appearance="primary" onClick={generateToken} disabled={!newDesc.trim()} className="text-xs h-9 flex-1">
              Generate
            </Button>
          </div>
        </div>
      )}

      {/* New token reveal */}
      {newToken && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="font-bold text-amber-600 block">
              Save your token now — it won&apos;t be shown again!
            </span>
            <code className="font-mono text-[11px] text-text font-bold truncate block mt-0.5">{newToken}</code>
          </div>
          <button
            onClick={copyToken}
            className="p-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 shrink-0"
          >
            {copiedToken ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-amber-600" />}
          </button>
        </div>
      )}

      {/* Token List */}
      <div className="flex flex-col gap-2">
        {tokens.map((tok) => (
          <div key={tok.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border-default bg-neutral">
            <div>
              <p className="text-xs font-semibold text-default">{tok.description}</p>
              <p className="text-[10px] text-subtlest font-mono">{tok.masked}</p>
              <p className="text-[10px] text-subtlest">Expires: {tok.expiry} · Last used: {tok.lastUsed}</p>
            </div>
            <button
              onClick={() => revokeToken(tok.id)}
              className="text-[11px] text-danger hover:text-danger/80 border border-danger/20 hover:bg-danger/5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

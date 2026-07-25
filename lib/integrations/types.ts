export type IntegrationProvider =
  | "GITHUB"
  | "GITLAB"
  | "BITBUCKET"
  | "SENTRY"
  | "FIGMA"
  | "VERCEL"
  | "SLACK"
  | "DISCORD"
  | "ZENDESK"
  | "INTERCOM"
  | "LOOM"
  | "MIRO"
  | "DATADOG"
  | "ZAPIER";

export type IntegrationCategory =
  | "ALL"
  | "DEVOPS"
  | "COMMUNICATION"
  | "SUPPORT"
  | "MEDIA_WHITEBOARDS"
  | "MONITORING";

export type PipelineStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELED";

export type DeploymentStatus =
  | "QUEUED"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED";

export interface NormalizedDevEvent {
  provider: IntegrationProvider;
  eventType: string;
  siteId?: string;
  projectId?: string;
  issueKeys: string[];
  payload: {
    title?: string;
    description?: string;
    url?: string;
    status?: string;
    authorName?: string;
    authorAvatar?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  };
}

export interface WebhookLogEntry {
  id: string;
  provider: IntegrationProvider;
  eventType: string;
  statusCode: number;
  issueKey?: string;
  latencyMs: number;
  timestamp: string;
  summary: string;
}

export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
  embedUrl: string;
  originalUrl: string;
}

export interface ParsedLoomUrl {
  videoId: string;
  embedUrl: string;
  originalUrl: string;
}

export interface ParsedMiroUrl {
  boardId: string;
  embedUrl: string;
  originalUrl: string;
}

export interface LinkedZendeskTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  status: "OPEN" | "PENDING" | "SOLVED" | "CLOSED";
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
  customerEmail: string;
  customerName?: string;
  zendeskUrl: string;
  updatedAt: string;
}

export interface WebhookNotificationRule {
  id: string;
  platform: "SLACK" | "DISCORD";
  webhookUrl: string;
  channelName: string;
  botName?: string;
  enabledEvents: ("issue.created" | "issue.status_changed" | "issue.blocked" | "sentry.auto_bug")[];
}

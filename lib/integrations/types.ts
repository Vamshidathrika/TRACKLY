export type IntegrationProvider =
  | "GITHUB"
  | "GITLAB"
  | "BITBUCKET"
  | "SENTRY"
  | "FIGMA"
  | "VERCEL";

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

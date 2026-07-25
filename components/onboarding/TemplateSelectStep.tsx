"use client";

import { useState } from "react";
import {
  Columns3,
  Calendar,
  Layout,
  Bug,
  Terminal,
  Megaphone,
  Check,
  Info,
  ArrowRight,
  Eye,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type TemplateType =
  | "KANBAN"
  | "SCRUM"
  | "WEB_DESIGN"
  | "BUG_TRACKING"
  | "OPERATIONS"
  | "MARKETING";

type TemplateOption = {
  id: TemplateType;
  title: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  stages: string[];
  features: string[];
  previewTasks: { key: string; title: string; tag: string; priority: string }[];
};

const TEMPLATES: TemplateOption[] = [
  {
    id: "KANBAN",
    title: "Kanban Software",
    badge: "Recommended",
    description: "Continuous delivery flow, limit WIP, maximize engineering output.",
    icon: Columns3,
    stages: ["To Do", "In Progress", "In Review", "Done"],
    features: ["Drag & drop columns", "WIP telemetry", "Cumulative flow graphs"],
    previewTasks: [
      { key: "KAN-1", title: "Set up Redis pub/sub broker", tag: "backend", priority: "HIGH" },
      { key: "KAN-2", title: "Implement WebSocket telemetry feed", tag: "realtime", priority: "HIGH" },
      { key: "KAN-3", title: "Add column WIP limit warning UI", tag: "frontend", priority: "MEDIUM" },
    ],
  },
  {
    id: "SCRUM",
    title: "Agile Scrum",
    badge: "Popular for Dev",
    description: "Iterative 2-week sprints, story point estimation, backlog & velocity charts.",
    icon: Calendar,
    stages: ["Backlog", "Sprint To Do", "In Development", "QA & Done"],
    features: ["Sprint backlog planning", "Velocity tracking", "Burndown charts"],
    previewTasks: [
      { key: "SCR-1", title: "Implement Multi-Factor Auth (MFA)", tag: "security", priority: "HIGHEST" },
      { key: "SCR-2", title: "Build OAuth2 Google/GitHub hooks", tag: "auth", priority: "HIGH" },
      { key: "SCR-3", title: "Conduct Security & Penetration Audit", tag: "audit", priority: "MEDIUM" },
    ],
  },
  {
    id: "WEB_DESIGN",
    title: "Web & UI Design",
    badge: "Design Teams",
    description: "Custom pipeline for research, Figma handoffs, dev builds, and QA gates.",
    icon: Layout,
    stages: ["Specs", "Figma", "Dev Build", "QA", "Live Launch"],
    features: ["Design review gates", "Asset attachments", "Figma integration"],
    previewTasks: [
      { key: "DES-1", title: "Create Dark Theme glassmorphic UI kit", tag: "figma", priority: "HIGH" },
      { key: "DES-2", title: "Responsive mobile viewport audit", tag: "ux", priority: "MEDIUM" },
    ],
  },
  {
    id: "BUG_TRACKING",
    title: "Bug & Incident Tracker",
    description: "Triage defects, investigate production crashes, and verify bug fixes.",
    icon: Bug,
    stages: ["Open", "In Triage", "Fix Pending", "Verified & Closed"],
    features: ["P0 Incident badges", "Error trace attachments", "SRE triage workflow"],
    previewTasks: [
      { key: "BUG-1", title: "Critical: Database connection pool exhaustion", tag: "production-bug", priority: "HIGHEST" },
      { key: "BUG-2", title: "Special characters in key crash URL parser", tag: "routing", priority: "HIGH" },
    ],
  },
  {
    id: "OPERATIONS",
    title: "IT Ops & Infrastructure",
    description: "Manage cloud migrations, cluster upgrades, SSL rotations, and maintenance.",
    icon: Terminal,
    stages: ["Backlog", "Scheduled", "Executing", "Validation", "Completed"],
    features: ["Maintenance windows", "DevOps checklists", "Multi-region failover"],
    previewTasks: [
      { key: "OPS-1", title: "Upgrade Kubernetes clusters to v1.30", tag: "k8s", priority: "HIGH" },
      { key: "OPS-2", title: "Provision Multi-Region PostgreSQL Replica", tag: "database", priority: "HIGHEST" },
    ],
  },
  {
    id: "MARKETING",
    title: "Growth & Marketing",
    description: "Content pipelines, product launch briefs, social media assets, and retargeting.",
    icon: Megaphone,
    stages: ["Brief", "Creation", "Review", "Publishing", "Active"],
    features: ["Campaign timelines", "Media attachments", "Performance metrics"],
    previewTasks: [
      { key: "MKT-1", title: "Author Launch Announcement Blog Post", tag: "content", priority: "HIGH" },
      { key: "MKT-2", title: "Design Product Hunt visual assets & demo", tag: "media", priority: "HIGH" },
    ],
  },
];

export function TemplateSelectStep({
  onSelect,
}: {
  onSelect: (template: TemplateType, defaultStages: string[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<TemplateType>("KANBAN");
  const [previewingTemplate, setPreviewingTemplate] = useState<TemplateOption | null>(null);

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId) || TEMPLATES[0];

  return (
    <>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto text-left animate-fade-in">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold font-mono mb-2">
            <Sparkles size={13} />
            Step 2 of 5 • Blueprint Templates
          </div>
          <h2 className="text-2xl font-bold text-text tracking-tight">
            Select Your Project Template
          </h2>
          <p className="text-sm text-text-subtle mt-1">
            Choose an opinionated workflow preset with pre-configured columns and sample tasks.
          </p>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedId === tmpl.id;
            const Icon = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-sm"
                    : "border-border bg-surface hover:border-brand/40 hover:bg-neutral/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        isSelected ? "bg-brand text-white" : "bg-neutral text-brand"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    {tmpl.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/20">
                        {tmpl.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-text mb-1">{tmpl.title}</h3>
                  <p className="text-xs text-text-subtle leading-relaxed mb-3 line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border-t border-border/60 pt-2.5">
                    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1 font-mono">
                      Default Stages
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.stages.map((st) => (
                        <span
                          key={st}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral text-text-subtle border border-border/50"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Select vs Live Preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(tmpl.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-brand text-white border-brand shadow-xs"
                          : "bg-surface border-border text-text hover:bg-neutral"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewingTemplate(tmpl)}
                      className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-neutral text-text-subtle hover:text-text hover:bg-neutral-hovered transition-colors flex items-center gap-1"
                      title="Preview live board layout"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-brand text-white flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reassurance Banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border text-xs text-text-subtle">
          <Info size={18} className="text-brand shrink-0" />
          <span>
            <strong>Reassurance:</strong> You can always customize stages, add backlog views, or change project settings later.
          </span>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            appearance="primary"
            onClick={() => onSelect(selectedTemplate.id, selectedTemplate.stages)}
            className="flex items-center gap-2 px-6 py-2.5 font-semibold"
          >
            Use {selectedTemplate.title} Preset
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Live Interactive Preview Modal */}
      {previewingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-brand/10 text-brand">
                  <previewingTemplate.icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text">{previewingTemplate.title} Preview</h3>
                  <p className="text-xs text-text-subtle">{previewingTemplate.description}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-neutral text-text-subtle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mini Board Columns Preview */}
            <div className="grid grid-cols-4 gap-2.5 bg-neutral/30 p-3 rounded-xl border border-border/60 overflow-x-auto min-h-[160px]">
              {previewingTemplate.stages.map((stg, i) => (
                <div key={stg} className="bg-surface p-2.5 rounded-lg border border-border/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text truncate">{stg}</span>
                    <span className="text-[10px] font-mono text-text-subtle font-semibold">
                      {i === 0 ? "2" : i === 1 ? "1" : "0"}
                    </span>
                  </div>

                  {i < previewingTemplate.previewTasks.length && (
                    <div className="p-2 rounded bg-neutral/40 border border-border/50 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-brand">
                        <span>{previewingTemplate.previewTasks[i].key}</span>
                        <span className="text-danger font-bold">{previewingTemplate.previewTasks[i].priority}</span>
                      </div>
                      <p className="font-medium text-text text-[10px] line-clamp-2 leading-tight">
                        {previewingTemplate.previewTasks[i].title}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button appearance="subtle" onClick={() => setPreviewingTemplate(null)}>
                Close Preview
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  setSelectedId(previewingTemplate.id);
                  setPreviewingTemplate(null);
                }}
              >
                Select This Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

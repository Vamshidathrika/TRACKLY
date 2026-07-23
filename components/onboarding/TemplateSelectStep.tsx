"use client";

import { useState } from "react";
import { Columns3, Calendar, Layout, Check, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type TemplateType = "KANBAN" | "WEB_DESIGN" | "SCRUM";

type TemplateOption = {
  id: TemplateType;
  title: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  stages: string[];
  features: string[];
};

const TEMPLATES: TemplateOption[] = [
  {
    id: "KANBAN",
    title: "Kanban Project",
    badge: "Recommended",
    description: "Visualize continuous workflow execution, limit work in progress, and maximize team output.",
    icon: Columns3,
    stages: ["To Do", "In Progress", "In Review", "Done"],
    features: ["Drag & drop columns", "WIP telemetry", "Cumulative flow graphs"],
  },
  {
    id: "WEB_DESIGN",
    title: "Web Design Process",
    badge: "Popular for Teams",
    description: "Custom pipeline for product, design, research, Figma handoff, QA, and launch stages.",
    icon: Layout,
    stages: ["Specs", "Figma", "Dev Build", "QA", "Live Launch"],
    features: ["Design review gates", "Asset attachments", "Asset checklist"],
  },
  {
    id: "SCRUM",
    title: "Scrum Software",
    description: "Plan iterative sprints, manage story points, track velocity, and maintain a structured backlog.",
    icon: Calendar,
    stages: ["Backlog", "Sprint To Do", "In Progress", "Done"],
    features: ["Sprint backlog planning", "Velocity tracking", "Burn-down charts"],
  },
];

export function TemplateSelectStep({
  onSelect,
}: {
  onSelect: (template: TemplateType, defaultStages: string[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<TemplateType>("KANBAN");

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId) || TEMPLATES[0];

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto text-left animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-default tracking-tight">
          Select Your Project Template
        </h2>
        <p className="text-sm text-subtle mt-1">
          Choose an opinionated workflow preset to seed your board columns and issue types.
        </p>
      </div>

      {/* Template Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((tmpl) => {
          const isSelected = selectedId === tmpl.id;
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelectedId(tmpl.id)}
              className={`flex flex-col justify-between p-5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "border-brand bg-brand/5 ring-2 ring-brand shadow-sm"
                  : "border-border-default bg-surface hover:border-border-strong hover:bg-neutral-hovered"
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

                <h3 className="text-base font-bold text-default mb-1">{tmpl.title}</h3>
                <p className="text-xs text-subtle leading-relaxed mb-4">{tmpl.description}</p>
              </div>

              <div className="border-t border-border-default/60 pt-3">
                <span className="text-[10px] font-bold text-subtlest uppercase tracking-wider block mb-1 font-mono">
                  Default Stages
                </span>
                <div className="flex flex-wrap gap-1">
                  {tmpl.stages.map((st) => (
                    <span
                      key={st}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral text-subtle border border-border-default"
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-brand text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Reassurance Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border-default text-xs text-subtle">
        <Info size={18} className="text-brand shrink-0" />
        <span>
          <strong>Reassurance:</strong> You can always customize stages, add backlog views, or change project settings later.
        </span>
      </div>

      <div className="flex justify-end pt-2">
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
  );
}

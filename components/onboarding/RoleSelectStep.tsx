"use client";

import { useState } from "react";
import {
  Code,
  Layout,
  Briefcase,
  Users,
  Terminal,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type RoleType = "DEVELOPER" | "PM" | "DESIGNER" | "LEAD" | "OPERATIONS";

type RoleOption = {
  id: RoleType;
  title: string;
  recommendedTemplate: "KANBAN" | "SCRUM" | "WEB_DESIGN" | "BUG_TRACKING" | "OPERATIONS" | "MARKETING";
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "PM",
    title: "Product Manager",
    recommendedTemplate: "SCRUM",
    description: "Manage product backlogs, sprint cycles, roadmap epics, and velocity charts.",
    icon: Briefcase,
  },
  {
    id: "DEVELOPER",
    title: "Software Engineer",
    recommendedTemplate: "KANBAN",
    description: "Focus on continuous delivery, code reviews, bug fixes, and WIP limits.",
    icon: Code,
  },
  {
    id: "DESIGNER",
    title: "Designer / UX",
    recommendedTemplate: "WEB_DESIGN",
    description: "Pipeline for Figma handoffs, asset reviews, design specs, and QA gates.",
    icon: Layout,
  },
  {
    id: "LEAD",
    title: "Engineering Lead",
    recommendedTemplate: "BUG_TRACKING",
    description: "Triage incidents, track regression bugs, connection pools, and release stability.",
    icon: Users,
  },
  {
    id: "OPERATIONS",
    title: "IT Ops / Marketing",
    recommendedTemplate: "OPERATIONS",
    description: "Infrastructure upgrades, cloud deployments, content pipelines, and growth campaigns.",
    icon: Terminal,
  },
];

export function RoleSelectStep({
  onNext,
}: {
  onNext: (role: RoleType, recommendedTemplate: string) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<RoleOption>(ROLE_OPTIONS[0]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
          <Sparkles size={13} />
          Step 1 of 5 • Personalized Experience
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">
          What best describes your primary role?
        </h1>
        <p className="text-sm text-text-subtle">
          Trackly will customize your initial project templates and workflow stages based on your answer.
        </p>
      </div>

      {/* Grid of Role Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {ROLE_OPTIONS.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole.id === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-brand/5 border-brand ring-2 ring-brand/20 shadow-sm"
                  : "bg-surface border-border hover:border-brand/40 hover:bg-neutral/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`p-2.5 rounded-lg ${
                    isSelected ? "bg-brand text-white" : "bg-neutral text-text-subtle"
                  }`}
                >
                  <Icon size={20} />
                </div>

                {isSelected && (
                  <span className="h-5 w-5 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                    <Check size={12} />
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm text-text mb-0.5">{role.title}</h3>
                <p className="text-xs text-text-subtle leading-relaxed">{role.description}</p>
              </div>

              <div className="text-[10px] font-mono text-brand font-semibold pt-1 border-t border-border/50">
                Recommended: {role.recommendedTemplate.replace("_", " ")}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          appearance="primary"
          onClick={() => onNext(selectedRole.id, selectedRole.recommendedTemplate)}
          className="flex items-center gap-2 px-6 py-2.5 font-semibold"
        >
          Continue to Template Selection
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

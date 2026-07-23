"use client";

import { useState } from "react";
import { Plus, X, ArrowRight, ArrowLeft, Layers, Columns3, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const NAME_PRESETS = [
  "Acme Core Product",
  "Mobile App Redesign",
  "Marketing Launch 2026",
  "SaaS Platform Infra",
  "Customer Portal",
];

export function SpaceSetupStep({
  initialStages,
  onNext,
  onBack,
}: {
  initialStages: string[];
  onNext: (name: string, key: string, stages: string[]) => void;
  onBack: () => void;
}) {
  const [spaceName, setSpaceName] = useState("Acme Rocket Launch");
  const [spaceKey, setSpaceKey] = useState("ROCKET");
  const [stages, setStages] = useState<string[]>(initialStages);
  const [newStageInput, setNewStageInput] = useState("");

  const autoKeyFromName = (name: string) => {
    const clean = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return (clean.length >= 2 ? clean : name.slice(0, 3).toUpperCase()).slice(0, 6);
  };

  const handleNameChange = (val: string) => {
    setSpaceName(val);
    setSpaceKey(autoKeyFromName(val));
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 2) return; // Keep at least 2 stages
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleAddStage = () => {
    if (!newStageInput.trim()) return;
    setStages([...stages, newStageInput.trim()]);
    setNewStageInput("");
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-left animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-brand/15 text-brand uppercase">
            Steps 4 & 5
          </span>
          <span className="text-xs text-subtle">Space & Workflow Configuration</span>
        </div>
        <h2 className="text-2xl font-bold text-default tracking-tight">
          Name Your Space & Configure Pipeline Stages
        </h2>
        <p className="text-sm text-subtle mt-1">
          Type your workspace title and customize stages. Watch the mini board preview update in real time!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Space Name Input */}
          <div className="rounded-xl border border-border-default bg-surface p-4 shadow-xs flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-subtlest font-mono">
              Space / Project Name
            </label>
            <input
              type="text"
              value={spaceName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Mobile App"
              className="w-full rounded-lg border border-border-default bg-surface-sunken/50 px-3.5 py-2 text-sm font-semibold text-default focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />

            {/* Smart Example Chips */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-subtlest">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {NAME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleNameChange(preset)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-border-default bg-neutral/60 hover:bg-brand/10 hover:border-brand/30 hover:text-brand text-subtle transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Space Key */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default text-xs">
              <span className="text-subtle font-medium">Issue Prefix Key:</span>
              <input
                type="text"
                maxLength={8}
                value={spaceKey}
                onChange={(e) => setSpaceKey(e.target.value.toUpperCase())}
                className="w-24 text-center font-mono font-bold uppercase rounded border border-border-default bg-surface py-1 text-xs text-brand focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Workflow Stages Editor */}
          <div className="rounded-xl border border-border-default bg-surface p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-subtlest font-mono">
                Workflow Pipeline Stages
              </label>
              <span className="text-[11px] text-subtler">
                {stages.length} columns defined
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {stages.map((stg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg border border-border-default bg-neutral/40 text-xs font-semibold text-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span>{stg}</span>
                  </div>
                  {stages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      className="p-1 hover:bg-danger/10 hover:text-danger rounded text-subtlest transition-colors"
                      title="Remove stage"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Stage Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-default">
              <input
                type="text"
                value={newStageInput}
                onChange={(e) => setNewStageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStage())}
                placeholder="New stage name..."
                className="flex-1 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs text-default focus:border-brand focus:outline-none"
              />
              <Button
                appearance="subtle"
                onClick={handleAddStage}
                className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </Button>
            </div>

            <span className="text-[11px] text-subtlest italic">
              Don't worry, you can easily add, rename, or reorder these columns later in project settings.
            </span>
          </div>
        </div>

        {/* Right Live Mini Board Preview */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="rounded-xl border border-brand/30 bg-surface p-4 shadow-sm flex flex-col h-full min-h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-brand flex items-center justify-center text-white font-mono font-bold text-xs">
                  {spaceKey.slice(0, 2) || "PR"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-default leading-tight">
                    {spaceName || "Untitled Space"}
                  </h4>
                  <span className="text-[10px] font-mono text-brand">
                    Live Mini Board Preview
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20 flex items-center gap-1">
                <Sparkles size={10} /> Reactive State
              </span>
            </div>

            {/* Columns Preview Grid */}
            <div className="grid grid-flow-col auto-cols-fr gap-2 mt-4 flex-1 overflow-x-auto pb-2">
              {stages.map((stg, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border-default bg-surface-sunken/40 p-2 flex flex-col gap-2 min-w-[100px]"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold text-subtle border-b border-border-default/60 pb-1">
                    <span className="truncate">{stg}</span>
                    <span className="text-subtlest">
                      {idx === 0 ? "2" : idx === stages.length - 1 ? "1" : "1"}
                    </span>
                  </div>

                  {/* Sample Preview Cards */}
                  <div className="rounded border border-border-default bg-surface p-2 shadow-2xs flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-subtle">
                      {spaceKey}-{idx + 1}
                    </span>
                    <span className="text-[11px] font-medium text-default line-clamp-2 leading-tight">
                      {idx === 0
                        ? "Design core data schema"
                        : idx === 1
                        ? "Integrate real-time stream"
                        : "Verify test suite & deploy"}
                    </span>
                  </div>

                  {idx === 0 && (
                    <div className="rounded border border-border-default bg-surface p-2 shadow-2xs flex flex-col gap-1">
                      <span className="text-[10px] font-mono font-bold text-subtle">
                        {spaceKey}-99
                      </span>
                      <span className="text-[11px] font-medium text-default line-clamp-2 leading-tight">
                        Configure CI/CD automated pipeline
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-default">
        <Button appearance="subtle" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </Button>

        <Button
          appearance="primary"
          onClick={() => onNext(spaceName, spaceKey, stages)}
          className="flex items-center gap-2 px-6 py-2.5 font-semibold"
        >
          Confirm Space & Continue
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

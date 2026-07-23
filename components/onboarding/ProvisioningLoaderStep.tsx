"use client";

import { useEffect, useState } from "react";
import { Rocket, CheckCircle2, Cpu, Database, Server, Sparkles } from "lucide-react";

const STEPS = [
  { label: "Connecting Google Auth credentials…", icon: Cpu },
  { label: "Provisioning isolated tenant workspace…", icon: Server },
  { label: "Initializing issue databases & schema indexes…", icon: Database },
  { label: "Configuring realtime telemetry engines…", icon: Sparkles },
  { label: "Next, we'll launch you to space setup!", icon: CheckCircle2 },
];

export function ProvisioningLoaderStep({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        const next = prev + 5;
        const stepIdx = Math.min(
          STEPS.length - 1,
          Math.floor((next / 100) * STEPS.length)
        );
        setCurrentStepIndex(stepIdx);
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  const CurrentIcon = STEPS[currentStepIndex].icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Rocket Icon Animation Box */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl animate-pulse" />
        <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-tr from-brand to-brand-hover border border-brand/30 flex items-center justify-center text-white shadow-xl shadow-brand/20 transition-transform duration-300 hover:scale-105">
          <Rocket size={44} className="animate-bounce text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-default tracking-tight mb-2">
        Setting Up Your Trackly Tenant
      </h2>
      <p className="text-sm text-subtle max-w-md mb-8">
        Building your workspace backend, setting permissions, and preparing your custom board engines.
      </p>

      {/* Progress Bar Container */}
      <div className="w-full bg-surface border border-border-default rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between font-mono text-xs font-bold">
          <span className="flex items-center gap-2 text-brand">
            <CurrentIcon size={14} className="animate-spin" />
            {STEPS[currentStepIndex].label}
          </span>
          <span className="text-default">{progress}%</span>
        </div>

        <div className="h-3 w-full rounded-full bg-neutral overflow-hidden p-0.5 border border-border-default">
          <div
            style={{ width: `${progress}%` }}
            className="h-full rounded-full bg-gradient-to-r from-brand via-brand-hover to-purple transition-all duration-150 ease-out shadow-xs"
          />
        </div>

        {/* Step Checkmarks */}
        <div className="grid grid-cols-5 gap-1 pt-2">
          {STEPS.map((s, idx) => {
            const isDone = idx <= currentStepIndex;
            return (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-colors ${
                  isDone ? "bg-brand" : "bg-neutral-hovered"
                }`}
                title={s.label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

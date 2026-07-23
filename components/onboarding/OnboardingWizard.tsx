"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Rocket } from "lucide-react";
import { GoogleAccountStep } from "./GoogleAccountStep";
import { ProvisioningLoaderStep } from "./ProvisioningLoaderStep";
import { TemplateSelectStep, type TemplateType } from "./TemplateSelectStep";
import { SpaceSetupStep } from "./SpaceSetupStep";
import { InviteTeammatesStep } from "./InviteTeammatesStep";
import { provisionWorkspaceAction } from "@/app/onboarding/actions";

const STEP_LABELS = [
  "Account",
  "Provisioning",
  "Template",
  "Space Setup",
  "Workflow",
  "Teammates",
  "Product Landing",
];

export function OnboardingWizard({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Wizard state
  const [template, setTemplate] = useState<TemplateType>("KANBAN");
  const [stages, setStages] = useState<string[]>(["To Do", "In Progress", "In Review", "Done"]);
  const [spaceName, setSpaceName] = useState("Acme Rocket Launch");
  const [spaceKey, setSpaceKey] = useState("ROCKET");

  const handleStep1Complete = () => {
    setStep(2); // Go to Provisioning Loader
  };

  const handleStep2Complete = () => {
    setStep(3); // Go to Template Selection
  };

  const handleStep3Complete = (tmpl: TemplateType, defaultStages: string[]) => {
    setTemplate(tmpl);
    setStages(defaultStages);
    setStep(4); // Go to Space Setup
  };

  const handleStep4Complete = (name: string, key: string, stgs: string[]) => {
    setSpaceName(name);
    setSpaceKey(key);
    setStages(stgs);
    setStep(6); // Go to Invite Teammates (Step 5 is combined in SpaceSetupStep)
  };

  const handleFinalSubmit = (inviteEmails: string[]) => {
    startTransition(async () => {
      try {
        const res = await provisionWorkspaceAction({
          projectName: spaceName,
          projectKey: spaceKey,
          template: template === "SCRUM" ? "SCRUM" : "KANBAN",
          stages,
          inviteEmails,
        });

        if (res?.projectKey) {
          router.push(`/projects/${res.projectKey}/summary?onboarding=success`);
        } else {
          router.push("/projects");
        }
      } catch (err) {
        console.error("Provisioning error:", err);
        router.push("/projects");
      }
    });
  };

  return (
    <div className="min-h-screen bg-surface-sunken flex flex-col justify-between py-8 px-4">
      {/* Top Header & Wizard Stepper */}
      <header className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm">
              T
            </div>
            <span className="font-bold text-lg text-default tracking-tight">Trackly</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-subtle">
            <Sparkles size={14} className="text-brand" />
            <span>Interactive Onboarding</span>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 6, 7].map((stepNum, idx) => {
            const label = STEP_LABELS[idx];
            const isCurrent = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={stepNum} className="flex flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-brand"
                      : isCurrent
                      ? "bg-brand/80 animate-pulse ring-2 ring-brand/30"
                      : "bg-neutral-hovered"
                  }`}
                />
                <span
                  className={`text-[10px] font-mono font-bold truncate ${
                    isCurrent
                      ? "text-brand"
                      : isCompleted
                      ? "text-default"
                      : "text-subtlest"
                  }`}
                >
                  {isCompleted ? `✓ ${label}` : label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Active Step Body */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8">
        {step === 1 && (
          <GoogleAccountStep
            onNext={handleStep1Complete}
            currentUserEmail={userEmail}
            currentUserName={userName}
          />
        )}

        {step === 2 && <ProvisioningLoaderStep onComplete={handleStep2Complete} />}

        {step === 3 && <TemplateSelectStep onSelect={handleStep3Complete} />}

        {(step === 4 || step === 5) && (
          <SpaceSetupStep
            initialStages={stages}
            onNext={handleStep4Complete}
            onBack={() => setStep(3)}
          />
        )}

        {step === 6 && (
          <InviteTeammatesStep
            projectName={spaceName}
            onComplete={handleFinalSubmit}
            onBack={() => setStep(4)}
          />
        )}

        {isPending && (
          <div className="fixed inset-0 bg-surface/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
            <Rocket size={40} className="text-brand animate-bounce mb-3" />
            <p className="font-bold text-default text-lg">Launching Your Space...</p>
            <p className="text-xs text-subtle font-mono">Seeding initial checklist tasks & dashboard widgets</p>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-subtlest font-mono">
        Trackly Onboarding Architecture • Jira-inspired Flow Engine
      </footer>
    </div>
  );
}

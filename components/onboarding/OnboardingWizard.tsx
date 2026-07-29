"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Rocket } from "lucide-react";
import { RoleSelectStep, type RoleType } from "./RoleSelectStep";
import { TemplateSelectStep, type TemplateType } from "./TemplateSelectStep";
import { SpaceSetupStep } from "./SpaceSetupStep";
import { InviteTeammatesStep } from "./InviteTeammatesStep";
import { ProvisioningLoaderStep } from "./ProvisioningLoaderStep";
import { provisionWorkspaceAction } from "@/app/onboarding/actions";

const STEP_LABELS = [
  "Role Profile",
  "Template Preset",
  "Space & Workflow",
  "Teammates",
  "Provisioning",
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
  const [role, setRole] = useState<RoleType>("DEVELOPER");
  const [template, setTemplate] = useState<TemplateType>("KANBAN");
  const [stages, setStages] = useState<string[]>(["To Do", "In Progress", "In Review", "Done"]);
  const [spaceName, setSpaceName] = useState("Acme Rocket Launch");
  const [spaceKey, setSpaceKey] = useState("ROCKET");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [restrictedDomain, setRestrictedDomain] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("");

  const handleStep1RoleComplete = (_role: RoleType, recommendedTmpl: string) => {
    setRole(_role);
    if (
      recommendedTmpl === "KANBAN" ||
      recommendedTmpl === "SCRUM" ||
      recommendedTmpl === "WEB_DESIGN" ||
      recommendedTmpl === "BUG_TRACKING" ||
      recommendedTmpl === "OPERATIONS" ||
      recommendedTmpl === "MARKETING"
    ) {
      setTemplate(recommendedTmpl as TemplateType);
    }
    setStep(2);
  };

  const handleStep2TemplateComplete = (tmpl: TemplateType, defaultStages: string[]) => {
    setTemplate(tmpl);
    setStages(defaultStages);
    setStep(3);
  };

  const handleStep3SpaceComplete = (name: string, key: string, stgs: string[]) => {
    setSpaceName(name);
    setSpaceKey(key);
    setStages(stgs);
    setStep(4);
  };

  const handleStep4InviteComplete = (data: { emails: string[]; restrictedDomain: boolean; allowedDomain: string }) => {
    setInviteEmails(data.emails);
    setRestrictedDomain(data.restrictedDomain);
    setAllowedDomain(data.allowedDomain);
    setStep(5); // Go to Provisioning loader
  };

  const handleProvisioningComplete = () => {
    startTransition(async () => {
      try {
        const res = await provisionWorkspaceAction({
          projectName: spaceName,
          projectKey: spaceKey,
          template: template === "SCRUM" ? "SCRUM" : "KANBAN",
          stages,
          inviteEmails,
          restrictedDomain,
          allowedDomain,
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
            <span className="font-bold text-lg text-text tracking-tight">Trackly</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-text-subtle">
            <Sparkles size={14} className="text-brand" />
            <span>Jira-Inspired Onboarding</span>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-5 gap-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCurrent = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={label} className="flex flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-brand"
                      : isCurrent
                      ? "bg-brand/80 animate-pulse ring-2 ring-brand/30"
                      : "bg-neutral"
                  }`}
                />
                <span
                  className={`text-[10px] font-mono font-bold truncate ${
                    isCurrent
                      ? "text-brand"
                      : isCompleted
                      ? "text-text"
                      : "text-text-subtle"
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
        {step === 1 && <RoleSelectStep onNext={handleStep1RoleComplete} />}

        {step === 2 && <TemplateSelectStep onSelect={handleStep2TemplateComplete} />}

        {step === 3 && (
          <SpaceSetupStep
            initialStages={stages}
            onNext={handleStep3SpaceComplete}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <InviteTeammatesStep
            projectName={spaceName}
            userEmail={userEmail}
            onComplete={handleStep4InviteComplete}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && <ProvisioningLoaderStep onComplete={handleProvisioningComplete} />}

        {isPending && (
          <div className="fixed inset-0 bg-surface/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
            <Rocket size={40} className="text-brand animate-bounce mb-3" />
            <p className="font-bold text-text text-lg">Launching Your Workspace...</p>
            <p className="text-xs text-text-subtle font-mono">Seeding initial checklist tasks & dashboard widgets</p>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-text-subtle font-mono">
        Trackly Enterprise Engine • Multi-Tenant Onboarding Framework
      </footer>
    </div>
  );
}

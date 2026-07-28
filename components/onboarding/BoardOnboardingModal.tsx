"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, Layers, Search, Clock, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BoardOnboardingModal({ projectName }: { projectName?: string }) {
  let searchParams: URLSearchParams | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    searchParams = useSearchParams();
  } catch {
    searchParams = null;
  }

  let router: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }

  let pathname = "";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname() || "";
  } catch {
    pathname = "";
  }

  const [open, setOpen] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  useEffect(() => {
    if (searchParams && (searchParams.get("onboarding") === "true" || searchParams.get("welcome") === "true")) {
      setOpen(true);
    }
  }, [searchParams]);

  const handleDismiss = () => {
    setOpen(false);
    if (searchParams && router) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("onboarding");
      params.delete("welcome");
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      if (typeof router.replace === "function") {
        router.replace(newUrl, { scroll: false });
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[100] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-scale-in">
          {/* Top Banner */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <Sparkles size={20} />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text">
                  Welcome to {projectName || "your project board"}!
                </Dialog.Title>
                <p className="text-xs text-text-subtle font-medium">
                  3-Step Quick Interactive Onboarding Tour
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button onClick={handleDismiss} className="rounded-lg p-1.5 hover:bg-neutral-hovered transition-colors">
                <X size={16} className="text-text-subtle" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tour Steps */}
          <div className="py-5">
            {tourStep === 1 && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3 rounded-xl bg-surface-hover/80 border border-border/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text">1. Drag & Drop Workflow Stages</h4>
                    <p className="text-xs text-text-subtle mt-0.5">
                      Move task cards effortlessly between <strong>To Do</strong>, <strong>In Progress</strong>, <strong>In Review</strong>, and <strong>Done</strong>. WIP limits keep team workload balanced.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tourStep === 2 && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3 rounded-xl bg-surface-hover/80 border border-border/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Search size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text">2. Instant Search & Avatar Filters</h4>
                    <p className="text-xs text-text-subtle mt-0.5">
                      Filter the board by team members or type search keywords with 60fps instant response time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tourStep === 3 && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3 rounded-xl bg-surface-hover/80 border border-border/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text">3. Precise Work Logging (`1h 30m 45s`)</h4>
                    <p className="text-xs text-text-subtle mt-0.5">
                      Log hours, minutes, and seconds directly inside ticket details or using quick preset chips (`+15m`, `+1h`).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Dots & Action Buttons */}
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((stepNum) => (
                <button
                  key={stepNum}
                  onClick={() => setTourStep(stepNum)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    tourStep === stepNum ? "w-6 bg-brand" : "bg-border"
                  }`}
                  aria-label={`Go to step ${stepNum}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {tourStep < 3 ? (
                <Button
                  type="button"
                  appearance="primary"
                  onClick={() => setTourStep((prev) => Math.min(3, prev + 1))}
                  className="flex items-center gap-1.5"
                >
                  Next <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  type="button"
                  appearance="primary"
                  onClick={handleDismiss}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 size={15} /> Start Working
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import React from "react";
import { Sparkles, Zap, ShieldCheck, Layers, CheckCircle2, Lock } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-surface-sunken font-sans antialiased text-default selection:bg-brand-subtle">
      {/* Left Apple-Inspired Showcase Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] shrink-0 bg-[#0B0F19] p-12 relative overflow-hidden text-white shadow-2xl border-r border-white/10 select-none">
        {/* Ambient Glowing Mesh Background Blur Orbs */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[420px] h-[420px] rounded-full bg-indigo-600/25 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3.5 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 p-0.5 shadow-lg shadow-blue-500/30 ring-1 ring-white/25">
              <div className="w-full h-full bg-[#0B0F19]/60 backdrop-blur-md rounded-[14px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                  <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" />
                  <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
                  <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.4" />
                  <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" />
                </svg>
              </div>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Trackly</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15 backdrop-blur-md uppercase tracking-wider ml-auto">
              v2.4 Pro
            </span>
          </div>

          {/* Value Proposition Headline */}
          <h2 className="text-4xl font-extrabold text-white leading-[1.15] mb-4 tracking-tight">
            Software execution <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-200 bg-clip-text text-transparent">
              engineered for velocity.
            </span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-[380px] font-normal mb-8">
            Empower your engineering teams with real-time kanban boards, automated issue triage, and high-performance team workspaces.
          </p>

          {/* Live Apple Glass Product Card Showcase */}
          <div className="rounded-2xl apple-glass-card p-5 flex flex-col gap-4 transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-white/90">Production Workspace • Sprint 24</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                <CheckCircle2 size={12} /> Live Sync
              </span>
            </div>

            {/* Showcase Feature Items with Lucide Icons */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 transition-colors p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/20">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Autonomous Issue Triage</span>
                    <span className="text-[11px] text-white/60">Automated severity detection & spec drafting</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/20 uppercase shrink-0">
                  AI Ready
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 transition-colors p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                    <Zap size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Optimistic UI State</span>
                    <span className="text-[11px] text-white/60">Instant state mutations with automatic rollback</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 uppercase shrink-0">
                  Realtime
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 transition-colors p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/20">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Tenant Data Isolation</span>
                    <span className="text-[11px] text-white/60">Row-level security & multi-tenant privacy guard</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-400/20 uppercase shrink-0">
                  Encrypted
                </span>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/60 font-medium">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-white/40" /> Enterprise AES-256
              </span>
              <span className="text-emerald-400 font-semibold">99.99% Uptime SLA</span>
            </div>
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div className="relative z-10 flex flex-col gap-4 pt-8 border-t border-white/10">
          {[
            { icon: Zap, title: "Sub-10ms Sync Engine", desc: "Optimistic updates across all team boards" },
            { icon: Layers, title: "Custom Workflow Pipelines", desc: "Adaptable kanban swimlanes & custom issue states" },
            { icon: ShieldCheck, title: "Bank-Grade Compliance", desc: "Strict tenant isolation and audit logging" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/10 text-white/90 border border-white/10 shrink-0 mt-0.5">
                <f.icon size={15} />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{f.title}</p>
                <p className="text-white/60 text-[11px]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Container */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile Logo Header */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className="text-2xl font-black text-default tracking-tight">Trackly</span>
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>

        <p className="mt-10 text-center text-[11px] text-subtle font-medium max-w-[360px] leading-relaxed">
          Protected by Trackly Security Protocol • By continuing, you agree to our Terms of Service & Privacy Policy.
        </p>
      </div>
    </main>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-surface-sunken">
      {/* Left Branding Showcase Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-[#0062FF] via-[#4F46E5] to-[#1E1B4B] p-12 relative overflow-hidden text-white shadow-2xl">
        {/* Ambient Glowing Mesh Background Blur Spheres */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-blue-400/15 blur-2xl" />

        <div className="relative z-10">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl ring-4 ring-white/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="2" fill="#0062FF" />
                <rect x="14" y="3" width="7" height="7" rx="2" fill="#0062FF" opacity="0.6" />
                <rect x="3" y="14" width="7" height="7" rx="2" fill="#0062FF" opacity="0.4" />
                <rect x="14" y="14" width="7" height="7" rx="2" fill="#0062FF" />
              </svg>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Trackly</span>
          </div>

          {/* Value Proposition Headline */}
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Ship projects <br />
            <span className="bg-gradient-to-r from-blue-200 via-indigo-200 to-white bg-clip-text text-transparent">
              faster, together.
            </span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-[340px] font-medium">
            The next-generation project management software built for speed. Real-time boards, autonomous AI agents, and zero-latency workflows.
          </p>

          {/* Interactive Live Sprint Progress Showcase Card */}
          <div className="mt-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-2xl flex flex-col gap-3.5 transform transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active Sprint • SOU-Sprint 4</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                78% Complete
              </span>
            </div>

            {/* Sprint Completion Progress Bar */}
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full w-[78%] transition-all duration-1000" />
            </div>

            {/* Task Preview Pills */}
            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-1.5 border border-white/10">
                <span className="font-medium text-white/90 truncate">✓ OAuth2 PKCE Authentication Flow</span>
                <span className="text-[10px] font-bold text-emerald-300 uppercase">DONE</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-1.5 border border-white/10">
                <span className="font-medium text-white/90 truncate">⚡ 1-Click Release Notes Generator</span>
                <span className="text-[10px] font-bold text-amber-300 uppercase">REVIEW</span>
              </div>
            </div>

            {/* Active Team Member Avatars Stack */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-white/70 font-medium">
              <span>Live Team Presence</span>
              <div className="flex items-center -space-x-2">
                <div className="h-6 w-6 rounded-full bg-cyan-500 ring-2 ring-white/40 flex items-center justify-center font-bold text-[9px] text-white">
                  AL
                </div>
                <div className="h-6 w-6 rounded-full bg-purple-500 ring-2 ring-white/40 flex items-center justify-center font-bold text-[9px] text-white">
                  SA
                </div>
                <div className="h-6 w-6 rounded-full bg-emerald-500 ring-2 ring-white/40 flex items-center justify-center font-bold text-[9px] text-white">
                  YOU
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div className="relative z-10 flex flex-col gap-3.5 pt-8 border-t border-white/15">
          {[
            { icon: "⚡", title: "Instant Board Sync", desc: "Sub-10ms optimistic updates & drag operations" },
            { icon: "🤖", title: "Rovo AI Copilot", desc: "Autonomous ticket creator, triage & spec writer" },
            { icon: "🛡️", title: "Enterprise Security", desc: "Workspace tenant isolation & CockroachDB" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-base mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white text-xs font-bold">{f.title}</p>
                <p className="text-white/60 text-[11px]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Container */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile Logo Header */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-2xl font-black text-brand tracking-tight">Trackly</span>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>

        <p className="mt-8 text-center text-[11px] text-text-subtle font-medium">
          Protected by Trackly Security • By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </main>
  );
}

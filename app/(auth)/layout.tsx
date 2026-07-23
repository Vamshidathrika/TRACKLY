export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-surface-sunken">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 bg-[#007AFF] p-12 relative overflow-hidden">
        {/* Background gradient circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-9 h-9 bg-white rounded-[9px] flex items-center justify-center shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#007AFF" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#007AFF" opacity="0.6" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#007AFF" opacity="0.4" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#007AFF" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Trackly</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Ship projects
            <br />
            <span className="text-white/70">faster, together.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-[320px]">
            The clean, fast project tracker teams love. Plan sprints, track issues, ship confidently.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 flex flex-col gap-4">
          {[
            { icon: "⚡", title: "Instant updates", desc: "Real-time status across your whole team" },
            { icon: "🎯", title: "Smart sprints", desc: "Kanban & timeline views built for focus" },
            { icon: "🤖", title: "AI Co-Pilot", desc: "Auto-breakdown features into sprint tasks" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-white/50 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 bg-brand rounded-[8px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-xl font-bold text-brand tracking-tight">Trackly</span>
        </div>

        <div className="w-full max-w-[380px] animate-fade-in">
          {children}
        </div>

        <p className="mt-8 text-center text-[11px] text-subtlest">
          By continuing, you agree to Trackly&apos;s Terms of Service.
        </p>
      </div>
    </main>
  );
}

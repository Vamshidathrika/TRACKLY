"use client";
import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Shield, ArrowRight, AlertCircle } from "lucide-react";
import { signupAction } from "../actions";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ["bg-neutral", "bg-red-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["", "Weak", "Fair", "Strong"];

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? colors[strength] : "bg-neutral"}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${strength === 3 ? "text-emerald-600" : strength === 2 ? "text-amber-600" : "text-red-600"}`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-md mx-auto w-full">
      <div className="rounded-2xl border border-border bg-surface p-7 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">Create Workspace</h1>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-text-subtle bg-neutral/80 px-2.5 py-1 rounded-full border border-border">
              <Shield size={12} className="text-brand" />
              <span>Free Tier</span>
            </div>
          </div>
          <p className="text-xs text-text-subtle">Get started with Trackly for free — no credit card required</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="signup-name">
              Full Name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="Alex Johnson"
              required
              autoComplete="name"
              className="h-11 rounded-xl border border-border bg-neutral/20 px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-text-subtle focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
            />
          </div>

          {/* Work email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="signup-email">
              Work Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="h-11 rounded-xl border border-border bg-neutral/20 px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-text-subtle focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="signup-password">
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-border bg-neutral/20 px-3.5 pr-11 text-xs outline-none transition-all duration-200 placeholder:text-text-subtle focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors p-1 rounded-md"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Workspace name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="signup-site">
              Workspace Name
            </label>
            <input
              id="signup-site"
              name="siteName"
              type="text"
              placeholder="Acme Corp"
              required
              className="h-11 rounded-xl border border-border bg-neutral/20 px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-text-subtle focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
            />
          </div>

          {/* Error */}
          {state.error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs font-medium text-red-600">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full flex items-center justify-center rounded-xl bg-brand hover:bg-brand-hovered active:scale-[0.98] text-white text-xs font-bold transition-all duration-180 disabled:opacity-50 disabled:pointer-events-none shadow-md mt-1 cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating account…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Create Workspace</span>
                <ArrowRight size={14} />
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-xs text-text-subtle font-medium">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

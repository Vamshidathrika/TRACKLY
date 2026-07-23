"use client";
import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Check } from "lucide-react";
import { signupAction } from "../actions";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ["bg-neutral", "bg-danger", "bg-warning", "bg-success"];
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
      <p className={`text-[11px] font-medium ${strength === 3 ? "text-success" : strength === 2 ? "text-warning" : "text-danger"}`}>
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-default tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-subtle">Get started with Trackly for free</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        {/* Full name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-default" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            name="name"
            type="text"
            placeholder="Alex Johnson"
            required
            autoComplete="name"
            className="h-11 rounded-[10px] border border-border-default bg-surface px-3.5 text-sm outline-none transition-all placeholder:text-subtlest focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>

        {/* Work email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-default" htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            className="h-11 rounded-[10px] border border-border-default bg-surface px-3.5 text-sm outline-none transition-all placeholder:text-subtlest focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-default" htmlFor="signup-password">
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
              className="h-11 w-full rounded-[10px] border border-border-default bg-surface px-3.5 pr-11 text-sm outline-none transition-all placeholder:text-subtlest focus:border-brand focus:ring-3 focus:ring-brand/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-subtlest hover:text-subtle transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Workspace name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-default" htmlFor="signup-site">
            Workspace name
          </label>
          <input
            id="signup-site"
            name="siteName"
            type="text"
            placeholder="Your company or team name"
            required
            className="h-11 rounded-[10px] border border-border-default bg-surface px-3.5 text-sm outline-none transition-all placeholder:text-subtlest focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>

        {/* Error */}
        {state.error && (
          <div className="flex items-center gap-2 rounded-[8px] bg-danger/8 border border-danger/20 px-3 py-2.5">
            <span className="text-danger text-sm font-medium">{state.error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full flex items-center justify-center rounded-[10px] bg-brand text-white text-sm font-semibold hover:bg-brand-hovered active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm mt-1"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-subtle">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { loginAction, googleLoginAction, demoLoginAction } from "../actions";

export function LoginForm({
  googleEnabled = false,
  errorParam,
}: {
  googleEnabled?: boolean;
  errorParam?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(loginAction, {});
  const [demoState, demoAction, demoPending] = useActionState(demoLoginAction, {});

  const getOAuthErrorMessage = (code?: string) => {
    if (!code) return null;
    if (code === "OAuthCallback" || code === "Callback") {
      return "Sign in with Google failed. Please try again.";
    }
    if (code === "AccessDenied") {
      return "Access was denied during Google sign in.";
    }
    if (code === "Configuration") {
      return "Google sign in is not properly configured on the server.";
    }
    return "Authentication failed. Please try again.";
  };

  const errorMessage = state.error || demoState.error || getOAuthErrorMessage(errorParam);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-2">
          <span>Welcome back</span>
          <span className="text-xl">👋</span>
        </h1>
        <p className="text-xs text-text-subtle font-medium">
          Sign in to access your Trackly workspace & AI agents
        </p>
      </div>

      {/* 1-Click Demo Login Shortcut */}
      <form action={demoAction}>
        <button
          type="submit"
          disabled={demoPending || pending}
          className="w-full h-11 flex items-center justify-between px-4 rounded-xl bg-gradient-to-r from-brand/10 via-purple-500/10 to-indigo-500/10 border border-brand/30 hover:border-brand/60 text-brand font-bold text-xs shadow-xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500 fill-amber-500 animate-bounce" />
            <span>Quick 1-Click Demo Login</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <span>{demoPending ? "Signing in..." : "Instant Access"}</span>
            <ArrowRight size={14} />
          </div>
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
          Or sign in with email
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* Google SSO Button */}
      {googleEnabled && (
        <form action={googleLoginAction}>
          <button
            type="submit"
            disabled={pending || demoPending}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-border bg-surface hover:bg-neutral/60 transition-all text-xs font-bold text-text shadow-xs cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </button>
        </form>
      )}

      {/* Email / Password Form */}
      <form action={action} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-subtle uppercase tracking-wider" htmlFor="login-email">
            Email Address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 rounded-xl border border-border bg-surface px-3.5 text-xs outline-none transition-all placeholder:text-text-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
          />
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-subtle uppercase tracking-wider" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="text-xs font-bold text-brand hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 pr-11 text-xs outline-none transition-all placeholder:text-text-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs font-semibold text-danger animate-in fade-in duration-200">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending || demoPending}
          className="h-11 w-full flex items-center justify-center rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hovered active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md mt-1 cursor-pointer"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>Sign in to Workspace</span>
              <ArrowRight size={14} />
            </span>
          )}
        </button>
      </form>

      {/* Signup Redirection Link */}
      <div className="pt-2 text-center text-xs text-text-subtle font-medium border-t border-border/40">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-brand hover:underline">
          Create free account
        </Link>
      </div>
    </div>
  );
}

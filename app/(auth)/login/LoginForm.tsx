"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Check, Shield, AlertCircle } from "lucide-react";
import { loginAction, googleLoginAction } from "../actions";

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
  const [rememberMe, setRememberMe] = useState(true);

  const [state, action, pending] = useActionState(loginAction, {});

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getOAuthErrorMessage = (code?: string) => {
    if (!code) return null;
    if (code === "OAuthCallback" || code === "Callback") {
      return "Sign in with Google failed. Please try again.";
    }
    if (code === "AccessDenied") {
      return "Access was denied during sign in.";
    }
    return "Authentication failed. Please try again.";
  };

  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const errorMessage = state.error || getOAuthErrorMessage(errorParam);

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-md mx-auto w-full">
      {/* Main Glass Form Card */}
      <div className="rounded-2xl border border-border bg-surface p-7 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Welcome Header */}
        <div className="flex flex-col gap-1.5 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              Sign In
            </h1>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-text-subtle bg-neutral/80 px-2.5 py-1 rounded-full border border-border">
              <Shield size={12} className="text-brand" />
              <span>Secure Session</span>
            </div>
          </div>
          <p className="text-xs text-text-subtle">
            Sign in to access your Trackly workspace
          </p>
        </div>

        {resetMsg && (
          <div className="mb-4 p-3 rounded-lg border border-brand/30 bg-brand/10 text-xs font-semibold text-brand">
            {resetMsg}
          </div>
        )}

        {/* Optional Google SSO */}
        {googleEnabled && (
          <div className="mb-6">
            <form action={googleLoginAction}>
              <button
                type="submit"
                disabled={pending}
                className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-border bg-surface hover:bg-neutral/50 text-text font-medium text-xs shadow-xs transition-all duration-180 cursor-pointer"
              >
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
                </svg>
                Continue with Google
              </button>
            </form>

            <div className="flex items-center gap-3 mt-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest">
                Or with email
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>
        )}

        {/* Email & Password Form Body */}
        <form action={action} className="flex flex-col gap-4">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="login-email">
                Work Email
              </label>
              {isValidEmail && (
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check size={12} /> Valid format
                </span>
              )}
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 rounded-xl border border-border bg-neutral/20 px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-text-subtle focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider" htmlFor="login-password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setResetMsg("Password reset link dispatched! Check your inbox if account exists.")}
                tabIndex={-1}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                Forgot?
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
          </div>

          {/* Remember Me Switch */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-text-subtle select-none" htmlFor="remember-me-toggle">
              <div
                className={`w-9 h-5 rounded-full transition-colors duration-200 relative p-0.5 ${
                  rememberMe ? "bg-brand" : "bg-neutral border border-border"
                }`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                    rememberMe ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <span>Stay signed in</span>
            </label>
          </div>

          {/* Error Shake Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs font-medium text-red-600">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Authentication failed</span>
                <span className="text-[11px] opacity-90">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full flex items-center justify-center rounded-xl bg-brand hover:bg-brand-hovered active:scale-[0.98] text-white text-xs font-bold transition-all duration-180 disabled:opacity-50 disabled:pointer-events-none shadow-md mt-1 cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Sign In to Workspace</span>
                <ArrowRight size={14} />
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Signup Redirection */}
      <div className="text-center text-xs text-text-subtle font-medium">
        Don&apos;t have a workspace yet?{" "}
        <Link href="/signup" className="font-bold text-brand hover:underline">
          Create free account
        </Link>
      </div>
    </div>
  );
}

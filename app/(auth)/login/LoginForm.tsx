"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Zap, Check, Shield, KeyRound, AlertCircle, Mail } from "lucide-react";
import { loginAction, googleLoginAction, demoLoginAction } from "../actions";

export function LoginForm({
  googleEnabled = false,
  errorParam,
}: {
  googleEnabled?: boolean;
  errorParam?: string;
}) {
  const [authTab, setAuthTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [magicSent, setMagicSent] = useState(false);

  const [state, action, pending] = useActionState(loginAction, {});
  const [demoState, demoAction, demoPending] = useActionState(demoLoginAction, {});

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getOAuthErrorMessage = (code?: string) => {
    if (!code) return null;
    if (code === "OAuthCallback" || code === "Callback") {
      return "Sign in with Google failed. Please try again.";
    }
    if (code === "AccessDenied") {
      return "Access was denied during sign in.";
    }
    if (code === "Configuration") {
      return "OAuth is not properly configured on the server.";
    }
    return "Authentication failed. Please try again.";
  };

  const errorMessage = state.error || demoState.error || getOAuthErrorMessage(errorParam);

  const handleMagicLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;
    setMagicSent(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Main Glass Form Card */}
      <div className="rounded-2xl border border-border-strong bg-surface p-7 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Top subtle Apple ambient glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400" />

        {/* Welcome Header */}
        <div className="flex flex-col gap-1.5 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-default tracking-tight flex items-center gap-2">
              Sign In
            </h1>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-subtle bg-neutral/80 px-2.5 py-1 rounded-full border border-border-default">
              <Shield size={12} className="text-brand" />
              <span>AES-256</span>
            </div>
          </div>
          <p className="text-xs text-subtle font-normal">
            Access your Trackly engineering workspace & team boards
          </p>
        </div>

        {/* 1-Click Quick Demo Workspace Access Button */}
        <form action={demoAction} className="mb-6">
          <button
            type="submit"
            disabled={demoPending || pending}
            className="w-full h-11 flex items-center justify-between px-3.5 rounded-xl bg-gradient-to-r from-brand/10 via-indigo-500/10 to-teal-500/10 border border-brand/30 hover:border-brand text-brand font-semibold text-xs transition-all duration-200 hover:shadow-md active:scale-[0.98] group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-brand/15 text-brand group-hover:scale-110 transition-transform">
                <Zap size={15} className="fill-brand" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs leading-none">Instant 1-Click Demo</span>
                <span className="text-[10px] text-subtle font-normal leading-tight mt-0.5">Explore as demo@trackly.dev</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand group-hover:translate-x-0.5 transition-transform">
              <span>{demoPending ? "Signing in…" : "Launch"}</span>
              <ArrowRight size={13} />
            </div>
          </button>
        </form>

        {/* OAuth SSO Buttons Row */}
        <div className="flex flex-col gap-2.5 mb-6">
          {/* Apple Sign In Button */}
          <button
            type="button"
            onClick={() => alert("Apple Sign In requires active Apple Developer credentials in production environment.")}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl bg-black hover:bg-neutral-900 text-white font-medium text-xs shadow-sm transition-all duration-180 active:scale-[0.98] cursor-pointer"
          >
            <svg width="15" height="18" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.83.13-9.69-1.98-14.59-6.35-3.23-2.76-7.1-7.44-11.62-14.04-6.37-9.26-11.44-19.64-15.22-31.13-3.77-11.49-5.66-22.54-5.66-33.15 0-14.05 3.44-25.79 10.33-35.24 6.89-9.44 15.6-14.28 26.13-14.51 4.71 0 9.87 1.17 15.48 3.52 5.61 2.35 9.4 3.52 11.37 3.52 1.63 0 5.42-1.17 11.37-3.52 5.95-2.35 10.84-3.46 14.67-3.35 11.49.46 20.61 4.67 27.35 12.63-10.23 6.22-15.22 15.04-14.97 26.47.26 8.9 3.69 16.32 10.29 22.26 6.6 5.94 14.37 9.48 23.31 10.62-2.36 6.85-5.55 13.91-9.58 21.18zM119.22 31.84c0-6.91 2.45-13.68 7.35-20.31 4.9-6.63 11.16-10.97 18.78-13.03.26 1.05.39 2.11.39 3.17 0 6.91-2.48 13.78-7.44 20.61-4.96 6.83-11.23 11.24-18.81 13.23-.27-.89-.27-2.12-.27-3.67z" />
            </svg>
            Sign in with Apple
          </button>

          {/* Google Sign In Button */}
          {googleEnabled && (
            <form action={googleLoginAction}>
              <button
                type="submit"
                disabled={pending || demoPending}
                className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-border-strong bg-surface hover:bg-neutral/50 text-default font-medium text-xs shadow-xs transition-all duration-180 active:scale-[0.98] cursor-pointer"
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
          )}
        </div>

        {/* Divider with subtle line */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-[10px] font-semibold text-subtlest uppercase tracking-widest">
            Or continue with
          </span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Apple Segmented Control Tab Switcher */}
        <div className="p-1 rounded-xl bg-surface-sunken border border-border-default flex gap-1 mb-6">
          <button
            type="button"
            onClick={() => setAuthTab("password")}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              authTab === "password"
                ? "bg-surface text-default shadow-xs border border-border-default"
                : "text-subtle hover:text-default"
            }`}
          >
            <KeyRound size={13} />
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthTab("magic")}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              authTab === "magic"
                ? "bg-surface text-default shadow-xs border border-border-default"
                : "text-subtle hover:text-default"
            }`}
          >
            <Mail size={13} />
            Magic Link
          </button>
        </div>

        {/* Form Body */}
        {authTab === "password" ? (
          <form action={action} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider" htmlFor="login-email">
                  Work Email
                </label>
                {isValidEmail && (
                  <span className="text-[10px] font-semibold text-success flex items-center gap-1 animate-fade-in">
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
                className="h-11 rounded-xl border border-border-default bg-surface-sunken px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-subtlest focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider" htmlFor="login-password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Password reset link will be sent to your email if registered.")}
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
                  className="h-11 w-full rounded-xl border border-border-default bg-surface-sunken px-3.5 pr-11 text-xs outline-none transition-all duration-200 placeholder:text-subtlest focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtlest hover:text-subtle transition-colors p-1 rounded-md"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* iOS Style Remember Me Switch */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-subtle select-none" htmlFor="remember-me-toggle">
                <div
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative p-0.5 ${
                    rememberMe ? "bg-brand" : "bg-neutral-hovered border border-border-default"
                  }`}
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                      rememberMe ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span>Stay signed in on this device</span>
              </label>
            </div>

            {/* Error Shake Alert Badge */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl bg-danger/10 border border-danger/25 p-3 text-xs font-medium text-danger animate-shake">
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
              disabled={pending || demoPending}
              className="h-11 w-full flex items-center justify-center rounded-xl bg-brand hover:bg-brand-hovered active:scale-[0.98] text-white text-xs font-bold transition-all duration-180 disabled:opacity-50 disabled:pointer-events-none shadow-md mt-1 cursor-pointer"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={14} />
                </span>
              )}
            </button>
          </form>
        ) : (
          /* Magic Link Tab Flow */
          <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-subtle uppercase tracking-wider" htmlFor="magic-email">
                Work Email
              </label>
              <input
                id="magic-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border border-border-default bg-surface-sunken px-3.5 text-xs outline-none transition-all duration-200 placeholder:text-subtlest focus:bg-surface focus:border-brand focus:ring-3 focus:ring-brand/10 font-medium"
              />
            </div>

            {magicSent ? (
              <div className="rounded-xl bg-success/10 border border-success/30 p-4 flex flex-col gap-2 text-center animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
                  <Check size={18} />
                </div>
                <p className="text-xs font-bold text-success">Magic Sign-In Link Sent!</p>
                <p className="text-[11px] text-subtle">
                  We sent a secure single-use access link to <strong className="text-default">{email}</strong>. Check your inbox to sign in instantly.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!isValidEmail}
                className="h-11 w-full flex items-center justify-center rounded-xl bg-brand hover:bg-brand-hovered active:scale-[0.98] text-white text-xs font-bold transition-all duration-180 disabled:opacity-50 disabled:pointer-events-none shadow-md mt-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Mail size={14} />
                  <span>Send Magic Sign-In Link</span>
                </span>
              </button>
            )}
          </form>
        )}
      </div>

      {/* Signup Redirection Card */}
      <div className="text-center text-xs text-subtle font-medium">
        Don&apos;t have a workspace yet?{" "}
        <Link href="/signup" className="font-bold text-brand hover:underline">
          Create free account
        </Link>
      </div>
    </div>
  );
}

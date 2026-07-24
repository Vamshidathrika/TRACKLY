"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, googleLoginAction } from "../actions";
import { Button } from "@/components/ui/Button";

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

  const errorMessage = state.error || getOAuthErrorMessage(errorParam);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-default tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-subtle">Sign in to continue to Trackly</p>
      </div>

      {/* Google SSO */}
      {googleEnabled && (
        <form action={googleLoginAction}>
          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-[10px] border border-border-default bg-surface hover:bg-neutral transition-all text-sm font-medium text-default shadow-xs"
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

      {/* Divider */}
      {googleEnabled && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-[11px] font-semibold text-subtlest uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>
      )}

      {/* Email/Password Form */}
      <form action={action} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-default" htmlFor="login-email">
            Email
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
            className="h-11 rounded-[10px] border border-border-default bg-surface px-3.5 text-sm outline-none transition-all placeholder:text-subtlest focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-default" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="text-[12px] font-medium text-brand hover:underline"
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
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-[8px] bg-danger/8 border border-danger/20 px-3 py-2.5">
            <span className="text-danger text-sm font-medium">{errorMessage}</span>
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
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Signup link */}
      <p className="text-center text-sm text-subtle">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  );
}

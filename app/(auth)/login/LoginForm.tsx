"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { loginAction, googleLoginAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm({
  googleEnabled = false,
}: {
  googleEnabled?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <div className="flex flex-col gap-4">
      {googleEnabled && (
        <form action={googleLoginAction} className="flex flex-col">
          <Button
            type="submit"
            appearance="default"
            disabled={pending}
            className="w-full justify-center gap-2 py-2.5 font-semibold border border-border"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </Button>
        </form>
      )}

      <div className="relative my-1 flex items-center justify-center">
        <span className="absolute bg-surface px-2 text-xs font-semibold text-text-subtle">OR SIGN IN MANUALLY</span>
        <div className="w-full border-t border-border" />
      </div>

      <form action={action} className="flex flex-col gap-3">
        <Input
          name="email"
          type="email"
          label="Email Address"
          placeholder="e.g. alex@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          name="password"
          type="password"
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {state.error && (
          <p className="text-xs font-semibold text-danger">{state.error}</p>
        )}

        <Button appearance="default" type="submit" disabled={pending} className="justify-center font-medium">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <Link href="/signup" className="mt-2 text-center text-sm font-medium text-brand hover:underline">
        Create a new account
      </Link>
    </div>
  );
}

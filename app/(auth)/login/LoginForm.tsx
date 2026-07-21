"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { loginAction, demoLoginAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(loginAction, {});
  const [demoState, demoAction, demoPending] = useActionState(demoLoginAction, {});

  return (
    <div className="flex flex-col gap-4">
      {/* Direct One-Click Demo Login Banner */}
      <form action={demoAction} className="flex flex-col">
        <Button
          type="submit"
          appearance="primary"
          disabled={pending || demoPending}
          className="w-full justify-center bg-[#0052CC] hover:bg-[#0747A6] text-white py-2.5 font-bold shadow-sm"
        >
          {demoPending ? "Logging in to Demo..." : "⚡ One-Click Demo Login"}
        </Button>
        <p className="mt-1 text-center text-xs text-text-subtle">
          Pre-configured demo account (`demo@trackly.dev`)
        </p>
      </form>

      <div className="relative my-1 flex items-center justify-center">
        <span className="absolute bg-surface px-2 text-xs font-semibold text-text-subtle">OR SIGN IN MANUALLY</span>
        <div className="w-full border-t border-border" />
      </div>

      <form action={action} className="flex flex-col gap-3">
        <Input
          name="email"
          type="email"
          label="Email Address"
          placeholder="e.g. demo@trackly.dev"
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

        {(state.error || demoState.error) && (
          <p className="text-xs font-semibold text-danger">{state.error || demoState.error}</p>
        )}

        <Button appearance="default" type="submit" disabled={pending || demoPending} className="justify-center font-medium">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <Link href="/signup" className="mt-2 text-center text-sm font-medium text-brand hover:underline">
        Create a new account
      </Link>
    </div>
  );
}

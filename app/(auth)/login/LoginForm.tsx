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
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        <p className="text-center text-sm font-medium text-text-subtle">Log in to continue</p>
        
        <Input
          name="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {(state.error || demoState.error) && (
          <p className="text-xs text-danger">{state.error || demoState.error}</p>
        )}

        <Button appearance="primary" type="submit" disabled={pending || demoPending} className="justify-center">
          {pending ? "Logging in…" : "Continue"}
        </Button>
      </form>

      <div className="relative my-1 flex items-center justify-center">
        <span className="absolute bg-surface px-2 text-xs text-text-subtle">OR</span>
        <div className="w-full border-t border-border" />
      </div>

      <form action={demoAction} className="flex flex-col">
        <Button
          type="submit"
          appearance="subtle"
          disabled={pending || demoPending}
          className="justify-center border border-border bg-[#F4F5F7] font-semibold text-text hover:bg-[#EBECF0]"
        >
          {demoPending ? "Logging in to Demo…" : "⚡ One-click Demo Login"}
        </Button>
      </form>

      <Link href="/signup" className="mt-2 text-center text-sm text-brand hover:underline">
        Create an account
      </Link>
    </div>
  );
}

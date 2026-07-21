"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-text-subtle">Log in to continue</p>
      <Input name="email" type="email" placeholder="Enter your email" required />
      <Input name="password" type="password" placeholder="Enter password" required />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button appearance="primary" type="submit" disabled={pending} className="justify-center">
        {pending ? "Logging in…" : "Continue"}
      </Button>
      <Link href="/signup" className="text-center text-sm text-brand hover:underline">Create an account</Link>
    </form>
  );
}

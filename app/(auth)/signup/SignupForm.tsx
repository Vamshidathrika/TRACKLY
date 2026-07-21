"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-text-subtle">Sign up to continue</p>
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <Input name="password" type="password" placeholder="Password (8+ characters)" required />
      <Input name="siteName" placeholder="Site name (e.g. your company)" required />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button appearance="primary" type="submit" disabled={pending} className="justify-center">
        {pending ? "Creating…" : "Sign up"}
      </Button>
      <Link href="/login" className="text-center text-sm text-brand hover:underline">Already have an account? Log in</Link>
    </form>
  );
}

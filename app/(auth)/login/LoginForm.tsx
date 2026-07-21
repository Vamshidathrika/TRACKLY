"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(loginAction, {});

  const handleDemoFill = () => {
    setEmail("demo@trackly.dev");
    setPassword("password123");
  };

  return (
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

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <Button appearance="primary" type="submit" disabled={pending} className="justify-center">
        {pending ? "Logging in…" : "Continue"}
      </Button>

      <div className="relative my-2 flex items-center justify-center">
        <span className="absolute bg-surface px-2 text-xs text-text-subtle">OR</span>
        <div className="w-full border-t border-border" />
      </div>

      <Button
        type="submit"
        appearance="subtle"
        disabled={pending}
        onClick={handleDemoFill}
        className="justify-center border border-border bg-[#F4F5F7] font-semibold text-text hover:bg-[#EBECF0]"
      >
        ⚡ One-click Demo Login
      </Button>

      <Link href="/signup" className="mt-2 text-center text-sm text-brand hover:underline">
        Create an account
      </Link>
    </form>
  );
}

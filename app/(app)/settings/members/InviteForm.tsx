"use client";
import { useActionState } from "react";
import { inviteMemberAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, {} as { error?: string; link?: string });
  return (
    <form action={action} className="flex max-w-2xl items-end gap-2">
      <div className="flex-1"><Input name="email" type="email" label="Invite a member" placeholder="teammate@company.com" required /></div>
      <Button appearance="primary" type="submit" disabled={pending}>{pending ? "Inviting…" : "Invite"}</Button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.link && <p className="text-xs text-success">Invite link: <a className="underline" href={state.link}>{state.link}</a></p>}
    </form>
  );
}

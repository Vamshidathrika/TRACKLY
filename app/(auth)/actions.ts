"use server";
import { z } from "zod";
import { AuthError } from "next-auth";
import { createAccount } from "@/lib/signup";
import { signIn } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  siteName: z.string().min(1, "Site name is required"),
  inviteToken: z.string().optional(),
  callbackUrl: z.string().optional(),
});

/**
 * Only same-origin paths are accepted as a post-signup destination. An
 * attacker-supplied absolute URL here would turn signup into an open redirect,
 * and `//evil.com` is a protocol-relative URL, not a local path.
 */
function safeCallback(raw?: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/your-work";
  return raw;
}

export async function signupAction(_prev: { error?: string }, formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createAccount(parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") return { error: "An account with this email already exists" };
    if (e instanceof Error && e.message === "INVITE_INVALID") {
      return { error: "This invitation is not valid for that email address, or it has expired." };
    }
    throw e;
  }
  // Honour the invite's callbackUrl. This previously always sent the user to
  // /your-work, so an invited user never reached /invite/[token] and their
  // invite was never accepted through the token-checked path.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: safeCallback(parsed.data.callbackUrl),
  });
  return {};
}

export async function loginAction(_prev: { error?: string }, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/your-work",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password" };
    throw e; // NEXT_REDIRECT must propagate
  }
}

export async function googleLoginAction() {
  // signIn throws NEXT_REDIRECT on success, so there is nothing to return.
  await signIn("google", { redirectTo: "/your-work" });
}

export async function demoLoginAction() {
  // Hiding the button is not enough: server actions are POST-able directly, so
  // the demo account has to be refused here too.
  if (process.env.NODE_ENV === "production") {
    return { error: "Demo login is disabled in production" };
  }
  try {
    await signIn("credentials", {
      email: "demo@trackly.dev",
      password: "password123",
      redirectTo: "/your-work",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password" };
    throw e;
  }
}

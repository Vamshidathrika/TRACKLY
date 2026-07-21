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
});

export async function signupAction(_prev: { error?: string }, formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createAccount(parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") return { error: "An account with this email already exists" };
    throw e;
  }
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/your-work" });
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

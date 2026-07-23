"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (isRedirectError(error) || error.digest?.startsWith("NEXT_REDIRECT")) {
    throw error;
  }

  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-bold text-text">Something went wrong</h1>
      <p className="max-w-md text-sm text-text-subtle">
        This page hit an unexpected error. Your data is safe — retrying usually fixes it.
      </p>
      {/* Surface error digest & error message for diagnostic visibility */}
      <div className="flex flex-col gap-1 max-w-lg w-full bg-neutral/50 p-3 rounded-lg border border-border text-left font-mono text-[11px]">
        {error.digest && (
          <p className="text-text-subtle">Reference: <span className="font-bold text-text">{error.digest}</span></p>
        )}
        {error.message && (
          <p className="text-danger font-semibold break-words leading-relaxed">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex items-center justify-center flex-wrap gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hovered transition-colors shadow-xs"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="rounded-lg bg-brand/10 border border-brand/30 text-brand px-4 py-2 text-sm font-semibold hover:bg-brand/20 transition-colors"
        >
          Sign In / Re-authenticate
        </Link>
        <Link
          href="/your-work"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-neutral-hovered transition-colors"
        >
          Back to Your work
        </Link>
      </div>
    </div>
  );
}

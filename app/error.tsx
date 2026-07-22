"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-bold text-text">Something went wrong</h1>
      <p className="max-w-md text-sm text-text-subtle">
        This page hit an unexpected error. Your data is safe — retrying usually fixes it.
      </p>
      {/* The digest is the only handle on the server-side stack, so surface it. */}
      {error.digest && (
        <p className="font-mono text-[11px] text-text-subtle">Reference: {error.digest}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="rounded-ds bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hovered"
        >
          Try again
        </button>
        <Link
          href="/your-work"
          className="rounded-ds border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-neutral-hovered"
        >
          Back to Your work
        </Link>
      </div>
    </div>
  );
}

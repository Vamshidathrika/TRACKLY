"use client";

import { useEffect } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default function GlobalError({
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
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f8f9",
          color: "#172b4d",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "18px", margin: 0 }}>Trackly could not load</h1>
        <p style={{ fontSize: "14px", color: "#626f86", maxWidth: "420px" }}>
          A fatal error stopped the app from rendering. Reloading usually fixes it.
        </p>
        {error.digest && (
          <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#626f86" }}>
            Reference: {error.digest}
          </p>
        )}
        {error.message && (
          <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#de350b", maxWidth: "500px", wordBreak: "break-word" }}>
            {error.message}
          </p>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: "4px",
              background: "#0c66e4",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <a
            href="/login"
            style={{
              borderRadius: "4px",
              background: "#e9f2ff",
              color: "#0c66e4",
              fontSize: "14px",
              fontWeight: 600,
              padding: "8px 16px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign In
          </a>
        </div>
      </body>
    </html>
  );
}

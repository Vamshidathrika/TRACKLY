"use client";

import { useEffect } from "react";

export function RecentTracker({ projectKey }: { projectKey: string }) {
  useEffect(() => {
    try {
      const storageKey = "trackly-recent-projects";
      const existing: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      const updated = [projectKey, ...existing.filter((k) => k !== projectKey)].slice(0, 5);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [projectKey]);

  return null;
}

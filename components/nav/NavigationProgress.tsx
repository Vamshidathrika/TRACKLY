"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearIntervals = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  // Complete and hide progress bar when navigation finishes (pathname/searchParams change)
  useEffect(() => {
    clearIntervals();

    // Fill to 100% then reset and hide
    setProgress(100);
    resetTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 300);

    return () => clearIntervals();
  }, [pathname, searchParams]);

  // Intercept link clicks for instant visual feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        target.target === "_blank"
      ) {
        return;
      }

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);

        if (
          currentUrl.origin === targetUrl.origin &&
          currentUrl.href !== targetUrl.href
        ) {
          clearIntervals();
          setIsLoading(true);
          setProgress(20);

          intervalRef.current = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) return prev;
              const diff = 90 - prev;
              return prev + Math.max(1, Math.floor(diff * 0.15));
            });
          }, 100);
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
      clearIntervals();
    };
  }, []);

  if (!isLoading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-brand transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,82,204,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}


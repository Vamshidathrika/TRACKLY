"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset loading state when pathname or searchParams change
  useEffect(() => {
    setIsLoading(false);
    setProgress(100);
    const timeout = setTimeout(() => {
      setProgress(0);
    }, 200);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Intercept link clicks for instant visual feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || target.target === "_blank") {
        return;
      }

      // If it's navigating to a different path
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.href);

      if (currentUrl.href !== targetUrl.href) {
        setIsLoading(true);
        setProgress(30);

        const interval = setInterval(() => {
          setProgress((prev) => (prev >= 85 ? prev : prev + 10));
        }, 150);

        setTimeout(() => clearInterval(interval), 3000);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
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

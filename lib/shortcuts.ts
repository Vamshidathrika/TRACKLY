import { useEffect, useRef } from "react";

export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    !!t.isContentEditable
  );
}

type KeyEvent = { key: string; metaKey: boolean; ctrlKey: boolean; target: EventTarget | null };

export function matchShortcut(
  e: KeyEvent,
  binding: string,
  pending: string | null
): { match: boolean; pending: string | null } {
  const mod = e.metaKey || e.ctrlKey;
  if (binding.startsWith("mod+")) {
    const expectedKey = binding.slice(4).toLowerCase();
    const actualKey = e.key.toLowerCase();
    return { match: mod && actualKey === expectedKey, pending: null };
  }

  if (mod) return { match: false, pending: null };

  const parts = binding.split(" ");
  if (parts.length === 2) {
    if (pending === parts[0]) {
      return { match: e.key.toLowerCase() === parts[1].toLowerCase(), pending: null };
    }
    if (e.key.toLowerCase() === parts[0].toLowerCase()) {
      return { match: false, pending: parts[0] };
    }
    return { match: false, pending: null };
  }

  return { match: e.key.toLowerCase() === binding.toLowerCase(), pending: null };
}

export function useShortcuts(map: Record<string, () => void>) {
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target) && !(e.metaKey || e.ctrlKey)) return;

      const keyEvent = {
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        target: e.target,
      };

      for (const [binding, fn] of Object.entries(map)) {
        const res = matchShortcut(keyEvent, binding, pendingRef.current);
        if (res.match) {
          e.preventDefault();
          pendingRef.current = null;
          if (timerRef.current) clearTimeout(timerRef.current);
          fn();
          return;
        }
        if (res.pending) {
          pendingRef.current = res.pending;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            pendingRef.current = null;
          }, 1000);
          return;
        }
      }
      pendingRef.current = null;
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map]);
}

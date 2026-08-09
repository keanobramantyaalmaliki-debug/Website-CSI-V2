import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

/**
 * SSR-safe default `false` (mobile-first) — situs ini SPA Vite tanpa SSR,
 * jadi jalur ini praktis tak terpakai, tapi useSyncExternalStore mewajibkannya.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

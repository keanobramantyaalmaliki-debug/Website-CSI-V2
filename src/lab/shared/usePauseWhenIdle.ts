import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * usePauseWhenIdle — true ketika simulasi SEBAIKNYA berhenti.
 *
 * Gabung tiga sinyal, mengikuti guardrail yang sama dengan NetworkField &
 * acceptance checks skill matterjs:
 *   1. prefers-reduced-motion  → hormati preferensi aksesibilitas
 *   2. document.hidden         → tab tak terlihat, jangan buang CPU/baterai
 *   3. elemen keluar viewport  → IntersectionObserver
 *
 * Dikembalikan sebagai satu boolean `paused` supaya komponen scene cukup
 * memeriksa satu nilai di useFrame.
 */
export function usePauseWhenIdle(ref: RefObject<HTMLElement | null>): boolean {
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const roRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    roRef.current = io;
    return () => io.disconnect();
  }, [ref]);

  return reduced || hidden || offscreen;
}

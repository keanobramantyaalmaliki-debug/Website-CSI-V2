"use client";

import { useEffect } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Amati section konten & set activeSection ke section yang melewati tengah viewport.
 * rootMargin -45%/-45% mempersempit "garis deteksi" ke pita tipis di tengah layar,
 * jadi section tinggi jadi active tepat saat isinya berada di tengah — bukan saat
 * tepi atasnya baru menyentuh viewport.
 */
export function useScrollSpy(sectionIds: string[]) {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Lacak rasio tiap section; yang tertinggi & benar-benar terlihat = active.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        setActiveSection(bestRatio > 0 ? bestId : null);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      setActiveSection(null);
    };
  }, [sectionIds, setActiveSection]);
}

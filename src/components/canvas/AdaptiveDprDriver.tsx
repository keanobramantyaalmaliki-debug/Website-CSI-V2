"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdaptiveDprController,
  DPR_LADDER,
  loadLadderIndex,
  saveLadderIndex,
} from "./adaptiveDpr";
import { isSceneActive } from "./renderPace";

/**
 * Titik sambung termostat resolusi — kebijakan & jebakan yang dijaganya ada
 * di adaptiveDpr.ts, file ini cuma mengalirkan interval tick ke controller
 * dan menyalurkan keputusannya keluar Canvas.
 *
 * Nama file SENGAJA bukan "AdaptiveDpr.tsx": di filesystem macOS yang
 * case-insensitive, nama itu bentrok dengan adaptiveDpr.ts (beda kapital
 * saja) dan resolver TypeScript menolaknya (TS1149).
 *
 * ⚠️ `onChange` WAJIB berujung ke state React yang dipasang balik sebagai
 * prop `dpr={...}` di <Canvas> (Scene.tsx) — BUKAN setDpr() imperatif dari
 * sini. Pelajaran yang sama dengan FrameloopGate: tiap re-render <Canvas>,
 * R3F menyinkronkan ulang prop-nya dan menimpa panggilan imperatif. Lewat
 * state, R3F sendiri yang menjaga nilainya.
 *
 * Interval diukur pakai performance.now() SENDIRI, bukan delta R3F — clock
 * R3F di-reset oleh perubahan frameloop (FrameloopGate keluar-masuk hero)
 * dan delta pertamanya bohong. Pelajaran yang sama dengan gerbang sweep di
 * Office.tsx. Jeda panjang (pause gate, pindah tab) jatuh ke ambang STALL_MS
 * controller dan dibuang, bukan dihitung.
 *
 * Tidak di-mount sama sekali saat ada override ?dpr= — lihat Scene.tsx.
 */

/**
 * Tunggu segini setelah tick pertama sebelum controller diberi makan:
 * melewati kompilasi shader + sapuan reveal awal (~3 dtk + ekor), yang
 * frame time-nya bukan representasi beban normal. Angka stall-nya besar
 * memang tertangkap STALL_MS, tapi ekor sesudahnya (GC, upload texture
 * susulan) tetap kotor — lebih murah menunggu daripada memfilternya.
 */
const HOLDOFF_MS = 6000;

declare global {
  interface Window {
    __adaptiveDpr?: () => { dpr: number; index: number; locked: boolean };
  }
}

export default function AdaptiveDprDriver({
  onChange,
}: {
  onChange: (dpr: number) => void;
}) {
  const controller = useRef<AdaptiveDprController | null>(null);
  if (controller.current === null) {
    controller.current = new AdaptiveDprController(loadLadderIndex());
  }

  // Jendela intip probe/console — pasangan window.__renderPace. Di effect,
  // bukan di badan render: badan render bisa di-replay StrictMode.
  useEffect(() => {
    window.__adaptiveDpr = () => ({
      dpr: DPR_LADDER[controller.current!.index],
      index: controller.current!.index,
      locked: controller.current!.locked,
    });
    return () => {
      delete window.__adaptiveDpr;
    };
  }, []);

  const firstTickAt = useRef<number | null>(null);
  const prevTickAt = useRef<number | null>(null);

  useFrame(() => {
    const now = performance.now();
    const prev = prevTickAt.current;
    prevTickAt.current = now;
    if (prev === null) {
      firstTickAt.current = now;
      return;
    }
    if (now - (firstTickAt.current ?? now) < HOLDOFF_MS) return;

    const next = controller.current!.feed(now - prev, isSceneActive(now));
    if (next !== null) {
      saveLadderIndex(controller.current!.index);
      onChange(next);
    }
  });

  return null;
}

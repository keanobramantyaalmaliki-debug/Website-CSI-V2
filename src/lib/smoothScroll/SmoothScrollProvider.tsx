"use client";

import Lenis from "lenis";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { SmoothScrollContext, type SmoothScrollApi } from "./context";
import {
  nativeScrollTo,
  type ScrollTarget,
  type SmoothScrollToOptions,
} from "./nativeScroll";
import { useAnchorScroll } from "./useAnchorScroll";

/** Kunci milik LoadingScreen: terpasang sejak mount, dilepas saat overlay hilang. */
const LOADER_LOCK = "loader";

/**
 * SATU ticker untuk scroll DAN animasi.
 *
 * Lenis dijalankan dengan `autoRaf: false` lalu di-drive dari rAF loop milik
 * `motion`. Kalau keduanya memakai rAF sendiri-sendiri, urutan dalam satu frame
 * jadi tak tentu: Lenis bisa memindahkan scroll SESUDAH useScroll/useTransform
 * membaca posisinya, sehingga tiap elemen yang digerakkan scroll (canvas Hero,
 * parallax) tertinggal satu frame — terbaca sebagai getar halus saat scroll.
 *
 * Dengan satu ticker, scroll diperbarui lebih dulu dan animasi membacanya di
 * frame yang sama.
 *
 * `lenis.raf()` menerima MILIDETIK, dan `useAnimationFrame` memang memberi
 * milidetik — diteruskan apa adanya, jangan dikonversi.
 */
function LenisTicker({ lenis }: { lenis: Lenis }) {
  useAnimationFrame((timeMs) => lenis.raf(timeMs));
  return null;
}

/**
 * Menyediakan scroll halus untuk seluruh shell.
 *
 * Lenis menggerakkan posisi scroll NATIVE (bukan transform pada wrapper), jadi
 * `position: sticky` di Hero, IntersectionObserver di useScrollSpy /
 * useScrollStepper, dan `useScroll` dari motion tetap membaca angka yang sama
 * seperti sebelumnya. Itu sebabnya pendekatan ini dipilih ketimbang
 * locomotive-scroll yang men-transform kontainernya.
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const loaderDone = useSceneStore((s) => s.loaderDone);

  // `lenis` (state) hanya untuk merender ticker; `lenisRef` untuk dibaca dari
  // callback tanpa membuat ulang identitas API tiap kali instance-nya berubah.
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Loader sudah menahan sejak render pertama: tanpa ini ada satu jendela
  // singkat di mana halaman bisa digulir di balik overlay.
  const locksRef = useRef<Set<string> | null>(null);
  locksRef.current ??= new Set([LOADER_LOCK]);

  /**
   * Terapkan keadaan kunci ke Lenis SEKARANG JUGA — bukan lewat state + efek.
   *
   * Lenis yang berhenti memasang `.lenis-stopped { overflow: clip }` pada <html>,
   * dan itu memotong SEMUA scroll, termasuk yang programatik. Kalau pelepasan
   * kuncinya tertunda satu tick, `scrollTo()` yang dipanggil tepat sesudahnya
   * diam-diam tidak menghasilkan apa-apa.
   */
  const applyLocks = useCallback(() => {
    const instance = lenisRef.current;
    if (!instance) return;
    if (locksRef.current!.size > 0) instance.stop();
    else instance.start();
  }, []);

  const lock = useCallback(
    (id: string) => {
      locksRef.current!.add(id);
      applyLocks();
    },
    [applyLocks],
  );

  const unlock = useCallback(
    (id: string) => {
      locksRef.current!.delete(id);
      applyLocks();
    },
    [applyLocks],
  );

  // prefers-reduced-motion: Lenis tidak dibuat SAMA SEKALI, bukan dibuat lalu
  // dimatikan. Tidak ada instance berarti tidak ada rAF loop yang jalan terus,
  // tidak ada listener wheel/touch yang dipasang, dan scroll benar-benar milik
  // browser lagi.
  useEffect(() => {
    if (reduced) return;

    // `anchors` sengaja dibiarkan default (false) — lihat useAnchorScroll.
    const instance = new Lenis({ autoRaf: false });

    lenisRef.current = instance;
    setLenis(instance);
    applyLocks();

    return () => {
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [reduced, applyLocks]);

  useEffect(() => {
    if (loaderDone) unlock(LOADER_LOCK);
    else lock(LOADER_LOCK);
  }, [loaderDone, lock, unlock]);

  const scrollTo = useCallback(
    (target: ScrollTarget, options?: SmoothScrollToOptions) => {
      const instance = lenisRef.current;
      if (!instance) {
        nativeScrollTo(target, options);
        return;
      }
      instance.scrollTo(target, {
        immediate: options?.immediate ?? false,
        offset: options?.offset ?? 0,
        // Pemanggilan programatik selalu dituruti walau Lenis sedang stop —
        // navigasi route & tautan "Talk to us" tidak boleh tergantung pada
        // apakah kebetulan ada overlay yang sedang menahan scroll.
        force: true,
      });
    },
    [],
  );

  useAnchorScroll(lenis !== null, scrollTo);

  // Identitas API sengaja dijaga stabil (semua anggotanya useCallback kosong
  // dependency) supaya aman dipakai sebagai dependency efek di RoomRouteSync
  // tanpa memicu scroll ulang setiap Lenis dibuat/dibuang.
  const api = useMemo<SmoothScrollApi>(
    () => ({ scrollTo, lock, unlock }),
    [scrollTo, lock, unlock],
  );

  return (
    <SmoothScrollContext.Provider value={api}>
      {lenis && <LenisTicker lenis={lenis} />}
      {children}
    </SmoothScrollContext.Provider>
  );
}

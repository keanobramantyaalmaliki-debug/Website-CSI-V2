"use client";

import { Suspense, lazy, useEffect, useRef } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import ChunkBoundary from "@/components/ChunkBoundary";
import { shouldPrefetchBilliard } from "./prefetchRule";

/**
 * Gerbang pemuatan minigame billiard.
 *
 * ── Apa yang sebenarnya mahal ──────────────────────────────────────────────
 * Bukan simulasi fisikanya: `BilliardGame` sudah menggerbangi `s.step()` di
 * balik `active`, jadi tidak ada dunia yang disimulasikan selama tur. Yang
 * terbuang adalah dua hal yang dibayar SETIAP pengunjung, termasuk yang tidak
 * pernah menyentuh meja:
 *
 *   1. `billiard_balls.glb` (887 KB) + `billiard_cue.glb` (94 KB) diunduh &
 *      di-parse. Di perangkat sentuh minigame-nya MATI TOTAL (INVARIANTS §6),
 *      jadi ~1 MB itu murni sia-sia di jaringan seluler.
 *   2. 16 mesh bola ikut dirender tiap frame — tergeletak di lantai sebelah
 *      meja sepanjang kunjungan.
 *
 * Catatan yang menyelamatkan waktu orang berikutnya: `directionalLight` di
 * `BilliardLights` TIDAK ikut mahal walau selalu ter-mount. Ia
 * `layers.set(DYN_LAYER)` sementara kamera tetap di layer 0, dan three
 * mengumpulkan lampu lewat `object.layers.test(camera.layers)` — jadi ia tak
 * pernah masuk render state sama sekali. Jangan "optimalkan" itu.
 *
 * ── Kenapa prefetch, bukan lazy polos ──────────────────────────────────────
 * Lazy polos memindahkan ongkos ~1 MB ke DETIK PALING BURUK: tepat saat meja
 * diklik, berbarengan dengan tween kamera 1400 ms. Prefetch memisahkan kapan
 * chunk diunduh dari kapan ia dipakai — diam-diam saat pengunjung sampai di
 * Lounge (tempat mejanya berdiri), jauh sebelum ada yang mengklik.
 *
 * ⚠️ Prefetch DIGERBANGI `coarse` juga. Kalau tidak, perangkat sentuh tetap
 * mengunduh 1 MB untuk fitur yang tidak akan pernah bisa dibuka — persis
 * penghematan yang dikejar di sini. Ini sejalan dengan gerbang `Hero.tsx` di
 * INVARIANTS §6 yang juga menahan chunk HUD di seluler.
 *
 * ⚠️ JANGAN jadikan ini pengganti gerbang `coarse` di `Office.tsx`. Yang
 * mematikan pintu masuk minigame tetap di sana (INVARIANTS §6: melepasnya
 * mengunci pemain di pandangan atas meja tanpa tombol keluar). Berkas ini cuma
 * mengatur KAPAN kodenya diunduh, bukan boleh-tidaknya dibuka.
 */
const BilliardGame = lazy(() => import("./BilliardGame"));

/** Impor yang sama dengan lazy() di atas — Vite memakai cache modul yang sama,
 *  jadi memanggilnya lebih dulu membuat chunk sudah siap saat dibutuhkan. */
const prefetch = () => import("./BilliardGame");

export default function BilliardLazy() {
  const active = useSceneStore((s) => s.billiardActive);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const coarse = useCoarsePointer();

  /** Sekali saja — import() memang sudah di-cache, tapi ref ini membuat
   *  maksudnya terbaca tanpa harus tahu perilaku cache bundler. */
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    if (!shouldPrefetchBilliard(currentRoom, coarse)) return;
    prefetched.current = true;
    void prefetch();
  }, [currentRoom, coarse]);

  // Tetap tidak di-mount sampai minigame benar-benar dibuka. `billiardActive`
  // hanya bisa true lewat Office.tsx, yang sudah menolak di perangkat sentuh.
  if (!active) return null;

  // ⚠️ ChunkBoundary TANPA fallback — kita ada di dalam <Canvas>, jadi tidak
  // boleh menggambar DOM di sini (lihat catatan di ChunkBoundary.tsx).
  //
  // Kalau chunk-nya gagal, meja tetap bisa diklik tapi bolanya tidak muncul.
  // Itu memang tidak enak — tapi jauh lebih baik daripada seluruh halaman
  // blank, dan tombol keluar di HUD (yang chunk-nya terpisah) tetap hidup
  // sehingga pemain tidak terkunci di pandangan atas meja.
  return (
    <ChunkBoundary name="BilliardGame">
      <Suspense fallback={null}>
        <BilliardGame />
      </Suspense>
    </ChunkBoundary>
  );
}

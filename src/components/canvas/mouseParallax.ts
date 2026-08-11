"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Vector3, type Camera } from "three";

/**
 * Parallax kursor — kamera ikut bergeser sedikit mengikuti mouse.
 *
 * Bentuknya sengaja BUKAN rotasi kamera di tempat. Memutar kamera menggeser
 * seluruh gambar sama rata dan hasilnya terasa seperti panning layar; yang
 * memberi kesan ruang adalah kamera yang benar-benar BERPINDAH beberapa
 * sentimeter, karena benda dekat lalu bergeser lebih jauh daripada benda jauh.
 * Itu parallax yang sebenarnya, dan itu yang dilakukan basement.studio.
 *
 * Geserannya kecil (≤9 cm) dan itu batas yang dipilih sadar: pandangan tiap
 * ruangan di VIEWS diambil manual di Blender sampai bingkainya pas, beberapa
 * di antaranya cukup rapat ke tembok. Amplitudo besar akan menembusnya di
 * ruangan tertentu saja — jenis bug yang cuma muncul di satu dari lima view.
 */

/** Geseran kamera (meter) saat kursor mentok di tepi kiri/kanan layar. */
export const AMP_X = 0.09;
/** Geseran kamera (meter) saat kursor mentok di tepi atas/bawah layar. */
export const AMP_Y = 0.055;

/**
 * Seberapa jauh TITIK PANDANG ikut bergeser, sebagai fraksi geseran kamera.
 *
 * 0 = orbit murni (kamera bergeser, matanya tetap terpaku pada titik yang
 * sama) — parallax-nya kuat tapi terasa seperti kepala yang dipatok.
 * 1 = geser murni (kamera & titik pandang bergerak bersama) — jinak, tapi
 * arah pandangnya tidak pernah berubah sehingga terasa datar.
 *
 * 0,35 memberi sebagian besar rasa orbit sambil menyisakan sedikit gerak
 * "melihat ke arah kursor".
 */
export const TGT_FOLLOW = 0.35;

/**
 * Konstanta waktu pengejaran, dalam detik. Kursor melompat seketika; kamera
 * tidak boleh. Nilai ini kira-kira "sampai 95% dalam 3τ" ≈ 0,66 detik — cukup
 * lambat untuk terbaca halus, cukup cepat untuk tidak terasa molor.
 */
export const TAU = 0.22;

export interface Pointer {
  /** −1 (tepi kiri layar) … +1 (tepi kanan). */
  x: number;
  /** −1 (tepi bawah layar) … +1 (tepi atas). */
  y: number;
}

/**
 * Pendekatan eksponensial yang TIDAK bergantung frame rate.
 *
 * Bentuk `cur += (tgt − cur) * k` dengan k tetap adalah jebakan klasik: di
 * 120 fps ia mengejar dua kali lebih cepat daripada di 60 fps, jadi kehalusan
 * yang dikalibrasi di satu layar berubah di layar lain. Memakai `exp(−dt/τ)`
 * membuat hasil setelah waktu yang sama selalu identik, berapa pun fps-nya.
 *
 * Ini juga yang membuatnya aman saat frameloop bangun dari `"never"` (lihat
 * FrameloopGate): dt besar → k mendekati 1 → kamera langsung menyusul, bukan
 * meluncur pelan dari posisi basi.
 */
export function dampTowards(
  cur: number,
  tgt: number,
  tau: number,
  dt: number,
): number {
  const k = 1 - Math.exp(-dt / Math.max(tau, 1e-4));
  return cur + (tgt - cur) * k;
}

/**
 * Lacak posisi kursor ternormalisasi tanpa memicu render React.
 *
 * Nilainya ditulis ke `.current` sebuah ref, BUKAN ke state: gerakan mouse
 * bisa datang 100×/detik dan tiap `setState` akan me-render ulang `<Canvas>`.
 * Itu bukan sekadar boros — re-render Canvas menyinkronkan ulang propnya,
 * persis mekanisme yang dulu membatalkan `setFrameloop()` imperatif
 * (INVARIANTS.md §7).
 *
 * Tiga gerbang yang dipasang di sini:
 *
 * 1. `pointerType !== "mouse"` → sentuhan diabaikan. Di perangkat sentuh
 *    kantor 3D adalah pemandangan (INVARIANTS.md §6); tanpa gerbang ini,
 *    scroll jari di atas hero akan menyeret kamera. Ini juga sebabnya berkas
 *    ini tidak memakai `useCoarsePointer`: yang perlu dibedakan adalah tiap
 *    EVENT-nya, bukan perangkatnya — laptop layar sentuh punya keduanya.
 * 2. `prefers-reduced-motion` → kursor tak pernah menggerakkan apa pun, dan
 *    ia disimak lewat listener (bukan dibaca sekali saat mount) supaya
 *    mengubah setelan OS langsung terasa tanpa reload.
 * 3. Kursor keluar jendela / tab kehilangan fokus → kembali ke tengah. Tanpa
 *    ini kamera membeku miring di posisi terakhir sebelum kursor pergi.
 */
export function usePointerParallax(): MutableRefObject<Pointer> {
  const target = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recenter = () => {
      target.current.x = 0;
      target.current.y = 0;
    };

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = mq?.matches ?? false;
    const onPref = () => {
      reduced = mq?.matches ?? false;
      if (reduced) recenter();
    };

    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      target.current.x = Math.min(1, Math.max(-1, (e.clientX / w) * 2 - 1));
      target.current.y = Math.min(1, Math.max(-1, 1 - (e.clientY / h) * 2));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", recenter);
    window.addEventListener("blur", recenter);
    mq?.addEventListener("change", onPref);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", recenter);
      window.removeEventListener("blur", recenter);
      mq?.removeEventListener("change", onPref);
    };
  }, []);

  return target;
}

// Vektor kerja module-level — useFrame ini berjalan 60×/detik dan mengalokasi
// Vector3 baru tiap frame berarti memberi makan GC di jalur terpanas scene.
const _dir = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/**
 * Tulis posisi kamera & titik pandang yang sudah digeser parallax.
 *
 * Geserannya dihitung pada sumbu KAMERA (kanan & atas layar), bukan sumbu
 * dunia. Bedanya besar dan wajib: lima ruangan menghadap arah yang
 * berbeda-beda, jadi "geser +X dunia" berarti ke kanan layar di satu ruangan
 * dan ke arah kamera di ruangan lain — yang terakhir bukan parallax, melainkan
 * dolly maju-mundur yang mengubah bingkai.
 *
 * Karena kedua sumbu itu tegak lurus arah pandang, jarak kamera ke titik yang
 * dilihat praktis tidak berubah; tidak ada bingkai yang menyempit atau melebar.
 *
 * @param basePos posisi kamera "resmi" (hasil tween ruangan), tanpa parallax
 * @param baseTgt titik pandang resmi, tanpa parallax
 * @param outTgt  diisi dengan titik pandang setelah digeser — panggil
 *                `camera.lookAt(outTgt)` sesudahnya
 */
export function applyParallax(
  camera: Camera,
  basePos: Vector3,
  baseTgt: Vector3,
  outTgt: Vector3,
  px: number,
  py: number,
): void {
  camera.position.copy(basePos);
  outTgt.copy(baseTgt);

  _dir.subVectors(baseTgt, basePos);
  if (_dir.lengthSq() < 1e-8) return;
  _dir.normalize();

  // right = dir × up, trueUp = right × dir (konvensi three: −Z kamera = arah
  // pandang). Keduanya jadi NaN kalau arah pandang sejajar dengan camera.up —
  // tidak terjadi di scene ini (pandangan tegak lurus billiard memakai up
  // mendatar), tapi hasilnya kamera hilang entah ke mana, jadi dijaga.
  _right.crossVectors(_dir, camera.up);
  if (_right.lengthSq() < 1e-8) return;
  _right.normalize();
  _up.crossVectors(_right, _dir).normalize();

  const ox = px * AMP_X;
  const oy = py * AMP_Y;
  camera.position.addScaledVector(_right, ox).addScaledVector(_up, oy);
  outTgt
    .addScaledVector(_right, ox * TGT_FOLLOW)
    .addScaledVector(_up, oy * TGT_FOLLOW);
}

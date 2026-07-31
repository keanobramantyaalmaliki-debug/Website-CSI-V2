"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Label waypoint yang MENGEKOR KURSOR.
 *
 * Saat kursor menyentuh waypoint, nama ruangan muncul di samping kursor dan
 * mengikutinya dengan sedikit tertinggal — seperti ditarik tali, bukan
 * dipaku. Menggantikan label <Html> yang dulu menempel di tengah bidang
 * waypoint (Waypoints.tsx, sampai 31 Jul).
 *
 * ── Kenapa di LUAR Canvas, bukan <Html> dari drei ──────────────────────────
 *
 * Label ini elemen SCREEN-SPACE: posisinya ditentukan kursor, bukan titik di
 * dunia 3D. <Html> melakukan kebalikannya — memproyeksikan titik dunia ke
 * layar tiap frame — jadi memakainya di sini berarti melawan mekanismenya.
 *
 * Lagipula tiap <Html> memanggil `ReactDOM.createRoot()` sendiri
 * (node_modules/@react-three/drei/web/Html.js:143), jadi label lama membuat
 * root React terpisah per waypoint. Satu overlay tunggal di luar Canvas
 * meniadakan itu.
 *
 * ── Kenapa posisi kursor TIDAK disimpan di state ───────────────────────────
 *
 * `mousemove` menyala puluhan kali per detik. Lewat useState, tiap gerakan
 * kecil memicu render ulang React; lewat ref + rAF, React diam total dan yang
 * bergerak hanya `transform` di GPU. Ini alasan yang sama dengan `k` di
 * Waypoints.tsx:350 dan pola yang sudah dipakai di seluruh scene.
 *
 * Konsekuensinya: JANGAN ubah `pos`/`raf` jadi state "supaya lebih React".
 * Itu mengembalikan render per-gerakan-mouse yang justru dihindari di sini.
 */

/**
 * Seberapa cepat label menyusul kursor, per frame pada 60 fps.
 *
 * Ini yang memberi rasa "tertarik". 1 = menempel kaku di kursor (tidak ada
 * efeknya sama sekali), makin kecil makin lamban dan makin terasa seperti
 * benda yang punya bobot. 0,18 terasa mengekor tanpa sampai tertinggal jauh
 * saat kursor disapu cepat.
 */
const FOLLOW = 0.18;

/** Jarak label dari titik kursor (px) — cukup untuk tidak tertutup pointer. */
const OFFSET_X = 18;
const OFFSET_Y = 10;

export default function WaypointLabel() {
  const label = useSceneStore((s) => s.hoveredWaypoint);
  const box = useRef<HTMLDivElement>(null);

  /** Titik tujuan (kursor) dan titik gambar (label) dalam piksel layar. */
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  /** false sampai kursor pertama terbaca — cegah label melesat dari (0,0). */
  const seeded = useRef(false);
  const raf = useRef<number | null>(null);

  // Pelacak kursor dipasang SEKALI seumur hidup komponen, bukan saat hover.
  // Kalau dipasang hanya ketika label muncul, posisi awalnya belum diketahui
  // dan label akan meluncur dari sudut kiri-atas layar pada hover pertama.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!seeded.current) {
        // Hover pertama: mulai TEPAT di kursor, jangan dianimasikan dari (0,0).
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        seeded.current = true;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !label) return;

    // Kursor mungkin sudah berpindah jauh sejak label terakhir tampil (hover
    // waypoint lain di seberang layar). Tanpa ini, label akan menyeberang
    // layar dengan animasi panjang yang terlihat seperti bug.
    if (seeded.current) {
      pos.current.x = target.current.x;
      pos.current.y = target.current.y;
    }

    const tick = () => {
      const p = pos.current;
      const t = target.current;
      p.x += (t.x - p.x) * FOLLOW;
      p.y += (t.y - p.y) * FOLLOW;
      el.style.transform = `translate3d(${p.x + OFFSET_X}px, ${p.y + OFFSET_Y}px, 0)`;
      raf.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [label]);

  return (
    <div
      ref={box}
      aria-hidden="true"
      // z-30 = setara BilliardHUD, di bawah Navbar (50) & LoadingScreen (60).
      // Lihat INVARIANTS.md §2 — label ini penanda hover, bukan lapisan baru,
      // jadi ia sengaja BERBAGI tingkat dengan HUD alih-alih menambah tingkat.
      //
      // pointer-events-none WAJIB: kalau label menangkap kursor, ia menutupi
      // waypoint di bawahnya dan hover-nya berkedip-kedip (alasan yang sama
      // dengan label <Html> lama).
      // whitespace-nowrap: elemennya fixed di left-0 lalu digeser transform,
      // jadi tanpa ini label panjang ("Go back to Lounge") bisa terlipat saat
      // kursor mendekati tepi kanan layar.
      // Tanpa padding + leading-none: fill-nya MEMELUK kurung sikunya, bukan
      // kotak longgar di sekelilingnya. leading-none wajib — tanpa itu
      // line-height bawaan (~1,5×) menyisakan pita hitam di atas & bawah teks
      // meski padding sudah nol.
      className="pointer-events-none fixed left-0 top-0 z-30 select-none whitespace-nowrap bg-black/60 font-mono text-[13px] leading-none tracking-[0.06em] text-white"
      style={{
        // Memangkas sisa fill di kiri-kanan kurung siku. Padding sudah nol,
        // jadi sisa itu datang dari dua hal yang TIDAK bisa dihapus lewat
        // padding:
        //
        //   1. Side bearing font monospace. Tiap glyph menempati sel selebar
        //      sama, sedangkan "[" dan "]" ramping — ada ruang kosong bawaan
        //      di dalam selnya yang tetap ikut terwarnai fill.
        //   2. `tracking-[0.06em]` menambah jarak sesudah SETIAP karakter,
        //      termasuk sesudah "]" terakhir. Sisi kanan karena itu dapat
        //      tambahan yang tidak ada padanannya di kiri — sebabnya inset
        //      kanan di bawah lebih besar.
        //
        // Aman dipotong: area ini memang tak pernah ditempati tinta glyph,
        // jadi yang hilang cuma fill-nya, bukan hurufnya. Dalam em supaya ikut
        // menyesuaikan kalau ukuran font diubah.
        clipPath: "inset(0 0.22em 0 0.16em)",
        // Transisi HANYA untuk muncul/hilang. Posisinya digerakkan rAF di atas
        // dan TIDAK boleh ikut ditransisi — dua penggerak pada properti yang
        // sama akan saling menahan dan gerakannya jadi molor.
        //
        // Tetap 1 — JANGAN dipakai untuk melunakkan fill. Properti ini berlaku
        // ke SELURUH elemen, jadi menurunkannya ikut memudarkan teksnya.
        // Transparansi fill diatur terpisah lewat `bg-black/60` di className,
        // supaya teks tetap pekat di atas latar yang menembus.
        opacity: label ? 1 : 0,
        transition: "opacity 160ms ease-out",
        // Jangan biarkan label yang tak terlihat tetap dihitung layout-nya.
        visibility: label ? "visible" : "hidden",
      }}
    >
      [{label}]
    </div>
  );
}

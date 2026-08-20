"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Recognition — desain dari founder-section v1 (Apa-ini/founder-section-demo
 * .html) yang tidak pernah tayang, dihidupkan lagi di sini 20 Agu: baris
 * pencapaian besar dengan kartu founder di kiri, hover meredupkan baris lain,
 * dan fotonya mengekor kursor dengan lerp + rotasi dari kecepatan mouse.
 *
 * Yang SENGAJA tidak ikut dibawa dari demo:
 *   · custom cursor (`cursor: none` + titik pengganti) — keputusan look SATU
 *     HALAMAN penuh di v1; dipasang di satu section saja, kursornya
 *     lenyap-muncul di perbatasan section dan terbaca sebagai bug, bukan gaya.
 *   · scramble teks pada hover — sempat ikut, dicabut atas permintaan Keano
 *     20 Agu; jangan pasang lagi.
 */

type Achievement = {
  /** Kalimat pencapaian — teks besar yang jadi tubuh barisnya. */
  desc: string;
  /** Meta uppercase kecil di bawah desc: kategori · topik · tahun. */
  meta: string[];
  /** Foto yang mengekor kursor saat baris di-hover. */
  image: string;
  /** width/height intrinsik foto — dipakai menjaga rasio tanpa layout shift. */
  imageW: number;
  imageH: number;
};

const FOUNDER = {
  name: "Fami Maliki",
  role: "Founder & CEO",
  photo: "/people/fami-profile.jpg",
};

// Konten dari founder-section v1 (deskripsi aslinya berbahasa Indonesia,
// diterjemahkan karena seluruh copy situs ini berbahasa Inggris). Fotonya
// foto asli dari Apa-ini/Photo-founder-section.
const ACHIEVEMENTS: Achievement[] = [
  {
    desc: "Awarded for the best digital innovation in the business technology category.",
    meta: ["Award", "Digital Innovation", "2023"],
    image: "/people/fami-award.jpg",
    imageW: 640,
    imageH: 426,
  },
  {
    desc: "Keynote speaker at leading technology and business innovation conferences.",
    meta: ["Speaking", "Technology", "2024"],
    image: "/people/fami-speaking.jpg",
    imageW: 640,
    imageH: 640,
  },
];

/** Lebar foto pengekor kursor, px — tingginya mengikuti rasio tiap foto. */
const PREVIEW_W = 240;

/**
 * Tinggi pratinjau DIBULATKAN ke piksel utuh. 240 × 426/640 = 159,75px —
 * tinggi pecahan membuat tepi bawah foto jatuh di tengah piksel, dan browser
 * menambalnya dengan baris interpolasi semi-transparan yang terbaca sebagai
 * "garis putih di bawah foto" (terlapor 20 Agu, paling kentara saat foto
 * bergerak/menghilang).
 */
const previewH = (a: Achievement) =>
  Math.round((PREVIEW_W * a.imageH) / a.imageW);

/**
 * Pop masuk & keluarnya SATU gerakan yang diputar balik (permintaan 20 Agu;
 * versi grid-fade sempat dicoba lalu diganti ini). POP_EASE kurva back-out
 * dari demo v1; EXIT_EASE cerminannya — cubic-bezier(a,b,c,d) dibalik jadi
 * (1-c, 1-d, 1-a, 1-b) — sehingga keluarnya menganticipasi sedikit lalu
 * menyusut, persis rekaman masuknya diputar mundur. Durasi keluar lebih
 * pendek: pelepasan tidak perlu selama kedatangan untuk terbaca.
 */
const POP_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const EXIT_EASE: [number, number, number, number] = [0.36, 0, 0.66, -0.56];

export default function AwardsShowcase() {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  // Hover butuh kursor sungguhan; di layar sentuh & reduced motion baris
  // tampil statis — alasan yang sama dengan waypoint 3D (INVARIANTS §6).
  const interactive = !reduced && !coarse;

  const [hovered, setHovered] = useState<number | null>(null);

  // Posisi mouse & foto hidup di ref, bukan state: dibaca 60×/detik oleh loop
  // rAF di bawah, dan tidak ada satu pun yang perlu memicu render.
  const mouse = useRef({ x: 0, y: 0, prevX: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0, rotation: 0, snapped: false });

  /**
   * Mesin pengekor kursor — lerp posisi + rotasi dari kecepatan horizontal
   * mouse, persis angka-angka demo v1 (0.09 posisi, 0.08 rotasi, -velX*0.4).
   *
   * ⚠️ Loop-nya HANYA hidup selama ada baris yang di-hover — begitu kursor
   * keluar, cancel. Pelajaran PhysicsHeading (3 Agu): flag yang menggerbangi
   * efek ≠ menggerbangi mesinnya; rAF abadi untuk foto yang tak terlihat
   * adalah persis bug "laptop panas" itu. Posisi beku selama fade-out 200 ms
   * tidak terbaca mata.
   */
  useEffect(() => {
    if (hovered === null || !interactive) return;
    let raf = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const loop = () => {
      const p = posRef.current;
      const m = mouse.current;
      const velX = m.x - m.prevX;
      m.prevX = m.x;
      p.rotation = lerp(p.rotation, -velX * 0.4, 0.08);
      p.x = lerp(p.x, m.x, 0.09);
      p.y = lerp(p.y, m.y, 0.09);
      const el = wrapperRef.current;
      if (el) {
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        el.style.transform = `translate(-50%, -62%) rotate(${p.rotation}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hovered, interactive]);

  function enterRow(i: number) {
    if (!interactive) return;
    // Foto pertama kali muncul: lahir DI kursor, bukan terbang dari pojok
    // kiri-atas (0,0) — demo v1 punya bug kecil itu karena imgX/imgY mulai
    // dari nol.
    if (!posRef.current.snapped) {
      posRef.current.x = mouse.current.x;
      posRef.current.y = mouse.current.y;
      posRef.current.snapped = true;
    }
    setHovered(i);
  }

  function leaveRow(i: number) {
    if (!interactive) return;
    setHovered((h) => (h === i ? null : h));
  }

  const preview = hovered !== null ? ACHIEVEMENTS[hovered] : null;

  return (
    <motion.div
      className="mt-16"
      onMouseMove={(e) => {
        mouse.current.x = e.clientX;
        mouse.current.y = e.clientY;
      }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
    >
      <FadeUpList tag="div">
        {ACHIEVEMENTS.map((a, i) => (
          <FadeUpItem key={a.desc} tag="div">
            <div
              onMouseEnter={() => enterRow(i)}
              onMouseLeave={() => leaveRow(i)}
              className="group grid gap-6 border-t border-white/[0.08] py-6 transition-opacity duration-300 last:border-b last:border-white/[0.08] sm:grid-cols-[220px_1fr] sm:gap-12 sm:py-8"
              style={{ opacity: hovered !== null && hovered !== i ? 0.2 : 1 }}
            >
              {/* Kartu founder — jangkar kiri tiap baris */}
              <div className="flex items-start gap-3 self-start border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
                <img
                  src={FOUNDER.photo}
                  alt=""
                  loading="lazy"
                  width={40}
                  height={40}
                  className="size-10 shrink-0 border border-white/[0.08] object-cover"
                />
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-xs font-medium text-zinc-300">
                    {FOUNDER.name}
                  </span>
                  <span className="text-[9px] tracking-widest text-zinc-600 uppercase">
                    {FOUNDER.role}
                  </span>
                </div>
              </div>

              {/* Konten kanan: kalimat besar + meta */}
              {/* Padding & gap sengaja jauh lebih rapat dari demo v1 (88px py,
                  48px gap): daftarnya akan bertambah seiring award baru, dan
                  pada rapat begini tiap baris tetap satu layar penuh napas
                  tanpa memakan tinggi halaman (permintaan 20 Agu). */}
              <div className="flex flex-col justify-between gap-5 sm:gap-6">
                <p className="text-2xl leading-snug tracking-tight text-zinc-200 sm:text-3xl lg:text-4xl">
                  {a.desc}
                </p>
                <div className="flex items-center text-[10px] tracking-widest text-zinc-600 uppercase transition-colors duration-200 group-hover:text-zinc-400">
                  {a.meta.map((m, mi) => (
                    <span key={m} className="flex items-center">
                      {mi > 0 && (
                        <span
                          className="mx-5 inline-block size-[3px] rounded-full bg-zinc-700"
                          aria-hidden="true"
                        />
                      )}
                      {m}
                    </span>
                  ))}
                  <span
                    className="ml-auto text-sm text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-400"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </div>
              </div>
            </div>
          </FadeUpItem>
        ))}
      </FadeUpList>

      {/* Foto pengekor kursor — wrapper diposisikan loop rAF (left/top +
          rotate), inner milik Motion (scale/opacity pop). Dua elemen karena
          dua sistem menulis `transform`: digabung di satu elemen, saling
          menimpa tiap frame. Pola yang sama dengan demo v1. */}
      {interactive && (
        <div
          ref={wrapperRef}
          className="pointer-events-none fixed top-0 left-0 z-50 will-change-transform"
        >
          {/* popLayout: saat hover pindah baris, foto lama keluar sebagai
              elemen absolut — tanpa ini ia tetap di flow dan MENDORONG foto
              baru ke bawah selama exit-nya. */}
          <AnimatePresence mode="popLayout">
            {preview && (
              <motion.img
                key={preview.image}
                src={preview.image}
                alt=""
                width={preview.imageW}
                height={preview.imageH}
                style={{ width: PREVIEW_W, height: previewH(preview) }}
                className="object-cover"
                initial={{ opacity: 0, scale: 0.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.05,
                  transition: { duration: 0.45, ease: EXIT_EASE },
                }}
                transition={{ duration: 0.7, ease: POP_EASE }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

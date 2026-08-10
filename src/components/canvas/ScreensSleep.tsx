"use client";

/**
 * Layar-layar kantor tidur kalau lama tidak ada yang datang (10 Agu 2026).
 *
 * Kebalikan dari kebanyakan efek di folder ini: yang lain menambah gerakan,
 * yang ini MENGURANGI-nya. Bacaannya "kantornya ditinggal", dan justru karena
 * ia berhenti alih-alih mulai, ia satu-satunya efek idle di sini yang
 * MENGHEMAT — video yang dipause berhenti di-dekode.
 *
 * ── Kenapa ambangnya jauh lebih lama dari glitch karakter ───────────────────
 * Ini keputusan paling penting di berkas ini. Glitch karakter menunggu 8 detik
 * (IDLE_MS) dan itu benar untuk dirinya: burst 200 ms yang muncul saat orang
 * berhenti bergerak adalah hadiah, dan kalau meleset pun tidak ada yang hilang.
 *
 * Layar tidak begitu. TV meeting memutar video Desa+, TV function room memantul
 * logo DVD — keduanya ADA UNTUK DITONTON, dan menonton berarti diam. Tidur
 * setelah 8 detik akan mematikan video tepat pada orang yang paling
 * menghargainya, dan gejalanya ("videonya mati sendiri") terbaca sebagai bug,
 * bukan sebagai suasana.
 *
 * 45 detik dipilih supaya kedua bacaan itu tidak bertabrakan: cukup lama untuk
 * melewati satu putaran penuh menonton tanpa menyentuh mouse, cukup pendek
 * supaya tab yang benar-benar ditinggalkan berhenti membakar GPU. Ongkos salah
 * tebaknya pun kecil dan satu arah — bangunnya seketika pada gerakan pertama.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial, Object3D } from "three";
import { getScreenMaterials } from "./screens";

/** Lihat catatan panjang di kepala berkas sebelum menurunkan angka ini. */
export const SCREEN_SLEEP_MS = 45000;

/**
 * Terang layar saat tidur, sebagai pecahan dari emissive kalibrasinya.
 *
 * 0,05 dan bukan 0: monitor yang benar-benar nol menampilkan `map`-nya apa
 * adanya — untuk layar gambar itu berarti kontennya masih terbaca samar dalam
 * gelap, yang justru terlihat seperti layar rusak. Sisa 5% menjaga permukaannya
 * tetap membaca sebagai KACA yang memantul, bukan sebagai gambar yang diredupkan.
 *
 * Layar video tidak punya `map` sama sekali (screens.ts sengaja melewatinya),
 * jadi yang tersisa di sana baseColor GLB 0,012 — warna layar-mati yang benar.
 */
const SLEEP_LEVEL = 0.05;

/** Lama transisi (ms). Tidur pelan seperti monitor yang memang punya timer;
 *  bangun cepat, karena yang menunggu adalah orang yang baru saja menggerakkan
 *  mouse dan sedang mengukur apakah website-nya responsif. */
const SLEEP_MS = 900;
const WAKE_MS = 260;

/**
 * Jeda antar layar saat tidur (ms).
 *
 * Tanpa ini kelima layar meredup dalam satu gerakan seragam, dan keseragaman
 * itulah yang membuatnya terbaca sebagai satu efek global (seperti fade
 * halaman) alih-alih sebagai beberapa perangkat yang masing-masing punya
 * timer sendiri. Nol saat BANGUN — satu gerakan mouse membangunkan semuanya
 * sekaligus, dan stagger di arah itu cuma terasa lambat.
 */
const STAGGER_MS = 160;

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

interface Entry {
  mat: MeshStandardMaterial;
  /** emissiveIntensity kalibrasi — lihat getScreenMaterials(). */
  base: number;
  /** Jeda mulai untuk layar ini (ms), hanya dipakai saat tidur. */
  delay: number;
  /** 0 = terang penuh, 1 = tidur penuh. */
  t: number;
}

export default function ScreensSleep({
  asleep,
  scene,
}: {
  asleep: boolean;
  /**
   * Scene yang sudah disiapkan Office.
   *
   * TIDAK di-traverse di sini — material layarnya diambil dari registry
   * screens.ts. Ia ada sebagai DEPENDENSI, dan itu bukan formalitas: registry
   * dikosongkan lalu diisi ulang tiap kali applyScreens() berjalan, yaitu tiap
   * kali `prepared` di Office dihitung ulang. Tanpa dep ini, komponen ini akan
   * terus memegang material clone milik scene yang sudah dibuang dan menulis
   * emissive ke sesuatu yang tidak ada lagi di layar — diam, tanpa error.
   */
  scene: Object3D;
}) {
  const entries = useRef<Entry[]>([]);

  useLayoutEffect(() => {
    const list: Entry[] = [];
    let i = 0;
    for (const [mat, base] of getScreenMaterials()) {
      list.push({ mat, base, delay: i * STAGGER_MS, t: 0 });
      i++;
    }
    entries.current = list;
    return () => {
      // Kembalikan ke terang kalibrasi. Material layar adalah CLONE milik scene
      // yang sedang di-mount, jadi kalau unmount-nya bukan karena scene-nya
      // dibuang (mis. komponen ini saja yang dilepas), meninggalkannya redup
      // berarti layar yang gelap permanen tanpa ada yang menyalakannya lagi.
      for (const e of list) e.mat.emissiveIntensity = e.base;
      entries.current = [];
    };
  }, [scene]);

  /** Awal transisi yang sedang berjalan + nilai t tiap layar saat itu.
   *  Disimpan supaya arah yang BERBALIK di tengah jalan (tidur → bangun
   *  sebelum tuntas) berangkat dari keadaan sekarang, bukan meloncat ke 0/1. */
  const startAt = useRef(0);
  const from = useRef<number[]>([]);
  const done = useRef(true);

  useEffect(() => {
    const list = entries.current;
    startAt.current = performance.now();
    from.current = list.map((e) => e.t);
    done.current = false;
  }, [asleep]);

  useFrame(() => {
    if (done.current) return;
    const list = entries.current;
    if (!list.length) return;

    const goal = asleep ? 1 : 0;
    const dur = asleep ? SLEEP_MS : WAKE_MS;
    const elapsed = performance.now() - startAt.current;

    let allDone = true;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const delay = asleep ? e.delay : 0;
      const p = smoothstep((elapsed - delay) / dur);
      if (p < 1) allDone = false;
      const start = from.current[i] ?? e.t;
      e.t = start + (goal - start) * p;
      // Peta t → terang: 1 - t*(1 - SLEEP_LEVEL), jadi t=0 memberi base persis
      // (bukan base×0,999) dan t=1 memberi base×SLEEP_LEVEL.
      e.mat.emissiveIntensity = e.base * (1 - e.t * (1 - SLEEP_LEVEL));
    }
    done.current = allDone;
  });

  return null;
}

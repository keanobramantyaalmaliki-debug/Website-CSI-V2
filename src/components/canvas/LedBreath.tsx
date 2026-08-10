"use client";

/**
 * LED strip lantai bernapas pelan saat pengunjung diam (10 Agu 2026).
 *
 * Satu-satunya benda di kantor ini yang boleh berdenyut tanpa berbohong. Semua
 * cahaya lain sudah di-bake ke lightmap — menganimasikan bohlam berarti
 * bohlamnya berkedip sementara tumpahan cahayanya di dinding diam saja, dan
 * mata langsung menangkap sambungan yang tidak nyambung itu.
 *
 * ⚠️ LED strip TIDAK KEBAL dari masalah yang sama, cuma lebih toleran, dan itu
 * yang menentukan seluruh kalibrasi di bawah. Cahaya LED yang JATUH DI LANTAI
 * juga sudah di-bake (lihat LED_STRIP_EMISSIVE di Office.tsx) dan tidak akan
 * ikut bernapas. Yang berubah cuma pendar strip-nya sendiri. Jadi:
 *
 *   napas halus  → terbaca sebagai pendar yang hidup; lantai yang diam tidak
 *                  pernah dipertanyakan karena tidak ada yang cukup berubah
 *                  untuk dibandingkan.
 *   napas dalam  → strip meredup jelas sementara genangan cahaya di lantai
 *                  tetap seterang semula. Ketahuan, dan bacaannya bukan
 *                  "lampunya berdenyut" melainkan "render-nya rusak".
 *
 * Itu sebabnya BREATH_DEPTH kecil dan cuma turun ke bawah — lihat catatannya.
 *
 * ── Kenapa emissiveIntensity, bukan patch shader ────────────────────────────
 * Efek ini tidak menyentuh `onBeforeCompile` sama sekali (INVARIANTS §5 tidak
 * bertambah panjang karenanya): yang ditulis cuma satu float per material per
 * frame, yang di three berakhir sebagai update uniform biasa. Nol program
 * shader baru, nol pass baru, dan tidak ada urutan mount yang perlu dijaga
 * terhadap revealSweep.
 */
import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, type Material, type Object3D } from "three";
import { IDLE_MS, idleFor, useIdleClock } from "./idleClock";
import { isLedStripMaterial } from "./ledStrip";


/**
 * Sedalam apa napasnya, sebagai pecahan dari emissive dasar.
 *
 * 0,16 = strip turun paling jauh ke 84% terangnya. Terdengar kecil, dan memang
 * harus: pada emissive 3 dengan ambang Bloom 0,95 (Scene.tsx), yang mata
 * tangkap bukan angka emissive-nya melainkan TEBAL pendar bloom di sekitar
 * garisnya — dan itu bergerak jauh lebih kentara daripada 16%.
 *
 * Batas atasnya bukan selera tapi lightmap: di ~0,3 ke atas, strip yang meredup
 * mulai kalah terang dari genangan cahayanya sendiri di lantai (yang di-bake,
 * jadi tetap) dan susunannya terbaca terbalik — lantai menyala menerangi
 * lampunya.
 */
const BREATH_DEPTH = 0.16;

/**
 * Periode dua gelombang penyusun napas (detik).
 *
 * Dua, bukan satu, dan sengaja tidak kelipatan: satu sinus murni terbaca
 * metronomik dalam dua-tiga siklus — persis masalah yang sudah dibayar di
 * CharacterGlitch (jeda burst-nya diacak dengan alasan yang sama). Dijumlah
 * dengan bobot di bawah, polanya baru berulang setelah menit-menitan.
 */
const PERIOD_S = 7.5;
const PERIOD2_S = 4.6;
const WEIGHT2 = 0.35;

/**
 * Laju ramp masuk/keluar napas (per detik, dipakai sebagai laju lerp).
 *
 * Asimetris dengan alasan yang sama seperti useIdleFlag: masuk pelan supaya
 * napasnya "muncul" alih-alih menyala, keluar cepat supaya begitu pengunjung
 * menggerakkan mouse, strip sudah kembali ke terang kalibrasinya sebelum ia
 * sempat melihat ada yang berubah.
 */
const RAMP_IN = 0.6;
const RAMP_OUT = 5.0;

/** Gelombang 0..1 yang MULAI DI 0. Bentuknya (1-cos)/2, bukan sin: dengan sin,
 *  napas melompat ke tengah amplitudo pada frame pertama. */
function wave(t: number, period: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);
}

/** Satu material LED + terang kalibrasinya. */
interface Entry {
  mat: MeshStandardMaterial;
  base: number;
}

export default function LedBreath({ scene }: { scene: Object3D }) {
  const reduced = useReducedMotion();
  useIdleClock();

  const entries = useRef<Entry[]>([]);

  useLayoutEffect(() => {
    // Material LED dipakai bersama beberapa mesh (strip-nya membentang
    // melewati batas objek), jadi dikumpulkan lewat Set — tanpa itu satu
    // material yang sama ditulis berkali-kali per frame, dan pada perhitungan
    // di useFrame di bawah nilai keduanya sama sehingga bug-nya tidak terlihat,
    // cuma boros.
    const seen = new Set<Material>();
    const list: Entry[] = [];
    scene.traverse((o: Object3D) => {
      if (!(o instanceof Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!(m instanceof MeshStandardMaterial)) continue;
        if (!isLedStripMaterial(m) || seen.has(m)) continue;
        seen.add(m);
        // Base DIBACA DARI MATERIAL, bukan dioper sebagai angka.
        //
        // Sengaja: konstanta yang dioper adalah nilai yang KITA KIRA berlaku,
        // dan berkas ini lahir justru dari kasus di mana keduanya berbeda —
        // FIX 4 di Office.tsx menulis 3 ke material yang tidak pernah ketemu,
        // sementara yang benar-benar tampil di layar 8 dari GLB. Kalau angka
        // itu dipercaya, frame pertama napas akan MELOMPAT dari 8 ke 3 dan
        // "napas halus" berubah jadi lampu yang tiba-tiba redup.
        //
        // Membaca dari material membuat pertanyaannya hilang: apa pun yang
        // Office (atau siapa pun sesudahnya) tetapkan, itulah puncak napasnya.
        list.push({ mat: m, base: m.emissiveIntensity });
      }
    });
    entries.current = list;

    return () => {
      // Kembalikan ke nilai kalibrasi. Tanpa ini, unmount di tengah napas
      // meninggalkan strip pada emissive acak — dan karena materialnya milik
      // GLB yang di-cache useGLTF, nilai itu ikut ke mount berikutnya.
      for (const e of list) e.mat.emissiveIntensity = e.base;
      entries.current = [];
    };
  }, [scene]);

  /** 0 = terang kalibrasi, 1 = napas amplitudo penuh. */
  const depth = useRef(0);
  /** Fase napas (detik). Diakumulasi dari dt, BUKAN dibaca dari jam R3F:
   *  FrameloopGate me-reset clock R3F tiap kali render loop hidup kembali,
   *  dan fase yang bersandar padanya akan melompat tiap pengunjung scroll
   *  balik ke hero. */
  const phase = useRef(0);
  /** Sudah ditulis balik ke `base` dan tidak ada lagi yang perlu ditulis. */
  const settled = useRef(true);

  useFrame((_, dt) => {
    const list = entries.current;
    if (!list.length) return;

    const idle = !reduced && idleFor() >= IDLE_MS;
    const goal = idle ? 1 : 0;
    depth.current +=
      (goal - depth.current) * Math.min(1, dt * (idle ? RAMP_IN : RAMP_OUT));

    // Sudah kembali penuh ke terang kalibrasi: tulis sekali, lalu berhenti
    // menyentuh material sampai idle berikutnya.
    if (!idle && depth.current < 0.002) {
      if (settled.current) return;
      depth.current = 0;
      phase.current = 0;
      for (const e of list) e.mat.emissiveIntensity = e.base;
      settled.current = true;
      return;
    }
    settled.current = false;

    phase.current += dt;
    const t = phase.current;
    const breath =
      (1 - WEIGHT2) * wave(t, PERIOD_S) + WEIGHT2 * wave(t, PERIOD2_S);

    // Hanya TURUN dari base, tidak pernah naik: `base` adalah angka yang sudah
    // dikalibrasi terhadap ambang Bloom, dan melampauinya berarti menaikkan
    // pendar melewati batas yang dulu dipilih dengan susah payah.
    const k = 1 - BREATH_DEPTH * depth.current * breath;
    for (const e of list) e.mat.emissiveIntensity = e.base * k;
  });

  return null;
}

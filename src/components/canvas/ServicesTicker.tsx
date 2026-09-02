"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Color, MathUtils, type Group, type Mesh, type MeshBasicMaterial } from "three";
import geistSemiBold from "@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff";
import { beltX, motionIntensity } from "./servicesBelt";
import { useZoomAwareDpr } from "./zoomDpr";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";

/**
 * Panel Services ala Lusion: kotak putih rounded yang berdiri sendiri di
 * section gelap, berisi 9 judul layanan sebagai sabuk teks tak berujung.
 *
 * Interaksi (revisi 21 Agu, menggantikan versi pin sticky): sabuknya digeser
 * oleh WHEEL SAAT KURSOR DI ATAS PANEL — selama itu halaman tidak ikut
 * turun (preventDefault + stopPropagation, jadi Lenis tidak pernah menerima
 * event-nya) — dan begitu kursor keluar, wheel kembali milik halaman dan
 * sabuknya DIAM (penggerak dari scroll halaman sengaja dicabut atas
 * permintaan Keano). Loop infinitenya utuh: akumulasi wheel tak berbatas,
 * wrap modulo yang melipat.
 *
 * Revisi 21 Agu (lanjutan): DRAG horizontal ditambahkan sebagai penggerak
 * kedua. Revisi 21 Agu malam: penggeraknya DIPISAH per perangkat (permintaan
 * Keano) — pointer presisi HANYA wheel, pointer coarse (sentuh) HANYA drag;
 * gerbangnya `useCoarsePointer`, sumber yang sama dengan hint teks di kaki
 * panel ("scroll to explore" vs "drag to explore").
 * Konten mengikuti jari (delta px dikonversi ke unit dunia lewat tinggi
 * panel; dikali DRAG_MULT_TOUCH biar lebih licin)
 * dengan damping yang sama, dan `touch-action: pan-y` menyerahkan
 * gestur vertikal ke halaman: geser atas-bawah tetap scroll, kanan-kiri
 * milik sabuk. Pada prefers-reduced-motion wheel tidak disandera dan pop
 * dimatikan, tapi drag TETAP hidup — manipulasi langsung tanpa animasi
 * susulan (off menempel target), bukan gerak otomatis.
 *
 * Porting dari pmndrs/examples `infinite-scroll`. Yang diambil apa adanya:
 * damping `MathUtils.damp` (λ=4, angka demo), pop ke arah kamera sebanding
 * laju, dan "pudar saat diam / hidup saat bergerak" (grayscale foto di sana →
 * warna teks di sini). Yang SENGAJA tidak diambil: ScrollControls (container
 * scroll bohongannya rebutan wheel dengan Lenis di halaman biasa — handler
 * wheel milik sendiri di atas jauh lebih kecil dan bisa memilih kapan
 * mengalah) dan duplikasi konten + teleport scrollbar (lihat servicesBelt.ts).
 *
 * KONTRAK FRAMELOOP — ini canvas KEDUA di halaman (pelajaran "laptop panas",
 * lihat InquiryLaptop.tsx). Tidak ada animasi tanpa ujung, jadi "demand"
 * cukup selamanya: wheel & scroll memesan frame lewat invalidate(), dan
 * useFrame memesan frame LANJUTAN sendiri selama damping/warna belum menetap
 * (lihat `settled`). Diam = 0 draw call, tanpa gerbang inView.
 */

/** Judulnya SEKALIGUS identitasnya — tidak ada field nomor. Nomor "01"–"09"
 *  yang dulu ada di sini cuma pernah dipakai sebagai `key` React dan tidak
 *  sekali pun dicetak, jadi ia dibuang saat layanan pindah ke CMS (2 Sep):
 *  menyimpan nomor di sebelah urutan berarti dua sumber kebenaran yang pasti
 *  melenceng begitu editor memindahkan satu baris. Judul layanan unik —
 *  dijaga indeks `services_title_alive`. */
export type TickerItem = { title: string };

/** Unit dunia per piksel wheel. Slot desktop ≈ 3,2 unit → satu item ≈ 650 px
 *  putaran wheel. Ini kenop "licin"-nya: versi pertama terasa terlalu deras,
 *  jadi dipatok santai; kecilkan lagi kalau masih terasa licin. */
const WHEEL_SENS = 0.005;
/** Kamera dipatok di sini (dipakai juga oleh konversi drag px→dunia). */
const CAM_Z = 5;
const CAM_FOV = 45;
/** Tinggi bidang pandang di z=0 (unit dunia) — tinggi CSS panel selalu
 *  memotret persis segini, jadi worldPerPx = VIEW_H / clientHeight dan drag
 *  bisa mengikuti jari 1:1 berapa pun ukuran panelnya. */
const VIEW_H = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360);
/** Kenop "licin" drag SENTUH (HP): 1 = menempel jari persis; dinaikkan 21 Agu
 *  ("sedikit lebih licin di mobile") karena slot HP selebar layar → 1:1 butuh
 *  sapuan penuh per item. Mouse desktop tetap 1:1 (drag presisi berkursor). */
const DRAG_MULT_TOUCH = 1.5;
/** λ damping — angka yang sama dengan demo pmndrs. */
const DAMP = 4;
/** Laju (unit dunia/dtk) yang dihitung "gerak penuh" untuk intensitas efek. */
const VEL_FULL = 6;
/** Pop maju maksimum (unit dunia). Kamera di z=5 → teks membesar ~14%. */
const POP_Z = 0.6;
/** Ambang "sudah menetap" — di bawah ini useFrame berhenti memesan frame. */
const SETTLE_OFF = 0.001;
const SETTLE_INTENSITY = 0.005;

/* Warna dipatok di luar frame loop; scratch di-lerp tiap frame. Idle pudar,
   bergerak menguat — terjemahan langsung grayscale→berwarna milik demo. */
const TITLE_IDLE = new Color("#a1a1aa");
const TITLE_ACTIVE = new Color("#18181b");
const SCRATCH_TITLE = new Color();

function TickerBelt({
  items,
  wheel,
  reduced,
}: {
  items: TickerItem[];
  /** Akumulasi wheel (px, sudah dijumlah handler di luar canvas). REF, bukan
   *  prop nilai: berubah tiap notch wheel dan dibaca tiap frame — melewatkan
   *  nilainya lewat render React berarti re-render per notch. */
  wheel: React.RefObject<number>;
  /** prefers-reduced-motion: wheel tidak disandera → sabuk statis; pop mati,
   *  warna dikunci di pose kuat supaya posternya tetap terbaca. */
  reduced: boolean;
}) {
  const { viewport } = useThree();
  const invalidate = useThree((s) => s.invalidate);

  /* Lebar slot per item — dilebarkan 21 Agu ("jarak kanan-kiri antar text
     bikin jauh"), lalu judul ikut DIBESARKAN (persetujuan Keano di revisi
     yang sama): tipe oversized yang mengisi panel, ~1,7 judul terlihat di
     panel lebar, ~1 di panel kurus (HP), dengan celah tengah tetap
     menyisakan tempat untuk label "Our Service". */
  const narrow = viewport.width < 6;
  const slot = narrow ? viewport.width / 1.0 : viewport.width / 1.7;
  const count = items.length;
  /* Panel kurus (HP) memakai faktor judul lebih kecil (21 Agu, "text item
     kecilin di mobile") — pada slot selebar viewport, 0.13 membuat judul
     3 baris menelan panel; 0.095 menyisakan udara tanpa kehilangan pose
     poster. Desktop tidak berubah. */
  const fontSize = Math.min(slot * (narrow ? 0.095 : 0.13), viewport.height * 0.17);
  const labelSize = Math.min(slot * (narrow ? 0.055 : 0.07), viewport.height * 0.09);

  const beltRef = useRef<Group>(null);
  const itemRefs = useRef<(Group | null)[]>([]);
  const titleRefs = useRef<(Mesh | null)[]>([]);

  const sim = useRef({ off: 0, prev: 0, intensity: 0 });

  useFrame((_, rawDt) => {
    const s = sim.current;
    /* Frame pertama setelah idle "demand" membawa delta raksasa (clock terus
       berjalan) — dijepit supaya damp tidak melompat. */
    const dt = Math.min(rawDt, 0.1);

    /* Satu-satunya penggerak: akumulasi wheel di atas panel. Digeser
       setengah slot supaya pose awal (dan tiap kelipatan slot) menaruh
       CELAH di pusat — label "Our Service" tidak tertindih judul. */
    const target = wheel.current * WHEEL_SENS - slot / 2;

    s.off = reduced ? target : MathUtils.damp(s.off, target, DAMP, dt);
    const vel = dt > 0 ? (s.off - s.prev) / dt : 0;
    s.prev = s.off;

    s.intensity = reduced
      ? 1
      : MathUtils.damp(s.intensity, motionIntensity(vel, VEL_FULL), DAMP, dt);

    if (beltRef.current) {
      beltRef.current.position.z = reduced ? 0 : s.intensity * POP_Z;
    }
    SCRATCH_TITLE.lerpColors(TITLE_IDLE, TITLE_ACTIVE, s.intensity);

    for (let i = 0; i < count; i++) {
      const g = itemRefs.current[i];
      if (g) g.position.x = beltX(i, slot, count, s.off);
      /* Material troika unik per instance; menulis warnanya langsung tidak
         memicu re-layout glyph (beda dengan mengganti prop `color`). */
      const tm = titleRefs.current[i]?.material as MeshBasicMaterial | undefined;
      if (tm?.color) tm.color.copy(SCRATCH_TITLE);
    }

    /* Bagian yang membuat "demand" sah untuk animasi susulan: selama sabuk
       atau warnanya belum menetap, frame berikutnya dipesan dari sini. */
    const settled =
      Math.abs(target - s.off) < SETTLE_OFF && s.intensity < SETTLE_INTENSITY;
    if (!settled && !reduced) invalidate();
  });

  return (
    <>
      {/* Label statis di pusat canvas — DI BELAKANG sabuk (z −1,2) dan di
          LUAR beltRef, jadi tidak kena pop/lerp warna: hitam diam, judul
          layanan lewat di depannya. */}
      <Text
        font={geistSemiBold}
        fontSize={labelSize}
        color="#18181b"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, -1.2]}
        letterSpacing={-0.02}
      >
        Our Service
      </Text>
      <group ref={beltRef}>
      {items.map((item, i) => (
        <group
          key={item.title}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
        >
          <Text
            ref={(el: Mesh | null) => {
              titleRefs.current[i] = el;
            }}
            font={geistSemiBold}
            fontSize={fontSize}
            color="#a1a1aa"
            /* Lebih sempit dari slot: judul melipat 2-3 baris dan menyisakan
               udara di kanan-kirinya — tanpa ini judul panjang merambat
               sampai menyentuh label "Our Service" di celah. */
            maxWidth={slot * 0.7}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            lineHeight={1.05}
            letterSpacing={-0.02}
          >
            {item.title}
          </Text>
        </group>
      ))}
      </group>
    </>
  );
}

export default function ServicesTicker({
  items,
  className,
}: {
  items: TickerItem[];
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  /* invalidate milik store R3F, diserahkan keluar oleh PublishInvalidate
     supaya handler wheel (DOM, di luar canvas) bisa memesan frame. */
  const invalidateRef = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion() ?? false;
  /* Hint interaksi: perangkat sentuh (coarse, tanpa wheel) diajak drag,
     perangkat ber-mouse diajak scroll — mengikuti penggerak utama
     masing-masing (lihat catatan wheel & drag di atas). */
  const coarse = useCoarsePointer();
  /* Dulu `dpr={[1, 1.5]}` — lantai 1 membuat buffer meledak saat browser
     di-zoom-out (devicePixelRatio<1, viewport CSS membesar); rincian &
     jepitannya di zoomDpr.ts. Di zoom ≥100% nilainya identik dengan rentang
     lama. */
  const dpr = useZoomAwareDpr(1, 1.5);

  /**
   * Penyandera wheel — inti permintaan "kursor di dalam = geser item, kursor
   * keluar = scroll halaman". Non-passive supaya preventDefault sah;
   * stopPropagation menghentikan bubbling sebelum sampai ke listener window
   * milik Lenis, jadi halaman benar-benar diam selama kursor di panel.
   * deltaMode 1 = satuan BARIS (Firefox + mouse) — dinormalkan ~16 px/baris.
   */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || reduced) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      wheel.current += (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
      invalidateRef.current?.();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [reduced]);

  /**
   * Drag horizontal — penggerak SATU-SATUNYA di perangkat sentuh; di pointer
   * presisi efek ini tidak dipasang sama sekali (desktop = wheel saja).
   * Delta ditulis ke akumulator wheel yang SAMA (satu sumber kebenaran untuk
   * sabuk), dikonversi supaya konten mengikuti jari 1:1: px → unit dunia via
   * tinggi panel (VIEW_H / clientHeight), lalu ÷ WHEEL_SENS balik ke satuan
   * akumulator. Arah: jari ke kiri (dx<0) → akumulator naik → offset naik →
   * item berjalan ke kiri (lihat beltX). Gestur vertikal tidak pernah sampai
   * ke sini — `touch-action: pan-y` di pembungkus membiarkan browser
   * men-scroll halaman dan membatalkan pointer kita (pointercancel).
   * Sengaja TANPA gerbang reduced: drag = manipulasi langsung, off menempel
   * target tanpa animasi susulan saat reduced (lihat TickerBelt).
   */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !coarse) return;
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      const mult = e.pointerType === "touch" ? DRAG_MULT_TOUCH : 1;
      wheel.current -= (dx * mult * (VIEW_H / el.clientHeight)) / WHEEL_SENS;
      invalidateRef.current?.();
    };
    const onEnd = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
    };
  }, [coarse]);

  return (
    /* aria-hidden: teks troika bukan DOM — daftar layanan yang bisa dibaca
       mesin hidup sebagai <ul> sr-only di Office.tsx, bukan di sini. */
    /* Tinggi dipecah per breakpoint (21 Agu, "canvas kegedean di HP"): di HP
       panelnya statis (lihat catatan wheel di atas) jadi 70svh cuma bidang
       putih kosong raksasa — cukup 45svh; desktop tetap 70svh. */
    <div
      ref={wrapRef}
      aria-hidden="true"
    /* `sm:max-h-[630px]` (QC zoom-out 26 Agu) = 70svh pada viewport desain
       900px. Tinggi `svh` membesar bersama viewport CSS saat browser
       di-zoom-out, dan ukuran teks troika ikut TINGGI panel (fontSize
       di-cap `viewport.height * 0.17`, dipetakan ke tinggi CSS canvas) —
       jadi panel yang lebarnya sudah dijepit section-shell tetap memuat
       teks raksasa. Menjepit tingginya menjepit teksnya sekaligus. Cabang
       HP (45svh) tidak diberi cap: browser-zoom-out urusan desktop, dan
       menjepitnya mengubah tampilan iPad potret yang sudah disetujui. */
      className={`relative h-[45svh] min-h-[300px] sm:h-[70svh] sm:max-h-[630px] sm:min-h-[420px] touch-pan-y select-none overflow-hidden rounded-3xl bg-zinc-50 ${className ?? ""}`}
    >
      <Canvas
        frameloop="demand"
        dpr={dpr}
        camera={{ position: [0, 0, CAM_Z], fov: CAM_FOV }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <TickerBelt items={items} wheel={wheel} reduced={reduced} />
          <PublishInvalidate into={invalidateRef} />
        </Suspense>
      </Canvas>
      <span className="pointer-events-none absolute inset-x-0 bottom-4 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400">
        {coarse ? "Drag to explore" : "Scroll to explore"}
      </span>
    </div>
  );
}

/** Menyerahkan invalidate() store R3F ke luar canvas (pola PublishStore di
 *  InquiryLaptop, dikecilkan ke satu fungsi yang memang dibutuhkan). */
function PublishInvalidate({ into }: { into: React.RefObject<(() => void) | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    into.current = invalidate;
    return () => {
      into.current = null;
    };
  }, [into, invalidate]);
  return null;
}

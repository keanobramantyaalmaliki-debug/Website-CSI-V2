"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import {
  Color,
  Euler,
  MathUtils,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type ShadowMaterial,
  type Texture,
} from "three";
import type { Industry } from "@/data/industries";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { cn } from "@/lib/utils";

/**
 * Industries sebagai tumpukan lempeng 3D — porting dari pmndrs/examples
 * `raycast-cycling`, KOMPOSISinya setia ke demo: 13 plank kaca buram
 * membentuk tangga spiral, dilihat kamera tinggi, bayangan lembut jatuh ke
 * lantai strip putih full-bleed. Heading section ikut jadi overlay di dalam
 * strip (blok header di luar strip dihapus 23 Agu malam).
 *
 * Interaksi (disederhanakan 23 Agu malam, permintaan Keano): HOVER menyorot
 * plank terdepan di bawah kursor + HUD num/nama/desc, KLIK membuka mode
 * fokus. WHEEL-CYCLING DICABUT TOTAL — override events.filter yang merotasi
 * intersection, penyandera wheel, dan HUD titik lapisan ikut pergi; wheel di
 * atas strip sekarang selalu scroll halaman. Jangan bawa balik tanpa
 * keputusan baru. Yang tersisa dari filter hanyalah penyaring `visible`:
 * raycaster three TIDAK memeriksa visible, jadi tanpa saringan ini klik
 * "area kosong" saat mode fokus bisa mendarat di plank yang disembunyikan.
 *
 * MODE FOKUS: KLIK sebuah plank menerbangkannya ke kiri layar sambil
 * berputar menghadap kamera dan mengembang jadi kartu foto sektornya; sisa
 * tangga fade out (blob bayangan ikut pudar lewat opacity shadowMaterial,
 * karena bayangan three tidak peduli opacity mesh) dan deskripsi industri
 * muncul sebagai panel DOM di kanan. Klik plank lagi / tombol back / klik
 * area kosong (onPointerMissed) mengembalikan spiral.
 *
 * KONTRAK FRAMELOOP — canvas ke-3 di halaman (lihat ServicesTicker.tsx dan
 * pelajaran "laptop panas" di InquiryLaptop.tsx): "demand" selamanya. Pointer
 * event R3F berjalan tanpa frame; animasinya (lerp warna hover, progress
 * fokus, fade) dijalankan useFrame yang memesan frame LANJUTAN sendiri sampai
 * semuanya menetap. Diam (termasuk kursor berhenti di atas plank) = 0 draw
 * call. Pulse sin demo SENGAJA tidak diporting (permintaan Keano, "hilangin
 * effect berdenyut").
 *
 * SEMUA PERANGKAT memakai komponen ini sejak 23 Agu malam (sesi mobile) —
 * gerbang desktop di Industries.tsx dihapus dan carousel IndustriesMobile
 * pensiun. Adaptasi sentuh + layar sempit: kamera dimundurkan responsif
 * (CameraRig) supaya spiral tidak terpotong di kanvas portrait, mode fokus
 * pindah ke layout kartu-atas/panel-bawah di bawah NARROW_PX, dan hover HUD
 * dilewati di pointer kasar (jari tidak punya hover).
 *
 * NAVIGASI SEKTOR (ide Keano, sesi mobile): plank tipis + bertumpuk + miring
 * perspektif = target tap kecil yang gampang meleset ke tetangganya. Di
 * pointer kasar baris bawah HUD diganti navigasi `‹ 04 Nama Sektor ›` —
 * arrow menggilir sektor (wrap-around), plank terpilih di-tint aksen di 3D
 * sebagai umpan balik, dan NAMANYA SENDIRI tombol pembuka fokus (tanpa
 * tombol enter terpisah). Tap langsung di plank tetap hidup sebagai jalur
 * kedua — dua-duanya menuju fokus yang sama dan menyinkronkan navIndex.
 */

/** Kamera demo, verbatim (tinggi dari kiri, menunduk ke origin). Pernah
 *  dicoba didekatkan + dibidik ulang (23 Agu) — hasilnya ekor spiral yang
 *  memang mengayun ke arah kamera jadi terpotong; angka aslinya ternyata
 *  framing terbaik untuk strip lebar juga. */
const CAM_POS: [number, number, number] = [-10, 10, 5];
const CAM_FOV = 50;
/** Framing demo pas untuk strip lebar; di kanvas sempit (portrait) spiral
 *  terpotong sisi. Di bawah aspek ini kamera DIMUNDURKAN sepanjang arah
 *  pandangnya proporsional dengan rasio aspek (lebar pandang bertambah
 *  linear terhadap jarak), dengan plafon pengaman. Varian sqrt sudah
 *  dicoba — di 390×844 ekor spiral masih terpotong tepi kanan; rasio penuh
 *  (k≈1,9 di HP) yang lolos verifikasi screenshot. */
const WIDE_ASPECT = 1.4;
const MAX_PULLBACK = 2.2;
/** Ambang "sudah menetap" — di bawah ini useFrame berhenti memesan frame. */
const SETTLE = 0.002;
/** λ damping progress fokus & fade — sedikit lebih tegas dari ServicesTicker
 *  (λ=4) supaya terbang-kembalinya plank terasa responsif, bukan mengambang. */
const DAMP = 6;
/** Warna plank: putih buram ala demo; hover memakai tint aksen situs
 *  (pengganti aquamarine demo yang asing di palet oranye kita). */
const PLANK_IDLE = new Color("#ffffff");
const PLANK_HOVER = new Color("#fed7aa");
const SCRATCH = new Color();

/** Pose fokus: plank berhenti di titik ray NDC ini, `dist` unit di depan
 *  kamera, di-slerp ke quaternion kamera (tepat menghadap layar) sambil
 *  mengembang FOCUS_SCALE. Dua varian: layar lebar = kartu di kiri
 *  berpasangan panel kanan; layar sempit (< NARROW_PX, selaras breakpoint
 *  `md:` panel DOM) = kartu di atas-tengah, dist lebih jauh supaya kartu
 *  mengecil dan menyisakan ruang panel di bawah. */
const FOCUS_WIDE = { ndcX: -0.45, ndcY: -0.04, dist: 8.8 };
const FOCUS_NARROW = { ndcX: 0, ndcY: 0.3, dist: 11.5 };
const NARROW_PX = 768;
const FOCUS_SCALE: [number, number, number] = [2.2, 1.1, 1];
/** Foto duduk di plane anak [1.9 × 5.9] yang ikut skala plank — rasio
 *  tampil finalnya yang dipakai untuk cover-crop texture. */
const PHOTO_W = 1.9;
const PHOTO_H = 5.9;
const PHOTO_ASPECT = (PHOTO_W * FOCUS_SCALE[0]) / (PHOTO_H * FOCUS_SCALE[1]);

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* Scratch frame-loop (module-level, tidak dialokasi per frame). */
const V_RAY = new Vector3();
const V_FOCUS = new Vector3();

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Sisa terakhir dari fork <CycleRaycast/>: raycaster three tidak memeriksa
 * `visible`, jadi plank yang disembunyikan mode fokus harus disaring manual —
 * tanpa ini klik "area kosong" saat fokus mendarat di plank tak terlihat
 * (dan onPointerMissed tidak pernah menutup fokusnya).
 */
function VisibleFilter() {
  const setEvents = useThree((s) => s.setEvents);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const prev = get().events.filter;
    setEvents({
      filter: (intersections, state) => {
        const clone = intersections.filter((h) => h.object.visible);
        return prev ? prev(clone, state) : clone;
      },
    });
    return () => {
      setEvents({ filter: prev });
    };
  }, [get, setEvents]);

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Kamera responsif: posisi demo dipertahankan sebagai ARAH, tapi jaraknya
 * dikalikan faktor mundur saat kanvas sempit — tanpa ini ekor spiral
 * terpotong tepi kiri/kanan di layar potret. lookAt origin dipanggil
 * eksplisit (jangan mengandalkan default R3F) karena mode fokus men-slerp
 * plank ke quaternion kamera, jadi orientasinya harus deterministik.
 */
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const aspect = size.width / size.height;
    const k =
      aspect >= WIDE_ASPECT ? 1 : Math.min(WIDE_ASPECT / aspect, MAX_PULLBACK);
    camera.position.set(CAM_POS[0] * k, CAM_POS[1] * k, CAM_POS[2] * k);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, size, invalidate]);

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Panggung demo aslinya: ambient + main light ber-shadow + strip light dan
 * lantai shadowMaterial. BakeShadows demo TIDAK dipakai lagi sejak mode fokus
 * ada — plank bergerak dan memudar, shadow map harus ikut; frameloop demand
 * sudah membatasi rendernya ke frame yang memang dipesan.
 */
function Stage({
  shadowMatRef,
}: {
  shadowMatRef: React.RefObject<ShadowMaterial | null>;
}) {
  return (
    <>
      <ambientLight intensity={0.5 * Math.PI} />
      <directionalLight
        position={[1, 10, -2]}
        intensity={Math.PI}
        shadow-camera-far={70}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-mapSize={[512, 512]}
        castShadow
      />
      <directionalLight position={[-10, -10, 2]} intensity={3 * Math.PI} />
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.75, 0]}>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial
          ref={(el: ShadowMaterial | null) => {
            shadowMatRef.current = el;
          }}
          opacity={0.2}
        />
      </mesh>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** Cover-crop texture ke rasio kartu fokus (ala object-fit: cover). */
function fitCover(tex: Texture) {
  const img = tex.image as { width: number; height: number } | undefined;
  if (!img) return;
  const texAspect = img.width / img.height;
  if (texAspect > PHOTO_ASPECT) {
    const fx = PHOTO_ASPECT / texAspect;
    tex.repeat.set(fx, 1);
    tex.offset.set((1 - fx) / 2, 0);
  } else {
    const fy = texAspect / PHOTO_ASPECT;
    tex.repeat.set(1, fy);
    tex.offset.set(0, (1 - fy) / 2);
  }
}

/**
 * Tangga spiral demo, verbatim: plank [2 × 6 × 0.075] rebah (rot X −90°),
 * berputar `i / π / 2` sambil naik setengah unit per anak tangga, posisi
 * melingkar sin/cos(i/5).
 *
 * Pose plank TIDAK lewat prop statis: tiap plank punya progress fokus
 * (0 = duduk di spiral, 1 = kartu fokus di kiri layar) dan useFrame
 * meng-interpolasi posisi (lerp), orientasi (slerp ke quaternion kamera),
 * dan skala di antara keduanya. Foto hidup di plane anak yang fade in
 * mengikuti progress, dimuat imperatif saat diklik (TextureLoader + cache) —
 * bukan useTexture, supaya 13 foto tidak diunduh untuk satu klik.
 */
function StairSpiral({
  industries,
  reduced,
  coarse,
  hover,
  navActive,
  selected,
  onHover,
  onSelect,
  shadowMatRef,
}: {
  industries: Industry[];
  reduced: boolean;
  coarse: boolean;
  hover: number | null;
  /** Sektor terpilih navigasi bawah (pointer kasar) — di-tint seperti hover
   *  supaya arrow punya umpan balik terlihat di tumpukan; null di pointer
   *  presisi. */
  navActive: number | null;
  selected: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number | null) => void;
  shadowMatRef: React.RefObject<ShadowMaterial | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const n = industries.length;

  const meshRefs = useRef<(Mesh | null)[]>([]);
  const matRefs = useRef<(MeshStandardMaterial | null)[]>([]);
  const photoMeshRefs = useRef<(Mesh | null)[]>([]);
  const photoMatRefs = useRef<(MeshBasicMaterial | null)[]>([]);
  useCursor(hover !== null);

  /* Pose spiral tiap plank, dihitung sekali — sumber kebenaran untuk ujung
     "0" interpolasi. Rumus demo dipertahankan, tapi indeks pose DIBALIK
     (k = n-1-i): sektor 01 menempati anak tangga TERATAS, 13 paling bawah
     (permintaan Keano 23 Agu — urutan naratif dibaca dari atas). */
  const bases = useMemo(
    () =>
      industries.map((_, i) => {
        const k = industries.length - 1 - i;
        return {
          pos: new Vector3(
            2 - Math.sin(k / 5) * 5,
            k * 0.5,
            2 - Math.cos(k / 5) * 5,
          ),
          quat: new Quaternion().setFromEuler(
            new Euler(-Math.PI / 2, 0, k / Math.PI / 2),
          ),
        };
      }),
    [industries],
  );

  const progRef = useRef<Float32Array>(new Float32Array(n));

  /* Perubahan target (hover / navigasi / klik / tutup) harus membangunkan
     frameloop demand — tanpa ini animasi baru jalan saat pointer kebetulan
     bergerak. */
  useEffect(() => {
    invalidate();
  }, [hover, navActive, selected, invalidate]);

  /* Foto sektor terpilih: dimuat saat dibutuhkan, di-cache per URL, dicabut
     dari material saat fokus ditutup (cleanup) supaya plank kembali buram. */
  const texCache = useRef(new Map<string, Texture>());
  useEffect(() => {
    if (selected === null) return;
    const pm = photoMatRefs.current[selected];
    if (!pm) return;
    const url = industries[selected].image;
    let cancelled = false;
    const apply = (tex: Texture) => {
      if (cancelled) return;
      pm.map = tex;
      pm.needsUpdate = true;
      invalidate();
    };
    const cached = texCache.current.get(url);
    if (cached) {
      apply(cached);
    } else {
      new TextureLoader().load(url, (tex) => {
        tex.colorSpace = SRGBColorSpace;
        fitCover(tex);
        texCache.current.set(url, tex);
        apply(tex);
      });
    }
    return () => {
      cancelled = true;
      pm.map = null;
      pm.needsUpdate = true;
    };
  }, [selected, industries, invalidate]);

  useFrame((state, rawDt) => {
    /* Frame pertama setelah idle "demand" membawa delta raksasa (clock terus
       berjalan) — dijepit supaya damp tidak melompat (pola ServicesTicker). */
    const dt = Math.min(rawDt, 0.1);
    const focusing = selected !== null;
    let settled = true;

    /* Titik fokus dihitung dari kamera (bukan angka dunia hardcoded):
       unproject NDC → arah ray → `dist` unit di depan kamera. Varian pose
       mengikuti lebar kanvas, selaras breakpoint `md:` panel DOM. */
    const F = state.size.width < NARROW_PX ? FOCUS_NARROW : FOCUS_WIDE;
    V_RAY.set(F.ndcX, F.ndcY, 0.5).unproject(camera);
    V_RAY.sub(camera.position).normalize();
    V_FOCUS.copy(camera.position).addScaledVector(V_RAY, F.dist);

    for (let i = 0; i < n; i++) {
      const mesh = meshRefs.current[i];
      const mat = matRefs.current[i];
      if (!mesh || !mat) continue;

      // Progress fokus per plank — plank yang baru ditutup mengalir balik
      // ke pose spiralnya, bukan teleport.
      const pTarget = selected === i ? 1 : 0;
      const p = reduced
        ? pTarget
        : MathUtils.damp(progRef.current[i], pTarget, DAMP, dt);
      if (Math.abs(p - pTarget) > SETTLE) settled = false;
      progRef.current[i] = p;

      const base = bases[i];
      mesh.position.lerpVectors(base.pos, V_FOCUS, p);
      mesh.quaternion.slerpQuaternions(base.quat, camera.quaternion, p);
      mesh.scale.set(
        1 + (FOCUS_SCALE[0] - 1) * p,
        1 + (FOCUS_SCALE[1] - 1) * p,
        1 + (FOCUS_SCALE[2] - 1) * p,
      );

      // Opacity: mode fokus menenggelamkan plank lain ke 0; plank terpilih
      // menuju pejal supaya fotonya tidak menerawang latar.
      const oTarget = focusing ? (selected === i ? 1 : 0) : 0.6;
      const o = reduced
        ? oTarget
        : MathUtils.damp(mat.opacity, oTarget, DAMP, dt);
      if (Math.abs(o - oTarget) > SETTLE) settled = false;
      mat.opacity = o;
      // Plank pudar total disembunyikan — VisibleFilter menyaring lewat
      // visible, jadi ini sekalian mematikan raycast + shadow-nya.
      mesh.visible = o > 0.02;

      // Tint hover / sektor navigasi hanya di mode spiral — di mode fokus
      // foto tidak diwarnai.
      SCRATCH.set(
        (hover === i || navActive === i) && !focusing ? PLANK_HOVER : PLANK_IDLE,
      );
      if (reduced) {
        if (!mat.color.equals(SCRATCH)) settled = false;
        mat.color.copy(SCRATCH);
      } else {
        mat.color.lerp(SCRATCH, 0.15);
        if (
          Math.abs(mat.color.r - SCRATCH.r) +
            Math.abs(mat.color.g - SCRATCH.g) +
            Math.abs(mat.color.b - SCRATCH.b) >
          SETTLE
        )
          settled = false;
      }

      // Foto fade in mengikuti progress; tetap tak terlihat sampai
      // texture-nya benar-benar terpasang.
      const photoMesh = photoMeshRefs.current[i];
      const photoMat = photoMatRefs.current[i];
      if (photoMesh && photoMat) {
        photoMat.opacity = p;
        photoMesh.visible = p > 0.02 && photoMat.map !== null;
      }

      // Plank dalam transit fokus WAJIB jadi lapisan teratas (revisi Keano
      // 23 Agu: saat terbang ia sempat "menyelam" di balik plank yang
      // dilewatinya sebelum mereka fadeout). depthTest dimatikan + renderOrder
      // dinaikkan selama progress hidup, dipulihkan begitu duduk lagi di
      // spiral. Plank TERPILIH diberi order di atas plank yang sedang
      // mengalir pulang (dua-duanya bisa transit bersamaan saat pindah
      // fokus cepat); foto anak selalu +1 di atas plank pembawanya.
      const lifted = p > 0.02;
      const order = lifted ? (selected === i ? 20 : 10) : 0;
      mesh.renderOrder = order;
      mat.depthTest = !lifted;
      if (photoMesh && photoMat) {
        photoMesh.renderOrder = order + 1;
        photoMat.depthTest = !lifted;
      }
    }

    // Blob bayangan ikut memudar — bayangan three tidak mengenal opacity
    // mesh, jadi yang dipudarkan materialnya lantai.
    const sm = shadowMatRef.current;
    if (sm) {
      const sTarget = focusing ? 0 : 0.2;
      const s = reduced ? sTarget : MathUtils.damp(sm.opacity, sTarget, DAMP, dt);
      if (Math.abs(s - sTarget) > SETTLE) settled = false;
      sm.opacity = s;
    }

    if (!settled) invalidate();
  });

  return (
    <group>
      {industries.map((industry, i) => (
        <mesh
          key={industry.num}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          castShadow
          receiveShadow
          position={bases[i].pos}
          quaternion={bases[i].quat}
          onClick={(e) => {
            e.stopPropagation();
            // Saat fokus, satu-satunya plank ber-visible adalah yang
            // terpilih — klik dia menutup. Klik plank lain di mode spiral
            // memindahkan fokus seperti biasa.
            onSelect(selected === i ? null : i);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            // Pointer kasar tidak punya hover sungguhan — pointerover-nya
            // ikut tap dan menempel sampai tap berikutnya, jadi HUD hover
            // dilewati; tap langsung membuka fokus.
            if (!coarse) onHover(i);
          }}
          onPointerOut={() => onHover(null)}
        >
          <boxGeometry args={[2, 6, 0.075]} />
          <meshStandardMaterial
            ref={(el: MeshStandardMaterial | null) => {
              matRefs.current[i] = el;
            }}
            roughness={1}
            transparent
            opacity={0.6}
            color={PLANK_IDLE}
          />
          {/* Foto sektor — plane anak sedikit di depan muka +Z plank (bukan
              map di box-nya: keenam sisi box berbagi UV, foto di rusuk tipis
              jadi garis warna aneh). Margin 0,05 menyisakan rim buram ala
              kartu. Bukan target raycast. */}
          <mesh
            ref={(el) => {
              photoMeshRefs.current[i] = el;
            }}
            position={[0, 0, 0.042]}
            raycast={() => null}
            visible={false}
          >
            <planeGeometry args={[PHOTO_W, PHOTO_H]} />
            <meshBasicMaterial
              ref={(el: MeshBasicMaterial | null) => {
                photoMatRefs.current[i] = el;
              }}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        </mesh>
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function IndustriesStack({
  industries,
  className,
}: {
  industries: Industry[];
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const coarse = useCoarsePointer();
  /* Canvas baru di-mount saat strip mendekati viewport — konteks WebGL +
     shadow map tidak ikut membebani load awal halaman. */
  const inView = useInView(wrapRef, { once: true, margin: "600px 0px" });

  const shadowMatRef = useRef<ShadowMaterial | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  /* Sektor terpilih navigasi bawah (dipakai di pointer kasar saja). Tap
     langsung di plank ikut menyinkronkannya supaya sesudah fokus ditutup
     navigasi menunjuk sektor yang barusan dibuka, bukan melompat balik. */
  const [navIndex, setNavIndex] = useState(0);

  const selectAndSync = (index: number | null) => {
    setSelected(index);
    if (index !== null) setNavIndex(index);
  };

  const hovered = hover !== null ? industries[hover] : null;
  const focused = selected !== null ? industries[selected] : null;
  const nav = industries[navIndex];

  return (
    /* aria-hidden: plank di canvas bukan DOM — heading sr-only + daftar
       sektor yang terbaca mesin hidup di Industries.tsx, bukan di sini. */
    <div
      ref={wrapRef}
      data-testid="industries-stack"
      aria-hidden="true"
      className={cn(
        "relative h-[85svh] min-h-[520px] w-full touch-pan-y select-none overflow-hidden bg-zinc-50",
        className,
      )}
    >
      {inView && (
        <Canvas
          frameloop="demand"
          shadows
          dpr={[1, 1.5]}
          camera={{ position: CAM_POS, fov: CAM_FOV }}
          onPointerMissed={() => setSelected(null)}
          gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
          style={{ width: "100%", height: "100%" }}
          /* GOTCHA "plank telat 2-3 dtk" (23 Agu): canvas ini SELALU mount di
             tengah scroll (inView), dan react-use-measure bawaan <Canvas>
             melewatkan ResizeObserver + scroll lewat SATU debounce 50ms yang
             sama — tiap event scroll me-reset timernya, jadi selama Lenis
             masih meluncur ukuran container tidak pernah keluar, R3F menahan
             pembuatan root + konteks WebGL, dan strip tampil kosong sampai
             scroll benar-benar diam. scroll:false melepas listener scroll-nya;
             rect posisi memang tidak dipakai (pointer R3F pakai offsetX/Y). */
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
          <Suspense fallback={null}>
            <CameraRig />
            <Stage shadowMatRef={shadowMatRef} />
            <StairSpiral
              industries={industries}
              reduced={reduced}
              coarse={coarse}
              hover={hover}
              navActive={coarse ? navIndex : null}
              selected={selected}
              onHover={setHover}
              onSelect={selectAndSync}
              shadowMatRef={shadowMatRef}
            />
            <VisibleFilter />
          </Suspense>
        </Canvas>
      )}

      {/* Heading section — pindah ke DALAM strip (23 Agu malam, permintaan
          Keano; blok header gelap di luar strip dihapus). Ikut aria-hidden
          wrapper — h2 yang terbaca mesin ada sebagai sr-only di
          Industries.tsx. Disembunyikan saat fokus: kartu terbang melewati
          area kiri atas ini. */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 max-w-md p-6 transition-opacity duration-300 sm:p-8",
          focused && "opacity-0",
        )}
      >
        <p className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Built Across Sectors
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          From national platforms to neighborhood apps.
        </p>
      </div>

      {/* Baris bawah strip, dua wujud:
          — Pointer kasar: navigasi sektor `‹ 04 Nama ›` (ide Keano) — arrow
            menggilir dengan wrap-around, nama = tombol pembuka fokus, plank
            terpilih di-tint di canvas. Tombol-tombolnya pointer-events-auto
            di atas wrapper yang pointer-events-none, dan tabIndex −1 karena
            seisi strip aria-hidden (pola tombol back panel fokus).
          — Pointer presisi: HUD hover (identitas plank di bawah kursor) +
            panduan di kanan ("Hover the stack" → "Click to open"; SELALU
            tampil, permintaan Keano).
          Dua-duanya disembunyikan saat fokus (panel fokus yang bicara). */}
      {!focused &&
        (coarse ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 p-4">
            {/* Arah arrow mengikuti RUANG, bukan urutan nomor (revisi
                Keano): di tumpukan sektor 01 duduk di kanan-atas dan nomor
                naik ke arah kiri, jadi arrow KIRI = nomor naik (sorotan
                bergeser kiri) dan arrow KANAN = nomor turun (sorotan
                bergeser kanan). Kalau komposisi spiral berubah, cek lagi
                pemetaan ini. */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setNavIndex((i) => (i + 1) % industries.length)}
              className="pointer-events-auto touch-manipulation p-3 text-zinc-400 transition-colors active:text-zinc-900"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            {/* Lebar TETAP, bukan mengikuti panjang nama: baris ini
                justify-center, jadi kolom tengah yang melar membuat kedua
                arrow ikut bergeser tiap nama berganti — tap beruntun di
                arrow jadi meleset (kejadian di probe: arrow pindah 48px).
                15.5rem muat nama terpanjang; truncate jaring pengaman. */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => selectAndSync(navIndex)}
              className="pointer-events-auto w-[15.5rem] max-w-[70vw] truncate px-2 py-3 text-center text-sm font-semibold tracking-tight text-zinc-900 underline decoration-zinc-300 underline-offset-4"
            >
              <span className="mr-2 tabular-nums text-accent">{nav.num}</span>
              {nav.name}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() =>
                setNavIndex((i) => (i + industries.length - 1) % industries.length)
              }
              className="pointer-events-auto touch-manipulation p-3 text-zinc-400 transition-colors active:text-zinc-900"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 sm:p-8">
            {/* justify-end: min-h menahan tinggi baris supaya HUD tidak
                loncat-loncat, tapi teksnya harus duduk di DASAR kotak itu —
                sejajar dengan hint di kanan (permintaan Keano). */}
            <div className="flex min-h-[5.5rem] max-w-md flex-col justify-end">
              {hovered && (
                <>
                  <p className="text-sm font-semibold tracking-tight text-zinc-900">
                    <span className="mr-2 tabular-nums text-accent">{hovered.num}</span>
                    {hovered.name}
                    {hovered.tier === "core" && (
                      <span className="ml-2 text-[10px] tracking-widest text-accent uppercase">
                        Core Focus
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {hovered.desc}
                  </p>
                </>
              )}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400">
              {hovered ? "Click to open" : "Hover the stack"}
            </span>
          </div>
        ))}

      {/* Panel fokus — layar lebar: deskripsi di kanan berpasangan kartu yang
          terbang ke kiri; layar sempit (< md, selaras NARROW_PX): kartu ke
          atas-tengah dan panel jadi lembar bawah. */}
      <AnimatePresence>
        {focused && (
          <motion.div
            key={focused.num}
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-6 pb-8 md:inset-y-0 md:left-auto md:w-1/2 md:items-center md:p-12"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
          >
            {/* Di bawah md teksnya DIKECILKAN + margin dirapatkan (revisi
                Keano: panel sempat mepet foto) dan tombol back DISEMBUNYIKAN
                supaya ruangnya jatuh ke deskripsi — menutup fokus di sentuh
                cukup tap kartu / area kosong (onPointerMissed). */}
            <div className="max-w-md">
              <p className="text-[10px] tracking-widest text-zinc-400 uppercase md:text-xs">
                <span className="mr-2 tabular-nums text-accent">{focused.num}</span>
                {focused.tier === "core" ? "Core Focus" : "Sector"}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 md:mt-3 md:text-3xl">
                {focused.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:mt-4 md:text-base">
                {focused.desc}
              </p>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setSelected(null)}
                className="pointer-events-auto mt-8 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400 transition-colors hover:text-zinc-900 max-md:hidden"
              >
                Back to the stack
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

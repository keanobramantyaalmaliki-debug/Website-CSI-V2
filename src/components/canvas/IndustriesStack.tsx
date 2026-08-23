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
import { cn } from "@/lib/utils";

/**
 * Industries sebagai tumpukan lempeng 3D — porting dari pmndrs/examples
 * `raycast-cycling`, KOMPOSISinya juga setia ke demo (revisi 23 Agu, permintaan
 * Keano): 13 plank kaca buram membentuk tangga spiral, dilihat kamera tinggi,
 * bayangan lembut jatuh ke lantai strip putih full-bleed. Hover menyorot plank
 * terdepan di bawah kursor, WHEEL menggilir plank-plank yang TERTUTUP di
 * tumpukan yang sama (metafora "menembus lapisan"), dan HUD DOM di kaki strip
 * menampilkan titik per lapisan + num/nama/desc sektor yang sedang aktif.
 *
 * MODE FOKUS (23 Agu): KLIK sebuah plank menerbangkannya ke kiri layar sambil
 * berputar menghadap kamera dan mengembang jadi kartu foto sektornya; sisa
 * tangga fade out (blob bayangan ikut pudar lewat opacity shadowMaterial,
 * karena bayangan three tidak peduli opacity mesh) dan deskripsi industri
 * muncul sebagai panel DOM di kanan. Klik plank lagi / tombol back / klik
 * area kosong (onPointerMissed) mengembalikan spiral. Selama fokus,
 * wheel-cycling mati dan wheel lolos jadi scroll halaman.
 *
 * Yang diambil dari demo: override `events.filter` R3F yang MEROTASI daftar
 * intersection (plank ke-N dalam tumpukan "dianggap terdepan"), lalu
 * pointercancel + pointermove palsu supaya state hover pindah ke plank
 * berikutnya. Yang SENGAJA tidak diambil dari <CycleRaycast/> drei:
 *   • wheel listener document-level dengan preventDefault TANPA SYARAT —
 *     di halaman scroll ini artinya scroll mati total. Di sini listener
 *     menempel di strip dan hanya menyandera wheel saat ray mengenai ≥2
 *     plank (kesepakatan 23 Agu: di luar itu wheel lolos jadi scroll
 *     halaman, beda dengan panel Services yang menyandera penuh).
 *   • keyCode default 9 (Tab) — membajak navigasi keyboard, dibuang.
 *
 * KONTRAK FRAMELOOP — canvas ke-3 di halaman (lihat ServicesTicker.tsx dan
 * pelajaran "laptop panas" di InquiryLaptop.tsx): "demand" selamanya. Pointer
 * event R3F berjalan tanpa frame; animasinya (lerp warna hover, progress
 * fokus, fade) dijalankan useFrame yang memesan frame LANJUTAN sendiri sampai
 * semuanya menetap. Diam (termasuk kursor berhenti di atas plank) = 0 draw
 * call. Pulse sin demo SENGAJA tidak diporting (permintaan Keano, "hilangin
 * effect berdenyut").
 *
 * Komponen ini hanya di-mount di desktop pointer presisi (gerbang di
 * Industries.tsx) — wheel-cycling tidak punya padanan sentuh; perangkat
 * sentuh tetap memakai IndustriesMobile.
 */

/** Kamera demo, verbatim (tinggi dari kiri, menunduk ke origin). Pernah
 *  dicoba didekatkan + dibidik ulang (23 Agu) — hasilnya ekor spiral yang
 *  memang mengayun ke arah kamera jadi terpotong; angka aslinya ternyata
 *  framing terbaik untuk strip lebar juga. */
const CAM_POS: [number, number, number] = [-10, 10, 5];
const CAM_FOV = 50;
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

/** Pose fokus: plank berhenti di titik ray NDC ini (kiri layar, sedikit di
 *  bawah tengah), FOCUS_DIST unit di depan kamera, di-slerp ke quaternion
 *  kamera (tepat menghadap layar) sambil mengembang FOCUS_SCALE. */
const FOCUS_NDC_X = -0.45;
const FOCUS_NDC_Y = -0.04;
const FOCUS_DIST = 8.8;
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

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type StackStatus = {
  /** Indeks industri yang tertusuk ray, urutan mentah (terdekat dulu). */
  hits: number[];
  /** Posisi siklus — hits[cycle] adalah plank yang sedang aktif. */
  cycle: number;
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Override events.filter ala <CycleRaycast/> drei, dirampingkan: rotasi
 * daftar intersection sebesar cycleRef, reset saat keanggotaan tumpukan
 * berubah, dan `refreshRef` (dipanggil handler wheel di luar canvas) yang
 * membatalkan hover lalu memalsukan pointermove supaya plank berikutnya
 * menerima onPointerOver.
 */
function CycleFilter({
  hitsRef,
  cycleRef,
  refreshRef,
  onChanged,
}: {
  hitsRef: React.RefObject<number[]>;
  cycleRef: React.RefObject<number>;
  refreshRef: React.RefObject<(() => void) | null>;
  onChanged: (status: StackStatus) => void;
}) {
  const setEvents = useThree((s) => s.setEvents);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const prev = get().events.filter;
    let uuids: string[] = [];
    let lastEvent: PointerEvent | undefined;

    const report = () => {
      const hits = hitsRef.current;
      onChanged({
        hits: [...hits],
        cycle: hits.length ? mod(cycleRef.current, hits.length) : 0,
      });
    };

    setEvents({
      filter: (intersections, state) => {
        // Plank yang sedang disembunyikan mode fokus tidak dihitung —
        // raycaster three TIDAK memeriksa visible, jadi tanpa saringan ini
        // klik "area kosong" saat fokus bisa mendarat di plank tak terlihat.
        let clone = intersections.filter((h) => h.object.visible);
        // Reset siklus saat isi tumpukan berubah (pindah kursor).
        const ids = clone.map((h) => h.object.uuid);
        if (
          ids.length !== uuids.length ||
          !ids.every((id) => uuids.includes(id))
        ) {
          uuids = ids;
          cycleRef.current = 0;
          hitsRef.current = clone.map((h) => h.object.userData.index as number);
          report();
        }
        if (prev) clone = prev(clone, state);
        // Rotasi: plank ke-cycle dalam tumpukan jadi "terdepan".
        const k = clone.length ? mod(cycleRef.current, clone.length) : 0;
        for (let i = 0; i < k; i++) clone.push(clone.shift()!);
        return clone;
      },
    });

    const onMove = (e: PointerEvent) => (lastEvent = e);
    document.addEventListener("pointermove", onMove, { passive: true });

    refreshRef.current = () => {
      const handlers = get().events.handlers;
      // Urutan drei: batalkan hover lama, lalu pointermove palsu menjalankan
      // raycast + filter lagi — plank hasil rotasi baru menerima Over.
      handlers?.onPointerCancel?.(undefined as never);
      if (lastEvent) handlers?.onPointerMove?.(lastEvent as never);
      report();
      get().invalidate();
    };

    return () => {
      setEvents({ filter: prev });
      document.removeEventListener("pointermove", onMove);
      refreshRef.current = null;
    };
  }, [get, setEvents, hitsRef, cycleRef, refreshRef, onChanged]);

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
 * melingkar sin/cos(i/5). Dari kamera tinggi [-10, 10, 5] lempengan-lempengan
 * transparan ini saling menutupi — satu titik kursor menusuk beberapa plank,
 * dan itulah bahan mainan wheel-cycling.
 *
 * Pose plank TIDAK lagi lewat prop statis: tiap plank punya progress fokus
 * (0 = duduk di spiral, 1 = kartu fokus di kiri layar) dan useFrame
 * meng-interpolasi posisi (lerp), orientasi (slerp ke quaternion kamera),
 * dan skala di antara keduanya. Foto hidup di plane anak yang fade in
 * mengikuti progress, dimuat imperatif saat diklik (TextureLoader + cache) —
 * bukan useTexture, supaya 13 foto tidak diunduh untuk satu klik.
 */
function StairSpiral({
  industries,
  reduced,
  selected,
  onSelect,
  shadowMatRef,
}: {
  industries: Industry[];
  reduced: boolean;
  selected: number | null;
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
  /* Plank yang sedang hovered (sesudah rotasi filter) — REF, bukan state:
     berubah saat kursor jalan dan dibaca tiap frame. */
  const hoveredRef = useRef<number | null>(null);
  const [anyHover, setAnyHover] = useState(false);
  useCursor(anyHover);

  /* Pose spiral tiap plank, dihitung sekali — sumber kebenaran untuk ujung
     "0" interpolasi (rumus demo yang sama dengan versi prop statis dulu). */
  const bases = useMemo(
    () =>
      industries.map((_, i) => ({
        pos: new Vector3(
          2 - Math.sin(i / 5) * 5,
          i * 0.5,
          2 - Math.cos(i / 5) * 5,
        ),
        quat: new Quaternion().setFromEuler(
          new Euler(-Math.PI / 2, 0, i / Math.PI / 2),
        ),
      })),
    [industries],
  );

  const progRef = useRef<Float32Array>(new Float32Array(n));

  /* Perubahan target (klik / tutup) harus membangunkan frameloop demand —
     tanpa ini animasi baru jalan saat pointer kebetulan bergerak. */
  useEffect(() => {
    invalidate();
  }, [selected, invalidate]);

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
       unproject NDC → arah ray → FOCUS_DIST unit di depan kamera. */
    V_RAY.set(FOCUS_NDC_X, FOCUS_NDC_Y, 0.5).unproject(camera);
    V_RAY.sub(camera.position).normalize();
    V_FOCUS.copy(camera.position).addScaledVector(V_RAY, FOCUS_DIST);

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
      // Plank pudar total disembunyikan — CycleFilter menyaring lewat
      // visible, jadi ini sekalian mematikan raycast + shadow-nya.
      mesh.visible = o > 0.02;

      // Tint hover hanya di mode spiral — di mode fokus foto tidak diwarnai.
      SCRATCH.set(hoveredRef.current === i && !focusing ? PLANK_HOVER : PLANK_IDLE);
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
          userData={{ index: i }}
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
            hoveredRef.current = i;
            setAnyHover(true);
            invalidate();
          }}
          onPointerOut={() => {
            if (hoveredRef.current === i) {
              hoveredRef.current = null;
              setAnyHover(false);
            }
            invalidate();
          }}
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
  /* Canvas baru di-mount saat strip mendekati viewport — konteks WebGL +
     shadow map tidak ikut membebani load awal halaman. */
  const inView = useInView(wrapRef, { once: true, margin: "600px 0px" });

  const hitsRef = useRef<number[]>([]);
  const cycleRef = useRef(0);
  /* refresh() hidup di dalam canvas (CycleFilter) dan sudah memanggil
     invalidate store sendiri — handler wheel di luar cukup lewat ref ini. */
  const refreshRef = useRef<(() => void) | null>(null);
  const shadowMatRef = useRef<ShadowMaterial | null>(null);
  const [status, setStatus] = useState<StackStatus>({ hits: [], cycle: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  /* Dibaca handler wheel yang sengaja dipasang sekali (deps []). */
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;

  /**
   * Penyandera wheel BERSYARAT — inti kesepakatan 23 Agu: wheel hanya
   * diambil saat ray mengenai ≥2 plank (ada tumpukan untuk digilir) DAN
   * tidak sedang mode fokus; selebihnya event lolos dan halaman scroll
   * normal. Non-passive supaya preventDefault sah; stopPropagation menahan
   * bubbling sebelum sampai listener window milik Lenis (pola ServicesTicker).
   */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (selectedRef.current !== null) return;
      if (hitsRef.current.length < 2) return;
      e.preventDefault();
      e.stopPropagation();
      cycleRef.current += e.deltaY > 0 ? 1 : -1;
      refreshRef.current?.();
    };
    // Kursor bisa keluar strip tanpa sempat memicu raycast kosong (gerakan
    // cepat) — bersihkan manual supaya HUD tidak menampilkan sisa hover.
    const onLeave = () => {
      hitsRef.current = [];
      cycleRef.current = 0;
      setStatus({ hits: [], cycle: 0 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const active =
    status.hits.length > 0 ? industries[status.hits[status.cycle]] : null;
  const focused = selected !== null ? industries[selected] : null;

  return (
    /* aria-hidden: plank di canvas bukan DOM — daftar sektor yang terbaca
       mesin hidup sebagai <ul> sr-only di Industries.tsx, bukan di sini. */
    <div
      ref={wrapRef}
      data-testid="industries-stack"
      aria-hidden="true"
      className={cn(
        "relative h-[70svh] min-h-[440px] w-full touch-pan-y select-none overflow-hidden bg-zinc-50",
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
        >
          <Suspense fallback={null}>
            <Stage shadowMatRef={shadowMatRef} />
            <StairSpiral
              industries={industries}
              reduced={reduced}
              selected={selected}
              onSelect={setSelected}
              shadowMatRef={shadowMatRef}
            />
            <CycleFilter
              hitsRef={hitsRef}
              cycleRef={cycleRef}
              refreshRef={refreshRef}
              onChanged={setStatus}
            />
          </Suspense>
        </Canvas>
      )}

      {/* HUD spiral — terjemahan DOM dari status <CycleRaycast/>: titik per
          lapisan yang tertusuk ray + identitas plank aktif. Disembunyikan
          selama mode fokus (panel fokus yang bicara). */}
      {!focused && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 sm:p-8">
          <div className="min-h-[5.5rem] max-w-md">
            {active ? (
              <>
                <div className="flex items-center gap-1.5">
                  {status.hits.map((hit, i) => (
                    <span
                      key={hit}
                      data-testid={i === status.cycle ? "stack-dot-active" : "stack-dot"}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i === status.cycle ? "bg-accent" : "bg-zinc-300",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">
                  <span className="mr-2 tabular-nums text-accent">{active.num}</span>
                  {active.name}
                  {active.tier === "core" && (
                    <span className="ml-2 text-[10px] tracking-widest text-accent uppercase">
                      Core Focus
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {active.desc}
                </p>
              </>
            ) : (
              <p className="text-xs tracking-widest text-zinc-400 uppercase">
                13 sectors, one stack
              </p>
            )}
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400 sm:block">
            {status.hits.length > 1
              ? "Scroll to cycle layers, click to open"
              : "Hover the stack"}
          </span>
        </div>
      )}

      {/* Panel fokus — deskripsi industri di kanan, berpasangan dengan kartu
          foto yang terbang ke kiri. */}
      <AnimatePresence>
        {focused && (
          <motion.div
            key={focused.num}
            className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center p-8 sm:p-12"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
          >
            <div className="max-w-md">
              <p className="text-xs tracking-widest text-zinc-400 uppercase">
                <span className="mr-2 tabular-nums text-accent">{focused.num}</span>
                {focused.tier === "core" ? "Core Focus" : "Sector"}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                {focused.name}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-zinc-600">
                {focused.desc}
              </p>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setSelected(null)}
                className="pointer-events-auto mt-8 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400 transition-colors hover:text-zinc-900"
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

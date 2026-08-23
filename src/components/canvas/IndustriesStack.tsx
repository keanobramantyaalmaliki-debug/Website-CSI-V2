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
 * Komponen ini hanya di-mount di desktop pointer presisi (gerbang di
 * Industries.tsx); perangkat sentuh tetap memakai IndustriesMobile.
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
  hover,
  selected,
  onHover,
  onSelect,
  shadowMatRef,
}: {
  industries: Industry[];
  reduced: boolean;
  hover: number | null;
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
     "0" interpolasi (rumus demo yang sama sejak versi pertama). */
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

  /* Perubahan target (hover / klik / tutup) harus membangunkan frameloop
     demand — tanpa ini animasi baru jalan saat pointer kebetulan bergerak. */
  useEffect(() => {
    invalidate();
  }, [hover, selected, invalidate]);

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

  useFrame((_, rawDt) => {
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
      // Plank pudar total disembunyikan — VisibleFilter menyaring lewat
      // visible, jadi ini sekalian mematikan raycast + shadow-nya.
      mesh.visible = o > 0.02;

      // Tint hover hanya di mode spiral — di mode fokus foto tidak diwarnai.
      SCRATCH.set(hover === i && !focusing ? PLANK_HOVER : PLANK_IDLE);
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
            onHover(i);
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
  /* Canvas baru di-mount saat strip mendekati viewport — konteks WebGL +
     shadow map tidak ikut membebani load awal halaman. */
  const inView = useInView(wrapRef, { once: true, margin: "600px 0px" });

  const shadowMatRef = useRef<ShadowMaterial | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const hovered = hover !== null ? industries[hover] : null;
  const focused = selected !== null ? industries[selected] : null;

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
        >
          <Suspense fallback={null}>
            <Stage shadowMatRef={shadowMatRef} />
            <StairSpiral
              industries={industries}
              reduced={reduced}
              hover={hover}
              selected={selected}
              onHover={setHover}
              onSelect={setSelected}
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

      {/* HUD hover — identitas plank di bawah kursor + panduan interaksi di
          kanan ("Hover the stack" saat idle → "Click to open" saat hover;
          panduannya SELALU tampil, permintaan Keano). Kolom kiri kosong saat
          idle (label "13 sectors, one stack" dicabut 23 Agu malam);
          semuanya disembunyikan saat fokus (panel fokus yang bicara). */}
      {!focused && (
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
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400 sm:block">
            {hovered ? "Click to open" : "Hover the stack"}
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

"use client";

/**
 * Selubung dither saat kursor menyentuh benda yang bisa diklik (10 Agu 2026).
 *
 * Benda tertutup kisi titik silver selama kursor menempel di atasnya, ditemani
 * label yang mengekor kursor. Menjawab satu pertanyaan yang selama ini tidak
 * punya jawaban: dari mana pengunjung tahu meja billiard bisa diklik? Sebelum
 * ini — tidak dari mana-mana. Tidak ada hover state, bahkan kursornya pun tidak
 * berubah.
 *
 * ── Kenapa DIAM, bukan pita yang menyapu ──────────────────────────────────
 * Versi pertama (10 Agu) menyapukan pita titik sepanjang sisi terpanjang benda.
 * Dibuang atas keputusan Keano hari yang sama: sapuannya tidak disukai.
 *
 * Yang ikut hilang bersamanya, dan JANGAN dibangkitkan lagi tanpa alasan baru:
 * sumbu terpanjang + origin + panjang bentangan (uScanAxis/uScanOrigin/
 * uScanLen), jam sapuan (uScanTime), dan cabang prefers-reduced-motion —
 * yang terakhir jadi tidak ada isinya karena tanpa gerakan tidak ada lagi yang
 * perlu diredam.
 *
 * Nama berkas dan ekspor tetap "…Scan" walau tidak memindai apa pun lagi:
 * `hoverScanTargetOf` dipakai juga oleh handler KLIK di Office.tsx, jadi
 * mengganti namanya berarti churn di luar perubahan ini — dan riwayat git-nya
 * ikut putus.
 *
 * ── Kenapa dither dan bukan outline / glow ─────────────────────────────────
 * Kantor ini sudah punya bahasa sendiri: sapuan reveal, panel maintenance, dan
 * glitch karakter semuanya bicara lewat Bayer 4×4 pada sel 2 px perangkat
 * dengan silver brand. Outline atau glow akan jadi bahasa KEEMPAT yang tidak
 * dipakai apa pun yang lain, dan glow punya masalah tambahan: apa pun yang
 * melewati ambang Bloom 0,95 di scene ini terbaca sebagai lampu.
 *
 * ── Mekanisme: onBeforeCompile, pola CharacterGlitch.tsx ───────────────────
 * Satu fungsi patch module-level + uniform module-level. Alasannya sudah
 * terbayar mahal di revealSweep (catatan panjang 7 Agu): customProgramCacheKey
 * bawaan three = onBeforeCompile.toString(), jadi closure baru per mount tetap
 * memakai program lama dengan objek uniform lama yang BEKU.
 *
 * ⚠️ Patch dipasang SEKALI di mount dan dibiarkan terpasang, TIDAK dipasang
 * saat hover. Memasangnya saat hover berarti kompilasi shader terjadi persis
 * di momen kursor menyentuh meja — hentakan beberapa ratus milidetik di detik
 * yang paling tidak boleh tersendat. Yang menyala/mati adalah uniform, dan
 * cabang `if (uScanK > 0.001)` seragam untuk seluruh draw call: saat mati, GPU
 * melewatinya tanpa divergensi.
 *
 * ── Kontrak urutan dengan revealSweep — PENTING ────────────────────────────
 * Sama persis dengan CharacterGlitch: prepareRevealSweep() MENIMPA
 * onBeforeCompile semua MeshStandardMaterial, menyimpan yang lama, dan
 * MENGEMBALIKANNYA saat dispose. Jadi komponen ini WAJIB jadi anak Office —
 * layout effect ANAK berjalan sebelum layout effect INDUK (tempat sweep
 * dipasang). Dipindah ke Scene.tsx sebagai saudara Office, jaminan itu hilang
 * dan patch ini akan ditelan sapuan tanpa dikembalikan.
 *
 * Urutannya terhadap CharacterGlitch tidak penting: keduanya menyentuh
 * material yang saling lepas (SkinnedMesh vs. meja billiard).
 *
 * ── Kenapa aman menambal material meja ────────────────────────────────────
 * Diverifikasi dengan mem-parse public/3d/models/office.glb: kedua material
 * meja (M_PoolTable_Body_Lounge_M_PoolTable_Body.006 dan M_PoolTable_Felt)
 * masing-masing dipakai TEPAT SATU primitive — tidak dibagi dengan furnitur
 * lain. Gerbang bbox di shader tetap dipasang supaya target berikutnya yang
 * kebetulan berbagi material tidak menyeret tetangganya ikut berkilau.
 */

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Box3,
  Color,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type IUniform,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { REVEAL_EDGE_COLOR } from "./revealSweep";

/* ────────────────────────────── daftar target ───────────────────────────── */

export interface HoverScanTarget {
  /** Kunci stabil, dipakai untuk membandingkan "target yang sama". */
  id: string;
  /** Cocokkan pada NAMA NODE, bukan nama material: node meja di GLB sudah
   *  digabung jadi MG_Lounge_M_PoolTable_Body/_Felt (hasil merge draw call),
   *  jadi objek PT_* yang dulu ada sudah tidak ada lagi. */
  match: (name: string) => boolean;
  /** Teks yang muncul di sebelah kursor. Kata kerja, bukan kata benda:
   *  "Play billiard" memberi tahu apa yang TERJADI kalau diklik, sedangkan
   *  "Billiard table" cuma menamai benda yang sudah jelas terlihat. */
  label: string;
}

/**
 * Satu target sekarang. Menambah yang berikutnya = satu entri di sini plus
 * penanganan klik-nya di Office.tsx — tidak ada lagi yang perlu disentuh.
 *
 * Waypoint dan panel maintenance sengaja TIDAK masuk daftar: keduanya sudah
 * punya penanda hover sendiri (arsir + silang sudut, teks melayang). Menambah
 * selubung di atasnya jadi dua efek yang bicara hal sama.
 */
const TARGETS: readonly HoverScanTarget[] = [
  {
    id: "billiard",
    match: (name) => name.includes("PoolTable"),
    label: "Play billiard",
  },
];

/* ──────────────────────────────── konstanta ─────────────────────────────── */

/** Kerapatan titik selagi di-hover — 0..1, diadu dengan matriks Bayer.
 *
 *  Ini SATU-SATUNYA sinyal sekarang (dulu ada pita menyapu yang menegaskan),
 *  jadi angkanya harus berdiri sendiri: cukup rapat untuk langsung terbaca
 *  "benda ini menyala", cukup jarang untuk mejanya tetap terlihat bentuknya.
 *  0,16 ≈ 2–3 titik per sel Bayer 4×4. Di 0,06 selubungnya terlalu tipis untuk
 *  dibaca tanpa gerakan yang menariknya; di 0,22 mejanya jadi balok berbintik
 *  dan bentuknya hilang (dua-duanya terlihat di potret 10 Agu). */
const DENSITY = 0.16;

/** Seberapa jauh piksel bertitik diangkat ke arah silver. Bukan 1,0: menimpa
 *  penuh menghapus bentuk bendanya jadi siluet datar, sedangkan 0,8 masih
 *  menyisakan sedikit warna asli sehingga kayu dan kain tetap terbaca. */
const LIFT = 0.8;

/** Ukuran sel dither — DISAMAKAN dengan MaintenanceHologram dan
 *  CharacterGlitch, dan itu intinya: ketiganya harus terbaca sebagai bahasa
 *  yang sama. Kalau salah satu berubah, ubah ketiganya. */
const DITHER_PX = 2.0;

/** Laju peluruhan hover (per detik, eksponensial). 14 sedikit lebih cepat dari
 *  waypoint (12): meja jauh lebih besar dari bidang waypoint, jadi transisi
 *  yang sama lamanya terbaca lebih lamban di permukaan seluas itu. */
const DAMP = 14;

/* ──────────────────────────────── uniform ───────────────────────────────── */
/* Semua module-level dan DIBAGI kedua material meja — menyalakan hover =
   menulis satu angka, bukan satu per material (pelajaran revealSweep). */

/** 0 = mati, 1 = hover penuh. Satu-satunya uniform yang berubah saat berjalan. */
const uScanK: IUniform<number> = { value: 0 };
/** Kotak pembatas dunia — gerbang spasial, lihat catatan kepala berkas. */
const uScanMin: IUniform<Vector3> = { value: new Vector3() };
const uScanMax: IUniform<Vector3> = { value: new Vector3() };
/** Silver brand — objek Color-nya sendiri, bukan referensi ke milik
 *  revealSweep: uniform yang menunjuk konstanta bersama ikut berubah kalau
 *  ada kode lain menganimasikannya (norma uGlitchCenter). */
const uScanColor: IUniform<Color> = { value: new Color(REVEAL_EDGE_COLOR) };

/**
 * onBeforeCompile ASLI tiap material, module-level + WeakMap: useGLTF
 * meng-cache scene-nya, jadi material yang sama bisa melewati beberapa siklus
 * mount. Peta di module scope membuat "yang asli" tetap yang benar-benar asli,
 * bukan patch kita sendiri yang tersisa dari mount sebelumnya.
 */
const originals = new WeakMap<
  MeshStandardMaterial,
  (
    p: WebGLProgramParametersWithUniforms,
    r: Parameters<Material["onBeforeCompile"]>[1],
  ) => void
>();

/* ───────────────────────────────── shader ───────────────────────────────── */

const patch = (shader: WebGLProgramParametersWithUniforms) => {
  shader.uniforms.uScanK = uScanK;
  shader.uniforms.uScanMin = uScanMin;
  shader.uniforms.uScanMax = uScanMax;
  shader.uniforms.uScanColor = uScanColor;

  // ── VERTEX: posisi dunia, setelah project_vertex ─────────────────────────
  // Titik sisip yang sama dengan revealSweep & CharacterGlitch: di situ
  // `transformed` sudah melewati morph, skinning, dan displacement. Posisi
  // DUNIA (bukan model-space) karena bbox gerbangnya dihitung di ruang dunia
  // di JS — keduanya harus berada di ruang yang sama, dan bbox dunia kebal
  // terhadap skala yang mungkin tersimpan di matrix node.
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    /* glsl */ `
      #include <project_vertex>
      vScanWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
    `,
  );
  shader.vertexShader = "varying vec3 vScanWorld;\n" + shader.vertexShader;

  // ── FRAGMENT: selubung dither, setelah dithering_fragment ────────────────
  // Chunk TERAKHIR, jadi gl_FragColor sudah sRGB akhir — silver-nya mendarat
  // tepat di nilai yang dimaksud, dan kerapatan titiknya berjarak sama secara
  // PERSEPSI (alasan yang sama dengan revealSweep dan hologram).
  //
  // step(bayer, s) menghasilkan titik keras hidup/mati, BUKAN gradasi: itu
  // yang membuat polanya terbaca sebagai kisi dither dan bukan kabut.
  //
  // ⚠️ JANGAN pakai discard di sini. Ini benda padat yang sedang di-hover;
  // membuangnya berlubang akan terbaca sebagai bendanya rusak/tembus pandang,
  // bukan sebagai "bisa diklik". revealSweep boleh discard karena di sana
  // bendanya memang BELUM ada.
  //
  // Bloom: hasilnya mix(asli, silver, ≤0,8). mix tidak pernah melewati nilai
  // terbesar di antara kedua ujungnya, dan silver #d2d3d4 = 0,824 sRGB — di
  // bawah ambang 0,95. Meja tidak akan ikut mekar. DIUKUR, bukan cuma dihitung:
  // 0 piksel > 249 di potret hover, kanal tertinggi tepat 210 = 0,824 sRGB.
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <dithering_fragment>",
    /* glsl */ `
      #include <dithering_fragment>
      if ( uScanK > 0.001 ) {
        // Gerbang spasial: nol di luar bbox target. Tidak perlu untuk meja
        // (materialnya eksklusif), tapi membuat target berikutnya yang
        // berbagi material tetap terkurung di bendanya sendiri.
        vec3 sGe = step( uScanMin, vScanWorld );
        vec3 sLe = step( vScanWorld, uScanMax );
        float sIn = sGe.x * sGe.y * sGe.z * sLe.x * sLe.y * sLe.z;

        // Kerapatan seragam di seluruh benda, dikalikan hover fade. Tidak ada
        // suku posisi sama sekali — itulah yang membuatnya diam.
        float sDens = ${DENSITY.toFixed(2)} * uScanK * sIn;

        float sBayer = csiScanBayer( floor( gl_FragCoord.xy / ${DITHER_PX.toFixed(1)} ) );
        gl_FragColor.rgb = mix(
          gl_FragColor.rgb,
          uScanColor,
          step( sBayer, sDens ) * ${LIFT.toFixed(2)} * uScanK
        );
      }
    `,
  );
  // Matriks Bayer 4×4 sebagai rantai if — alasan yang sama dengan revealSweep,
  // MaintenanceHologram, dan CharacterGlitch: array indexing dinamis tidak
  // dijamin di GLSL ES 1.0.
  shader.fragmentShader =
    /* glsl */ `
    uniform float uScanK;
    uniform vec3  uScanMin;
    uniform vec3  uScanMax;
    uniform vec3  uScanColor;
    varying vec3  vScanWorld;
    float csiScanBayer( vec2 co ) {
      ivec2 p = ivec2( mod( co, 4.0 ) );
      int i = p.y * 4 + p.x;
      if ( i ==  0 ) return  0.0 / 16.0;
      if ( i ==  1 ) return  8.0 / 16.0;
      if ( i ==  2 ) return  2.0 / 16.0;
      if ( i ==  3 ) return 10.0 / 16.0;
      if ( i ==  4 ) return 12.0 / 16.0;
      if ( i ==  5 ) return  4.0 / 16.0;
      if ( i ==  6 ) return 14.0 / 16.0;
      if ( i ==  7 ) return  6.0 / 16.0;
      if ( i ==  8 ) return  3.0 / 16.0;
      if ( i ==  9 ) return 11.0 / 16.0;
      if ( i == 10 ) return  1.0 / 16.0;
      if ( i == 11 ) return  9.0 / 16.0;
      if ( i == 12 ) return 15.0 / 16.0;
      if ( i == 13 ) return  7.0 / 16.0;
      if ( i == 14 ) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }
  ` + shader.fragmentShader;
};

/* ──────────────────────── pemasangan & keadaan aktif ────────────────────── */

interface PreparedTarget {
  min: Vector3;
  max: Vector3;
}

/**
 * Geometri tiap target, dihitung SEKALI saat mount. Module-level supaya
 * setHoverScanTarget() — yang dipanggil dari handler pointer di Office, bukan
 * dari dalam komponen ini — bisa membacanya tanpa jalur prop/context.
 */
let prepared: Map<string, PreparedTarget> = new Map();

/** id target yang sedang di-hover, atau null. */
let activeId: string | null = null;

/**
 * Cari target yang memiliki objek ini, dengan menyusuri rantai INDUK.
 *
 * Dipakai bersama oleh handler hover DAN handler klik di Office.tsx — itu
 * sebabnya ia diekspor: sebelum ini pengecekan nama "PoolTable" ditulis di
 * dalam onClick, dan menambah hover berarti menulisnya untuk kedua kalinya di
 * tempat yang bisa berbeda diam-diam.
 */
export function hoverScanTargetOf(o: Object3D | null): HoverScanTarget | null {
  let n: Object3D | null = o;
  while (n) {
    for (const t of TARGETS) if (t.match(n.name)) return t;
    n = n.parent;
  }
  return null;
}

/**
 * Nyalakan/matikan selubung. Sengaja BUKAN state React: dipanggil dari
 * pointermove, dan state akan memicu render ulang subtree tiap kali kursor
 * menyeberangi tepi meja (alasan yang sama dengan `k` di Waypoints.tsx:363).
 */
export function setHoverScanTarget(id: string | null) {
  if (id === activeId) return;
  activeId = id;
  if (!id) return;

  const p = prepared.get(id);
  if (!p) {
    // Target belum ter-prepare (mis. pointer masuk sebelum GLB selesai
    // ditelusuri). Batalkan alih-alih menyelubungi dengan bbox milik target
    // lain.
    activeId = null;
    return;
  }
  uScanMin.value.copy(p.min);
  uScanMax.value.copy(p.max);
}

function prepareHoverScan(scene: Object3D): { dispose: () => void } | null {
  const mats = new Map<string, Set<MeshStandardMaterial>>();
  const boxes = new Map<string, Box3>();

  // Matriks dunia harus mutakhir sebelum Box3.setFromObject: komponen ini
  // berjalan di layout effect, SEBELUM render pertama R3F memanggil
  // updateMatrixWorld. Tanpa baris ini bbox-nya dihitung dari matriks basi.
  scene.updateMatrixWorld(true);

  scene.traverse((o: Object3D) => {
    if (!(o instanceof Mesh)) return;
    const t = hoverScanTargetOf(o);
    if (!t) return;

    let set = mats.get(t.id);
    if (!set) mats.set(t.id, (set = new Set()));
    const list: Material[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) if (m instanceof MeshStandardMaterial) set.add(m);

    const box = boxes.get(t.id) ?? new Box3().makeEmpty();
    box.expandByObject(o);
    boxes.set(t.id, box);
  });

  if (!mats.size) return null;

  prepared = new Map();
  for (const [id, box] of boxes) {
    prepared.set(id, { min: box.min.clone(), max: box.max.clone() });
  }

  const all = new Set<MeshStandardMaterial>();
  for (const set of mats.values()) for (const m of set) all.add(m);

  for (const m of all) {
    // Sudah terpasang dari siklus mount sebelumnya (scene di-cache useGLTF)
    // atau replay StrictMode — jangan simpan patch sendiri sebagai "asli".
    if (m.onBeforeCompile === patch) continue;
    originals.set(m, m.onBeforeCompile);
    m.onBeforeCompile = patch;
    m.needsUpdate = true;
  }

  return {
    dispose: () => {
      for (const m of all) {
        // Lepas hanya kalau slot-nya masih milik kita. Kalau sedang ditimpa
        // pihak lain (sapuan reveal masih berjalan saat unmount), biarkan —
        // pihak itu menyimpan patch kita sebagai "previous" dan akan
        // memulihkannya. Patch yang tertinggal tidak berbahaya: pada uScanK 0
        // ia identitas murni. Norma CharacterGlitch.tsx:359.
        if (m.onBeforeCompile !== patch) continue;
        const orig = originals.get(m);
        if (orig) m.onBeforeCompile = orig;
        m.needsUpdate = true;
      }
      prepared = new Map();
      activeId = null;
    },
  };
}

/* ─────────────────────────────── komponen ───────────────────────────────── */

/**
 * Pasang + nyalakan selubung. Render null; WAJIB jadi anak Office (kontrak
 * urutan layout effect — lihat kepala berkas).
 *
 * Tidak ada gerbang prefers-reduced-motion, dan itu disengaja: yang tersisa di
 * sini cuma pudar-masuk/pudar-keluar sepanjang ~0,2 dtk saat kursor
 * menyeberangi tepi benda. Mematikannya berarti selubungnya MENYENTAK muncul —
 * lebih mengagetkan daripada transisinya sendiri.
 */
export default function HoverScan({ scene }: { scene: Object3D }) {
  const k = useRef(0);

  useLayoutEffect(() => {
    const handle = prepareHoverScan(scene);
    return () => {
      handle?.dispose();
      uScanK.value = 0;
    };
  }, [scene]);

  // Tanpa mesin yang berdetak sendiri (pelajaran PhysicsHeading 3 Agu):
  // seluruh kerjanya di useFrame, jadi ikut tidur saat FrameloopGate menyetel
  // frameloop "never".
  //
  // Setelah pudarnya selesai, uniform-nya BERHENTI ditulis sama sekali (baris
  // early-return di bawah menangkap keadaan diam di 0, snap menangkap yang di
  // 1). Selubung yang menyala karena itu tidak memaksa frame baru: yang
  // menggambarnya cuma kamera parallax yang memang sudah berjalan.
  useFrame((_, dt) => {
    const target = activeId ? 1 : 0;
    if (k.current === target) return;

    // Peluruhan eksponensial dinormalkan dt (norma Waypoints.tsx:371), snap
    // saat sudah dekat supaya tidak menggantung di 0,999 selamanya.
    k.current += (target - k.current) * (1 - Math.exp(-dt * DAMP));
    if (Math.abs(target - k.current) < 0.001) k.current = target;
    uScanK.value = k.current;
  });

  return null;
}

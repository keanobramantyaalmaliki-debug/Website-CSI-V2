"use client";

/**
 * Hologram "under maintenance" yang menutup lubang pintu di sisi timur laut
 * area Office (7 Agu 2026; interaktif sejak 9 Agu 2026).
 *
 * Lubang itu tidak menuju ke mana-mana: di balik y 1,75 tidak ada ruangan yang
 * dimodelkan, jadi dari dalam kantor ia terbaca sebagai kotak hitam pekat dan
 * mengundang pertanyaan "itu kok buntu?". Ditutup tembok biasa masalahnya
 * selesai, tapi kesempatannya hilang — pengunjung membaca dinding kosong
 * sebagai batas peta. Hologram membacanya sebagai pintu yang SENGAJA dikunci,
 * dan itu menyiratkan ada sesuatu di baliknya nanti.
 *
 * ── Kenapa satu plane unlit, bukan geometri baru di Blender ─────────────────
 * Menambal di Blender berarti re-bake lightmap untuk dinding itu (dan lantai
 * di depannya, karena bidang baru mengubah bounce). Ongkosnya jauh melampaui
 * hasilnya untuk satu bukaan 1,6 × 2,5 m. Plane runtime tidak menyentuh GLB
 * sama sekali: dua draw call (panel + teks), nol perubahan pipeline aset.
 *
 * ── Interaktivitas (9 Agu 2026) ─────────────────────────────────────────────
 * Dua respons, dua input:
 *   hover → teks "UNDER MAINTENANCE" meluncur maju ~44 cm, melayang di depan
 *           dinding. Inilah alasan teks pindah ke plane TERPISAH — selama ia
 *           digambar di shader panel, ia tidak bisa bergerak sendiri.
 *   klik  → seluruh hologram (panel + teks) glitch dua burst pendek, satu
 *           kisi & irama dengan CharacterGlitch (irisan 0,09 m dunia, re-roll
 *           24 Hz, rumus hash sama — kalau CharacterGlitch mengubah angkanya,
 *           ubah di sini juga), tapi dengan perubahan level dua arah milik
 *           panel sendiri: irisan bolong + irisan naik setangga + brownout
 *           seluruh bidang (lihat catatan di blok konstanta glitch). Sejak
 *           12 Agu irisan yang naik juga MELEWATI ambang Bloom, jadi burst-nya
 *           ikut berpendar — satu-satunya saat bidang ini mekar (lihat
 *           GLOW_BOOST).
 *
 * Interaksi digerbang: HANYA saat ruangan aktif Office, pointer fine, hero
 * terlihat, dan billiard tidak berjalan — mengikuti kebijakan waypoint
 * (INVARIANTS.md §6): di perangkat sentuh scene adalah pemandangan, bukan
 * mainan, dan hover memang tidak punya makna di sana.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  NearestFilter,
  ShaderMaterial,
  type IUniform,
  type Object3D,
} from "three";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import {
  REVEAL_BAND,
  REVEAL_X_FROM,
  REVEAL_X_TO,
  revealProgress,
} from "./revealSweep";

/**
 * Bukaan pintunya, DIUKUR dari MG_Office_M_SM_Wall_Cream lewat Blender MCP
 * (7 Agu 2026) — bukan ditaksir dari screenshot.
 *
 * Koordinat Blender (Z-up):
 *   x −14,30 … −12,70   → lebar 1,60 m
 *   z   0,00 …   2,50   → tinggi 2,50 m
 *   y   1,60 …   1,75   → tebal dinding 0,15 m; y 1,60 sisi yang menghadap
 *                          kantor (normal face-nya 0,−1,0)
 *
 * Konversi ke three memakai pemetaan yang sama dengan CameraController:
 *   bl(x, y, z) → Vector3(x, z, −y)
 * sehingga (−13,50 · 1,25 · −1,675) = titik tengah TEROWONGAN pintu.
 * Sisi kantor ada di three-z LEBIH BESAR (muka dinding di z −1,60), jadi
 * "maju ke arah pengunjung" = +z.
 */
const CENTER: [number, number, number] = [-13.5, 1.25, -1.675];

/**
 * Ukuran plane, 2 cm lebih besar dari bukaannya di kedua sumbu.
 *
 * Kelebihannya masuk ke dalam kusen — plane duduk 7,5 cm di dalam terowongan,
 * jadi 1 cm di tiap sisi tertutup daging dinding dan tidak pernah terlihat.
 * Gunanya menutup celah rambut di tepi: pas-pasan pada 1,600 m membuat sisa
 * pembulatan float tampil sebagai garis hitam setipis piksel di pinggir.
 *
 * Bagian bawahnya (y −0,01) memang tenggelam di lantai — permukaan lantai ada
 * di z 0,10, bukan 0,00 — dan itu justru yang diinginkan: hologramnya terbit
 * dari lantai tanpa celah, bukan melayang 10 cm di atasnya.
 *
 * Plane teks memakai ukuran yang SAMA walau hurufnya cuma mengisi tengahnya:
 * dengan begitu UV-nya identik dengan panel dan texture 256×398 dipetakan
 * tanpa hitung ulang posisi.
 */
const PLANE_W = 1.62;
const PLANE_H = 2.52;

/**
 * Offset z plane teks relatif CENTER, dalam meter.
 *
 * REST 0,005: cukup untuk memisahkan dua bidang (tidak sebidang persis), cukup
 * tipis supaya saat diam tampilannya tak bisa dibedakan dari waktu teksnya
 * masih menyatu di shader panel. Tidak ada z-fighting yang perlu ditakuti —
 * kedua material depthWrite mati dan blending-nya aditif (komutatif), jadi
 * urutan gambar tidak mengubah hasil.
 *
 * HOVER 0,44: teks berhenti ~36 cm di DEPAN muka dinding (z −1,675 + 0,44 =
 * −1,235; muka dinding di −1,60). Jauh cukup untuk terbaca "melayang lepas
 * dari panel", dekat cukup supaya dari sudut pandang Office ia tetap di dalam
 * siluet bukaan dan tidak menabrak perabot di depannya.
 */
const TEXT_REST_Z = 0.005;
const TEXT_HOVER_Z = 0.44;

/**
 * Warna hologram, putih netral (diganti dari cyan #4fd6e8 pada 7 Agu 2026).
 *
 * Putih bekerja di sini justru karena ia TIDAK punya warna: seluruh ruangan
 * hangat (LED strip lantai + track light kuning), jadi bidang netral di antara
 * dinding krem tetap terbaca sebagai benda asing tanpa harus menjerit seperti
 * cyan. Dan yang lebih penting — dither baru kelihatan sebagai DITHER kalau
 * kontras antar tangganya murni kecerahan; pada cyan, mata ikut membaca
 * perbedaan rona dan polanya melebur.
 *
 * Merah brand #ec2028 sengaja dihindari dengan alasan yang SAMA seperti di
 * revealSweep.ts — merah sepenuh bidang terbaca sebagai galat fatal, bukan
 * pemeliharaan terjadwal.
 *
 * new Color() dari hex sudah mengonversi sRGB → linear (ColorManagement aktif
 * secara bawaan di three r155+), dan itu yang benar di sini: ShaderMaterial
 * mentah tidak menyertakan <colorspace_fragment>, jadi nilai yang kita tulis
 * masuk ke render target apa adanya lalu di-encode sRGB oleh pass akhir
 * EffectComposer.
 */
const COLOR = "#ffffff";

/**
 * Pengali kecerahan sebelum ditulis ke framebuffer.
 *
 * Ambang Bloom di Scene.tsx 0,95, dan itu diukur pada nilai SETELAH tone
 * mapping. ShaderMaterial mentah melewati ACES sama sekali (tidak ada
 * <tonemapping_fragment> di dalamnya), jadi angka di sini sampai ke composer
 * tanpa diredam — perlakuannya setara `toneMapped = false` pada lampu & LED
 * strip di Office.tsx.
 *
 * ⚠️ 0,65 dipilih atas permintaan "opacity-nya kurangin" (7 Agu), dan GAIN
 * adalah SATU-SATUNYA tuas yang aman untuk itu: ia mengali warna SESUDAH
 * kuantisasi, jadi panel meredup tanpa menggeser satu pun tangga dither.
 * Menurunkan basis 0,125 atau level teks/tepi 0,625 akan merusak aritmetika
 * yang bikin semuanya jatuh tepat di kelipatan 8/16 sel Bayer.
 *
 * Sejak teks pindah ke plane sendiri, kontribusinya MENUMPUK secara aditif di
 * atas kabut panel: sel tercerah huruf = (0,75 teks + 0,25 kabut) × 0,65 =
 * 0,65 — masih di bawah ambang Bloom 0,95, jadi hurufnya tidak ikut mekar.
 * Kalau GAIN dinaikkan, hitung ulang penjumlahan ini terhadap 0,95.
 *
 * ⚠️ Satu-satunya yang BOLEH melewati 0,95 adalah irisan yang naik selama burst
 * glitch, dan itu disengaja sejak 12 Agu — lihat GLOW_BOOST.
 */
const GAIN = 0.65;

/**
 * Ukuran satu sel dither, dalam piksel PERANGKAT.
 *
 * Ini yang membuat dither-nya terbaca. Bayer 4×4 pada 1 piksel perangkat
 * berarti seluruh matriksnya cuma 4 × 4 px — di layar Retina itu 2 × 2 px CSS,
 * di bawah batas mata pada jarak pandang normal, jadi ia terbaca sebagai
 * bintik acak (grain), bukan pola. Pada 2, satu selnya = 1 px CSS di Retina
 * dan matriksnya jadi kotak 8 × 8 px perangkat yang benar-benar kelihatan
 * berulang.
 *
 * Di layar dpr 1 selnya jadi 2 px CSS dan hasilnya lebih kasar lagi — itu
 * bukan bug, dan sengaja tidak dikompensasi lewat uniform: seluruh scene
 * memang lebih kasar di dpr 1 (NearestFilter, MSAA mati), jadi dither yang
 * ikut mengasar justru konsisten.
 *
 * Karena Bayer dibaca di RUANG LAYAR (gl_FragCoord), panel dan plane teks
 * otomatis memakai kisi sel yang sama walau geometrinya beda kedalaman —
 * tidak perlu sinkronisasi apa pun supaya polanya senada.
 */
const DITHER_PX = 2.0;

/**
 * ⚠️ TIDAK ADA suku tepi/bingkai sama sekali, dan itu permintaan eksplisit
 * (9 Agu 2026, revisi kedua). Sejarahnya dua tahap: pendar smoothstep 0,16 m ×
 * 0,60 (7 Agu) tampil sebagai bingkai putih tebal yang terbaca artefak bake —
 * diganti pita rata 4 cm di level teks — lalu pita itu pun masih terbaca
 * "tepi putih" dan diminta hilang total. Bidangnya kini murni kabut dither
 * rata + teks; batas panel didefinisikan oleh kusen pintunya sendiri, bukan
 * oleh garis yang digambar. Kalau suatu saat mau bingkai lagi, mulai dari
 * pelajaran ini: apa pun yang menempel di tepi akan dibaca sebagai cacat
 * rendering, karena di situlah mata mengharapkan pertemuan bersih dua bidang.
 */

/**
 * Level teks di plane-nya sendiri: 0,625 = kabut 0,125 + bobot lama 0,50.
 *
 * Angka gabungannya dipertahankan supaya aritmetika kuantisasinya tidak
 * berubah: 0,625 × 4 tangga = TEPAT 2,5, jadi persis 8 dari 16 sel Bayer
 * dibulatkan ke atas — hurufnya papan catur 0,50/0,75, "teks yang TERBUAT
 * dari dither", bukan blok putih pejal (lihat sejarahnya di komentar shader).
 *
 * Ada perbedaan kecil yang DITERIMA: dulu huruf menggantikan kabut di piksel
 * yang sama; sekarang keduanya bidang terpisah yang saling menjumlah, jadi
 * sel-terang huruf bisa mencapai 0,75 + 0,25 = 1,0 sebelum GAIN. Hasil
 * visualnya huruf sedikit lebih kontras — dan tetap di bawah ambang Bloom
 * (lihat catatan GAIN).
 */
const TEXT_LEVEL = 0.625;

/**
 * Konstanta glitch. Kisi & iramanya DISALIN dari CharacterGlitch.tsx dan wajib
 * tetap sama (SLICE_H meter dunia, REROLL_HZ, rumus hash di shader): kilasan
 * di panel ini harus terbaca sebagai bahasa yang satu dengan glitch karakter,
 * bukan efek ketiga.
 *
 * ⚠️ Tapi PERUBAHAN LEVEL-nya TIDAK disalin, dan itu revisi ketiga (9 Agu,
 * "kaya tempelan yang menimpa"): flash-naik-saja milik karakter bekerja di
 * sana karena ia mengubah piksel TUBUH yang gelap — di panel aditif yang
 * dasarnya nyaris transparan (alpha 0/0,25), penambahan 0,35–0,70 membuat
 * irisan gate 3–6× lebih terang dari bidangnya sendiri sementara irisan lain
 * diam total: itu persis definisi "bar ditempel di atas". Bahasa panel harus
 * DUA ARAH dan MENYELURUH:
 *   LIFT_MIN/RANGE — irisan naik satu tangga-an saja (0,20–0,45), tetap
 *     sekeluarga dengan bidangnya;
 *   DROP_K — separuh irisan gate justru AMBRUK ke ~nol: hologram BOLONG per
 *     irisan dan kegelapan pintu tembus — sinyal yang mati, bukan sinyal lain
 *     yang menimpa;
 *   FLICK_MAX — brownout SELURUH bidang per re-roll (0–35%), proyektor
 *     tersendat — supaya irisan yang tidak kena gate pun ikut hidup;
 *   JITTER — kecerahan per irisan pasca-kuantisasi pada SEMUA irisan selama
 *     burst, rumus persis karakter (0,85 + 0,30 · rand).
 *
 * SHIFT_UV & STRETCH lokal: geseran irisan di plane ini dilakukan di FRAGMEN
 * (offset + skala UV), bukan di vertex seperti karakter — plane cuma punya 4
 * vertex, tidak ada yang bisa digeser per-irisan.
 *
 * ⚠️ SHIFT_UV 0,16, dan itu revisi dari 0,05 yang GAGAL (9 Agu, "nggak ada
 * sobekannya"): panel cuma ~90 px lebar di layar pada pandangan Office, jadi
 * 0,05 UV = 4 px — tak terbaca. Dan lebih fatal: papan caturnya digambar di
 * ruang LAYAR (gl_FragCoord), jadi menggeser UV bidang yang isinya rata tidak
 * menggeser apa-apa. Sobekan karakter kelihatan karena SILUETNYA tergeser;
 * padanannya di sini = geseran besar + discard di luar bidang (siluet ikut
 * koyak) + fase papan catur yang ikut meloncat per irisan (lihat shader).
 * 0,16 UV ≈ 14 px layar ≈ bacaan 0,018 NDC milik karakter.
 *
 * STRETCH: skala horizontal per irisan ±40% — kesan "melar" pada irisan yang
 * koyak. Karakter mendapatkannya gratis dari geseran antar-vertex yang tidak
 * seragam; plane harus membayarnya eksplisit.
 */
const SLICE_H = 0.09;
const REROLL_HZ = 24.0;
const LIFT_MIN = 0.2;
const LIFT_RANGE = 0.25;
const DROP_K = 0.1;
const FLICK_MAX = 0.35;
const JITTER = 0.3;
const SHIFT_UV = 0.16;
const STRETCH = 0.4;

/**
 * Pendar saat glitch (12 Agu 2026): pengali kecerahan EKSTRA di atas GAIN,
 * HANYA untuk irisan yang naik.
 *
 * Ini satu-satunya jalan bidang ini bisa berpendar sama sekali. Pendar di scene
 * ini dikerjakan pass Bloom (Scene.tsx, luminanceThreshold 0,95), dan GAIN 0,65
 * menaruh SELURUH hologram di bawah ambang itu — disengaja, supaya panel yang
 * diam tidak ikut mekar seperti LED strip. Jadi "kasih glow" bukan menambah
 * suku pendar di shader (satu material tidak bisa mem-blur dirinya sendiri),
 * melainkan MELEWATI ambang selama burst dan membiarkan pass yang sudah ada
 * yang mengerjakannya. Nol pass tambahan, nol draw call tambahan.
 *
 * 1,5 → gain puncak 0,65 × 2,5 = 1,625, dan angkanya dipilih dari tangga alpha,
 * bukan dari selera:
 *   a 1,00 (huruf yang terangkat) → 1,63 → jauh di atas 0,95, mekar tegas
 *   a 0,75 (sel padat panel)      → 1,22 → lewat, mekar tipis
 *   a 0,50 (sel jarang panel)     → 0,81 → TIDAK lewat
 * Artinya yang berpendar POLA DITHER-nya sendiri — sel padat mekar, sel jarang
 * tetap kering — bukan bidang putih rata. ⚠️ Kalau dinaikkan sampai tangga 0,50
 * ikut lewat (butuh > 1,92), papan caturnya melebur jadi kabut dan seluruh
 * kerja kuantisasi 4 tangga di berkas ini hilang di satu pass blur. Itu batas
 * atasnya, bukan sekadar saran.
 *
 * Irisan yang AMBRUK sengaja tidak dapat apa-apa: nasib dua arah itu inti
 * bahasanya (lihat DROP_K). Yang mati makin mati, yang hidup sampai membakar
 * sensor — dan justru kontras itu yang bikin pendarnya terbaca sebagai sinyal
 * rusak, bukan sebagai lampu yang dinyalakan.
 */
const GLOW_BOOST = 1.5;

/**
 * Jendela burst glitch setelah klik, ms sejak klik. Dua burst dengan jeda
 * 100 ms — "sinyal tersendat dua kali" khas CRT, bukan satu kedipan yang bisa
 * dikira frame drop. Total 480 ms; pada 24 Hz re-roll itu ~11 pola irisan.
 */
const BURSTS: ReadonlyArray<readonly [number, number]> = [
  [0, 200],
  [300, 480],
];

/** Arah sapuan reveal, diturunkan dari batas X-nya — lihat revealSweep.ts. */
const REVEAL_DIR = Math.sign(REVEAL_X_TO - REVEAL_X_FROM) || 1;

/**
 * Mode paksa untuk verifikasi visual (dev-only), pola yang sama dengan
 * ?glitch=1 di CharacterGlitch: buka dengan ?holo=1 dan teksnya melayang penuh
 * + glitch menyala terus, supaya scripts/shoot.mjs bisa memotret tanpa harus
 * menirukan hover/klik. import.meta.env.DEV melenyapkan cabang ini di build
 * produksi.
 */
const FORCED =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("holo");

/**
 * Uniform glitch, module-level dan DIBAGI panel + teks: satu tulisan per frame
 * menggerakkan keduanya serempak — irisan yang koyak di panel koyak juga di
 * huruf yang melintasinya (band-nya dihitung dari Y dunia, jadi otomatis
 * segaris). Nilainya di-nol-kan saat unmount; selamat dari replay StrictMode
 * itu justru perilaku yang benar (pelajaran revealSweep).
 */
const uGlitch: IUniform<number> = { value: 0 };
const uGlitchTime: IUniform<number> = { value: 0 };

/**
 * Texture teks, digambar di canvas saat runtime alih-alih dimuat dari PNG.
 *
 * Alasannya bukan kemalasan: isinya murni tipografi datar tanpa gradasi, jadi
 * PNG-nya akan jadi aset yang harus ikut di-commit, ikut diunduh, dan ikut
 * diingat orang saat teksnya mau diubah. Digambar di sini, mengubah kalimatnya
 * = mengubah satu string.
 *
 * 256 × 398 mengikuti rasio plane (1,62 : 2,52 = 0,643). Ukurannya dipilih dari
 * ukuran TAMPIL, bukan dikira-kira: pada pandangan Office plane setinggi 2,52 m
 * berjarak ~10 m mengisi ≈ 190 px tinggi layar, jadi 398 px sudah di atas 1:1
 * dan masih menyisakan ruang saat teksnya maju 36 cm ke arah kamera saat hover.
 *
 * NearestFilter + tanpa mipmap: sama seperti seluruh layar monitor di
 * screens.ts — huruf harus bertangga tegas, bukan lembek ter-interpolasi.
 */
function makeTextTexture(): CanvasTexture {
  const W = 256;
  const H = 398;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.clearRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff";

  // ── Hanya "UNDER MAINTENANCE" ──────────────────────────────────────────
  // Sampai 7 Agu ada empat elemen lain: "ACCESS RESTRICTED" di atas, dua garis
  // pemisah, dan "COGNITI · SYS.02" di bawah. Semuanya dibuang.
  //
  // Canvas mengukur v dari ATAS, sedangkan UV plane dari BAWAH. Texture-nya
  // TIDAK di-flip (flipY bawaan three sudah menangani itu), jadi yang digambar
  // di y kecil memang muncul di bagian ATAS plane.
  //
  // 179 & 219: dua barisnya berjarak 40 px, jadi titik tengah bloknya
  // (179 + 219) / 2 = 199 = tepat setengah dari 398 — blok teks duduk persis
  // di tengah bidang.
  //
  // ── Kenapa hurufnya segede ini (38/28) ─────────────────────────────────
  // Konsekuensi dari level teks 0,625 yang membuat hurufnya ikut ter-dither:
  // separuh piksel goresannya duduk satu tangga lebih rendah, jadi pada 23px
  // goresan yang menyusut ~2:1 saat tampil larut ke dalam papan catur. Pada
  // 38/28 tiap goresan punya cukup piksel untuk tetap terbaca sebagai huruf.
  //
  // Pembesarannya dibayar dari letterSpacing, bukan dari lebar bidang:
  // "MAINTENANCE" 11 huruf pada Courier bold ≈ 207 px, menyisakan ~24 px di
  // tiap sisi — dan sejak bingkai tepi dihapus total (9 Agu), margin itu
  // sepenuhnya milik huruf.
  //
  // letterSpacing baru ada di Chrome 99+/Safari 17+. Dibiarkan gagal diam-diam
  // di browser lama: yang hilang cuma kerenggangan huruf, teksnya tetap terbaca.
  g.letterSpacing = "8px";
  g.font = 'bold 38px "Courier New", ui-monospace, monospace';
  g.fillText("UNDER", W / 2, 179);
  g.letterSpacing = "2px";
  g.font = 'bold 28px "Courier New", ui-monospace, monospace';
  g.fillText("MAINTENANCE", W / 2, 219);

  const tex = new CanvasTexture(c);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Raycast kosong untuk plane TEKS, dan untuk panel saat interaksi digerbang
 * mati (ruangan lain / pointer coarse / billiard).
 *
 * Sejarahnya: sampai 9 Agu panel juga selalu NO_RAYCAST, karena plane 2,5 m
 * ini berdiri di jalur pandang beberapa waypoint dan raycast yang hidup akan
 * menelan klik untuk mereka. Sekarang panel HARUS bisa di-raycast (hover +
 * klik), jadi pengamannya pindah ke dua tempat:
 *   1. handler-nya TIDAK memanggil stopPropagation — event R3F terus berjalan
 *      ke objek yang lebih jauh di sepanjang ray, jadi waypoint di belakang
 *      panel tetap menerima hover/klik-nya;
 *   2. handler klik MENGALAH kalau sebuah waypoint sedang hover (lihat di
 *      bawah) — klik ganda "glitch + pindah ruangan" tidak pernah terjadi.
 *
 * Plane teks tetap NO_RAYCAST selamanya: ia BERGERAK saat hover, dan bidang
 * penangkap kursor yang berpindah-pindah di bawah kursor adalah resep hover
 * yang berkedip. Panel yang diam jadi satu-satunya sumber kebenaran hover.
 */
const NO_RAYCAST: Object3D["raycast"] = () => {};

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4( position, 1.0 );
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Matriks Bayer 4×4. Ditulis sebagai rantai if, bukan array const, dengan
// alasan yang sama seperti di revealSweep.ts: indexing array dinamis tidak
// dijamin didukung di GLSL ES 1.0, dan proyek ini belum mengunci WebGL2.
// Rantainya dikompilasi jadi lookup konstan.
//
// (Catatan buat yang menyunting berkas ini: JANGAN pakai backtick di dalam
// komentar shader. Seluruh string GLSL adalah template literal, jadi backtick
// di komentar GLSL sekalipun akan MEMUTUS string-nya — galatnya muncul sebagai
// "',' expected" di baris yang kelihatannya cuma komentar.)
const BAYER4_GLSL = /* glsl */ `
  float bayer4( vec2 co ) {
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
`;

// ── Gerbang sapuan "kantor terbentuk" ────────────────────────────────────────
// Rumus yang sama persis dengan revealSweep.ts, dengan objek uniform yang SAMA.
// Tanpa ini hologram sudah menyala utuh di ruang kosong sementara dinding yang
// memeganginya belum tergambar. fineBayer (1 px perangkat) dipakai HANYA di
// sini, supaya tepi sapuan di bidang ini persis sekasar tepi sapuan di 233
// material kantor lain — dither tampilannya sendiri memakai sel DITHER_PX.
const REVEAL_GATE_GLSL = /* glsl */ `
  {
    float fineBayer = bayer4( gl_FragCoord.xy );
    float head = mix(
      ${REVEAL_X_FROM.toFixed(2)} - ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
      ${REVEAL_X_TO.toFixed(2)} + ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
      uRevealProgress
    );
    float ahead = ( vWorld.x - head ) * ${REVEAL_DIR.toFixed(1)};
    float show  = 1.0 - smoothstep( 0.0, ${REVEAL_BAND.toFixed(2)}, ahead );
    if ( show < fineBayer ) discard;
  }
`;

// ── Irisan glitch, versi FRAGMEN ─────────────────────────────────────────────
// Band, gate, dan rand memakai rumus hash yang PERSIS sama dengan patch vertex
// CharacterGlitch (57.31/7.77 · 91.17/13.73), dari Y DUNIA yang sama — irisan
// di panel, di huruf, dan di karakter yang kebetulan berdiri di dekatnya
// meloncat pada kisi dan irama yang satu. step(0.55): hanya ~45% irisan
// tergeser tiap re-roll — sebagian besar diam + beberapa meloncat = sobekan,
// bukan getaran.
//
// Empat hal terjadi pada irisan yang kena gate, dan TIGA yang terakhir adalah
// revisi 9 Agu setelah versi geser-UV-saja gagal terbaca (lihat catatan
// SHIFT_UV):
//   1. flash putih (di blok i, bukan di sini);
//   2. stretch: uv.x diskalakan ±STRETCH di sekitar tengah bidang;
//   3. geser: uv.x dioffset ±SHIFT_UV;
//   4. DISCARD di luar 0..1: konten yang terdorong keluar bidang tidak
//      dijepit balik melainkan hilang — SILUET panel ikut koyak, dan inilah
//      padanan sesungguhnya dari geseran gl_Position karakter.
// gPhase dipakai pemanggil untuk menggeser fase kisi Bayer per irisan: papan
// catur 50% yang tergeser sel ganjil = pola negatif, jadi sobekan terbaca
// bahkan di bagian bidang yang nilainya rata.
const GLITCH_PRE_GLSL = /* glsl */ `
  vec2 uv = vUv;
  float gGate = 0.0;
  float gRand = 0.0;
  float gDual = 0.0;
  float gFlick = 0.0;
  float gPhase = 0.0;
  float gGlow = 0.0;
  if ( uGlitch > 0.001 ) {
    float gSeed = floor( uGlitchTime * ${REROLL_HZ.toFixed(1)} );
    float gBand = floor( vWorld.y / ${SLICE_H.toFixed(2)} );
    gGate = step( 0.55, fract( sin( gBand * 57.31 + gSeed * 7.77 ) * 24634.6345 ) );
    gRand = fract( sin( gBand * 91.17 + gSeed * 13.73 ) * 43758.5453 );
    // Pemilih nasib irisan gate (drop vs lift) — hash TERPISAH dari gRand:
    // gRand sudah dipakai arah geser & besaran lift, dan memakai angka yang
    // sama berarti "semua irisan yang geser kiri mati, yang kanan terang".
    gDual = fract( sin( gBand * 45.71 + gSeed * 11.13 ) * 7919.77 );
    // Brownout global: SATU angka per re-roll untuk SELURUH bidang (tidak
    // bergantung gBand) — seluruh hologram meredup-terang serempak 24 Hz.
    gFlick = fract( sin( gSeed * 3.71 ) * 9731.53 );
    float gStr = 1.0 + ( fract( sin( gBand * 73.93 + gSeed * 5.31 ) * 15731.743 ) - 0.5 )
      * 2.0 * ${STRETCH.toFixed(2)} * gGate;
    uv.x = 0.5 + ( uv.x - 0.5 ) * gStr + ( gRand - 0.5 ) * 2.0 * ${SHIFT_UV.toFixed(2)} * gGate;
    if ( uv.x < 0.0 || uv.x > 1.0 ) discard;
    gPhase = floor( gRand * 8.0 ) * ${DITHER_PX.toFixed(1)} * gGate;
    // Pemicu pendar (lihat GLOW_BOOST). Memakai gDual dengan ambang yang PERSIS
    // sama seperti blok level di kedua shader ( step( 0.5, gDual ) memilih
    // ambruk ), jadi pendarnya tidak mungkin melenceng ke irisan yang justru
    // sedang bolong. Diredam brownout global supaya ia ikut tersendat bersama
    // bidangnya, bukan menyala rata sepanjang burst — proyektor yang mengejan,
    // bukan lampu sorot yang dinyalakan.
    gGlow = gGate * ( 1.0 - step( 0.5, gDual ) )
      * ( 1.0 - ${FLICK_MAX.toFixed(2)} * gFlick ) * uGlitch;
  }
`;

const PANEL_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform float uRevealProgress;
  uniform float uGlitch;
  uniform float uGlitchTime;

  varying vec2 vUv;
  varying vec3 vWorld;

  ${BAYER4_GLSL}

  void main() {
    ${REVEAL_GATE_GLSL}
    ${GLITCH_PRE_GLSL}

    // Kisi Bayer dibaca SETELAH glitch supaya fasenya bisa ikut tergeser per
    // irisan (gPhase) — irisan yang koyak, koyak juga polanya.
    float ditherBayer = bayer4( floor( ( gl_FragCoord.xy + vec2( gPhase, 0.0 ) ) / ${DITHER_PX.toFixed(1)} ) );

    // ── Kabut dasar ────────────────────────────────────────────────────────
    // Sengaja SANGAT rendah. Bidang ini HARUS tetap tembus pandang: kegelapan
    // di baliknya yang memberi kesan ada ruang, bukan tembok dempet.
    //
    // 0,125 bukan angka bulat sembarangan: dikali 4 tangga hasilnya TEPAT 0,5,
    // dan ambang Bayer 4×4 punya 16 nilai yang tersebar rata, jadi persis 8
    // dari 16 sel lolos. Itu papan catur 50% — pola dither paling tegas yang
    // bisa dihasilkan matriks ini. Digeser sedikit saja ke 0,10 atau 0,15,
    // kerapatannya jadi 6/16 atau 10/16 dan polanya berubah dari papan catur
    // jadi kisi yang timpang.
    //
    // ⚠️ Seluruh nilai di berkas ini ditata untuk kuantisasi 4 TANGGA (lihat
    // blok alpha). Pola tambahan apa pun yang selisihnya SEORDE dengan satu
    // tangga (0,25) akan diperbesar jadi belang — itu pelajaran dari diagonal
    // hazard 0,05 yang gagal (7 Agu). Sejarah lengkap suku-suku yang pernah
    // dicoba dan dibuang (scanline, bar sapuan, kedip) ada di git; ringkasnya:
    // bidang ini DIAM dan RATA itu disengaja, dan setiap gerak yang kembali
    // wajib dihitung terhadap tangga 0,25 itu.
    float i = 0.125;

    // ── TIDAK ADA suku tepi di sini, dan itu diminta (9 Agu) ───────────────
    // Sejarah dua tahapnya ada di blok konstanta (di atas TEXT_LEVEL).
    // Konsekuensi teknis yang
    // perlu diketahui: sejak tepi hilang, uv hasil geseran glitch hanya
    // dipakai oleh discard siluet di GLITCH_PRE — konten panel sendiri rata
    // sempurna, dan sobekannya dibawa oleh siluet + lompatan fase Bayer.

    // ── Level glitch: brownout global + nasib dua arah per irisan ──────────
    // Alasan bentuknya di catatan konstanta LIFT/DROP/FLICK: naik-saja terbaca
    // "bar ditempel di atas panel"; yang menyatu adalah panel yang levelnya
    // sendiri rusak — meredup serempak, sebagian irisan bolong, sebagian naik
    // SATU tangga-an. Semua SEBELUM kuantisasi supaya hasilnya jatuh di tangga.
    i *= 1.0 - ${FLICK_MAX.toFixed(2)} * gFlick * uGlitch;
    {
      float gLift = i + ${LIFT_MIN.toFixed(2)} + ${LIFT_RANGE.toFixed(2)} * gRand;
      float gDrop = i * ${DROP_K.toFixed(2)};
      i = mix( i, mix( gLift, gDrop, step( 0.5, gDual ) ), gGate * uGlitch );
    }

    // ── Alpha bertangga ────────────────────────────────────────────────────
    // Dibulatkan ke 4 tingkat diskret dengan ambang Bayer per sel. Ini
    // keputusan tampilan paling menentukan di berkas ini: jumlah tangga
    // berbanding TERBALIK dengan seberapa kelihatan dither-nya. Pada 16 tangga
    // selisihnya cuma 6% dan mata membacanya gradasi mulus; pada 4, selisih
    // 25% membuat pola kotaknya jadi tekstur yang benar-benar terbaca. 2
    // tangga sudah dicoba di kepala dan gagal: putih penuh + Bloom 0,95 bikin
    // titik bertetangga saling menyambung jadi kabut.
    float a = clamp( i, 0.0, 1.0 );
    a = floor( a * 4.0 + ditherBayer ) / 4.0;

    // Jitter kecerahan per irisan PASCA-kuantisasi, pada SEMUA irisan selama
    // burst — rumus persis CharacterGlitch (0,85 + 0,30 · rand). Sengaja
    // merusak kerapian tangga: derau analog tipis inilah yang membuat seluruh
    // bidang terasa ikut sakit, bukan cuma irisan yang kena gate.
    a *= mix( 1.0, 0.85 + ${JITTER.toFixed(2)} * gRand, uGlitch );

    // Blending aditif: hasil akhir = uColor * GAIN * a, ditambahkan ke apa pun
    // yang sudah ada di belakang. Warna ditulis tanpa dikali a lebih dulu —
    // faktor SrcAlpha yang mengalikannya, jadi kalau di sini ikut dikali
    // kontribusinya jadi a² dan seluruh bidang terlihat jauh lebih redup.
    //
    // Pendar masuk di SINI, di warna, dan sengaja TIDAK menyentuh a: tangga
    // dither tetap persis seperti tanpa glow, yang berubah cuma sel mana yang
    // lolos ambang Bloom. Kalau pendarnya ditaruh di a, kerapatan polanya ikut
    // bergeser dan irisannya berubah bentuk — bukan berpendar.
    gl_FragColor = vec4(
      uColor * ${GAIN.toFixed(2)} * ( 1.0 + ${GLOW_BOOST.toFixed(2)} * gGlow ),
      a
    );
  }
`;

const TEXT_FRAG = /* glsl */ `
  uniform vec3      uColor;
  uniform sampler2D uText;
  uniform float     uRevealProgress;
  uniform float     uGlitch;
  uniform float     uGlitchTime;

  varying vec2 vUv;
  varying vec3 vWorld;

  ${BAYER4_GLSL}

  void main() {
    ${REVEAL_GATE_GLSL}
    ${GLITCH_PRE_GLSL}

    // Kisi Bayer dibaca SETELAH glitch supaya fasenya bisa ikut tergeser per
    // irisan (gPhase) — irisan yang koyak, koyak juga polanya.
    float ditherBayer = bayer4( floor( ( gl_FragCoord.xy + vec2( gPhase, 0.0 ) ) / ${DITHER_PX.toFixed(1)} ) );

    // Hanya kanal alpha yang dipakai: canvas-nya digambar putih di atas
    // transparan, jadi .a adalah mask hurufnya dan warnanya tetap ikut uColor.
    // Di luar huruf i = 0 → alpha terkuantisasi 0 → plane-nya tak terlihat;
    // tidak perlu discard.
    //
    // Sampling di uv yang sudah tergeser glitch: hurufnya ikut koyak. Wrap
    // CanvasTexture bawaan ClampToEdge dan tepi texture-nya transparan, jadi
    // geseran yang keluar bidang menyeret kekosongan, bukan jejak huruf.
    float mask = texture2D( uText, uv ).a;
    float i = mask * ${TEXT_LEVEL.toFixed(3)};
    // Level glitch yang sama dengan panel — dengan satu beda: lift dikalikan
    // mask supaya latar KOSONG plane teks tidak ikut menyala (kalau ikut, bar
    // terangnya kembali dua lapis: plane ini + panel di belakangnya saling
    // menjumlah dan "tempelan"-nya balik lagi). Drop & brownout tidak perlu
    // mask — mengalikan nol tetap nol.
    i *= 1.0 - ${FLICK_MAX.toFixed(2)} * gFlick * uGlitch;
    {
      float gLift = i + ( ${LIFT_MIN.toFixed(2)} + ${LIFT_RANGE.toFixed(2)} * gRand ) * step( 0.001, mask );
      float gDrop = i * ${DROP_K.toFixed(2)};
      i = mix( i, mix( gLift, gDrop, step( 0.5, gDual ) ), gGate * uGlitch );
    }

    float a = clamp( i, 0.0, 1.0 );
    a = floor( a * 4.0 + ditherBayer ) / 4.0;

    // Jitter kecerahan per irisan PASCA-kuantisasi, pada SEMUA irisan selama
    // burst — rumus persis CharacterGlitch (0,85 + 0,30 · rand). Sengaja
    // merusak kerapian tangga: derau analog tipis inilah yang membuat seluruh
    // bidang terasa ikut sakit, bukan cuma irisan yang kena gate.
    a *= mix( 1.0, 0.85 + ${JITTER.toFixed(2)} * gRand, uGlitch );

    // Pendar identik dengan panel (lihat catatannya di PANEL_FRAG). Huruf yang
    // terangkat mencapai a 1,0, jadi plane inilah yang mekar paling tegas —
    // "UNDER MAINTENANCE" membakar sensor sesaat lalu kembali kering.
    gl_FragColor = vec4(
      uColor * ${GAIN.toFixed(2)} * ( 1.0 + ${GLOW_BOOST.toFixed(2)} * gGlow ),
      a
    );
  }
`;

/**
 * Opsi material yang dibagi panel & teks.
 *
 * depthWrite mati: bidang tembus pandang yang menulis depth akan menghalangi
 * apa pun yang digambar sesudahnya, termasuk kegelapan di balik pintu yang
 * justru ingin terlihat.
 *
 * depthTest TETAP menyala — kusen di sekelilingnya harus bisa menutupi
 * hologram saat dilihat dari sudut miring, kalau tidak ia terlihat menembus
 * dinding. (Teks yang sedang melayang pun tetap di dalam terowongan pandang
 * bukaan dari sudut-sudut yang bisa dicapai kamera, jadi ia tidak terpotong.)
 *
 * DoubleSide: bukaan ini secara teori cuma terlihat dari sisi kantor, tapi
 * waypoint bisa membawa kamera ke sudut tak terduga dan plane satu sisi akan
 * HILANG TOTAL dari belakang tanpa petunjuk apa pun.
 */
const MATERIAL_OPTS = {
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  side: DoubleSide,
} as const;

/**
 * ── Soal useFrame di sini ───────────────────────────────────────────────────
 * Versi 7 Agu sengaja TIDAK punya useFrame — shader-nya statis penuh. Hover
 * dan glitch mengubah itu (9 Agu): satu callback per frame yang kerjanya cuma
 * satu lerp posisi + dua tulisan uniform, dan ikut tidur bersama canvas saat
 * FrameloopGate menyetel frameloop "never". Tidak ada mesin yang berdetak
 * sendiri (pelajaran PhysicsHeading 3 Agu); di luar hover/burst, callback-nya
 * menyentuh nol state yang berubah.
 *
 * useReducedMotion ikut kembali bersama geraknya: teks tetap MAJU saat hover
 * (responsnya informasi, bukan hiasan) tapi melompat tanpa animasi, dan klik
 * tidak memicu glitch — flicker mendadak persis kelas gerakan yang preferensi
 * itu minta hilangkan, sikap yang sama dengan CharacterGlitch.
 */
export default function MaintenanceHologram() {
  const tex = useMemo(() => makeTextTexture(), []);

  const panelMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: PANEL_FRAG,
        uniforms: {
          uColor: { value: new Color(COLOR) },
          // Objek uniform BERSAMA dengan revealSweep.ts — bukan salinan. Lihat
          // catatan di ekspornya. uGlitch/uGlitchTime juga bersama (module
          // level), dibagi dengan material teks di bawah.
          uRevealProgress: revealProgress,
          uGlitch,
          uGlitchTime,
        },
        ...MATERIAL_OPTS,
      }),
    [],
  );

  const textMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: TEXT_FRAG,
        uniforms: {
          uColor: { value: new Color(COLOR) },
          uText: { value: tex },
          uRevealProgress: revealProgress,
          uGlitch,
          uGlitchTime,
        },
        ...MATERIAL_OPTS,
      }),
    [tex],
  );

  useEffect(
    () => () => {
      panelMaterial.dispose();
      textMaterial.dispose();
      tex.dispose();
      uGlitch.value = 0;
    },
    [panelMaterial, textMaterial, tex],
  );

  // ── Gerbang interaksi ─────────────────────────────────────────────────────
  // Office saja: dari ruangan lain hologram cuma tampak lewat kaca dan klik
  // menembus kaca itu membingungkan. coarse mengikuti kebijakan waypoint
  // (INVARIANTS.md §6) — hover tidak ada di jari, dan tanpa hover, klik yang
  // tiba-tiba menggeglitchkan dinding tidak punya penanda sebab-akibat.
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const heroInView = useSceneStore((s) => s.heroInView);
  const billiardActive = useSceneStore((s) => s.billiardActive);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  const interactive =
    currentRoom === "Office" && heroInView && !billiardActive && !coarse;

  const [hovered, setHovered] = useState(false);
  const textMesh = useRef<Mesh>(null);
  /** 0 = menempel, 1 = melayang penuh. Dianimasikan di useFrame lewat ref,
   *  bukan state — nilainya berubah tiap frame (norma Waypoints.tsx). */
  const lift = useRef(0);
  const clickAt = useRef(Number.NEGATIVE_INFINITY);

  // Interaksi dicabut selagi kursor masih di atasnya (pindah ruangan lewat
  // navbar, billiard dibuka): tanpa ini hover menggantung dan teksnya melayang
  // selamanya. Kursor hanya dipulihkan kalau tidak ada benda interaktif lain
  // (waypoint, meja billiard) yang sedang memegangnya.
  useEffect(() => {
    if (interactive) return;
    setHovered(false);
    if (!useSceneStore.getState().hoveredLabel) {
      document.body.style.cursor = "";
    }
  }, [interactive]);
  useEffect(
    () => () => {
      if (!useSceneStore.getState().hoveredLabel) {
        document.body.style.cursor = "";
      }
    },
    [],
  );

  const enter = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHovered(false);
    // Penjaga yang sama dengan Waypoints.tsx: saat kursor menyeberang langsung
    // ke benda interaktif lain, enter-nya bisa mendahului leave(panel) — jangan
    // hapus kursor pointer yang baru saja dipasang pihak itu.
    if (!useSceneStore.getState().hoveredLabel) {
      document.body.style.cursor = "";
    }
  };
  const click = () => {
    // Mengalah pada waypoint: kalau ray yang sama juga mengenai waypoint
    // (panel ini berdiri di jalur pandang beberapa di antaranya), enter
    // waypoint sudah menyalakan hoveredLabel sebelum klik tiba — biarkan
    // klik itu murni jadi navigasi, jangan ditumpangi glitch.
    if (reduced || useSceneStore.getState().hoveredLabel) return;
    clickAt.current = performance.now();
  };

  useFrame((_, dt) => {
    // Peluruhan eksponensial dinormalkan dt (norma Waypoints.tsx), snap saat
    // sudah dekat supaya tidak menggantung di 0,999.
    const target = hovered || FORCED ? 1 : 0;
    if (reduced) {
      lift.current = target;
    } else {
      lift.current += (target - lift.current) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - lift.current) < 0.001) lift.current = target;
    }
    if (textMesh.current) {
      textMesh.current.position.z =
        CENTER[2] + TEXT_REST_Z + lift.current * (TEXT_HOVER_Z - TEXT_REST_Z);
    }

    const now = performance.now();
    if (FORCED) {
      uGlitch.value = 1;
      uGlitchTime.value = now / 1000;
      return;
    }
    const t = now - clickAt.current;
    let burst = false;
    for (const [from, to] of BURSTS) {
      if (t >= from && t < to) {
        burst = true;
        break;
      }
    }
    if (burst) {
      uGlitch.value = 1;
      uGlitchTime.value = now / 1000;
    } else if (uGlitch.value !== 0) {
      uGlitch.value = 0;
    }
  });

  return (
    <>
      {/* ⚠️ JANGAN naikkan renderOrder di kedua mesh. Dulu panel bernilai 2 dan
          itu bug nyata: kaca meeting room (transparan, depthWrite mati) tidak
          pernah menulis depth, jadi siapa menimpa siapa murni urutan gambar —
          dan three.js memakai renderOrder sebagai KUNCI UTAMA antrean
          transparan, jarak baru kunci kedua. renderOrder 2 berarti hologram
          selalu digambar terakhir, termasuk DI ATAS kaca yang ada di depannya:
          dari Lounge ia tampak menembus tembok. Pada 0, pengurutan jarak
          belakang-ke-depan berlaku dan kaca meredamnya dengan benar. */}
      <mesh
        position={CENTER}
        material={panelMaterial}
        raycast={interactive ? Mesh.prototype.raycast : NO_RAYCAST}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={click}
        renderOrder={0}
      >
        <planeGeometry args={[PLANE_W, PLANE_H]} />
      </mesh>
      {/* Posisi z disetir useFrame; nilai awalnya = posisi rest supaya frame
          pertama (sebelum useFrame jalan) sudah benar. NO_RAYCAST permanen —
          lihat catatan di konstantanya. */}
      <mesh
        ref={textMesh}
        position={[CENTER[0], CENTER[1], CENTER[2] + TEXT_REST_Z]}
        material={textMaterial}
        raycast={NO_RAYCAST}
        renderOrder={0}
      >
        <planeGeometry args={[PLANE_W, PLANE_H]} />
      </mesh>
    </>
  );
}

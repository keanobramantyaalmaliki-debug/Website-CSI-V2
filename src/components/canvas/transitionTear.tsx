"use client";

/**
 * Sobekan transisi — irisan layar tergeser saat kamera terbang paling cepat
 * antar ruangan, dan pulih sendiri begitu sampai (10 Agu 2026).
 *
 * ── Kenapa FULLSCREEN di sini boleh, padahal CharacterGlitch menolaknya ────
 * CharacterGlitch.tsx menolak glitch fullscreen dengan alasan yang masih
 * berlaku: saat IDLE, pengunjung tidak sedang melakukan apa pun, jadi tidak ada
 * yang bisa ia baca sebagai penyebab — layar yang rusak terbaca "website-nya
 * rusak". Transisi adalah kebalikannya persis: ia baru saja mengklik waypoint,
 * kamera terlihat melesat, dan distorsinya terkunci pada gerakan itu. Ada
 * penyebab yang jelas di layar, jadi sobekan terbaca sebagai AKIBAT — dunia
 * yang sinyalnya tidak sanggup mengejar kecepatan pindah. Fullscreen justru
 * BENAR di sini, dengan alasan yang sama yang membuatnya salah saat idle.
 *
 * ── Amplitudo digerakkan KECEPATAN kamera, bukan waktu ────────────────────
 * Versi naif memakai kurva bump atas t tween. Berfungsi, tapi itu timer yang
 * berpura-pura jadi fisika. Yang dipakai di sini: amplitudo ∝ laju perubahan
 * basePos (CameraController). Tiga hal jatuh gratis dari situ:
 *
 *   1. Pulih sendiri. ease() di CameraController turunannya nol di kedua ujung,
 *      jadi laju → 0 saat tiba → amplitudo → 0. Tidak ada logika fade terpisah
 *      dan mustahil ada irisan yang tertinggal tergeser di frame terakhir.
 *   2. Sebanding dengan jarak, tanpa konstanta per-ruangan. Semua tween lamanya
 *      sama (TWEEN_MS 1400), jadi loncatan pendek Lounge→Office (~6 m, puncak
 *      ~9 m/s) bergerak jauh lebih pelan daripada Lounge→Meeting (~17,5 m,
 *      puncak ~25 m/s) — dan robek jauh lebih sedikit. Gratis.
 *   3. Ikut semua pemanggil goToView (masuk/keluar billiard, lompatan pandangan
 *      di Office.tsx) tanpa perlu didaftar satu per satu.
 *
 * ── Uniform module-level, BUKAN prop ──────────────────────────────────────
 * Pola yang sama dengan revealSweep.ts dan CharacterGlitch.tsx, dan alasannya
 * sudah dibayar mahal di dua tempat itu: yang menulis (CameraController, di
 * dalam useFrame) dan yang membaca (shader efek ini) harus memegang OBJEK yang
 * sama. Menyalurkannya lewat prop React berarti satu render per frame, dan
 * untuk material `uniforms` sebagai prop bahkan MENYALIN alih-alih merujuk.
 * Satu objek Uniform di module scope menutup dua-duanya.
 *
 * ── Urutan di EffectComposer: PALING AWAL, sebelum <Bloom> ─────────────────
 * Ini koreksi terhadap rencana awal ("taruh paling akhir"), dan sebabnya
 * mekanis, bukan selera.
 *
 * postprocessing menggabungkan Effect yang berurutan menjadi SATU EffectPass —
 * satu fragment shader, tanpa pass tambahan. Konsekuensinya: di dalam shader
 * gabungan itu tidak ada tekstur berisi "hasil efek sebelumnya". Yang bisa
 * di-sample pada UV yang digeser hanyalah `inputBuffer`, yaitu gambar MASUKAN
 * pass — sebelum Bloom, HueSaturation, dan BrightnessContrast. Kalau efek ini
 * ditaruh paling akhir, pita yang tergeser akan mengambil piksel yang BELUM
 * di-grade sementara pita yang diam sudah — belang warna antar pita, bukan
 * "gambar yang sama, tergeser".
 *
 * Ditaruh paling awal, semuanya jatuh pada tempatnya:
 *   · geseran mengambil dari inputBuffer, yang memang gambar utuh saat itu;
 *   · HueSaturation & BrightnessContrast per-piksel, jadi grade-nya kena rata
 *     ke pita yang tergeser maupun yang diam;
 *   · Bloom TIDAK terganggu sama sekali. Piramida blur-nya dirender dari
 *     inputBuffer di pass-nya sendiri SEBELUM shader gabungan jalan, jadi
 *     kalibrasi ambang 0,95 yang dicatat di screens.ts, MaintenanceHologram,
 *     Dust, dan Office tetap berlaku persis. Efek ini tidak bisa menaikkan satu
 *     piksel pun melewati ambang itu.
 *
 * Sisa yang diterima: halo bloom TIDAK ikut tergeser (LED strip pindah, pendar-
 * nya tinggal). Selama ~0,5 detik pada gerakan tercepat, itu tak terlihat — dan
 * bacaannya kebetulan benar: yang rusak sinyalnya, bukan cahayanya.
 *
 * ── Ongkos ────────────────────────────────────────────────────────────────
 * Nol pass tambahan (bergabung ke EffectPass yang sudah ada). Saat mati:
 * satu cabang `if` pada uniform — seragam untuk seluruh layar, GPU tidak
 * membayar divergensi — lalu keluar. Saat menyala (hanya selama tween):
 * 1 fetch di pita yang diam, 3 fetch di pita yang tergeser. Cabangnya per-pita
 * setinggi puluhan piksel, jadi koheren di dalam warp kecuali 1–2 baris di
 * batas pita.
 *
 * Tidak ada mesin yang berdetak sendiri di berkas ini (pelajaran PhysicsHeading
 * 3 Agu): seluruh kerjanya hidup di useFrame CameraController, yang ikut tidur
 * bersama canvas lewat FrameloopGate.
 *
 * Verifikasi visual: buka dengan ?tear=1 (dev-only) — sobekan menyala terus
 * pada amplitudo penuh sehingga scripts/shoot.mjs tidak perlu menebak kapan
 * setengah detik itu lewat.
 */

import { useMemo } from "react";
import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

/**
 * Laju re-roll pola irisan (Hz). DISAMAKAN dengan REROLL_HZ CharacterGlitch,
 * dan itu intinya: sobekan transisi harus terbaca sebagai bahasa yang sama
 * dengan glitch karakter & panel maintenance, bukan efek keempat yang baru.
 * Pada 60 fps tiap pola bertahan 2–3 frame: terlihat meloncat, tidak jadi kabur.
 */
const REROLL_HZ = 24.0;

/**
 * Jumlah pita pada satu layar penuh. Tinggi pitanya dihitung dari `resolution`
 * lalu DIBULATKAN ke piksel perangkat utuh — dua-duanya perlu: dihitung dari
 * resolusi supaya ukuran TAMPAK-nya sama di dpr 1 dan dpr 2, dibulatkan supaya
 * batas pita jatuh tepat di piksel dan tidak berkedip antar frame.
 *
 * 14 pita ≈ 64 px pada layar tinggi 900. Pita yang bersebelahan dan sama-sama
 * lolos gerbang akan menyatu jadi slab lebih tinggi — dari situ datang kesan
 * tinggi pita yang tidak seragam, tanpa perlu grid kedua.
 */
const BANDS = 14.0;

/**
 * Ambang gerbang: hanya ~45% pita yang tergeser tiap re-roll (angka & alasan
 * yang sama dengan step(0.55) di CharacterGlitch). Kalau semua pita bergeser,
 * gambarnya cuma "bergetar"; sebagian besar diam + beberapa meloncat = sobekan.
 */
const GATE = 0.55;

/**
 * Geser maksimum, sebagai PECAHAN LEBAR LAYAR (bukan piksel tetap) supaya
 * besarnya tampak sama di layar 13" dan di monitor lebar. 0,008 ≈ 11 px pada
 * lebar 1440.
 */
const SHIFT = 0.008;

/**
 * Pisah kromatik, sebagai pecahan dari geseran pita itu sendiri — jadi pita
 * yang bergeser paling jauh juga yang paling pecah warnanya. 0,25 × 11 px
 * ≈ 3 px pada pita terkuat.
 */
const SPLIT = 0.25;

/**
 * Kilasan dither pada pita yang tergeser. DITHER_PX 2 + 4 tangga = angka yang
 * sama dengan MaintenanceHologram dan CharacterGlitch; kalau di sana diubah,
 * ubah di sini juga.
 *
 * ⚠️ MIX 0,10 — DIUKUR, bukan ditebak, dan sengaja jauh di bawah angka yang
 * masuk akal di atas kertas. Percobaan pertama memakai 0,35 dan hasilnya salah
 * total (screenshot ?tear=1): pita yang tergeser berubah jadi slab kotak-kotak
 * TERANG, bukan "gambar yang sama, tergeser".
 *
 * Sebabnya ruang warna, dan ini catatan yang perlu diingat kalau nanti ada yang
 * menaikkannya lagi. Tangga CharacterGlitch disisipkan setelah
 * <dithering_fragment>, artinya pada warna sRGB akhir — jarak antar tangga rata
 * secara PERSEPSI. Di dalam EffectPass warnanya tidak di ruang itu, jadi
 * `floor(c*4+bayer)/4` melempar dinding gelap (c≈0,15) bolak-balik antara 0 dan
 * 0,25; rata-ratanya memang tetap benar, tapi mata membaca bintik terangnya,
 * bukan rata-ratanya. Pada 0,10 sisa yang terbaca tinggal butiran halus di atas
 * pita yang robek — bahasanya masih sama, kerusakannya tidak.
 *
 * Setel ke 0 kalau masih terlalu ramai; sobekan tetap utuh tanpa dither sama
 * sekali. Yang TIDAK boleh dilakukan: menaikkannya kembali tanpa memotret.
 */
const DITHER_PX = 2.0;
const STEPS = 4.0;
const DITHER_MIX = 0.1;

/**
 * Pemetaan laju kamera (m/s) → amplitudo 0…1, lewat smoothstep.
 *
 * MIN 3.0: awal & akhir setiap tween pasti bersih, jadi tidak pernah ada
 * sobekan pada gambar yang nyaris diam — itu yang membuatnya terbaca sebagai
 * akibat kecepatan, bukan hiasan yang menyala tiap pindah ruangan.
 *
 * FULL 14.0: dipilih dari jarak antar VIEWS yang benar-benar ada. Semua tween
 * lamanya 1400 ms dan ease()-nya berpuncak 2× rata-rata, jadi laju puncaknya
 *   Lounge→Office    ~6,2 m  → ~8,8 m/s  → amplitudo ~0,44
 *   Lounge→Function ~12,5 m  → ~17,8 m/s → jenuh (1,0)
 *   Lounge→Meeting  ~17,5 m  → ~25 m/s   → jenuh (1,0)
 * Loncatan terpendek merobek kira-kira separuh dari yang terpanjang. Kalau
 * nanti ada ruangan baru yang jauh lebih jauh, JANGAN naikkan FULL supaya
 * "terlihat beda" — perbedaan itu memang sudah habis di ujung atas.
 */
const SPEED_MIN = 3.0;
const SPEED_FULL = 14.0;

/**
 * Mode paksa untuk verifikasi visual (dev-only), pola & alasan yang sama dengan
 * ?glitch=1 di CharacterGlitch: shoot.mjs cuma menunggu lalu memotret, jadi ia
 * tidak boleh berjudi menebak kapan sobekan setengah detik itu lewat.
 * import.meta.env.DEV membuat seluruh cabang ini hilang di build produksi.
 */
const FORCED =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("tear");

/** 0 = mati, 1 = sobekan penuh. Ditulis CameraController, dibaca shader. */
const uTear = new Uniform(0);
/** Detik; hanya maju selama sobekan hidup. Sumber seed re-roll pola irisan. */
const uTearTime = new Uniform(0);

/**
 * Petakan laju kamera ke amplitudo dan tulis kedua uniform. Dipanggil TIAP
 * frame oleh CameraController — termasuk saat diam, supaya mode paksa punya
 * tempat berpijak dan supaya uniform dijamin kembali ke 0.
 *
 * `reduced`: preferensi reduced-motion. Sobekan ini persis kelas gerakan yang
 * diminta hilang oleh preferensi itu — kedipan mendadak berfrekuensi tinggi —
 * jadi ia dimatikan total, bukan diperhalus.
 */
export function driveTear(speed: number, nowMs: number, reduced: boolean) {
  if (FORCED) {
    uTear.value = 1;
    uTearTime.value = nowMs / 1000;
    return;
  }

  if (reduced) {
    if (uTear.value !== 0) uTear.value = 0;
    return;
  }

  const t = (speed - SPEED_MIN) / (SPEED_FULL - SPEED_MIN);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const amp = c * c * (3 - 2 * c); // smoothstep

  uTear.value = amp;
  if (amp > 0) uTearTime.value = nowMs / 1000;
}

/** Kembalikan ke keadaan mati. Dipanggil saat CameraController unmount. */
export function resetTear() {
  uTear.value = 0;
}

/**
 * Nama fungsi & uniform sengaja diberi awalan `csiTear`: postprocessing
 * mengganti nama simbol milik tiap efek saat menggabungkan shader, tapi awalan
 * eksplisit membuat berkas ini tetap aman dibaca berdampingan dengan
 * csiGlitchBayer di CharacterGlitch kalau suatu saat keduanya disatukan.
 *
 * Matriks Bayer 4×4 sebagai rantai if — alasan yang sama dengan revealSweep,
 * MaintenanceHologram, dan CharacterGlitch: indexing array dinamis tidak
 * dijamin di GLSL ES 1.0.
 */
const fragmentShader = /* glsl */ `
uniform float uTear;
uniform float uTearTime;

float csiTearHash( vec2 co ) {
  return fract( sin( dot( co, vec2( 57.31, 91.17 ) ) ) * 43758.5453 );
}

float csiTearBayer( vec2 co ) {
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

void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {

  // Cabang pada uniform: seragam untuk seluruh layar, jadi saat mati (hampir
  // selalu) tidak ada satu pun fetch tambahan yang dibayar.
  if ( uTear <= 0.001 ) {
    outputColor = inputColor;
    return;
  }

  float seed = floor( uTearTime * ${REROLL_HZ.toFixed(1)} );

  // Tinggi pita dibulatkan ke piksel perangkat utuh — lihat catatan BANDS.
  float bandPx = max( floor( resolution.y / ${BANDS.toFixed(1)} ), 2.0 );
  float band = floor( gl_FragCoord.y / bandPx );

  // Pita yang tidak lolos gerbang keluar lebih awal dan sama sekali tidak
  // disentuh: sebagian besar gambar utuh, beberapa slab meloncat.
  if ( csiTearHash( vec2( band, seed ) ) < ${GATE.toFixed(2)} ) {
    outputColor = inputColor;
    return;
  }

  float r = csiTearHash( vec2( band + 13.7, seed + 7.77 ) );
  float dx = ( r - 0.5 ) * 2.0 * ${SHIFT.toFixed(3)} * uTear;

  // Dijepit ke [0,1] alih-alih mengandalkan wrap tekstur inputBuffer: di tepi
  // layar hasilnya jadi sapuan piksel tepi, yang justru bacaan yang benar untuk
  // sobekan — dan tidak bergantung pada setelan wrap yang bukan milik kita.
  vec2 base = clamp( uv + vec2( dx, 0.0 ), 0.0, 1.0 );
  vec2 off  = vec2( dx * ${SPLIT.toFixed(2)}, 0.0 );

  vec3 c;
  c.r = texture2D( inputBuffer, clamp( base + off, 0.0, 1.0 ) ).r;
  c.g = texture2D( inputBuffer, base ).g;
  c.b = texture2D( inputBuffer, clamp( base - off, 0.0, 1.0 ) ).b;

  vec3 q = floor( c * ${STEPS.toFixed(1)}
    + csiTearBayer( floor( gl_FragCoord.xy / ${DITHER_PX.toFixed(1)} ) ) ) / ${STEPS.toFixed(1)};
  c = mix( c, q, ${DITHER_MIX.toFixed(2)} * uTear );

  outputColor = vec4( c, inputColor.a );
}
`;

class TransitionTearEffect extends Effect {
  constructor() {
    super("TransitionTearEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["uTear", uTear],
        ["uTearTime", uTearTime],
      ]),
    });
  }
}

/**
 * Pasang efeknya. WAJIB jadi anak PERTAMA di antara <Effect> EffectComposer —
 * lihat catatan urutan di kepala berkas. Instansinya di-useMemo supaya replay
 * StrictMode tidak membuat efek kedua yang ikut tergabung ke shader.
 */
export default function TransitionTear() {
  const effect = useMemo(() => new TransitionTearEffect(), []);
  return <primitive object={effect} dispose={null} />;
}

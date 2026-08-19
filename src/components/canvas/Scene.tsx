"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, N8AO, HueSaturation, BrightnessContrast } from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import { Suspense, useState } from "react";
import Office from "./Office";
import MaintenanceHologram from "./MaintenanceHologram";
import Dust from "./Dust";
import SceneEnvironment from "./SceneEnvironment";
import CameraController, { VIEWS } from "./CameraController";
import TransitionTear from "./transitionTear";
import { START_ROOM } from "@/lib/store/sceneStore";
import BilliardLazy from "./billiard/BilliardLazy";
import Waypoints from "./Waypoints";
import ContactShadowsRig, { NO_BAKE_LAYER } from "./ContactShadowsRig";
import { useGatedFrameloop } from "./FrameloopGate";
import IdleFrameCap from "./IdleFrameCap";
import AdaptiveDprDriver from "./AdaptiveDprDriver";
import { DPR_LADDER, loadLadderIndex } from "./adaptiveDpr";

// Posisi awal kamera. DIAMBIL dari VIEWS[START_ROOM], bukan angka yang ditulis
// ulang: sebelumnya di sini ada tuple hardcode [-6.0, 1.6, 4.0] yang bahkan
// TIDAK cocok dengan VIEWS.Office ([-3.97, 1.13, 2.48]) — jadi frame pertama
// selalu dari tempat yang salah sampai CameraController men-snap-nya. Dengan
// diturunkan begini, memindahkan START_ROOM cukup di satu tempat.
const START_POS = VIEWS[START_ROOM].pos.toArray() as [number, number, number];

/**
 * Resolusi render internal (19 Agu, perbaikan "Safari drop fps" tahap 1;
 * tahap 2 = AdaptiveDpr di hari yang sama).
 *
 * Dulu `[1, 1.5]` mati; sekarang TANGGA yang dikemudikan AdaptiveDpr, mulai
 * dari 1 (DPR_LADDER di adaptiveDpr.ts): buffer 2,25× lebih kecil dari 1.5,
 * dan SEMUA ongkos per-piksel (scene + N8AO + Bloom + grade) ikut turun
 * sebesar itu; perangkat yang masih keteteran diturunkan bertangga sampai
 * muat. Di layar Retina hasilnya di-upscale oleh browser; `image-rendering:
 * pixelated` di onCreated membuat upscale-nya kotak tegas ala PS1, bukan
 * blur bilinear — resep basement.studio, sejalan preferensi tepi bergigi
 * (lihat komentar multisampling di bawah).
 *
 * `?dpr=0.75` (0,25–2) = override manual untuk membandingkan look
 * berdampingan. Override MEMATIKAN AdaptiveDpr total (tidak di-mount) —
 * jangan sampai angka yang sedang dibandingkan Keano dilawan termostat.
 * Pola module-level sama dengan ?tear / ?glitch / ?dust.
 */
const DPR_OVERRIDE = (() => {
  if (typeof window === "undefined") return null;
  const v = Number(new URLSearchParams(window.location.search).get("dpr"));
  return v >= 0.25 && v <= 2 ? v : null;
})();

/**
 * ⚠️ TIDAK ADA fallback loading di sini lagi, dan itu disengaja.
 *
 * Dulu di tempat ini ada <Html> + useProgress dari drei. Dua alasan ia dicabut:
 *
 * 1. Ia BOHONG soal kapan kantor siap. `useProgress` mencapai 100% saat GLB
 *    selesai diunduh, padahal three masih memblokir main thread ~2,3 detik
 *    untuk mengompilasi 233 shader (terukur, lihat Office.tsx). Loader hilang,
 *    lalu pengunjung menatap layar beku.
 * 2. <Html> hidup DI DALAM Canvas, jadi ia baru bisa tampil setelah konteks
 *    WebGL jadi — mustahil menutupi fase pra-WebGL.
 *
 * Penggantinya overlay DOM di luar Canvas: src/components/loader/LoadingScreen.tsx,
 * yang menunggu sinyal `sceneReady` dari frame nyata pertama.
 */

/**
 * ⚠️ JANGAN pasang kembali `frameloop="demand"` di Canvas ini tanpa membaca
 * paragraf berikut sampai habis.
 *
 * Pernah ada di sini (commit df27f3d, 29 Jul) dan itu optimasi yang MASUK AKAL:
 * saat kantor diam, GPU tidak perlu menggambar 60×/detik. `invalidate()` ikut
 * dipasang di CameraController & SceneEnvironment, yaitu semua pemanggil yang
 * ada saat itu.
 *
 * Yang membuatnya dicabut bukan idenya, melainkan jangkauannya. `demand`
 * mengubah kontrak SELURUH scene: setiap `useFrame` — yang sekarang maupun yang
 * ditulis besok — wajib memanggil `invalidate()` atau animasinya diam di layar.
 * Saat feature/screen-content digabung (96df186) ia membawa tiga useFrame baru
 * yang tidak tahu kontrak itu ada, karena cabangnya berangkat 7 menit SEBELUM
 * kontraknya lahir. Git tidak melaporkan konflik — perubahannya di baris yang
 * berbeda — jadi yang rusak lolos diam-diam:
 *
 *   sapuan reveal berhenti di progress 0 → kantor tak pernah tergambar,
 *   `sweep.dispose()` tak pernah tercapai → 233 material menghitung dither +
 *   discard selamanya → layar beku DAN berat, tapi navigasi tetap jalan
 *   (CameraController satu-satunya yang punya invalidate).
 *
 * Kalau memang mau on-demand lagi, syaratnya: pasang `invalidate()` di TIAP
 * tick useFrame di Office.tsx, Waypoints.tsx, dan billiard/BilliardGame.tsx
 * lebih dulu. Penjaganya sudah ada — `frameloop.invariant.test.ts` akan gagal
 * dengan menyebut berkas yang belum patuh. Selama sapuan reveal & minigame
 * billiard masih ada, hemat GPU-nya kecil dan risikonya besar.
 *
 * Catatan: Canvas kecil di motion/ memakai `demand` dan itu benar — masing-
 * masing menggerakkan animasinya sendiri lewat invalidate() dan tidak berbagi
 * kontrak dengan scene ini. Per 18 Agu 2026 tidak ada satu pun yang benar-benar
 * terpasang di halaman: CsiParticleField dihapus, ManifestoField ikut menganggur
 * setelah section Manifesto dicabut dari Lounge, dan DeploymentsField sudah tidak
 * diimpor siapa pun sejak 3 Agu. Kalau kelak ada Canvas kecil baru, `demand`
 * tetap pilihan yang benar untuknya.
 */
export default function Scene() {
  // "always" saat hero terlihat ATAU scene belum siap; "never" selebihnya.
  // HARUS lewat prop (bukan setFrameloop imperatif): tiap re-render Canvas —
  // termasuk yang dipicu react-use-measure saat fade scroll men-scale
  // pembungkusnya — menyinkronkan ulang prop ini, jadi panggilan imperatif
  // akan ditimpa balik ke default "always". Rincian + syarat sceneReady di
  // FrameloopGate.tsx; penjaganya frameloopGate.invariant.test.ts.
  const frameloop = useGatedFrameloop();
  // dpr HARUS state React yang dipasang sebagai prop, bukan setDpr()
  // imperatif dari dalam Canvas — alasan yang persis sama dengan frameloop
  // di atas: R3F menyinkronkan ulang prop tiap re-render dan menimpa
  // panggilan imperatif. AdaptiveDpr cuma boleh bicara lewat setter ini.
  const [dpr, setDpr] = useState(
    () => DPR_OVERRIDE ?? DPR_LADDER[loadLadderIndex()],
  );
  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: START_POS, fov: 60, near: 0.05, far: 120 }}
      dpr={dpr}
      // antialias: false — dan ini BUKAN bagian dari uji MSAA di bawah.
      // Terukur terpisah: dengan multisampling 8 tetap menyala, mengubah flag
      // ini true→false TIDAK mengubah frame time sama sekali (33,3 ms
      // dua-duanya). Sebabnya ia memang tak pernah terpakai: flag ini berlaku
      // pada default framebuffer, sedangkan EffectComposer merender ke buffer
      // offscreen-nya sendiri dan melewati framebuffer itu. Jadi MSAA
      // dialokasikan dua kali, satu menganggur.
      //
      // Konsekuensinya: menyalakan kembali flag ini tidak akan mengembalikan
      // tepi yang mulus — yang menentukan hanya `multisampling` di bawah.
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.6;
        // Pasangan wajib DPR di atas: buffer internal lebih kecil dari layar,
        // dan tanpa ini browser meng-upscale-nya bilinear (lembek berkabut).
        // pixelated = tetangga terdekat → piksel kotak tegas, look PS1.
        gl.domElement.style.imageRendering = "pixelated";
        // Separuh kontrak NO_BAKE_LAYER (ContactShadowsRig.tsx): objek yang
        // dikecualikan dari bake bayangan (Dust) pindah ke layer ini, dan
        // kamera utama harus MELIHATNYA — kamera ortografis bake (layer 0
        // saja) yang tidak. Tanpa baris ini debunya lenyap dari mata.
        camera.layers.enable(NO_BAKE_LAYER);
      }}
    >
      <color attach="background" args={["#0a0a0c"]} />
      {/* ⚠️ Ambient sengaja SANGAT rendah, dan itu bukan sekadar selera.
          Ambient mengenai semua permukaan SAMA RATA — tidak peduli arah hadap
          maupun ada tembok di sebelahnya. Jadi tiap satuan ambient yang
          ditambahkan meratakan pojok ruangan dan plafon, melawan lightmap.
          Dulu 0.12 dengan lightmap MATI (0), yang berarti ambient satu-satunya
          sumber cahaya dan hasilnya rata sempurna — itu penyebab "semua
          terang" yang dikeluhkan, bukan kurang efek.

          Naikkan hanya kalau ada yang gelap total sampai tidak terbaca, dan
          naikkan sedikit-sedikit; 0.10 saja sudah cukup untuk mengembalikan
          tampilan flat itu. */}
      <ambientLight intensity={0.18} color="#ffbd75" />
      <SceneEnvironment />
      {/* CharacterLights DIHAPUS 6 Agu — dan ini bukan sekadar beres-beres.
          Lampunya di-layers.set(1) sejak lahir, sedangkan WebGLRenderer
          menguji layer lampu terhadap layer KAMERA (r185 ~17387) yang cuma
          di layer 0 → lampu itu TIDAK PERNAH dikumpulkan renderer. Artinya
          look karakter yang disukai selama ini = ambient di atas + envmap
          saja. Point light motivated per karakter sempat dites hidup beneran
          (6 Agu, Person2) dan Keano memilih tanpa lampu. Kalau mau dicoba
          lagi: lampu HARUS di layer 0, pagari dengan distance pendek. */}
      <CameraController />
      {/* Termostat resolusi — jebakan yang dijaganya (cap OS Low Power Mode,
          sampel jujur fase aktif, override manual menang) didokumentasikan di
          adaptiveDpr.ts. Gerbang DPR_OVERRIDE = jebakan #3: saat Keano sedang
          A/B lewat ?dpr=, termostatnya tidak boleh ikut campur. */}
      {DPR_OVERRIDE === null && <AdaptiveDprDriver onChange={setDpr} />}

      <Suspense fallback={null}>
        <Office />
        {/* Penutup lubang pintu buntu di sisi timur laut Office. HARUS di dalam
            Suspense yang sama dengan <Office/>: ia ikut menumpang uniform
            sapuan reveal, dan uniform itu baru digerakkan setelah GLB dimuat.
            Di luar Suspense hologramnya menyala di ruang kosong selama GLB
            masih diunduh. */}
        <MaintenanceHologram />
        {/* Debu melayang. HARUS di dalam Suspense yang sama dengan <Office/>
            dengan alasan yang sama seperti hologram: ia menumpang uniform
            sapuan reveal, dan uniform itu baru digerakkan setelah GLB dimuat.
            Di luar Suspense, debunya sudah beterbangan di ruang kosong selama
            GLB masih diunduh.

            Tapi TIDAK perlu jadi anak <Office/> seperti CharacterGlitch:
            kontrak urutan di sana ada karena glitch menambal onBeforeCompile
            material GLB dan harus terpasang sebelum sapuan menimpanya. Debu
            punya ShaderMaterial sendiri dan tidak menyentuh satu pun material
            kantor, jadi tidak ada urutan yang bisa salah. */}
        <Dust />
        {/* Kerucut cahaya volumetrik (LightCone/LightCones) DIHAPUS 30 Jul.
            Kalau nanti dibuat lagi, dua catatan yang mahal didapat:

            1. Kerucut 360° tidak bisa MENJAMIN sinar seimbang kiri-kanan.
               Potongan noise yang menghadap kamera ditentukan azimut kamera,
               jadi tiap view dapat potongan berbeda dan ada yang kebetulan
               berat sebelah. Seed/frekuensi/lantai-sinar cuma menggeser
               peluang. Yang menyelesaikan: setengah cangkang (180°) yang
               selalu menghadap kamera + uv.x dicerminkan → kiri == kanan
               secara matematis.
            2. Radius kerucut tampak = KERUCUT DALAM Blender, yaitu
               spot_size × (1 − spot_blend), bukan spot_size penuh. Yang penuh
               itu batas terluar tempat cahaya sudah habis meredup; memakainya
               memberi bentuk kipas mekar, bukan berkas sorot.

            Versi terakhir tersimpan di git stash ("light cone WIP 30 Jul")
            kalau butuh rujukan. */}
        {/* Bayangan kontak — "gelap di bawah meja". Harus DI DALAM Suspense:
            ia memanggang bayangan dari geometri GLB, yang baru ada setelah
            model dimuat. Di luar Suspense hasilnya bake kosong.

            Pelengkap N8AO di bawah, bukan tumpang-tindih: AO bekerja di ruang
            layar (pojok & celah rapat), sedangkan ini menjatuhkan bayangan
            ARAH pada lantai dari benda di atasnya — kolong meja, bawah kursi. */}
        <ContactShadowsRig />
        {/* Minigame billiard — kodenya + ~1 MB GLB baru diunduh saat pengunjung
            sampai di Lounge (tempat mejanya), dan baru di-mount saat mejanya
            benar-benar diklik. Di perangkat sentuh keduanya tidak pernah
            terjadi. Lihat BilliardLazy.tsx. */}
        <BilliardLazy />
        {/* Waypoint harus di dalam Suspense: posisinya mengacu ke ruangan yang
            baru ada setelah GLB dimuat. */}
        <Waypoints />
      </Suspense>

      {/* ── multisampling: 0 — DIPUTUSKAN, MSAA dimatikan (3 Agu 2026) ───────
          Keano melihat sendiri hasilnya berdampingan dan menerima tepi yang
          lebih bergerigi sebagai harga yang pantas untuk 2× frame rate.
          Bukan asumsi "60 FPS pasti lebih baik" — penilaian tampilan yang
          diambil setelah melihat.

          Ditulis EKSPLISIT, bukan dibiarkan kosong. Tanpa props, library
          memakai default `multisampling: 8` (diverifikasi di node_modules:
          `multisampling:_=8`) — setelan termahal di berkas ini, dan dulu tidak
          disebut sama sekali di komentar mana pun.

          Terukur di M2, dpr 2 (2,63 Mpx — mendekati layar Retina):
            multisampling 8 → p50 33,3 ms · 30 FPS
            multisampling 4 → p50 33,3 ms · 30 FPS   ← TIDAK menolong sama sekali
            multisampling 0 → p50 16,7 ms · 60 FPS   ← DIPAKAI SEKARANG
          Di dpr 1 ketiganya sama-sama 16,7 ms (mentok vsync), jadi mengukur di
          jendela kecil akan menyimpulkan "tidak ada bedanya" — SALAH. Ongkos
          MSAA itu per piksel; ia baru terlihat di kerapatan piksel Retina.

          Bahwa 4 sama mahalnya dengan 8 berarti pilihannya BINER: ada MSAA atau
          tidak. Tidak ada jalan tengah yang bisa ditawar.

          Tampilannya memang berubah — 18,84% piksel, tepi plafon diagonal &
          pilar jadi bertangga, cincin lampu gantung pecah jadi putus-putus.
          Tapi itu BUKAN sekadar kompromi yang ditelan demi FPS: Keano melihat
          hasilnya lalu menyatakan ia LEBIH SUKA tepi yang sedikit bergigi.
          Sejalan juga dengan arah look PS1/basement.studio yang bersandar pada
          NearestFilter + piksel tegas.

          ⚠️ Jadi aliasing di sini adalah PILIHAN ESTETIK, bukan utang teknis.
          Laporan "tepinya kasar" = keputusan yang sudah ditimbang, bukan bug.
          JANGAN menambahkan SMAA/FXAA untuk "memperbaikinya", dan JANGAN
          kembali ke `multisampling={4}` — terukur sama mahalnya dengan 8,
          membayar penuh tanpa dapat apa-apa. */}
      <EffectComposer multisampling={0}>
        {/* Cap 30 fps saat idle — membungkus composer.render dan melewati
            tick genap saat tidak ada gerakan/interaksi (definisi lengkap di
            renderPace.ts). Anak EffectComposer, BUKAN efek: ia me-render null
            dan cuma butuh instance composer dari context. Ini separuh dari
            perbaikan "Safari drop fps" 19 Agu; separuh lainnya DPR di atas. */}
        <IdleFrameCap />
        {/* ── AO runtime: pojok & celah jadi gelap ────────────────────────────
            Ini yang mengisi lubang terbesar lightmap. Bake cuma mencakup
            objek ≥8 m² (Documentations.md §4g) = 39 dari 233 material; 189
            material sisanya TIDAK punya lightmap sama sekali, jadi ambient
            menyinarinya rata dan pojoknya tidak pernah gelap. AO bekerja per
            piksel layar, jadi ia kena SEMUA objek tanpa perlu bake.

            Sekaligus menutup dua kelemahan lightmap yang tidak bisa dibetulkan
            dari Three.js: plafon Office/Lounge/Function tidak ke-bake, dan
            2 lightmap (dinding krem + parket meeting room) isinya hitam total.

            ⚠️ HARUS SEBELUM <Bloom>. Urutan di EffectComposer = urutan
            eksekusi: AO menggelapkan dulu, bloom baru menyebarkan sisa yang
            terang. Kalau dibalik, bloom menyebar dari piksel yang belum
            digelapkan dan pendarnya bocor ke pojok yang seharusnya gelap.

            halfRes: AO dihitung di setengah resolusi lalu di-upsample sadar
            kedalaman. Menekan ongkos ~4× dan hampir tidak terlihat bedanya —
            AO itu sinyal low-frequency. Penting di scene ini yang bottleneck-
            nya memang jumlah pass, bukan poly.

            ⚠️ quality="high", BUKAN "low" — dan JANGAN buang halfRes.
            Keduanya hasil pengukuran di dinding meeting room (30 Jul), bukan
            selera. "low" adalah penyebab NOISE BELANG di dinding & plafon yang
            sempat dikira berasal dari lightmap; dokumentasi n8ao menyebutnya
            sendiri: "Low (Temporally stable, but low-frequency noise)" — 16 AO
            samples, 4 denoise samples. Bukti A/B: mematikan lightmap tidak
            mengubah rasio noise/kecerahan (0.00377 → 0.00393), sedangkan
            mematikan AO memangkas noise 53% PADAHAL ruangan jadi lebih terang.

            Noise terukur (dinding kiri meeting room) + FPS:
              low  + halfRes  → 0.377        ← noise belang, kondisi awal
              high + halfRes  → 0.322  119   ← DIPAKAI: paling halus & tercepat
              high tanpa half → 0.621   66   ← lebih buruk DAN separuh FPS

            Baris terakhir itu berlawanan intuisi tapi terukur: membuang halfRes
            MENAIKKAN noise dua kali lipat. Di setengah resolusi, upsample sadar
            kedalaman ikut meratakan bintik antar-piksel — jadi halfRes di sini
            berfungsi sebagai penghalus, bukan cuma penghemat ongkos. */}
        <N8AO
          aoRadius={1.6}
          distanceFalloff={1.5}
          intensity={6.0}
          quality="high"
          halfRes
          depthAwareUpsampling
        />
        {/* ── Sobekan transisi ────────────────────────────────────────────────
            Irisan layar tergeser saat kamera terbang paling cepat antar
            ruangan, pulih sendiri saat tiba. Amplitudonya digerakkan LAJU
            kamera (CameraController), jadi nol di luar perpindahan.

            ⚠️ HARUS EFEK PERTAMA — sebelum <Bloom>, <HueSaturation>, dan
            <BrightnessContrast>. Bukan selera, mekanis: efek-efek ini digabung
            postprocessing jadi SATU fragment shader, dan di dalamnya satu-
            satunya tekstur yang bisa di-sample pada UV yang digeser adalah
            `inputBuffer` — gambar MASUKAN pass. Ditaruh belakangan, pita yang
            tergeser mengambil piksel yang belum di-grade sementara pita yang
            diam sudah, dan hasilnya belang warna antar pita.

            Ditaruh di sini, grade per-piksel di bawah kena rata ke pita yang
            tergeser maupun yang diam, dan Bloom tidak tersentuh sama sekali:
            piramida blur-nya dirender dari inputBuffer di pass-nya sendiri
            SEBELUM shader gabungan jalan. Kalibrasi ambang 0,95 di seluruh
            berkas ini tetap berlaku persis — efek ini tidak bisa mengangkat
            satu piksel pun melewatinya.

            Nol pass tambahan. Saat mati: satu cabang uniform lalu keluar. */}
        <TransitionTear />
        {/* Bloom BUKAN sekadar hiasan di scene ini: LED strip lantai & bohlam
            mengandalkannya untuk terlihat menyala. Tanpa bloom sama sekali, LED
            strip cuma garis putih tipis dan ruangan terasa jauh lebih mati.

            0.4 — diturunkan bertahap dari 1.6 → 0.8 → 0.4 (30 Jul). Angka
            aslinya (1.6) dikalibrasi saat scene TIDAK punya AO maupun bayangan
            dan lightmap masih mati, jadi bloom dipakai untuk mengangkat
            kecerahan keseluruhan — pekerjaan yang sekarang sudah diambil alih
            lightmap + N8AO + bayangan kontak. Bloom kembali ke porsinya:
            memberi pendar pada yang memang menyala, bukan menerangi ruangan.

            Tabel di bawah kecerahan RELATIF terhadap viewer HTML acuan, diukur
            saat kalibrasi awal. Perlakukan sebagai sejarah, BUKAN target: ia
            diambil sebelum ada AO & bayangan, jadi angkanya tidak lagi berlaku
            untuk scene sekarang.
              0.4 → 0.75   0.8 → 0.85   1.2 → 0.92   1.6 → 0.98

            Catatan: nilai ini TIDAK setara viewer HTML meski angkanya sama —
            viewer pakai UnrealBloomPass, di sini BloomEffect dari
            postprocessing.

            threshold 0.95 = hanya emissive yang berpendar. JANGAN diturunkan:
            lantai & permukaan terang ikut glow seperti lava. */}
        <Bloom intensity={0.4} luminanceThreshold={0.95} mipmapBlur />
        {/* Color grade hangat — mengejar tone render Cycles (5 Agu).
            ACES pada exposure tinggi menekan saturasi, jadi dinding cream
            tampak pucat kelabu meski sudah terang. Dua pass murah ini
            mengembalikannya DI LEVEL FRAME, setelah bloom, tanpa melawan
            lightmap (beda dengan menaikkan ambient yang meratakan pojok). */}
        <HueSaturation saturation={0.3} />
        <BrightnessContrast brightness={0.03} contrast={0.08} />
      </EffectComposer>
    </Canvas>
  );
}

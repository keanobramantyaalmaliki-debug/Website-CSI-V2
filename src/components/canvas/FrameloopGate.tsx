"use client";

import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Nilai `frameloop` untuk Canvas utama: mematikan render loop saat kantor 3D
 * tidak terlihat.
 *
 * Latar: Canvas utama memakai frameloop "always" — keputusan sadar, lihat
 * komentar panjang di Scene.tsx soal kenapa "demand" dicabut. Harganya: begitu
 * pengunjung scroll melewati hero, canvas tetap merender 60 fps di balik
 * pembungkus yang sudah opacity 0 — 233 material + N8AO + Bloom untuk layar
 * yang tidak menampilkannya. Itulah yang membuat laptop panas walau halaman
 * "cuma" menampilkan konten teks (dilaporkan 3 Agu 2026).
 *
 * Solusinya BUKAN menghidupkan lagi "demand" — kontrak demand↔invalidate
 * pernah rusak diam-diam lewat merge (frameloop.invariant.test.ts menceritakan
 * kejadiannya). "never" berbeda kelas: ia menghentikan SEMUA useFrame serempak,
 * jadi tidak ada file yang bisa "lupa" sebagian; mixer karakter, sweep, tween —
 * semuanya diam bersama dan bangun bersama.
 *
 * ── Kenapa hook yang mengembalikan nilai prop, BUKAN komponen yang memanggil
 *    setFrameloop() ────────────────────────────────────────────────────────────
 * Versi pertama fix ini (4 Agu) adalah komponen di dalam Canvas yang memanggil
 * `setFrameloop("never")` imperatif — dan TERUKUR GAGAL: draw call jalan terus
 * di posisi scroll bawah. Sebabnya halus: fade scroll Hero men-scale pembungkus
 * ke 0.96, react-use-measure melihat ukuran berubah (1440×813 → 1382×780),
 * `<Canvas>` re-render, dan `configure()` R3F MENYINKRONKAN ULANG prop
 * `frameloop` — yang tidak diset = default "always" — menimpa panggilan
 * imperatif kita persis di momen ia dibutuhkan. Lewat prop reaktif, R3F
 * sendiri yang menjaga nilainya di TIAP re-render; tidak ada yang bisa
 * menimpanya diam-diam.
 *
 * ⚠️ `|| !sceneReady` itu WAJIB, bukan kehati-hatian berlebih. `sceneReady`
 * dipancarkan oleh useFrame di Office.tsx pada frame nyata pertama; kalau loop
 * dipause sebelum frame itu tergambar, sinyalnya tidak akan pernah datang dan
 * LoadingScreen menutupi layar SELAMANYA — kegagalan terburuk di repo ini
 * (INVARIANTS.md §3). `heroInView` memang default true, tapi jangan bersandar
 * pada itu: reload di posisi scroll tengah halaman membuat observer
 * menyetelnya false sebelum GLB selesai dimuat.
 *
 * Penjaganya: frameloopGate.invariant.test.ts — Scene.tsx wajib memakai hook
 * ini di prop frameloop, dan kondisi di sini wajib menyebut kedua flag.
 *
 * ⚠️ `|| pendingRoom !== null` juga WAJIB, dan alasannya persis kebalikan dari
 * fungsi utama hook ini. Sapuan GridReveal menyingkap 3D SELAGI pengunjung
 * masih berada jauh di bawah konten — `heroInView` false, `sceneReady` true,
 * jadi tanpa syarat ini loop-nya diam tepat pada satu-satunya momen ruangan
 * baru harus menggambar dirinya. Yang terlihat: kotak-kotak membuka ke frame
 * TERAKHIR ruangan lama, lalu ruangan benar muncul belakangan saat scroll
 * menyusul. GridReveal memang menunggu frameTick maju sebelum menyapu, tapi
 * penghitung itu tidak akan pernah maju kalau loop-nya belum dinyalakan — jadi
 * ia jatuh ke jaring pengaman 300 ms-nya dan tetap menyingkap layar yang basi.
 *
 * Efek samping yang sudah ditimbang:
 *  - Perubahan frameloop me-reset clock R3F → aman: tidak ada kode canvas/
 *    yang membaca clock.elapsedTime (semua pakai performance.now() atau dt;
 *    guard sweep di Office.tsx bahkan sengaja pakai jam dinding sendiri).
 *  - Tween kamera yang terpotong pause akan snap ke tujuan saat resume
 *    (t ≥ 1) — tak terlihat, canvas sedang opacity 0.
 *  - GL context & state kamera tidak hilang — cuma loop-nya yang berhenti.
 */
export function useGatedFrameloop(): "always" | "never" {
  const heroInView = useSceneStore((s) => s.heroInView);
  const sceneReady = useSceneStore((s) => s.sceneReady);
  const pendingRoom = useSceneStore((s) => s.pendingRoom);
  return heroInView || !sceneReady || pendingRoom !== null
    ? "always"
    : "never";
}

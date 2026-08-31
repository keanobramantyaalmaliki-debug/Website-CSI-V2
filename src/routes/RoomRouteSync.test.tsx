/**
 * PENJAGA REGRESI — scrollTo tidak boleh menyela tween kamera
 *
 * ── Bug yang dijaga (3 Agu, ditemukan saat merge branch `join`) ─────────────
 * Klik waypoint memicu urutan berantai:
 *
 *   goTo("Office")            → tween mulai, setCurrentRoom("Office")
 *   Arah 2 melihat perubahan  → navigate("/office")
 *   pathname berubah          → Arah 1 menyala LAGI
 *
 * Semua itu terjadi selagi tween kamera 1400 ms masih berjalan. Panggilan
 * goTo()-nya sendiri tertahan guard `animating` di CameraController, tapi
 * `window.scrollTo(0, 0)` di sebelahnya TIDAK — ia tetap dieksekusi di tengah
 * animasi.
 *
 * Dua akibatnya bertumpuk, dan keduanya terasa sebagai "perpindahan ruangan
 * jadi tersendat":
 *   1. layout + repaint dipaksa sementara useFrame menggerakkan kamera 60×/dtk
 *   2. progress scroll MELOMPAT ke 0, sehingga opacity & scale canvas (yang
 *      digerakkan scroll di Hero.tsx) berubah mendadak di frame yang sama
 *
 * Gejalanya tidak menunjuk ke berkas ini sama sekali: yang terlihat adalah
 * kamera 3D yang patah-patah, sementara penyebabnya sebaris efek samping DOM
 * di komponen routing.
 *
 * ── Kenapa test ini membaca teks, bukan me-render ──────────────────────────
 * Membuktikan perilakunya butuh tween kamera yang benar-benar jalan — artinya
 * WebGL, useFrame, dan R3F, yang semuanya tidak ada di jsdom. Yang perlu
 * dijaga jauh lebih sederhana: guard-nya masih terpasang, dan scrollTo masih
 * berada DI BAWAH-nya. Itu bisa dibaca.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "RoomRouteSync.tsx"),
  "utf8",
);

/** Buang komentar — berkas ini menjelaskan guard-nya panjang lebar di prosa,
 *  dan penjelasan itu tidak boleh dihitung sebagai kode yang menjaga.
 *  Baris import juga dibuang: `import { scrollToTop, scrollToSection } from
 *  "@/lib/smoothScroll"` mengandung substring "scrollTo" dan muncul di awal
 *  berkas, jauh sebelum guard-nya — kalau ikut terhitung, assertion urutan di
 *  bawah gagal padahal kodenya benar. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")
  .replace(/^import[^\n]*\n/gm, "");

/** Guard "URL cuma menyusul currentRoom yang sudah berubah", bentuk bebas:
 *  kedua urutan operand, dan boleh berbagi `if` dengan syarat lain. */
const GUARD_RE =
  /if\s*\([^)]*(?:key\s*===\s*currentRoom|currentRoom\s*===\s*key)[^)]*\)/;

describe("RoomRouteSync tidak menyela tween kamera", () => {
  it("Arah 1 berhenti lebih dulu kalau room-nya sudah aktif", () => {
    // Bentuk bebas (`key === currentRoom`, `currentRoom === key`, dengan atau
    // tanpa kurung) — yang dijaga maksudnya, bukan gayanya.
    // Kondisinya boleh berbagi satu `if` dengan syarat lain (sejak perbaikan
    // pantulan ia satu blok dengan `!goTo`) — yang dijaga keberadaannya, bukan
    // apakah ia berdiri sendiri.
    const hasGuard = GUARD_RE.test(CODE);

    expect(
      hasGuard,
      "Efek `pathname → room` di RoomRouteSync.tsx tidak lagi melewati kasus " +
        "\"URL cuma menyusul currentRoom yang sudah berubah\".\n\n" +
        "Tanpa guard itu, klik waypoint membuat efek ini menyala di tengah " +
        "tween kamera 1400 ms, dan `window.scrollTo(0, 0)` di dalamnya " +
        "memaksa repaint + melompatkan progress scroll — perpindahan ruangan " +
        "jadi TERSENDAT.\n\n" +
        "goTo() sendiri sudah dijaga `animating` di CameraController, jadi " +
        "yang bocor cuma efek samping DOM-nya. Guard-nya harus di sini.\n",
    ).toBe(true);
  });

  it("scrollToTop berada SESUDAH guard, bukan sebelumnya", () => {
    const guard = CODE.search(GUARD_RE);
    const scroll = CODE.search(/scrollToTop\s*\(/);

    // Tidak ada pemanggilan scrollToTop sama sekali → tidak ada yang perlu diurutkan.
    if (scroll === -1) return;

    expect(
      guard !== -1 && guard < scroll,
      "`scrollToTop()` di RoomRouteSync.tsx berada SEBELUM guard " +
        "`key === currentRoom`, jadi ia tetap jalan pada perpindahan yang " +
        "dipicu waypoint — persis efek samping yang membuat tween kamera " +
        "tersendat. Pindahkan guard-nya ke atas.\n",
    ).toBe(true);
  });

  it("jawaban goTo yang menentukan siapa menandai resolvedPath", () => {
    // ── Bug yang dijaga (31 Agu) ───────────────────────────────────────────
    // Arah 1 dulu menandai `resolvedPath.current = pathname` LEBIH DULU, lalu
    // memanggil `goTo(key)` sebagai pernyataan telanjang. `goTo` menyetel
    // currentRoom lewat zustand, yang tidak terbaca commit yang sedang
    // berjalan — jadi Arah 2 menyala di commit yang SAMA, masih memegang
    // currentRoom LAMA, dan gerbangnya (`resolvedPath.current === pathname`)
    // sudah telanjur dibuka. Ia menavigasi ke `pathFor(currentRoom lama)`.
    //
    // Terukur di peramban, satu klik navbar Services = TIGA entri riwayat:
    //
    //     push /services  →  push /  →  push /services
    //
    // Di lokal entri ketiga menutupinya. Di produksi, saat Scene gagal dimuat
    // dan currentRoom tidak pernah menyusul, entri ketiga tidak pernah datang:
    // navbar "mau masuk lalu mantul balik ke Home".
    //
    // Perbaikannya menunda penandaan sampai goTo menjawab. Yang dibaca di sini
    // adalah bentuk itu — `goTo(key)` dipakai sebagai KONDISI, bukan
    // pernyataan yang jawabannya dibuang.
    expect(
      /if\s*\(\s*goTo\s*\(\s*key\s*\)\s*\)/.test(CODE),
      "`goTo(key)` di RoomRouteSync.tsx tidak lagi dibaca jawabannya.\n\n" +
        "Tanpa itu, Arah 1 menandai `resolvedPath` sebelum tahu apakah " +
        "currentRoom akan menyusul, dan Arah 2 menavigasi balik ke ruangan " +
        "lama di commit yang sama — navbar memantul ke Home.\n",
    ).toBe(true);

    expect(
      /(?<!if\s*\(\s*)\bgoTo\s*\(\s*key\s*\)\s*;/.test(CODE),
      "Ada `goTo(key);` telanjang di RoomRouteSync.tsx — jawabannya dibuang, " +
        "dan itu persis bentuk yang melahirkan pantulan navbar.\n",
    ).toBe(false);
  });

  it("GoToFn melaporkan diterima/ditolak", () => {
    // Kontrak lintas berkas: bentuk `if (goTo(key))` di atas cuma berarti
    // sesuatu kalau GoToFn benar-benar mengembalikan boolean. Dikembalikan ke
    // `void` dan tsc memang menangkapnya — tapi pesannya menunjuk ke pemanggil,
    // bukan ke alasannya, jadi alasannya ditulis di sini.
    const store = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../lib/store/sceneStore.ts"),
      "utf8",
    );
    expect(
      /export type GoToFn\s*=[^;]*=>\s*boolean\s*;/.test(store),
      "GoToFn di sceneStore.ts tidak lagi mengembalikan boolean. " +
        "RoomRouteSync Arah 1 bergantung padanya untuk tahu apakah " +
        "currentRoom akan menyusul — lihat penjaga pantulan navbar di atas.\n",
    ).toBe(true);
  });

  it("currentRoom ikut jadi dependency efeknya", () => {
    // Guard membaca currentRoom, jadi ia wajib ada di dependency array —
    // kalau tidak, efeknya memakai nilai basi dan guard-nya bisa salah menilai.
    // eslint react-hooks/exhaustive-deps menangkap ini juga; di sini dijaga
    // supaya tidak "diperbaiki" dengan menghapus dep-nya agar lint diam.
    expect(
      /\[\s*pathname\s*,[^\]]*currentRoom[^\]]*\]/.test(CODE),
      "Efek `pathname → room` membaca `currentRoom` tapi tidak " +
        "mencantumkannya di dependency array — guard-nya akan menilai dengan " +
        "nilai basi.\n",
    ).toBe(true);
  });
});

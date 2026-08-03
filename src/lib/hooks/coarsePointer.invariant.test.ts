/**
 * PENJAGA INVARIANT — interaksi scene 3D mati di perangkat sentuh
 *
 * ── Kenapa test ini ada ─────────────────────────────────────────────────────
 * 3 Agu diputuskan: di perangkat sentuh, kantor 3D adalah PEMANDANGAN, bukan
 * permainan. Waypoint dan minigame billiard dimatikan; navigasi ruangan
 * seluruhnya diserahkan ke navbar.
 *
 * Yang membuatnya rawan adalah bentuk keputusan itu: ia satu keputusan yang
 * dijalankan di TIGA berkas yang tidak saling menyebut —
 *
 *   canvas/Waypoints.tsx  → berhenti me-render bidang waypoint
 *   canvas/Office.tsx     → onClick meja tidak lagi membuka minigame
 *   sections/Hero.tsx     → HUD & label tidak di-mount (kosmetik + hemat chunk)
 *
 * Melepas satu saja tidak menghasilkan error, tidak menggagalkan typecheck,
 * dan TIDAK TERLIHAT di desktop tempat kita mengembangkannya — cacatnya hanya
 * muncul di HP. Dua di antaranya bahkan punya kegagalan yang lebih buruk dari
 * sekadar "fitur bocor":
 *
 *   • Office.tsx lepas, Hero.tsx pasang → meja masih bisa disentuh, tapi HUD-
 *     nya tidak ada. Kamera meluncur ke pandangan atas meja dan pengunjung
 *     TERKUNCI di sana: tombol keluar hidup di dalam HUD yang tak di-mount.
 *   • Waypoints.tsx lepas → sentuhan pertama di bidang tak terlihat langsung
 *     memindahkan ruangan, tanpa hover yang menjelaskan apa pun.
 *
 * ── Kenapa berupa test teks ─────────────────────────────────────────────────
 * Alasannya sama dengan frameloop.invariant.test.ts: yang dilanggar adalah
 * kontrak ANTAR-FILE. Merender jalur ini butuh WebGL (tidak ada di jsdom) DAN
 * `matchMedia` sentuh sekaligus, sementara yang ingin dijaga cuma "ketiganya
 * masih ikut aturan yang sama". Membaca sumbernya jauh lebih murah.
 *
 * ── Batas yang jujur ────────────────────────────────────────────────────────
 * Ini pemeriksaan teks: ia tahu `useCoarsePointer` DIPAKAI di sebuah berkas,
 * bukan bahwa gerbangnya dipasang di cabang yang benar. Sebuah berkas bisa
 * lolos test ini dan tetap salah. Yang ia jamin: tidak ada satu pun dari tiga
 * berkas itu yang lupa TOTAL — dan itu persis bentuk kegagalan yang ditakutkan
 * di sini, karena melepas gerbang jauh lebih mudah daripada memasangnya keliru.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Berkas yang WAJIB menggerbangi dirinya dengan useCoarsePointer, beserta
 * akibatnya kalau gerbang itu dilepas. Pesannya ikut ke dalam kegagalan test —
 * yang membacanya nanti belum tentu tahu keputusan 3 Agu ini.
 */
const GATED: { path: string; why: string }[] = [
  {
    path: "components/canvas/Waypoints.tsx",
    why: "waypoint akan tampil di HP; sentuhan pertama langsung memindahkan ruangan tanpa hover yang menjelaskannya",
  },
  {
    path: "components/canvas/Office.tsx",
    why: "meja billiard masih bisa disentuh; kamera meluncur ke atas meja dan pengunjung TERKUNCI karena tombol keluar ada di HUD yang tidak di-mount",
  },
  {
    path: "components/sections/Hero.tsx",
    why: "HUD billiard & label waypoint ikut di-mount dan chunk-nya diunduh percuma di jaringan seluler",
  },
];

/** Buang komentar — berkas di proyek ini sering MENYEBUT nama hook justru saat
 *  menjelaskan sesuatu, dan itu tidak boleh dihitung sebagai pemakaian. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("interaksi scene 3D digerbangi useCoarsePointer", () => {
  it("ketiga berkas yang menyentuh interaksi 3D masih memakai gerbangnya", () => {
    const offenders = GATED.filter(({ path }) => {
      const code = stripComments(readFileSync(join(SRC, path), "utf8"));
      return !code.includes("useCoarsePointer");
    });

    expect(
      offenders,
      `Di perangkat sentuh, kantor 3D harus jadi PEMANDANGAN saja: waypoint & ` +
        `minigame billiard mati, navigasi ruangan lewat navbar (keputusan 3 Agu).\n\n` +
        `Berkas berikut tidak lagi memakai useCoarsePointer:\n\n` +
        offenders.map((o) => `  • ${o.path}\n    → ${o.why}`).join("\n\n") +
        `\n\nKalau keputusannya memang dicabut, hapus entri berkas itu dari ` +
        `GATED di test ini dan perbarui INVARIANTS.md §6 — jangan biarkan ` +
        `keduanya berselisih.\n`,
    ).toEqual([]);
  });

  it("gerbangnya memakai pointer: coarse, bukan lebar layar", () => {
    // Patokannya BUKAN selera: yang membuat interaksi ini gagal di HP adalah
    // tidak adanya hover, bukan sempitnya layar. Mengganti ke `max-width`
    // meloloskan tablet landscape yang masalahnya sama persis, dan itu
    // regresi yang mustahil terlihat di desktop.
    const hook = stripComments(
      readFileSync(join(SRC, "lib/hooks/useCoarsePointer.ts"), "utf8"),
    );

    expect(
      hook.includes("pointer: coarse"),
      `useCoarsePointer harus menguji "(pointer: coarse)". Patokan lebar layar ` +
        `meloloskan tablet landscape — yang sama-sama tanpa hover, jadi ` +
        `waypoint di sana tetap tidak terbaca. Lihat INVARIANTS.md §6.\n`,
    ).toBe(true);
  });
});

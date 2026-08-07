/**
 * PENJAGA INVARIANT — video layar wajib digerbangi `heroInView`
 *
 * ── Kenapa test ini ada ─────────────────────────────────────────────────────
 * Elemen `<video>` punya thread dekode SENDIRI. Ia tidak tahu-menahu soal
 * frameloop R3F, tidak berhenti saat FrameloopGate menyetel "never", dan tidak
 * peduli bahwa canvas sudah lama tidak menggambar. Satu-satunya yang
 * menghentikannya adalah seseorang memanggil `.pause()` secara eksplisit.
 *
 * Itu persis bentuk bug yang SUDAH terjadi di repo ini. 3 Agu 2026, keluhan
 * "laptop panas walau cuma baca teks": biangnya engine matter-js di
 * PhysicsHeading yang tetap berdetak 60 fps selamanya walau efeknya sudah
 * digerbangi dengan benar. Pelajarannya ditulis begini:
 *
 *   menggerbangi EFEK ≠ menggerbangi MESIN
 *
 * Video adalah mesin. Kalau suatu hari gerbangnya hilang — dirapikan, kena
 * refactor, atau tergilas merge — tidak ada satu piksel pun di layar yang
 * berubah. Situsnya tampak baik-baik saja; yang terjadi cuma kipas menyala di
 * laptop orang lain. Kegagalan diam seperti itulah yang butuh penjaga
 * otomatis, karena tidak ada yang akan melaporkannya sebagai bug.
 *
 * ── Kenapa pemeriksaan teks ─────────────────────────────────────────────────
 * Sepola dengan frameloop.invariant.test.ts & frameloopGate.invariant.test.ts,
 * dan karena alasan yang sama: yang dilanggar adalah kontrak ANTAR-BERKAS
 * (screenVideo.ts menyediakan mesin, Office.tsx yang menggerbangi), dan
 * merendernya butuh WebGL yang tidak dipunyai jsdom. `tsc` maupun `eslint`
 * tidak punya cara tahu bahwa sebuah `play()` seharusnya berpasangan dengan
 * sebuah flag.
 *
 * ── Batas yang jujur ────────────────────────────────────────────────────────
 * Ini tahu bahwa nama flag-nya DISEBUT di berkas yang memutar video, bukan
 * bahwa logikanya benar. Sebuah berkas bisa lolos dan tetap salah. Yang
 * dijamin: tidak ada yang lupa TOTAL — dan "lupa total" persis yang terjadi
 * pada PhysicsHeading.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CANVAS_DIR, "../../..");

/** Semua .ts/.tsx di canvas/, kecuali berkas test. Sama seperti tetangganya. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (entry.name.includes(".test.")) continue;
    out.push(full);
  }
  return out;
}

/** Komentar di folder ini menyebut nama flag justru saat menjelaskan kenapa
 *  sesuatu TIDAK dipakai — harus dibuang atau semua berkas lolos palsu. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("video layar wajib digerbangi heroInView", () => {
  const files = sourceFiles(CANVAS_DIR).map((path) => ({
    path,
    code: stripComments(readFileSync(path, "utf8")),
  }));

  it("berkas yang MEMUTAR video ikut membaca heroInView", () => {
    // Yang dicari adalah PEMANGGILAN, bukan definisi. Lookbehind `function\s`
    // itu yang membedakan: tanpanya, screenVideo.ts menuduh dirinya sendiri
    // lewat baris `export function playScreenVideos()`, padahal ia cuma
    // menyediakan mesinnya dan memang bukan tugasnya tahu soal ruangan atau
    // posisi scroll. Yang harus tahu adalah berkas yang MEMANGGILNYA.
    //
    // ⚠️ Kurungnya HARUS dibiarkan terbuka (`\(` saja, bukan `\(\s*\)`).
    // Versi pertama test ini mensyaratkan kurung KOSONG, dan itu berubah jadi
    // lolos-hampa begitu playScreenVideos mulai menerima daftar URL (7 Agu):
    // tidak ada lagi berkas yang cocok, offenders selalu kosong, dan test-nya
    // hijau justru saat ia berhenti memeriksa apa pun. Penjaga yang gagal
    // dengan cara diam seperti itu lebih buruk daripada tidak ada penjaga —
    // makanya ada pemeriksaan "minimal ada satu pemanggil" di bawah.
    const CALL = /(?<!function\s)\bplayScreenVideos\s*\(/;

    const callers = files.filter(({ code }) => CALL.test(code));
    expect(
      callers.length,
      `Tidak ada satu pun berkas yang memanggil playScreenVideos(). Entah ` +
        `pemutaran videonya memang sudah dicabut — atau, jauh lebih mungkin, ` +
        `bentuk panggilannya berubah sehingga pola di test ini tidak lagi ` +
        `mengenalinya. Kalau yang kedua, test ini sedang hijau tanpa memeriksa ` +
        `apa pun: perbaiki polanya, jangan hapus pemeriksaan ini.\n`,
    ).toBeGreaterThan(0);

    const offenders = callers
      .filter(({ code }) => !code.includes("heroInView"))
      .map(({ path }) => path.slice(path.indexOf("src/")));

    expect(
      offenders,
      `Elemen <video> men-dekode di thread-nya sendiri dan TIDAK berhenti saat ` +
        `frameloop jadi "never". Berkas berikut memutar video tanpa pernah ` +
        `membaca heroInView, jadi videonya akan terus men-dekode setelah ` +
        `pengunjung scroll melewati hero — laptop panas tanpa satu pun gejala ` +
        `di layar:\n\n` +
        offenders.map((f) => `  • ${f}`).join("\n") +
        `\n\nGerbangi dengan heroInView di useEffect (BUKAN useFrame — useFrame ` +
        `mati bersama frameloop, jadi perintah pause-nya tidak akan pernah ` +
        `sampai).\nLihat INVARIANTS.md §7.\n`,
    ).toEqual([]);
  });

  it("gerbangnya pakai useEffect, bukan useFrame", () => {
    // Kesalahan yang paling mungkin dilakukan orang berikutnya: menaruh
    // gerbangnya di useFrame karena "semua yang lain di canvas/ pakai itu".
    // Di berkas gerbang, useFrame tidak boleh ada sama sekali.
    const gate = files.find(({ path }) => path.endsWith("Office.tsx"));
    expect(gate, "Office.tsx tidak ditemukan").toBeDefined();

    const gateBlock = gate!.code.slice(
      gate!.code.indexOf("function ScreenVideoGate"),
    );
    const body = gateBlock.slice(0, gateBlock.indexOf("\n}"));

    expect(
      body.includes("useFrame"),
      `ScreenVideoGate memakai useFrame. useFrame BERHENTI saat FrameloopGate ` +
        `menyetel frameloop "never" — yaitu persis keadaan yang gerbang ini ` +
        `ada untuk menanggapinya. Perintah pause-nya tidak akan pernah ` +
        `dijalankan. Pakai useEffect.\n`,
    ).toBe(false);
  });

  it("tiap mp4 layar ditulis dengan +faststart (moov sebelum mdat)", () => {
    // ── Kenapa ini dijaga ────────────────────────────────────────────────────
    // Tanpa `-movflags +faststart`, ffmpeg menaruh atom `moov` (indeks berkas)
    // di AKHIR. Browser tidak bisa memutar apa pun sebelum indeks itu terbaca,
    // jadi ia harus mengunduh SELURUH berkas dulu — dan sementara itu layarnya
    // beku di frame 0.
    //
    // Yang membuatnya layak dijaga otomatis adalah cara ia MENIPU: gejalanya
    // bergantung ukuran berkas dan kecepatan jaringan, jadi ia muncul-hilang
    // saat orang mengganti footage, dan terbaca sebagai "videonya yang salah"
    // alih-alih "encode-nya yang salah". Terjadi 5 Agu 2026, dan sempat
    // menghabiskan waktu mencari di tempat yang keliru.
    //
    // Struktur MP4 itu daftar atom berurutan: [4 byte panjang][4 byte tipe].
    // Cukup baca tipenya dari depan sampai ketemu moov atau mdat — yang mana
    // duluan. Tidak perlu ffprobe (memang tidak terpasang di mesin ini).
    const dir = join(REPO_ROOT, "public/screens");
    if (!existsSync(dir)) return;

    const offenders: string[] = [];
    for (const name of readdirSync(dir)) {
      if (!/\.mp4$/i.test(name)) continue;
      const buf = readFileSync(join(dir, name));

      let off = 0;
      let first = "";
      while (off + 8 <= buf.length) {
        const size = buf.readUInt32BE(off);
        const type = buf.toString("ascii", off + 4, off + 8);
        if (type === "moov" || type === "mdat") {
          first = type;
          break;
        }
        // Panjang 0/1 punya makna khusus (sampai akhir berkas / 64-bit).
        // Keduanya tidak dihasilkan libx264 untuk berkas sekecil ini;
        // berhenti saja daripada menebak dan salah menuduh.
        if (size < 8) break;
        off += size;
      }

      if (first !== "moov") offenders.push(name);
    }

    expect(
      offenders,
      `Berkas MP4 berikut menaruh atom moov SETELAH mdat. Browser harus ` +
        `mengunduh seluruh berkas sebelum bisa memutar, jadi layarnya beku di ` +
        `frame 0 — dan gejalanya muncul-hilang mengikuti ukuran berkas, ` +
        `sehingga mudah disalahartikan sebagai masalah pada videonya:\n\n` +
        offenders.map((f) => `  • public/screens/${f}`).join("\n") +
        `\n\nEncode ulang dengan -movflags +faststart. Resep lengkapnya ada ` +
        `di komentar entri MacBook di screens.ts.\n`,
    ).toEqual([]);
  });
});

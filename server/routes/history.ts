/**
 * Endpoint riwayat perubahan — satu-satunya jalan panel melihat `audit_log`.
 *
 * Hanya membaca. Tidak ada POST, PUT, maupun DELETE, dan itu disengaja: guna
 * catatan ini justru karena ia tidak bisa disunting dari panel yang sama
 * dengan yang dicatatnya. Kalau sebuah baris bisa dihapus lewat API ini,
 * pertanyaan "siapa yang menghapus lowongan itu" kembali tidak terjawab.
 *
 * Membatalkan perubahan yang belum terpublish memang mengubah apa yang TAMPIL
 * di sini, tapi tetap tidak melanggar aturan itu: ia menulis baris audit baru
 * (`routes/revert.ts`), tidak pernah menyunting atau menghapus baris yang
 * sudah ada.
 */

import { Hono } from "hono";
import {
  kelompokkanTertahan,
  type PeristiwaRiwayat,
  type PeristiwaTertahan,
} from "@shared/riwayat";

import {
  jenisRiwayat,
  riwayat,
  riwayatTertahan,
  sebagaiPeristiwa,
  MAKS_TERTAHAN,
  type Actor,
} from "../audit";

type Env = { Variables: { actor: Actor } };

/** Sepanjang satu layar penuh, bukan seluruh tabel: riwayat tumbuh terus dan
 *  tidak pernah dipangkas, jadi "ambil semua" adalah halaman yang makin lama
 *  makin lambat tanpa ada yang mengubah apa pun. */
const BAWAAN = 30;
const MAKS = 100;

/** Angka dari query string, dijepit. Apa pun yang bukan angka jatuh ke
 *  bawaannya alih-alih membuat `LIMIT NaN` yang gagal di Postgres. */
function angka(mentah: string | undefined, bawaan: number, maks: number): number {
  const n = Number.parseInt(mentah ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return bawaan;
  return Math.min(n, maks);
}

const historyRoute = new Hono<Env>();

/**
 * Perubahan yang belum terpublish, sudah dikelompokkan per benda.
 *
 * Ditaruh SEBELUM `/`? Tidak perlu — keduanya cocok persis, bukan pola. Tapi
 * ia memang harus tetap di atas kalau suatu hari ada `/:id` di berkas ini:
 * Hono mencocokkan sesuai urutan pendaftaran, dan "tertahan" akan tertangkap
 * sebagai sebuah id.
 */
historyRoute.get("/tertahan", async (c) => {
  const baris = await riwayatTertahan(MAKS_TERTAHAN + 1);
  const terpotong = baris.length > MAKS_TERTAHAN;

  const peristiwa: PeristiwaRiwayat[] = baris
    .slice(0, MAKS_TERTAHAN)
    .map(sebagaiPeristiwa);

  /* Dikelompokkan di server, bukan di browser, karena `kelompokkanTertahan`
     adalah aturan tentang APA yang menunggu tayang — sama derajatnya dengan
     `menunggu()` di `publish.ts` — dan aturan seperti itu tidak boleh punya
     dua tempat tinggal. Yang TIDAK dikerjakan di sini urutan tampilnya
     (`urutkanTertahan`): itu soal tata letak, dan peta halaman situs yang
     menentukannya memang tinggal di panel. */
  const tertahan: PeristiwaTertahan[] = kelompokkanTertahan(peristiwa);

  return c.json({ tertahan, terpotong });
});

historyRoute.get("/", async (c) => {
  const entitas = c.req.query("entitas")?.trim() || null;
  const limit = angka(c.req.query("limit"), BAWAAN, MAKS);
  const lewati = Math.max(
    0,
    Number.parseInt(c.req.query("lewati") ?? "", 10) || 0,
  );

  /* Diminta SATU lebih banyak dari yang akan dikirim. Itu yang menjawab "masih
     ada lagi di bawah?" tanpa query COUNT kedua atas tabel yang sama. */
  const baris = await riwayat({ entitas, limit: limit + 1, lewati });
  const adaLagi = baris.length > limit;

  const peristiwa: PeristiwaRiwayat[] = baris.slice(0, limit).map(sebagaiPeristiwa);

  return c.json({ riwayat: peristiwa, adaLagi, jenis: await jenisRiwayat() });
});

export default historyRoute;

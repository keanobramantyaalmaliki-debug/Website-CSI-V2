/**
 * Waktu sekarang menurut jam DATABASE, bukan jam proses Node.
 *
 * Kenapa ini perlu berkas sendiri: kolom `created_at`/`updated_at` punya
 * `default now()`, jadi nilai yang lahir saat INSERT selalu berasal dari jam
 * Postgres. Kalau UPDATE menuliskan `new Date()` (jam mesin yang menjalankan
 * server), dua jam yang berbeda ikut menentukan satu kolom yang sama.
 *
 * Selama Postgres menumpang mesin yang sama dengan server, dua jam itu
 * kebetulan satu benda dan tidak ada yang kelihatan salah. Begitu Postgres
 * pindah ke container/VM atau ke VPS, keduanya berjalan sendiri-sendiri dan
 * selisih beberapa milidetik sudah cukup untuk:
 *
 *   - badge "belum terpublish" tidak pernah padam, karena `unpublished`
 *     dihitung `updatedAt > publishedAt` dan dua sisinya beda jam;
 *   - `updated_at` terlihat MUNDUR sesudah sebuah suntingan.
 *
 * Aturannya jadi satu kalimat: setiap stempel waktu yang disimpan ke kolom
 * ber-`default now()` harus datang dari jam yang sama, yaitu jam Postgres.
 *
 * Catatan: di dalam satu transaksi `now()` mengembalikan waktu MULAI transaksi,
 * jadi semua baris yang disentuh satu transaksi memperoleh stempel yang persis
 * sama. Itu justru yang diinginkan saat mengubah urutan.
 */

import { sql } from "drizzle-orm";

export function dbNow() {
  return sql`now()`;
}

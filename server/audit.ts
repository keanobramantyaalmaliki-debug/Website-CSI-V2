/**
 * Catatan siapa mengubah apa.
 *
 * Semua akun punya kuasa yang sama (keputusan yang disepakati: satu peran),
 * jadi catatan inilah pengganti pembatasan hak akses. Kalau sebuah lowongan
 * hilang, pertanyaannya "siapa dan kapan", dan itu harus bisa dijawab tanpa
 * menebak.
 *
 * Mencatat TIDAK BOLEH menggagalkan aksinya. Simpan yang berhasil lalu gagal
 * mencatat = editor melihat error dan menyimpan ulang, padahal perubahannya
 * sudah masuk. Karena itu galat di sini ditelan dan hanya dilaporkan ke log
 * proses.
 */

import type { AksiRiwayat, PeristiwaRiwayat } from "@shared/riwayat";

import { db, sql } from "./db/client";
import { auditLog } from "./db/schema";

export type Actor = { id: string; name: string } | null;

/** Ditulis sebagai daftar, bukan union tipe saja: `shared/riwayat.ts` harus
 *  menyalinnya (berkas `shared/` tidak boleh menarik `server/` ke bundel
 *  browser), dan salinan cuma bisa dijaga kalau aslinya ada saat program
 *  jalan. `history.test.ts` yang membandingkan keduanya. */
export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "publish",
  "login",
  /** Pembatalan satu perubahan yang belum terpublish. Isinya dikembalikan ke
   *  keadaan yang tayang, dan `snapshot`-nya berisi hasil pemulihan itu —
   *  bukan keterangan tentang pembatalannya. Lihat `pemulih.ts`. */
  "revert",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export async function record(opts: {
  actor: Actor;
  entity: string;
  entityId?: string | null;
  action: AuditAction;
  snapshot?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: opts.actor?.id ?? null,
      userName: opts.actor?.name ?? null,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      action: opts.action,
      snapshot: (opts.snapshot ?? null) as never,
    });
  } catch (error) {
    console.error("[audit] gagal mencatat:", error);
  }
}

/**
 * Aksi yang dianggap "perubahan konten" — dipakai KETIGA query di bawah.
 *
 * Diangkat jadi satu konstanta, bukan diketik tiga kali: `riwayat()`,
 * `jenisRiwayat()`, dan `riwayatTertahan()` harus menyaring dengan aturan yang
 * sama persis, dan tiga salinan aturan yang sama adalah tiga tempat yang bisa
 * melenceng sendiri-sendiri.
 */
const AKSI_ISI = sql`action in ('create', 'update', 'delete')`;

/**
 * Buang baris draf yang sudah DIBATALKAN editor lewat layar Review.
 *
 * Daftar baris yang dibatalkan tidak disimpan di mana pun, dan tidak perlu
 * disimpan: yang dibatalkan sebuah `revert` adalah seluruh baris benda yang
 * sama, sejak Publish terakhir SEBELUM revert itu, sampai revert itu sendiri —
 * persis rentang yang dikelompokkan `kelompokkanTertahan` waktu tombolnya
 * ditekan. Menyimpannya sebagai daftar id berarti dua sumber kebenaran yang
 * bisa berselisih; menurunkannya berarti cuma ada satu.
 *
 * Barisnya disaring dari TAMPILAN saja, bukan dihapus dari tabel: catatan ini
 * gunanya justru karena ia tidak bisa disunting dari panel yang mencatatnya.
 * Baris `revert`-nya sendiri tidak perlu disebut di sini — ia sudah jatuh di
 * `AKSI_ISI`.
 *
 * Mensyaratkan alias tabelnya bernama `berjejak`, seperti di ketiga query.
 */
const TIDAK_DIBATALKAN = sql`
  and not exists (
    select 1 from audit_log r
    where r.action = 'revert'
      and r.entity = berjejak.entity
      and r.entity_id is not distinct from berjejak.entity_id
      and r.at > berjejak.at
      and berjejak.at > coalesce(
        (select max(p.at) from audit_log p
          where p.action = 'publish' and p.at < r.at),
        '-infinity'::timestamptz)
  )`;

/** Satu baris `audit_log`, plus isi SEBELUM yang diturunkan dari baris
 *  sebelumnya. Bentuk mentah dari database; `routes/history.ts` yang
 *  menerjemahkannya ke bentuk yang dikirim ke panel. */
export type BarisRiwayat = {
  id: string;
  user_name: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  snapshot: unknown;
  sebelum: unknown;
  /** ISO 8601 UTC, dibentuk Postgres. Kolomnya `timestamptz`, tapi driver ini
   *  mengembalikannya sebagai teks bergaya Postgres ("2026-09-03 12:19:07+08")
   *  yang penguraiannya di JavaScript tidak dijamin sama antar peramban.
   *  Dibentuk di SQL supaya yang sampai ke panel hanya satu bentuk. */
  pada: string;
};

/**
 * Riwayat perubahan konten yang SUDAH terpublish, terbaru di atas, lengkap
 * dengan isi SEBELUM tiap perubahan.
 *
 * Dua hal disaring di sini, dan keduanya keputusan produk, bukan penghematan:
 *
 * 1. Hanya `create`/`update`/`delete`. Masuk panel dan Publish tetap DICATAT
 *    (`record()` di bawah tidak berubah, dan tabelnya tetap bisa ditanya lewat
 *    psql saat ada yang perlu diusut), tapi keduanya bukan perubahan konten.
 *    Membiarkannya tampil berarti daftar tiga puluh baris habis oleh baris
 *    "Masuk" tiap kali seseorang membuka panel, dan perubahan yang benar-benar
 *    dicari terdorong ke halaman kedua.
 *
 * 2. Hanya yang tercatat sebelum Publish terakhir. Riwayat ini menjawab "apa
 *    yang berubah di situs", bukan "apa yang sedang dikerjakan di panel".
 *    Perubahan yang belum ditekan Publish belum sampai ke pengunjung, dan
 *    editor sudah punya penanda sendiri untuk itu (kolom "Terakhir diubah" dan
 *    bilah Publish). Begitu Publish ditekan, semua perubahan sejak Publish
 *    sebelumnya masuk ke sini sekaligus.
 *
 * Gerbangnya dibandingkan dengan waktu Publish TERAKHIR, bukan dengan mencari
 * "adakah publish sesudah baris ini": karena publish selalu bertambah maju,
 * kedua pertanyaan itu jawabannya sama, dan yang pertama cuma butuh satu
 * `max()` alih-alih subquery per baris. Kalau belum pernah ada Publish sama
 * sekali, `max()` bernilai NULL dan seluruh perbandingannya jadi NULL, jadi
 * riwayatnya kosong tanpa perlu cabang tersendiri.
 *
 * Isi sebelum TIDAK pernah disimpan, dan tidak perlu disimpan: isi sebelum
 * sebuah perubahan adalah `snapshot` baris audit sebelumnya untuk benda yang
 * sama. `lag()` itulah yang mengambilnya, dalam satu query yang sama — dan
 * karena diturunkan alih-alih dicatat, riwayat yang sudah menumpuk sejak awal
 * proyek ikut bisa dibandingkan, bukan cuma perubahan mulai hari ini.
 *
 * `lag()` sengaja dihitung atas SELURUH tabel, sebelum penyaringan apa pun.
 * Pembanding sebuah perubahan adalah keadaan sebelumnya, terpublish atau
 * tidak; menghitungnya hanya atas baris yang lolos saring berarti perubahan
 * yang tertahan menghilang dari rantai, dan perubahan sesudahnya akan
 * dibandingkan dengan keadaan dua langkah ke belakang.
 *
 * `partition by entity, entity_id` menganggap `entity_id` NULL sama dengan
 * NULL yang lain (aturan PARTITION BY, seperti GROUP BY). Itu yang membuat
 * visi dan footer — yang sengaja dicatat tanpa `entityId` karena id-nya bukan
 * uuid — tetap berantai dengan benar, bukan terpecah jadi baris-baris yatim.
 *
 * Ditulis SQL mentah, bukan query builder: `lag() over (…)` tidak punya
 * padanan di drizzle, dan menirunya dengan self-join berarti satu query per
 * baris.
 *
 * Pengurutannya memakai `at`, BUKAN `pada` hasil `to_char`. Teks ISO UTC
 * kebetulan berurut sama dengan timestamp-nya karena lebarnya tetap, tapi
 * mengandalkan kebetulan itu berarti urutan riwayat bergantung pada format
 * tanggal yang dipilih di baris sebelahnya.
 */
export async function riwayat(opts: {
  /** `null` = semua jenis konten. */
  entitas?: string | null;
  limit: number;
  lewati: number;
}): Promise<BarisRiwayat[]> {
  const saring = opts.entitas
    ? sql`and entity = ${opts.entitas}`
    : sql`and true`;

  return sql<BarisRiwayat[]>`
    with berjejak as (
      select
        id, user_name, entity, entity_id, action, snapshot, at,
        lag(snapshot) over (
          partition by entity, entity_id
          order by at, id
        ) as sebelum
      from audit_log
    )
    select
      id, user_name, entity, entity_id, action, snapshot, sebelum,
      to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as pada
    from berjejak
    where ${AKSI_ISI}
      and at <= (select max(at) from audit_log where action = 'publish')
      ${TIDAK_DIBATALKAN}
      ${saring}
    order by at desc, id desc
    limit ${opts.limit}
    offset ${opts.lewati}
  `;
}

/**
 * Jenis konten yang BENAR-BENAR muncul di riwayat.
 *
 * Dipakai mengisi penyaring di panel. Diambil dari database dan bukan dari
 * `LABEL_ENTITAS` supaya penyaringnya tidak menawarkan pilihan yang pasti
 * kosong — daftar pilihan yang separuhnya tidak menghasilkan apa-apa membuat
 * editor mengira riwayatnya yang hilang. Karena itu pula saringnya harus sama
 * persis dengan `riwayat()` di atas: penyaring yang menawarkan "Masuk panel"
 * lalu memberi daftar kosong adalah bentuk lain dari kesalahan yang sama.
 */
export async function jenisRiwayat(): Promise<string[]> {
  const baris = await sql<{ entity: string }[]>`
    select distinct entity
    from audit_log as berjejak
    where ${AKSI_ISI}
      and at <= (select max(at) from audit_log where action = 'publish')
      ${TIDAK_DIBATALKAN}
    order by entity
  `;
  return baris.map((b) => b.entity);
}

/**
 * Kebalikan `riwayat()`: perubahan yang tercatat SESUDAH Publish terakhir —
 * yang belum dilihat pengunjung sama sekali.
 *
 * Gerbangnya dibalik, sisanya sengaja sama persis (aksi yang sama, `lag()`
 * atas tabel penuh yang sama, urutan yang sama). Dua query dengan aturan yang
 * berbeda-beda sendiri akan pelan-pelan melenceng, dan yang melenceng di sini
 * berarti sebuah perubahan bisa hilang dari KEDUANYA: tidak tampil di Review
 * karena dianggap sudah tayang, tidak tampil di Riwayat karena dianggap belum.
 *
 * `is null` disebut eksplisit, tidak seperti di `riwayat()`: kalau belum
 * pernah ada Publish sama sekali, `max()` bernilai NULL dan `at > NULL` juga
 * NULL — sehingga tanpa cabang ini layar Review justru KOSONG persis pada
 * keadaan di mana segalanya masih menunggu.
 *
 * `image` dibuang. Mengunggah berkas memang tercatat, tapi gambar yang belum
 * dipasang di mana pun tidak akan berubah apa-apa di situs saat Publish
 * ditekan — dan angka di bar publish pun tidak menghitungnya. Yang berubah
 * adalah baris yang MEMAKAI gambar itu, dan baris itu punya catatannya
 * sendiri.
 */
export async function riwayatTertahan(limit: number): Promise<BarisRiwayat[]> {
  return sql<BarisRiwayat[]>`
    with berjejak as (
      select
        id, user_name, entity, entity_id, action, snapshot, at,
        lag(snapshot) over (
          partition by entity, entity_id
          order by at, id
        ) as sebelum
      from audit_log
    )
    select
      id, user_name, entity, entity_id, action, snapshot, sebelum,
      to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as pada
    from berjejak
    where ${AKSI_ISI}
      and entity <> 'image'
      ${TIDAK_DIBATALKAN}
      and (
        (select max(at) from audit_log where action = 'publish') is null
        or at > (select max(at) from audit_log where action = 'publish')
      )
    order by at desc, id desc
    limit ${limit}
  `;
}

/**
 * Sebanyak-banyaknya peristiwa tertahan yang diambil sekali jalan.
 *
 * Jauh lebih longgar dari halaman riwayat, dan memang harus: daftar tertahan
 * TIDAK berhalaman, karena gunanya justru melihat semuanya sekaligus sebelum
 * menekan Publish. Batasnya ada semata supaya keadaan yang tidak wajar —
 * ratusan penyimpanan tanpa satu pun Publish di antaranya — tidak berubah jadi
 * satu halaman yang menggantung. Kalau kena, panel mengatakannya (`terpotong`)
 * alih-alih diam-diam memotong daftar.
 *
 * Tinggal di sini, bukan di `routes/history.ts`, karena pembatalan perubahan
 * (`pemulih.ts`) membaca daftar yang sama untuk tahu apa yang sedang tertahan.
 * Dua batas berbeda berarti tombol Batal bisa memandang benda yang tidak ada
 * di layar Review, atau sebaliknya.
 */
export const MAKS_TERTAHAN = 500;

/** Baris mentah `audit_log` → bentuk yang dikenal `shared/riwayat.ts`. Satu
 *  fungsi, dipakai tiga pemanggil: dua handler di `routes/history.ts` dan
 *  pembatalan. Penerjemahan yang disalin adalah penerjemahan yang suatu hari
 *  berbeda di salah satu salinannya. */
export function sebagaiPeristiwa(b: BarisRiwayat): PeristiwaRiwayat {
  return {
    id: b.id,
    pada: b.pada,
    siapa: b.user_name,
    entitas: b.entity,
    entitasId: b.entity_id,
    /* Dipaksa ke `AksiRiwayat` tanpa diperiksa: kolomnya `text` di database,
       tapi satu-satunya yang menulis ke sana adalah `record()`, yang argumennya
       sudah bertipe. Nilai di luar daftar berarti ada yang menulis langsung
       lewat psql, dan panel menampilkannya apa adanya. */
    aksi: b.action as AksiRiwayat,
    sesudah: b.snapshot ?? null,
    sebelum: b.sebelum ?? null,
  };
}

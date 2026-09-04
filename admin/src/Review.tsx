/**
 * Review: semua perubahan yang sudah disimpan tapi belum ditekan Publish, di
 * satu layar.
 *
 * Alasannya satu, dan datang dari pemakaian sungguhan: sebelum layar ini,
 * satu-satunya isyarat bahwa ada yang menunggu tayang adalah ANGKA di bar
 * publish. Angka itu memberi tahu bahwa ada tiga perubahan, tapi tidak
 * memberi tahu tiga perubahan apa — jadi orang yang mau memastikan sebelum
 * menayangkan harus membuka dua belas layar entitas satu per satu dan
 * membandingkan tanda "belum terpublish" di kolom "Terakhir diubah". Itu
 * pekerjaan yang panjangnya tidak ada hubungannya dengan berapa yang berubah.
 *
 * Kembarannya layar Riwayat, dengan gerbang yang dibalik: Riwayat menjawab
 * "apa yang SUDAH berubah di situs", layar ini "apa yang AKAN berubah kalau
 * Publish ditekan sekarang". Keduanya membaca `audit_log` yang sama dan
 * memakai tabel perbandingan yang sama (`Banding.tsx`).
 *
 * Satu baris di sini = satu BENDA, bukan satu penyimpanan. Lowongan yang
 * disunting tiga kali sejak Publish terakhir muncul sekali, dengan
 * perbandingan dari keadaan terakhir yang tayang ke keadaan sekarang —
 * karena itulah yang akan dilihat pengunjung. Pengelompokannya dikerjakan
 * server (`kelompokkanTertahan`).
 *
 * Dua tindakan ditawarkan per baris, dan keduanya menjawab pertanyaan yang
 * sama, "yang ini tidak jadi":
 *
 *   Buka      — ke form aslinya, untuk memperbaikinya sendiri. Memperbaiki
 *               sesuatu yang baru ketahuan saat ditinjau adalah alasan orang
 *               membuka layar ini, dan menyuruhnya mencari sendiri lokasinya
 *               mengembalikan persis kerepotan yang mau dihapus.
 *   Batalkan  — kembalikan satu benda ini ke keadaan yang SEKARANG tayang.
 *               Per baris, tidak pernah sekaligus: yang salah biasanya satu
 *               di antara sepuluh yang benar, dan tombol "batalkan semua"
 *               memaksa mengetik ulang sembilan sisanya.
 *
 * Tidak ada tombol Simpan maupun Hapus, sama seperti Riwayat. Membatalkan
 * memang MENULIS ke tabel konten, tapi yang ditulisnya bukan isi yang diketik
 * di layar ini — isinya diambil server dari catatan keadaan terakhir yang
 * tayang (`server/pemulih.ts`).
 */

import { useCallback, useEffect, useState } from "react";

import { ambilTertahan, batalkanPerubahan } from "./api";
import { TabelBanding } from "./Banding";
import { CONTENT_GROUPS } from "@shared/contentMap";
import {
  bandingkan,
  barisUrutan,
  namaEntitas,
  urutkanTertahan,
  LABEL_AKSI,
  RUTE_ENTITAS,
  type BarisBanding,
  type PeristiwaTertahan,
} from "@shared/riwayat";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/** Urutan tampil: urutan halaman di situs, diambil dari peta konten yang sama
 *  dengan yang menyusun menu sisi dan beranda. Bukan disalin — daftar kedua
 *  yang harus ikut diperbarui saat entitas berikutnya lahir adalah daftar yang
 *  suatu hari tidak ikut diperbarui. */
const URUTAN_HALAMAN = CONTENT_GROUPS.flatMap((g) => g.entries.map((e) => e.key));

export function Review({
  pending,
  onBuka,
  onSegarkan,
}: {
  pending: number;
  /** Ke layar tempat benda ini disunting. `null` id berarti layar daftarnya —
   *  itu yang benar untuk urutan panel, visi, kaki halaman, dan benda yang
   *  sudah telanjur dihapus. */
  onBuka: (rute: string, id: string | null) => void;
  /**
   * Muat ulang seluruh isi panel di `App.tsx` sesudah sebuah pembatalan.
   *
   * Dipanggil eksplisit, TIDAK diserahkan pada `pending` yang kebetulan
   * berubah: yang ikut basi bukan cuma angka di bilah, tapi juga daftar nilai,
   * daftar lowongan, dan seterusnya — benda yang barusan dikembalikan harus
   * muncul lagi di sana. Mengandalkan satu angka untuk menyegarkan dua belas
   * daftar adalah perilaku benar yang berdiri di atas kebetulan.
   */
  onSegarkan: () => void;
}) {
  const [daftar, setDaftar] = useState<PeristiwaTertahan[]>([]);
  const [terpotong, setTerpotong] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [akanDibatalkan, setAkanDibatalkan] = useState<PeristiwaTertahan | null>(
    null,
  );
  const [membatalkan, setMembatalkan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    const hasil = await ambilTertahan();
    setMemuat(false);

    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }

    setGalat(null);
    setDaftar(urutkanTertahan(hasil.data.tertahan, URUTAN_HALAMAN));
    setTerpotong(hasil.data.terpotong);
  }, []);

  /* `pending` jadi pemicu, persis seperti di Riwayat: bar publish menempel di
     bawah SEMUA layar termasuk yang ini, dan menekannya dari sini
     mengosongkan seluruh daftar. Tanpa pemicu ini layar Review tetap
     memperlihatkan daftar perubahan yang barusan tayang, seolah Publish tidak
     terjadi. Angkanya turun ke nol tiap Publish selesai, jadi ia penanda yang
     sudah ada. */
  useEffect(() => {
    setTerbuka(null);
    void muat();
  }, [pending, muat]);

  async function batalkan(p: PeristiwaTertahan) {
    setMembatalkan(true);
    const hasil = await batalkanPerubahan(p.entitas, p.entitasId);
    setMembatalkan(false);

    if (!hasil.ok) {
      /* Dialognya ditutup dan galatnya ditaruh di atas daftar, bukan di dalam
         dialog: penolakannya hampir selalu tentang BARIS LAIN ("judulnya sudah
         dipakai sektor lain sekarang"), dan yang harus dilihat orang untuk
         mengerjakannya justru daftar di belakang dialog itu. */
      setAkanDibatalkan(null);
      setPesan(null);
      setGalat(hasil.pesan);
      return;
    }

    setAkanDibatalkan(null);
    setGalat(null);
    setPesan(kabarBerhasil(hasil.data.aksi, hasil.data.judul));
    setTerbuka(null);
    await muat();
    /* Sesudah daftar di layar ini, bukan sebelum: kalau pemuatan ulang gagal,
       yang terlihat galatnya, bukan angka bilah yang turun tanpa penjelasan. */
    onSegarkan();
  }

  return (
    <>
      <h2 style={{ margin: 0 }}>Review</h2>

      <p className="petunjuk" style={{ marginTop: 8 }}>
        Perubahan yang sudah disimpan tapi belum terpublish, semuanya di sini.
        Inilah yang akan berubah di situs begitu Publish ditekan. Klik satu
        baris untuk melihat isinya sebelum dan sesudah diubah.
      </p>

      {galat ? <Kabar tegas anak={galat} /> : null}
      {pesan ? <Kabar anak={pesan} /> : null}

      {terpotong ? (
        <Kabar
          tegas
          anak="Perubahan yang menunggu terlalu banyak untuk ditampilkan sekaligus. Yang tampil di bawah yang terbaru; sisanya muncul sesudah Publish ditekan."
        />
      ) : null}

      {/* Tabelnya digambar hanya kalau ada isinya, alasan sama seperti di
          Riwayat: kepala kolom tanpa satu pun baris terbaca sebagai "memang
          tidak ada", padahal isinya belum tiba. */}
      {daftar.length === 0 ? (
        memuat ? null : (
          <p className="kosong">
            Tidak ada perubahan yang menunggu. Semua yang tersimpan sudah
            terpublish.
          </p>
        )
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>Konten</th>
              <th>Yang berubah</th>
              <th style={{ width: 220 }}>Yang terjadi</th>
              <th style={{ width: 150 }}>Terakhir diubah</th>
              <th style={{ width: 120 }}>Siapa</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((p) => (
              <BarisTertahan
                key={p.key}
                peristiwa={p}
                buka={terbuka === p.key}
                onKlik={() => setTerbuka((t) => (t === p.key ? null : p.key))}
                onBuka={onBuka}
                onBatal={() => {
                  setPesan(null);
                  setGalat(null);
                  setAkanDibatalkan(p);
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      {memuat ? <p className="petunjuk">Memuat…</p> : null}

      {akanDibatalkan ? (
        <Konfirmasi
          judul={JUDUL_BATAL[akanDibatalkan.aksi] ?? "Batalkan perubahan?"}
          isi={<IsiBatal peristiwa={akanDibatalkan} />}
          /* Bukan "Ya, batalkan": tombol di sebelahnya juga berbunyi "Batal",
             dan dua tombol yang sama-sama berkata "batal" di satu dialog
             adalah pilihan yang harus dibaca dua kali. Yang dipakai di sini
             kata kerja dari akibatnya. */
          tombolYa={TOMBOL_BATAL[akanDibatalkan.aksi] ?? "Ya, kembalikan"}
          sedangJalan={membatalkan}
          onYa={() => void batalkan(akanDibatalkan)}
          onBatal={() => (membatalkan ? undefined : setAkanDibatalkan(null))}
        />
      ) : null}
    </>
  );
}

/* ── kalimat dialog ───────────────────────────────────────────────────── */

/**
 * Judul, tombol, dan isi dialognya berbeda per aksi, dan bedanya bukan gaya
 * bahasa: ketiganya berakibat lain. Membatalkan yang baru DIBUAT membuangnya;
 * membatalkan SUNTINGAN membuang ketikan yang belum tayang; membatalkan
 * PENGHAPUSAN justru mengembalikan sesuatu. Satu kalimat untuk ketiganya
 * berarti dua di antaranya dijawab "ya" oleh orang yang mengira sedang
 * melakukan hal yang lain.
 */
const JUDUL_BATAL: Partial<Record<PeristiwaTertahan["aksi"], string>> = {
  create: "Batalkan pembuatan?",
  update: "Batalkan suntingan?",
  delete: "Batalkan penghapusan?",
};

const TOMBOL_BATAL: Partial<Record<PeristiwaTertahan["aksi"], string>> = {
  create: "Ya, hapus",
  update: "Ya, kembalikan",
  delete: "Ya, kembalikan",
};

function IsiBatal({ peristiwa }: { peristiwa: PeristiwaTertahan }) {
  const nama = <strong>“{peristiwa.judul}”</strong>;
  const jenis = namaEntitas(peristiwa.entitas).toLowerCase();

  if (peristiwa.aksi === "create") {
    return (
      <p>
        {nama} akan dihapus. Ia memang belum pernah tayang, jadi tidak ada yang
        berubah di situs — tapi isinya yang belum sempat terpublish akan hilang
        dan tidak bisa dikembalikan lewat panel ini.
      </p>
    );
  }

  if (peristiwa.aksi === "delete") {
    return (
      <p>
        {nama} dikembalikan ke daftar {jenis}. Isinya sama dengan yang sekarang
        masih tayang di situs, karena penghapusannya memang belum terpublish.
      </p>
    );
  }

  return (
    <p>
      Isi {nama} dikembalikan ke yang sekarang tayang di situs. Suntingan yang
      belum terpublish akan hilang dan tidak bisa dikembalikan lewat panel ini.
    </p>
  );
}

/** Kalimat sesudah berhasil. Menyebut apa yang terjadi pada BENDANYA, bukan
 *  "berhasil dibatalkan": yang perlu diyakinkan orang adalah keadaan sekarang,
 *  bukan bahwa tombolnya bekerja. */
function kabarBerhasil(aksi: string, judul: string): string {
  if (aksi === "create") return `“${judul}” dihapus. Ia belum pernah tayang.`;
  if (aksi === "delete") return `“${judul}” dikembalikan ke daftar.`;
  return `Isi “${judul}” dikembalikan ke yang sekarang tayang.`;
}

/**
 * Kalimat pendek di sebelah penanda aksi.
 *
 * Sengaja berbeda dari kalimat sejenis di Riwayat, walau bentuknya sama:
 * yang di sana bercerita tentang sesuatu yang sudah terjadi, yang di sini
 * tentang sesuatu yang belum. "isi terakhirnya masih bisa dilihat" benar untuk
 * penghapusan yang sudah tayang; untuk yang belum, yang perlu diketahui editor
 * justru bahwa isinya MASIH terlihat pengunjung sampai Publish ditekan.
 */
function ringkasan(p: PeristiwaTertahan, banding: BarisBanding[]): string {
  const kali = p.kali > 1 ? `, disimpan ${p.kali} kali` : "";

  if (p.aksi === "delete") return `masih tayang sampai Publish${kali}`;
  if (p.aksi === "create") return `belum pernah tayang${kali}`;
  if (banding.length === 0) return `tanpa perubahan isian${kali}`;
  /* Satu isian disebut namanya. "1 isian" memaksa barisnya dibuka untuk
     mengetahui hal yang muat ditulis di tempatnya berdiri. */
  return (
    (banding.length === 1
      ? banding[0].label.toLowerCase()
      : `${banding.length} isian`) + kali
  );
}

function BarisTertahan({
  peristiwa,
  buka,
  onKlik,
  onBuka,
  onBatal,
}: {
  peristiwa: PeristiwaTertahan;
  buka: boolean;
  onKlik: () => void;
  onBuka: (rute: string, id: string | null) => void;
  onBatal: () => void;
}) {
  const aksi = LABEL_AKSI[peristiwa.aksi] ?? peristiwa.aksi;
  const dihapus = peristiwa.aksi === "delete";

  const banding = bandingkan(peristiwa.sebelum, peristiwa.sesudah);

  /* Benda dari jenis yang tidak punya layar di panel tidak diberi tombol
     "Buka" — tombol yang mendarat di beranda lebih buruk daripada tidak ada
     tombol, karena yang menekannya akan mengira dia salah baca barisnya. */
  const rute = RUTE_ENTITAS[peristiwa.entitas];

  /* Baris urutan tidak dapat tombol Batalkan, dan itu bukan pekerjaan yang
     belum sempat: yang tersimpan di catatannya cuma daftar JUDUL, bukan id,
     jadi urutan lamanya tidak bisa disusun kembali tanpa menebak — dan
     tebakan yang meleset menyusun ulang halaman yang sedang tayang tanpa ada
     yang memintanya. Server memakai pemeriksaan yang sama (`pemulih.ts`), jadi
     tombol yang disembunyikan di sini dan permintaan yang ditolak di sana
     bicara tentang hal yang persis sama. */
  const urutan = barisUrutan(peristiwa);

  return (
    <>
      <tr>
        <td>{namaEntitas(peristiwa.entitas)}</td>
        <td>{peristiwa.judul}</td>
        <td>
          <span className={`penanda${dihapus ? "" : " tegas"}`}>{aksi}</span>{" "}
          <span className="petunjuk" style={{ display: "inline" }}>
            {ringkasan(peristiwa, banding)}
          </span>
        </td>
        <td>{tanggal(peristiwa.pada)}</td>
        {/* Nama pelaku disalin ke baris audit saat kejadian, jadi ia tetap
            terbaca walau akunnya sudah dihapus. */}
        <td>{peristiwa.siapa || "—"}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <button
            type="button"
            className="kecil"
            aria-expanded={buka}
            onClick={onKlik}
          >
            {buka ? "Tutup" : "Lihat"}
          </button>{" "}
          {rute ? (
            <button
              type="button"
              className="kecil"
              /* Yang sudah dihapus tidak punya form lagi, jadi yang dituju
                 daftarnya. Begitu pula benda tanpa id: baris audit untuk
                 urutan panel mencatat seluruh daftar sekaligus, bukan satu
                 anggotanya. */
              onClick={() => onBuka(rute, dihapus ? null : peristiwa.entitasId)}
            >
              Buka
            </button>
          ) : null}{" "}
          {urutan ? (
            <span className="petunjuk" style={{ display: "inline" }}>
              susun ulang untuk membatalkan
            </span>
          ) : (
            <button type="button" className="kecil" onClick={onBatal}>
              Batalkan
            </button>
          )}
        </td>
      </tr>

      {buka ? (
        <tr className="riwayat-isi">
          <td colSpan={6}>
            <TabelBanding
              banding={banding}
              kosong="Isinya sama dengan yang sudah tayang. Yang berubah mungkin cuma urutannya."
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

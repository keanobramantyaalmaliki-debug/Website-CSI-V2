/**
 * Riwayat perubahan konten yang sudah terpublish: apa yang berubah, siapa yang
 * mengubah, kapan.
 *
 * Yang TIDAK masuk ke sini: masuk panel, Publish itu sendiri, dan perubahan
 * yang belum ditekan Publish. Penyaringnya dikerjakan di server (`riwayat()`
 * di `server/audit.ts`, lengkap dengan alasannya), jadi layar ini menampilkan
 * apa adanya yang datang dan tidak menyaring apa pun lagi sendiri.
 *
 * Layar ini tidak punya tombol simpan, tambah, maupun hapus, dan tidak akan
 * pernah punya. Yang ditampilkan adalah catatan tentang apa yang sudah
 * terjadi; catatan yang bisa disunting dari panel yang sama dengan yang
 * mencatatnya berhenti bisa dipakai untuk menjawab "kok isinya berubah, siapa
 * yang mengubah".
 *
 * Perbandingannya disembunyikan sampai barisnya dibuka. Satu perubahan
 * lowongan bisa menyentuh belasan isian, dan membuka semuanya sekaligus
 * membuat daftar tiga puluh baris jadi gulungan sepanjang beberapa layar —
 * padahal pertanyaan pertama yang dibawa orang ke sini hampir selalu "kapan
 * terakhir ada yang menyentuh ini", bukan isi lengkapnya.
 */

import { useCallback, useEffect, useState } from "react";

import { ambilRiwayat } from "./api";
import { TabelBanding } from "./Banding";
import {
  bandingkan,
  namaEntitas,
  LABEL_AKSI,
  type BarisBanding,
  type PeristiwaRiwayat,
} from "@shared/riwayat";
import { Kabar, tanggal } from "./ui";

/** Sebanyak yang diambil sekali muat, dan sebanyak yang ditambahkan tiap kali
 *  "Muat lebih banyak" ditekan. */
const SEKALI_MUAT = 30;

export function Riwayat({ pending }: { pending: number }) {
  const [baris, setBaris] = useState<PeristiwaRiwayat[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [saring, setSaring] = useState<string>("");
  const [adaLagi, setAdaLagi] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [terbuka, setTerbuka] = useState<string | null>(null);

  /**
   * Ambil satu halaman riwayat.
   *
   * `lewati` dihitung dari panjang daftar yang SUDAH ada, bukan dari nomor
   * halaman: penyaringnya bisa berganti di tengah jalan, dan nomor halaman
   * yang tertinggal dari penyaring sebelumnya akan melewati baris yang justru
   * baru saja diminta.
   */
  const muat = useCallback(
    async (entitas: string, lewati: number) => {
      setMemuat(true);
      const hasil = await ambilRiwayat({
        entitas: entitas || null,
        limit: SEKALI_MUAT,
        lewati,
      });
      setMemuat(false);

      if (!hasil.ok) {
        setGalat(hasil.pesan);
        return;
      }

      setGalat(null);
      setJenis(hasil.data.jenis);
      setAdaLagi(hasil.data.adaLagi);
      setBaris((lama) =>
        lewati === 0 ? hasil.data.riwayat : [...lama, ...hasil.data.riwayat],
      );
    },
    [],
  );

  /* Ganti penyaring = mulai dari halaman pertama lagi, dan baris yang sedang
     terbuka ikut ditutup: id yang terbuka besar kemungkinan tidak ada lagi di
     daftar yang baru.

     `pending` ikut jadi pemicu karena bilah Publish menempel di bawah SEMUA
     layar, termasuk layar ini. Menekannya dari sini mengubah isi riwayat —
     semua perubahan yang tertahan sekaligus masuk — dan tanpa pemicu ini
     daftarnya tetap memperlihatkan keadaan sebelum Publish sampai layarnya
     ditinggalkan dan dibuka lagi. Angkanya turun ke nol tiap kali Publish
     selesai, jadi ia penanda yang sudah ada, bukan yang perlu dibuat. */
  useEffect(() => {
    setTerbuka(null);
    void muat(saring, 0);
  }, [saring, pending, muat]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>Riwayat</h2>

        <label className="riwayat-saring">
          <span>Jenis konten</span>
          <select value={saring} onChange={(e) => setSaring(e.target.value)}>
            <option value="">Semua</option>
            {jenis.map((j) => (
              <option key={j} value={j}>
                {namaEntitas(j)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="petunjuk" style={{ marginTop: 8 }}>
        Perubahan konten yang sudah terpublish ke situs, terbaru di atas. Klik
        satu baris untuk melihat isinya sebelum dan sesudah diubah. Perubahan
        yang belum ditekan Publish belum muncul di sini.
      </p>

      {galat ? <Kabar tegas anak={galat} /> : null}

      {/* Tabelnya digambar hanya kalau benar-benar ada isinya. Menggambar
          kepala kolom lebih dulu selagi memuat memberi layar berisi kepala
          tabel dan tidak satu pun baris, yang terbaca sebagai "riwayatnya
          memang kosong" sampai isinya tiba. */}
      {baris.length === 0 ? (
        memuat ? null : (
          <p className="kosong">
            {saring
              ? "Belum ada perubahan terpublish untuk jenis konten ini."
              : "Belum ada perubahan yang terpublish. Perubahan akan muncul di sini sesudah Publish ditekan."}
          </p>
        )
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Waktu</th>
              <th style={{ width: 140 }}>Siapa</th>
              <th style={{ width: 140 }}>Konten</th>
              <th>Yang terjadi</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {baris.map((p) => (
              <BarisRiwayat
                key={p.id}
                peristiwa={p}
                buka={terbuka === p.id}
                onKlik={() => setTerbuka((t) => (t === p.id ? null : p.id))}
              />
            ))}
          </tbody>
        </table>
      )}

      {memuat ? <p className="petunjuk">Memuat…</p> : null}

      {adaLagi && !memuat ? (
        <button
          type="button"
          style={{ marginTop: 16 }}
          onClick={() => void muat(saring, baris.length)}
        >
          Muat lebih banyak
        </button>
      ) : null}
    </>
  );
}

/** Kalimat pendek di sebelah penanda aksi: apa yang tersentuh, tanpa perlu
 *  membuka barisnya. */
function ringkasan(aksi: PeristiwaRiwayat["aksi"], banding: BarisBanding[]): string {
  if (aksi === "delete") return "isi terakhirnya masih bisa dilihat";
  if (banding.length === 0) return "tanpa perubahan isian";
  /* Satu isian disebut namanya. Menyebut "1 isian" memaksa barisnya dibuka
     untuk mengetahui hal yang muat ditulis di tempatnya berdiri. */
  return banding.length === 1
    ? banding[0].label.toLowerCase()
    : `${banding.length} isian`;
}

function BarisRiwayat({
  peristiwa,
  buka,
  onKlik,
}: {
  peristiwa: PeristiwaRiwayat;
  buka: boolean;
  onKlik: () => void;
}) {
  const aksi = LABEL_AKSI[peristiwa.aksi] ?? peristiwa.aksi;
  const dihapus = peristiwa.aksi === "delete";

  /* Penghapusan dibandingkan dengan KETIADAAN, bukan dengan baris audit
     sebelumnya. Yang tersimpan di baris hapus adalah isi terakhir benda itu,
     dan isi itu sama persis dengan yang tercatat di baris sebelumnya — jadi
     selisih keduanya kosong, dan barisnya akan terbuka menampilkan "tidak ada
     yang berubah" untuk sebuah penghapusan. Yang ingin dilihat orang di sini
     justru isi lengkap yang barusan hilang, karena tidak ada daftar mana pun
     yang masih bisa ditanyai. */
  const banding = dihapus
    ? bandingkan(peristiwa.sesudah, null)
    : bandingkan(peristiwa.sebelum, peristiwa.sesudah);

  return (
    <>
      <tr>
        <td>{tanggal(peristiwa.pada)}</td>
        {/* Nama pelaku disalin ke baris audit saat kejadian, jadi ia tetap
            terbaca walau akunnya sudah dihapus. Yang `null` cuma baris yang
            lebih tua dari kolom namanya. */}
        <td>{peristiwa.siapa || "—"}</td>
        <td>{namaEntitas(peristiwa.entitas)}</td>
        <td>
          <span className={`penanda${dihapus ? "" : " tegas"}`}>{aksi}</span>{" "}
          <span className="petunjuk" style={{ display: "inline" }}>
            {ringkasan(peristiwa.aksi, banding)}
          </span>
        </td>
        <td style={{ textAlign: "right" }}>
          <button
            type="button"
            className="kecil"
            aria-expanded={buka}
            onClick={onKlik}
          >
            {buka ? "Tutup" : "Lihat"}
          </button>
        </td>
      </tr>

      {buka ? (
        <tr className="riwayat-isi">
          <td colSpan={5}>
            <TabelBanding
              banding={banding}
              kosong="Tidak ada isian yang berubah di perubahan ini."
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

/**
 * Daftar testimoni klien (Services → kutipan di dasar halaman).
 *
 * Bentuknya menyalin `DaftarNilai.tsx`, termasuk "Naikkan"/"Turunkan", karena
 * urutan barisnya juga bukan sekadar urutan tabel. Bedanya lebih langsung
 * ketimbang di nilai: baris PERTAMA di sini adalah kutipan yang terlihat saat
 * halaman Services dibuka. Sisanya baru muncul kalau pengunjung menekan panah,
 * dan sebagian besar pengunjung tidak pernah menekannya.
 */

import { useState } from "react";

import { hapusTestimoni, urutkanTestimoni, type TestimonialRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti daftar yang lain: nama status memakai nilai yang tersimpan di
   database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya
   arti lain di panel ini (sudah sampai ke pengunjung atau belum). Sebuah
   testimoni bisa saja Live TAPI belum tayang. */
const NAMA_STATUS: Record<TestimonialRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

/** Kutipan bisa panjang; di tabel yang dibutuhkan cuma pengenalnya. */
function cuplik(teks: string, batas = 70): string {
  const bersih = teks.trim();
  if (!bersih) return "—";
  return bersih.length <= batas ? bersih : `${bersih.slice(0, batas - 1)}…`;
}

export function DaftarTestimoni({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: TestimonialRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<TestimonialRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(testimoni: TestimonialRecord) {
    setMenghapus(true);
    const hasil = await hapusTestimoni(testimoni.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `Testimoni "${hasil.data.deleted}" dihapus. Kutipannya baru hilang dari situs setelah kamu menekan Publish.`,
    );
  }

  /**
   * Tukar posisi satu baris dengan tetangganya.
   *
   * Yang dikirim ke server adalah SELURUH daftar id dalam urutan barunya, bukan
   * "pindahkan yang ini ke atas": perintah relatif dijalankan terhadap urutan
   * yang mungkin sudah bukan urutan yang sedang dilihat — kalau ada orang kedua
   * yang ikut mengedit, hasilnya bukan urutan yang dimaksud siapa pun.
   */
  async function pindah(index: number, arah: -1 | 1) {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= daftar.length) return;

    const ids = daftar.map((t) => t.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanTestimoni(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan kutipan diubah. Belum terlihat pengunjung sampai kamu menekan Publish.",
    );
  }

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
        <h2 style={{ margin: 0 }}>Testimoni</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah testimoni
        </button>
      </div>

      {/* Keterangan urutan ditulis di sini, bukan diserahkan ke tombolnya.
          Tanpa kalimat ini "Naikkan" terbaca sebagai urutan daftar admin saja,
          dan tidak ada yang menduga bahwa baris teratas adalah satu-satunya
          kutipan yang dilihat kebanyakan pengunjung. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Baris paling atas = kutipan yang langsung terlihat saat halaman Services
        dibuka. Sisanya baru muncul kalau pengunjung menekan panah kiri-kanan.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada testimoni. Tekan “Tambah testimoni” untuk membuat yang
          pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nama</th>
              <th>Kutipan</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((testimoni, index) => (
              <tr
                key={testimoni.id}
                className={testimoni.state === "draft" ? "draf" : ""}
              >
                <td>{index + 1}</td>
                <td>
                  <strong>{testimoni.name}</strong>
                  <div className="petunjuk">{testimoni.role || "—"}</div>
                </td>
                <td>{cuplik(testimoni.quote)}</td>
                <td>
                  <span
                    className={`penanda${testimoni.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[testimoni.state]}
                  </span>
                  {testimoni.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(testimoni.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${testimoni.name}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${testimoni.name}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(testimoni.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(testimoni)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {akanDihapus ? (
        <Konfirmasi
          judul="Hapus testimoni?"
          isi={
            <p>
              Kutipan dari <strong>{akanDihapus.name}</strong> akan dihapus dari
              halaman Services. Isinya tetap tersimpan di database dan bisa
              dikembalikan oleh developer kalau ternyata keliru, tapi tidak
              lewat panel ini.
            </p>
          }
          tombolYa="Ya, hapus"
          sedangJalan={menghapus}
          onYa={() => void hapus(akanDihapus)}
          onBatal={() => (menghapus ? undefined : setAkanDihapus(null))}
        />
      ) : null}
    </>
  );
}

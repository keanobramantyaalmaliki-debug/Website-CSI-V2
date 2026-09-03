/**
 * Daftar layanan (Services → sabuk teks yang berputar di tengah halaman).
 *
 * Bentuknya menyalin `DaftarTestimoni.tsx`, termasuk "Naikkan"/"Turunkan".
 * Urutannya nyata di dua tempat sekaligus, dan keduanya tidak kelihatan dari
 * tabel ini: ia menentukan urutan judul di sabuk 3D, DAN urutan kalimat yang
 * dibacakan pembaca layar — daftar `sr-only` di bawah sabuk itulah satu-satunya
 * bentuk halaman Services yang sampai ke pembaca layar dan mesin pencari.
 */

import { useState } from "react";

import { hapusLayanan, urutkanLayanan, type ServiceRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti daftar yang lain: nama status memakai nilai yang tersimpan di
   database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya
   arti lain di panel ini (tampil di situs). Sebuah
   layanan bisa saja Live TAPI belum terpublish. */
const NAMA_STATUS: Record<ServiceRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

/** Penjelasan bisa sepanjang satu kalimat penuh; di tabel yang dibutuhkan cuma
 *  cukup untuk mengenali barisnya. */
function cuplik(teks: string, batas = 60): string {
  const bersih = teks.trim();
  if (!bersih) return "—";
  return bersih.length <= batas ? bersih : `${bersih.slice(0, batas - 1)}…`;
}

export function DaftarLayanan({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: ServiceRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<ServiceRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(layanan: ServiceRecord) {
    setMenghapus(true);
    const hasil = await hapusLayanan(layanan.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `Layanan "${hasil.data.deleted}" dihapus. Namanya baru hilang dari sabuk di halaman Services setelah kamu menekan Publish.`,
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

    const ids = daftar.map((s) => s.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanLayanan(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan layanan diubah. Belum terlihat pengunjung sampai kamu menekan Publish.",
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
        <h2 style={{ margin: 0 }}>Layanan</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah layanan
        </button>
      </div>

      {/* Keterangan urutan ditulis di sini, bukan diserahkan ke tombolnya:
          sabuknya berputar terus, jadi "yang pertama" tidak pernah terlihat
          sebagai yang pertama di layar. Yang membaca urutan ini apa adanya
          adalah pembaca layar dan mesin pencari. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris = urutan judul di sabuk yang berputar, dan urutan kalimat
        yang dibacakan pembaca layar.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada layanan. Tekan “Tambah layanan” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nama layanan</th>
              <th>Penjelasan</th>
              <th style={{ width: 80 }}>Rincian</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((layanan, index) => (
              <tr
                key={layanan.id}
                className={layanan.state === "draft" ? "draf" : ""}
              >
                <td>{index + 1}</td>
                <td>
                  <strong>{layanan.title}</strong>
                </td>
                <td>{cuplik(layanan.desc)}</td>
                <td>{layanan.subs.length || "—"}</td>
                <td>
                  <span
                    className={`penanda${layanan.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[layanan.state]}
                  </span>
                </td>
                <td>
                  {tanggal(layanan.updatedAt)}
                  {layanan.unpublished ? (
                    <div className="belum-terpublish">belum terpublish</div>
                  ) : null}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${layanan.title}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${layanan.title}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(layanan.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(layanan)}
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
          judul="Hapus layanan?"
          isi={
            <p>
              <strong>{akanDihapus.title}</strong> akan hilang dari sabuk di
              halaman Services, berikut penjelasan dan rinciannya. Isinya tetap
              tersimpan di database dan bisa dikembalikan oleh developer kalau
              ternyata keliru, tapi tidak lewat panel ini.
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

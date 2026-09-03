/**
 * Daftar nilai "What We Stand For".
 *
 * Bedanya dengan daftar lowongan: URUTAN barisnya bukan sekadar urutan tabel,
 * melainkan urutan panel yang benar-benar dilihat pengunjung — panel-panelnya
 * bertumpuk sticky di halaman People, dan yang terakhir adalah yang menutup
 * tumpukan. Karena itu ada "Naikkan"/"Turunkan" di sini, dan karena itu pula
 * memindahkan baris dihitung sebagai perubahan yang menunggu Publish.
 */

import { useState } from "react";

import { hapusNilai, urutkanNilai, type ValueRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti di daftar lowongan: nama status memakai nilai yang tersimpan di
   database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya
   arti lain di panel ini (tampil di situs). Sebuah nilai
   bisa saja Live TAPI belum terpublish. */
const NAMA_STATUS: Record<ValueRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarNilai({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: ValueRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<ValueRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(value: ValueRecord) {
    setMenghapus(true);
    const hasil = await hapusNilai(value.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Panelnya baru hilang dari situs setelah kamu menekan Publish.`,
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

    const ids = daftar.map((v) => v.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanNilai(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah("Urutan panel diubah. Belum terlihat pengunjung sampai kamu menekan Publish.");
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
        <h2 style={{ margin: 0 }}>Nilai</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah nilai
        </button>
      </div>

      {/* Keterangan urutan ditulis di sini, bukan diserahkan ke tombolnya.
          Tanpa kalimat ini "Naikkan" terbaca sebagai urutan daftar admin saja,
          dan tidak ada yang menduga bahwa menekannya mengubah halaman People. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan panel di halaman People, dari atas ke
        bawah. Panel paling bawah yang menutup tumpukan.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada nilai. Tekan “Tambah nilai” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Judul</th>
              <th>Baris pendek</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((value, index) => (
              <tr key={value.id} className={value.state === "draft" ? "draf" : ""}>
                <td>{index + 1}</td>
                <td>
                  <strong>{value.title}</strong>
                </td>
                <td>{value.tagline || "—"}</td>
                <td>
                  <span
                    className={`penanda${value.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[value.state]}
                  </span>
                </td>
                <td>
                  {tanggal(value.updatedAt)}
                  {value.unpublished ? (
                    <div className="belum-terpublish">belum terpublish</div>
                  ) : null}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${value.title}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${value.title}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(value.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(value)}
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
          judul="Hapus nilai?"
          isi={
            <p>
              Panel <strong>“{akanDihapus.title}”</strong> akan dihapus dari
              halaman People. Isinya tetap tersimpan di database dan bisa
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

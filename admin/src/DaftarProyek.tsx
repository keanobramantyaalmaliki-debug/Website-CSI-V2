/**
 * Daftar proyek "Selected Work".
 *
 * Sama seperti daftar nilai, urutan barisnya bukan urutan tabel melainkan
 * urutan yang benar-benar dilihat pengunjung — tapi taruhannya lebih besar di
 * sini: kartu proyek di halaman Work bertumpuk seperti kipas, dan yang PERTAMA
 * adalah kartu yang sudah terbuka begitu halaman dibuka. Menaikkan satu baris
 * ke puncak sama dengan memilih proyek mana yang pertama dilihat orang.
 */

import { useState } from "react";

import { hapusProyek, urutkanProyek, type WorkProjectRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Nama status memakai nilai yang tersimpan di database apa adanya, dan sengaja
   BUKAN kata "tayang" — kata itu sudah punya arti lain di panel ini (sudah
   sampai ke pengunjung atau belum). Sebuah proyek bisa saja Live TAPI belum
   tayang. */
const NAMA_STATUS: Record<WorkProjectRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarProyek({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: WorkProjectRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<WorkProjectRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(project: WorkProjectRecord) {
    setMenghapus(true);
    const hasil = await hapusProyek(project.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Kartunya baru hilang dari situs setelah kamu menekan Publish.`,
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

    const ids = daftar.map((p) => p.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanProyek(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan kartu diubah. Belum terlihat pengunjung sampai kamu menekan Publish.",
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
        <h2 style={{ margin: 0 }}>Selected work</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah proyek
        </button>
      </div>

      {/* Keterangan urutan ditulis di sini, bukan diserahkan ke tombolnya.
          Tanpa kalimat ini "Naikkan" terbaca sebagai urutan daftar admin saja,
          dan tidak ada yang menduga bahwa baris teratas menentukan kartu mana
          yang pertama dilihat pengunjung. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan kartu di halaman Work. Yang paling atas
        adalah kartu yang sudah terbuka saat halaman dibuka.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada proyek. Tekan “Tambah proyek” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nama proyek</th>
              <th>Klien</th>
              <th>Tahun</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((project, index) => (
              <tr
                key={project.id}
                className={project.state === "draft" ? "draf" : ""}
              >
                <td>{index + 1}</td>
                <td>
                  <strong>{project.title}</strong>
                </td>
                <td>{project.client || "—"}</td>
                <td>{project.year || "—"}</td>
                <td>
                  <span
                    className={`penanda${project.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[project.state]}
                  </span>
                  {project.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(project.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${project.title}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${project.title}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(project.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(project)}
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
          judul="Hapus proyek?"
          isi={
            <p>
              Kartu <strong>“{akanDihapus.title}”</strong> akan dihapus dari
              halaman Work. Isinya tetap tersimpan di database dan bisa
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

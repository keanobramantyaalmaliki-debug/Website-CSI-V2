/**
 * Tabel daftar lowongan.
 *
 * Kolomnya sengaja empat saja. Yang perlu dijawab sekilas cuma: lowongan apa,
 * sedang tayang atau tidak, dan apakah suntingan terakhir sudah sampai ke
 * pengunjung. Sisanya ada di dalam form.
 */

import { useState } from "react";

import { hapusLowongan, type JobRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Bahasa Inggris, sama persis dengan nilai yang tersimpan di database.
   "Tayang" dulu dipakai untuk `open`, dan itu bertabrakan dengan arti "tayang"
   yang satunya di panel ini — sudah sampai ke pengunjung atau belum (badge
   "belum tayang" di bawahnya, dan tombol Publish). Satu lowongan bisa saja
   Open TAPI belum tayang; dengan kata yang sama untuk keduanya, kalimat itu
   jadi tidak bisa dibaca. */
const NAMA_STATUS: Record<JobRecord["state"], string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export function DaftarLowongan({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: JobRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<JobRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(job: JobRecord) {
    setMenghapus(true);
    const hasil = await hapusLowongan(job.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Barisnya baru hilang dari situs setelah kamu menekan Publish.`,
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
        <h2 style={{ margin: 0 }}>Lowongan</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah lowongan
        </button>
      </div>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada lowongan. Tekan “Tambah lowongan” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Departemen</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((job) => (
              <tr key={job.id} className={job.state === "draft" ? "draf" : ""}>
                {/* Judul saja. Alamat halamannya dulu ikut ditulis di sini,
                    dan itu memberi setiap baris tinggi dua kali lipat demi
                    keterangan yang sebenarnya cuma berguna saat sedang
                    menyunting satu lowongan — di sana ia memang ada, di
                    "Pengaturan lanjutan" dalam form. */}
                <td>
                  <strong>{job.title}</strong>
                </td>
                <td>{job.department || "—"}</td>
                <td>
                  <span
                    className={`penanda${job.state === "open" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[job.state]}
                  </span>
                  {job.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(job.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(job.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(job)}
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
          judul="Hapus lowongan?"
          isi={
            <p>
              Lowongan <strong>“{akanDihapus.title}”</strong> akan dihapus dari
              daftar. Isinya tetap tersimpan di database dan bisa dikembalikan
              oleh developer kalau ternyata keliru, tapi tidak lewat panel ini.
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

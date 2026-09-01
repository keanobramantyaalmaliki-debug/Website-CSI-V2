/**
 * Daftar anggota crew "The Crew".
 *
 * Bedanya dengan daftar nilai: TIDAK ADA "Naikkan"/"Turunkan", dan itu
 * disengaja. `TheCrew.tsx` mengelompokkan sendiri per departemen lalu
 * mengurutkan A–Z di dalamnya — "A-Z" bahkan tercetak sebagai judul kolom di
 * halamannya. Tombol pemindah di sini akan menjanjikan sesuatu yang situsnya
 * abaikan sepenuhnya, tanpa satu pun pesan yang bisa menjelaskan kenapa.
 *
 * Karena itu barisnya diurutkan seperti situs mengurutkannya (departemen lalu
 * nama) — bukan supaya bisa diubah, tapi supaya yang dilihat editor di panel
 * sama dengan yang dilihat pengunjung di halaman.
 */

import { useState } from "react";

import { hapusCrew, type CrewRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti daftar lowongan dan nilai: nama status memakai nilai yang
   tersimpan di database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu
   sudah punya arti lain di panel ini (sudah sampai ke pengunjung atau belum).
   Seorang anggota bisa saja Live TAPI belum tayang. */
const NAMA_STATUS: Record<CrewRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarCrew({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: CrewRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<CrewRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(member: CrewRecord) {
    setMenghapus(true);
    const hasil = await hapusCrew(member.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Namanya baru hilang dari situs setelah kamu menekan Publish.`,
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
        <h2 style={{ margin: 0 }}>Crew</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah anggota
        </button>
      </div>

      {/* Ditulis di sini supaya tidak ada yang mencari tombol pengubah urutan
          dan mengira panelnya rusak karena tidak menemukannya. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan di halaman People diatur situs sendiri: dikelompokkan per
        departemen, lalu A–Z menurut nama. Tidak ada urutan yang bisa diatur
        dari sini.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada anggota. Tekan “Tambah anggota” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jabatan</th>
              <th>Departemen</th>
              <th>Foto</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((member) => (
              <tr key={member.id} className={member.state === "draft" ? "draf" : ""}>
                <td>
                  <strong>{member.name}</strong>
                </td>
                <td>{member.role || "—"}</td>
                <td>{member.category}</td>
                {/* Foto kosong itu SAH — kotaknya memakai ikon orang abu-abu
                    yang memang dirancang untuk itu — jadi kolomnya menyebut
                    apa adanya, bukan ditandai seperti kesalahan. */}
                <td>{member.photo ? "Ada" : "—"}</td>
                <td>
                  <span
                    className={`penanda${member.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[member.state]}
                  </span>
                  {member.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(member.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(member.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(member)}
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
          judul="Hapus anggota?"
          isi={
            <p>
              <strong>“{akanDihapus.name}”</strong> akan dihapus dari daftar nama
              dan dinding foto di halaman People. Datanya tetap tersimpan di
              database dan bisa dikembalikan oleh developer kalau ternyata
              keliru — tapi tidak lewat panel ini.
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

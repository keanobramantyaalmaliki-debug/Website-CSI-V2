/**
 * Daftar cerita "Case Studies".
 *
 * Kembar dengan `DaftarProyek`, di halaman yang sama, tapi taruhan urutannya
 * berbeda: di sini semua blok terlihat sekaligus — tidak ada satu yang "sudah
 * terbuka". Yang ditentukan urutan cuma cerita mana yang dibaca lebih dulu,
 * dan itu tetap keputusan editor, bukan keputusan Postgres.
 */

import { useState } from "react";

import { hapusCaseStudy, urutkanCaseStudy, type CaseStudyRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Nama status memakai nilai yang tersimpan di database apa adanya, dan sengaja
   BUKAN kata "tayang" — kata itu sudah punya arti lain di panel ini (sudah
   sampai ke pengunjung atau belum). Sebuah cerita bisa saja Live TAPI belum
   tayang. */
const NAMA_STATUS: Record<CaseStudyRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarCaseStudy({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: CaseStudyRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<CaseStudyRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function hapus(study: CaseStudyRecord) {
    setMenghapus(true);
    const hasil = await hapusCaseStudy(study.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Ceritanya baru hilang dari situs setelah kamu menekan Publish.`,
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
    const hasil = await urutkanCaseStudy(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan cerita diubah. Belum terlihat pengunjung sampai kamu menekan Publish.",
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
        <h2 style={{ margin: 0 }}>Case study</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah case study
        </button>
      </div>

      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan blok cerita di halaman Work, dari atas ke
        bawah.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada case study. Tekan “Tambah case study” untuk membuat yang
          pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Judul</th>
              <th>Klien</th>
              <th>Tahun</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((study, index) => (
              <tr
                key={study.id}
                className={study.state === "draft" ? "draf" : ""}
              >
                <td>{index + 1}</td>
                <td>
                  <strong>{study.title}</strong>
                </td>
                <td>{study.client || "—"}</td>
                <td>{study.year || "—"}</td>
                <td>
                  <span
                    className={`penanda${study.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[study.state]}
                  </span>
                  {study.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(study.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${study.title}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${study.title}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(study.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(study)}
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
          judul="Hapus case study?"
          isi={
            <p>
              Cerita <strong>“{akanDihapus.title}”</strong> akan dihapus dari
              halaman Work berikut seluruh uraiannya. Isinya tetap tersimpan di
              database dan bisa dikembalikan oleh developer kalau ternyata
              keliru, tapi tidak lewat panel ini.
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

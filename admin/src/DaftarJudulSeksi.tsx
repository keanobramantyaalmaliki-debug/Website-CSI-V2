/**
 * Daftar Judul seksi satu halaman.
 *
 * Bentuk ketiga di panel ini, dan tabelnya memperlihatkan bedanya: TIDAK ada
 * tombol "Tambah", "Hapus", maupun "Naikkan/Turunkan", dan TIDAK ada kolom
 * Status. Barisnya sebelas, lahir dari seed, dan urutannya ditentukan tata
 * letak halaman di situs, bukan data (lihat `shared/sectionText.ts`).
 *
 * Yang tersisa untuk editor cuma satu tindakan, "Ubah", dan itu memang
 * seluruh gunanya layar ini: melihat sekaligus semua kalimat pembuka satu
 * halaman, lalu membuka salah satunya.
 *
 * Urutan barisnya diambil dari `sectionTextKeys()`, BUKAN dari urutan balasan
 * server: yang dijanjikan judul kolom "#" adalah urutan seksi seperti
 * ditemui pengunjung saat menggulir, dan itu pengetahuan tata letak yang cuma
 * ada di `SECTION_TEXT_META`.
 */

import {
  SECTION_TEXT_META,
  sectionHeadingLines,
  sectionTextKeys,
  type SectionTextPage,
} from "@shared/sectionText";

import { type SectionTextRecord } from "./api";
import { tanggal } from "./ui";

/* Nama halaman seperti tertulis di menu sisi. Sengaja tidak diambil dari
   `CONTENT_GROUPS`: yang dibutuhkan di sini cuma empat kata, dan menariknya
   dari peta konten berarti layar ini ikut punya pendapat soal susunan menu. */
const LABEL_HALAMAN: Record<SectionTextPage, string> = {
  home: "Home",
  services: "Services",
  work: "Work",
  people: "People",
};

/** Subteks bisa 400 huruf; di tabel yang dibutuhkan cuma pengenalnya. */
function cuplik(teks: string, batas = 70): string {
  const bersih = teks.replace(/\s+/g, " ").trim();
  if (!bersih) return "\u2014";
  return bersih.length <= batas ? bersih : `${bersih.slice(0, batas - 1)}\u2026`;
}

export function DaftarJudulSeksi({
  halaman,
  daftar,
  onUbah,
}: {
  halaman: SectionTextPage;
  /** SELURUH sebelas baris; layar ini yang menyaring miliknya sendiri. Satu
   *  permintaan `GET /api/section-text` melayani keempat halaman. */
  daftar: SectionTextRecord[];
  onUbah: (id: string) => void;
}) {
  const kunci = sectionTextKeys(halaman);
  const baris = kunci
    .map((key) => daftar.find((row) => row.key === key))
    .filter((row): row is SectionTextRecord => row !== undefined);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Judul seksi {LABEL_HALAMAN[halaman]}</h2>

      <p className="petunjuk">
        Kalimat pembuka tiap bagian halaman {LABEL_HALAMAN[halaman]}, urut dari
        atas ke bawah seperti pengunjung menemuinya. Bagiannya sendiri tidak
        bisa ditambah atau dihapus dari sini, yang bisa diubah kalimatnya.
      </p>

      {baris.length === 0 ? (
        /* Cuma terlihat kalau seed belum pernah jalan di mesin ini. Bukan
           galat yang bisa diperbaiki editor, jadi kalimatnya menunjuk ke
           developer alih-alih menawarkan tombol. */
        <p className="kosong">
          Judul seksi belum ada di database. Kabari developer untuk
          mengisinya.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Bagian</th>
              <th>Judul</th>
              <th>Subteks</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {baris.map((row, index) => {
              const meta = SECTION_TEXT_META[row.key];
              return (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{meta.label}</strong>
                  </td>
                  {/* Baris kedua judul ditampilkan sebagai baris kedua juga,
                      bukan disambung dengan spasi: di situs pemisahnya nyata,
                      dan tabel yang menyembunyikannya membuat editor mengira
                      judulnya satu baris. */}
                  <td>
                    {sectionHeadingLines(row.heading).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>
                  <td>
                    {meta.adaSub ? cuplik(row.subheading) : "\u2014"}
                  </td>
                  <td>
                    {tanggal(row.updatedAt)}
                    {row.unpublished ? (
                      <div className="belum-terpublish">belum terpublish</div>
                    ) : null}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="kecil"
                      onClick={() => onUbah(row.id)}
                    >
                      Ubah
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

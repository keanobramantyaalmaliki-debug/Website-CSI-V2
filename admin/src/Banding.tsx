/**
 * Tabel "Sebelum / Sesudah" — satu bentuk, dua layar.
 *
 * Riwayat memakainya untuk perubahan yang SUDAH tayang, Review untuk yang
 * belum. Pertanyaannya berbeda ("apa yang terjadi" vs "apa yang akan
 * terjadi"), tapi jawabannya bentuknya sama persis, dan menyalin tabelnya ke
 * dua berkas berarti perbaikan keterbacaan di satu layar diam-diam melewatkan
 * layar satunya — yang paling berbahaya justru karena keduanya tetap terlihat
 * baik-baik saja.
 *
 * Yang TIDAK ikut ke sini: kalimat ringkasannya. "isi terakhirnya masih bisa
 * dilihat" benar untuk penghapusan yang sudah tayang dan salah untuk yang
 * belum, jadi tiap layar menuliskan kalimatnya sendiri.
 */

import type { BarisBanding } from "@shared/riwayat";

export function TabelBanding({
  banding,
  kosong,
}: {
  banding: BarisBanding[];
  /** Kalimat kalau tidak ada isian yang berbeda. Ditulis pemanggilnya:
   *  keadaan ini artinya lain di tiap layar. */
  kosong: string;
}) {
  if (banding.length === 0) {
    return (
      <p className="petunjuk" style={{ margin: 0 }}>
        {kosong}
      </p>
    );
  }

  return (
    <table className="banding">
      <thead>
        <tr>
          <th style={{ width: 180 }}>Isian</th>
          <th>Sebelum</th>
          <th>Sesudah</th>
        </tr>
      </thead>
      <tbody>
        {banding.map((b) => (
          <tr key={b.key}>
            <td>{b.label}</td>
            {/* `<pre>`, bukan `<p>`: daftar sudah dibentuk jadi baris
                bernomor oleh `nilaiJadiTeks`, dan baris barunya akan runtuh
                jadi satu paragraf tanpa ini. */}
            <td className="banding-lama">
              {b.sebelum ? <pre>{b.sebelum}</pre> : <span>kosong</span>}
            </td>
            <td className="banding-baru">
              {b.sesudah ? <pre>{b.sesudah}</pre> : <span>kosong</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

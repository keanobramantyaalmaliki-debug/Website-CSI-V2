/**
 * Layar depan panel.
 *
 * Peta halaman situs sekarang tinggal di menu sisi dan selalu kelihatan, jadi
 * layar ini TIDAK mengulanginya. Yang tersisa untuknya adalah pekerjaan: apa
 * yang bisa diubah sekarang, dan bagaimana keadaannya — berapa lowongan, ada
 * berapa yang masih draf, ada berapa yang belum tayang. Mengulang menu di sini
 * berarti dua daftar identik bersebelahan, dan yang di sebelah kiri jadi ikut
 * tidak dipercaya.
 */

import { CONTENT_GROUPS, type ContentEntry, type ContentPage } from "@shared/contentMap";

const SIAP: { halaman: ContentPage; entri: ContentEntry }[] = CONTENT_GROUPS.flatMap((halaman) =>
  halaman.entries.filter((entri) => entri.status === "siap").map((entri) => ({ halaman, entri })),
);

const JUMLAH_BELUM = CONTENT_GROUPS.reduce(
  (n, halaman) => n + halaman.entries.filter((e) => e.status !== "siap").length,
  0,
);

export function Beranda({
  /** Kalimat status hidup per key entri, disiapkan pemanggil. Beranda sengaja
   *  tidak tahu cara menghitung apa pun sendiri. */
  keterangan,
  onBuka,
}: {
  keterangan: Record<string, string>;
  onBuka: (key: string) => void;
}) {
  return (
    <>
      <p className="pengantar">
        Pilih halaman di menu sebelah kiri, lalu konten yang mau diubah.
        Susunannya sama persis dengan menu di situs — kalau di situs sesuatu ada
        di halaman People, di sini juga.
      </p>

      <section className="kotak">
        <div className="kotak-kepala">
          <h2>Yang bisa diubah sekarang</h2>
        </div>

        <div className="entri-daftar">
          {SIAP.map(({ halaman, entri }) => (
            <div className="entri" key={entri.key}>
              <div className="entri-teks">
                <strong>{entri.label}</strong>{" "}
                <code className="alamat">
                  {halaman.label} · {halaman.path}
                </code>
                <p className="petunjuk">{entri.summary}</p>
                <p className="petunjuk">{keterangan[entri.key] ?? ""}</p>
              </div>

              <div className="entri-aksi">
                <button type="button" className="utama" onClick={() => onBuka(entri.key)}>
                  Kelola {entri.label.toLowerCase()}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="pengantar">
        {JUMLAH_BELUM} konten lain di menu kiri bertanda{" "}
        <span className="penanda">Belum tersedia</span> — masih ditulis di dalam
        kode dan belum bisa diubah dari sini. Kabari developer kalau salah
        satunya perlu diganti.
      </p>
    </>
  );
}

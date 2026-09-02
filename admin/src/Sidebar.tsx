/**
 * Menu sisi: peta halaman situs yang selalu kelihatan.
 *
 * Susunannya sama persis dengan navbar situs (Home, Services, Work, People,
 * lalu "Footer"), diambil dari `@shared/contentMap` dan dijaga tetap
 * sinkron oleh `src/lib/contentMap.test.ts`. Editor panel ini tidak pernah
 * perlu tahu ada tabel bernama `jobs`; yang dia tahu adalah "lowongan itu ada
 * di halaman People", dan itulah yang menu ini tunjukkan.
 *
 * Satu grup terbuka pada satu waktu. Bukan karena lebih rapi, tapi karena
 * dengan sepuluh anak yang tersebar di lima grup, membuka semuanya sekaligus
 * mengubah menu ini jadi daftar panjang yang justru menyembunyikan
 * pengelompokannya — padahal pengelompokan itu satu-satunya hal yang perlu
 * dibaca dari sini.
 *
 * Konten yang belum ber-CMS tetap didaftarkan, mati dan bertanda "Belum
 * tersedia". Menyembunyikannya membuat editor mencari sesuatu yang memang
 * belum ada lalu bertanya ke developer; menampilkannya menjawab lebih dulu.
 */

import { useEffect, useState } from "react";

import { CONTENT_GROUPS, findEntry } from "@shared/contentMap";

/** Grup yang terbuka saat panel pertama dibuka: yang pertama punya isi yang
 *  sudah bisa dikelola. Ikut bergeser sendiri saat entitas berikutnya jadi,
 *  jadi tidak ada nama halaman yang perlu ditulis ulang di sini. */
const GRUP_AWAL =
  CONTENT_GROUPS.find((p) => p.entries.some((e) => e.status === "siap"))?.key ??
  CONTENT_GROUPS[0].key;

function grupDari(entitas: string | null): string | null {
  return entitas ? findEntry(entitas)?.page.key ?? null : null;
}

export function Sidebar({
  /** Key entri yang sedang dibuka, atau `null` di beranda. */
  aktif,
  onBeranda,
  onBuka,
}: {
  aktif: string | null;
  onBeranda: () => void;
  onBuka: (key: string) => void;
}) {
  const [terbuka, setTerbuka] = useState<string | null>(() => grupDari(aktif) ?? GRUP_AWAL);
  const [ringkas, setRingkas] = useState(false);

  /* Pindah halaman lewat jalan lain (hash diketik tangan, tombol back
     peramban) tetap harus membuka grup yang benar — kalau tidak, menu
     memperlihatkan posisi yang bukan posisi kita. */
  useEffect(() => {
    const g = grupDari(aktif);
    if (g) setTerbuka(g);
  }, [aktif]);

  return (
    <nav className={ringkas ? "sisi ringkas" : "sisi"} aria-label="Menu konten">
      {ringkas ? null : (
        <ul className="sisi-daftar">
          <li>
            <button
              type="button"
              className={aktif === null ? "sisi-judul aktif" : "sisi-judul"}
              aria-current={aktif === null ? "page" : undefined}
              onClick={onBeranda}
            >
              <span>Beranda</span>
            </button>
          </li>

          {CONTENT_GROUPS.map((halaman) => {
            /* Kelompok yang isinya dirinya sendiri (hari ini: Footer) tampil
               sebagai SATU baris yang langsung membuka layarnya — sederajat
               dengan "Beranda" di atas, bukan judul yang harus dibuka dulu.
               Panah yang membuka satu anak bernama sama dengan induknya cuma
               menambah ketukan tanpa memberi tahu apa pun. */
            if (halaman.langsung) {
              const entri = halaman.entries[0];
              const ini = aktif === entri.key;
              return (
                <li key={halaman.key}>
                  <button
                    type="button"
                    className={ini ? "sisi-judul aktif" : "sisi-judul"}
                    aria-current={ini ? "page" : undefined}
                    onClick={() => onBuka(entri.key)}
                  >
                    <span>{halaman.label}</span>
                  </button>
                </li>
              );
            }

            const buka = terbuka === halaman.key;
            return (
              <li key={halaman.key}>
                <button
                  type="button"
                  className="sisi-judul"
                  aria-expanded={buka}
                  onClick={() => setTerbuka(buka ? null : halaman.key)}
                >
                  <span>{halaman.label}</span>
                  <span className="sisi-tanda" aria-hidden="true">
                    {buka ? "▾" : "▸"}
                  </span>
                </button>

                {buka ? (
                  <ul className="sisi-anak">
                    {halaman.entries.map((entri) =>
                      entri.status === "siap" ? (
                        <li key={entri.key}>
                          <button
                            type="button"
                            className={aktif === entri.key ? "sisi-item aktif" : "sisi-item"}
                            aria-current={aktif === entri.key ? "page" : undefined}
                            onClick={() => onBuka(entri.key)}
                          >
                            {entri.label}
                          </button>
                        </li>
                      ) : (
                        <li key={entri.key}>
                          {/* Sengaja bukan <button disabled>: tidak ada yang
                              akan terjadi kalau diklik, dan tombol mati yang
                              tetap terlihat seperti tombol mengundang klik
                              berulang. Ini keterangan, dan dibaca begitu. */}
                          <span className="sisi-item mati">
                            {entri.label}
                            <em className="sisi-catatan">Belum tersedia</em>
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* Menempel di garis pemisahnya, bukan mengantre di bawah daftar: ini
          kendali tampilan, bukan salah satu tujuan navigasi, jadi ia tidak
          boleh terbaca sebagai baris menu keenam. Labelnya lewat aria-label —
          yang tampak cuma tanda panahnya, dan tanda panah sendirian tidak
          berarti apa-apa kalau dibacakan pembaca layar. */}
      <button
        type="button"
        className="sisi-lipat"
        aria-expanded={!ringkas}
        aria-label={ringkas ? "Tampilkan menu" : "Sembunyikan menu"}
        title={ringkas ? "Tampilkan menu" : "Sembunyikan menu"}
        onClick={() => setRingkas((r) => !r)}
      >
        <span aria-hidden="true">{ringkas ? "›" : "‹"}</span>
      </button>
    </nav>
  );
}

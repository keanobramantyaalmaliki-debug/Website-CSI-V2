"use client";

import { useMemo } from "react";

import { footer } from "@/data/footer";

/**
 * Kaki halaman: surel + alamat di kiri, kanal sosial + hak cipta di kanan.
 *
 * Dulu ditulis langsung di dalam <Contact/> — satu-satunya halaman yang
 * memilikinya. Halaman lowongan (`/careers/<slug>`) mencabut Contact 27 Agu dan
 * ikut kehilangan kakinya: satu-satunya halaman situs yang berakhir tanpa
 * alamat, tanpa kanal sosial, tanpa hak cipta. Jadi kakinya dipindah ke sini
 * dan DIPAKAI BERSAMA, bukan disalin — alamat kantor yang pindah dua tahun lagi
 * tidak boleh punya dua tempat untuk diperbarui.
 *
 * `className` cuma mengatur JARAKNYA; isinya tidak bisa diatur pemanggil. Itu
 * yang membuat dua tempat pemakaiannya dijamin identik.
 *
 * ⚠️ Isinya datang dari CMS (kelompok "Footer" di panel), dan `footer()`
 * WAJIB dipanggil di dalam komponen lewat `useMemo` — bukan di ruang modul.
 * Konstanta modul dihitung saat berkas ini diimpor, yaitu sebelum
 * `loadContent()` selesai, jadi ia akan membekukan isi cadangan selamanya
 * tanpa satu pun error. Lihat catatan panjangnya di `src/data/footer.ts`.
 */
export default function SiteFooter({ className = "" }: { className?: string }) {
  /* `[]` dan bukan dependensi apa pun: `content.json` diunduh sekali sebelum
     React merender, dan tidak pernah berubah lagi selama halaman hidup. */
  const isi = useMemo(() => footer(), []);

  return (
    <footer className={`text-xs text-zinc-400 ${className}`}>
      {/* Dua baris, dipasangkan per KOLOM bukan per baris: kiri = cara
          menghubungi (surel di atas alamatnya), kanan = jejak resmi (kanal
          sosial di atas hak cipta). Susunan ini diketok 18 Agu; sebelumnya
          hak cipta memimpin baris pertama dan surel terselip di antara
          tautan sosial. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Putih penuh, bukan zinc-400 seperti sisa footer (18 Agu): surel dan
            kanal sosial adalah SATU-SATUNYA yang bisa diklik di sini — kontras
            itu yang membedakannya dari teks mati di sebelahnya. Hover-nya jadi
            kebalikan pola biasa: meredup ke zinc-400, bukan menyala.

            `hidden sm:inline` — di HP surel dan alamat DISEMBUNYIKAN, sisa hak
            cipta + kanal sosial saja (18 Agu). Empat baris teks kecil beruntun
            di lebar 360px terbaca sebagai tumpukan, bukan kaki halaman.
            `hidden`, bukan dilepas dari DOM: alamat masih terbaca crawler
            sebagai sinyal lokasi. */}
        <a
          href={`mailto:${isi.email}`}
          className="hidden text-white transition-colors hover:text-zinc-400 sm:inline"
        >
          {isi.email}
        </a>
        <div className="flex flex-wrap gap-4">
          {isi.socials.map((s, i) => (
            <a
              /* Kunci berikut nomornya: `label` teks bebas dari CMS sejak 2
                 Sep, jadi dua "Instagram" bukan lagi hal yang mustahil. */
              key={`${i}-${s.label}`}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white transition-colors hover:text-zinc-400"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <span className="hidden sm:inline">{isi.address}</span>
        {/* Tahunnya dihitung SAAT RENDER, bukan disimpan di CMS: kaki halaman
            yang menyimpan tahunnya jadi salah tiap 1 Januari sampai ada yang
            ingat menyuntingnya, dan tidak ada yang memberitahu siapa pun.
            `validateFooter.ts` menolak tahun yang terlanjur diketik editor
            supaya tidak tercetak dua kali. */}
        <span>
          © {new Date().getFullYear()} {isi.copyright}
        </span>
      </div>
    </footer>
  );
}

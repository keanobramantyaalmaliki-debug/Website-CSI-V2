"use client";

import { SOCIALS } from "@/data/socials";

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
 */
export default function SiteFooter({ className = "" }: { className?: string }) {
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
          href="mailto:hello@cogniti.id"
          className="hidden text-white transition-colors hover:text-zinc-400 sm:inline"
        >
          hello@cogniti.id
        </a>
        <div className="flex flex-wrap gap-4">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
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
        <span className="hidden sm:inline">
          Jl. Kediri No.27, Tuban, Badung, Bali 80361
        </span>
        <span>
          © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All rights
          reserved.
        </span>
      </div>
    </footer>
  );
}

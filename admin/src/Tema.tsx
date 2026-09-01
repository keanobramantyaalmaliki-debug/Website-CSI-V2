/**
 * Tema terang/gelap.
 *
 * Tiga hal, di satu berkas, karena ketiganya harus sepakat soal satu nama
 * kunci dan dua nama nilai: cara membacanya, cara memasangnya, dan tombolnya.
 *
 * Yang menyimpan pilihan cuma `localStorage` — bukan database. Ini preferensi
 * mata, bukan konten: ia milik perangkat yang sedang dipakai, dan tidak ada
 * gunanya ikut berpindah ke laptop lain bersama sesi login.
 *
 * PILIHAN vs TEMA. `pilihan` boleh `null`, artinya "ikut sistem" — dan itulah
 * keadaan awal setiap orang sebelum tombolnya pernah disentuh. Kalau keduanya
 * disatukan jadi satu nilai, panel yang dibuka pertama kali di macOS bertema
 * gelap akan tetap menyala putih, karena "belum pernah memilih" tidak bisa
 * dibedakan dari "sudah memilih terang".
 */

import { useCallback, useEffect, useState } from "react";

export type Tema = "terang" | "gelap";

/* Kunci yang sama juga dibaca skrip anti-kedip di `admin/index.html`, sebelum
   modul mana pun dimuat. Dua tempat, satu nama — kalau nama ini berubah,
   berkas itu ikut berubah, dan gejalanya adalah panel yang berkedip putih
   sekali setiap dimuat ulang, bukan galat apa pun. */
export const KUNCI_TEMA = "cogniti-tema";

const GELAP = "(prefers-color-scheme: dark)";

function bacaPilihan(): Tema | null {
  /* Mode privat di beberapa peramban melempar saat `localStorage` disentuh.
     Panel yang gagal dimuat gara-gara preferensi warna adalah harga yang
     terlalu mahal untuk sebuah tombol. */
  try {
    const t = localStorage.getItem(KUNCI_TEMA);
    return t === "terang" || t === "gelap" ? t : null;
  } catch {
    return null;
  }
}

function temaSistem(): Tema {
  return window.matchMedia(GELAP).matches ? "gelap" : "terang";
}

/** Satu-satunya yang benar-benar mengubah tampilan. Selektornya di
 *  `styles.css` adalah `:root[data-tema="gelap"]`. */
function pasang(tema: Tema) {
  document.documentElement.dataset.tema = tema;
}

export function useTema() {
  const [pilihan, setPilihan] = useState<Tema | null>(bacaPilihan);
  const [sistem, setSistem] = useState<Tema>(temaSistem);

  /* Selama belum ada pilihan eksplisit, panel ikut sistem SETERUSNYA — bukan
     cuma saat dimuat. macOS berganti sendiri saat matahari terbenam, dan
     panel yang tertinggal putih sampai halamannya di-reload terlihat seperti
     temanya rusak. */
  useEffect(() => {
    const mq = window.matchMedia(GELAP);
    const dengar = (e: MediaQueryListEvent) => setSistem(e.matches ? "gelap" : "terang");
    mq.addEventListener("change", dengar);
    return () => mq.removeEventListener("change", dengar);
  }, []);

  const tema = pilihan ?? sistem;

  useEffect(() => {
    pasang(tema);
  }, [tema]);

  const ganti = useCallback(() => {
    setPilihan(() => {
      /* Dihitung dari yang SEDANG tampak, bukan dari `pilihan` — kalau tidak,
         klik pertama seseorang yang sistemnya gelap menyimpan "gelap" dan
         tidak mengubah apa pun yang terlihat. */
      const baru: Tema = (pilihan ?? sistem) === "gelap" ? "terang" : "gelap";
      try {
        localStorage.setItem(KUNCI_TEMA, baru);
      } catch {
        /* Tetap berlaku untuk sesi ini; yang hilang cuma ingatannya. */
      }
      return baru;
    });
  }, [pilihan, sistem]);

  return { tema, ganti };
}

/* Ikon garis, 24×24, digambar sekali di sini. Ukuran dan ketebalannya diatur
   `styles.css` lewat `.tombol-tema svg`, jadi keduanya tidak membawa atribut
   tampilan apa pun selain bentuknya. */

function Matahari() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

function Bulan() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/**
 * Tombolnya menampilkan tema TUJUAN, bukan tema yang sedang berlaku: bulan
 * saat terang, matahari saat gelap. Keduanya sama-sama lazim di web dan
 * sama-sama bisa disalahartikan, jadi yang menyelesaikannya bukan ikonnya —
 * melainkan `title` dan `aria-label` yang menyebutkan kata kerjanya ("Ganti
 * ke tema gelap"). Ikon sendirian juga tidak berarti apa-apa bagi pembaca
 * layar, dan tombol ini tidak punya teks lain untuk dibacakan.
 */
export function TombolTema() {
  const { tema, ganti } = useTema();
  const label = tema === "gelap" ? "Ganti ke tema terang" : "Ganti ke tema gelap";

  return (
    <button
      type="button"
      className="tombol-tema"
      onClick={ganti}
      aria-label={label}
      title={label}
    >
      {tema === "gelap" ? <Matahari /> : <Bulan />}
    </button>
  );
}

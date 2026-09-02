/**
 * Bar menetap di bawah layar: berapa yang belum tayang, dan tombolnya.
 *
 * Menetap karena inilah satu-satunya langkah yang mudah terlupa. Menyimpan
 * terasa seperti selesai, padahal pengunjung belum melihat apa pun sampai
 * tombol ini ditekan — jadi angkanya harus selalu terlihat, di halaman mana pun.
 */

import { useState } from "react";

import { tayangkan } from "./api";

export function BarPublish({
  pending,
  onSelesai,
}: {
  pending: number;
  onSelesai: (pesan: string) => void;
}) {
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function publish() {
    setSedang(true);
    setGalat(null);
    const hasil = await tayangkan();
    setSedang(false);

    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }

    const {
      jobs,
      values,
      crew,
      projects,
      caseStudies,
      services,
      testimonials,
      industries,
      deployments,
      processSteps,
      vision,
      footer,
      warning,
    } = hasil.data;

    /* Semua entitas disebut, bukan cuma lowongan. Kalimat ini dulu berhenti di
       "N lowongan" karena lowongan penghuni pertamanya, dan sesudah entitas
       kelima kalimat itu berhenti jadi ringkasan dan mulai jadi salah — editor
       yang baru menyunting crew membaca angka yang tidak menyebut suntingannya
       sama sekali. Yang kosong dilewati supaya kalimatnya tidak jadi daftar
       nol yang panjang. */
    const bagian = [
      [jobs, "lowongan"],
      [values, "nilai"],
      [crew, "orang"],
      [projects, "proyek"],
      [caseStudies, "case study"],
      [services, "layanan"],
      [testimonials, "testimoni"],
      [industries, "sektor"],
      [deployments, "kartu deployment"],
      [processSteps, "langkah cara kerja"],
    ] as const;
    const isi = [
      ...bagian.filter(([n]) => n > 0).map(([n, nama]) => `${n} ${nama}`),
      /* Visi disebut namanya saja, tanpa angka: ia bukan cacah baris melainkan
         ada/tidak ada, dan "1 visi" akan terbaca seolah visi kedua mungkin
         ada. `false` berarti barisnya belum ada di database sama sekali — dan
         itu memang bukan sesuatu yang barusan tayang. */
      ...(vision ? ["visi"] : []),
      /* Kaki halaman, alasan sama seperti visi: ada/tidak ada, bukan cacah. */
      ...(footer ? ["kaki halaman"] : []),
    ].join(", ");

    onSelesai(
      `Sudah tayang: ${isi || "tidak ada apa pun yang"} sekarang terlihat pengunjung.` +
        /* Purge cache yang gagal TIDAK membatalkan publish — berkasnya sudah
           benar di server. Yang perlu diketahui editor cuma kenapa
           perubahannya mungkin belum kelihatan beberapa menit. */
        (warning ? ` ${warning} Perubahan mungkin baru terlihat beberapa menit lagi.` : ""),
    );
  }

  return (
    <div className="bar">
      <div className="dalam">
        <span>
          {galat ? (
            <strong>{galat}</strong>
          ) : pending === 0 ? (
            "Semua perubahan sudah tayang."
          ) : (
            <strong>
              {pending} perubahan belum tayang
            </strong>
          )}
        </span>
        <button
          type="button"
          className="utama"
          onClick={() => void publish()}
          disabled={sedang || pending === 0}
        >
          {sedang ? "Menayangkan…" : "Publish"}
        </button>
      </div>
    </div>
  );
}

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

    const { jobs, warning } = hasil.data;
    onSelesai(
      `Sudah tayang: ${jobs} lowongan sekarang terlihat pengunjung.` +
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

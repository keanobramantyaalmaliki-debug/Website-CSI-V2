/**
 * Pilih foto lowongan: dari yang sudah ada, atau unggah baru.
 *
 * Yang sudah ada ditampilkan lebih dulu dengan sengaja. Tanpa itu setiap orang
 * mengunggah ulang berkas yang sebenarnya sudah dipakai lowongan lain, dan
 * daftar fotonya menumpuk jadi belasan salinan yang sama.
 */

import { useEffect, useState } from "react";

import { ambilGambar, unggahGambar, type ImageRow } from "./api";

const BATAS_MB = 15;

export function PemilihFoto({
  nilai,
  ubah,
  galat,
  label = "Foto",
  petunjuk = "Tampil sebagai pratinjau di tabel Careers dan di kepala halaman lowongan. Gambar yang diunggah otomatis dikecilkan, tidak perlu diperkecil sendiri dulu.",
}: {
  nilai: string;
  ubah: (path: string) => void;
  galat?: string;
  /* Bawaannya kata-kata lowongan, karena di situlah pemilih ini lahir. Entitas
     lain menimpanya: gambar proyek bukan "foto", dan kalimat yang menyebut
     halaman Careers akan salah alamat di halaman Work. */
  label?: string;
  petunjuk?: string;
}) {
  const [daftar, setDaftar] = useState<ImageRow[] | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedangUnggah, setSedangUnggah] = useState(false);

  useEffect(() => {
    let batal = false;
    ambilGambar().then((hasil) => {
      if (batal) return;
      if (hasil.ok) setDaftar(hasil.data.images);
      else setPesan(hasil.pesan);
    });
    return () => {
      batal = true;
    };
  }, []);

  async function unggah(file: File) {
    setPesan(null);

    /* Diperiksa di sini JUGA, bukan hanya di server: menunggu 15MB terkirim
       lewat tethering cuma untuk ditolak adalah menit yang hilang percuma. */
    if (file.size > BATAS_MB * 1024 * 1024) {
      setPesan(`Berkas terlalu besar (maksimal ${BATAS_MB}MB).`);
      return;
    }

    setSedangUnggah(true);
    const hasil = await unggahGambar(file);
    setSedangUnggah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    setDaftar((lama) => [hasil.data.image, ...(lama ?? [])]);
    ubah(hasil.data.image.path);
  }

  return (
    <div className={`isian${galat ? " bergalat" : ""}`}>
      <label>{label}</label>
      <p className="petunjuk">{petunjuk}</p>

      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={sedangUnggah}
          onChange={(e) => {
            const file = e.target.files?.[0];
            /* Nilainya dikosongkan supaya memilih berkas yang SAMA dua kali
               berturut-turut tetap memicu `change`. */
            e.target.value = "";
            if (file) void unggah(file);
          }}
        />
        {sedangUnggah ? <span> Sedang mengunggah…</span> : null}
      </div>

      {pesan ? <p className="galat">{pesan}</p> : null}

      {daftar === null ? (
        <p className="petunjuk">Memuat daftar foto…</p>
      ) : daftar.length === 0 ? (
        <p className="petunjuk">Belum ada foto. Unggah satu di atas.</p>
      ) : (
        <div className="foto-daftar">
          {daftar.map((gambar) => {
            const terpilih = gambar.path === nilai;
            return (
              <button
                type="button"
                key={gambar.id}
                className={`foto${terpilih ? " terpilih" : ""}`}
                aria-pressed={terpilih}
                onClick={() => ubah(terpilih ? "" : gambar.path)}
              >
                <img src={gambar.path} alt="" />
                <span className="nama">
                  {gambar.originalName ?? gambar.path.split("/").pop()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="petunjuk" style={{ marginTop: 10 }}>
        {nilai ? `Terpilih: ${nilai}` : "Belum ada foto yang dipilih."}
      </p>

      {galat ? <p className="galat">{galat}</p> : null}
    </div>
  );
}

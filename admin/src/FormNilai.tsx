/**
 * Form satu nilai.
 *
 * Jauh lebih pendek dari form lowongan — empat isian dan satu status — jadi
 * tidak ada bagian "lanjutan" dan tidak ada apa pun yang disembunyikan.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateValue.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  validateValue,
  type ValueFieldErrors,
  type ValueInput,
} from "@shared/validateValue";

import { ambilSatuNilai, buatNilai, simpanNilai, type ValueRecord } from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { Isian, Kabar } from "./ui";

const KOSONG: ValueInput = {
  title: "",
  tagline: "",
  description: "",
  photo: "",
  state: "draft",
};

const STATUS: { nilai: ValueInput["state"]; nama: string; jelas: string }[] = [
  {
    nilai: "draft",
    nama: "Draft",
    jelas:
      "Belum terlihat pengunjung. Bisa disimpan meski isinya belum lengkap.",
  },
  {
    nilai: "live",
    nama: "Live",
    jelas:
      "Tampil sebagai satu panel di halaman People, setelah kamu menekan Publish.",
  },
];

/** `ValueRecord` (dari server) → `ValueInput` (yang diisi form). Kolom yang
 *  cuma urusan panel — kapan diubah, kapan dipublish, urutan — sengaja tidak
 *  ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(value: ValueRecord): ValueInput {
  return {
    title: value.title,
    tagline: value.tagline,
    description: value.description,
    photo: value.photo,
    state: value.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. Judul "Craft First "
 *  dan "Craft First" adalah judul yang sama bagi pembaca, tapi bukan bagi
 *  pemeriksa judul-kembar di server. */
function rapikan(isi: ValueInput): ValueInput {
  return {
    ...isi,
    title: isi.title.trim(),
    tagline: isi.tagline.trim(),
    description: isi.description.trim(),
    photo: isi.photo.trim(),
  };
}

export function FormNilai({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<ValueInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<ValueFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuNilai(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.value));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof ValueInput>(kunci: K, nilai: ValueInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateValue(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil = id === null ? await buatNilai(bersih) : await simpanNilai(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.value.title}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat nilai…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lowongan. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua nilai
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Nilai baru" : `Ubah: ${isi.title || "(tanpa judul)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Judul"
        petunjuk="Tulisan besar di kiri panel. Contoh: Craft First."
        galat={galat.title}
      >
        <input
          type="text"
          value={isi.title}
          onChange={(e) => ubah("title", e.target.value)}
        />
      </Isian>

      <Isian
        label="Baris pendek"
        petunjuk="Baris kecil huruf besar di bawah judul. Contoh: Precision over speed."
        galat={galat.tagline}
      >
        <input
          type="text"
          value={isi.tagline}
          onChange={(e) => ubah("tagline", e.target.value)}
        />
      </Isian>

      <Isian
        label="Uraian"
        petunjuk="Paragraf di kanan panel. Dua-tiga kalimat."
        galat={galat.description}
      >
        <textarea
          value={isi.description}
          onChange={(e) => ubah("description", e.target.value)}
        />
      </Isian>

      <PemilihFoto
        nilai={isi.photo}
        ubah={(path) => ubah("photo", path)}
        galat={galat.photo}
      />

      <fieldset>
        <legend>Status</legend>
        {STATUS.map((pilihan) => (
          <div
            className={`pilihan${isi.state === pilihan.nilai ? " terpilih" : ""}`}
            key={pilihan.nilai}
          >
            <input
              type="radio"
              id={`status-nilai-${pilihan.nilai}`}
              name="status-nilai"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-nilai-${pilihan.nilai}`}>{pilihan.nama}</label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar panel — "yang mana lebih dulu" — dan di form satu nilai
          tidak ada pembandingnya. Tempatnya di daftar, lewat Naikkan/Turunkan. */}
      <p className="petunjuk">
        Urutan panel diatur dari daftar nilai, lewat tombol Naikkan/Turunkan.
      </p>

      <div className="tombol-baris">
        <button type="submit" className="utama" disabled={menyimpan}>
          {menyimpan ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onBatal} disabled={menyimpan}>
          Batal
        </button>
      </div>
    </form>
  );
}

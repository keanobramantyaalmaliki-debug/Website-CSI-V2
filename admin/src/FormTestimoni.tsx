/**
 * Form satu testimoni.
 *
 * Bentuknya paling pendek dari semua form di panel ini — tiga isian dan satu
 * status — karena tidak ada foto: komponennya di situs menggambar ikon orang
 * yang sama untuk setiap kutipan, jadi pemilih foto di sini akan menyimpan
 * sesuatu yang tidak pernah dirender.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateTestimonial.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  validateTestimonial,
  type TestimonialFieldErrors,
  type TestimonialInput,
} from "@shared/validateTestimonial";

import {
  ambilSatuTestimoni,
  buatTestimoni,
  simpanTestimoni,
  type TestimonialRecord,
} from "./api";
import { Isian, Kabar } from "./ui";

const KOSONG: TestimonialInput = {
  quote: "",
  name: "",
  role: "",
  state: "draft",
};

const STATUS: { nilai: TestimonialInput["state"]; nama: string; jelas: string }[] =
  [
    {
      nilai: "draft",
      nama: "Draft",
      jelas:
        "Belum terlihat pengunjung. Bisa disimpan meski kutipannya belum lengkap — cukup namanya.",
    },
    {
      nilai: "live",
      nama: "Live",
      jelas:
        "Ikut berputar di dasar halaman Services, setelah kamu menekan Publish.",
    },
  ];

/** `TestimonialRecord` (dari server) → `TestimonialInput` (yang diisi form).
 *  Kolom yang cuma urusan panel — kapan diubah, kapan dipublish, urutan —
 *  sengaja tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(testimoni: TestimonialRecord): TestimonialInput {
  return {
    quote: testimoni.quote,
    name: testimoni.name,
    role: testimoni.role,
    state: testimoni.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Ratna Wijaya " dan
 *  "Ratna Wijaya" adalah nama yang sama bagi pembaca, tapi bukan bagi
 *  pemeriksa nama-kembar di server. */
function rapikan(isi: TestimonialInput): TestimonialInput {
  return {
    ...isi,
    quote: isi.quote.trim(),
    name: isi.name.trim(),
    role: isi.role.trim(),
  };
}

export function FormTestimoni({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<TestimonialInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<TestimonialFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuTestimoni(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.testimonial));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof TestimonialInput>(
    kunci: K,
    nilai: TestimonialInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateTestimonial(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar — lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatTestimoni(bersih) : await simpanTestimoni(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `Testimoni ${hasil.data.testimonial.name} tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat testimoni…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lowongan. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua testimoni
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Testimoni baru" : `Ubah: ${isi.name || "(tanpa nama)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Kutipan"
        /* Peringatan panjangnya ditulis di sini, bukan disimpan sampai galat
           muncul: tinggi blok di situs dikunci oleh kutipan TERPANJANG, jadi
           satu kutipan yang kepanjangan menambah ruang kosong di bawah semua
           kutipan lain — akibat yang tidak kelihatan dari dalam form ini. */
        petunjuk="Kalimat kliennya, tanpa tanda kutip — situs menambahkannya sendiri. Maksimal 280 karakter: kutipan terpanjang menentukan tinggi blok untuk semua yang lain."
        galat={galat.quote}
      >
        <textarea
          value={isi.quote}
          onChange={(e) => ubah("quote", e.target.value)}
        />
      </Isian>

      <Isian
        label="Nama"
        petunjuk="Nama orang yang memberi testimoni. Contoh: Ratna Wijaya."
        galat={galat.name}
      >
        <input
          type="text"
          value={isi.name}
          onChange={(e) => ubah("name", e.target.value)}
        />
      </Isian>

      <Isian
        label="Jabatan"
        petunjuk="Jabatan dan instansinya, satu baris. Contoh: Head of IT, Dinas Komunikasi & Informatika."
        galat={galat.role}
      >
        <input
          type="text"
          value={isi.role}
          onChange={(e) => ubah("role", e.target.value)}
        />
      </Isian>

      <fieldset>
        <legend>Status</legend>
        {STATUS.map((pilihan) => (
          <div
            className={`pilihan${isi.state === pilihan.nilai ? " terpilih" : ""}`}
            key={pilihan.nilai}
          >
            <input
              type="radio"
              id={`status-testimoni-${pilihan.nilai}`}
              name="status-testimoni"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-testimoni-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar kutipan — "yang mana yang terlihat duluan" — dan di
          form satu testimoni tidak ada pembandingnya. Tempatnya di daftar,
          lewat Naikkan/Turunkan. */}
      <p className="petunjuk">
        Urutan kutipan diatur dari daftar testimoni, lewat tombol
        Naikkan/Turunkan.
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

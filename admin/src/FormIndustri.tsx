/**
 * Form satu sektor industri.
 *
 * Empat isian, satu bobot, satu status. Yang perlu dijelaskan ke editor bukan
 * cara mengisinya melainkan ke mana isinya pergi: sektor tidak punya halaman
 * sendiri — ia satu plank di tumpukan 3D halaman Home, dan tiap isian di sini
 * muncul di tempat yang berbeda pada plank itu.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateIndustry.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 *
 * Satu aturan sengaja TIDAK ikut dijalankan di depan: batas 13 sektor tayang.
 * Ia butuh melihat seluruh daftar, sementara form ini cuma memegang satu
 * baris — jadi penjaganya di server, dan jawabannya mendarat di isian Status
 * lewat `hasil.errors`. Daftarnya sendiri sudah mematikan tombol "Tambah"
 * begitu penuh, jadi editor jarang sampai ke sini dalam keadaan itu.
 */

import { useEffect, useState } from "react";
import {
  validateIndustry,
  type IndustryFieldErrors,
  type IndustryInput,
} from "@shared/validateIndustry";

import {
  ambilSatuIndustri,
  buatIndustri,
  simpanIndustri,
  type IndustryRecord,
} from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { Isian, Kabar } from "./ui";

const KOSONG: IndustryInput = {
  name: "",
  desc: "",
  tier: "also",
  image: "",
  state: "draft",
};

const BOBOT: { nilai: IndustryInput["tier"]; nama: string; jelas: string }[] = [
  {
    nilai: "core",
    nama: "Core Focus",
    jelas:
      "Sektor sorotan. Plank-nya berlabel “Core Focus” saat disorot dan saat dibuka.",
  },
  {
    nilai: "also",
    nama: "Sektor biasa",
    jelas:
      "Dilayani, tapi bukan sorotan. Plank-nya berlabel “Sector”. Ini pilihan bawaan.",
  },
];

const STATUS: { nilai: IndustryInput["state"]; nama: string; jelas: string }[] = [
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
      "Tampil sebagai satu plank di tumpukan halaman Home, setelah kamu menekan Publish.",
  },
];

/** `IndustryRecord` (dari server) → `IndustryInput` (yang diisi form). Kolom
 *  yang cuma urusan panel — kapan diubah, kapan dipublish, urutan — sengaja
 *  tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(sektor: IndustryRecord): IndustryInput {
  return {
    name: sektor.name,
    desc: sektor.desc,
    tier: sektor.tier,
    image: sektor.image,
    state: sektor.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Healthcare " dan
 *  "Healthcare" adalah nama yang sama bagi pembaca, tapi bukan bagi pemeriksa
 *  nama-kembar di server. */
function rapikan(isi: IndustryInput): IndustryInput {
  return {
    ...isi,
    name: isi.name.trim(),
    desc: isi.desc.trim(),
    image: isi.image.trim(),
  };
}

export function FormIndustri({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<IndustryInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<IndustryFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuIndustri(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.industry));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof IndustryInput>(
    kunci: K,
    nilai: IndustryInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateIndustry(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar — lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatIndustri(bersih) : await simpanIndustri(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.industry.name}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat sektor…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form yang lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua sektor
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Sektor baru" : `Ubah: ${isi.name || "(tanpa nama)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Nama sektor"
        petunjuk="Tulisan besar di kartu, dan nama yang tampil di navigasi versi HP. Contoh: Healthcare. Pendek lebih baik — nama panjang terpotong di navigasi HP."
        galat={galat.name}
      >
        <input
          type="text"
          value={isi.name}
          onChange={(e) => ubah("name", e.target.value)}
        />
      </Isian>

      <Isian
        label="Kalimat penjelas"
        petunjuk="Satu kalimat, muncul di bawah nama saat plank-nya disorot dan saat kartunya dibuka. Bukan paragraf."
        galat={galat.desc}
      >
        <textarea
          value={isi.desc}
          onChange={(e) => ubah("desc", e.target.value)}
        />
      </Isian>

      <PemilihFoto
        nilai={isi.image}
        ubah={(path) => ubah("image", path)}
        galat={galat.image}
        label="Foto plank"
        petunjuk="Foto yang menempel di plank dan terlihat saat kartunya dibuka. Ambil yang lanskap — plank-nya lebar, bukan tegak. Gambar yang diunggah otomatis dikecilkan."
      />

      <fieldset>
        <legend>Bobot</legend>
        {BOBOT.map((pilihan) => (
          <div
            className={`pilihan${isi.tier === pilihan.nilai ? " terpilih" : ""}`}
            key={pilihan.nilai}
          >
            <input
              type="radio"
              id={`bobot-industri-${pilihan.nilai}`}
              name="bobot-industri"
              checked={isi.tier === pilihan.nilai}
              onChange={() => ubah("tier", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`bobot-industri-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.tier ? <p className="galat">{galat.tier}</p> : null}
      </fieldset>

      {/* Bobot bukan urutan dengan nama lain, dan itu perlu dikatakan: tiga
          sektor Core Focus hari ini kebetulan juga tiga teratas, jadi tanpa
          kalimat ini mudah disangka keduanya satu hal. */}
      <p className="petunjuk">
        Bobot tidak memindahkan sektor ke atas. Sektor Core Focus boleh berada
        di posisi mana pun — urutannya diatur terpisah, dari daftar sektor.
      </p>

      <fieldset>
        <legend>Status</legend>
        {STATUS.map((pilihan) => (
          <div
            className={`pilihan${isi.state === pilihan.nilai ? " terpilih" : ""}`}
            key={pilihan.nilai}
          >
            <input
              type="radio"
              id={`status-industri-${pilihan.nilai}`}
              name="status-industri"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-industri-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar sektor — "yang mana lebih dulu" — dan di form satu
          sektor tidak ada pembandingnya. */}
      <p className="petunjuk">
        Urutan sektor — beserta nomor 01, 02, … yang tercetak di situs — diatur
        dari daftar sektor, lewat tombol Naikkan/Turunkan.
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

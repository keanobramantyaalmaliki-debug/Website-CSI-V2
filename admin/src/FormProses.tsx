/**
 * Form satu langkah "Cara kerja".
 *
 * Tiga isian teks, satu ilustrasi, satu status. Yang perlu dijelaskan ke
 * editor bukan cara mengisinya melainkan ke mana isinya pergi: langkah tidak
 * punya halaman sendiri — ia satu kartu putih yang ditembus tali di seksi
 * "How We Work" halaman Home, dan tiap isian mendarat di tempat berbeda pada
 * kartu itu.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateProcessStep.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 *
 * Satu aturan sengaja TIDAK ikut dijalankan di depan: batas enam langkah
 * tayang. Ia butuh melihat seluruh daftar, sementara form ini cuma memegang
 * satu baris — jadi penjaganya di server, dan jawabannya mendarat di isian
 * Status lewat `hasil.errors`. Daftarnya sendiri sudah mematikan tombol
 * "Tambah" begitu penuh, jadi editor jarang sampai ke sini dalam keadaan itu.
 */

import { useEffect, useState } from "react";
import { PROCESS_GLYPH_KEYS, type ProcessGlyphKey } from "@shared/processStep";
import {
  validateProcessStep,
  type ProcessStepFieldErrors,
  type ProcessStepInput,
} from "@shared/validateProcessStep";

import {
  ambilSatuProses,
  buatProses,
  simpanProses,
  type ProcessStepRecord,
} from "./api";
import { Isian, Kabar } from "./ui";

const KOSONG: ProcessStepInput = {
  title: "",
  kicker: "",
  desc: "",
  glyph: "discovery",
  state: "draft",
};

/**
 * Nama manusiawi tiap ilustrasi — DIPERIKSA lengkap oleh TypeScript lewat
 * `Record<ProcessGlyphKey, string>`, jadi kunci ketujuh yang ditambahkan
 * kelak tidak bisa lolos tanpa namanya.
 *
 * Namanya menyebut GAMBARNYA, bukan tahapannya ("Radar", bukan "Discovery").
 * Kuncinya memang lahir dari tahapan, tapi begitu editor boleh memasang
 * ilustrasi apa pun ke langkah apa pun, nama bertema tahapan justru
 * menyesatkan: langkah "Riset lanjutan" bergambar "Discovery" terbaca seperti
 * salah pasang padahal gambarnya memang yang diinginkan.
 *
 * Diekspor karena `DaftarProses.tsx` memakai peta yang sama di kolom
 * "Ilustrasi" — dua nama berbeda untuk gambar yang sama akan membuat daftar
 * dan form terbaca seperti dua sistem.
 */
export const NAMA_ILUSTRASI: Record<ProcessGlyphKey, string> = {
  discovery: "Radar",
  strategy: "Grafik naik",
  design: "Artboard",
  development: "Jendela kode",
  testing: "Kisi centang",
  deployment: "Simpul menyatu",
};

const JELAS_ILUSTRASI: Record<ProcessGlyphKey, string> = {
  discovery: "Dua lingkaran putus-putus dengan jarum yang menyapu. Cocok untuk tahap mencari tahu.",
  strategy: "Garis patah yang menanjak ke satu titik oranye. Cocok untuk tahap menyusun rencana.",
  design: "Dua bingkai persegi bertumpuk. Cocok untuk tahap merancang tampilan.",
  development: "Jendela dengan kurung kode di dalamnya. Cocok untuk tahap membangun.",
  testing: "Kisi kotak dengan dua tanda centang. Cocok untuk tahap memeriksa.",
  deployment: "Tiga simpul yang menyatu ke satu titik. Cocok untuk tahap serah terima.",
};

const STATUS: { nilai: ProcessStepInput["state"]; nama: string; jelas: string }[] =
  [
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
        "Tampil sebagai satu kartu di seksi “How We Work”, setelah kamu menekan Publish.",
    },
  ];

/** `ProcessStepRecord` (dari server) → `ProcessStepInput` (yang diisi form).
 *  Kolom yang cuma urusan panel — kapan diubah, kapan dipublish, urutan —
 *  sengaja tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(langkah: ProcessStepRecord): ProcessStepInput {
  return {
    title: langkah.title,
    kicker: langkah.kicker,
    desc: langkah.desc,
    glyph: langkah.glyph,
    state: langkah.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Discovery " dan
 *  "Discovery" adalah judul yang sama bagi pembaca, tapi bukan bagi pemeriksa
 *  judul-kembar di server. */
function rapikan(isi: ProcessStepInput): ProcessStepInput {
  return {
    ...isi,
    title: isi.title.trim(),
    kicker: isi.kicker.trim(),
    desc: isi.desc.trim(),
  };
}

export function FormProses({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<ProcessStepInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<ProcessStepFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuProses(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.step));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof ProcessStepInput>(
    kunci: K,
    nilai: ProcessStepInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateProcessStep(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar — lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatProses(bersih) : await simpanProses(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.step.title}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat langkah…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form yang lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua langkah
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Langkah baru" : `Ubah: ${isi.title || "(tanpa judul)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Judul langkah"
        petunjuk="Tulisan besar di tengah kartu. Contoh: Discovery, Testing & QA. Pendek lebih baik — judul panjang membungkus dan mendorong penjelasan keluar kartu."
        galat={galat.title}
      >
        <input
          type="text"
          value={isi.title}
          onChange={(e) => ubah("title", e.target.value)}
        />
      </Isian>

      <Isian
        label="Kicker"
        petunjuk="Satu kata di atas judul, dicetak kapital berjarak lebar. Contoh: UNDERSTAND, BUILD. Satu kata saja — dua kata sudah membungkus jadi dua baris."
        galat={galat.kicker}
      >
        <input
          type="text"
          value={isi.kicker}
          onChange={(e) => ubah("kicker", e.target.value)}
        />
      </Isian>

      <Isian
        label="Penjelasan"
        petunjuk="Satu sampai dua kalimat pendek di bawah judul. Bukan paragraf — kartunya sempit."
        galat={galat.desc}
      >
        <textarea
          value={isi.desc}
          onChange={(e) => ubah("desc", e.target.value)}
        />
      </Isian>

      <fieldset>
        <legend>Ilustrasi</legend>
        {PROCESS_GLYPH_KEYS.map((kunci) => (
          <div
            className={`pilihan${isi.glyph === kunci ? " terpilih" : ""}`}
            key={kunci}
          >
            <input
              type="radio"
              id={`ilustrasi-proses-${kunci}`}
              name="ilustrasi-proses"
              checked={isi.glyph === kunci}
              onChange={() => ubah("glyph", kunci)}
            />
            <div>
              <label htmlFor={`ilustrasi-proses-${kunci}`}>
                {NAMA_ILUSTRASI[kunci]}
              </label>
              <span className="keterangan">{JELAS_ILUSTRASI[kunci]}</span>
            </div>
          </div>
        ))}
        {galat.glyph ? <p className="galat">{galat.glyph}</p> : null}
      </fieldset>

      {/* Dua hal yang tidak terbaca dari daftar radio di atas: gambarnya
          terbatas enam dan tidak bisa diunggah, dan gambar boleh dipakai dua
          langkah sekaligus. Yang kedua sengaja dibolehkan — melarangnya
          membuat menukar gambar dua langkah mustahil tanpa memarkir salah
          satunya di gambar ketiga dulu. */}
      <p className="petunjuk">
        Gambarnya digambar langsung oleh situs (garis yang menggores sendiri
        saat kartunya masuk layar), jadi pilihannya tetap enam ini — tidak ada
        unggah gambar di sini. Dua langkah boleh memakai ilustrasi yang sama.
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
              id={`status-proses-${pilihan.nilai}`}
              name="status-proses"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-proses-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar langkah — "yang mana lebih dulu" — dan di form satu
          langkah tidak ada pembandingnya. */}
      <p className="petunjuk">
        Urutan langkah — beserta nomor 01, 02, … yang tercetak di kartunya —
        diatur dari daftar langkah, lewat tombol Naikkan/Turunkan.
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

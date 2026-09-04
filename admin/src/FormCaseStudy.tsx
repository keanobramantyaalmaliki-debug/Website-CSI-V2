/**
 * Form satu cerita "Case Studies".
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateCaseStudy.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  descParagraphs,
  normalizeDesc,
  validateCaseStudy,
  type CaseStudyFieldErrors,
  type CaseStudyInput,
} from "@shared/validateCaseStudy";

import {
  ambilSatuCaseStudy,
  buatCaseStudy,
  simpanCaseStudy,
  type CaseStudyRecord,
} from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { DaftarTeks, Isian, Kabar } from "./ui";

const KOSONG: CaseStudyInput = {
  title: "",
  client: "",
  year: "",
  industry: "",
  scope: [],
  outcome: "",
  quote: "",
  desc: "",
  image: "",
  state: "draft",
};

const STATUS: { nilai: CaseStudyInput["state"]; nama: string; jelas: string }[] = [
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
      "Tampil sebagai satu blok cerita di halaman Work, setelah kamu menekan Publish.",
  },
];

/** `CaseStudyRecord` (dari server) → `CaseStudyInput` (yang diisi form). Kolom
 *  yang cuma urusan panel — kapan diubah, kapan dipublish, urutan — sengaja
 *  tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(study: CaseStudyRecord): CaseStudyInput {
  return {
    title: study.title,
    client: study.client,
    year: study.year,
    industry: study.industry,
    scope: study.scope,
    outcome: study.outcome,
    quote: study.quote,
    desc: study.desc,
    image: study.image,
    state: study.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim.
 *
 *  `desc` tidak di-`trim()` biasa melainkan lewat `normalizeDesc()`: yang
 *  dirapikan bukan cuma ujungnya tapi juga jeda antar paragraf — dan fungsinya
 *  sama persis dengan yang dipakai server saat menyimpan, supaya jumlah
 *  paragraf yang diperiksa form sama dengan yang akhirnya tersimpan. */
function rapikan(isi: CaseStudyInput): CaseStudyInput {
  return {
    ...isi,
    title: isi.title.trim(),
    client: isi.client.trim(),
    year: isi.year.trim(),
    industry: isi.industry.trim(),
    scope: isi.scope.map((s) => s.trim()).filter(Boolean),
    outcome: isi.outcome.trim(),
    quote: isi.quote.trim(),
    desc: normalizeDesc(isi.desc),
    image: isi.image.trim(),
  };
}

export function FormCaseStudy({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<CaseStudyInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<CaseStudyFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuCaseStudy(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.study));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof CaseStudyInput>(
    kunci: K,
    nilai: CaseStudyInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateCaseStudy(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null
        ? await buatCaseStudy(bersih)
        : await simpanCaseStudy(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.study.title}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat case study…</p>;

  /* Dihitung dari isi yang SUDAH dirapikan, bukan dari teks mentahnya: itu yang
     nanti dilihat pengunjung, dan angka yang menghitung baris kosong akan
     menyesatkan justru saat editor menekan Enter beberapa kali. */
  const jumlahParagraf = descParagraphs(isi.desc).length;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua case study
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Case study baru" : `Ubah: ${isi.title || "(tanpa judul)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Judul"
        petunjuk="Judul besar di atas gambar. Contoh: Citizen Service Portal."
        galat={galat.title}
      >
        <input
          type="text"
          value={isi.title}
          onChange={(e) => ubah("title", e.target.value)}
        />
      </Isian>

      <Isian
        label="Klien"
        petunjuk="Muncul dua kali: di baris kecil atas gambar, dan di kaki cerita. Contoh: Regional Government."
        galat={galat.client}
      >
        <input
          type="text"
          value={isi.client}
          onChange={(e) => ubah("client", e.target.value)}
        />
      </Isian>

      <Isian
        label="Tahun"
        /* Teks bebas dengan sengaja — pekerjaan yang melewati pergantian tahun
           tetap boleh ditulis apa adanya. */
        petunjuk="Boleh satu tahun atau rentang. Contoh: 2024, atau 2023–2024."
        galat={galat.year}
      >
        <input
          type="text"
          value={isi.year}
          onChange={(e) => ubah("year", e.target.value)}
        />
      </Isian>

      <Isian
        label="Sektor"
        petunjuk="Bidang kliennya, dicetak di baris yang sama dengan nama klien. Contoh: Public Sector."
        galat={galat.industry}
      >
        <input
          type="text"
          value={isi.industry}
          onChange={(e) => ubah("industry", e.target.value)}
        />
      </Isian>

      <PemilihFoto
        nilai={isi.image}
        ubah={(path) => ubah("image", path)}
        galat={galat.image}
        label="Gambar cerita"
        petunjuk="Gambar besar yang sekaligus jadi tombol pembuka cerita, jadi wajib ada untuk cerita Live. Gambar yang diunggah otomatis dikecilkan, tidak perlu diperkecil sendiri dulu."
      />

      <Isian
        label="Hasil"
        /* Berbeda dengan proyek: di sana boleh kosong, di sini tidak. Barisnya
           dicetak tebal di antara judul dan tombol "Read the full story", dan
           tanpa isi yang tayang adalah ruang kosong yang terbaca seperti
           halaman rusak. */
        petunjuk="Satu baris angka atau capaian, dicetak tebal di atas gambar. Contoh: 67% faster turnaround."
        galat={galat.outcome}
      >
        <input
          type="text"
          value={isi.outcome}
          onChange={(e) => ubah("outcome", e.target.value)}
        />
      </Isian>

      <Isian
        label="Kutipan pembuka"
        /* ⚠️ Ini bukan testimoni. Kalimat petunjuknya sengaja menyebut itu:
           isian bernama "kutipan" akan menarik pujian klien kalau tidak
           dijelaskan, dan testimoni bernama tempatnya di halaman Services. */
        petunjuk="Satu kalimat MASALAH yang dihadapi klien, tanpa nama siapa pun, bukan pujian untuk Cogniti. Muncul paling atas begitu cerita dibuka."
        galat={galat.quote}
      >
        <textarea
          rows={3}
          value={isi.quote}
          onChange={(e) => ubah("quote", e.target.value)}
        />
      </Isian>

      <Isian
        label="Cerita"
        petunjuk="Uraian lengkapnya. Pisahkan paragraf dengan satu baris kosong, biasanya dua paragraf: latar masalahnya, lalu apa yang dikerjakan dan hasilnya."
        galat={galat.desc}
      >
        <textarea
          rows={12}
          value={isi.desc}
          onChange={(e) => ubah("desc", e.target.value)}
        />
        {/* Jumlah paragraf ditampilkan karena pemisahnya TIDAK terlihat: satu
            Enter dan dua Enter tampak nyaris sama di kotak ini, tapi yang
            pertama tidak memulai paragraf baru di situs. */}
        <p className="petunjuk">
          {jumlahParagraf === 0
            ? "Belum ada isi."
            : `${jumlahParagraf} paragraf akan tayang.`}
        </p>
      </Isian>

      <DaftarTeks
        label="Lingkup pekerjaan"
        petunjuk="Label kecil di kaki cerita, bagian apa saja yang dikerjakan. Tiga sudah cukup."
        galat={galat.scope}
        nilai={isi.scope}
        ubah={(baru) => ubah("scope", baru)}
        contoh="Web Platform"
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
              id={`status-case-${pilihan.nilai}`}
              name="status-case"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-case-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form — alasan yang sama seperti di form
          proyek: ia hanya bisa dilihat sebagai hubungan antar cerita. */}
      <p className="petunjuk">
        Urutan cerita diatur dari daftar case study, lewat tombol
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

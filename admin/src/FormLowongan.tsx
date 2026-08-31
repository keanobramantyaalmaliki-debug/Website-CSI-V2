/**
 * Form satu lowongan — semuanya di satu halaman, tanpa wizard bertahap.
 *
 * Satu halaman dipilih karena isian-isiannya saling menjelaskan: status
 * menentukan mana yang wajib, dan "punya halaman sendiri" menentukan ada
 * tidaknya seluruh blok dua bahasa di bawah. Dipecah jadi beberapa langkah,
 * hubungan itu hilang dan editor baru tahu ada yang kurang di langkah terakhir.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateJob.ts` yang
 * sama persis dipakai server. Yang dilakukan form cuma menjalankannya lebih
 * dulu supaya galatnya muncul tanpa perlu menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import { slugify, type JobCopy, type JobLang } from "@shared/job";
import {
  validateJob,
  type JobFieldErrors,
  type JobInput,
} from "@shared/validateJob";

import {
  ambilSatuLowongan,
  buatLowongan,
  simpanLowongan,
  type JobRecord,
} from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { DaftarTeks, Isian, Kabar } from "./ui";

const KOSONG: JobInput = {
  slug: "",
  title: "",
  department: "",
  state: "draft",
  overview: "",
  photo: "",
  skills: [""],
  askGithub: false,
  detail: null,
};

const COPY_KOSONG: JobCopy = {
  intro: "",
  responsibilities: [""],
  qualifications: [""],
};

const STATUS: { nilai: JobInput["state"]; nama: string; jelas: string }[] = [
  {
    nilai: "draft",
    nama: "Draf",
    jelas:
      "Belum terlihat pengunjung. Bisa disimpan meski isinya belum lengkap.",
  },
  {
    nilai: "open",
    nama: "Tayang",
    jelas: "Terlihat di halaman Careers dan menerima lamaran.",
  },
  {
    nilai: "closed",
    nama: "Ditutup",
    jelas:
      "Masih terlihat di halaman Careers, tapi barisnya abu-abu dan tidak bisa dilamar.",
  },
];

const BAHASA: { nilai: JobLang; nama: string }[] = [
  { nilai: "en", nama: "Inggris" },
  { nilai: "id", nama: "Indonesia" },
];

export function FormLowongan({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<JobInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<JobFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);
  const [bahasa, setBahasa] = useState<JobLang>("id");
  /** Slug ikut judul sampai editor menyuntingnya sendiri. */
  const [slugManual, setSlugManual] = useState(id !== null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuLowongan(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.job));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof JobInput>(kunci: K, nilai: JobInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  function ubahJudul(judul: string) {
    setIsi((lama) => ({
      ...lama,
      title: judul,
      slug: slugManual ? lama.slug : slugify(judul),
    }));
  }

  function ubahCopy(lang: JobLang, bagian: Partial<JobCopy>) {
    setIsi((lama) => {
      if (!lama.detail) return lama;
      return {
        ...lama,
        detail: { ...lama.detail, [lang]: { ...lama.detail[lang], ...bagian } },
      };
    });
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateJob(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      /* Pesannya sengaja tidak menyebut jumlah: yang berguna adalah tahu harus
         menggulir ke atas, bukan tahu angkanya. */
      setPesan("Ada isian yang belum benar — lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatLowongan(bersih) : await simpanLowongan(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.job.title}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat lowongan…</p>;

  const punyaHalaman = isi.detail !== null;
  const copy = isi.detail?.[bahasa] ?? COPY_KOSONG;

  return (
    <form onSubmit={simpan}>
      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Lowongan baru" : `Ubah: ${isi.title || "(tanpa judul)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Judul lowongan"
        petunjuk="Contoh: Full Stack Engineer."
        galat={galat.title}
      >
        <input
          type="text"
          value={isi.title}
          onChange={(e) => ubahJudul(e.target.value)}
        />
      </Isian>

      <Isian
        label="Departemen"
        petunjuk='Kolom "Type" di tabel Careers. Contoh: Engineering, Finance.'
        galat={galat.department}
      >
        <input
          type="text"
          value={isi.department}
          onChange={(e) => ubah("department", e.target.value)}
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
              id={`status-${pilihan.nilai}`}
              name="status"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-${pilihan.nilai}`}>{pilihan.nama}</label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      <Isian
        label="Ringkasan"
        petunjuk="Satu-dua kalimat yang tampil di baris tabel Careers."
        galat={galat.overview}
      >
        <textarea
          value={isi.overview}
          onChange={(e) => ubah("overview", e.target.value)}
        />
      </Isian>

      <PemilihFoto
        nilai={isi.photo}
        ubah={(path) => ubah("photo", path)}
        galat={galat.photo}
      />

      <DaftarTeks
        label="Keahlian"
        petunjuk="Tampil sebagai daftar di lowongan, sekaligus jadi pilihan centang di form lamaran."
        contoh="Contoh: React"
        galat={galat.skills}
        nilai={isi.skills}
        ubah={(baru) => ubah("skills", baru)}
      />

      <div className="pilihan">
        <input
          type="checkbox"
          id="github"
          checked={isi.askGithub}
          onChange={(e) => ubah("askGithub", e.target.checked)}
        />
        <div>
          <label htmlFor="github">Tanyakan tautan GitHub di form lamaran</label>
          <span className="keterangan">
            Nyalakan untuk lowongan teknis saja. Untuk posisi non-teknis, isian
            ini cuma membingungkan pelamar.
          </span>
        </div>
      </div>

      <fieldset>
        <legend>Halaman lowongan</legend>
        <div className="pilihan">
          <input
            type="checkbox"
            id="punya-halaman"
            checked={punyaHalaman}
            onChange={(e) =>
              ubah(
                "detail",
                e.target.checked
                  ? { en: { ...COPY_KOSONG }, id: { ...COPY_KOSONG } }
                  : null,
              )
            }
          />
          <div>
            <label htmlFor="punya-halaman">
              Lowongan ini punya halaman sendiri
            </label>
            <span className="keterangan">
              Kalau dicentang, barisnya di tabel Careers jadi tautan ke halaman
              penuh. Kalau tidak, isinya cukup terbuka di tempat saat baris
              diklik.
            </span>
          </div>
        </div>

        {punyaHalaman ? (
          <>
            <p className="petunjuk">
              Halaman lowongan punya tombol ganti bahasa, jadi{" "}
              <strong>kedua bahasa harus diisi</strong>. Pengunjung yang menekan
              tombol itu tidak boleh mendarat di halaman kosong.
            </p>

            <div className="tab">
              {BAHASA.map((b) => (
                <button
                  type="button"
                  key={b.nilai}
                  className={bahasa === b.nilai ? "aktif" : ""}
                  onClick={() => setBahasa(b.nilai)}
                >
                  {b.nama}
                  {galat[b.nilai === "en" ? "detail_en" : "detail_id"]
                    ? " (ada yang kurang)"
                    : ""}
                </button>
              ))}
            </div>

            <Isian
              label="Paragraf pembuka"
              petunjuk="Kalimat sambutan di bagian atas halaman lowongan."
            >
              <textarea
                value={copy.intro}
                onChange={(e) => ubahCopy(bahasa, { intro: e.target.value })}
              />
            </Isian>

            <DaftarTeks
              label="Apa yang akan kamu kerjakan"
              contoh="Satu tugas per baris"
              panjang
              nilai={copy.responsibilities}
              ubah={(baru) => ubahCopy(bahasa, { responsibilities: baru })}
            />

            <DaftarTeks
              label="Kamu cocok untuk posisi ini kalau"
              contoh="Satu syarat per baris"
              panjang
              nilai={copy.qualifications}
              ubah={(baru) => ubahCopy(bahasa, { qualifications: baru })}
            />

            {galat.detail_en ? <p className="galat">{galat.detail_en}</p> : null}
            {galat.detail_id ? <p className="galat">{galat.detail_id}</p> : null}
          </>
        ) : null}
      </fieldset>

      <details>
        <summary>Pengaturan lanjutan</summary>
        <Isian
          label="Alamat halaman"
          petunjuk={`Bagian akhir alamat: cogniti.id/careers/${isi.slug || "…"}. Terisi otomatis dari judul — ubah hanya kalau memang perlu, karena tautan lama ke alamat sebelumnya akan mati.`}
          galat={galat.slug}
        >
          <input
            type="text"
            value={isi.slug}
            onChange={(e) => {
              setSlugManual(true);
              ubah("slug", e.target.value);
            }}
          />
        </Isian>
      </details>

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

/** Baris kosong yang ditinggalkan editor dibuang sebelum divalidasi — bukan
 *  ditolak. Menekan "+ Tambah" lalu berubah pikiran bukan kesalahan. */
function rapikan(isi: JobInput): JobInput {
  const bersihkan = (daftar: string[]) =>
    daftar.map((t) => t.trim()).filter(Boolean);

  return {
    ...isi,
    title: isi.title.trim(),
    department: isi.department.trim(),
    overview: isi.overview.trim(),
    slug: isi.slug.trim(),
    skills: bersihkan(isi.skills),
    detail: isi.detail
      ? {
          en: {
            intro: isi.detail.en.intro.trim(),
            responsibilities: bersihkan(isi.detail.en.responsibilities),
            qualifications: bersihkan(isi.detail.en.qualifications),
          },
          id: {
            intro: isi.detail.id.intro.trim(),
            responsibilities: bersihkan(isi.detail.id.responsibilities),
            qualifications: bersihkan(isi.detail.id.qualifications),
          },
        }
      : null,
  };
}

/** Baris database → isian form. Daftar kosong diberi satu baris kosong supaya
 *  ada tempat mengetik tanpa harus menekan "+ Tambah" lebih dulu. */
function keInput(job: JobRecord): JobInput {
  const isiDaftar = (daftar: string[]) => (daftar.length ? daftar : [""]);

  return {
    slug: job.slug,
    title: job.title,
    department: job.department,
    state: job.state,
    overview: job.overview,
    photo: job.photo,
    skills: isiDaftar(job.skills),
    askGithub: job.askGithub,
    detail: job.detail
      ? {
          en: {
            intro: job.detail.en.intro,
            responsibilities: isiDaftar(job.detail.en.responsibilities),
            qualifications: isiDaftar(job.detail.en.qualifications),
          },
          id: {
            intro: job.detail.id.intro,
            responsibilities: isiDaftar(job.detail.id.responsibilities),
            qualifications: isiDaftar(job.detail.id.qualifications),
          },
        }
      : null,
  };
}

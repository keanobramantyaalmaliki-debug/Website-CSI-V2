/**
 * Form satu proyek "Selected Work".
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateWorkProject.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  validateWorkProject,
  type WorkProjectFieldErrors,
  type WorkProjectInput,
} from "@shared/validateWorkProject";

import {
  ambilSatuProyek,
  buatProyek,
  simpanProyek,
  type WorkProjectRecord,
} from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { DaftarTeks, Isian, Kabar } from "./ui";

const KOSONG: WorkProjectInput = {
  title: "",
  client: "",
  year: "",
  tags: [],
  image: "",
  outcome: "",
  state: "draft",
};

const STATUS: { nilai: WorkProjectInput["state"]; nama: string; jelas: string }[] = [
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
      "Tampil sebagai satu kartu di halaman Work, setelah kamu menekan Publish.",
  },
];

/** `WorkProjectRecord` (dari server) → `WorkProjectInput` (yang diisi form).
 *  Kolom yang cuma urusan panel — kapan diubah, kapan dipublish, urutan —
 *  sengaja tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(project: WorkProjectRecord): WorkProjectInput {
  return {
    title: project.title,
    client: project.client,
    year: project.year,
    tags: project.tags,
    image: project.image,
    outcome: project.outcome,
    state: project.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. Nama "Data Platform "
 *  dan "Data Platform" adalah nama yang sama bagi pembaca, tapi bukan bagi
 *  pemeriksa nama-kembar di server. Baris label yang tinggal kosong dibuang
 *  diam-diam — menekan "+ Tambah" lalu berubah pikiran bukan kesalahan yang
 *  perlu dimarahi. */
function rapikan(isi: WorkProjectInput): WorkProjectInput {
  return {
    ...isi,
    title: isi.title.trim(),
    client: isi.client.trim(),
    year: isi.year.trim(),
    tags: isi.tags.map((t) => t.trim()).filter(Boolean),
    image: isi.image.trim(),
    outcome: isi.outcome.trim(),
  };
}

export function FormProyek({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<WorkProjectInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<WorkProjectFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuProyek(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.project));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof WorkProjectInput>(
    kunci: K,
    nilai: WorkProjectInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateWorkProject(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatProyek(bersih) : await simpanProyek(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.project.title}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat proyek…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua proyek
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Proyek baru" : `Ubah: ${isi.title || "(tanpa nama)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Nama proyek"
        petunjuk="Judul besar di kartu. Contoh: Citizen Service Portal."
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
        petunjuk="Nama klien atau sektornya, dicetak kecil di bawah judul. Contoh: Regional Government."
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
        /* Ditulis sebagai teks bebas dengan sengaja — pekerjaan yang melewati
           pergantian tahun tetap boleh ditulis apa adanya. */
        petunjuk="Boleh satu tahun atau rentang. Contoh: 2024, atau 2023–2024."
        galat={galat.year}
      >
        <input
          type="text"
          value={isi.year}
          onChange={(e) => ubah("year", e.target.value)}
        />
      </Isian>

      <DaftarTeks
        label="Label"
        petunjuk="Kata kunci kecil di bawah kartu, teknologi atau jenis pekerjaannya. Tiga sudah cukup."
        galat={galat.tags}
        nilai={isi.tags}
        ubah={(baru) => ubah("tags", baru)}
        contoh="React"
      />

      <PemilihFoto
        nilai={isi.image}
        ubah={(path) => ubah("image", path)}
        galat={galat.image}
        label="Gambar proyek"
        petunjuk="Mengisi seluruh kartu di halaman Work, jadi wajib ada untuk proyek Live. Gambar yang diunggah otomatis dikecilkan, tidak perlu diperkecil sendiri dulu."
      />

      <Isian
        label="Hasil"
        petunjuk="Satu baris angka atau capaian, muncul di kartu yang sedang terbuka. Contoh: 2.3M citizens served. Boleh dikosongkan."
        galat={galat.outcome}
      >
        <input
          type="text"
          value={isi.outcome}
          onChange={(e) => ubah("outcome", e.target.value)}
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
              id={`status-proyek-${pilihan.nilai}`}
              name="status-proyek"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-proyek-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar kartu — "yang mana lebih dulu" — dan di form satu
          proyek tidak ada pembandingnya. Tempatnya di daftar. */}
      <p className="petunjuk">
        Urutan kartu diatur dari daftar proyek, lewat tombol Naikkan/Turunkan.
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

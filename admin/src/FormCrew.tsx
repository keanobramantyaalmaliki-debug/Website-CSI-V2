/**
 * Form satu anggota crew.
 *
 * Sependek form nilai — empat isian, satu status, plus daftar tautan sosial —
 * jadi tidak ada bagian "lanjutan" dan tidak ada apa pun yang disembunyikan.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateCrew.ts` yang
 * sama persis dipakai server. Yang dilakukan form cuma menjalankannya lebih
 * dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  CREW_CATEGORIES,
  SOCIAL_PLATFORMS,
  type CrewSocial,
  type SocialPlatform,
} from "@shared/crew";
import {
  validateCrew,
  type CrewFieldErrors,
  type CrewInput,
} from "@shared/validateCrew";

import { ambilSatuCrew, buatCrew, simpanCrew, type CrewRecord } from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { Isian, Kabar } from "./ui";

const KOSONG: CrewInput = {
  name: "",
  role: "",
  category: "Developer",
  photo: "",
  social: [],
  state: "draft",
};

const STATUS: { nilai: CrewInput["state"]; nama: string; jelas: string }[] = [
  {
    nilai: "draft",
    nama: "Draft",
    jelas:
      "Belum terlihat pengunjung. Berguna untuk orang yang sudah tanda tangan tapi belum mulai, bisa disimpan meski isinya belum lengkap.",
  },
  {
    nilai: "live",
    nama: "Live",
    jelas:
      "Tampil di daftar nama dan dinding foto halaman People, setelah kamu menekan Publish.",
  },
];

/** `CrewRecord` (dari server) → `CrewInput` (yang diisi form). Kolom yang cuma
 *  urusan panel — kapan diubah, kapan dipublish — sengaja tidak ikut. */
function keInput(member: CrewRecord): CrewInput {
  return {
    name: member.name,
    role: member.role,
    category: member.category,
    photo: member.photo,
    social: member.social.map((s) => ({ ...s })),
    state: member.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Budi " dan "Budi"
 *  adalah orang yang sama bagi pembaca, tapi bukan bagi pemeriksa nama-kembar
 *  di server. */
function rapikan(isi: CrewInput): CrewInput {
  return {
    ...isi,
    name: isi.name.trim(),
    role: isi.role.trim(),
    photo: isi.photo.trim(),
    social: isi.social.map((s) => ({ ...s, url: s.url.trim() })),
  };
}

/** Platform yang belum dipakai baris lain — dipakai untuk menebak isi baris
 *  baru, supaya tombol "+ Tambah tautan" tidak langsung membuat kembaran yang
 *  ditolak pemeriksa. */
function platformKosong(social: CrewSocial[]): SocialPlatform {
  const terpakai = new Set(social.map((s) => s.platform));
  return SOCIAL_PLATFORMS.find((p) => !terpakai.has(p)) ?? SOCIAL_PLATFORMS[0];
}

export function FormCrew({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<CrewInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<CrewFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuCrew(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.member));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof CrewInput>(kunci: K, nilai: CrewInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  const ubahSosial = (i: number, baru: Partial<CrewSocial>) =>
    ubah(
      "social",
      isi.social.map((s, j) => (j === i ? { ...s, ...baru } : s)),
    );

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateCrew(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil = id === null ? await buatCrew(bersih) : await simpanCrew(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.member.name}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat anggota…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lowongan dan nilai. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua crew
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Anggota baru" : `Ubah: ${isi.name || "(tanpa nama)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Nama"
        petunjuk="Nama yang tercetak di daftar. Contoh: Bagas Nusantara Nabillah."
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
        petunjuk="Kolom tengah di daftar. Contoh: Senior Developer."
        galat={galat.role}
      >
        <input
          type="text"
          value={isi.role}
          onChange={(e) => ubah("role", e.target.value)}
        />
      </Isian>

      {/* Departemen sebagai pilihan tertutup, bukan teks bebas: daftarnya juga
          urutan tampil di halaman, jadi departemen yang diketik sendiri tidak
          punya tempat di sana dan barisnya hilang tanpa pesan apa pun.
          Menambah departemen tetap pekerjaan developer. */}
      <Isian
        label="Departemen"
        petunjuk="Menentukan di kelompok mana namanya muncul di halaman People."
        galat={galat.category}
      >
        <select
          value={isi.category}
          onChange={(e) =>
            ubah("category", e.target.value as CrewInput["category"])
          }
        >
          {CREW_CATEGORIES.map((kategori) => (
            <option key={kategori} value={kategori}>
              {kategori}
            </option>
          ))}
        </select>
      </Isian>

      {/* Foto TIDAK wajib, beda dengan lowongan: kotak tanpa foto punya
          tampilan sendiri yang memang dirancang (ikon orang abu-abu). */}
      <PemilihFoto
        nilai={isi.photo}
        ubah={(path) => ubah("photo", path)}
        galat={galat.photo}
      />

      <div className={`isian${galat.social ? " bergalat" : ""}`}>
        <label>Tautan sosial</label>
        <p className="petunjuk">
          Muncul saat namanya disorot. Satu tautan per platform. Alamatnya harus
          diawali <code>https://</code> — tanpa itu tautannya mengarah ke dalam
          situs ini, bukan ke luar. Isi <code>#</code> kalau tautannya memang
          belum ada.
        </p>

        {isi.social.length === 0 ? (
          <p className="petunjuk">Belum ada tautan.</p>
        ) : null}

        {isi.social.map((tautan, i) => (
          <div className="baris" key={i}>
            <select
              value={tautan.platform}
              aria-label={`Platform tautan ${i + 1}`}
              onChange={(e) =>
                ubahSosial(i, { platform: e.target.value as SocialPlatform })
              }
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={tautan.url}
              placeholder="https://linkedin.com/in/nama"
              aria-label={`Alamat tautan ${i + 1}`}
              onChange={(e) => ubahSosial(i, { url: e.target.value })}
            />
            <button
              type="button"
              className="kecil"
              onClick={() =>
                ubah(
                  "social",
                  isi.social.filter((_, j) => j !== i),
                )
              }
              aria-label={`Hapus tautan ${i + 1}`}
            >
              Hapus
            </button>
          </div>
        ))}

        {isi.social.length < SOCIAL_PLATFORMS.length ? (
          <button
            type="button"
            className="kecil"
            onClick={() =>
              ubah("social", [
                ...isi.social,
                { platform: platformKosong(isi.social), url: "" },
              ])
            }
          >
            + Tambah tautan
          </button>
        ) : (
          <p className="petunjuk">
            Semua platform sudah terpakai ({SOCIAL_PLATFORMS.join(", ")}).
          </p>
        )}

        {galat.social ? <p className="galat">{galat.social}</p> : null}
      </div>

      <fieldset>
        <legend>Status</legend>
        {STATUS.map((pilihan) => (
          <div
            className={`pilihan${isi.state === pilihan.nilai ? " terpilih" : ""}`}
            key={pilihan.nilai}
          >
            <input
              type="radio"
              id={`status-crew-${pilihan.nilai}`}
              name="status-crew"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-crew-${pilihan.nilai}`}>{pilihan.nama}</label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

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

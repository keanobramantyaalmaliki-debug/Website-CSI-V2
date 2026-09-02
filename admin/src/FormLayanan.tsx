/**
 * Form satu layanan.
 *
 * Tidak ada pemilih foto: yang dirender situs cuma judulnya, sebagai teks
 * oversized di sabuk 3D. Dua isian sisanya — penjelasan dan rincian — tidak
 * pernah terlihat mata sama sekali; keduanya hidup di daftar `sr-only` di bawah
 * sabuk. Itu sebabnya petunjuk di bawah ini menyebut siapa yang membacanya:
 * dari dalam form, isian yang "tidak kelihatan efeknya" adalah isian yang
 * paling mudah dibiarkan kosong.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateService.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  validateService,
  type ServiceFieldErrors,
  type ServiceInput,
} from "@shared/validateService";

import {
  ambilSatuLayanan,
  buatLayanan,
  simpanLayanan,
  type ServiceRecord,
} from "./api";
import { DaftarTeks, Isian, Kabar } from "./ui";

const KOSONG: ServiceInput = {
  title: "",
  desc: "",
  subs: [],
  state: "draft",
};

const STATUS: { nilai: ServiceInput["state"]; nama: string; jelas: string }[] = [
  {
    nilai: "draft",
    nama: "Draft",
    jelas:
      "Belum terlihat pengunjung. Bisa disimpan meski penjelasannya belum ditulis — cukup namanya.",
  },
  {
    nilai: "live",
    nama: "Live",
    jelas:
      "Ikut berputar di sabuk halaman Services, setelah kamu menekan Publish.",
  },
];

/** `ServiceRecord` (dari server) → `ServiceInput` (yang diisi form). Kolom yang
 *  cuma urusan panel — kapan diubah, kapan dipublish, urutan — sengaja tidak
 *  ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(layanan: ServiceRecord): ServiceInput {
  return {
    title: layanan.title,
    desc: layanan.desc,
    subs: layanan.subs,
    state: layanan.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Cloud Solutions " dan
 *  "Cloud Solutions" adalah nama yang sama bagi pembaca, tapi bukan bagi
 *  pemeriksa nama-kembar di server. Baris rincian yang tinggal spasi dibuang
 *  seluruhnya — editor yang menekan "+ Tambah" lalu berpindah pikiran tidak
 *  sedang menulis rincian kosong, ia sedang membatalkan. */
function rapikan(isi: ServiceInput): ServiceInput {
  return {
    ...isi,
    title: isi.title.trim(),
    desc: isi.desc.trim(),
    subs: isi.subs.map((s) => s.trim()).filter((s) => s.length > 0),
  };
}

export function FormLayanan({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<ServiceInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<ServiceFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuLayanan(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.service));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof ServiceInput>(kunci: K, nilai: ServiceInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateService(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar — lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null ? await buatLayanan(bersih) : await simpanLayanan(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `Layanan ${hasil.data.service.title} tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat layanan…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lowongan. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua layanan
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Layanan baru" : `Ubah: ${isi.title || "(tanpa nama)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Nama layanan"
        /* Peringatan panjangnya ditulis di sini, bukan disimpan sampai galat
           muncul: judulnya dirender sebesar mungkin di sabuk 3D, jadi nama
           yang kepanjangan melipat sampai menyentuh label "Our Service" di
           celah tengah — akibat yang tidak kelihatan dari dalam form ini. */
        petunjuk="Nama yang tampil besar di sabuk berputar. Maksimal 60 karakter — nama yang panjang melipat jadi beberapa baris. Contoh: Cloud Solutions."
        galat={galat.title}
      >
        <input
          type="text"
          value={isi.title}
          onChange={(e) => ubah("title", e.target.value)}
        />
      </Isian>

      <Isian
        label="Penjelasan"
        petunjuk="Satu kalimat tentang layanan ini. Tidak tampil di layar, tapi inilah teks yang dibaca pembaca layar dan mesin pencari — jadi ia wajib diisi sebelum layanannya bisa Live."
        galat={galat.desc}
      >
        <textarea
          value={isi.desc}
          onChange={(e) => ubah("desc", e.target.value)}
        />
      </Isian>

      <DaftarTeks
        label="Rincian"
        petunjuk="Hal-hal yang tercakup, beberapa kata masing-masing. Ikut dibacakan di belakang penjelasan, dipisah koma. Boleh dikosongkan."
        galat={galat.subs}
        nilai={isi.subs}
        ubah={(baru) => ubah("subs", baru)}
        contoh="Cloud Migration"
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
              id={`status-layanan-${pilihan.nilai}`}
              name="status-layanan"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-layanan-${pilihan.nilai}`}>
                {pilihan.nama}
              </label>
              <span className="keterangan">{pilihan.jelas}</span>
            </div>
          </div>
        ))}
        {galat.state ? <p className="galat">{galat.state}</p> : null}
      </fieldset>

      {/* Urutan sengaja TIDAK ada di form. Ia hanya bisa dilihat sebagai
          hubungan antar layanan, dan di form satu layanan tidak ada
          pembandingnya. Tempatnya di daftar, lewat Naikkan/Turunkan. */}
      <p className="petunjuk">
        Urutan layanan diatur dari daftar layanan, lewat tombol
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

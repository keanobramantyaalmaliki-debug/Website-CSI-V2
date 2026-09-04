/**
 * Form satu kartu deployment.
 *
 * Empat isian dan satu status. Yang perlu dijelaskan ke editor bukan cara
 * mengisinya melainkan ke mana isinya pergi: deployment tidak punya halaman
 * sendiri — ia satu kartu di grid halaman Home, dan tiap isian di sini muncul
 * di tempat yang berbeda pada kartu itu.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateDeployment.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 *
 * Satu aturan sengaja TIDAK ikut dijalankan di depan: pasangan sektor+wilayah
 * yang sudah dipakai. Ia butuh melihat seluruh daftar, sementara form ini cuma
 * memegang satu baris — jadi penjaganya di server, dan jawabannya mendarat di
 * isian Wilayah lewat `hasil.errors`. Mendaratkannya di Wilayah, bukan Sektor,
 * juga disengaja: yang bentrok memang pasangannya, dan sektor yang sama boleh
 * dipakai lagi asal wilayahnya beda.
 */

import { useEffect, useState } from "react";
import {
  validateDeployment,
  type DeploymentFieldErrors,
  type DeploymentInput,
} from "@shared/validateDeployment";

import {
  ambilSatuDeployment,
  buatDeployment,
  simpanDeployment,
  type DeploymentRecord,
} from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { Isian, Kabar } from "./ui";

const KOSONG: DeploymentInput = {
  sector: "",
  region: "",
  desc: "",
  image: "",
  state: "draft",
};

const STATUS: { nilai: DeploymentInput["state"]; nama: string; jelas: string }[] =
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
        "Tampil sebagai satu kartu di halaman Home, setelah kamu menekan Publish.",
    },
  ];

/** `DeploymentRecord` (dari server) → `DeploymentInput` (yang diisi form).
 *  Kolom yang cuma urusan panel — kapan diubah, kapan dipublish, urutan —
 *  sengaja tidak ikut: urutan diubah dari daftar, bukan dari sini. */
function keInput(kartu: DeploymentRecord): DeploymentInput {
  return {
    sector: kartu.sector,
    region: kartu.region,
    desc: kartu.desc,
    image: kartu.image,
    state: kartu.state,
  };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim. "Logistics " dan
 *  "Logistics" adalah sektor yang sama bagi pembaca, tapi bukan bagi pemeriksa
 *  pasangan-kembar di server. */
function rapikan(isi: DeploymentInput): DeploymentInput {
  return {
    ...isi,
    sector: isi.sector.trim(),
    region: isi.region.trim(),
    desc: isi.desc.trim(),
    image: isi.image.trim(),
  };
}

export function FormDeployment({
  id,
  onSelesai,
  onBatal,
}: {
  id: string | null;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<DeploymentInput>(KOSONG);
  const [memuat, setMemuat] = useState(id !== null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<DeploymentFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    let batal = false;
    ambilSatuDeployment(id).then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      setIsi(keInput(hasil.data.deployment));
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof DeploymentInput>(
    kunci: K,
    nilai: DeploymentInput[K],
  ) => setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateDeployment(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil =
      id === null
        ? await buatDeployment(bersih)
        : await simpanDeployment(id, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `"${hasil.data.deployment.sector}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat kartu…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form yang lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua deployment
      </button>

      <h2 style={{ marginTop: 0 }}>
        {id === null ? "Kartu baru" : `Ubah: ${isi.sector || "(tanpa sektor)"}`}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <Isian
        label="Sektor"
        petunjuk="Tulisan besar di kartu. Contoh: Logistics. Pendek lebih baik, lebih dari dua baris mendorong isi kartu keluar kotaknya."
        galat={galat.sector}
      >
        <input
          type="text"
          value={isi.sector}
          onChange={(e) => ubah("sector", e.target.value)}
        />
      </Isian>

      <Isian
        label="Wilayah"
        petunjuk="Ikut satu baris dengan nomor kartunya, jadi “Indonesia” tampil sebagai “03 · Indonesia”. Contoh lain: International, Southeast Asia."
        galat={galat.region}
      >
        <input
          type="text"
          value={isi.region}
          onChange={(e) => ubah("region", e.target.value)}
        />
      </Isian>

      {/* Sektor kembar itu sah, dan kalau tidak dikatakan editor akan
          menyangka sebaliknya — lalu mengarang nama sektor palsu supaya bisa
          mencatat dua wilayah. */}
      <p className="petunjuk">
        Sektor yang sama boleh dipakai lebih dari sekali asal wilayahnya
        berbeda: “Logistics · Indonesia” dan “Logistics · International” adalah
        dua kartu yang sah. Yang tidak boleh persis sama adalah pasangan
        sektor + wilayahnya.
      </p>

      <Isian
        label="Keterangan"
        petunjuk="Satu-dua kalimat di badan kartu, di bawah sektornya. Bukan paragraf, kartunya tidak ikut memanjang, teks yang berlebih mendorong judulnya keluar."
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
        label="Foto kartu"
        petunjuk="Foto latar kartu, abu-abu saat diam, berwarna saat disorot kursor (di HP: saat kartunya masuk layar). Ambil yang lanskap. Gambar yang diunggah otomatis dikecilkan."
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
              id={`status-deployment-${pilihan.nilai}`}
              name="status-deployment"
              checked={isi.state === pilihan.nilai}
              onChange={() => ubah("state", pilihan.nilai)}
            />
            <div>
              <label htmlFor={`status-deployment-${pilihan.nilai}`}>
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
          kartu tidak ada pembandingnya. */}
      <p className="petunjuk">
        Urutan kartu, beserta nomor 01, 02, … yang tercetak di situs, diatur
        dari daftar deployment, lewat tombol Naikkan/Turunkan.
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

/**
 * Layar Footer — form langsung, tanpa daftar di depannya.
 *
 * Bentuknya menyalin `FormVisi`: entitas tunggal, jadi daftar berisi satu baris
 * yang harus diklik dulu untuk sampai ke formnya cuma satu ketukan tambahan
 * yang tidak memberi tahu apa pun. Yang ikut hilang bersama daftar itu,
 * semuanya disengaja — tidak ada "Baru" (barisnya sudah ada), tidak ada
 * "Hapus" (kaki halaman ikut setiap halaman situs), tidak ada pilihan
 * Draft/Live (kaki halaman tidak punya keadaan "disimpan tapi belum
 * terlihat"; yang memisahkan simpan dari tayang cuma tombol Publish).
 *
 * Yang TIDAK ada di `FormVisi` dan ada di sini: daftar tautan sosial. Ia
 * bagian dari isian yang sama — tidak punya endpoint, tombol simpan, atau
 * urutan tersendiri — dan ikut terkirim utuh setiap kali Simpan ditekan.
 * Urutan barisnya di sini persis urutan tampilnya di situs, dari kiri ke
 * kanan.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateFooter.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import type { FooterSocial } from "@shared/footer";
import {
  validateFooter,
  type FooterFieldErrors,
  type FooterInput,
} from "@shared/validateFooter";

import { ambilFooter, simpanFooter, type FooterRecord } from "./api";
import { Isian, Kabar } from "./ui";

const KOSONG: FooterInput = {
  email: "",
  address: "",
  copyright: "",
  socials: [],
};

/** `FooterRecord` (dari server) → `FooterInput` (yang diisi form). Kolom yang
 *  cuma urusan panel — kapan diubah, kapan dipublish — sengaja tidak ikut. */
function keInput(f: FooterRecord): FooterInput {
  return {
    email: f.email,
    address: f.address,
    copyright: f.copyright,
    /* Disalin, bukan dipakai langsung: `setIsi` berikutnya akan menulis ke
       larik ini, dan larik yang sama juga dipegang objek balasan server. */
    socials: f.socials.map((s) => ({ ...s })),
  };
}

/**
 * Buang spasi di ujung sebelum diperiksa dan dikirim, sama seperti form lain.
 *
 * Baris tautan yang KEDUANYA kosong dibuang di sini, bukan ditolak: itu baris
 * yang baru saja ditambahkan editor lalu ditinggalkan, dan menolak simpan
 * karenanya berarti dia harus menekan "Hapus" pada baris yang belum pernah dia
 * isi. Baris yang terisi separuh TETAP lolos ke validator — separuh terisi
 * artinya dia bermaksud mengisinya, dan diam-diam membuangnya akan menghapus
 * pekerjaannya.
 */
function rapikan(isi: FooterInput): FooterInput {
  return {
    email: isi.email.trim(),
    address: isi.address.trim(),
    copyright: isi.copyright.trim(),
    socials: isi.socials
      .map((s) => ({ label: s.label.trim(), href: s.href.trim() }))
      .filter((s) => s.label !== "" || s.href !== ""),
  };
}

export function FormFooter({ onSelesai }: { onSelesai: (pesan: string) => void }) {
  const [isi, setIsi] = useState<FooterInput>(KOSONG);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<FooterFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    void ambilFooter().then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      /* `footer: null` = barisnya belum ada di database (belum di-seed).
         Bukan galat: formnya dibuka kosong supaya editor bisa mengisinya
         untuk pertama kali, dan `PUT`-nya nanti yang membuat barisnya. */
      if (hasil.data.footer) setIsi(keInput(hasil.data.footer));
    });
    return () => {
      batal = true;
    };
  }, []);

  const ubah = <K extends keyof FooterInput>(kunci: K, nilai: FooterInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  const ubahSosial = (i: number, tambalan: Partial<FooterSocial>) =>
    ubah(
      "socials",
      isi.socials.map((lama, j) => (j === i ? { ...lama, ...tambalan } : lama)),
    );

  const tukarSosial = (i: number, arah: -1 | 1) => {
    const j = i + arah;
    if (j < 0 || j >= isi.socials.length) return;
    const baru = [...isi.socials];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    ubah("socials", baru);
  };

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateFooter(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil = await simpanFooter(bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    /* Isian dikembalikan ke bentuk BERSIHNYA. Tanpa ini, baris tautan kosong
       yang dibuang `rapikan()` tetap terlihat di layar sesudah "tersimpan" —
       editor lalu menekan Simpan lagi mengira ada yang belum masuk. */
    setIsi(bersih);
    onSelesai(
      "Kaki halaman tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.",
    );
  }

  if (memuat) return <p>Memuat kaki halaman…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Tanpa tombol "‹ Semua …" di atas seperti form berdaftar: tidak ada
          daftar untuk dituju, layar ini sendiri yang jadi halaman entitasnya.
          Jalan keluarnya lewat menu sisi. */}
      <h2 style={{ marginTop: 0 }}>Footer</h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <p className="petunjuk">
        Baris paling bawah di SEMUA halaman situs, termasuk halaman detail
        lowongan. Tidak bisa ditambah atau dihapus, yang bisa diubah isinya.
        Di layar HP surel dan alamat sengaja disembunyikan, jadi yang terlihat
        di sana cuma tautan sosial dan hak cipta.
      </p>

      <Isian
        label="Surel"
        petunjuk="Alamatnya saja, tanpa mailto:, situs yang membuatnya bisa diklik."
        galat={galat.email}
      >
        <input
          type="text"
          value={isi.email}
          placeholder="hello@cogniti.id"
          onChange={(e) => ubah("email", e.target.value)}
        />
      </Isian>

      <Isian
        label="Alamat"
        petunjuk="Alamat kantor, satu baris."
        galat={galat.address}
      >
        <input
          type="text"
          value={isi.address}
          placeholder="Jl. Kediri No.27, Tuban, Badung, Bali 80361"
          onChange={(e) => ubah("address", e.target.value)}
        />
      </Isian>

      <Isian
        label="Baris hak cipta"
        petunjuk="Tanpa tahun dan tanpa lambang ©, situs menambahkan “© tahun berjalan” sendiri di depannya, supaya tidak basi tiap 1 Januari."
        galat={galat.copyright}
      >
        <input
          type="text"
          value={isi.copyright}
          placeholder="Cognitiva Solusi Indonesia. All rights reserved."
          onChange={(e) => ubah("copyright", e.target.value)}
        />
      </Isian>

      {/* Bukan `DaftarTeks`: yang ini pasangan tulisan + alamat, bukan daftar
          teks tunggal. Susunannya menyalin editor tautan sosial di
          `FormCrew`, plus Naikkan/Turunkan — di sini urutannya BERARTI, ia
          urutan tautan dari kiri ke kanan di kaki halaman. */}
      <div className={`isian${galat.socials ? " bergalat" : ""}`}>
        <label>Tautan sosial</label>
        <p className="petunjuk">
          Urutannya urutan tampil, dari kiri ke kanan. Tulisannya dicetak apa
          adanya, isi <code>Instagram</code>, bukan alamatnya. Alamatnya harus
          diawali <code>https://</code>; tanpa itu tautannya mengarah ke dalam
          situs ini, bukan ke luar.
        </p>
        {/* Peringatan yang tidak muat di ringkasan beranda, dan yang paling
            mudah mengejutkan: daftar ini juga dipakai menu HP di navbar. */}
        <p className="petunjuk">
          Daftar ini dipakai dua tempat sekaligus: kaki halaman, dan menu di
          layar HP (tombol garis tiga di pojok kanan atas).
        </p>

        {isi.socials.length === 0 ? (
          <p className="petunjuk">
            Belum ada tautan. Kaki halamannya tetap tayang, cuma tanpa baris
            tautan.
          </p>
        ) : null}

        {isi.socials.map((tautan, i) => (
          <div className="baris" key={i}>
            <span className="nomor">{i + 1}.</span>
            <input
              type="text"
              value={tautan.label}
              placeholder="Instagram"
              aria-label={`Tulisan tautan ${i + 1}`}
              onChange={(e) => ubahSosial(i, { label: e.target.value })}
            />
            <input
              type="text"
              value={tautan.href}
              placeholder="https://www.instagram.com/…"
              aria-label={`Alamat tautan ${i + 1}`}
              onChange={(e) => ubahSosial(i, { href: e.target.value })}
            />
            <button
              type="button"
              className="kecil"
              onClick={() => tukarSosial(i, -1)}
              disabled={i === 0}
              aria-label={`Naikkan tautan ${i + 1}`}
            >
              Naikkan
            </button>
            <button
              type="button"
              className="kecil"
              onClick={() => tukarSosial(i, 1)}
              disabled={i === isi.socials.length - 1}
              aria-label={`Turunkan tautan ${i + 1}`}
            >
              Turunkan
            </button>
            <button
              type="button"
              className="kecil"
              onClick={() =>
                ubah(
                  "socials",
                  isi.socials.filter((_, j) => j !== i),
                )
              }
              aria-label={`Hapus tautan ${i + 1}`}
            >
              Hapus
            </button>
          </div>
        ))}

        {/* Tanpa batas jumlah: barisnya membungkus ke baris berikutnya, jadi
            tautan kesembilan tidak merusak apa pun. */}
        <button
          type="button"
          className="kecil"
          onClick={() => ubah("socials", [...isi.socials, { label: "", href: "" }])}
        >
          + Tambah tautan
        </button>

        {galat.socials ? <p className="galat">{galat.socials}</p> : null}
      </div>

      <div className="tombol-baris">
        <button type="submit" className="utama" disabled={menyimpan}>
          {menyimpan ? "Menyimpan…" : "Simpan"}
        </button>
        {/* Tanpa "Batal", alasan sama seperti `FormVisi`: tidak ada layar untuk
            kembali, dan tombol yang cuma memuat ulang isian yang sama akan
            terbaca sebagai "buang perubahan" padahal bukan itu yang dijanjikan
            di form lain. */}
      </div>
    </form>
  );
}

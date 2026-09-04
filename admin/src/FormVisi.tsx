/**
 * Layar Visi — form langsung, tanpa daftar di depannya.
 *
 * Satu-satunya layar entitas di panel ini yang bukan pasangan daftar+form,
 * dan itu mengikuti bentuk datanya: visi cuma satu baris. Daftar berisi satu
 * baris yang harus diklik dulu untuk sampai ke formnya adalah satu ketukan
 * tambahan yang tidak memberi tahu apa pun.
 *
 * Yang ikut hilang bersama daftar itu, semuanya disengaja: tidak ada tombol
 * "Baru" (barisnya sudah ada), tidak ada "Hapus" (seksinya tidak boleh
 * menghilang dari halaman depan), tidak ada Naikkan/Turunkan (tidak ada yang
 * bisa diurutkan), dan tidak ada pilihan Draft/Live — beda dari form lain,
 * kalimat visi tidak punya keadaan "disimpan tapi belum terlihat"; yang
 * memisahkan simpan dari tayang cuma tombol Publish, seperti biasa.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateVision.ts`
 * yang sama persis dipakai server. Yang dilakukan form cuma menjalankannya
 * lebih dulu supaya galatnya muncul tanpa menunggu perjalanan ke server.
 */

import { useEffect, useState } from "react";
import {
  validateVision,
  type VisionFieldErrors,
  type VisionInput,
} from "@shared/validateVision";

import { ambilVisi, simpanVisi, type VisionRecord } from "./api";
import { PemilihFoto } from "./PemilihFoto";
import { Isian, Kabar } from "./ui";

const KOSONG: VisionInput = { statement: "", photo: "" };

/** `VisionRecord` (dari server) → `VisionInput` (yang diisi form). Kolom yang
 *  cuma urusan panel — kapan diubah, kapan dipublish — sengaja tidak ikut. */
function keInput(v: VisionRecord): VisionInput {
  return { statement: v.statement, photo: v.photo };
}

/** Buang spasi di ujung sebelum diperiksa dan dikirim, sama seperti form lain.
 *  Di sini yang dijaga bukan judul-kembar melainkan hitungan panjang: kalimat
 *  yang diakhiri deretan spasi bisa lolos batas 400 tanpa alasan yang bisa
 *  dilihat editor. */
function rapikan(isi: VisionInput): VisionInput {
  return { statement: isi.statement.trim(), photo: isi.photo.trim() };
}

export function FormVisi({ onSelesai }: { onSelesai: (pesan: string) => void }) {
  const [isi, setIsi] = useState<VisionInput>(KOSONG);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<VisionFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    void ambilVisi().then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      /* `vision: null` = barisnya belum ada di database (belum di-seed).
         Bukan galat: formnya dibuka kosong supaya editor bisa mengisinya
         untuk pertama kali, dan `PUT`-nya nanti yang membuat barisnya. */
      if (hasil.data.vision) setIsi(keInput(hasil.data.vision));
    });
    return () => {
      batal = true;
    };
  }, []);

  const ubah = <K extends keyof VisionInput>(kunci: K, nilai: VisionInput[K]) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const bersih = rapikan(isi);
    const masalah = validateVision(bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil = await simpanVisi(bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      "Visi tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.",
    );
  }

  if (memuat) return <p>Memuat visi…</p>;

  return (
    <form onSubmit={simpan}>
      {/* Tanpa tombol "‹ Semua …" di atas seperti form lain: tidak ada daftar
          untuk dituju, layar ini sendiri yang jadi halaman entitasnya. Jalan
          keluarnya lewat menu sisi. */}
      <h2 style={{ marginTop: 0 }}>Visi</h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      <p className="petunjuk">
        Satu paragraf besar berikut satu foto, tepat sebelum bagian kontak di
        halaman depan. Tidak bisa ditambah atau dihapus, yang bisa diubah
        isinya.
      </p>

      <Isian
        label="Kalimat visi"
        petunjuk="Satu kalimat panjang, tercetak besar. Maksimal 400 huruf."
        galat={galat.statement}
      >
        <textarea
          value={isi.statement}
          onChange={(e) => ubah("statement", e.target.value)}
          rows={4}
        />
      </Isian>

      {/* Label & petunjuk ditimpa: bawaan pemilih ini menyebut halaman
          Careers, tempat ia lahir — kalimat itu salah alamat di halaman
          depan. */}
      <PemilihFoto
        nilai={isi.photo}
        ubah={(path) => ubah("photo", path)}
        galat={galat.photo}
        label="Foto"
        petunjuk="Foto lebar di bawah kalimatnya, menutup halaman depan sebelum bagian kontak. Melintang (16:9), foto tegak akan terpotong atas-bawah."
      />

      <div className="tombol-baris">
        <button type="submit" className="utama" disabled={menyimpan}>
          {menyimpan ? "Menyimpan…" : "Simpan"}
        </button>
        {/* Tanpa "Batal": tidak ada layar untuk kembali, dan tombol yang cuma
            memuat ulang isian yang sama akan terbaca sebagai "buang
            perubahan" padahal bukan itu yang dijanjikan di form lain. */}
      </div>
    </form>
  );
}

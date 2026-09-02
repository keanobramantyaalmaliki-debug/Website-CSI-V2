/**
 * Daftar langkah cara kerja — seksi "How We Work" di halaman Home.
 *
 * Bentuknya menyalin `DaftarIndustri.tsx`, karena dua sifat yang membuat
 * daftar itu beda dari daftar lain berlaku persis sama di sini:
 *
 * 1. URUTANNYA adalah isi, bukan tata letak. Ia alur kerja yang dibaca
 *    pengunjung dari atas ke bawah, SEKALIGUS penentu nomor "01"–"06" yang
 *    tercetak di sudut tiap kartu. Nomor itu tidak disimpan di mana pun — ia
 *    diturunkan dari posisi baris di sini.
 *
 * 2. Ada BATAS ATAS: enam. Bedanya dengan batas 13 industri, yang ini bukan
 *    geometri melainkan panjang halaman — "How We Work" sudah jadi seksi
 *    terpanjang di halaman depan — dan jumlah ilustrasi yang tersedia memang
 *    cuma enam. Servernya menolak yang ketujuh, tapi ditolak setelah mengisi
 *    seluruh form adalah cara paling menyebalkan untuk mengetahuinya, jadi
 *    angkanya ditulis di depan mata dan tombol "Tambah" ikut mati saat penuh.
 */

import { useState } from "react";

import { MAX_LIVE_PROCESS_STEPS } from "@shared/processStep";

import { hapusProses, urutkanProses, type ProcessStepRecord } from "./api";
import { NAMA_ILUSTRASI } from "./FormProses";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti daftar yang lain: nama status memakai nilai yang tersimpan di
   database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya
   arti lain di panel ini (sudah sampai ke pengunjung atau belum). */
const NAMA_STATUS: Record<ProcessStepRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarProses({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: ProcessStepRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<ProcessStepRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const tayang = daftar.filter((s) => s.state === "live").length;
  const penuh = tayang >= MAX_LIVE_PROCESS_STEPS;

  /**
   * Nomor yang tercetak di situs, per baris — dihitung dari baris yang TAYANG
   * saja, bukan dari nomor barisnya.
   *
   * Draf tidak ikut ke `content.json`, jadi ia tidak punya kartu dan tidak
   * memakan nomor. Satu draf yang nyempil di tengah akan membuat setiap nomor
   * di bawahnya meleset satu dari yang benar-benar dibaca pengunjung — persis
   * kolom yang paling dipercaya editor saat menata urutan. Draf sendiri
   * bernomor "—": ia memang belum punya.
   */
  let berjalan = 0;
  const nomor = daftar.map((langkah) =>
    langkah.state === "live" ? String(++berjalan).padStart(2, "0") : "—",
  );

  async function hapus(langkah: ProcessStepRecord) {
    setMenghapus(true);
    const hasil = await hapusProses(langkah.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Kartunya baru hilang dari situs setelah kamu menekan Publish.`,
    );
  }

  /**
   * Tukar posisi satu baris dengan tetangganya.
   *
   * Yang dikirim ke server adalah SELURUH daftar id dalam urutan barunya, bukan
   * "pindahkan yang ini ke atas": perintah relatif dijalankan terhadap urutan
   * yang mungkin sudah bukan urutan yang sedang dilihat — kalau ada orang kedua
   * yang ikut mengedit, hasilnya bukan urutan yang dimaksud siapa pun.
   */
  async function pindah(index: number, arah: -1 | 1) {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= daftar.length) return;

    const ids = daftar.map((s) => s.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanProses(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan langkah diubah — nomornya ikut berganti. Belum terlihat pengunjung sampai kamu menekan Publish.",
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>Cara kerja</h2>
        <button
          type="button"
          className="utama"
          onClick={onBaru}
          disabled={penuh}
          /* Tombolnya mati, bukan hilang: tombol yang lenyap terbaca sebagai
             panel rusak. `title` menjelaskan kenapa saat kursor berhenti di
             atasnya, kalimat di bawah menjelaskannya untuk yang tidak memakai
             kursor. */
          title={
            penuh
              ? `Sudah ada ${MAX_LIVE_PROCESS_STEPS} langkah yang tampil — itu batasnya.`
              : undefined
          }
        >
          + Tambah langkah
        </button>
      </div>

      {/* Dua kalimat, dua hal yang tidak bisa ditebak dari tabelnya sendiri:
          bahwa urutan di sini = urutan di situs BESERTA nomornya, dan bahwa
          ada langit-langit. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan langkah di seksi “How We Work” halaman
        Home, sekaligus nomor <strong>01</strong>–
        <strong>{String(Math.max(tayang, 1)).padStart(2, "0")}</strong> yang
        tercetak di sudut kartunya. Memindahkan baris ikut memindahkan
        nomornya; baris berstatus Draft tidak ikut bernomor karena kartunya
        belum ada.
      </p>
      <p className="petunjuk">
        Langkah yang tampil: <strong>{tayang}</strong> dari maksimal{" "}
        <strong>{MAX_LIVE_PROCESS_STEPS}</strong>. Batasnya soal panjang
        halaman — seksi ini sudah jadi bagian terpanjang di halaman depan — dan
        soal ilustrasi: gambar yang tersedia memang {MAX_LIVE_PROCESS_STEPS}.
        Menguranginya aman: talinya digambar ulang mengikuti kartu yang ada.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada langkah. Tekan “Tambah langkah” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Judul langkah</th>
              <th>Ilustrasi</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((langkah, index) => (
              <tr
                key={langkah.id}
                className={langkah.state === "draft" ? "draf" : ""}
              >
                {/* Nomor bergaya sama dengan yang tercetak di situs ("01"),
                    bukan "1" — supaya baris ini dan kartu di layar pengunjung
                    terbaca sebagai hal yang sama. */}
                <td>{nomor[index]}</td>
                <td>
                  <strong>{langkah.title}</strong>
                  <div className="petunjuk">
                    {langkah.kicker ? `${langkah.kicker} — ` : ""}
                    {langkah.desc || "—"}
                  </div>
                </td>
                <td>
                  <span className="penanda">
                    {NAMA_ILUSTRASI[langkah.glyph] ?? langkah.glyph}
                  </span>
                </td>
                <td>
                  <span
                    className={`penanda${langkah.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[langkah.state]}
                  </span>
                  {langkah.unpublished ? (
                    <div className="petunjuk">belum tayang</div>
                  ) : null}
                </td>
                <td>{tanggal(langkah.updatedAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${langkah.title}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${langkah.title}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(langkah.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(langkah)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {akanDihapus ? (
        <Konfirmasi
          judul="Hapus langkah?"
          isi={
            <p>
              Kartu <strong>“{akanDihapus.title}”</strong> akan dihapus dari
              seksi “How We Work”, dan langkah di bawahnya naik satu nomor.
              Isinya tetap tersimpan di database dan bisa dikembalikan oleh
              developer kalau ternyata keliru — tapi tidak lewat panel ini.
            </p>
          }
          tombolYa="Ya, hapus"
          sedangJalan={menghapus}
          onYa={() => void hapus(akanDihapus)}
          onBatal={() => (menghapus ? undefined : setAkanDihapus(null))}
        />
      ) : null}
    </>
  );
}

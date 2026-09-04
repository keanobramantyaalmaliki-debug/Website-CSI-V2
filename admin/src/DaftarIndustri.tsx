/**
 * Daftar sektor industri — strip "Built Across Sectors" di halaman Home.
 *
 * Dua hal membuat daftar ini beda dari daftar entitas lain.
 *
 * 1. URUTANNYA tampil dua kali di situs sekaligus: ia menentukan anak tangga
 *    spiral mana yang ditempati sebuah sektor, DAN nomor "01"–"13" yang
 *    tercetak di HUD, navigasi sentuh, dan kepala kartu fokus. Nomornya tidak
 *    disimpan di mana pun — ia diturunkan dari posisi baris di sini. Karena
 *    itu kolom "#" di tabel ini bukan hiasan: itu nomor yang benar-benar
 *    dibaca pengunjung.
 *
 * 2. Ada BATAS ATAS. Tumpukan spiralnya dikalibrasi untuk 13 plank; yang
 *    ke-14 memanjat keluar bingkai kamera. Servernya menolak, tapi ditolak
 *    setelah mengisi seluruh form adalah cara paling menyebalkan untuk
 *    mengetahuinya — jadi angkanya ditulis di depan mata dan tombol "Tambah"
 *    ikut mati begitu penuh.
 */

import { useState } from "react";

import { MAX_LIVE_INDUSTRIES } from "@shared/industry";

import { hapusIndustri, urutkanIndustri, type IndustryRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Sama seperti daftar yang lain: nama status memakai nilai yang tersimpan di
   database apa adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya
   arti lain di panel ini (tampil di situs). */
const NAMA_STATUS: Record<IndustryRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

const NAMA_BOBOT: Record<IndustryRecord["tier"], string> = {
  core: "Core Focus",
  also: "Sektor",
};

export function DaftarIndustri({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: IndustryRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<IndustryRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const tayang = daftar.filter((i) => i.state === "live").length;
  const penuh = tayang >= MAX_LIVE_INDUSTRIES;

  /**
   * Nomor yang tercetak di situs, per baris — dihitung dari baris yang TAYANG
   * saja.
   *
   * Sempat memakai nomor baris apa adanya (`index + 1`), dan itu berbohong:
   * draf tidak ikut ke `content.json`, jadi ia tidak menempati plank dan tidak
   * memakan nomor. Satu draf yang nyempil di tengah membuat setiap nomor di
   * bawahnya meleset satu dari yang benar-benar dibaca pengunjung — persis
   * kolom yang paling dipercaya editor saat menata urutan. Draf sendiri
   * bernomor "—": ia memang belum punya.
   */
  let berjalan = 0;
  const nomor = daftar.map((sektor) =>
    sektor.state === "live" ? String(++berjalan).padStart(2, "0") : "—",
  );

  async function hapus(sektor: IndustryRecord) {
    setMenghapus(true);
    const hasil = await hapusIndustri(sektor.id);
    setMenghapus(false);
    setAkanDihapus(null);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      `"${hasil.data.deleted}" dihapus. Planknya baru hilang dari situs setelah kamu menekan Publish.`,
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

    const ids = daftar.map((i) => i.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanIndustri(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan sektor diubah, nomornya ikut berganti. Belum terlihat pengunjung sampai kamu menekan Publish.",
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
        <h2 style={{ margin: 0 }}>Industri</h2>
        <button
          type="button"
          className="utama"
          onClick={onBaru}
          disabled={penuh}
          /* Tombolnya mati, bukan hilang: tombol yang lenyap terbaca sebagai
             panel rusak. `title` menjelaskan kenapa saat kursor berhenti di
             atasnya, kalimat di bawah menjelaskannya untuk yang tidak
             memakai kursor. */
          title={
            penuh
              ? `Sudah ada ${MAX_LIVE_INDUSTRIES} sektor yang tampil, itu batasnya.`
              : undefined
          }
        >
          + Tambah sektor
        </button>
      </div>

      {/* Dua kalimat, dua hal yang tidak bisa ditebak dari tabelnya sendiri:
          bahwa urutan di sini = urutan di situs BESERTA nomornya, dan bahwa
          ada langit-langit. */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan sektor di tumpukan halaman Home,
        sekaligus nomor <strong>01</strong>–
        <strong>{String(Math.max(tayang, 1)).padStart(2, "0")}</strong> yang
        tercetak di situs. Memindahkan baris ikut memindahkan nomornya; baris
        berstatus Draft tidak ikut bernomor karena planknya belum ada.
      </p>
      <p className="petunjuk">
        Sektor yang tampil: <strong>{tayang}</strong> dari maksimal{" "}
        <strong>{MAX_LIVE_INDUSTRIES}</strong>. Batas ini bukan aturan
        administratif, tumpukan 3D-nya dibuat pas untuk {MAX_LIVE_INDUSTRIES}{" "}
        plank, dan yang ke-{MAX_LIVE_INDUSTRIES + 1} akan memanjat keluar
        layar. Menguranginya aman: tumpukan yang lebih pendek tetap terpasang
        rapi di tengah.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada sektor. Tekan “Tambah sektor” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nama sektor</th>
              <th>Bobot</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((sektor, index) => (
              <tr key={sektor.id} className={sektor.state === "draft" ? "draf" : ""}>
                {/* Nomor bergaya sama dengan yang tercetak di situs ("01"),
                    bukan "1" — supaya baris ini dan plank di layar pengunjung
                    terbaca sebagai hal yang sama. */}
                <td>{nomor[index]}</td>
                <td>
                  <strong>{sektor.name}</strong>
                  <div className="petunjuk">{sektor.desc || "—"}</div>
                </td>
                <td>
                  <span
                    className={`penanda${sektor.tier === "core" ? " tegas" : ""}`}
                  >
                    {NAMA_BOBOT[sektor.tier]}
                  </span>
                </td>
                <td>
                  <span
                    className={`penanda${sektor.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[sektor.state]}
                  </span>
                </td>
                <td>
                  {tanggal(sektor.updatedAt)}
                  {sektor.unpublished ? (
                    <div className="belum-terpublish">belum terpublish</div>
                  ) : null}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${sektor.name}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${sektor.name}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(sektor.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(sektor)}
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
          judul="Hapus sektor?"
          isi={
            <p>
              Plank <strong>“{akanDihapus.name}”</strong> akan dihapus dari
              tumpukan di halaman Home, dan sektor di bawahnya naik satu nomor.
              Isinya tetap tersimpan di database dan bisa dikembalikan oleh
              developer kalau ternyata keliru, tapi tidak lewat panel ini.
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

/**
 * Daftar kartu deployment — strip "Built for real-world environments where
 * decisions matter." di halaman Home.
 *
 * Tiga hal yang membedakannya dari daftar entitas lain.
 *
 * 1. URUTANNYA dibaca pengunjung dua kali: sebagai posisi kartu di grid, DAN
 *    sebagai nomor "01"–"05" yang tercetak di kepala tiap kartu. Nomor itu
 *    tidak disimpan di mana pun — situs menurunkannya dari posisi baris di
 *    sini. Jadi kolom "#" bukan penomoran tabel; itu angka yang benar-benar
 *    terbaca di layar orang.
 *
 * 2. WILAYAH punya kolomnya sendiri, dan itu perlu: yang unik di basis data
 *    adalah pasangan sektor+wilayah, bukan sektornya. "Logistics · Indonesia"
 *    dan "Logistics · International" memang dua kartu berbeda, dan tanpa
 *    kolom wilayah keduanya akan terbaca sebagai baris kembar yang salah
 *    satunya "harusnya dihapus".
 *
 * 3. TIDAK ADA batas atas. Grid-nya `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
 *    — kartu ke-20 cuma menambah baris. Bandingkan dengan industri, yang
 *    dibatasi 13 karena tumpukan 3D-nya punya geometri tetap.
 */

import { useState } from "react";

import { hapusDeployment, urutkanDeployment, type DeploymentRecord } from "./api";
import { Kabar, Konfirmasi, tanggal } from "./ui";

/* Seperti daftar lain: nama status memakai nilai yang tersimpan di database apa
   adanya, dan sengaja BUKAN kata "tayang" — kata itu sudah punya arti lain di
   panel ini (tampil di situs). */
const NAMA_STATUS: Record<DeploymentRecord["state"], string> = {
  draft: "Draft",
  live: "Live",
};

export function DaftarDeployment({
  daftar,
  onBaru,
  onUbah,
  onBerubah,
}: {
  daftar: DeploymentRecord[];
  onBaru: () => void;
  onUbah: (id: string) => void;
  /** Dipanggil sesudah data berubah, supaya daftar dan angka bar publish
   *  diambil ulang dari server — bukan ditebak di sini. */
  onBerubah: (pesan: string) => void;
}) {
  const [akanDihapus, setAkanDihapus] = useState<DeploymentRecord | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [memindah, setMemindah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const tayang = daftar.filter((d) => d.state === "live").length;

  /**
   * Nomor yang tercetak di situs, per baris — dihitung dari baris yang TAYANG
   * saja.
   *
   * Memakai nomor baris apa adanya (`index + 1`) akan berbohong: draf tidak
   * ikut ke `content.json`, jadi ia tidak menempati kartu dan tidak memakan
   * nomor. Satu draf yang nyempil di tengah membuat setiap nomor di bawahnya
   * meleset satu dari yang benar-benar dibaca pengunjung — persis kolom yang
   * paling dipercaya editor saat menata urutan. Draf sendiri bernomor "—": ia
   * memang belum punya.
   */
  let berjalan = 0;
  const nomor = daftar.map((kartu) =>
    kartu.state === "live" ? String(++berjalan).padStart(2, "0") : "—",
  );

  /** Judul yang dipakai di tombol, konfirmasi, dan pesan — sektor sendirian
   *  tidak cukup mengidentifikasi baris, karena sektor kembar itu sah. */
  const sebut = (d: DeploymentRecord) =>
    d.region ? `${d.sector} · ${d.region}` : d.sector;

  async function hapus(kartu: DeploymentRecord) {
    setMenghapus(true);
    const hasil = await hapusDeployment(kartu.id);
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

    const ids = daftar.map((d) => d.id);
    [ids[index], ids[tujuan]] = [ids[tujuan], ids[index]];

    setMemindah(true);
    const hasil = await urutkanDeployment(ids);
    setMemindah(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onBerubah(
      "Urutan kartu diubah, nomornya ikut berganti. Belum terlihat pengunjung sampai kamu menekan Publish.",
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
        <h2 style={{ margin: 0 }}>Deployment</h2>
        <button type="button" className="utama" onClick={onBaru}>
          + Tambah kartu
        </button>
      </div>

      {/* Dua hal yang tidak bisa ditebak dari tabelnya sendiri: bahwa urutan di
          sini = urutan di situs BESERTA nomornya, dan bahwa mengosongkan
          seluruh daftar itu sah (bukan halaman yang rusak). */}
      <p className="petunjuk" style={{ marginTop: 8 }}>
        Urutan baris di bawah = urutan kartu di halaman Home, sekaligus nomor{" "}
        <strong>01</strong>–
        <strong>{String(Math.max(tayang, 1)).padStart(2, "0")}</strong> yang
        tercetak di kartunya. Memindahkan baris ikut memindahkan nomornya; baris
        berstatus Draft tidak ikut bernomor karena kartunya belum ada.
      </p>
      <p className="petunjuk">
        Tidak ada batas jumlah, grid-nya cuma menambah baris ke bawah. Kalau
        semua kartu berstatus Draft, seluruh bagian ini hilang dari halaman
        Home berikut judulnya, dan itu memang yang diminta: judul yang
        menggantung di atas grid kosong lebih buruk daripada tidak ada apa-apa.
      </p>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {daftar.length === 0 ? (
        <p className="kosong">
          Belum ada kartu. Tekan “Tambah kartu” untuk membuat yang pertama.
        </p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Sektor</th>
              <th>Wilayah</th>
              <th>Status</th>
              <th>Terakhir diubah</th>
              <th aria-label="Tindakan" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((kartu, index) => (
              <tr key={kartu.id} className={kartu.state === "draft" ? "draf" : ""}>
                {/* Nomor bergaya sama dengan yang tercetak di situs ("01"),
                    bukan "1" — supaya baris ini dan kartu di layar pengunjung
                    terbaca sebagai hal yang sama. */}
                <td>{nomor[index]}</td>
                <td>
                  <strong>{kartu.sector}</strong>
                  <div className="petunjuk">{kartu.desc || "—"}</div>
                </td>
                {/* Kolom sendiri, bukan digabung ke bawah nama sektor: dua
                    baris bersektor sama cuma bisa dibedakan dari sini. */}
                <td>{kartu.region || "—"}</td>
                <td>
                  <span
                    className={`penanda${kartu.state === "live" ? " tegas" : ""}`}
                  >
                    {NAMA_STATUS[kartu.state]}
                  </span>
                </td>
                <td>
                  {tanggal(kartu.updatedAt)}
                  {kartu.unpublished ? (
                    <div className="belum-terpublish">belum terpublish</div>
                  ) : null}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, -1)}
                    disabled={index === 0 || memindah}
                    aria-label={`Naikkan ${sebut(kartu)}`}
                  >
                    Naikkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => void pindah(index, 1)}
                    disabled={index === daftar.length - 1 || memindah}
                    aria-label={`Turunkan ${sebut(kartu)}`}
                  >
                    Turunkan
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => onUbah(kartu.id)}
                  >
                    Ubah
                  </button>{" "}
                  <button
                    type="button"
                    className="kecil"
                    onClick={() => setAkanDihapus(kartu)}
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
          judul="Hapus kartu?"
          isi={
            <p>
              Kartu <strong>“{sebut(akanDihapus)}”</strong> akan dihapus dari
              halaman Home, dan kartu di bawahnya naik satu nomor. Isinya tetap
              tersimpan di database dan bisa dikembalikan oleh developer kalau
              ternyata keliru, tapi tidak lewat panel ini.
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

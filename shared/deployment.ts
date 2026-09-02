/**
 * Bentuk satu deployment — kartu di strip "Built for real-world environments
 * where decisions matter." di halaman Home.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Satu baris = satu `<article>` di grid `Deployments.tsx`. Tidak ada halaman
 * sendiri, tidak ada slug: kartunya berhenti di situ, tidak bisa diklik.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Dua keadaan, bukan tiga.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`.
 * `live`  — tampil sebagai salah satu kartu di grid halaman Home.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu.
 * Deployment tidak punya keadaan seperti itu: sistem yang tidak lagi dipakai
 * bukan "ditutup" melainkan dicabut dari grid.
 *
 * Enum-nya SENDIRI di Postgres (`deployment_state`), tidak menumpang
 * `industry_state`/`service_state`/`value_state` yang kebetulan berisi dua
 * nilai yang sama — alasannya sama seperti yang ditulis di `shared/crew.ts`.
 */
export type DeploymentState = "draft" | "live";

export const DEPLOYMENT_STATES: readonly DeploymentState[] = ["draft", "live"];

export type Deployment = {
  id: string;
  /**
   * Sektor tempat sistemnya berjalan — judul kartu (`<h3>`). Contoh: "Public
   * Services", "Logistics".
   *
   * BUKAN identitas baris sendirian, dan ini bedanya yang paling penting
   * dengan `Industry.name`. Sektor yang sama boleh muncul dua kali selama
   * wilayahnya berbeda: "Logistics · Indonesia" dan "Logistics ·
   * International" itu dua sistem yang benar-benar berbeda, bukan salah ketik.
   * Yang dijaga unik adalah PASANGAN `sector` + `region` — lihat
   * `deployments_sector_region_alive` di `server/db/schema.ts`.
   */
  sector: string;
  /** Wilayah tempat sistemnya berjalan, tercetak di baris meta sesudah
   *  nomornya: "03 · International". Teks bebas, bukan enum — daftar wilayah
   *  yang boleh dipakai bukan sesuatu yang perlu developer putuskan. */
  region: string;
  /** Satu-dua kalimat tentang apa yang berubah setelah sistemnya jalan. Isi
   *  badan kartu. */
  desc: string;
  /**
   * Foto latar kartu — diredam grayscale saat diam, menyala saat hover
   * (desktop) atau saat kartunya lewat tengah layar (sentuh).
   *
   * KOLOM SENDIRI, dan itu perbaikan bug diam-diam sekaligus. Sebelum CMS,
   * foto dicari lewat peta `SECTOR_IMAGE` di `DeploymentCard.tsx` yang
   * BERKUNCI NAMA SEKTOR — jadi mengganti "Hospitality" jadi "Hotels & Resorts"
   * akan menjatuhkan kartunya diam-diam ke foto Public Services, tanpa satu pun
   * error. Peta itu tidak mungkin dipertahankan begitu namanya bisa diketik
   * editor.
   *
   * Kosong = kartu tanpa foto sama sekali (`<img>`-nya tidak dirender); itu
   * keadaan yang sah untuk draft, tapi tidak untuk kartu yang tayang — lihat
   * `validateDeployment.ts`.
   */
  image: string;
  state: DeploymentState;
  /**
   * Urutan kartu di grid, dibaca kiri ke kanan lalu turun. Kecil di depan.
   *
   * Bukan kenyamanan panel: grid CSS merender persis urutan larik yang
   * dioperkan, dan urutan itu SEKALIGUS menentukan nomor "01"–"05" yang
   * tercetak di baris meta tiap kartu.
   *
   * Nomor itu SENGAJA tidak disimpan sebagai kolom, sama seperti layanan dan
   * industri. Menyimpannya berarti dua sumber kebenaran untuk satu hal, dan
   * keduanya pasti melenceng begitu editor memindahkan satu baris. Ia
   * diturunkan dari posisi: kartu pertama = "01".
   *
   * TIDAK ADA batas jumlah seperti `MAX_LIVE_INDUSTRIES`. Batas itu ada karena
   * geometri tumpukan 3D; grid ini `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
   * yang tinggal menambah baris ke bawah, jadi kartu ke-14 tidak merusak apa
   * pun.
   */
  sortOrder: number;
};

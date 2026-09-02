/**
 * Bentuk satu sektor industri — strip "Built Across Sectors" di halaman Home.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Sektor TIDAK punya slug dan tidak punya halaman sendiri. Ia satu lempeng
 * (plank) di tumpukan spiral 3D `IndustriesStack.tsx` — hover/tap menyorotnya,
 * klik membukanya jadi kartu fokus berfoto — plus satu baris di daftar
 * `sr-only` di `Industries.tsx`. Sama seperti layanan: dua tampilan, satu
 * baris data.
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
 * `live`  — tampil sebagai salah satu plank di tumpukan halaman Home.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu.
 * Sektor tidak punya keadaan seperti itu: sektor yang tidak lagi dilayani
 * bukan "ditutup" melainkan dicabut dari tumpukan.
 *
 * Enum-nya SENDIRI di Postgres (`industry_state`), tidak menumpang
 * `service_state`/`value_state`/`crew_state` yang kebetulan berisi dua nilai
 * yang sama — alasannya sama seperti yang ditulis di `shared/crew.ts`.
 */
export type IndustryState = "draft" | "live";

export const INDUSTRY_STATES: readonly IndustryState[] = ["draft", "live"];

/**
 * Bobot sebuah sektor.
 *
 * `core` — fokus utama; mencetak label "Core Focus" di HUD hover dan di kepala
 *          kartu fokus, serta "(Core Focus)" di daftar `sr-only`.
 * `also` — sektor yang dilayani tapi bukan sorotan; kartunya bertuliskan
 *          "Sector".
 *
 * Ini bukan urutan dengan nama lain. Tiga sektor `core` hari ini kebetulan
 * juga tiga teratas, tapi keduanya bergerak sendiri-sendiri: editor boleh
 * menaruh sektor `core` di posisi ke-tujuh tanpa ada yang rusak.
 */
export type IndustryTier = "core" | "also";

export const INDUSTRY_TIERS: readonly IndustryTier[] = ["core", "also"];

/**
 * Batas keras jumlah sektor yang boleh TAYANG bersamaan.
 *
 * Ini satu-satunya batas jumlah di seluruh CMS ini, dan ia ada karena
 * geometri, bukan karena selera. Tumpukan spiral di `IndustriesStack.tsx`
 * menaruh plank ke-`k` di `y = k * 0.5` mengelilingi busur `sin(k/5)`, dan
 * framing kamera (`CAM_POS` + `lookAt(0,0,0)`) beserta animasi plank-ke-kartu
 * -fokus dikalibrasi untuk busur sepanjang 13 plank — hasil tiga ronde QC
 * zoom-out. Plank ke-14 dan seterusnya memanjat keluar bingkai; di 25 plank,
 * yang teratas bahkan duduk LEBIH TINGGI dari kameranya sendiri.
 *
 * Batasnya cuma di ATAS. Ke bawah aman berapa pun, karena rentang `k`
 * DIPUSATKAN pada tengah busur kalibrasi alih-alih dimulai dari nol (lihat
 * `bases` di `IndustriesStack.tsx`) — jadi tumpukan yang menyusut tetap parkir
 * di tengah ruang yang dibidik kamera, bukan melorot sambil mengelilingi
 * spiral.
 *
 * Sifatnya aturan tingkat DAFTAR, bukan tingkat baris — `validateIndustry()`
 * yang cuma melihat satu sektor tidak akan pernah bisa menegakkannya. Yang
 * menegakkan adalah `routes/industries.ts` saat sebuah baris dijadikan `live`.
 */
export const MAX_LIVE_INDUSTRIES = 13;

export type Industry = {
  id: string;
  /** Nama sektor di HUD, kartu fokus, dan daftar `sr-only`. Contoh:
   *  "Government & Public Sector". Sekaligus IDENTITAS sektor — lihat catatan
   *  keunikan di `validateIndustry.ts`. */
  name: string;
  /** Satu kalimat penjelas, tampil di HUD hover dan di badan kartu fokus. */
  desc: string;
  tier: IndustryTier;
  /** Foto yang muncul di plank saat kartunya dibuka. Kosong = plank tetap
   *  putih buram tanpa foto; itu keadaan yang sah untuk draft, tapi tidak
   *  untuk sektor yang tayang (lihat `validateIndustry.ts`). */
  image: string;
  state: IndustryState;
  /**
   * Urutan sektor di tumpukan, dari puncak ke dasar. Kecil di atas.
   *
   * Bukan kenyamanan panel: urutan ini menentukan DUA hal yang tayang
   * sekaligus — anak tangga spiral mana yang ditempati sebuah sektor, dan
   * nomor "01"–"13" yang tercetak di HUD, navigasi sentuh, dan kepala kartu
   * fokus.
   *
   * Nomor itu SENGAJA tidak disimpan sebagai kolom, sama seperti layanan.
   * Menyimpannya berarti dua sumber kebenaran untuk satu hal, dan keduanya
   * pasti melenceng begitu editor memindahkan satu baris. Ia diturunkan dari
   * posisi: sektor pertama = "01".
   */
  sortOrder: number;
};

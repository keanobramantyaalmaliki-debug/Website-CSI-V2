/**
 * Bentuk satu langkah "Cara kerja" — seksi "How We Work" di halaman Home.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/industry.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Satu langkah TIDAK punya halaman sendiri. Ia satu kartu putih di sepanjang
 * "tali" SVG yang menjalar mengikuti scroll di `Process.tsx`: tali menembus
 * pusat kartu, kartu menggembung dari garisnya, lalu isinya menyusul muncul.
 * Talinya digambar ulang dari posisi kartu hasil ukur, jadi berapa pun
 * jumlah langkahnya bentuknya ikut menyesuaikan sendiri — yang membatasi
 * jumlah bukan geometri tali (lihat `MAX_LIVE_PROCESS_STEPS` di bawah).
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Dua keadaan, bukan tiga — alasannya sama dengan sektor industri: langkah
 * yang tidak lagi dikerjakan bukan "ditutup" melainkan dicabut dari alurnya.
 *
 * Enum-nya SENDIRI di Postgres (`process_step_state`), tidak menumpang
 * `industry_state`/`service_state` yang kebetulan berisi dua nilai yang sama —
 * alasannya sama seperti yang ditulis di `shared/crew.ts`.
 */
export type ProcessStepState = "draft" | "live";

export const PROCESS_STEP_STATES: readonly ProcessStepState[] = [
  "draft",
  "live",
];

/**
 * Ilustrasi garis beranimasi yang tampil di kepala kartu.
 *
 * Enam gambar SVG yang digambar tangan di `src/components/motion/
 * ProcessGlyphs.tsx`, masing-masing dengan koreografi garisnya sendiri. Ia
 * BUKAN foto: tidak bisa diunggah, tidak bisa dibuat dari panel, dan
 * karenanya tidak lewat `PemilihFoto` seperti entitas lain — yang bisa
 * dilakukan editor cuma MEMILIH salah satu dari enam yang ada.
 *
 * ‼️ Kuncinya disimpan sebagai kolom, dan ini keputusan yang sengaja diambil
 * (Keano, 2 Sep). Sebelum CMS, gambar dipasangkan menurut POSISI baris —
 * kartu ke-1 selalu radar, ke-4 selalu jendela kode. Begitu editor boleh
 * menghapus atau memindahkan langkah, pasangan itu bergeser diam-diam:
 * langkah "Design" naik satu posisi dan tiba-tiba bergambar radar, tanpa
 * seorang pun mengubah gambar apa pun dan tanpa satu galat pun. Dengan
 * kolom ini gambar MILIK langkahnya dan ikut ke mana pun barisnya pindah.
 *
 * Namanya sengaja deskriptif-fungsional ("discovery"), bukan deskriptif-
 * visual ("radar"): yang tersimpan di database bertahan lebih lama daripada
 * bentuk gambarnya, dan mengganti coretan `DiscoveryGlyph` suatu hari tidak
 * boleh memaksa migrasi kolom.
 *
 * Kunci `deployment` di sini TIDAK ada hubungannya dengan entitas
 * "Deployment" di halaman Home yang lain — kebetulan nama, dua ruang nama
 * yang berbeda.
 */
export type ProcessGlyphKey =
  | "discovery"
  | "strategy"
  | "design"
  | "development"
  | "testing"
  | "deployment";

export const PROCESS_GLYPH_KEYS: readonly ProcessGlyphKey[] = [
  "discovery",
  "strategy",
  "design",
  "development",
  "testing",
  "deployment",
];

/**
 * Batas jumlah langkah yang boleh TAYANG bersamaan.
 *
 * Beda watak dengan `MAX_LIVE_INDUSTRIES`, dan bedanya perlu ditulis supaya
 * tidak ada yang mengira keduanya jenis aturan yang sama. Batas 13 sektor
 * lahir dari GEOMETRI: plank ke-14 benar-benar memanjat keluar bingkai
 * kamera. Tali di `Process.tsx` tidak begitu — ia dibangun ulang dari posisi
 * kartu hasil ukur, jadi tujuh kartu akan tergambar dengan rapi.
 *
 * Yang dijaga di sini TATA LETAK dan isi: enam kartu masing-masing setinggi
 * `min-h-[55svh]` ditambah landasan ekor `45svh` sudah membuat seksi ini
 * bagian terpanjang di halaman depan — kira-kira tiga setengah layar penuh
 * yang harus di-scroll pengunjung sebelum sampai ke strip industri. Ditambah
 * satu lagi, "cara kerja" berhenti terbaca sebagai ringkasan dan mulai
 * terbaca sebagai dokumen. Enam juga persis jumlah ilustrasi yang ada
 * (`PROCESS_GLYPH_KEYS`).
 *
 * Sifatnya aturan tingkat DAFTAR, bukan tingkat baris — `validateProcessStep()`
 * yang cuma melihat satu langkah tidak akan pernah bisa menegakkannya. Yang
 * menegakkan `routes/processSteps.ts` saat sebuah baris dijadikan `live`.
 *
 * Batasnya cuma di ATAS. Ke bawah aman berapa pun: talinya menyesuaikan, dan
 * di nol langkah `Process.tsx` tidak merender seksinya sama sekali.
 */
export const MAX_LIVE_PROCESS_STEPS = 6;

export type ProcessStep = {
  id: string;
  /** Judul langkah, `h3` di badan kartu. Contoh: "Discovery". Sekaligus
   *  IDENTITAS langkah — lihat catatan keunikan di `validateProcessStep.ts`. */
  title: string;
  /** Satu kata di atas judul, dicetak oranye huruf kapital renggang oleh
   *  situs (`uppercase tracking-widest`). Contoh: "UNDERSTAND". Yang tersimpan
   *  apa adanya seperti diketik editor — yang mengapitalkan CSS, bukan data. */
  kicker: string;
  /** Satu–dua kalimat penjelas di bawah judul. */
  desc: string;
  glyph: ProcessGlyphKey;
  state: ProcessStepState;
  /**
   * Urutan langkah, dari atas ke bawah.
   *
   * Bukan kenyamanan panel: ini ALUR KERJA — "Discovery" sebelum "Design"
   * sebelum "Deployment" adalah isi yang disampaikan seksi ini, bukan
   * preferensi tampilan. Urutan yang keliru bukan kartu yang salah tempat,
   * melainkan kalimat yang salah.
   *
   * Ia juga menentukan dua hal lain sekaligus: nomor "01"–"06" yang tercetak
   * di pojok kartu, dan sisi kiri/kanan kartu berselang-seling yang membuat
   * tali terbaca zig-zag.
   *
   * Nomor itu SENGAJA tidak disimpan sebagai kolom, sama seperti sektor dan
   * layanan. Menyimpannya berarti dua sumber kebenaran untuk satu hal, dan
   * keduanya pasti melenceng begitu editor memindahkan satu baris. Ia
   * diturunkan dari posisi: langkah pertama = "01".
   */
  sortOrder: number;
};

/**
 * Bentuk Judul seksi — kalimat pembuka tiap seksi di situs, plus subteks di
 * lima seksi yang memang punya.
 *
 * Satu-satunya definisi, dipakai bertiga seperti `shared/vision.ts`: `server/`
 * saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/` saat
 * membaca `content.json`.
 *
 * ‼️ BENTUK KETIGA, setelah "daftar" (lowongan, crew, layanan, …) dan
 * "tunggal" (visi, footer). Barisnya TETAP: sebelas, lahir dari seed, tidak
 * pernah bertambah dan tidak pernah hilang. Editor cuma mengganti kalimatnya.
 * Karena itu tiga hal sengaja TIDAK ada:
 *
 * 1. **Tidak ada `state`.** Seksi berjudul tanpa judul bukan "draft", ia
 *    cacat. Menjatuhkan judul ke draft berarti seksi tayang di situs dengan
 *    kepala kosong.
 * 2. **Tidak ada `sortOrder`.** Urutan seksi ditentukan tata letak halaman,
 *    bukan data. Tombol yang tidak mengubah apa pun di situs adalah tombol
 *    yang berbohong ke editor (pelajaran `sortOrder` crew).
 * 3. **Tidak ada hapus.** Kuncinya dirujuk langsung oleh komponen; baris yang
 *    hilang = seksi tanpa judul.
 *
 * `id`-nya TETAP menyeberang ke panel, beda dengan visi. Alasannya bukan
 * tampilan: `audit_log.entity_id` bertipe uuid, jadi kunci teks (`csi-hero`)
 * tidak bisa dipakai sebagai identitas riwayat. Barisnya dapat uuid sendiri,
 * dan itulah yang dicatat riwayat. `id` TIDAK ikut ke `content.json`.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

/**
 * Sebelas kunci seksi, urut seperti pengunjung menemuinya di situs
 * (Home, lalu Services, Work, People).
 *
 * Nilainya juga jadi enum Postgres `section_key`: kunci asing tertolak di
 * lapisan database, bukan cuma di TypeScript.
 */
export const SECTION_TEXT_KEYS = [
  "csi-hero",
  "deployments",
  "process",
  "industries",
  "services-lead",
  "work-lead",
  "selected-work",
  "case-studies",
  "people-intro",
  "the-crew",
  "careers",
] as const;

export type SectionTextKey = (typeof SECTION_TEXT_KEYS)[number];

/** Empat halaman panel, urut navbar. */
export const SECTION_TEXT_PAGES = ["home", "services", "work", "people"] as const;

export type SectionTextPage = (typeof SECTION_TEXT_PAGES)[number];

export type SectionText = {
  key: SectionTextKey;
  /**
   * Judul seksinya. Baris baru disimpan sebagai `\n` biasa; yang membaca
   * memecahnya lalu membungkus tiap baris dengan `LineMask` ber-`delay`
   * bertingkat (pola `MeetingLead.tsx`).
   */
  heading: string;
  /**
   * Subteks di bawah judul. String kosong = tidak ada, dan untuk seksi yang
   * `adaSub === false` ia SELALU kosong (ditegakkan validator, bukan cuma
   * konvensi). Khusus `people-intro`, baris kosong memisahkan dua paragraf.
   */
  subheading: string;
};

export type SectionTextMeta = {
  halaman: SectionTextPage;
  /** Nama seksinya di panel. Bukan nama berkas komponen. */
  label: string;
  /** Satu kalimat penjelas di bawah isian, untuk editor non-teknis. */
  catatan: string;
  /** Seksi ini menampilkan subteks atau tidak. */
  adaSub: boolean;
  /** Batas panjang judul, DITURUNKAN dari tata letaknya. */
  maksJudul: number;
  /** Berapa baris judul yang boleh ditulis (dipecah di `\n`). */
  maksBaris: number;
  /** Batas panjang subteks. 0 kalau `adaSub === false`. */
  maksSub: number;
  /** Berapa paragraf subteks (dipecah di baris kosong). 0 kalau tanpa sub. */
  maksParagraf: number;
};

/**
 * Metadata tiap seksi.
 *
 * Bentuk `Record<SectionTextKey, …>` disengaja: menambah kunci di
 * `SECTION_TEXT_KEYS` tanpa metadatanya menjadi galat kompilasi, bukan baris
 * panel tanpa label yang baru ketahuan saat dibuka.
 *
 * Angka `maksJudul` berasal dari LAYOUT, bukan dari database (`text` tidak
 * punya batas). Yang paling ketat justru yang paling besar di layar: h2
 * CsiHero `text-4xl` di HP sudah mepet pada lebar 360px (lihat komentar
 * panjang di `CsiHero.tsx` soal "intelligence." yang meluber dan membuat
 * SELURUH dokumen bisa digeser ke samping).
 */
export const SECTION_TEXT_META: Record<SectionTextKey, SectionTextMeta> = {
  "csi-hero": {
    halaman: "home",
    label: "Hero halaman depan",
    catatan:
      "Kalimat paling besar di situs, tepat di bawah kantor 3D. Tiap kata muncul satu per satu.",
    adaSub: true,
    maksJudul: 90,
    maksBaris: 2,
    maksSub: 400,
    maksParagraf: 1,
  },
  deployments: {
    halaman: "home",
    label: "Deployment",
    catatan: "Judul di atas kartu-kartu sektor dan wilayah.",
    adaSub: false,
    maksJudul: 90,
    maksBaris: 2,
    maksSub: 0,
    maksParagraf: 0,
  },
  process: {
    halaman: "home",
    label: "Cara kerja",
    catatan:
      "Judul di atas tali proses. Hanya satu baris: tali SVG-nya diukur dari tepi kanan judul ini, jadi baris kedua akan memotong jalurnya.",
    adaSub: false,
    maksJudul: 40,
    maksBaris: 1,
    maksSub: 0,
    maksParagraf: 0,
  },
  industries: {
    halaman: "home",
    label: "Industri",
    catatan:
      "Tidak terlihat di layar. Judul ini dibaca mesin pencari dan pembaca layar, karena tumpukan planknya bukan teks.",
    adaSub: false,
    maksJudul: 60,
    maksBaris: 1,
    maksSub: 0,
    maksParagraf: 0,
  },
  "services-lead": {
    halaman: "services",
    label: "Pembuka halaman Services",
    catatan: "Judul besar yang menempel ke kantor 3D di halaman Services.",
    adaSub: true,
    maksJudul: 70,
    maksBaris: 2,
    maksSub: 320,
    maksParagraf: 1,
  },
  "work-lead": {
    halaman: "work",
    label: "Pembuka halaman Work",
    catatan: "Judul besar yang menempel ke kantor 3D di halaman Work.",
    adaSub: true,
    maksJudul: 70,
    maksBaris: 2,
    maksSub: 320,
    maksParagraf: 1,
  },
  "selected-work": {
    halaman: "work",
    label: "Selected work",
    catatan: "Judul kecil di atas geser-geseran proyek.",
    adaSub: false,
    maksJudul: 40,
    maksBaris: 1,
    maksSub: 0,
    maksParagraf: 0,
  },
  "case-studies": {
    halaman: "work",
    label: "Case study",
    catatan: "Judul di atas daftar cerita proyek yang bisa dibuka.",
    adaSub: false,
    maksJudul: 40,
    maksBaris: 1,
    maksSub: 0,
    maksParagraf: 0,
  },
  "people-intro": {
    halaman: "people",
    label: "Pembuka halaman People",
    catatan:
      "Judul besar yang menempel ke kantor 3D di halaman People. Subteksnya boleh dua paragraf, pisahkan dengan satu baris kosong: keduanya tampil berdampingan di layar lebar.",
    adaSub: true,
    maksJudul: 60,
    maksBaris: 2,
    maksSub: 400,
    maksParagraf: 2,
  },
  "the-crew": {
    halaman: "people",
    label: "The crew",
    catatan: "Judul di atas daftar orang.",
    adaSub: false,
    maksJudul: 30,
    maksBaris: 1,
    maksSub: 0,
    maksParagraf: 0,
  },
  careers: {
    halaman: "people",
    label: "Lowongan",
    catatan: "Judul dan ajakan di sebelah kiri daftar lowongan.",
    adaSub: true,
    maksJudul: 40,
    maksBaris: 2,
    maksSub: 220,
    maksParagraf: 1,
  },
};

/** Kunci seksi di satu halaman, urut seperti di situs. */
export function sectionTextKeys(halaman: SectionTextPage): SectionTextKey[] {
  return SECTION_TEXT_KEYS.filter((key) => SECTION_TEXT_META[key].halaman === halaman);
}

/** Penjaga runtime untuk nilai yang datang dari URL, body request, atau content.json. */
export function isSectionTextKey(value: unknown): value is SectionTextKey {
  return (
    typeof value === "string" && (SECTION_TEXT_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Memecah judul jadi baris-baris siap render.
 *
 * Satu tempat, dipakai sebelas komponen: `\r\n` dari tempel-salin Windows
 * ikut dinormalkan, dan baris kosong dibuang supaya `\n\n` yang tidak
 * disengaja tidak melahirkan `LineMask` kosong setinggi satu baris.
 */
export function sectionHeadingLines(heading: string): string[] {
  return heading
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Memecah subteks jadi paragraf (dipisah baris kosong). */
export function sectionSubheadingParagraphs(subheading: string): string[] {
  return subheading
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((par) => par.trim())
    .filter((par) => par.length > 0);
}

/**
 * Nama entitas riwayat untuk sebuah seksi.
 *
 * EMPAT nama, bukan satu, dan itu keputusan tampilan bukan teknis:
 * `RUTE_ENTITAS` di `shared/riwayat.ts` memetakan satu nama entitas ke satu
 * rute panel, jadi satu nama bersama akan membuat baris riwayat judul The
 * Crew mendarat di layar Judul seksi halaman Home. `partition by entity,
 * entity_id` tetap benar karena `entity_id`-nya uuid per baris.
 */
export function sectionTextEntity(key: SectionTextKey): string {
  return `section_text_${SECTION_TEXT_META[key].halaman}`;
}

/** Kunci kelompok panel (`shared/contentMap.ts`) untuk sebuah halaman. */
export function sectionTextRoute(halaman: SectionTextPage): string {
  return `judul-${halaman}`;
}

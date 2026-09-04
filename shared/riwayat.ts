/**
 * Riwayat perubahan: bentuk satu peristiwa, dan cara membandingkan isinya.
 *
 * Tabel `audit_log` sudah mencatat semuanya sejak awal proyek, tapi yang
 * disimpan cuma isi SESUDAH perubahan (`snapshot`). Isi SEBELUM tidak pernah
 * ditulis, dan tidak perlu ditulis: isi sebelum sebuah perubahan adalah
 * `snapshot` baris audit SEBELUMNYA untuk benda yang sama. `routes/history.ts`
 * yang menurunkannya lewat `lag()`; berkas ini cuma menerima keduanya sudah
 * jadi dan mengubahnya menjadi tabel perbandingan yang bisa dibaca orang.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

/** Aksi yang dicatat `server/audit.ts`. Disalin, bukan diimpor: mengimpornya
 *  berarti berkas ini menarik `server/` ke dalam bundel browser. Dijaga
 *  `server/routes/history.test.ts` supaya tidak diam-diam melenceng. */
export const AKSI_RIWAYAT = [
  "create",
  "update",
  "delete",
  "publish",
  "login",
  "revert",
] as const;

export type AksiRiwayat = (typeof AKSI_RIWAYAT)[number];

export type PeristiwaRiwayat = {
  id: string;
  /** Kapan, ISO 8601. Diformat `tanggal()` di panel. */
  pada: string;
  /** Nama pelaku apa adanya seperti tersimpan, atau `null` kalau baris ini
   *  lebih tua dari kolom namanya. */
  siapa: string | null;
  /** Nilai `entity` mentah (`job`, `value`, …), diterjemahkan `LABEL_ENTITAS`. */
  entitas: string;
  entitasId: string | null;
  aksi: AksiRiwayat;
  /** Isi SESUDAH perubahan ini. `null` untuk `login`, yang memang tidak
   *  menyentuh isi apa pun. */
  sesudah: unknown;
  /** Isi SEBELUM perubahan ini, diturunkan dari baris audit sebelumnya.
   *  `null` kalau ini perubahan pertama benda tersebut. */
  sebelum: unknown;
};

/**
 * Nama entitas di database → nama yang dilihat editor.
 *
 * Bahasa yang sama dengan menu sisi, bukan nama tabel: teman R&D yang membuka
 * panel ini tidak pernah perlu tahu ada tabel bernama `work_projects`.
 * Nilai yang tidak dikenal ditampilkan apa adanya (lihat `namaEntitas`) supaya
 * entitas berikutnya muncul di riwayat sejak hari pertama, meski labelnya
 * belum sempat ditambahkan di sini.
 */
export const LABEL_ENTITAS: Record<string, string> = {
  job: "Lowongan",
  value: "Nilai",
  crew: "Crew",
  work_project: "Selected work",
  case_study: "Case study",
  service: "Layanan",
  testimonial: "Testimoni",
  industry: "Industri",
  deployment: "Deployment",
  "process-step": "Cara kerja",
  vision: "Visi",
  footer: "Footer",
  /* Empat, bukan satu. Tabelnya memang satu (`section_texts`), tapi yang
     dijawab riwayat bukan "barisnya tinggal di tabel mana" melainkan "buka di
     layar mana", dan judul seksi tersebar di empat layar panel. Lihat
     `RUTE_ENTITAS` di bawah. */
  section_text_home: "Judul seksi Home",
  section_text_services: "Judul seksi Services",
  section_text_work: "Judul seksi Work",
  section_text_people: "Judul seksi People",
  image: "Gambar",
  content: "Publish",
  session: "Masuk panel",
};

export const LABEL_AKSI: Record<AksiRiwayat, string> = {
  create: "Dibuat",
  update: "Diubah",
  delete: "Dihapus",
  publish: "Dipublish",
  login: "Masuk",
  /* Tidak pernah tampil di layar mana pun hari ini — baris `revert` disaring
     keluar dari Riwayat maupun Review, sama seperti `publish` dan `login`.
     Labelnya tetap ditulis karena tipenya menuntutnya, dan karena baris yang
     suatu hari lolos ke layar lebih baik terbaca "Dibatalkan" daripada
     "revert". */
  revert: "Dibatalkan",
};

/**
 * Nama isian → label bahasa Indonesia. SATU kamus untuk semua entitas, bukan
 * satu kamus per entitas.
 *
 * Bukan penghematan: nama isiannya memang berulang di dua belas entitas
 * (`title`, `desc`, `state`, `photo`, `sortOrder`, …), jadi kamus per entitas
 * akan menyalin baris yang sama belasan kali dan membuat satu perbaikan
 * terjemahan harus dikerjakan belasan kali juga.
 */
export const LABEL_ISIAN: Record<string, string> = {
  /* Dipakai banyak entitas */
  title: "Judul",
  name: "Nama",
  desc: "Penjelasan",
  description: "Penjelasan",
  state: "Status",
  photo: "Foto",
  image: "Gambar",
  sortOrder: "Urutan",
  slug: "Alamat",
  client: "Klien",
  year: "Tahun",
  role: "Jabatan",
  quote: "Kutipan",
  outcome: "Hasil",
  tags: "Tanda",
  category: "Departemen",

  /* Lowongan */
  department: "Departemen",
  overview: "Ringkasan",
  intro: "Paragraf pembuka",
  responsibilities: "Yang dikerjakan",
  qualifications: "Kualifikasi",
  skills: "Keahlian",
  askGithub: "Minta tautan GitHub",
  detail: "Isi halaman lowongan",
  en: "Inggris",
  id: "Indonesia",

  /* Nilai */
  tagline: "Baris pendek",

  /* Case study */
  scope: "Lingkup",
  industry: "Industri",

  /* Layanan */
  subs: "Sub layanan",

  /* Industri */
  tier: "Tingkat",

  /* Deployment */
  sector: "Sektor",
  region: "Wilayah",

  /* Cara kerja */
  kicker: "Baris kecil",
  glyph: "Ilustrasi",

  /* Visi */
  statement: "Kalimat visi",

  /* Judul seksi */
  heading: "Judul",
  subheading: "Subteks",

  /* Footer */
  address: "Alamat",
  email: "Surel",
  copyright: "Hak cipta",
  socials: "Tautan sosial",
  social: "Tautan sosial",
  platform: "Layanan",
  url: "Tautan",
  href: "Tautan",
  label: "Nama tautan",

  /* Gambar */
  path: "Path",
  source: "Sumber",
  originalName: "Nama berkas asli",
  width: "Lebar",
  height: "Tinggi",
  bytes: "Ukuran",

  /* Publish: isi `snapshot` tombol Publish, jumlah tiap jenis yang ikut terbit */
  jobs: "Lowongan",
  values: "Nilai",
  crew: "Crew",
  projects: "Selected work",
  caseStudies: "Case study",
  services: "Layanan",
  testimonials: "Testimoni",
  industries: "Industri",
  deployments: "Deployment",
  processSteps: "Cara kerja",
  vision: "Visi",
  footer: "Footer",
  sectionTexts: "Judul seksi",
  generatedAt: "Waktu berkas dibuat",

  /* Urutan: `snapshot` endpoint "/urutkan", yang memang cuma berisi daftar
     judul dalam urutan barunya */
  urutan: "Urutan baru",
};

/**
 * Isian pembukuan yang TIDAK ikut dibandingkan.
 *
 * `updatedAt` berubah di setiap perubahan tanpa kecuali, jadi kalau ia ikut,
 * ia akan muncul sebagai "perubahan" di seratus persen baris riwayat dan
 * menenggelamkan isian yang benar-benar diubah editor. `id` dan `createdAt`
 * tidak pernah berubah sama sekali.
 *
 * `unpublished` beda alasan tapi tujuannya sama: ia bukan isian yang pernah
 * diketik siapa pun, melainkan hitungan API (`updatedAt > publishedAt`) yang
 * ikut terbawa ke dalam snapshot. Menampilkannya sebagai isian yang berubah
 * berarti tiap penyimpanan melaporkan "unpublished: Tidak → Ya" di samping
 * perubahan yang sesungguhnya, dan itu bukan sesuatu yang diubah editor.
 */
const ABAIKAN = new Set([
  "id",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "publishedAt",
  "published_at",
  "unpublished",
]);

export function namaEntitas(entitas: string): string {
  return LABEL_ENTITAS[entitas] ?? entitas;
}

/** Nama isian yang belum ada di kamus ditampilkan apa adanya, BUKAN
 *  disembunyikan: isian baru yang belum sempat diterjemahkan tetap harus
 *  terlihat berubah, walau namanya masih nama teknis. */
export function namaIsian(key: string): string {
  return LABEL_ISIAN[key] ?? key;
}

/** Nilai apa pun jadi SATU baris. Dipakai untuk isi di dalam daftar dan objek
 *  bersarang, tempat baris baru justru memutus bacaan. */
function ringkas(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  if (typeof nilai === "boolean") return nilai ? "Ya" : "Tidak";
  if (typeof nilai === "number") return String(nilai);
  if (typeof nilai === "string") return nilai;

  if (Array.isArray(nilai)) {
    return nilai.map(ringkas).filter((t) => t !== "").join(", ");
  }

  return Object.entries(nilai as Record<string, unknown>)
    .filter(([k]) => !ABAIKAN.has(k))
    .map(([k, v]) => [namaIsian(k), ringkas(v)] as const)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

/**
 * Isi satu isian jadi teks yang dibaca editor.
 *
 * Daftar jadi baris BERNOMOR, bukan dipisah koma: untuk isian seperti
 * "Yang dikerjakan" atau urutan panel, yang berubah sering kali justru
 * posisinya, dan itu tidak kelihatan dalam satu baris panjang.
 */
export function nilaiJadiTeks(nilai: unknown): string {
  if (Array.isArray(nilai)) {
    return nilai.length === 0
      ? ""
      : nilai.map((isi, i) => `${i + 1}. ${ringkas(isi)}`).join("\n");
  }
  return ringkas(nilai);
}

export type BarisBanding = {
  key: string;
  label: string;
  sebelum: string;
  sesudah: string;
};

/**
 * Dua isi jadi daftar isian yang BERBEDA saja.
 *
 * Isian yang tidak berubah dibuang, tidak ditampilkan abu-abu: sebuah lowongan
 * punya belasan isian dan yang diubah editor biasanya satu. Menampilkan
 * semuanya berarti dia harus memindai belasan baris untuk menemukan satu yang
 * dicarinya, padahal pertanyaannya justru "apa yang berubah".
 *
 * Salah satu sisi boleh `null`, dan itu yang dipakai untuk pembuatan (belum
 * ada isi sebelumnya) dan penghapusan (tidak ada isi sesudahnya).
 */
export function bandingkan(sebelum: unknown, sesudah: unknown): BarisBanding[] {
  const a = objek(sebelum);
  const b = objek(sesudah);

  /* Urutan isian mengikuti urutan di isi SESUDAH lebih dulu — itu bentuk
     barisnya yang sekarang. Isian yang cuma ada di isi sebelumnya (dihapus,
     atau skema yang sudah berganti) menyusul di belakang, bukan hilang. */
  const kunci: string[] = [];
  for (const k of [...Object.keys(b), ...Object.keys(a)]) {
    if (!ABAIKAN.has(k) && !kunci.includes(k)) kunci.push(k);
  }

  const baris: BarisBanding[] = [];
  for (const k of kunci) {
    const kiri = nilaiJadiTeks(a[k]);
    const kanan = nilaiJadiTeks(b[k]);
    if (kiri === kanan) continue;
    baris.push({ key: k, label: namaIsian(k), sebelum: kiri, sesudah: kanan });
  }
  return baris;
}

/** Apa pun yang bukan objek biasa dianggap kosong. `snapshot` bertipe `jsonb`,
 *  jadi secara tipe ia boleh berisi angka atau string; kalau suatu hari ada
 *  yang menyimpan bentuk seperti itu, riwayatnya menampilkan "tidak ada isian"
 *  alih-alih melempar. */
function objek(n: unknown): Record<string, unknown> {
  return n !== null && typeof n === "object" && !Array.isArray(n)
    ? (n as Record<string, unknown>)
    : {};
}

/* ── Perubahan yang belum terpublish ─────────────────────────────────── */

/**
 * Nama entitas di database → key rute panel (`#/lowongan`, `#/nilai`, …).
 *
 * Dipakai layar Review untuk menawarkan "Buka": inti layar itu adalah tidak
 * perlu lagi mencari satu per satu di mana konten yang berubah tinggal, dan
 * daftar tanpa jalan menuju formnya cuma memindahkan pencarian itu satu
 * langkah ke belakang.
 *
 * Ditulis terpisah dari `LABEL_ENTITAS` walau kunci-kuncinya sama, karena
 * yang dijawab beda: yang satu "namanya apa buat editor", yang ini "layarnya
 * di mana". Dua entitas yang muncul di riwayat memang TIDAK punya layar
 * (`image` dan `session`), dan ketiadaannya di sini itulah jawabannya —
 * bukan kelalaian. Dijaga `shared/riwayat.test.ts` supaya tiap key di sini
 * benar-benar ada di `contentMap`.
 */
export const RUTE_ENTITAS: Record<string, string> = {
  job: "lowongan",
  value: "nilai",
  crew: "crew",
  work_project: "selected-work",
  case_study: "case-study",
  service: "layanan",
  testimonial: "testimoni",
  industry: "industri",
  deployment: "deployment",
  "process-step": "proses",
  vision: "visi",
  footer: "footer",
  section_text_home: "judul-home",
  section_text_services: "judul-services",
  section_text_work: "judul-work",
  section_text_people: "judul-people",
};

/**
 * Satu benda yang berubah dan belum terpublish: bukan satu peristiwa.
 *
 * Bedanya penting. Sebuah lowongan yang disunting tiga kali sejak Publish
 * terakhir adalah TIGA baris `audit_log`, tapi hanya SATU hal yang akan
 * berubah di mata pengunjung — dan pertanyaan yang dibawa orang ke layar
 * Review adalah "apa yang akan berubah di situs kalau saya tekan Publish",
 * bukan "berapa kali saya menekan Simpan". Karena itu `sebelum` diambil dari
 * peristiwa TERLAMA yang tertahan (keadaan sewaktu Publish terakhir) dan
 * `sesudah` dari yang TERBARU (keadaan sekarang): selisih keduanya persis
 * selisih yang akan tayang.
 */
export type PeristiwaTertahan = {
  /** `entitas|entitasId`. Kunci React, dan kunci pengelompokan. */
  key: string;
  entitas: string;
  entitasId: string | null;
  /**
   * Hasil BERSIH dari semua peristiwa yang tertahan, bukan aksi yang terakhir
   * tercatat: sesuatu yang dibuat lalu disunting dua kali tetap "Dibuat" bagi
   * pengunjung, karena dia belum pernah melihat versi mana pun sebelumnya.
   */
  aksi: AksiRiwayat;
  /** Nama benda ini seperti dikenali editor, diturunkan dari isinya. */
  judul: string;
  /** Yang menyentuh TERAKHIR. Sengaja bukan daftar semua yang pernah
   *  menyentuh: yang ditanyakan di layar ini "sudah siap tayang belum",
   *  dan silsilah lengkapnya justru ada di layar Riwayat sesudah Publish. */
  siapa: string | null;
  /** Kapan terakhir disentuh, ISO 8601. */
  pada: string;
  /** Berapa kali disentuh sejak Publish terakhir. */
  kali: number;
  /** Keadaan sewaktu Publish terakhir, atau `null` kalau benda ini memang
   *  belum pernah tayang. */
  sebelum: unknown;
  /** Keadaan sekarang, atau `null` kalau benda ini dihapus. */
  sesudah: unknown;
};

/**
 * Apakah baris ini "urutan panel" dan bukan satu benda?
 *
 * Menyusun ulang panel dicatat sebagai satu baris audit TANPA `entitasId`,
 * dengan isi `{ urutan: [...] }` berisi seluruh judul dalam urutan barunya
 * (lihat `POST /urutkan` di tiap route). Bentuk itulah yang dikenali di sini,
 * bukan sekadar "id-nya kosong": visi dan kaki halaman juga tercatat tanpa id
 * — karena id-nya angka 1, bukan uuid — padahal keduanya benda sungguhan yang
 * punya form sendiri.
 *
 * Dipakai layar Review untuk memutuskan baris mana yang TIDAK boleh punya
 * tombol Batalkan: yang disimpan cuma daftar JUDUL, jadi urutan lamanya tidak
 * bisa disusun kembali tanpa menebak — dan tebakan yang salah menyusun ulang
 * halaman yang tayang tanpa ada yang memintanya. Server memakai kesimpulan
 * yang sama (`pemulih.ts`), supaya tombol yang disembunyikan panel dan
 * permintaan yang ditolak API bicara tentang hal yang sama.
 */
export function barisUrutan(p: {
  entitasId: string | null;
  sesudah: unknown;
}): boolean {
  if (p.entitasId !== null) return false;
  const o = p.sesudah;
  if (o === null || typeof o !== "object" || Array.isArray(o)) return false;
  return Array.isArray((o as Record<string, unknown>).urutan);
}

/** Teks panjang dipotong: judul di sini cuma penunjuk baris, dan kutipan
 *  testimoni sepanjang tiga kalimat akan mendorong seluruh kolom lain keluar
 *  layar. Isi lengkapnya tetap ada di tabel perbandingan begitu barisnya
 *  dibuka. */
function potong(teks: string, maks = 64): string {
  const rapi = teks.trim().replace(/\s+/g, " ");
  return rapi.length <= maks ? rapi : `${rapi.slice(0, maks - 1).trimEnd()}…`;
}

/**
 * Nama sebuah benda, diturunkan dari isinya.
 *
 * Isian yang dicoba berurutan, dari yang paling menyerupai judul. Tidak ada
 * cabang per entitas: dua belas cabang yang masing-masing menyebut satu nama
 * isian akan lupa disambung saat entitas ketiga belas lahir, dan yang muncul
 * bukan galat melainkan baris tanpa nama.
 *
 * Deployment disebut lengkap dengan wilayahnya, karena sektor yang sama
 * memang boleh muncul di dua wilayah — itu justru identitas barisnya (lihat
 * indeks unik dua kolom di `deploymentsRepo`), dan menyebut sektornya saja
 * membuat dua baris berbeda terlihat kembar di layar ini.
 */
export function judulIsi(entitas: string, ...isi: unknown[]): string {
  for (const n of isi) {
    if (n === null || typeof n !== "object" || Array.isArray(n)) continue;
    const o = n as Record<string, unknown>;

    /* Urutan panel dicatat sebagai `{ urutan: [...] }` dan tidak punya judul
       apa pun — ia memang bukan satu benda melainkan susunan semuanya. */
    if (Array.isArray(o.urutan)) return `Urutan ${namaEntitas(entitas).toLowerCase()}`;

    const sektor = typeof o.sector === "string" ? o.sector.trim() : "";
    const wilayah = typeof o.region === "string" ? o.region.trim() : "";
    if (sektor) return potong(wilayah ? `${sektor}, ${wilayah}` : sektor);

    for (const kunci of ["title", "name", "statement", "heading", "quote", "email"]) {
      const v = o[kunci];
      if (typeof v === "string" && v.trim()) return potong(v);
    }
  }

  /* Kaki halaman dan benda tanpa isian judul jatuh ke nama jenisnya. Itu
     tetap memberi tahu sesuatu, dan barisnya toh cuma satu. */
  return namaEntitas(entitas);
}

/** Urutan tampil: mengikuti urutan halaman di situs, sama seperti menu sisi
 *  dan beranda. Editor menyusuri konten dengan cara menyusuri halamannya dari
 *  atas ke bawah, jadi daftar yang urutannya lain (abjad, atau waktu) memaksa
 *  dia membaca semuanya untuk tahu apakah bagian yang dia pikirkan ikut
 *  berubah. Jenis yang tidak ada di peta jatuh ke belakang, bukan hilang. */
function urutanEntitas(entitas: string, peta: readonly string[]): number {
  const i = peta.indexOf(RUTE_ENTITAS[entitas] ?? entitas);
  return i === -1 ? peta.length : i;
}

/**
 * Peristiwa audit yang tertahan → daftar benda yang menunggu Publish.
 *
 * `peristiwa` harus TERBARU DI ATAS, seperti yang dikirim `riwayat()`.
 *
 * Yang dibuat LALU dihapus sebelum sempat terpublish dibuang seluruhnya, dan
 * itu bukan penyembunyian: pengunjung tidak pernah melihatnya ada, tidak akan
 * pernah melihatnya hilang, dan Publish tidak akan mengubah apa pun untuknya.
 * Angka di bar publish menghitungnya dengan cara yang sama (`menunggu()` di
 * `server/publish.ts` melewati baris terhapus yang belum pernah tayang), jadi
 * membiarkannya tampil di sini justru membuat dua angka di layar yang sama
 * saling membantah.
 */
export function kelompokkanTertahan(
  peristiwa: PeristiwaRiwayat[],
): PeristiwaTertahan[] {
  const peta = new Map<
    string,
    { terbaru: PeristiwaRiwayat; terlama: PeristiwaRiwayat; kali: number }
  >();

  for (const p of peristiwa) {
    const key = `${p.entitas}|${p.entitasId ?? ""}`;
    const ada = peta.get(key);
    /* Yang pertama ditemui adalah yang terbaru (daftarnya terbalik), dan yang
       terakhir ditemui yang terlama. */
    if (!ada) peta.set(key, { terbaru: p, terlama: p, kali: 1 });
    else {
      ada.terlama = p;
      ada.kali += 1;
    }
  }

  const hasil: PeristiwaTertahan[] = [];
  for (const [key, g] of peta) {
    const lahir = g.terlama.aksi === "create";
    const mati = g.terbaru.aksi === "delete";
    if (lahir && mati) continue;

    const sebelum = lahir ? null : g.terlama.sebelum;
    const sesudah = mati ? null : g.terbaru.sesudah;

    hasil.push({
      key,
      entitas: g.terbaru.entitas,
      entitasId: g.terbaru.entitasId,
      aksi: mati ? "delete" : lahir ? "create" : "update",
      /* Isi yang dihapus tetap punya judul: yang dipakai isi terakhirnya,
         justru supaya editor tahu APA yang akan hilang dari situs. */
      judul: judulIsi(g.terbaru.entitas, sesudah, g.terbaru.sesudah, sebelum),
      siapa: g.terbaru.siapa,
      pada: g.terbaru.pada,
      kali: g.kali,
      sebelum,
      sesudah,
    });
  }

  return hasil;
}

/**
 * Urutan TAMPIL, dipisah dari pengelompokan di atas dengan sengaja.
 *
 * Yang mana yang menunggu tayang adalah aturan, dan tinggal di server. Urutan
 * bacanya adalah tata letak, dan yang memegang peta halaman situs adalah
 * panel — jadi `urutanHalaman` datang dari sana (`CONTENT_GROUPS`) alih-alih
 * disalin ke sini sebagai daftar kedua yang harus diingat orang untuk ikut
 * diperbarui.
 */
export function urutkanTertahan(
  daftar: readonly PeristiwaTertahan[],
  urutanHalaman: readonly string[],
): PeristiwaTertahan[] {
  return [...daftar].sort(
    (a, b) =>
      urutanEntitas(a.entitas, urutanHalaman) -
        urutanEntitas(b.entitas, urutanHalaman) ||
      /* Di dalam satu jenis, yang paling baru disentuh di atas. */
      (a.pada < b.pada ? 1 : a.pada > b.pada ? -1 : 0),
  );
}

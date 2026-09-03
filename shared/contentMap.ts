/**
 * Peta konten situs: empat halaman navbar, dan konten apa saja yang tinggal di
 * masing-masingnya.
 *
 * Inilah yang menjadi beranda panel admin. Alasannya satu: teman R&D yang
 * memakai panel ini tidak tahu — dan tidak perlu tahu — bahwa lowongan
 * disimpan di tabel `jobs`. Yang dia tahu adalah "lowongan itu ada di halaman
 * People", karena itulah yang dia lihat waktu membuka situsnya. Panel yang
 * mendarat di daftar entitas database memaksa dia menghafal pemetaan yang
 * sebenarnya sudah terpampang di navbar.
 *
 * Urutan halaman dan urutan isinya MENGIKUTI URUTAN DI SITUS, diambil dari
 * `src/lib/roomContent.tsx` — bukan urutan pengerjaan, bukan abjad. Editor
 * mencari sesuatu dengan cara menyusuri halaman dari atas ke bawah dalam
 * ingatannya, jadi daftar yang urutannya lain memaksa dia membaca semuanya.
 *
 * ⚠️ Peta ini dijaga `src/lib/contentMap.test.ts`: `path` dan `label` tiap
 * halaman WAJIB sama dengan `ROOM_SLUGS`/`ROOM_LABELS` di sceneStore. Kalau
 * sebuah halaman situs berganti slug dan berkas ini tidak ikut, panel akan
 * menunjukkan alamat yang tidak ada — dan tidak ada yang meneriakkannya.
 *
 * ⚠️ Sama seperti `shared/job.ts`: TIDAK BOLEH mengimpor apa pun dari
 * `server/`. Berkas ini ikut ter-bundle ke browser.
 */

/**
 * `siap`  — sudah bisa diubah lewat panel.
 * `belum` — masih hardcoded di kode; butuh developer.
 *
 * Yang `belum` tetap DITAMPILKAN di beranda, tidak disembunyikan. Editor perlu
 * tahu bedanya "tidak ada di panel karena belum dibuat" dan "tidak ada di
 * panel karena saya tidak menemukannya" — yang kedua berakhir jadi pertanyaan
 * ke developer, yang pertama tidak.
 */
export type ContentStatus = "siap" | "belum";

export type ContentEntry = {
  /** Dipakai di rute panel (`#/lowongan`) dan sebagai key React. */
  key: string;
  /** Nama yang dilihat editor. Bahasa Indonesia, bukan nama tabel. */
  label: string;
  /** Satu kalimat: benda apa ini, dan di mana ia muncul di halamannya. */
  summary: string;
  status: ContentStatus;
  /** Berapa banyak yang ada sekarang — untuk yang `belum`, dihitung dari
   *  literal di kode saat berkas ini ditulis. Bukan angka hidup: ia cuma
   *  memberi editor gambaran ukurannya sebelum membuka apa pun. */
  approxCount: number;
};

export type ContentPage = {
  /** Slug ruangan di sceneStore — `home` | `people` | `work` | `services`. */
  key: string;
  /** Label persis seperti di navbar situs. */
  label: string;
  /** Alamat halamannya di situs, untuk ditautkan dari panel. */
  path: string;
  /** Untuk apa halaman ini, dari sudut pandang pengunjung. */
  summary: string;
  /**
   * Kelompok yang ISINYA DIRINYA SENDIRI: satu entri, dan entri itu bernama
   * sama dengan kelompoknya.
   *
   * Menu sisi merender kelompok seperti ini sebagai satu baris yang langsung
   * bisa diklik, tanpa panah dan tanpa anak. Tanpa penanda ini ia jadi
   * "Footer ▸ Footer" — satu ketukan tambahan yang tidak memberi tahu apa pun,
   * dan nama yang sama dua kali beruntun terbaca seperti ada dua hal berbeda.
   *
   * Dijaga `src/lib/contentMap.test.ts`: kalau kelompok bertanda ini suatu
   * hari punya entri kedua, anak keduanya akan tidak terjangkau di menu —
   * jadi test yang gagal, bukan menu yang diam-diam menyembunyikannya.
   */
  langsung?: true;
  entries: ContentEntry[];
};

/**
 * Empat halaman navbar, dalam urutan navbar (`NAV_CONTENT_ORDER` di
 * `src/components/Navbar.tsx`): Home → Services → Work → People.
 */
export const CONTENT_PAGES: readonly ContentPage[] = [
  {
    key: "home",
    label: "Home",
    path: "/",
    summary: "Halaman depan, yang dilihat pengunjung paling pertama.",
    entries: [
      {
        key: "deployment",
        label: "Deployment",
        summary: "Sistem yang sudah berjalan, dikelompokkan per sektor dan wilayah.",
        status: "siap",
        approxCount: 5,
      },
      {
        key: "proses",
        label: "Cara kerja",
        summary: "Langkah dari obrolan pertama sampai serah terima.",
        status: "siap",
        /* Angka yang sekaligus BATAS, seperti 13 di industri — tapi alasannya
           beda: bukan geometri melainkan panjang halaman. "How We Work" sudah
           jadi seksi terpanjang di halaman depan, dan ilustrasi yang tersedia
           memang cuma enam. Ditegakkan `routes/processSteps.ts`. */
        approxCount: 6,
      },
      {
        key: "industri",
        label: "Industri",
        summary: "Sektor yang dilayani cogniti, beserta foto dan penjelasannya.",
        status: "siap",
        /* Satu-satunya angka di peta ini yang sekaligus BATAS, bukan cuma
           perkiraan: tumpukan spiral 3D-nya dikalibrasi untuk 13 plank, dan
           panel menolak yang ke-14 (`MAX_LIVE_INDUSTRIES`). Ke bawah bebas. */
        approxCount: 13,
      },
      {
        key: "visi",
        label: "Visi",
        summary: "Paragraf penutup sebelum bagian kontak.",
        status: "siap",
        /* Satu, dan selamanya satu: seksinya satu baris di database, dijaga
           CHECK `vision_satu_baris`. Angka ini tidak akan pernah bergerak. */
        approxCount: 1,
      },
    ],
  },
  {
    key: "services",
    label: "Services",
    path: "/services",
    summary: "Bedah layanan, satu-satunya tempat rincian layanan ditulis.",
    entries: [
      {
        key: "layanan",
        label: "Layanan",
        summary: "Daftar layanan yang bisa dibuka satu per satu, beserta rinciannya.",
        status: "siap",
        approxCount: 9,
      },
      {
        key: "testimoni",
        label: "Testimoni",
        summary:
          "Kutipan klien di dasar halaman, berganti lewat panah, masing-masing dengan nama dan jabatannya.",
        status: "siap",
        approxCount: 3,
      },
    ],
  },
  {
    key: "work",
    label: "Work",
    path: "/work",
    summary: "Bukti kerja, proyek yang sudah selesai.",
    /* ⚠️ Testimoni TIDAK di sini. Case study punya kutipan juga, tapi itu
       kutipan MASALAH kliennya (pembuka cerita, tanpa nama siapa pun) —
       bukan pujian. Kutipan klien sungguhan yang bernama dan berjabatan
       cuma ada satu di situs ini: TestimonialSpotlight, di dasar halaman
       Services. Peta ini pernah keliru menaruhnya di Work; kalau ragu,
       buka /work sampai bawah — tidak ada wajah dan nama di sana. */
    entries: [
      {
        key: "selected-work",
        label: "Selected work",
        summary:
          "Kartu proyek bertumpuk yang dibuka satu per satu: judul, klien, tahun, dan hasilnya.",
        status: "siap",
        approxCount: 8,
      },
      {
        key: "case-study",
        label: "Case study",
        summary:
          "Proyek yang dibahas panjang: latar masalah, apa yang dikerjakan, dan lingkup pekerjaannya.",
        status: "siap",
        approxCount: 2,
      },
    ],
  },
  {
    key: "people",
    label: "People",
    path: "/people",
    summary: "Orang-orangnya: tim, nilai yang dipegang, dan lowongan yang dibuka.",
    entries: [
      {
        key: "nilai",
        label: "Nilai",
        summary: "Prinsip kerja tim, masing-masing dengan foto dan penjelasannya.",
        status: "siap",
        approxCount: 3,
      },
      {
        key: "crew",
        label: "Crew",
        summary: "Anggota tim: nama, peran, foto, dan tautan sosialnya.",
        status: "siap",
        approxCount: 13,
      },
      {
        key: "lowongan",
        label: "Lowongan",
        summary: "Posisi yang sedang dibuka, beserta halaman detail dan form lamarannya.",
        status: "siap",
        approxCount: 0,
      },
    ],
  },
];

/**
 * Konten yang tidak tinggal di satu halaman mana pun: kaki halaman.
 *
 * Dipisah dari keempat halaman navbar alih-alih dititipkan ke Home, supaya
 * editor tidak mengira mengubahnya cuma berdampak di halaman depan. Kaki
 * halaman dirender `SiteFooter.tsx`, dan komponen itu dipakai bagian Contact
 * di KEEMPAT halaman sekaligus plus halaman detail lowongan
 * (`/careers/<slug>`) yang tidak punya Contact sama sekali.
 *
 * ⚠️ Kelompok ini pernah bernama "Seluruh situs" dengan satu entri "Tautan
 * sosial" berstatus `belum`. Namanya diganti karena isinya ternyata satu
 * benda utuh — surel, alamat, hak cipta, DAN tautan sosialnya sama-sama
 * tinggal di kaki halaman — dan "Seluruh situs" membuat editor mencari
 * pengaturan situs di sini, yang tidak ada.
 */
export const FOOTER_GROUP: ContentPage = {
  key: "footer",
  label: "Footer",
  path: "/",
  summary: "Kaki halaman, muncul di dasar semua halaman sekaligus, bukan cuma di satu.",
  /* Isinya cuma dirinya sendiri, jadi menu sisi menampilkannya sebagai satu
     baris langsung. Lihat catatan `langsung` di atas. */
  langsung: true,
  entries: [
    {
      key: "footer",
      /* Sama persis dengan label kelompoknya, dan memang harus: keduanya
         benda yang sama, dan menu sisi cuma mencetak salah satunya. */
      label: "Footer",
      /* Menyebut navbar meski kelompoknya bernama "Footer": tautan sosial di
         sini SATU-SATUNYA daftar sosial situs, dan menu HP di navbar
         membacanya juga (`src/data/footer.ts`). Editor yang mengubah URL
         Instagram di sini mengubah keduanya, dan lebih baik tahu di depan
         daripada menemukannya sesudah tayang. */
      summary:
        "Surel, alamat, baris hak cipta, dan tautan sosial di dasar halaman. Tautan sosialnya dipakai menu HP di navbar juga.",
      status: "siap",
      /* Satu, dan selamanya satu: kaki halaman satu baris di database,
         dijaga CHECK `footer_satu_baris`. Tautan sosialnya yang bisa
         bertambah, dan itu tabel anak — bukan baris kedua di sini. */
      approxCount: 1,
    },
  ],
};

/** Semua kelompok yang tampil di beranda, dalam urutan tampil. */
export const CONTENT_GROUPS: readonly ContentPage[] = [...CONTENT_PAGES, FOOTER_GROUP];

/** Cari satu entri lewat key-nya, dari kelompok mana pun. */
export function findEntry(key: string): { page: ContentPage; entry: ContentEntry } | null {
  for (const page of CONTENT_GROUPS) {
    const entry = page.entries.find((e) => e.key === key);
    if (entry) return { page, entry };
  }
  return null;
}

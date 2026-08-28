/**
 * Isi lowongan yang punya HALAMAN SENDIRI (`/careers/<slug>`).
 *
 * Sumbernya poster rekrutmen resmi cogniti ("WE ARE HIRING") — bukan ringkasan
 * yang ditulis ulang. Bullet `id` disalin VERBATIM dari poster; `en` adalah
 * terjemahannya, dipakai sebagai bahasa default karena seluruh sisa situs
 * berbahasa Inggris.
 *
 * ⚠️ Modul ini TIDAK menggantikan `ROLES` di `sections/Careers.tsx`. Tabel
 * Careers tetap sumber daftar lowongan (termasuk yang sudah `closed`); yang di
 * sini cuma role yang materinya sudah lengkap sampai layak jadi halaman. Yang
 * menjodohkan keduanya `CareerRole.slug`: role yang punya slug barisnya jadi
 * tautan ke halaman, yang belum tetap memakai accordion lama. Menambah lowongan
 * baru = tambah entri di sini + isi `slug` di sana, dan tidak ada tempat ketiga.
 */

export type JobLang = "en" | "id";

export type JobCopy = {
  /** Paragraf pembuka — "Join PT Cognitiva Solusi Indonesia and be part of…" */
  intro: string;
  /** Kolom kiri poster: "WHAT YOU WILL DO". */
  responsibilities: string[];
  /** Kolom kanan poster: "YOU ARE A GREAT FIT IF YOU". */
  qualifications: string[];
};

export type JobPosting = {
  /** Segmen URL. Wajib sama dengan `CareerRole.slug` di Careers.tsx. */
  slug: string;
  /** Judul yang tampil. Sengaja mengikuti EJAAN TABEL SITUS ("Full Stack
   *  Engineer"), bukan poster ("Full Stack Developer") — satu lowongan tidak
   *  boleh punya dua nama di halaman yang saling bertaut. */
  title: string;
  /** Foto header. Berkasnya di `public/careers/`. */
  photo: string;
  /**
   * Centang "Skills" di form lamaran. Sengaja PER LOWONGAN, bukan satu daftar
   * global: mencentang "Three.js" di lamaran Accountant tidak memberi tahu
   * siapa pun apa pun. Nama teknologinya dibiarkan apa adanya di kedua bahasa —
   * "React" tidak punya terjemahan.
   */
  skills: string[];
  /**
   * Form lamarannya ikut menanyakan tautan GitHub (opsional). PER LOWONGAN
   * dengan sengaja: pernah tetap untuk semua (sampai 27 Agu) dan di lamaran
   * Accountant / Customer Success isian itu tidak pernah terisi — yang tersisa
   * cuma pertanyaan yang jelas bukan untuk pelamarnya. Nyalakan hanya di
   * lowongan engineering.
   */
  askGithub?: boolean;
  en: JobCopy;
  id: JobCopy;
};

/**
 * Pilihan "Years of experience".
 *
 * `value` yang berangkat ke email SELALU sama untuk kedua bahasa — kalau
 * labelnya yang dikirim, satu inbox berisi campuran "3–5 years" dan "3–5 tahun"
 * untuk hal yang persis sama, dan lamaran jadi tidak bisa disortir.
 */
export const EXPERIENCE_OPTIONS = [
  { value: "0–1 years", en: "Less than 1 year", id: "Kurang dari 1 tahun" },
  { value: "1–2 years", en: "1–2 years", id: "1–2 tahun" },
  { value: "3–5 years", en: "3–5 years", id: "3–5 tahun" },
  { value: "5+ years", en: "More than 5 years", id: "Lebih dari 5 tahun" },
] as const;

/**
 * Label antarmuka yang ikut berganti bersama toggle bahasa.
 *
 * Ditaruh di modul yang sama dengan isinya, bukan diserak sebagai ternary di
 * JSX: kalau lowongan keempat menyusul, penerjemahnya cukup membaca satu
 * berkas ini untuk tahu SELURUH teks yang berbahasa.
 */
export const JOB_UI: Record<JobLang, {
  back: string;
  responsibilities: string;
  qualifications: string;
  langLabel: string;
}> = {
  en: {
    back: "Back to careers",
    responsibilities: "What you will do",
    qualifications: "You are a great fit if you",
    langLabel: "Language",
  },
  id: {
    back: "Kembali ke careers",
    responsibilities: "Apa yang akan kamu kerjakan",
    qualifications: "Kamu cocok untuk posisi ini kalau",
    langLabel: "Bahasa",
  },
};

/**
 * Teks form lamaran, ikut toggle bahasa yang sama dengan isi halaman.
 *
 * Dipisah dari `JOB_UI` bukan karena sifatnya beda melainkan karena jumlahnya:
 * digabung, label tombol "Apply" tenggelam di antara dua puluh placeholder.
 * Keduanya tetap di berkas ini supaya penerjemah cukup membaca satu tempat.
 *
 * Yang TIDAK ada di sini: pesan galat isian. Itu milik
 * `lib/careers/submitApplication.ts` — yang tahu SEBAB sebuah isian ditolak
 * cuma pemeriksanya, dan menyalin kalimatnya ke sini berarti aturannya hidup
 * di dua tempat.
 */
export const APPLY_UI: Record<JobLang, {
  heading: string;
  requiredNote: string;
  optional: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  location: string;
  locationPlaceholder: string;
  motivation: string;
  motivationPlaceholder: string;
  experience: string;
  experiencePlaceholder: string;
  skills: string;
  portfolio: string;
  linkedin: string;
  github: string;
  submit: string;
  sending: string;
  sentLabel: string;
  sentNote: string;
  idleNote: string;
}> = {
  en: {
    heading: "Apply now",
    requiredNote: "* All fields are required unless stated otherwise",
    optional: "optional",
    firstName: "First name",
    firstNamePlaceholder: "Jane",
    lastName: "Last name",
    lastNamePlaceholder: "Doe",
    email: "Email",
    location: "Where are you based?",
    locationPlaceholder: "Jakarta, Indonesia",
    motivation: "Why do you want to join?",
    motivationPlaceholder: "Because I want to build things people actually use",
    experience: "Years of experience",
    experiencePlaceholder: "Select one",
    skills: "Skills",
    portfolio: "Portfolio",
    linkedin: "LinkedIn",
    github: "GitHub",
    submit: "Apply",
    sending: "Sending…",
    sentLabel: "Sent ✓",
    sentNote: "Thanks — your application is in. We’ll be in touch.",
    idleNote: "Prefer email? Send your CV to careers@cogniti.id.",
  },
  id: {
    heading: "Lamar sekarang",
    requiredNote: "* Semua isian wajib kecuali ditandai opsional",
    optional: "opsional",
    firstName: "Nama depan",
    firstNamePlaceholder: "Jane",
    lastName: "Nama belakang",
    lastNamePlaceholder: "Doe",
    email: "Email",
    location: "Kamu berbasis di mana?",
    locationPlaceholder: "Jakarta, Indonesia",
    motivation: "Kenapa kamu ingin bergabung?",
    motivationPlaceholder: "Karena aku ingin membangun hal yang benar-benar dipakai orang",
    experience: "Lama pengalaman",
    experiencePlaceholder: "Pilih salah satu",
    skills: "Keahlian",
    portfolio: "Portofolio",
    linkedin: "LinkedIn",
    github: "GitHub",
    submit: "Kirim lamaran",
    sending: "Mengirim…",
    sentLabel: "Terkirim ✓",
    sentNote: "Terima kasih — lamaranmu sudah masuk. Kami akan menghubungi.",
    idleNote: "Lebih suka email? Kirim CV ke careers@cogniti.id.",
  },
};

export const JOBS: readonly JobPosting[] = [
  {
    slug: "full-stack-engineer",
    title: "Full Stack Engineer",
    photo: "/careers/fullstack-engineer.jpg",
    askGithub: true,
    /* Diturunkan dari kolom kualifikasi poster + baris Careers-nya, bukan
       daftar teknologi yang enak dipandang: tiap centang harus benar-benar
       mengubah cara lamaran itu dibaca. */
    skills: [
      "JavaScript / TypeScript",
      "React / Next.js",
      "Node.js",
      "PostgreSQL / SQL",
      "NoSQL",
      "REST API",
      "Git",
      "Docker / CI-CD",
      "AI / RAG",
      "Cloud (AWS / GCP)",
    ],
    en: {
      intro:
        "Join PT Cognitiva Solusi Indonesia and be part of our mission to build innovative technology that creates real impact.",
      responsibilities: [
        "Design, build, and maintain web applications from front-end to back-end",
        "Ship new features and improve the performance of existing applications",
        "Work with databases to keep data accurate and efficient",
        "Integrate APIs and third-party services",
        "Write clean, scalable, and maintainable code",
        "Collaborate with the product, design, and QA teams",
        "Handle testing, debugging, and deployment",
      ],
      qualifications: [
        "A D3/S1 in Informatics Engineering, Computer Science, or an equivalent field",
        "At least 2 years of experience as a Full Stack Developer",
        "Strong JavaScript/TypeScript, Node.js, and React",
        "A solid understanding of databases (SQL & NoSQL)",
        "Familiar with RESTful APIs, Git, and version control",
        "A problem solver, detail oriented and communicative",
        "Able to work independently and as part of a team",
      ],
    },
    id: {
      intro:
        "Bergabunglah dengan PT Cognitiva Solusi Indonesia dan jadi bagian dari misi kami membangun teknologi inovatif yang berdampak nyata.",
      responsibilities: [
        "Merancang, mengembangkan & memelihara aplikasi web dari front-end hingga back-end",
        "Membangun fitur baru dan meningkatkan performa aplikasi yang sudah ada",
        "Bekerja dengan database untuk memastikan integritas dan efisiensi data",
        "Melakukan integrasi API dan layanan pihak ketiga",
        "Menulis kode yang clean, scalable & maintainable",
        "Berkolaborasi dengan tim produk, desain & QA",
        "Melakukan testing, debugging & deployment",
      ],
      qualifications: [
        "Pendidikan minimal D3/S1 Teknik Informatika / Ilmu Komputer / sejenis",
        "Pengalaman minimal 2 tahun sebagai Full Stack Developer",
        "Menguasai JavaScript/TypeScript, Node.js, React",
        "Memahami database (SQL & NoSQL)",
        "Familiar dengan RESTful API, Git, dan version control",
        "Problem solver, detail oriented & komunikatif",
        "Mampu bekerja secara mandiri maupun dalam tim",
      ],
    },
  },
  {
    slug: "accountant",
    /* Poster: "MID-LEVEL ACCOUNTANT". Level-nya tidak ikut ke judul — tabel
       Careers menyebutnya "Accountant" saja, dan aturan satu-nama-per-lowongan
       yang sama dengan Full Stack Engineer berlaku di sini. Levelnya tetap
       terbaca dari kualifikasi ("3–5 tahun"). */
    title: "Accountant",
    photo: "/careers/accountant.jpg",
    skills: [
      "Bookkeeping",
      "Financial reporting",
      "Bank / AP / AR reconciliation",
      "Tax compliance",
      "Budgeting & forecasting",
      "Excel / Google Sheets",
      "Accounting software",
    ],
    en: {
      intro:
        "Join PT Cognitiva Solusi Indonesia and be part of our mission to build innovative technology that creates real impact.",
      responsibilities: [
        "Manage the company's transaction records and bookkeeping",
        "Prepare financial statements and management reports",
        "Perform bank, AP & AR reconciliations",
        "Manage invoices, payments, and finance administration",
        "Prepare and ensure the completeness of tax documents",
        "Help with budgeting, cash-flow monitoring & forecasting",
        "Ensure compliance with accounting standards and company policies",
      ],
      qualifications: [
        "An S1 degree in Accounting or Finance",
        "3–5 years of experience in accounting",
        "A solid understanding of accounting, taxation, and financial reporting",
        "Strong Excel/Google Sheets and accounting software skills",
        "Detail oriented, organized, and able to keep data confidential",
        "Able to work independently and as part of a team",
      ],
    },
    id: {
      intro:
        "Bergabunglah dengan PT Cognitiva Solusi Indonesia dan jadi bagian dari misi kami membangun teknologi inovatif yang berdampak nyata.",
      responsibilities: [
        "Mengelola pencatatan transaksi & pembukuan perusahaan",
        "Menyiapkan laporan keuangan & laporan manajemen",
        "Melakukan rekonsiliasi bank, AP & AR",
        "Mengelola invoice, payment & administrasi keuangan",
        "Menyiapkan & memastikan kelengkapan dokumen perpajakan",
        "Membantu budgeting, cash-flow monitoring & forecasting",
        "Memastikan kepatuhan terhadap standar akuntansi & kebijakan perusahaan",
      ],
      qualifications: [
        "S1 Akuntansi / Keuangan",
        "Pengalaman 3–5 tahun di bidang accounting",
        "Memahami akuntansi, perpajakan & pelaporan keuangan",
        "Menguasai Excel/Google Sheets & accounting software",
        "Teliti, terorganisir, & mampu menjaga kerahasiaan data",
        "Mampu bekerja mandiri maupun dalam tim",
      ],
    },
  },
  {
    slug: "customer-success",
    /* Poster: "CUSTOMER SUCCESS STAFF". "Staff" tidak ikut ke judul — tabel
       Careers menyebutnya "Customer Success", dan aturan satu-nama-per-lowongan
       yang sama dengan Full Stack Engineer & Accountant berlaku di sini. */
    title: "Customer Success",
    photo: "/careers/customer-success.jpg",
    /* Bukan daftar tools yang enak dipandang: tiap centang di sini benar-benar
       mengubah cara lamaran dibaca — pelamar yang pernah memegang CRM dan
       pelamar yang belum adalah dua lamaran yang berbeda. */
    skills: [
      "Client relationship",
      "Customer onboarding",
      "CRM",
      "Email / Chat / Zoom",
      "Complaint & escalation handling",
      "Documentation & reporting",
      "Product feedback",
    ],
    en: {
      intro:
        "Join PT Cognitiva Solusi Indonesia and be part of our mission to build innovative technology that creates real impact.",
      responsibilities: [
        "Be the main link between our customers and the company",
        "Understand what customers need and give them the best solution",
        "Help customers through onboarding and using the product",
        "Handle questions and complaints, and follow up properly",
        "Keep customers satisfied and build long-term relationships",
        "Collect customer feedback to improve the product and the service",
        "Work with the internal teams to make sure customer needs are met",
      ],
      qualifications: [
        "A D3/S1 degree in any field",
        "1–2 years of experience in Customer Service / Customer Success (a technology company is a plus)",
        "Communicative, empathetic, and solution oriented",
        "Able to work with many different types of customers",
        "Comfortable with a CRM and communication tools (email, chat, Zoom, and the like)",
        "Thorough and tidy with documentation and reporting",
        "Driven by customer satisfaction and hitting targets",
      ],
    },
    id: {
      intro:
        "Bergabunglah dengan PT Cognitiva Solusi Indonesia dan jadi bagian dari misi kami membangun teknologi inovatif yang berdampak nyata.",
      responsibilities: [
        "Menjadi penghubung utama antara pelanggan dan perusahaan",
        "Memahami kebutuhan pelanggan & memberikan solusi terbaik",
        "Membantu pelanggan dalam onboarding dan penggunaan produk",
        "Menangani pertanyaan, keluhan, dan memberikan follow up yang tepat",
        "Memastikan kepuasan pelanggan & membangun hubungan jangka panjang",
        "Mengumpulkan feedback pelanggan untuk peningkatan produk & layanan",
        "Bekerja sama dengan tim internal untuk memastikan kebutuhan pelanggan terpenuhi",
      ],
      qualifications: [
        "Pendidikan minimal D3/S1 (semua jurusan)",
        "Pengalaman 1–2 tahun di bidang Customer Service / Customer Success (diutamakan di perusahaan teknologi)",
        "Komunikatif, empatik & berorientasi pada solusi",
        "Mampu bekerja dengan berbagai tipe pelanggan",
        "Terbiasa menggunakan CRM & tools komunikasi (Email, Chat, Zoom, dll)",
        "Teliti, rapi dalam dokumentasi & laporan",
        "Berorientasi pada kepuasan pelanggan dan pencapaian target",
      ],
    },
  },
];

/** Lowongan dengan slug ini, atau null kalau tidak ada. */
export function getJob(slug: string | undefined): JobPosting | null {
  if (!slug) return null;
  return JOBS.find((job) => job.slug === slug) ?? null;
}

/**
 * Apakah pathname ini halaman lowongan?
 *
 * Dipakai `SiteLayout` untuk menyembunyikan hero 3D — dan itu sebabnya
 * pemeriksaannya SENGAJA tidak menuntut slug-nya dikenali: `/careers/ngawur`
 * juga halaman non-ruangan, dan hero-nya tidak boleh berkedip muncul sesaat
 * sebelum `<JobDetail>` mengalihkannya.
 */
export function isJobPath(pathname: string): boolean {
  return pathname.toLowerCase().startsWith("/careers");
}

/**
 * Isi halaman lowongan bawaan — LITERAL MURNI, tanpa satu pun impor.
 *
 * Alasan pemisahannya sama persis dengan `careerRolesFallback.ts`: berkas ini
 * dibaca `server/db/seed.ts`, dan skrip Node tidak boleh ikut menarik store
 * situs beserta tipe DOM-nya hanya untuk membaca sebuah array.
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
 * Isi halaman lowongan yang IKUT TER-BUNDLE.
 *
 * Sejak CMS hidup (Agu 2026) ini bukan lagi sumber utama — `content.json` yang
 * dipakai kalau berhasil diambil. Yang di sini adalah JARING PENGAMAN: kalau
 * berkas itu tidak ada, rusak, atau lambat, halaman lowongan tetap tampil
 * dengan isi terakhir yang ikut di-build.
 *
 * Karena itu jangan dikosongkan setelah datanya masuk database. Isi yang
 * kedaluwarsa beberapa minggu jauh lebih baik daripada halaman kosong.
 */
export const FALLBACK_JOBS: readonly JobPosting[] = [
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

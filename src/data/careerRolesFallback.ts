/**
 * Daftar lowongan bawaan — LITERAL MURNI, tanpa satu pun impor.
 *
 * "Tanpa impor" itu bukan kebetulan. Berkas ini dibaca dua pihak yang tidak
 * punya browser: `server/db/seed.ts` saat mengisi database, dan test Node.
 * Begitu ia mengimpor sesuatu dari `@/lib/...`, `fetch`/`AbortController` ikut
 * terseret ke program TypeScript bertipe Node dan pemeriksaannya gagal — bukan
 * karena kodenya salah, tapi karena diperiksa dengan pustaka yang keliru.
 *
 * Perannya sesudah CMS hidup: JARING PENGAMAN. Kalau `content.json` gagal
 * diambil atau kelewat lama, inilah yang tampil. Jangan dikosongkan meski
 * datanya sudah ada di database — situs tanpa cadangan akan menampilkan tabel
 * careers kosong saat API mati.
 */

export type CareerRole = {
  title: string;
  /** Kolom "Type" tabel — departemen saja ("Engineering"). Lokasi sengaja
   *  tidak ditampilkan, jadi jangan gabungkan lagi jadi satu string meta. */
  type: string;
  /** "closed" = baris abu-abu statis: bukan <button>, tanpa hover, tanpa
   *  preview foto, tanpa accordion. Detailnya tidak dirender sama sekali. */
  status: "open" | "closed";
  overview: string;
  skills: string[];
  /** Foto preview yang mengikuti kursor (desktop) / tampil di body (touch). */
  photo: string;
  /**
   * Slug halaman lowongan (`/careers/<slug>`), kalau materinya sudah lengkap —
   * isinya di `data/jobs.ts`.
   *
   * ADA slug  → barisnya jadi <Link> ke halaman itu; accordion TIDAK dirender.
   * TANPA slug → perilaku lama: <button aria-expanded> + accordion di tempat.
   *
   * Dua bentuk itu hidup berdampingan dengan sengaja: tiga lowongan sedang
   * dipindahkan ke halaman sendiri satu per satu, dan yang belum kebagian tetap
   * harus bisa dibaca. Baris `closed` tidak pernah pakai slug — tidak ada yang
   * bisa dilamar di sana.
   */
  slug?: string;
};

// Konten role (overview + skills) diambil utuh dari careers section V1
// (Website-CSI index.html) — copy yang sudah tayang, bukan placeholder.
//
// `status: "closed"` = lowongan sudah ditutup: barisnya abu-abu dan mati
// (lihat ClosedRoleRow). Untuk membuka lagi tinggal ganti ke "open" —
// overview/skills/photo-nya sudah siap dan langsung terpakai.
export const FALLBACK_ROLES: CareerRole[] = [
  {
    title: "Innovation & Growth Manager",
    type: "Management and Strategy",
    status: "closed",
    overview:
      "Lead market discovery, strategic partnerships, and growth initiatives. This role connects innovation with real-world adoption, bridging what we build with who needs it.",
    skills: [
      "Strategic thinking",
      "Business development",
      "Market validation",
      "Stakeholder engagement",
      "Communication",
    ],
    photo: "/careers/innovation-growth-manager.jpg",
  },
  {
    title: "Technical Lead",
    type: "Engineering",
    status: "closed",
    overview:
      "Lead engineering execution, guide technical decisions, and mentor the development team. You see architecture before you see code, and you care about shipping as much as quality.",
    skills: ["Full-stack", "Architecture", "Team leadership", "Delivery ownership"],
    photo: "/careers/technical-lead.jpg",
  },
  {
    title: "Product Builder",
    type: "Product",
    status: "closed",
    overview:
      "Build, test, and iterate new ideas quickly. You move from concept to working product without needing perfect conditions, and you own what you ship.",
    skills: [
      "Builder mindset",
      "Fast execution",
      "Full-stack",
      "Curiosity",
      "Strong ownership",
    ],
    photo: "/careers/product-builder.jpg",
  },
  {
    title: "Full Stack Engineer",
    type: "Engineering",
    status: "open",
    /* Punya halaman sendiri → baris ini TAUTAN, bukan accordion. Isinya di
       data/jobs.ts; keduanya harus memakai slug yang persis sama. Ketiga
       lowongan open sekarang lewat jalur ini. */
    slug: "full-stack-engineer",
    overview:
      "Design and develop modern web applications, APIs, backend systems, and intelligent digital products. AI/RAG and cloud experience is a strong plus.",
    skills: [
      "React / Next.js",
      "Node.js",
      "PostgreSQL",
      "API integration",
      "Git",
      "AI / RAG / Cloud",
    ],
    photo: "/careers/fullstack-engineer.jpg",
  },
  {
    title: "Accountant",
    type: "Finance",
    status: "open",
    slug: "accountant",
    overview:
      "Own the books end to end: bookkeeping, tax compliance, payroll, and monthly reporting. You keep the numbers clean enough that the team can make decisions from them.",
    skills: [
      "Bookkeeping",
      "Tax compliance",
      "Financial reporting",
      "Accounting software",
      "Attention to detail",
    ],
    photo: "/careers/accountant.jpg",
  },
  {
    title: "Customer Success",
    type: "Customer Success",
    status: "open",
    slug: "customer-success",
    /* overview & skills di bawah TIDAK dirender lagi (baris ber-slug tidak
       punya accordion) — dibiarkan hidup supaya baris ini bisa dikembalikan
       jadi accordion tanpa menulis ulang isinya, sama seperti baris closed. */
    overview:
      "Be the bridge between our clients and what we build. You onboard, support, and grow accounts, turning feedback into product direction instead of letting it sit in a thread.",
    skills: [
      "Client relationship",
      "Onboarding",
      "Problem solving",
      "Communication",
      "Product empathy",
    ],
    photo: "/careers/customer-success.jpg",
  },
  {
    title: "Resource & Development",
    /* Kolom Type TIDAK boleh mengulang judulnya persis: barisnya akan
       terbaca "Resource & Development | Resource & Development", dan test
       closed-role yang mencari judul lewat getByText langsung menemukan dua
       simpul. "Human Resources" dipakai karena R&D di sini adalah fungsi
       HRD (Human Resource & Development). */
    type: "Human Resources",
    status: "closed",
    /* Baris closed tidak merender overview/skills/photo sama sekali (lihat
       ClosedRoleRow). Ketiganya diisi ringkas supaya barisnya bisa dibuka
       lagi cukup dengan mengganti status → "open"; isinya diganti dengan
       copy poster resmi saat itu, dan fotonya belum ada di public/careers/. */
    overview:
      "Grow the people and the practices behind what we ship: hiring, onboarding, and internal capability building.",
    skills: [
      "Recruitment",
      "Onboarding",
      "People development",
      "Process documentation",
      "Communication",
    ],
    photo: "/careers/resource-development.jpg",
  },
];

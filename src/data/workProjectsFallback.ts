/**
 * Isi "Selected Work" yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `valuesFallback.ts` dan `crewFallback.ts`: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/work.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari yang tayang sebelum ada CMS, termasuk sifat
 * sementaranya: teks dan angka hasilnya masih ilustrasi, dan gambarnya masih
 * hotlink stok Unsplash yang dipilih menurut temanya. Justru itu alasan CMS
 * ini ada — begitu editor mengganti satu proyek dengan tangkapan layar
 * sungguhan, yang berlaku adalah isi database dan berkas ini berhenti jadi
 * sumber kebenaran.
 */

export type WorkProjectContent = {
  /** Nama proyek — sekaligus `key` React di lima tempat, jadi harus unik. */
  title: string;
  /** Nama klien, dicetak di baris kecil di atas judul. */
  client: string;
  /** Dicetak apa adanya di sebelah klien. Teks, supaya "2023–2024" mungkin. */
  year: string;
  /** Label kecil di bawah judul. */
  tags: string[];
  /** Gambar kartu. Tidak opsional: kartunya SELURUHNYA gambar — tanpa ini yang
   *  tayang adalah ikon "gambar rusak" bawaan peramban. */
  image: string;
  /** Satu baris hasil di kaki kartu. Kosong = barisnya berikut garis
   *  pemisahnya tidak dirender. */
  outcome?: string;
};

export const FALLBACK_WORK_PROJECTS: WorkProjectContent[] = [
  {
    title: "Citizen Service Portal",
    client: "Regional Government",
    year: "2024",
    tags: ["Web Platform", "Next.js", "PostgreSQL"],
    image: "https://images.unsplash.com/photo-1611639906810-4a29ece1b847?w=1200&q=80&auto=format&fit=crop",
    outcome: "67% faster turnaround",
  },
  {
    title: "SIPD Implementation",
    client: "District Government",
    year: "2023",
    tags: ["Gov Platform", "Training"],
    image: "https://images.unsplash.com/photo-1758270704925-fa59d93119c1?w=1200&q=80&auto=format&fit=crop",
    outcome: "200+ staff trained",
  },
  {
    title: "Field Operations Suite",
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    tags: ["Real-time", "Mobile + Web"],
    image: "https://images.unsplash.com/photo-1646082276009-bb35409086ed?w=1200&q=80&auto=format&fit=crop",
    outcome: "30% cost reduction",
  },
  {
    title: "Cloud Infrastructure Migration",
    client: "Manufacturing Group",
    year: "2024",
    tags: ["Cloud", "DevOps", "Docker"],
    image: "https://images.unsplash.com/photo-1784652852605-6945598f2af3?w=1200&q=80&auto=format&fit=crop",
    outcome: "99.9% uptime achieved",
  },
  {
    title: "Knowledge Assistant",
    client: "Financial Services Firm",
    year: "2024",
    tags: ["LLM", "RAG", "React"],
    image: "https://images.unsplash.com/photo-1739036868260-c26b292cd85d?w=1200&q=80&auto=format&fit=crop",
    outcome: "5,000+ queries/month",
  },
  {
    title: "Analytics Dashboard",
    client: "Government Agency",
    year: "2024",
    tags: ["Data Viz", "Python"],
    image: "https://images.unsplash.com/photo-1516383274235-5f42d6c6426d?w=1200&q=80&auto=format&fit=crop",
    outcome: "50+ data sources unified",
  },
  {
    title: "Procurement Portal",
    client: "Enterprise Corporation",
    year: "2023",
    tags: ["ERP Integration", "TypeScript"],
    image: "https://images.unsplash.com/photo-1716363340859-e2a0ab1396a5?w=1200&q=80&auto=format&fit=crop",
    outcome: "100% paperless",
  },
  {
    title: "API Gateway & Middleware",
    client: "Telecommunications",
    year: "2024",
    tags: ["API", "Node.js", "Legacy Bridge"],
    image: "https://images.unsplash.com/photo-1698668975271-2ba9a323be6b?w=1200&q=80&auto=format&fit=crop",
    outcome: "Zero-downtime migration",
  },
];

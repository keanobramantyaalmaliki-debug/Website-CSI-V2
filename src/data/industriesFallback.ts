/**
 * Ketiga belas sektor yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `servicesFallback.ts` dan kawan-kawannya: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/industries.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari literal `INDUSTRIES` yang dulu tinggal di
 * berkas ini juga, dengan dua hal yang ditinggalkan:
 *
 * - **nomor "01"–"13"** — sekarang diturunkan dari posisi baris, supaya tidak
 *   ada dua sumber kebenaran yang bisa melenceng. Lihat `shared/industry.ts`.
 * - **`imageAlt`** — teks alternatif yang tidak pernah punya `<img>` untuk
 *   ditempeli: fotonya tekstur WebGL di dalam pembungkus `aria-hidden`.
 *   Ketiga belasnya terisi rapi dan tidak satu pun pernah dibaca.
 */

export type IndustryTier = "core" | "also";

export type IndustryContent = {
  /** Nama sektor di HUD, kartu fokus, navigasi sentuh, dan daftar sr-only. */
  name: string;
  /** Satu kalimat penjelas — HUD hover, badan kartu fokus, daftar sr-only. */
  desc: string;
  /** `core` mencetak label "Core Focus"; `also` mencetak "Sector". */
  tier: IndustryTier;
  /** Foto yang muncul di plank saat kartunya dibuka. */
  image: string;
};

export const FALLBACK_INDUSTRIES: IndustryContent[] = [
  {
    name: "Government & Public Sector",
    desc: "National platforms and citizen services, built to scale and stay accountable.",
    tier: "core",
    image:
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Smart Cities",
    desc: "Connected infrastructure that turns urban data into livable outcomes.",
    tier: "core",
    image:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Digital Villages",
    desc: "Bringing modern services to rural communities, one connected village at a time.",
    tier: "core",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Healthcare",
    desc: "Systems that keep patient care coordinated, secure, and on time.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Education",
    desc: "Platforms that put learning and administration on the same page.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Finance",
    desc: "Secure, compliant systems for money that has to move and be trusted.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Hospitality",
    desc: "Guest experiences that feel effortless from booking to checkout.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Retail & E-Commerce",
    desc: "Storefronts and operations that keep pace with demand.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Manufacturing",
    desc: "Floor-to-cloud visibility that keeps production moving.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Logistics",
    desc: "Tracking and routing that make every shipment predictable.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Property & Real Estate",
    desc: "Tools that manage spaces, tenants, and portfolios in one place.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Professional Services",
    desc: "Workflows that let expert teams bill, deliver, and scale.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Startups & Enterprises",
    desc: "From first MVP to enterprise rollout, built to grow with you.",
    tier: "also",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop",
  },
];

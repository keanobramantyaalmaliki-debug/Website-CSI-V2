/**
 * Isi "Case Studies" yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `workProjectsFallback.ts`: dua pembaca yang sangat berbeda bergantung pada
 * sifat itu —
 *
 * 1. `src/data/caseStudies.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari yang tayang sebelum ada CMS, termasuk sifat
 * sementaranya: ceritanya masih ilustrasi dan gambarnya masih hotlink stok
 * Unsplash yang dipilih menurut temanya.
 */

export type CaseStudyContent = {
  /** Judul besar di dalam overlay — sekaligus `key` React tiap blok. */
  title: string;
  /** Nama klien. Muncul dua kali: baris meta di atas gambar, dan kolom
   *  "Client" di kaki cerita. */
  client: string;
  /** Teks, bukan angka — supaya "2023–2024" mungkin. */
  year: string;
  /** Sektor klien, misalnya "Public Sector". */
  industry: string;
  /** Label kecil di kaki cerita. */
  scope: string[];
  /** Satu baris hasil, dicetak tebal di atas gambar. */
  outcome: string;
  /** Kalimat pembuka di dalam tanda kutip — kutipan MASALAHNYA, bukan pujian
   *  klien. Testimoni bernama tinggal di halaman Services. */
  quote: string;
  /** Isi cerita, beberapa paragraf dipisah satu baris kosong (`\n\n`). */
  desc: string;
  /** Gambar besar yang sekaligus tombol pembuka cerita. Tidak opsional. */
  image: string;
};

export const FALLBACK_CASE_STUDIES: CaseStudyContent[] = [
  {
    title: "Citizen Service Portal",
    client: "Regional Government",
    year: "2024",
    industry: "Public Sector",
    scope: ["Web Platform", "SIPD Integration", "Staff Training"],
    outcome: "67% faster turnaround",
    quote:
      "Thousands of requests a month, permits, letters, complaints, still processed by hand at a counter.",
    desc: "This regional government handles thousands of service requests every month: permits, official letters, complaints, all processed manually through physical counters. The process was slow, opaque, and required in-person attendance.\n\nCogniti designed a unified portal connecting every department under one interface. Citizens submit requests online, the system routes them to the right office, and they can track status in real time. Average processing time dropped from 5 days to under 2 days.",
    image:
      "https://images.unsplash.com/photo-1611639936963-b6d13dc44dbe?w=1400&q=80&auto=format&fit=crop",
  },
  {
    title: "Field Operations Suite",
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    industry: "Infrastructure",
    scope: ["Mobile App", "Real-time Monitoring", "API Integration"],
    outcome: "30% cost reduction",
    quote:
      "Field teams across hundreds of sites, coordinating by phone, with information that arrived too late to matter.",
    desc: "Field teams spread across hundreds of sites, with no centralized visibility: coordination relied on phone calls and messaging apps. Incidents were frequently delayed because information never reached the right people in time.\n\nCogniti built a real-time monitoring and dispatch platform that links crew locations, asset data, and incident logs in a single workspace. Supervisors can see the full operation from one screen and dispatch teams within minutes.",
    image:
      "https://images.unsplash.com/photo-1742112125567-3e8967bad60f?w=1400&q=80&auto=format&fit=crop",
  },
];

/**
 * Kelima kartu deployment yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `industriesFallback.ts` dan kawan-kawannya: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/deployments.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari literal `DEPLOYMENTS` yang dulu tinggal di
 * `Deployments.tsx`, dengan dua perubahan:
 *
 * - **nomor "01"–"05" ditinggalkan** — sekarang diturunkan dari posisi baris,
 *   supaya tidak ada dua sumber kebenaran yang bisa melenceng. Lihat
 *   `shared/deployment.ts`.
 * - **`image` ikut masuk ke barisnya** — dulu ia hasil pencarian di peta
 *   `SECTOR_IMAGE` di `DeploymentCard.tsx` yang berkunci NAMA SEKTOR. Peta itu
 *   tidak mungkin bertahan begitu namanya bisa diketik editor: satu penggantian
 *   nama menjatuhkan kartunya ke foto Public Services tanpa satu pun error.
 *   URL-nya sama persis dengan yang dipetakan peta itu.
 */

export type DeploymentContent = {
  /** Judul kartu. Contoh: "Public Services". */
  sector: string;
  /** Wilayah, tercetak sebaris dengan nomornya: "03 · International". */
  region: string;
  /** Satu-dua kalimat isi kartu. */
  desc: string;
  /** Foto latar kartu — grayscale saat diam, menyala saat hover/scroll. */
  image: string;
};

export const FALLBACK_DEPLOYMENTS: DeploymentContent[] = [
  {
    sector: "Public Services",
    region: "Indonesia",
    desc: "Citizens reach government services online, and every agency works from the same information at the same time.",
    image:
      "https://images.unsplash.com/photo-1756227584303-f1400daaa69d?w=900&q=80&auto=format&fit=crop",
  },
  {
    sector: "Infrastructure",
    region: "Indonesia",
    desc: "Physical assets and field crews report in as they work, so issues show up while there's still time to act.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80&auto=format&fit=crop",
  },
  {
    sector: "Logistics",
    region: "International",
    desc: "Every shipment stays visible from origin to delivery. Routine handoffs run on their own, and crews in the field decide with data that is actually current.",
    image:
      "https://images.unsplash.com/photo-1645736315000-6f788915923b?w=900&q=80&auto=format&fit=crop",
  },
  {
    sector: "Hospitality",
    region: "Southeast Asia",
    desc: "Property operations and guest service share one system, with revenue reporting built into the same view.",
    image:
      "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=900&q=80&auto=format&fit=crop",
  },
  {
    sector: "Communities",
    region: "Indonesia",
    desc: "A single platform ties residents to their local administrators and services, working the same way online and in person.",
    image:
      "https://images.unsplash.com/photo-1691724414154-8b1551e7b292?w=900&q=80&auto=format&fit=crop",
  },
];

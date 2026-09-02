"use client";

import { useMemo } from "react";

import DeploymentCard from "@/components/sections/DeploymentCard";
import DeploymentCta from "@/components/sections/DeploymentCta";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList } from "@/components/motion/FadeUp";
import { deployments } from "@/data/deployments";

export default function Deployments() {
  /* Dipanggil DI DALAM komponen, bukan di ruang modul. `deployments()` membaca
     content.json yang baru terisi setelah `loadContent()` selesai; kalau
     hasilnya dibekukan jadi `const` di atas berkas, section ini akan
     menampilkan isi cadangan bundle selamanya TANPA satu pun error —
     lihat memori `cms-data-module-scope-gotcha`. */
  const kartu = useMemo(() => deployments(), []);

  /* Daftar kosong = section hilang seluruhnya, dan itu aman untuk aturan
     jarak 80px: section ini `pt-0 pb-20`, CsiHero di atasnya sudah `pb-20`,
     dan Process di bawahnya `pt-0`. Jadi begitu section ini absen, celah
     CsiHero→Process tetap persis 80px dari satu angka yang sama. (Beda dengan
     Visi, yang WAJIB selalu render karena dialah pemilik celahnya.) */
  if (kartu.length === 0) return null;

  return (
    <section
      id="deployments"
      /* ⚠️ TANPA latar sendiri, dan itu disengaja (18 Agu). Di sini dulu ada
         `linear-gradient(to bottom, rgba(9,9,11,0.4), transparent)` — wash
         gelap setinggi section yang pekat di puncaknya. Selama CsiHero masih
         memakai `bg-background` yang opak, wash itu tersamar; begitu latar
         CsiHero dicabut, ia terbaca sebagai BALOK gelap dengan garis potong
         tegas persis di perbatasan dua section. Latar halaman (body +
         `.ambient-grid`) sudah cukup — jangan pasang wash di sini lagi. */
      /* Mobile: pt-0 (celah ke CsiHero dijatah SATU angka di sana, pb-20) dan
         pb-20 = 80px ke Process yang juga pt-0 — aturan 28 Agu, lihat
         PeopleIntro.tsx. ≥sm kembali py-32. */
      className="section-shell relative overflow-x-clip px-3 pt-0 pb-20 sm:py-32"
    >
      {/* T1 — heading diam dengan line-mask reveal, idiom yang sama dengan
          h2 pembuka section lain.

          Dulu <PhysicsHeading>: tiap kata jadi rigid body matter-js dan
          berjatuhan saat kursor masuk. DICABUT 24 Agu atas permintaan Keano —
          bentuk ini persis cabang `prefers-reduced-motion` komponen itu, jadi
          tampilan diamnya tidak berubah sedikit pun. Eyebrow "DEPLOYMENTS"
          sudah dihapus lebih dulu 18 Agu (judulnya menyebut isinya sendiri). */}
      <h2 className="relative max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>
          Built for real-world environments where decisions matter.
        </LineMask>
      </h2>

      {/* Deployment cards with stagger entrance */}
      <FadeUpList className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Nomor "01"–"05" DITURUNKAN dari posisi, tidak pernah disimpan:
            editor yang menghapus kartu ke-2 tidak boleh meninggalkan urutan
            01, 03, 04. Cadangan bundle pun sudah tanpa kolom `num`.
            Kuncinya pasangan sektor·wilayah — pasangan itulah yang unik di
            basis data (`deployments_sector_region_alive`), bukan sektornya
            sendiri; "Logistics · Indonesia" dan "Logistics · International"
            memang dua kartu berbeda. Indeks TIDAK dipakai sebagai key supaya
            urutan yang berubah tidak menukar state animasi antar kartu. */}
        {kartu.map((d, i) => (
          <DeploymentCard
            key={`${d.sector} · ${d.region}`}
            d={{ ...d, num: String(i + 1).padStart(2, "0") }}
          />
        ))}
        <DeploymentCta />
      </FadeUpList>
    </section>
  );
}

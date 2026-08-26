"use client";

import { motion, useReducedMotion } from "motion/react";
import { VALUES } from "@/data/people";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Panel berhenti di bawah navbar (4rem) DAN di bawah label yang ikut menempel.
 * Tinggi label dikunci lewat `h-[38px] sm:h-[42px]` di headernya — kalau angka
 * itu diubah, ubah juga di sini, kalau tidak panel akan menutupi labelnya
 * sendiri.
 */
const STICKY_TOP = "sticky top-[calc(4rem+38px)] sm:top-[calc(4rem+42px)]";

/**
 * Satu nilai = satu panel selebar layar. Dipisah jadi komponennya sendiri
 * supaya `whileInView` per panel tidak dirakit ulang setiap `VALUES` berubah.
 *
 * Panel dibungkus `<li>` sticky; latarnya WAJIB opaque (`bg-background`) —
 * itu yang membuat panel berikutnya benar-benar menutupi panel di atasnya
 * saat discroll, bukan sekadar lewat di depannya secara transparan.
 */
function ValuePanel({
  value,
  reduced,
}: {
  value: (typeof VALUES)[number];
  reduced: boolean;
}) {
  // Tinggi panel = tinggi kontennya, dengan sela 10px ke garis batas atas dan
  // bawah. Tanpa `min-h` viewport: panel setinggi layar menyisakan ruang kosong
  // besar di bawah foto.
  //
  // Di layar sempit ketiga blok TIDAK boleh jatuh bertumpuk vertikal: panelnya
  // jadi lebih tinggi dari viewport dan tumpukan sticky-nya terasa macet. Jadi
  // di mobile judul membentang penuh, lalu foto dan uraian berdampingan dua
  // kolom — panelnya tetap muat di bawah navbar + label. Dari `sm` sampai
  // sebelum `md` (ponsel landscape) kolom fotonya DIKUNCI 200px: dibiarkan
  // setengah lebar, foto persegi itu tumbuh ikut lebar layar dan panelnya
  // kembali lebih tinggi dari viewport yang pendek.
  const content = (
    <div className="border-t border-white/[0.09] bg-background px-3 py-[10px]">
      <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8 lg:gap-12">
        {/* Kiri — judul besar */}
        <div className="col-span-2 md:col-span-1">
          <h2 className="text-3xl leading-[0.95] font-semibold tracking-tight text-zinc-300 sm:text-4xl lg:text-5xl xl:text-6xl">
            {value.title}
          </h2>
          <p className="mt-3 text-[10px] tracking-widest text-zinc-500 uppercase sm:mt-4 sm:text-xs">
            {value.tagline}
          </p>
        </div>

        {/* Tengah — ruang foto. `value.photo` masih kosong di data, jadi yang
            tampil bingkainya: begitu fotonya ada, tinggal isi field-nya. */}
        <div className="relative aspect-square w-full overflow-hidden border border-white/[0.09] bg-white/[0.02]">
          {value.photo ? (
            <img
              src={value.photo}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center text-[10px] tracking-[0.25em] text-zinc-700 uppercase"
            >
              Photo
            </span>
          )}
        </div>

        {/* Kanan — uraian */}
        <p className="text-sm leading-relaxed font-medium text-zinc-300 md:text-base lg:text-lg">
          {value.description}
        </p>
      </div>
    </div>
  );

  // Reduced motion: tanpa pin, tanpa tumpukan — daftar vertikal biasa.
  if (reduced) return <li>{content}</li>;

  return (
    <li className={STICKY_TOP}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {content}
      </motion.div>
    </li>
  );
}

/**
 * "What We Stand For" — tiap nilai jadi satu panel selebar layar: judul di
 * kiri, foto di tengah, uraian di kanan. Panel-panelnya `position: sticky`
 * dengan offset yang sama, jadi saat discroll panel berikutnya naik menutupi
 * panel sebelumnya sampai berhenti di nilai terakhir (Long-Term Thinking).
 *
 * Tumpukan aktif di semua lebar, termasuk mobile. Syaratnya panel harus tetap
 * lebih pendek dari viewport — sticky pada elemen yang lebih tinggi dari
 * viewport terasa macet — makanya layout mobilenya dipadatkan jadi judul
 * membentang + foto/uraian berdampingan, bukan tiga blok bertumpuk.
 */
export default function PeopleValues() {
  const reduced = !!useReducedMotion();

  return (
    <section
      id="people-values"
      className="section-shell overflow-x-clip py-24"
      aria-label="What We Stand For"
    >
      {/* Pembungkus label + daftar = containing block sticky-nya label, jadi
          labelnya lepas tepat saat item terakhir habis — bukan ikut terbawa
          sampai ujung padding bawah section. */}
      <div className="relative">
        {/* Label ikut menempel di bawah navbar selama panel-panelnya lewat.
            SENGAJA tanpa z-index: panel datang belakangan di DOM, jadi panel
            menang. Selama sebuah panel menempel keduanya tidak bersinggungan
            (label 64–106px, panel mulai di 106px); yang menang barulah terasa
            di item TERAKHIR — sticky-nya habis di ujung daftar, ia menggulir
            naik dan menimbun labelnya, alih-alih saling menabrak. `bg-background`
            supaya panel yang lewat di baliknya tidak menembus. Tinggi dikunci
            karena dipakai menghitung STICKY_TOP; `pb-[18px]` = jarak label ke
            garis batas item. Menempel di semua lebar — sejalan dengan panelnya,
            yang juga menempel sampai ke mobile. */}
        <div className="sticky top-16 flex h-[38px] items-end bg-background px-3 pb-[18px] sm:h-[42px]">
          <motion.p
            className="text-xl leading-none font-semibold tracking-tight text-zinc-500 sm:text-2xl"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            What We Stand For
          </motion.p>
        </div>

        {/* Runway pendek di ujung daftar: tanpa ini item terakhir tidak pernah
            benar-benar berhenti — ia anak terakhir, jadi sticky-nya habis
            persis saat tercapai — dan langsung menggulir menimbun labelnya. */}
        <ol className="list-none pb-[12vh]">
          {VALUES.map((value) => (
            <ValuePanel key={value.title} value={value} reduced={reduced} />
          ))}
        </ol>
      </div>
    </section>
  );
}

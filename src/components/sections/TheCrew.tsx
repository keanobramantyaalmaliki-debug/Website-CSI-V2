"use client";

import { Fragment, useState } from "react";
import { useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import CrewAvatar from "@/components/sections/CrewAvatar";
import TheCrewMobileCarousel from "@/components/sections/TheCrewMobileCarousel";
import { TEAM_MEMBERS } from "@/data/people";
import type { TeamMember } from "@/data/people";

/** Departemen tampil dalam urutan hierarki ini, bukan urutan abjad. */
const CATEGORIES: TeamMember["category"][] = ["Management", "Developer", "R & D"];

/**
 * Judul kolom "A-Z" dan nama departemen memakai SATU kelas yang sama — ukuran,
 * bobot, dan warnanya sengaja identik. Dulu keduanya beda warna (zinc-600 vs
 * zinc-400), dan itulah yang terbaca "ukurannya beda" padahal ukurannya memang
 * sama: label yang lebih redup terlihat lebih kecil. Sekarang satu kelas, jadi
 * tidak bisa lepas lagi sendiri-sendiri.
 *
 * `zinc-600` di sini adalah warna yang DULU dipakai tautan sosial. Pertukarannya
 * disengaja: label mundur ke warna paling redup, dan seisi baris (nama, jabatan,
 * sosial) naik ke satu warna terang — lihat `ROW_TEXT`.
 *
 * 15px, dan itu LEBIH BESAR dari isi barisnya (`ROW_SIZE`, 13px) — hierarki
 * ukurannya memang terbalik dari kebiasaan. Yang menahannya supaya tidak
 * berteriak adalah warnanya: label ini paling redup di seluruh seksi, jadi
 * bobot dan ukurannya terbaca sebagai judul kolom, bukan sebagai data.
 */
const COLUMN_LABEL = "text-[15px] font-extrabold uppercase tracking-widest text-zinc-600";

/**
 * Ukuran isi baris — nama, jabatan, DAN tautan sosial, ketiganya 13px.
 *
 * Satu konstanta karena ketiganya harus bergerak bersama: begitu salah satu
 * lepas sendiri, barisnya berhenti terbaca sebagai satu garis dan berubah jadi
 * judul-plus-subjudul. Yang membedakan mereka cuma bobot (nama `font-medium`)
 * dan huruf besar (sosial `uppercase`), bukan ukuran.
 */
const ROW_SIZE = "text-[13px]";

/**
 * Tautan sosial: seukuran nama & jabatan, dan sejak 17 Agu **tanpa `uppercase`**.
 *
 * `tracking-widest` ikut dicabut, bukan karena diminta terpisah: spasi antar
 * huruf selebar itu adalah konvensi untuk micro-label KAPITAL. Di teks huruf
 * kecil ia terbaca melar, dan di baris ini ia jadi satu-satunya teks berjarak
 * lebar di antara nama & jabatan yang tracking-nya normal. Jadi begitu kapitalnya
 * hilang, alasan tracking-nya hilang juga.
 *
 * Teksnya sekarang apa adanya dari data (`"linkedin"`, `"x"` — huruf kecil
 * semua), BUKAN hasil transform CSS. Kalau nanti mau "LinkedIn"/"X", tempat
 * benarnya adalah `platform` di `data/people.ts` atau peta label khusus —
 * `capitalize` cuma akan menghasilkan "Linkedin" yang salah tulis.
 *
 * Yang menandainya sebagai tautan sekarang: hover ke putih, plus posisinya rata
 * kanan di kolomnya sendiri.
 */
const SOCIAL_LABEL = ROW_SIZE;

/**
 * Warna isi baris — nama, jabatan, DAN tautan sosial semuanya di sini.
 *
 * Hierarkinya sengaja dibalik dari versi sebelumnya: dulu judul kolom yang
 * paling terang dan jabatan/sosial yang redup. Sekarang judul kolom mengambil
 * warna redup (lihat `COLUMN_LABEL` di atas) dan seisi baris naik ke satu warna
 * yang sama — jadi label mundur ke belakang dan datanya yang terbaca dulu.
 */
const ROW_TEXT = "text-zinc-200";

/**
 * Dua kolom seksi ini: daftar nama (kiri) + dinding foto (kanan). Kirinya
 * DIPATOK selebar yang dibutuhkan teksnya (28rem/32rem), bukan `1fr`, dan
 * sisanya jatuh semua ke dinding foto lewat `1fr`.
 *
 * Ini yang membuat lima foto per baris muat TANPA mengecilkan fotonya. Waktu
 * kedua kolom masih 50/50, lima tile terjepit di separuh lebar dan malah jadi
 * lebih kecil dari layout empat-kolom sebelumnya. Sekarang kebalikannya: makin
 * lebar viewport, seluruh kelebihannya masuk ke foto (di 2000px tile ~268px,
 * lebih besar dari ~232px versi empat kolom), sementara daftar nama berhenti
 * memelar — 32rem itu pas untuk jabatan terpanjang tanpa terbelah dua baris.
 *
 * Masthead memakai konstanta yang SAMA supaya judul "The Crew" tetap duduk
 * tepat di atas dinding foto.
 */
const COL_GRID =
  "lg:grid lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-x-[10px] xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]";

/**
 * Baris daftar ala basement: nama · jabatan · sosial dalam tiga kolom sejajar
 * (bukan nama-di-atas-jabatan). Dipakai juga oleh baris judul kolom supaya
 * label departemen jatuh tepat di kolom jabatan.
 *
 * Jarak jabatan→sosial dirapatkan oleh lebar kolomnya di `COL_GRID`, bukan oleh
 * `max-w` di baris ini: hasilnya sama rapatnya, tapi lebar yang dihemat jatuh
 * ke dinding foto, tidak menganggur sebagai ruang kosong. Sosial tetap rata
 * kanan supaya membentuk kolom rapi, bukan ragged mengikuti panjang jabatan.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-baseline gap-4 xl:grid-cols-[10rem_minmax(0,1fr)_auto] xl:gap-6";

/**
 * Tanpa filter: semua orang tampil sekaligus, diurutkan A–Z **di dalam** tiap
 * departemen — persis basement, di mana "A-Z" adalah judul kolom nama, bukan
 * urutan global yang mengaduk departemen jadi satu tumpukan.
 *
 * Dihitung di tingkat modul, bukan `useMemo`: sumbernya konstanta impor, jadi
 * hasilnya tak pernah berubah sepanjang umur aplikasi.
 */
const GROUPED = CATEGORIES.map((cat) => ({
  cat,
  members: TEAM_MEMBERS.filter((m) => m.category === cat).sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
})).filter((g) => g.members.length > 0);

/**
 * Dinding foto & korsel HP memakai urutan yang sama dengan daftar kiri, supaya
 * hover di satu sisi menunjuk kotak yang sejajar di sisi lain.
 */
const ORDERED = GROUPED.flatMap((g) => g.members);

/**
 * Baris/kotak yang sedang disorot diangkat ke atas tirai gelap. Nilainya
 * DITARUH DI SINI, satu tempat, karena tirai (z-40) dan yang disorot (z-45)
 * cuma bermakna berpasangan — lihat INVARIANTS §2.
 */
const SPOTLIT = "relative z-[45]";

export default function TheCrew() {
  // Hover/focus adalah SATU-SATUNYA sumber baris aktif. Dulu ada lapisan kedua
  // yang menyalakan baris terdekat ke tengah kotak scroll, tapi kotak scroll-nya
  // sudah dibuang (daftar ikut scroll halaman seperti basement), jadi tidak ada
  // lagi "posisi scroll" yang bisa diukur di sini.
  const [activeName, setActiveName] = useState<string | null>(null);
  const reduced = !!useReducedMotion();
  const spotlightOn = activeName !== null;

  return (
    <section
      id="crew"
      /* Mobile: pt-0 (celah 80px ke PeopleValues dijatah di pb-20 sana) dan
         pb-20 = 80px ke Careers yang juga pt-0 (aturan 28 Agu, lihat
         PeopleIntro.tsx); ≥sm kembali py-24 seperti semula. */
      className="section-shell px-3 pt-0 pb-20 sm:py-24"
    >
      {/* Tirai sorot — MENUTUPI SELURUH VIEWPORT, bukan cuma seksi ini, jadi
          hover satu nama menggelapkan seisi halaman.

          Navbar tetap menyala TANPA perlu diperlakukan khusus: ia duduk di akar
          pada z-50, sementara tirai ini terkurung di dalam <main> yang
          `relative z-10` (stacking context) — jadi seluruh isi <main>, tirai
          termasuk, dikomposit di bawah navbar. Angka 40/45 di sini karena itu
          bersifat lokal terhadap <main>; kalaupun <main> melepas z-10 (terjadi
          saat form inquiry terbuka), 40 masih di bawah navbar 50. INVARIANTS §2.

          `pointer-events-none` WAJIB: tanpa itu tirai menutupi baris yang
          sedang di-hover, mouseleave langsung tembak, dan sorotnya berkedip
          mati-hidup. `hidden lg:block` supaya di layar sentuh — yang tidak
          punya hover dan hanya memakai korsel — tirai ini tidak pernah ada. */}
      <div
        aria-hidden="true"
        data-testid="crew-spotlight"
        data-active={spotlightOn}
        className={`pointer-events-none fixed inset-0 z-40 hidden bg-black/60 lg:block ${
          reduced ? "" : "transition-opacity duration-300"
        } ${spotlightOn ? "opacity-100" : "opacity-0"}`}
      />

      {/* Masthead — di desktop judul duduk di atas dinding foto (ala basement),
          dengan jumlah kepala menempel ke tepi paling kanan. */}
      <div className={COL_GRID}>
        <div aria-hidden="true" className="hidden lg:block" />
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[0.95] tracking-tight text-zinc-100">
            <LineMask>The Crew</LineMask>
          </h2>
          {/* Angkanya berdiri sendiri, tanpa kata "people": pada masthead
              seperti ini angka di sebelah "The Crew" sudah terbaca sebagai
              jumlah orang. Sengaja BUKAN font-mono — pada ukuran display angka
              mono terbaca sempit dan teknis di sebelah judul sans yang tebal;
              sifat angka-rapinya dijaga `tabular-nums`. */}
          <span className="inline-block text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-none tracking-tight tabular-nums text-zinc-600">
            {ORDERED.length}
          </span>
        </div>
      </div>

      {/* Desktop — dinding foto (kanan) disinkronkan dengan indeks nama (kiri) */}
      {/* 18px dari masthead — kedua kolom mulai dari garis yang SAMA, jadi tepi
          atas dinding foto lurus dengan label "A-Z" di kolom nama. Perataan itu
          datang dari grid-nya sendiri (satu baris, dua sel), bukan dari angka
          yang disetel manual, jadi ia tidak bisa lepas kalau tinggi label atau
          ukuran tile berubah. */}
      <div className={`mt-[18px] hidden ${COL_GRID}`}>
        <div data-testid="crew-index">
          {GROUPED.map(({ cat, members }, groupIndex) => (
            <div key={cat} className={groupIndex === 0 ? "" : "mt-12"}>
              {/* "A-Z" hanya sekali di grup pertama (ia judul kolom nama);
                  nama departemen selalu sejajar dengan kolom jabatan. */}
              <div className={`${ROW_GRID} border-b border-white/[0.08] pb-2`}>
                {groupIndex === 0 ? (
                  <p className={COLUMN_LABEL}>A-Z</p>
                ) : (
                  <span aria-hidden="true" />
                )}
                <p className={COLUMN_LABEL}>{cat}</p>
                <span aria-hidden="true" />
              </div>

              <FadeUpList>
                {members.map((member) => {
                  const isActive = activeName === member.name;
                  return (
                    <FadeUpItem
                      key={member.name}
                      tag="article"
                      /* z-index-nya di ELEMEN INI, bukan cuma di div dalam:
                         article-lah yang dianimasikan motion (transform/opacity),
                         jadi ia yang boleh membuat stacking context sendiri.
                         Menaruh z di anaknya berisiko terkurung di dalamnya. */
                      className={isActive ? SPOTLIT : undefined}
                    >
                      <div
                        tabIndex={0}
                        onMouseEnter={() => setActiveName(member.name)}
                        onMouseLeave={() => setActiveName(null)}
                        onFocus={() => setActiveName(member.name)}
                        onBlur={() => setActiveName(null)}
                        className={`${ROW_GRID} border-b border-white/[0.06] py-2 focus:outline-none`}
                      >
                        {/* Nama & jabatan sengaja SEUKURAN, dibedakan hanya oleh
                            warna — ini yang membuat baris basement terbaca rapi
                            sebagai satu garis, bukan judul-plus-subjudul.
                            Penanda baris aktif SATU-SATUNYA sekarang adalah
                            sorot (baris terangkat di atas tirai gelap); pita
                            oranye di margin kiri sudah dicabut. */}
                        <h3
                          className={`${ROW_SIZE} font-medium leading-snug transition-colors duration-200 ${
                            isActive ? "text-zinc-50" : ROW_TEXT
                          }`}
                        >
                          {member.name}
                        </h3>
                        <p className={`${ROW_SIZE} leading-snug ${ROW_TEXT}`}>
                          {member.role}
                        </p>
                        {/* Pemisahnya KOMA, bukan `flex gap` (17 Agu).
                            Keduanya tidak bisa dipakai bersamaan: gap menaruh
                            jarak di KEDUA sisi koma, jadi komanya melayang
                            lepas dari kata sebelumnya ("linkedin , x"). Karena
                            itu wadahnya kembali jadi aliran teks biasa dan
                            spasinya datang dari string `", "` itu sendiri.

                            Komanya hanya muncul untuk item ke-2 ke atas, jadi
                            yang cuma punya satu tautan tidak pernah kebagian
                            koma menggantung. `whitespace-nowrap` menjaga
                            "linkedin, x" tetap satu baris di kolom sempit. */}
                        {member.social ? (
                          <div
                            className={`${ROW_SIZE} ${ROW_TEXT} justify-self-end whitespace-nowrap`}
                          >
                            {member.social.map((s, i) => (
                              <Fragment key={s.platform}>
                                {i > 0 ? <span aria-hidden="true">{", "}</span> : null}
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${SOCIAL_LABEL} ${ROW_TEXT} transition-colors duration-200 hover:text-white`}
                                >
                                  {s.platform}
                                </a>
                              </Fragment>
                            ))}
                          </div>
                        ) : (
                          <span aria-hidden="true" />
                        )}
                      </div>
                    </FadeUpItem>
                  );
                })}
              </FadeUpList>
            </div>
          ))}
        </div>

        {/* Dinding foto — 5 kotak per baris (13 orang = 3 baris), celah 4px
            & sudut lurus. Tiap kotak diberi garis tepi tipis (lihat className
            CrewAvatar di bawah) supaya kotak kosong tetap terbaca sebagai sel. */}
        <div
          data-testid="crew-wall"
          className="grid grid-cols-5 content-start gap-1"
        >
          {ORDERED.map((member) => {
            const isActive = activeName === member.name;
            return (
              <button
                key={member.name}
                type="button"
                aria-label={member.name}
                onMouseEnter={() => setActiveName(member.name)}
                onMouseLeave={() => setActiveName(null)}
                onFocus={() => setActiveName(member.name)}
                onBlur={() => setActiveName(null)}
                className={isActive ? SPOTLIT : undefined}
              >
                {/* Tanpa prop `dimmed` lagi: yang meredupkan kotak lain sekarang
                    tirai sorot yang menutupi seluruh halaman, jadi meredupkan
                    per-kotak cuma menumpuk efek yang sama dua kali. */}
                {/* Outline lewat `border`, bukan `ring`: ring-1 sudah dipakai
                    CrewAvatar sebagai penanda kotak aktif (warna aksen), jadi
                    keduanya bisa hidup berdampingan tanpa saling menimpa. */}
                <CrewAvatar
                  photoUrl={member.photoUrl}
                  name={member.name}
                  active={isActive}
                  className="rounded-none border border-white/[0.08]"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile — autoplay + swipe carousel, one person at a time */}
      <div className="mt-12 lg:hidden">
        <TheCrewMobileCarousel people={ORDERED} />
      </div>
    </section>
  );
}

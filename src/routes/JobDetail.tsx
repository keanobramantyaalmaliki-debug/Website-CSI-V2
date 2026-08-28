import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import ApplyForm from "@/components/sections/ApplyForm";
import SiteFooter from "@/components/SiteFooter";
import { scrollToTop } from "@/lib/smoothScroll";
import { getJob, JOB_UI, type JobLang } from "@/data/jobs";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Pilihan bahasa pengunjung. Prefiks "cogniti:" mengikuti sisa storage situs. */
const LANG_KEY = "cogniti:job-lang";

/**
 * localStorage MELEMPAR (bukan mengembalikan null) di Safari privat — pola yang
 * sama sudah dijaga di lib/contact/submitInquiry.ts. Bahasa halaman lowongan
 * tidak sepadan dengan halaman kosong, jadi kegagalannya ditelan dan
 * default-nya menang.
 */
function readLang(): JobLang {
  try {
    return localStorage.getItem(LANG_KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

function writeLang(lang: JobLang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* Preferensinya hilang saat reload. Bukan alasan merusak halaman. */
  }
}

/**
 * Halaman detail satu lowongan — `/careers/<slug>`.
 *
 * Bukan route berdiri sendiri melainkan anak <SiteLayout> (lihat App.tsx):
 * <Canvas> hero tetap hidup di belakang layar supaya menekan Back tidak
 * mengunduh ulang office.glb. Hero-nya disembunyikan oleh SiteLayout, halaman
 * ini tidak tahu-menahu soal 3D.
 */
export default function JobDetail() {
  const { slug } = useParams();
  const job = getJob(slug);
  const reduced = useReducedMotion();

  const [lang, setLang] = useState<JobLang>(readLang);
  const copy = job?.[lang];
  const ui = JOB_UI[lang];

  /*
   * Reset gulir. Router TIDAK melakukannya sendiri — tidak ada
   * <ScrollRestoration> di mana pun di situs ini — jadi klik lowongan dari
   * /people yang sudah tergulir 70% akan mendarat di offset yang sama, di
   * tengah-tengah halaman baru.
   *
   * Lewat helper smoothScroll, bukan window.scrollTo: Lenis yang memegang
   * posisi gulir, dan menulisnya langsung membuat keduanya berselisih
   * (dijaga smoothScrollCallsites.invariant.test.ts).
   */
  useEffect(() => {
    scrollToTop();
  }, [slug]);

  useEffect(() => {
    if (!job) return;
    const previous = document.title;
    document.title = `${job.title} — Careers · cogniti.id`;
    return () => {
      document.title = previous;
    };
  }, [job]);

  /*
   * Slug tak dikenal (tautan salah ketik / lowongan yang sudah ditutup dan
   * dicabut isinya) dipulangkan ke daftarnya, bukan ke 404: pengunjung yang
   * mengejar tautan lowongan hampir pasti ingin melihat lowongan yang MASIH
   * ada. `replace` supaya Back-nya tidak memantul balik ke slug mati.
   *
   * ⚠️ Di bawah semua hook — memulangkannya lebih awal akan membuat jumlah
   * hook berbeda antar-render (react-hooks/rules-of-hooks).
   */
  if (!job || !copy) return <Navigate to="/people#careers" replace />;

  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-10% 0px" },
      };

  return (
    <>
      {/*
        `section-shell` seperti section lain (QC zoom-out): tanpa jepitan,
        halaman ini melar dari tepi ke tepi saat browser di-zoom-out — persis
        bug yang sudah dibereskan di 14 section pada 26 Agu. Alasan lama
        menolak shell di sini ("tepi menganga ~200px di monitor lebar") gugur
        sejak plafonnya dinamis via shellMax.ts: pada zoom 100% shell = lebar
        layar fisik → tetap full-bleed di monitor selebar apa pun; yang
        terjepit hanya viewport zoom-out. `px-3` (12px) tetap jadi jarak ke
        tepi kolom. <ApplyForm/> di bawah memakai shell + kolomnya sendiri.

        pt-15 = 60px. Bilah navbar terukur 44px (fixed, jadi tidak menyumbang
        tinggi apa pun ke aliran halaman) dan baris teks pertama menggantung 2px
        di bawah tepi atas kotaknya sendiri: 60 − 44 + 2 = 18px jarak yang
        benar-benar terlihat antara bilah dan "Back to careers".
      */}
      {/* pb mobile 80px = SELURUH celah visual ke ApplyForm (yang memang
          tanpa pt); aturan antar-section 28 Agu, lihat PeopleIntro.tsx.
          ≥sm kembali pb-24. */}
      <article className="section-shell px-3 pt-15 pb-20 sm:pb-24">
        <Link
          to="/people#careers"
          className="inline-flex items-center gap-2 text-sm font-light text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <span aria-hidden="true">&larr;</span>
          {ui.back}
        </Link>

        <div className="mt-8 flex flex-col gap-6 sm:mt-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="max-w-3xl text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] font-semibold tracking-tight text-zinc-100">
              {job.title}
            </h1>
          </div>

          {/* Toggle bahasa. Cuma menukar isi HALAMAN INI — navbar dan form
              Contact tetap Inggris seperti sisa situs. */}
          <div
            className="flex shrink-0 items-center gap-1 self-end rounded-full border border-white/10 bg-white/[0.03] p-1"
            role="group"
            aria-label={ui.langLabel}
          >
            {(["en", "id"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLang(code);
                  writeLang(code);
                }}
                aria-pressed={lang === code}
                className={`rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase transition-colors ${
                  lang === code
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          className="mt-10 grid gap-8 sm:mt-14 lg:grid-cols-[45fr_55fr] lg:items-center lg:gap-12"
          {...fade}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {/*
            Plafon dalam ala basement (diskusi 27 Agu): kolom fr melebar terus
            sampai shell 1920 menjepit, dan di layar 1280 jepitan itu baru
            terasa di zoom <67% (1280/1920). basement mengakalinya bukan lewat
            shell — KONTEN-nya yang punya ukuran intrinsik (65ch paragraf,
            846px blok), jadi saat viewport membesar yang tumbuh cuma ruang
            kosong. Foto dipatok 600px = ukurannya di viewport ±1400: di bawah
            itu (MacBook 1280, tablet) tak tersentuh, zoom-out mulai ±90%
            langsung membeku. Konsekuensi sadar: di monitor 1920 foto tampil
            600px, bukan 830px penuh kolomnya — persis basement yang membiarkan
            ruang kosong tumbuh di monitor besar. lg-only supaya cabang satu
            kolom (HP/tablet potret) tetap selebar kolomnya.
          */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] lg:max-w-[600px]">
            <img
              src={job.photo}
              alt=""
              /* Dekoratif: tidak menyampaikan apa pun yang tidak sudah tertulis
                 di judul & isi, jadi alt-nya sengaja kosong. */
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {/* 65ch = ukuran baca; paragraf berhenti melebar jauh sebelum
              kolomnya, di zoom berapa pun. */}
          <p className="max-w-[65ch] text-base leading-relaxed font-light text-zinc-300 sm:text-lg">
            {copy.intro}
          </p>
        </motion.div>

        <div className="mt-16 grid gap-12 sm:mt-20 lg:grid-cols-2 lg:gap-16">
          <JobList title={ui.responsibilities} items={copy.responsibilities} fade={fade} />
          <JobList title={ui.qualifications} items={copy.qualifications} fade={fade} />
        </div>
      </article>

      {/* Form lamarannya sendiri, BUKAN section Contact seperti dulu: satu
          halaman dengan dua form membuat pelamar menebak mana yang benar-benar
          mengirim lamaran, dan kolom pesan bebas tidak pernah menghasilkan
          lamaran yang bisa dibandingkan satu sama lain. Contact tetap hidup di
          seluruh halaman lain — yang dicabut cuma dari sini. */}
      <ApplyForm job={job} lang={lang} />

      {/* Kaki yang sama dengan halaman lain. Dicabut bersama <Contact/> tanpa
          disadari — halaman ini sempat jadi satu-satunya yang berakhir tanpa
          alamat, kanal sosial, maupun hak cipta. Sengaja DI LUAR <article>:
          isinya bukan bagian dari lowongannya.

          Rata tepi 12px mengikuti <article> di atasnya, bukan kolom form —
          kaki halaman memang dari tepi ke tepi KOLOM shell; shell-nya ikut
          dipasang di sini supaya saat zoom-out footer tidak sendirian melar
          lebih lebar dari isi halaman di atasnya. */}
      <SiteFooter className="section-shell px-3 pb-6" />
    </>
  );
}

function JobList({
  title,
  items,
  fade,
}: {
  title: string;
  items: readonly string[];
  fade: Record<string, unknown>;
}) {
  return (
    <motion.section {...fade} transition={{ duration: 0.7, ease: EASE }}>
      {/* Kapital kecil 12px yang lama terbaca sebagai LABEL, bukan judul — dua
          bagian isi halaman ini praktis tidak punya kepala. Sekarang ukuran
          judul betulan: tebal, terang, dan tanpa `uppercase`/`tracking` lebar
          yang cuma masuk akal untuk teks sekecil itu. */}
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
        {title}
      </h2>
      {/* Ukuran baca yang sama dengan paragraf intro — butir list tidak ikut
          melebar bersama kolom grid-nya (plafon dalam ala basement). */}
      <ul className="mt-6 max-w-[65ch] space-y-4">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-relaxed font-light text-zinc-300 sm:text-base"
          >
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-orange-500" />
            {item}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

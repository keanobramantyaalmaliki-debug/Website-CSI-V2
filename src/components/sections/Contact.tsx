"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InquiryLaptop from "@/components/motion/InquiryLaptop";
import ContactForm from "@/components/sections/ContactForm";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { useNarrowViewport } from "@/lib/hooks/useNarrowViewport";
import { setScrollLocked } from "@/lib/smoothScroll";
import { useSceneStore } from "@/lib/store/sceneStore";
import { SOCIALS } from "@/data/socials";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";

/* Default `config.default` milik react-spring — tension 170, friction 26, mass 1.
   Disalin apa adanya supaya rasa buka-tutupnya sama persis dengan pmndrs
   floating-laptop; `motion` menamainya stiffness/damping. Rasio redamnya 0,997,
   praktis kritis: tidak ada pantulan lewat pose terbuka.

   ⚠️ Ini SEKARANG hanya menggerakkan ENGSEL. Kameranya punya pegasnya sendiri. */
const HINGE_SPRING = { stiffness: 170, damping: 26, mass: 1 };

/**
 * Pegas KAMERA — sengaja jauh lebih lembut daripada pegas engsel.
 *
 * Dulu keduanya satu nilai, dan itu keliru: 170/26 pas untuk engsel yang
 * memutar 110° di tempat, tapi kamera menempuh 0,4 m ke arah muka pengunjung.
 * Perjalanan sejauh itu dengan pegas secepat itu terbaca sebagai SENTAKAN, bukan
 * dolly — laporan "terlalu cepet ngezoomnya menjadi ngeflick".
 *
 * 55/23/1 → rasio redam 1,55 (OVERDAMPED, jadi tidak ada pantulan melewati pose
 * akhir), akar lambatnya −2,71 rad/dtk → tetapan waktu 0,37 dtk, 95% pada ~1,1
 * dtk. Mulainya pelan, dekatnya melunak. Efek sampingnya juga bagus: engsel
 * selesai lebih dulu (~0,5 dtk), jadi urutannya jadi "lid membuka, baru kamera
 * mendekat" — bukan dua gerakan yang saling menumpuk.
 */
const CAMERA_SPRING = { stiffness: 55, damping: 23, mass: 1 };

/** Di bawah ini nilai pegas kamera dianggap sudah pulang. Bukan `=== 0`: pegas
 *  mendekat secara asimtotis, dan menunggu nol persis berarti lapisan overlay
 *  bisa menggantung satu-dua frame lebih lama dari yang terlihat. */
const CAMERA_HOME = 0.002;

/**
 * Gerak MELAYANG ala pmndrs dimatikan selama laptop terbuka. **Sengaja, dan
 * bisa dibalik dengan mengubah baris ini saja.**
 *
 * Waktu melayang itu diminta, isi layarnya masih kosong — laptopnya benda hias,
 * dan ayunannya memang hidup. Sekarang layarnya form yang harus dibaca, diklik,
 * dan diketik. Dua akibat yang tidak bisa ditawar: sasaran klik yang bergerak
 * sulit dikenai, dan `<Html transform>` meraster DOM sekali lalu memiringkannya
 * lewat CSS 3D — miring sedikit saja teksnya melunak, padahal seluruh rig
 * overlay ini justru dibangun supaya layarnya TEGAK LURUS dan teksnya tajam.
 *
 * Efek sampingnya bagus: tanpa animasi tanpa ujung, frameloop tetap "demand"
 * selama form dipakai — nol draw call sambil pengunjung mengetik.
 */
const FLOAT_WHEN_OPEN = false;

export default function Contact() {
  /* Laptop mulai TERTUTUP dan hanya membuka kalau diklik — sama seperti
     `useState(false)` + `onClick` di pmndrs. Dulunya digerakkan scroll; yang
     berganti cuma SUMBER nilai 0→1-nya, rig engselnya tidak disentuh. */
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const narrow = useNarrowViewport();
  const progress = useSpring(0, HINGE_SPRING);
  const zoom = useSpring(0, CAMERA_SPRING);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Di perangkat sentuh form-nya TIDAK lewat laptop 3D (INVARIANTS §6): laptop
     tetap tertutup sebagai pemandangan, dan yang muncul lembar datar biasa.
     `narrow` ikut menggugurkan overlay-nya karena alasan yang BERBEDA, dan
     keduanya memang perlu: `coarse` soal tidak adanya hover, `narrow` soal
     ruang. Jendela sempit berpenunjuk presisi — desktop yang dikecilkan, atau
     tablet ber-mouse — lolos dari `coarse` tapi tetap tidak punya tempat: rig
     overlay-nya terkendala LEBAR, jadi kamera mundur jauh dan layarnya cuma
     mengisi seperempat tinggi. Terpotret 13 Agu di 390px: form-nya utuh tapi
     terlalu kecil untuk dibaca. Di bawah 768px pakai lembar datar saja. */
  const overlay = open && !coarse && !narrow;
  const sheet = open && (coarse || narrow);

  useEffect(() => {
    const target = overlay ? 1 : 0;
    /* prefers-reduced-motion: tetap bisa dibuka, tapi LANGSUNG. `jump` menyetel
       nilai tanpa menjalankan pegasnya (`set` akan menganimasikan). */
    if (reduced) {
      progress.jump(target);
      zoom.jump(target);
    } else {
      progress.set(target);
      zoom.set(target);
    }
  }, [overlay, reduced, progress, zoom]);

  /**
   * Lapisan overlay bertahan MENGAMBANG sampai kameranya benar-benar pulang.
   *
   * Ini betulan sebuah bug, bukan pemanis: dulu `fixed inset-0` digerbangi
   * `overlay` langsung, jadi begitu tombol tutup ditekan lapisannya SEKETIKA
   * turun kembali ke kotak setinggi 52vh — padahal kameranya masih close-up.
   * Selama ~1 detik sisa animasinya laptop digambar sebesar layar penuh di
   * dalam kotak sekecil itu, dan yang di bawahnya (footer) memotongnya. Itu
   * "waktu close macbooknya terpotong dengan footer".
   *
   * Disetel saat RENDER, bukan di useEffect: efek jalan setelah paint, jadi
   * akan ada satu frame yang keadaan promoted-nya sudah salah — persis kedipan
   * yang sedang dihilangkan. Ini pola "menyesuaikan state saat render" yang
   * memang disarankan React; nilainya konvergen dalam satu putaran.
   */
  const [settling, setSettling] = useState(false);
  if (overlay && !settling) setSettling(true);
  const promoted = overlay || settling;

  useEffect(() => {
    if (overlay) return;
    const check = (v: number) => {
      if (v <= CAMERA_HOME) setSettling(false);
    };
    check(zoom.get()); // reduced-motion `jump` bisa sudah mendarat sebelum ini
    return zoom.on("change", check);
  }, [overlay, zoom]);

  const close = useCallback(() => setOpen(false), []);

  /**
   * Geometri kotak laptop saat MENYATU di halaman, diukur tepat sebelum ia
   * naik jadi overlay: tingginya, dan jarak pusatnya dari pusat viewport.
   *
   * Dipakai `InquiryLaptop` untuk membatalkan LOMPATAN saat lapisan berpindah
   * ke `fixed inset-0`. Tanpa ini canvas-nya seketika berubah dari 468px jadi
   * setinggi layar — dan karena `fov` three.js vertikal, laptopnya ikut membesar
   * ~2× dalam satu frame, di posisi yang berbeda pula. Zoom yang mulus setelah
   * lompatan sebesar itu tetap terbaca sebagai sentakan.
   */
  const [dock, setDock] = useState({ h: 0, dy: 0 });

  const openForm = useCallback(() => {
    const box = boxRef.current;
    if (box) {
      const r = box.getBoundingClientRect();
      setDock({ h: r.height, dy: r.top + r.height / 2 - window.innerHeight / 2 });
    }
    setOpen(true);
  }, []);

  /* Kunci gulir + lepas kurungan z-index + Esc + kembalikan fokus. Satu efek
     karena keempatnya punya masa hidup yang sama persis: selama form terbuka.
     Fokus dipindah ke tombol tutup, bukan ke isian pertama — isian itu hidup di
     dalam <Html> milik drei yang dipasang belakangan, sedangkan tombol tutup ada
     di pohon ini dan pasti sudah ter-render saat efek ini jalan.

     Digerbangi `promoted`, bukan `open` — keempatnya harus bertahan sampai
     kameranya pulang, bukan sampai tombol tutup ditekan:

     • `setInquiryOpen` melepas kurungan stacking context <main> (z-10). Kalau ia
       mati saat tombol ditekan, lapisan `z-[55]` yang MASIH close-up terperangkap
       kembali di dalam <main> dan Navbar (z-50) menggaris memotongnya — persis
       kelas bug yang sama dengan potongan footer, cuma pindah ke tepi atas.
     • `setScrollLocked` menahan halaman. `dock.dy` diukur SEKALI saat membuka
       dan dipakai memulangkan kamera ke posisi kotak; kalau halaman sempat
       digulir selagi laptop terbang pulang, kotaknya sudah pindah dan laptopnya
       mendarat meleset sejauh itu, lalu menyentak saat lapisannya turun.

     Di perangkat sentuh tidak ada bedanya: `overlay` selalu false di sana, jadi
     `settling` tak pernah menyala dan `promoted === open`.

     Fokus dipindah ke tombol tutup, bukan ke isian pertama — isian itu hidup di
     dalam <Html> milik drei yang dipasang belakangan, sedangkan tombol tutup ada
     di pohon ini dan pasti sudah ter-render saat efek ini jalan. */
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!promoted) return;
    const { setInquiryOpen } = useSceneStore.getState();
    setScrollLocked(true);
    setInquiryOpen(true);
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setScrollLocked(false);
      setInquiryOpen(false);
      /* Fokus TIDAK dikembalikan di sini. Pemicunya baru dipasang lagi setelah
         lapisan overlay turun (`!promoted`), jadi saat efek ini dibersihkan
         `triggerRef.current` masih null dan `.focus()` tidak mengenai apa pun —
         fokusnya jatuh ke <body> dan pengguna keyboard kehilangan tempatnya.
         Yang ditinggalkan cuma niatnya; efek di bawah yang menagihnya. */
      restoreFocus.current = true;
    };
  }, [promoted, close]);

  useEffect(() => {
    if (promoted || !restoreFocus.current) return;
    restoreFocus.current = false;
    triggerRef.current?.focus();
  }, [promoted]);

  /* Padanan <web.h1> pmndrs yang memudar saat laptop membuka. */
  const hintOpacity = useTransform(progress, [0, 0.3], [1, 0]);

  /* Tirainya ikut pegas kamera, jadi gelapnya TUMBUH bersama majunya kamera dan
     memudar lagi saat mundur — dulu ia muncul dan hilang seketika, yang membuat
     transisinya terasa dua kejadian terpisah. Penuh di 0,6 supaya halaman sudah
     benar-benar tenggelam sebelum kamera sampai. */
  const scrimOpacity = useTransform(zoom, [0, 0.6], [0, 1]);

  return (
    <section id="contact" className="overflow-x-clip px-6 py-24 sm:px-10 sm:py-32">
      {/* ⚠️ Kepala section — eyebrow "CONTACT", judul besar "Let's Start A
          Conversation.", subjudul "We typically respond within one business
          day.", dan sepasang pil CTA — DIHAPUS 13 Agu atas permintaan Keano.
          Alasannya redundansi, bukan selera: begitu form-nya pindah ke layar
          MacBook, judul dan subjudul itu ada DUA KALI di layar yang sama
          (lihat ContactForm.tsx — judul di atas, catatan waktu balas di kaki).
          Kalau kelak form-nya dilepas dari laptop, kepalanya perlu kembali.

          Kedua tautannya tidak ikut hilang, cuma turun ke footer di bawah:
          `hello@cogniti.id` sebagai jalur cadangan kalau form-nya gagal, dan
          "↑ Back to the office" karena itu navigasi, bukan isi yang berulang.

          Catatan merge 13 Agu: origin/main sempat mengoreksi title-case judul
          ini ("A" → "a") tepat saat sisi sini memindahkannya ke layar MacBook;
          koreksinya dibawa ke rumah barunya di ContactForm.tsx. */}

      {/* MacBook yang membuka saat diklik. Untuk sekarang lid-nya masih kosong —
          form-nya menyusul (rencana §4: ContactForm.tsx + submitInquiry.ts).
          Tingginya dipatok, bukan aspect-ratio, supaya canvas tidak ikut melar
          di layar lebar dan laptopnya tetap seukuran benda nyata.

          ⚠️ Pemicunya <button> DOM, bukan raycast ke mesh seperti pmndrs.
          Alasannya mengikat: nanti laptop ini satu-satunya jalan ke form, dan
          INVARIANTS §6 melarang scene 3D menerima interaksi di pointer kasar.
          Tombol DOM jalan di sentuh, keyboard, dan pembaca layar sekaligus —
          raycast tidak. */}
      {/* ⚠️ `mt-16` dilepas bersama kepala section di atas — sudah tidak ada apa
          pun untuk diberi jarak; jarak atasnya sekarang dari `py-24 sm:py-32`
          milik section. Jarak ke footer DIPERBESAR (mt-32) supaya laptopnya
          punya ruang bernapas sendiri sekarang ia berdiri sendirian. */}
      <div
        ref={boxRef}
        className="h-[52vh] max-h-[520px] min-h-[280px] w-full"
        data-inquiry-laptop=""
      >
        {/* Tirai gelap. WAJIB elemen DOM: canvas-nya `alpha: true` dan yang ada
            di belakangnya halaman HTML, jadi tidak ada cara memburamkan halaman
            dari DALAM WebGL. `pointer-events-none` karena yang menangkap klik
            "di luar form" adalah lapisan di bawahnya, bukan tirai ini. */}
        {promoted && (
          <motion.div
            style={{ opacity: scrimOpacity }}
            className="pointer-events-none fixed inset-0 z-[54] bg-black/70 backdrop-blur-md"
            aria-hidden="true"
          />
        )}

        {/* Kotak luar di atas tetap memesan tingginya, jadi saat lapisan ini
            berpindah ke `fixed` halaman di belakang tidak melompat.

            Digerbangi `promoted`, BUKAN `overlay`: lihat catatan di atas — turun
            terlalu cepat = laptop close-up digambar di kotak 52vh dan terpotong
            footer. Selagi menutup ia sudah tidak bisa diklik lagi. */}
        <div
          className={
            promoted
              ? `fixed inset-0 z-[55] flex items-center justify-center${
                  overlay ? "" : " pointer-events-none"
                }`
              : "relative h-full w-full"
          }
          /* Klik di mana pun DI LUAR form menutup — termasuk di atas canvas,
             yang menutupi seluruh layar dan kalau tidak begini akan menelan
             klik yang seharusnya mengenai tirai. Form-nya sendiri menghentikan
             rambatan (lihat pembungkusnya di bawah). */
          onClick={overlay ? close : undefined}
          role={overlay ? "dialog" : undefined}
          aria-modal={overlay ? true : undefined}
          aria-label={overlay ? "Inquiry form" : undefined}
        >
          <InquiryLaptop
            progress={progress}
            zoom={zoom}
            dockHeight={promoted ? dock.h : 0}
            dockOffsetY={promoted ? dock.dy : 0}
            floating={overlay && FLOAT_WHEN_OPEN && !reduced}
            className="h-full w-full"
            screen={
              overlay ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="h-full w-full overflow-hidden"
                >
                  <ContactForm className="h-full w-full" />
                </div>
              ) : undefined
            }
          />

          {overlay && (
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              data-inquiry-close=""
              className="absolute top-6 right-6 z-[56] rounded-full border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-zinc-300 uppercase transition-colors hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Close ✕
            </button>
          )}

          {/* Pemicunya SAUDARA canvas, bukan pembungkusnya, dan hanya ada saat
              tertutup. Dulu <button> membungkus seluruh laptop; begitu layarnya
              berisi form, susunan itu jadi <button><input></button> — HTML tak
              sah, dan setiap klik di dalam form ikut menutup laptopnya.

              Digerbangi `!promoted`, bukan `!open`: selagi menutup lapisan ini
              masih `fixed inset-0`, jadi pemicu `absolute inset-0`-nya akan
              melebar seukuran layar dan hint "click to open"-nya nongol di
              puncak viewport di tengah animasi. */}
          {!promoted && (
            <button
              ref={triggerRef}
              type="button"
              onClick={openForm}
              aria-expanded={false}
              data-inquiry-toggle=""
              className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40"
            >
              <span className="sr-only">Open the inquiry form</span>
              <motion.span
                aria-hidden="true"
                style={{ opacity: hintOpacity }}
                /* Di ATAS, bukan di bawah: kamera membingkai laptop di paruh
                   bawah kotak, jadi hint di `bottom-0` tertimpa lid tertutup. */
                className="pointer-events-none absolute inset-x-0 top-0 text-center text-[0.65rem] tracking-[0.3em] text-zinc-500 uppercase"
              >
                Click to open
              </motion.span>
            </button>
          )}
        </div>
      </div>

      {/* Jalur sentuh & jendela sempit: form yang sama, lembar datar penuh layar. */}
      {sheet && (
        <div className="fixed inset-0 z-[55] overflow-y-auto bg-black/80 backdrop-blur-md">
          <div className="min-h-full bg-[#0a0b0d]">
            <div className="flex justify-end p-4">
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                data-inquiry-close=""
                className="rounded-full border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-zinc-300 uppercase"
              >
                Close ✕
              </button>
            </div>
            <ContactForm />
          </div>
        </div>
      )}

      <footer className="mt-32 border-t border-white/[0.08] pt-6 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All rights reserved.
          </span>
          <div className="flex flex-wrap gap-4">
            {/* Dua tautan pindahan dari kepala section yang dihapus. Di sini
                keduanya tidak lagi mengulang isi form — cuma jalur cadangan
                (surel) dan jalan pulang (kantor). */}
            <a
              href="mailto:hello@cogniti.id"
              className="transition-colors hover:text-zinc-200"
            >
              hello@cogniti.id
            </a>
            <a href="#office" className="transition-colors hover:text-zinc-200">
              ↑ Back to the office
            </a>
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-400"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span>Jl. Kediri No.27, Tuban, Badung, Bali 80361</span>
          <span>Intelligence Infrastructure</span>
        </div>
      </footer>
    </section>
  );
}

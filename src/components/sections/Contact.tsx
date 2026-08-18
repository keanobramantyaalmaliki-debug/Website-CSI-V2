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

/** Padanan CAMERA_HOME untuk pegas ENGSEL, dipakai jalur lembar datar (sentuh /
 *  jendela sempit) yang tidak menggerakkan kamera sama sekali — di sana yang
 *  menandai "animasi sudah selesai" cuma engselnya. Alasan tidak `=== 0`
 *  sama persis: pegas mendekat secara asimtotis. */
const HINGE_HOME = 0.002;

/** Sepertiga awal bukaan lid dibiarkan TELANJANG sebelum lembar form mulai naik
 *  menutupinya. Tanpa jeda ini keduanya berangkat bersama dan lembarnya sudah
 *  menutup layar sebelum lid terbaca membuka — animasinya ada tapi tak pernah
 *  terlihat. 0,45 diukur dari pegas engsel: pada nilai itu lid sudah melewati
 *  separuh sudutnya, jadi arah gerakannya sudah jelas terbaca. */
const SHEET_RISE_AT = 0.45;

/** Ease masuk/keluarnya lembar TIDAK dipakai — lembarnya ikut pegas engsel
 *  (lihat sheetY). Konstanta ease-nya sengaja tidak ada supaya tidak ada orang
 *  yang menambahkan durasi kedua yang berlomba dengan pegasnya. */

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

  /**
   * ENGSEL ikut `open`, KAMERA ikut `overlay` — DUA patokan, dan itu inti
   * perbaikan 17 Agu.
   *
   * Dulu keduanya ikut `overlay`. Akibatnya jalur sentuh & jendela sempit
   * kehilangan animasinya SAMA SEKALI: di sana `overlay` selamanya false, jadi
   * laptopnya diam tertutup dan yang terjadi hanya form muncul begitu saja —
   * "nggaada animasi laptop terbuka saat aku klik".
   *
   * Yang memang harus digugurkan di jalur itu cuma KAMERANYA, dan alasannya
   * soal keterbacaan form (INVARIANTS §6, catatan 13 Agu): rig overlay
   * terkendala LEBAR, jadi di layar sempit kamera mundur jauh dan layar
   * laptopnya cuma mengisi seperempat tinggi. Engselnya tidak punya urusan
   * dengan itu — ia memutar 110° di tempat, di dalam kotak 52vh yang memang
   * sudah ada di halaman, dan terbaca di lebar berapa pun. Menggerbangi
   * keduanya dengan satu bendera menyeret engsel ikut mati tanpa alasan.
   *
   * Aman terhadap `frameloop="demand"`: pendengar `progress` di InquiryLaptop
   * memesan sendiri framenya lewat `invalidate()` tiap kali nilainya berubah,
   * jadi engselnya tetap teranimasi walau `floating` — satu-satunya yang
   * menyalakan frameloop "always" — false sepanjang jalur ini.
   */
  useEffect(() => {
    const hinge = open ? 1 : 0;
    const camera = overlay ? 1 : 0;
    /* prefers-reduced-motion: tetap bisa dibuka, tapi LANGSUNG. `jump` menyetel
       nilai tanpa menjalankan pegasnya (`set` akan menganimasikan). */
    if (reduced) {
      progress.jump(hinge);
      zoom.jump(camera);
    } else {
      progress.set(hinge);
      zoom.set(camera);
    }
  }, [open, overlay, reduced, progress, zoom]);

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

  /**
   * KEMBARAN `settling` untuk jalur lembar datar, dan ia ada karena alasan yang
   * sama persis: lembarnya harus bertahan mengambang sampai animasinya benar-
   * benar selesai, bukan lenyap seketika saat tombol tutup ditekan.
   *
   * Bedanya cuma pegas yang ditunggu. Jalur overlay menunggu KAMERA pulang;
   * jalur ini tidak menggerakkan kamera sama sekali, jadi yang ditunggu
   * ENGSELnya — lembarnya turun mengikuti `progress` (lihat `sheetY`), jadi
   * selama `progress` masih di atas HINGE_HOME lembarnya masih di jalan.
   *
   * Pola "menyesuaikan state saat render" yang sama, dan sama-sama disengaja:
   * useEffect jalan setelah paint, jadi akan ada satu frame yang keadaannya
   * sudah salah — persis kedipan yang sedang dihilangkan.
   */
  const [sheetSettling, setSheetSettling] = useState(false);
  if (sheet && !sheetSettling) setSheetSettling(true);

  useEffect(() => {
    if (sheet) return;
    const check = (v: number) => {
      if (v <= HINGE_HOME) setSheetSettling(false);
    };
    check(progress.get());
    return progress.on("change", check);
  }, [sheet, progress]);

  /**
   * "Form-nya modal SEKARANG" — lewat jalur mana pun.
   *
   * Dipakai untuk urusan yang tidak peduli laptop 3D atau lembar datar: kunci
   * gulir, pelepasan kurungan z-index, Esc, dan perpindahan fokus. Sebelum ini
   * keempatnya digerbangi `promoted` — yang HANYA benar untuk jalur overlay —
   * dan jalur lembar datar tidak mendapatkan satu pun dari keempatnya. Itu yang
   * membuat tombol tutup di HP tidak bisa ditekan: tanpa `setInquiryOpen`,
   * `<main>` tetap `z-10` dan mengurung lembar z-55 di dalamnya sebagai satu
   * lapisan, jadi Navbar z-50 menang dan menutupi tombolnya (dilaporkan 17 Agu,
   * terpotret). Persis kelas bug yang sudah dibahas di komentar di bawah, cuma
   * jalur yang belum tersambung.
   *
   * Tiga sisanya ikut terbayar dan ketiganya nyata di HP: halaman di belakang
   * lembar tidak lagi ikut tergulir, Esc bekerja di jendela sempit yang
   * berpapan-tik (jendela desktop yang dikecilkan juga masuk jalur ini), dan
   * fokus berpindah ke tombol tutup lalu pulang ke pemicunya.
   */
  const modal = promoted || sheet || sheetSettling;

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
  const [dock, setDock] = useState({ h: 0, dx: 0, dy: 0 });

  const openForm = useCallback(() => {
    const box = boxRef.current;
    if (box) {
      const r = box.getBoundingClientRect();
      setDock({
        h: r.height,
        dx: r.left + r.width / 2 - window.innerWidth / 2,
        dy: r.top + r.height / 2 - window.innerHeight / 2,
      });
    }
    setOpen(true);
  }, []);

  /* Kunci gulir + lepas kurungan z-index + Esc + kembalikan fokus. Satu efek
     karena keempatnya punya masa hidup yang sama persis: selama form terbuka.
     Fokus dipindah ke tombol tutup, bukan ke isian pertama — isian itu hidup di
     dalam <Html> milik drei yang dipasang belakangan, sedangkan tombol tutup ada
     di pohon ini dan pasti sudah ter-render saat efek ini jalan.

     Digerbangi `modal`, bukan `open` — keempatnya harus bertahan sampai
     animasinya pulang, bukan sampai tombol tutup ditekan:

     • `setInquiryOpen` melepas kurungan stacking context <main> (z-10). Kalau ia
       mati saat tombol ditekan, lapisan `z-[55]` yang MASIH close-up terperangkap
       kembali di dalam <main> dan Navbar (z-50) menggaris memotongnya — persis
       kelas bug yang sama dengan potongan footer, cuma pindah ke tepi atas.
     • `setScrollLocked` menahan halaman. `dock.dy` diukur SEKALI saat membuka
       dan dipakai memulangkan kamera ke posisi kotak; kalau halaman sempat
       digulir selagi laptop terbang pulang, kotaknya sudah pindah dan laptopnya
       mendarat meleset sejauh itu, lalu menyentak saat lapisannya turun.

     Di perangkat sentuh & jendela sempit yang menanggungnya `sheetSettling`,
     dengan pegas yang berbeda — lihat catatannya di atas.

     Fokus dipindah ke tombol tutup, bukan ke isian pertama — isian itu hidup di
     dalam <Html> milik drei yang dipasang belakangan, sedangkan tombol tutup ada
     di pohon ini dan pasti sudah ter-render saat efek ini jalan. `closeRef`
     dipakai bergiliran oleh tombol tutup kedua jalur; keduanya tidak pernah
     terpasang bersamaan (`overlay` dan `sheet` saling meniadakan). */
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!modal) return;
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
  }, [modal, close]);

  useEffect(() => {
    if (modal || !restoreFocus.current) return;
    restoreFocus.current = false;
    triggerRef.current?.focus();
  }, [modal]);

  /* Padanan <web.h1> pmndrs yang memudar saat laptop membuka. */
  const hintOpacity = useTransform(progress, [0, 0.3], [1, 0]);

  /* Tirainya ikut pegas kamera, jadi gelapnya TUMBUH bersama majunya kamera dan
     memudar lagi saat mundur — dulu ia muncul dan hilang seketika, yang membuat
     transisinya terasa dua kejadian terpisah. Penuh di 0,6 supaya halaman sudah
     benar-benar tenggelam sebelum kamera sampai. */
  const scrimOpacity = useTransform(zoom, [0, 0.6], [0, 1]);

  /**
   * Lembar datar naik dari bawah MENGIKUTI PEGAS ENGSEL — bukan animasi
   * bertenaga durasi sendiri.
   *
   * Sengaja meniru cara tirai mengikuti pegas kamera di atas, dan alasannya
   * sama: dua animasi dengan sumber waktu berbeda untuk satu kejadian yang sama
   * akan selalu terbaca sebagai dua kejadian. Diikat ke `progress`, lembarnya
   * tidak bisa mendahului atau tertinggal dari lid-nya — apa pun yang terjadi
   * pada pegas itu (termasuk `jump` saat reduced-motion, yang membuat lembarnya
   * ikut langsung terpasang tanpa tambahan cabang) ia ikut.
   *
   * Rentangnya mulai di SHEET_RISE_AT, bukan 0, supaya lid-nya terlihat membuka
   * dulu sebelum tertutupi. Efek sampingnya pas untuk arah sebaliknya juga: saat
   * menutup, `progress` turun 1 → 0,45 lebih dulu, jadi lembarnya TURUN
   * menyingkap laptopnya, baru lid-nya menyelesaikan penutupan. Urutan yang
   * benar di kedua arah, dari satu pegas.
   *
   * Selama masih di "100%" lembarnya berada di luar layar sepenuhnya, jadi ia
   * tidak bisa menelan sentuhan yang seharusnya mengenai laptop di baliknya —
   * itu sebabnya menggeser, bukan memudarkan opacity.
   */
  const sheetY = useTransform(progress, [SHEET_RISE_AT, 1], ["100%", "0%"]);

  /* Padding BAWAH sengaja tidak ada (`pt-*`, bukan `py-*`): ini section
     terakhir di halaman, jadi sisa 128 px di bawah footer cuma pita kosong di
     ujung dokumen. Footer di bawah menambal sendiri gutter kiri-kanannya
     dengan margin negatif. */
  return (
    <section id="contact" className="overflow-x-clip px-6 pt-24 sm:px-10 sm:pt-32">
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
            dockOffsetX={promoted ? dock.dx : 0}
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

              Digerbangi `!modal`, bukan `!open`: selagi menutup lapisan ini
              masih `fixed inset-0`, jadi pemicu `absolute inset-0`-nya akan
              melebar seukuran layar dan hint "click to open"-nya nongol di
              puncak viewport di tengah animasi.

              `modal`, bukan `promoted`, karena jalur lembar datar butuh hal yang
              sama: tanpa itu pemicunya tetap terpasang di balik lembar — sasaran
              tekan seukuran laptop yang tak terlihat, dan satu perhentian tab
              liar di dalam dialog. */}
          {!modal && (
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

      {/* Jalur sentuh & jendela sempit: form yang sama, lembar datar penuh layar.
          Digerbangi `sheet || sheetSettling`, bukan `sheet` — kembar dari
          `promoted` di jalur overlay. Kalau ia turun tepat saat tombol tutup
          ditekan, lembarnya lenyap seketika dan lid yang menutup di baliknya
          jadi gerakan yang tak berasal dari mana pun.

          ⚠️ Tombol tutup TIDAK diberi z-index sendiri. Ia menang atas Navbar
          karena LEMBARNYA yang z-55 sudah dilepas dari kurungan `<main>` z-10
          oleh `setInquiryOpen` (lihat `modal` di atas) — dan begitu lembarnya
          menang, latarnya yang pekat menutupi Navbar sepenuhnya. Menambah
          z-index di sini akan menyembunyikan sebabnya, bukan memperkuatnya. */}
      {(sheet || sheetSettling) && (
        <motion.div
          style={{ y: sheetY }}
          className={`fixed inset-0 z-[55] overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-md${
            sheet ? "" : " pointer-events-none"
          }`}
        >
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
        </motion.div>
      )}

      {/* Menempel pojok: margin negatif membatalkan `px-6 sm:px-10` milik
          section supaya barisnya membentang tepi ke tepi. Sisa `p-3` (12 px)
          bukan jarak tata letak, cuma supaya huruf tidak benar-benar menyentuh
          tepi layar. Garis pemisah `border-t` dilepas 13 Agu — di posisi mepet
          begini ia jadi sekat yang tidak memisahkan apa-apa. */}
      <footer className="-mx-6 mt-32 px-3 pb-3 text-xs text-zinc-400 sm:-mx-10">
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import InquiryLaptop from "@/components/motion/InquiryLaptop";
import ContactForm from "@/components/sections/ContactForm";
import { CAMERA_SPRING, HINGE_SPRING } from "@/components/sections/Contact";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { useNarrowViewport } from "@/lib/hooks/useNarrowViewport";
import { setScrollLocked } from "@/lib/smoothScroll";
import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Modal inquiry GLOBAL — jalur CTA "Talk to us" di navbar.
 *
 * Dulu CTA itu menggulir ke section Contact; sekarang form-nya datang ke
 * pengunjung, bukan sebaliknya: laptop MacBook naik dari bawah layar ke tengah,
 * membuka, lalu kamera mendorong masuk ke layarnya — persis rig yang sudah
 * hidup di <Contact/>, cuma lahir sebagai overlay alih-alih dipromosikan dari
 * kotak di halaman. Pengunjung tidak kehilangan posisi gulirnya: tutup, dan ia
 * kembali persis di tempat ia meninggalkannya.
 *
 * Hidup di SiteLayout (LUAR `<main>`), bukan di dalam section mana pun, karena
 * navbar ada di semua ruangan sedangkan <Contact/> ikut berganti bersama
 * kontennya. Laptop di section Contact TIDAK disentuh — dua pintu ke form yang
 * sama, masing-masing dengan transisinya sendiri.
 *
 * ⚠️ SENGAJA BUKAN ekstraksi bersama dari Contact.tsx. Hampir seluruh
 * kerumitan di sana — dock, promosi kotak→fixed, setViewOffset, hitbox pemicu —
 * ada KARENA laptopnya menyatu di halaman dulu. Overlay ini lahir langsung
 * `fixed`, jadi semua itu gugur dan yang tersisa cukup pendek untuk berdiri
 * sendiri. Yang dibagi betulan cuma tiga: InquiryLaptop, ContactForm, dan
 * angka pegasnya (diimpor dari Contact.tsx supaya dua jalur mustahil beda
 * rasa).
 *
 * Jalur sentuh & jendela sempit (INVARIANTS §6): tidak ada laptop 3D sama
 * sekali — lembar datar yang sama dengan milik Contact, memudar masuk. Di sana
 * laptopnya tidak pernah terlihat dari navbar, jadi tidak ada transisi 3D yang
 * kehilangan apa-apa.
 */

/**
 * Pegas NAIK-TURUN — perjalanan dari bawah layar ke tengah (0 = di bawah,
 * 1 = duduk di tengah).
 *
 * 70/20/1 → rasio redam 1,20, sedikit overdamped: tidak ada pantulan di
 * pendaratan (laptop yang memantul saat tiba terbaca sebagai benda karet,
 * bukan MacBook). Akar lambatnya −4,5 rad/dtk → 95% jalan di ~0,66 dtk:
 * cukup pelan untuk terbaca sebagai kedatangan, cukup cepat untuk tidak
 * menahan orang yang memang mau mengontak.
 */
const LIFT_SPRING = { stiffness: 70, damping: 20, mass: 1 };

/**
 * Ambang `lift` tempat engsel + kamera DIPERSENJATAI — bukan menunggu naiknya
 * selesai, dan bukan pula berangkat bersamaan.
 *
 * Berangkat bersamaan = laptop membuka selagi masih di luar layar, dan babak
 * pembukanya tidak pernah tersaksikan. Menunggu selesai = tiga babak berurutan
 * ~2,5 dtk — kelamaan untuk sebuah CTA. Di 0,7 (≈0,34 dtk, laptop ~30vh dari
 * tujuannya) naiknya sudah melambat, jadi lid yang mulai terangkat justru
 * mengisi ekor perjalanan yang mulai sepi. Kameranya ikut dipersenjatai di
 * sini juga, tapi pegasnya jauh lebih lembut (lihat CAMERA_SPRING), jadi
 * urutan yang terbaca tetap: tiba → membuka → mendekat.
 */
const LIFT_ARM_AT = 0.7;

/**
 * Ambang `zoom` (arah TURUN) tempat laptop mulai diturunkan saat menutup.
 *
 * Menunggu kamera pulang penuh berarti ~1 dtk laptop diam di tengah layar
 * sebelum turun — jeda mati persis setelah pengunjung minta pergi. Turun
 * selagi kamera masih mundur membuat keduanya terbaca sebagai SATU gerakan
 * "pergi", dan lid yang masih menutup di perjalanan ikut tenggelam bersamanya.
 */
const LIFT_DROP_AT = 0.4;

/** Di bawah ini `lift` dianggap sudah pulang — kembaran CAMERA_HOME di
 *  Contact.tsx: pegas mendekat asimtotis, menunggu nol persis = menunggu
 *  selamanya. */
const LIFT_HOME = 0.01;

/** easeInOutCubic — kembaran `FADE` di Navbar.tsx, dan alasannya sama: untuk
 *  sesuatu yang MEMUDAR, easeOutExpo situs ini menghabiskan separuh nilainya
 *  di 30 ms pertama dan terbaca sebagai kedipan. */
const FADE: [number, number, number, number] = [0.33, 0, 0.67, 1];

export default function InquiryOverlay() {
  const open = useSceneStore((s) => s.navInquiryOpen);
  const setOpen = useSceneStore((s) => s.setNavInquiryOpen);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const narrow = useNarrowViewport();
  /* Kembaran `flat` di Contact.tsx, dua sebab yang sama: `coarse` = tidak ada
     hover (INVARIANTS §6), `narrow` = rig overlay-nya terkendala lebar dan
     form-nya kekecilan untuk dibaca (terpotret 13 Agu di 390px). */
  const flat = coarse || narrow;

  const lift = useSpring(0, LIFT_SPRING);
  const progress = useSpring(0, HINGE_SPRING);
  const zoom = useSpring(0, CAMERA_SPRING);

  /**
   * Canvas baru DIBUAT saat pertama kali dibutuhkan, lalu DITAHAN selamanya.
   *
   * Bukan `open` yang menggerbanginya: konteks WebGL + kompilasi shader itu
   * ongkos puluhan ms yang, kalau dibayar di setiap buka, jatuh persis di
   * frame-frame pertama animasi naik — bagian yang paling kelihatan. Dibayar
   * SEKALI di klik pertama (selagi laptop masih di bawah layar), buka-tutup
   * berikutnya tinggal pakai. Menahannya nyaris gratis: frameloop "demand"
   * tanpa ada yang memesan frame = nol draw call, dan `visibility: hidden`
   * mencabutnya dari cat & pohon aksesibilitas.
   */
  const [ever, setEver] = useState(false);
  if (open && !ever) setEver(true);

  /**
   * Lapisan bertahan sampai laptopnya benar-benar TENGGELAM — pola `settling`
   * di Contact.tsx, dengan patokan yang berbeda: di sana kamera yang pulang
   * paling akhir, di sini `lift` (turunnya baru mulai setelah kamera melewati
   * LIFT_DROP_AT, jadi ia selalu yang terakhir mendarat). Disetel saat render,
   * bukan di effect, supaya tidak ada satu frame pun yang melihat modal hidup
   * tanpa lapisannya. Jalur datar tidak ikut: AnimatePresence yang mengurus
   * umur lembarnya.
   */
  const [settling, setSettling] = useState(false);
  if (open && !flat && !settling) setSettling(true);
  const present = open || settling;

  /* ── Koreografi MEMBUKA: naik → (di ambang) engsel + kamera ─────────────── */
  useEffect(() => {
    if (!open || flat) return;
    if (reduced) {
      /* Tetap bisa dibuka, tapi LANGSUNG — `jump` menyetel tanpa menganimasikan. */
      lift.jump(1);
      progress.jump(1);
      zoom.jump(1);
      return;
    }
    lift.set(1);
    /* Sekali tembak: tanpa penjaga, setiap event "change" di atas ambang
       memanggil set(1) lagi dan me-restart pegasnya tiap frame. */
    let armed = false;
    const arm = (v: number) => {
      if (armed || v < LIFT_ARM_AT) return;
      armed = true;
      progress.set(1);
      zoom.set(1);
    };
    /* Buka-ulang di tengah penutupan: `lift` bisa saja masih di atas ambang,
       dan pendengar "change" tidak memancarkan nilai yang sudah lewat. */
    arm(lift.get());
    return lift.on("change", arm);
  }, [open, flat, reduced, lift, progress, zoom]);

  /* ── Koreografi MENUTUP: engsel + kamera pulang → (di ambang) turun ─────── */
  useEffect(() => {
    if (open) return;
    if (reduced) {
      lift.jump(0);
      progress.jump(0);
      zoom.jump(0);
      return;
    }
    progress.set(0);
    zoom.set(0);
    let dropped = false;
    const drop = (v: number) => {
      if (dropped || v > LIFT_DROP_AT) return;
      dropped = true;
      lift.set(0);
    };
    /* Menutup sebelum kamera sempat melewati ambang (klik-klik cepat, atau
       jalur datar yang tidak pernah menaikkan zoom): langsung turun. */
    drop(zoom.get());
    return zoom.on("change", drop);
  }, [open, reduced, lift, progress, zoom]);

  useEffect(() => {
    if (open) return;
    const check = (v: number) => {
      if (v <= LIFT_HOME) setSettling(false);
    };
    check(lift.get()); // `jump` reduced-motion bisa sudah mendarat sebelum ini
    return lift.on("change", check);
  }, [open, lift]);

  const close = useCallback(() => setOpen(false), [setOpen]);
  const closeRef = useRef<HTMLButtonElement>(null);
  /**
   * Fokus dikembalikan ke elemen yang MEMBUKA modal — CTA navbar, atau tombol
   * "Talk to us" di menu burger. Direkam sendiri dari `document.activeElement`,
   * bukan lewat ref yang dioper: pemicunya hidup di Navbar, komponen lain, dan
   * ada dua. Lebih sederhana daripada pola tunda milik Contact.tsx karena
   * pemicu di sini tidak pernah unmount — navbar selalu terpasang.
   */
  const restoreRef = useRef<HTMLElement | null>(null);

  /* Kunci gulir + Esc + fokus — satu efek, satu masa hidup, pola `modal` di
     Contact.tsx. Digerbangi `present`, bukan `open`: ketiganya harus bertahan
     sampai laptopnya selesai tenggelam.

     ⚠️ SENGAJA TIDAK menyentuh `setInquiryOpen`. Flag itu ada untuk melepas
     `z-10` dari `<main>` — dan lapisan-lapisan di sini hidup di LUAR `<main>`
     (lihat mount di SiteLayout), jadi kurungan stacking context itu tidak
     pernah mengurungnya. Ikut menulisnya justru bahaya: boolean yang dipakai
     dua modal bisa saling clobber — ekor penutupan overlay ini akan mematikan
     flag selagi modal Contact (yang dibuka lewat kliknya sendiri di jendela
     itu) masih hidup, dan navbar kembali menggaris di atas form-nya. */
  useEffect(() => {
    if (!present) return;
    setScrollLocked(true);
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setScrollLocked(false);
      restoreRef.current?.focus();
      restoreRef.current = null;
    };
  }, [present, close]);

  /* Tirai ikut NAIKNYA, bukan pegas kamera seperti di Contact: di sini
     kejadian pertamanya kedatangan laptop, dan tirai yang menggelap bersama
     kedatangan itu (lalu memudar bersama tenggelamnya) membuat keduanya satu
     kejadian. Penuh di 0,6 — halaman sudah tenggelam sebelum lid terangkat. */
  const scrimOpacity = useTransform(lift, [0, 0.6], [0, 1]);
  /* `vh`, bukan piksel yang diukur: 100vh dijamin cukup untuk menyembunyikan
     lapisan setinggi viewport, berapa pun ukurannya nanti — tidak ada angka
     yang basi saat jendelanya di-resize selagi tertutup. */
  const y = useTransform(lift, (v) => `${(1 - v) * 100}vh`);

  return (
    <>
      {/* ── Jalur desktop: laptop 3D naik dari bawah ─────────────────────── */}
      {!flat && ever && (
        <>
          {/* Tirai gelap — kembaran z-54 milik Contact (INVARIANTS §2).
              `backdrop-blur` di sini selalu terbayar: halaman tetap terlihat
              di sekeliling laptop sepanjang form dipakai. */}
          <motion.div
            style={{ opacity: scrimOpacity }}
            className={`pointer-events-none fixed inset-0 z-[54] bg-black/70 backdrop-blur-md ${
              present ? "" : "invisible"
            }`}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-0 z-[55] ${present ? "" : "invisible"} ${
              open ? "" : "pointer-events-none"
            }`}
            /* Klik di mana pun DI LUAR form menutup; form-nya menghentikan
               rambatan. Selagi menutup lapisannya sudah tidak bisa diklik. */
            onClick={open ? close : undefined}
            role={open ? "dialog" : undefined}
            aria-modal={open ? true : undefined}
            aria-label={open ? "Inquiry form" : undefined}
          >
            {/* Yang naik-turun PEMBUNGKUS ini — memuat canvas DAN elemen
                `<Html>` drei (drei menempelkan form ke induk canvas), jadi
                keduanya mustahil berselisih; alasan yang sama dengan
                applyDockShift di InquiryLaptop.tsx. `will-change` supaya
                geserannya murni komposit di atas canvas WebGL. */}
            <motion.div
              style={{ y, willChange: "transform" }}
              className="h-full w-full"
            >
              <InquiryLaptop
                progress={progress}
                zoom={zoom}
                floating={false}
                className="h-full w-full"
                screen={
                  open ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="h-full w-full overflow-hidden"
                    >
                      <ContactForm className="h-full w-full" />
                    </div>
                  ) : undefined
                }
              />
            </motion.div>

            {/* SAUDARA pembungkus yang naik, bukan anaknya: tombol tutup
                menempel di pojok VIEWPORT sejak frame pertama, tidak ikut
                terbang. Kelasnya salinan tombol tutup overlay Contact. */}
            {open && (
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
          </div>
        </>
      )}

      {/* ── Jalur sentuh & jendela sempit: lembar datar, tanpa 3D ────────────
          Salinan lembar `flat` milik Contact minus dorongan kameranya — di
          jalur navbar tidak ada laptop di halaman yang bisa jadi titik
          berangkat, jadi memudar masuk adalah seluruh transisinya. Umurnya
          diurus AnimatePresence (memudar keluar dulu, baru unmount), bukan
          pola `settling`. */}
      {flat && (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.3, ease: FADE }}
              role="dialog"
              aria-modal
              aria-label="Inquiry form"
              className="fixed inset-0 z-[55] overflow-y-auto overscroll-contain bg-[#0a0b0d]"
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
        </AnimatePresence>
      )}
    </>
  );
}

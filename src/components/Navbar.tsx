"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useSceneStore, pathFor, type RoomKey } from "@/lib/store/sceneStore";
import { roomHasContact } from "@/lib/roomContent";
import { ACTIVE_KEYS } from "@/components/canvas/CameraController";
import MagneticButton from "@/components/motion/MagneticButton";
import { scrollToSection } from "@/lib/smoothScroll";
import { SOCIALS } from "@/data/socials";
import { ID_ZONES, useZoneClocks } from "@/lib/hooks/useZoneClocks";
import { useNarrowViewport } from "@/lib/hooks/useNarrowViewport";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Kurva khusus untuk OPASITAS, bukan `EASE` yang dipakai di seluruh situs.
 *
 * `EASE` itu easeOutExpo: 0,16 di detik-detik pertama artinya nilainya sudah
 * separuh jalan dalam ~15% durasi. Untuk sesuatu yang BERGERAK itu bagus —
 * berangkat cepat, mendarat lembut. Untuk sesuatu yang MEMUDAR itu bencana:
 * layar penuh yang langsung tembus separuh dalam 30 ms terbaca sebagai kedipan,
 * lalu sisa waktunya cuma menghabiskan ekor yang nyaris tak terlihat.
 *
 * easeInOutCubic naik-turunnya rata di kedua ujung, jadi tidak ada momen yang
 * lebih cepat dari yang lain — itu yang bikin pudarnya terbaca halus.
 */
const FADE: [number, number, number, number] = [0.33, 0, 0.67, 1];

/**
 * Varian menu overlay.
 *
 * Bentuknya varian bersarang, bukan `transition.delay` per elemen, karena
 * `staggerChildren` mengurus antreannya sendiri.
 *
 * ⚠️ Label keluarnya `out`, BUKAN `hidden`, dan itu disengaja: `out` sengaja
 * TIDAK dimiliki varian anak mana pun. Varian menurun ke anak, jadi kalau
 * keluarnya lewat `hidden` seluruh isi menu ikut terbang balik 28px ke bawah
 * sambil overlay-nya memudar — dua gerakan berlawanan sekaligus di layar yang
 * sedang menghilang. Label yang tidak dikenal anak = anak diam di tempat, dan
 * seluruh panel memudar sebagai satu keping utuh.
 */
const OVERLAY_V: Variants = {
  hidden: { opacity: 0 },
  shown: {
    opacity: 1,
    pointerEvents: "auto",
    transition: { duration: 0.36, ease: FADE, delayChildren: 0.08, staggerChildren: 0.05 },
  },
  // `pointerEvents` mati sejak frame pertama memudar (properti non-animatable
  // langsung dipasang). Tanpa itu panel yang sudah 5% terlihat masih menadah
  // sentuhan selama 450 ms: menekan "Close." lalu langsung menekan apa pun di
  // baliknya justru mengenai tautan ruangan yang nyaris tak terlihat.
  out: { opacity: 0, pointerEvents: "none", transition: { duration: 0.45, ease: FADE } },
};

const LIST_V: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07 } },
};

/**
 * Naik-turunnya ditiadakan saat reduced-motion — daftar setinggi 28px yang
 * meluncur adalah gerakan terbesar di seluruh navbar. Keduanya konstanta
 * module-level, bukan objek yang dibuat ulang tiap render: jam di kaki menu
 * me-render ulang komponen ini tiap pergantian menit selagi menu terbuka.
 */
const ITEM_V: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const ITEM_V_REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.25 } },
};

/**
 * Geometri ikon burger — angkanya disalin dari situs cogniti yang tayang
 * (`.nav-menu::after` di media query 768px): lebar 26px, tebal 1,5px, jarak
 * antar garis 7px. Tebal 1,5px memang bukan bilangan bulat; di layar dpr 2–3
 * (satu-satunya tempat tombol ini terlihat, `md:hidden`) itu 3–4,5 piksel
 * perangkat, dan hasilnya lebih tegas daripada 1px yang terlihat tipis di HP.
 *
 * Ketiganya dirender dari satu daftar offset karena garis TENGAHNYA sekaligus
 * strip pada "— Close." — bukan ikon lain yang menggantikan. Itu inti
 * peralihannya: garis atas & bawah meluncur menyatu ke tengah lalu memudar,
 * yang tersisa satu strip, dan katanya menyingkap di sebelahnya.
 */
const BURGER_OFFSETS = [-7, 0, 7] as const;

/** Tinggi kotak ikon 16px; (16 − 1,5) / 2 = 7,25px agar garisnya pas di tengah. */
const LINE_TOP = "7.25px";

export default function Navbar() {
  const heroInView  = useSceneStore((s) => s.heroInView);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const reduced     = useReducedMotion();
  const navigate    = useNavigate();
  const narrow      = useNarrowViewport();
  const [open, setOpen] = useState(false);

  /**
   * "Overlay-nya masih kelihatan" — TIDAK sama dengan `open`.
   *
   * `open` mati di frame tombolnya ditekan; overlay-nya baru benar-benar hilang
   * 450 ms kemudian setelah memudar. Segala sesuatu yang menyangkut TAMPILAN
   * harus ikut yang belakangan, bukan yang pertama. Kalau ikut `open`, dua hal
   * berubah seketika di atas panel yang masih terlihat — dan itu justru yang
   * terbaca sebagai kedipan:
   *
   *   - pill navbar mendadak dapat `glass` + garis tepi 1px (menggeser isinya),
   *   - jam berhenti diperbarui di panel yang masih terbaca.
   *
   * Tombol burger/"Close." sengaja TIDAK ikut `overlayUp` — lihat alasannya di
   * komentar tombolnya.
   *
   * `onExitComplete` dari AnimatePresence yang mematikannya, jadi patokannya
   * animasi yang benar-benar selesai — bukan timer yang ditebak dan akan basi
   * begitu durasinya diubah.
   */
  const [overlayUp, setOverlayUp] = useState(false);
  useEffect(() => {
    if (open) setOverlayUp(true);
  }, [open]);

  const clocks = useZoneClocks(overlayUp);

  const itemV = reduced ? ITEM_V_REDUCED : ITEM_V;

  /**
   * Melebar melewati `md` selagi menu terbuka = tutup paksa.
   *
   * Overlay & tombolnya dua-duanya `md:hidden`, jadi di layar lebar keadaan
   * "terbuka" tidak punya wujud sama sekali — tapi konsekuensinya tetap jalan:
   * gulir halaman terkunci, latar bilah navbar dibuat bening, dan tidak ada satu
   * pun tombol yang tersisa untuk membatalkannya. Memutar tablet dari potret ke
   * lanskap cukup untuk sampai ke sana.
   *
   * Patokannya `useNarrowViewport` yang memang dipatok ke 767.98px, angka yang
   * sama dengan `md:` di kelas-kelas di bawah — kalau keduanya berbeda, ada
   * jendela lebar di mana CSS dan JS tidak sepakat siapa yang sedang terbuka.
   */
  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  /** Esc menutup — hanya berlaku selagi menu memang masih bisa ditutup. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Gulir halaman dikunci selama menu terbuka.
   *
   * Tanpa kunci itu, menggulir di atas overlay yang menutup layar penuh akan
   * menggeser halaman di baliknya, dan saat menu ditutup pengunjung mendarat di
   * tempat yang bukan tempat ia meninggalkannya.
   *
   * ⚠️ Patokannya `open`, BUKAN `overlayUp` seperti urusan tampilan lainnya.
   * Kuncinya harus lepas di frame yang sama dengan tekanannya, karena
   * `goToContact()` menggulir ke `#contact` tepat setelah menutup menu — dan
   * `scrollToSection()` tidak ke mana-mana selama body masih terkunci, lewat
   * Lenis maupun lewat `scrollIntoView` bawaannya. Yang hilang karena ini cuma
   * satu hal kecil: kalau jari menyapu layar di tengah 450 ms pudarnya, latar
   * di baliknya ikut bergeser.
   */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function goRoom(room: RoomKey) {
    navigate(pathFor(room));
    setOpen(false);
  }

  /**
   * "Talk to us" — SCROLL DI TEMPAT, jangan memindahkan ruangan.
   *
   * `<Contact />` sekarang ada di KEEMPAT ruangan berisi — Lounge, Office,
   * Meeting, Function (lihat roomContent.tsx) — jadi tombol ini selalu cukup
   * menggulir ke bawah. Memindahkan pengunjung ke ruangan lain hanya karena ia
   * menekan tombol kontak itu mengagetkan: ia kehilangan tempatnya tanpa
   * meminta.
   *
   * Versi sebelumnya SELALU melempar ke Lounge dari ruangan mana pun, dengan
   * alasan yang sempat benar: "#contact cuma ada di Lounge". Alasan itu gugur
   * dua kali — pertama saat Meeting & Function memuat Contact, lalu saat Office
   * menyusul (17 Agu) — dan kedua kalinya perilakunya tetap benar tanpa satu
   * baris pun berubah di berkas ini. Itu buah dari menurunkannya, lihat ⚠️.
   *
   * Cabang `navigate` di bawah kini tak terjangkau dari ruangan mana pun yang
   * bisa dibuka, tapi TETAP ADA: ia yang menanggung ruangan baru (atau Pantry
   * yang dihidupkan) yang belum diberi Contact. `RoomRouteSync` (Arah 3) yang
   * menggulirkannya setelah Lounge ter-mount.
   *
   * ⚠️ Diturunkan dari ROOM_CONTENT, bukan daftar nama ruangan yang ditulis
   * ulang di sini — itu sebabnya penambahan Contact di Office tidak menuntut
   * suntingan di tempat ini.
   */
  function goToContact() {
    setOpen(false);
    if (roomHasContact(currentRoom)) {
      scrollToSection("contact");
      return;
    }
    navigate("/#contact");
  }

  /**
   * "Chrome-nya sedang tidak tampil" — bilahnya bening di atas hero, dan juga
   * selama overlay menu terlihat (alasannya di komentar `overlayUp`).
   */
  const bare = heroInView || overlayUp;

  /*
   * BILAH PENUH, bukan pill mengambang (17 Agu).
   *
   * Versi sebelumnya `max-w-5xl` + `justify-center`: di 1440px pill-nya berhenti
   * di 1024px, jadi logonya terukur 233px dari tepi kiri. Merapatkan padding
   * header dari 16px ke 12px tidak mengubah apa pun di sana — yang menahan bukan
   * paddingnya, tapi lebar maksimumnya. Jadi keduanya dilepas: `max-w-5xl`,
   * `rounded-full`, dan jarak luar header.
   *
   * Sekarang header menempel di `top-0 inset-x-0` tanpa padding, dan 12px-nya
   * jadi padding DALAM `<nav>`. Bedanya penting: latarnya sampai ke tepi layar
   * (persegi yang benar-benar menempel di sudut), sementara isinya — logo, dan
   * tombol paling kanan — persis 12px dari sudut. Kalau 12px-nya ditaruh di luar
   * sebagai margin, latarnya ikut mundur dan hasilnya kotak mengambang, bukan
   * bilah.
   *
   * Ongkos ruangnya turun, bukan naik, walau paddingnya jadi 12px di atas dan
   * bawah: dulu 12px jarak luar + pill 58px = 70px; sekarang 0 + 52px = 52px.
   *
   * 52px itu TERUKUR, bukan dihitung: logo 27,83px + 12px atas + 12px bawah.
   *
   * ⚠️ 27,83 — BUKAN 30 seperti atribut `height` di `<img>`-nya, dan bukan juga
   * karena `object-contain`. `object-contain` mengatur bagaimana piksel gambar
   * mengisi kotaknya, ia tidak pernah mengubah UKURAN kotak itu. Yang mengubah:
   * Tailwind preflight memasang `img { height: auto }`, yang menimpa atribut
   * `height`, jadi tingginya diturunkan dari `width={76}` × rasio asli berkasnya
   * (2914×1067 = 2,731) = 27,83px. Atribut `width`/`height` di sana tinggal
   * berguna sebagai rasio pencadang ruang saat memuat, bukan ukuran tampil —
   * jangan pakai angka 30 itu untuk menghitung tinggi bilah.
   *
   * Logo adalah benda TERTINGGI di bilah ini sejak CTA "Talk to us" kehilangan
   * pill-nya — pill itu 36px dan dialah yang dulu menahan bilah di 60px.
   * Artinya `p-3` sekarang benar-benar yang menentukan tingginya: mau lebih
   * pendek lagi, satu-satunya jalan adalah mengecilkan logonya, bukan
   * paddingnya.
   *
   * Di <md tingginya masih 68px dan itu disengaja: tombol burger `h-11` (44px)
   * adalah ambang minimum sentuh, lihat catatan panjang di tombolnya.
   */
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* ⚠️ Overlay dirender SEBELUM <nav> dan nav-nya diberi `relative z-10`.
          Elemen berposisi selalu dilukis di atas elemen statis apa pun urutan
          DOM-nya, jadi tanpa z-10 itu overlay akan menelan logo & tombolnya
          sendiri. Menaruhnya di bawah nav adalah inti tampilannya: logo tidak
          bergeser sedikit pun saat menu terbuka, dan tombol tutup muncul persis
          di tempat tombol buka tadi — bukan ikon X baru di tempat lain.
          Tetap di dalam <header> supaya ia ikut z-50 (INVARIANTS §2) dan tidak
          pernah naik ke atas LoadingScreen di z-60. */}
      <MobileMenu
        open={open}
        clocks={clocks}
        currentRoom={currentRoom}
        overlayV={OVERLAY_V}
        listV={LIST_V}
        itemV={itemV}
        onRoom={goRoom}
        onContact={goToContact}
        onGone={() => setOverlayUp(false)}
      />

      <nav className="relative z-10 flex w-full items-center justify-between gap-6 p-3">
        {/* Latar + garis pemisah, sebagai LAPISAN sendiri di belakang isinya.
            Dulu keduanya kelas di `<nav>` yang disulap bolak-balik, dan itu
            menyeret dua masalah yang lapisan ini menghapus sekaligus:

            1. Tepi 1px dulu harus SELALU terpasang dengan cuma warnanya yang
               berganti, karena menyulap kelas `border` bikin lebarnya melompat
               0↔1px dan seluruh isi bilah bergeser sepiksel tepat saat menu
               ditutup. Di lapisan `absolute` tepinya tidak punya andil pada tata
               letak sama sekali, jadi persoalannya tidak bisa kembali.
            2. `background-image` tidak bisa di-transisi — dither-nya akan
               muncul mendadak. Yang dianimasikan sekarang OPASITAS lapisan, dan
               pola pikselnya tetap tajam sepanjang pudarnya.

            `-z-10` menaruhnya di bawah logo/tautan/tombol yang statis; tanpa itu
            lapisan berposisi ini melukis DI ATAS mereka. Cakupannya aman di
            dalam `<nav>` karena nav sendiri `relative z-10` = konteks penumpukan
            sendiri, jadi ia tidak bisa jatuh ke belakang overlay menu.

            Hilang di atas hero: di atas layar gelap bilahnya harus terbaca datar
            seperti di situs cogniti. Patokannya `overlayUp`, bukan `open`. */}
        <span
          aria-hidden
          className={[
            "dither-panel absolute inset-0 -z-10 border-b border-white/10 transition-opacity duration-300",
            bare ? "opacity-0" : "opacity-100",
          ].join(" ")}
        />

        {/* Logo */}
        <Link to="/" className="shrink-0" aria-label="Cogniti — home">
          <img
            src="/brand/Logo-Final.png"
            alt="CSI Logo"
            width={76}
            height={30}
            className="object-contain"
            fetchPriority="high"
          />
        </Link>

        {/* Desktop room links */}
        <ul className="hidden items-center gap-6 md:flex">
          {ACTIVE_KEYS.map((room) => {
            const active = currentRoom === room;
            return (
              <li key={room}>
                <button
                  type="button"
                  onClick={() => goRoom(room)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "text-sm transition-colors hover:text-accent",
                    active ? "text-accent" : "text-zinc-300",
                  ].join(" ")}
                >
                  {room}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {/* CTA — pakai goToContact(), BUKAN scrollIntoView langsung.
              Versi sebelumnya memanggil scrollIntoView apa adanya di sini,
              sehingga tombol desktop & mobile berperilaku berbeda: yang mobile
              tahu harus pindah dulu kalau ruangannya tak punya Contact, yang
              ini tidak — dari Office ia diam saja tanpa umpan balik. */}
          {/* TEKS TELANJANG, bukan pill putih + panah (17 Agu). Pill-nya dulu
              satu-satunya benda 36px di bilah ini, jadi ia sendiri yang menahan
              tingginya di 60px; tanpa dia yang tertinggi adalah logo (27,83px
              terukur) dan bilahnya turun ke 52px — 12px di atas dan di bawah,
              persis padding `<nav>`. Jadi "hilangkan pill" dan "persempit ke
              12px" itu satu perubahan yang sama, bukan dua.

              `md:block`, bukan `md:flex`: gap & items-center itu untuk mengatur
              teks-plus-panah, dan panahnya sudah tidak ada.

              Warnanya zinc-100 (bukan zinc-300 seperti tautan ruangan di
              sebelahnya) supaya masih terbaca sebagai CTA setelah kehilangan
              latar putihnya, dengan hover ke accent yang sama dengan tautan
              lain — satu perilaku hover untuk seluruh bilah.

              ⚠️ `maxDistance` DITURUNKAN 14 → 4px. Tarikan magnet 14px dulu
              tertelan `px-4 py-2` milik pill; pada teks telanjang di bilah 52px
              tarikan sejauh itu melempar tulisannya keluar dari bilah. 4px masih
              terasa hidup tapi tidak pernah menembus tepi. */}
          <MagneticButton maxDistance={4}>
            <button
              type="button"
              onClick={goToContact}
              className="hidden shrink-0 text-sm font-medium text-zinc-100 transition-colors hover:text-accent md:block"
            >
              Talk to us
            </button>
          </MagneticButton>

          {/* Tombol menu — ikon burger yang MELIPAT jadi "— Close.", bukan dua
              label yang saling memudar di tempat.

              Bentuk tertutupnya ikon burger dari situs cogniti yang tayang;
              bentuk terbukanya `.menu-close` dari situs yang sama. Yang
              menyambung keduanya: garis TENGAH burger dan strip di depan kata
              "Close." adalah satu elemen yang sama, tidak pernah menghilang.
              Garis atas & bawahnya yang meluncur menyatu ke tengah lalu
              memudar. Karena itu peralihannya terbaca sebagai satu benda yang
              berubah bentuk, bukan ikon yang ditukar dengan tulisan.

              Urutannya dibalik menurut arah, dan itu yang bikin enak dilihat:
              MEMBUKA garisnya melipat dulu, baru katanya menyingkap (delay
              0,1s) — ruangnya dibuka sebelum diisi. MENUTUP katanya pergi
              dulu, baru garisnya mekar (delay 0,12s) — ruangnya dikosongkan
              sebelum ditutup. Kalau keduanya berangkat bersamaan, kata dan
              garis saling melewati dan hasilnya terlihat berdesakan.

              Lebar katanya dianimasikan `0 ⇄ "auto"` di dalam wadah
              `overflow-hidden`, jadi tidak ada angka lebar yang ditulis tangan
              yang akan basi begitu fontnya berganti. Tombolnya rata KANAN, dan
              bilahnya `justify-between`, jadi yang bergerak saat lebarnya
              berubah cuma tepi kiri tombol — logo di seberangnya diam.

              `h-11 min-w-11` = kotak sentuh 44×44 walau ikonnya cuma selebar
              26px — ukuran yang sama dengan yang dipakai situs cogniti untuk
              burgernya, dan ambang minimum sentuh. Tanpa `min-w-11` tombolnya
              persis selebar ikon (terukur 26px), terlalu sempit untuk jempol.
              Kelebihan lebarnya tumbuh ke KIRI karena isinya rata kanan, jadi
              ikonnya tidak bergeser sepiksel pun.

              ⚠️ `h-11` MEMANG melebarkan bilah, dan itu penyumbang tinggi
              terbesar di seluruh navbar seluler: bilah terukur 68px di 390px
              (44 + p-3 dua sisi) lawan 52px di ≥md di mana tombol ini
              `md:hidden`. Komentar lama di sini mengklaim "logo + py-2.5 sudah
              50px" jadi tingginya tidak berpengaruh — itu salah (logo cuma
              27,83px). Jangan pangkas untuk menghemat ruang: 44×44 itu ambang
              minimum sentuh, dan 8px yang didapat tidak sebanding dengan target
              yang jadi sulit dikenai jempol.

              `-mr-1` yang dulu ada di sini SUDAH DILEPAS. Fungsinya menarik ikon
              4px keluar supaya terlihat pas di dalam lengkung `rounded-full`;
              pada persegi tanpa lengkung ia justru bikin ikonnya 8px dari tepi
              sementara logo di seberangnya 12px — timpang, dan pada bilah lurus
              ketimpangan itu langsung kelihatan.

              Patokannya `open`, bukan `overlayUp` seperti latar bilah di atas:
              ini benda yang barusan disentuh, jadi ia harus menjawab di frame
              itu juga. Yang menutupi jeda 450 ms sampai panelnya benar-benar
              hilang adalah animasinya sendiri. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="group flex h-11 min-w-11 items-center justify-end text-[11px] tracking-[0.11em] text-zinc-400 uppercase transition-colors hover:text-zinc-100 md:hidden"
          >
            <span aria-hidden className="relative block h-4 w-[26px] shrink-0">
              {BURGER_OFFSETS.map((offset) => (
                <motion.span
                  key={offset}
                  className="absolute left-0 block h-[1.5px] w-full bg-current"
                  style={{ top: LINE_TOP }}
                  animate={{
                    y: open ? 0 : offset,
                    // Garis tengah tidak pernah memudar — ia yang jadi stripnya.
                    opacity: offset === 0 || !open ? 1 : 0,
                  }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          y: { duration: 0.38, ease: EASE, delay: open ? 0 : 0.12 },
                          // Memudar lebih singkat daripada perjalanannya: garis
                          // atas & bawah hilang di tengah jalan, jadi tidak ada
                          // momen ketiganya bertumpuk jadi satu garis tebal.
                          opacity: { duration: 0.22, ease: FADE, delay: open ? 0 : 0.12 },
                        }
                  }
                />
              ))}
            </span>

            <motion.span
              aria-hidden
              className="overflow-hidden"
              animate={{ width: open ? "auto" : 0, opacity: open ? 1 : 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      // FADE, bukan EASE — ini satu-satunya jarak PANJANG di
                      // tombolnya (~55px, dan ikonnya ikut terseret sejauh itu
                      // karena isinya rata kanan). easeOutExpo menghabiskan
                      // 70% jaraknya dalam 70 ms pertama; di 7px itu terbaca
                      // tegas, di 55px terbaca sebagai sentakan. Garisnya
                      // sendiri tetap EASE — jaraknya cuma 7px.
                      width: { duration: open ? 0.4 : 0.34, ease: FADE, delay: open ? 0.1 : 0 },
                      opacity: { duration: open ? 0.26 : 0.18, ease: FADE, delay: open ? 0.16 : 0 },
                    }
              }
            >
              {/* Jaraknya `pl-2.5` di ANAK, bukan `gap` di tombolnya: `gap`
                  tetap 10px walau katanya selebar 0, jadi ikonnya tergantung
                  10px dari tepi kanan saat tertutup. Di dalam wadah yang
                  lebarnya menyusut, jaraknya ikut habis. */}
              <span className="block pl-2.5 whitespace-nowrap">Close.</span>
            </motion.span>
          </button>
        </div>
      </nav>

    </header>
  );
}

/**
 * Menu layar penuh — adaptasi `#menu-overlay` dari situs cogniti yang tayang.
 *
 * Tiga hal yang berbeda dari aslinya, dan alasannya:
 *
 * 1. **Daftarnya ruangan (Lounge/Office/…), bukan bagian halaman**
 *    (Deployments/Services/…). Situs lama satu halaman panjang, jadi menunya
 *    daftar jangkar scroll. Di sini pindah ruangan itu pindah rute, dan
 *    INVARIANTS.md §6 mengikatnya lebih keras lagi: di perangkat sentuh
 *    tautan ruangan di navbar adalah **satu-satunya** jalan pindah ruangan —
 *    waypoint 3D sengaja dimatikan di sana. Menggantinya dengan daftar bagian
 *    halaman akan mengunci pengunjung HP di satu ruangan.
 * 2. **Tanpa efek scramble huruf saat hover.** Menu ini `md:hidden`; di layar
 *    yang menampilkannya tidak ada hover sama sekali, jadi efeknya cuma kode
 *    yang tidak pernah jalan.
 * 3. **Tanpa baris logo + tombol tutup sendiri.** Keduanya sudah ada di bilah
 *    navbar yang melayang di atas overlay ini, di posisi yang sama.
 */
function MobileMenu({
  open,
  clocks,
  currentRoom,
  overlayV,
  listV,
  itemV,
  onRoom,
  onContact,
  onGone,
}: {
  open: boolean;
  clocks: string[];
  currentRoom: RoomKey;
  overlayV: Variants;
  listV: Variants;
  itemV: Variants;
  onRoom: (room: RoomKey) => void;
  onContact: () => void;
  /** Dipanggil setelah overlay benar-benar selesai memudar dan lepas dari DOM. */
  onGone: () => void;
}) {
  return (
    <AnimatePresence onExitComplete={onGone}>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          variants={overlayV}
          initial="hidden"
          animate="shown"
          exit="out"
          /* px-3 = 12px, angka yang SAMA dengan padding `<nav>`: daftar besarnya
             rata kiri persis dengan logo di atasnya. Dulu px-9 (36px) karena
             logonya memang di 36px — 16px jarak luar header + 20px padding pill.
             Begitu pill jadi bilah penuh, logonya pindah ke 12px dan angka ini
             HARUS ikut; kalau tidak, daftar ruangan menggantung 24px lebih masuk
             daripada logo tepat di atasnya. Keduanya selalu bergerak bersama.

             bg-background (bukan hitam pekat seperti situs lama) supaya senada
             dengan sisa situs ini.

             pt-24 = 96px tetap: bilah seluler berakhir di 68px, jadi masih ada
             28px sebelum baris pertama. */
          className="fixed inset-0 flex flex-col overflow-y-auto bg-background px-3 pt-24 pb-10 md:hidden"
        >
          <motion.ul variants={listV} className="flex flex-col">
            {ACTIVE_KEYS.map((room) => {
              const active = currentRoom === room;
              return (
                <motion.li key={room} variants={itemV}>
                  <button
                    type="button"
                    onClick={() => onRoom(room)}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "block w-full py-1.5 text-left text-[clamp(2rem,8.5vw,3rem)] leading-[1.34] font-light tracking-[-0.03em] transition-colors",
                      active ? "text-accent" : "text-zinc-200",
                    ].join(" ")}
                  >
                    {room}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* mt-auto: CTA + sosial + jam jadi kaki yang menempel ke bawah layar,
              persis seperti tata letak seluler situs cogniti. */}
          <motion.div variants={itemV} className="mt-auto pt-10">
            <button
              type="button"
              onClick={onContact}
              className="group flex w-full items-center justify-between gap-5 border-y border-line-1 py-7 text-left"
            >
              <span className="text-lg font-light tracking-[-0.02em] text-zinc-300 transition-colors group-hover:text-white">
                Talk to us
              </span>
              {/* Titik yang mekar jadi lingkaran berisi panah. Di layar sentuh
                  hover tidak ada, jadi yang terlihat cuma titik kecilnya —
                  itu memang penandanya, bukan animasi yang gagal. */}
              <span className="relative grid h-[30px] w-[30px] shrink-0 place-items-center">
                <span className="absolute h-[7px] w-[7px] rounded-full bg-zinc-700 transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-[30px] group-hover:w-[30px] group-hover:bg-white" />
                <span className="relative text-[11px] text-zinc-900 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:delay-[180ms]">
                  ↗
                </span>
              </span>
            </button>
          </motion.div>

          <motion.ul variants={itemV} className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] tracking-[0.1em] text-zinc-500 uppercase transition-colors hover:text-zinc-100"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </motion.ul>

          <motion.dl variants={itemV} className="mt-6 flex flex-wrap gap-x-8 gap-y-2.5">
            {ID_ZONES.map((z, i) => (
              <div key={z.label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] tracking-[0.18em] text-zinc-600 uppercase">
                  {z.label}
                </dt>
                <dd className="text-[19px] font-light tracking-[-0.02em] text-zinc-400 tabular-nums">
                  {clocks[i]}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

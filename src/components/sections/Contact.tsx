"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InquiryLaptop from "@/components/motion/InquiryLaptop";
import type { HitRect } from "@/components/motion/InquiryLaptop";
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
 * Rentang MEMUDARNYA lembar form, dibaca dari pegas KAMERA — bukan dari engsel,
 * dan bukan dari durasinya sendiri.
 *
 * Urutan yang dikejar: lid membuka → kamera mendorong masuk ke layar → form
 * memudar masuk menutupinya. Diikat ke `zoom`, ketiganya mustahil berselisih;
 * satu durasi terpisah akan selalu terbaca sebagai kejadian keempat.
 *
 * Kenapa mulai di 0,5 dan bukan 0: sebelum itu dorongannya harus terlihat
 * TELANJANG, kalau tidak form sudah menutupi layar sebelum kameranya terbaca
 * bergerak — animasinya ada tapi tak pernah tersaksikan. Pada pegas 55/23 nilai
 * 0,5 jatuh di ~0,26 dtk, jadi dorongannya dapat seperempat detik sendirian.
 *
 * Kenapa berakhir di 0,85 dan bukan 1: sisa perjalanan kamera dihabiskan DI
 * BALIK lembar yang sudah legap. Itu disengaja — di ujung lintasan `push`
 * bingkainya tinggal secuil layar hitam yang tidak perlu dilihat siapa pun
 * (lihat PUSH_FILL_H di InquiryLaptop.tsx), dan menyembunyikannya berarti
 * targetnya boleh agresif tanpa harus tahan dipandangi.
 *
 * Arah baliknya ikut benar, tapi TIDAK simetris — dan itu memang begitu
 * seharusnya. Diukur langsung dari `getComputedStyle` di HP 390×844:
 *
 *   buka  — dorongan telanjang 0 → 0,35 dtk, form memudar masuk 0,35 → 0,82 dtk
 *   tutup — form memudar keluar 0,08 → 0,35 dtk, lalu kamera mundur sampai ~2,4 dtk
 *
 * Pegasnya sendiri simetris (nilai t pada waktu yang sama, cuma dibalik). Yang
 * asimetris akibat rentang ini: saat membuka, ekor lambatnya (0,85 → 1)
 * tertutup lembar legap; saat menutup, ekor yang sama (0,5 → 0) TERLIHAT.
 * Itu sengaja dibiarkan: yang mundur cuma laptop tertutup yang mengecil, dan
 * ~78% penyusutannya selesai di detik pertama — sisanya mengendap, bukan
 * merangkak. Menutupinya berarti menahan form tetap legap sampai ~1,5 dtk
 * setelah tombol tutup ditekan, dan tombol yang ditekan tapi layarnya belum
 * berubah jauh lebih buruk daripada ekor yang mengendap.
 */
const SHEET_FADE_FROM = 0.5;
const SHEET_FADE_TO = 0.85;

/** Ease masuk/keluarnya lembar TIDAK dipakai — lembarnya ikut pegas KAMERA
 *  (lihat sheetOpacity). Konstanta ease-nya sengaja tidak ada supaya tidak ada
 *  orang yang menambahkan durasi kedua yang berlomba dengan pegasnya. */

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
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Wordmark kepala <Contact/> — "COGNITI.ID" dari tepi ke tepi.
 *
 * Dibangun sebagai SVG dengan `textLength` + `lengthAdjust="spacingAndGlyphs"`,
 * bukan teks HTML dengan `scaleX` atau ukuran `vw`. Tiga sebabnya:
 *
 * 1. `textLength` MEMAKSA baris berakhir tepat di 1000 satuan viewBox, jadi
 *    wordmark-nya mengunci lebar induk berapa pun lebar layarnya — tidak ada
 *    tebak-tebakan `font-size: 12.7vw` yang meleset satu-dua piksel di setiap
 *    ukuran dan menyisakan celah menganga di kanan.
 * 2. Kunci itu juga membuatnya KEBAL urutan muat font. Sebelum Archivo turun,
 *    fallback dirender pada lebar yang persis sama; yang berubah saat swap cuma
 *    bentuk hurufnya, bukan tata letaknya. `scaleX` pada teks HTML akan melompat.
 * 3. Rasio melarnya jadi angka yang bisa dibaca, bukan efek samping — dan di
 *    sini angka itu sengaja dijaga di 1,0. Lihat FONT_SIZE di bawah.
 *
 * Lebarnya datang dari POTONGAN FONT, bukan dari peregangan: Archivo pada
 * wdth 125% + wght 900 memang digambar lebar oleh desainernya, dengan palang
 * mendatar yang ikut ditebalkan. `textLength` di sini cuma mengunci tepi,
 * selisihnya <1% — bukan lagi mesin pelar seperti versi Geist 900 sebelumnya
 * (yang melar 1,46x dan menebalkan stem tegak saja sehingga huruf terlihat
 * gepeng).
 */
/** Puncak lengkung O/C/G/D yang overshoot sedikit di atas tinggi kapital
 *  (kapital 0,688em, overshoot 0,700em) — diukur dari
 *  `actualBoundingBoxAscent`. Dipakai sebagai baseline supaya viewBox
 *  terpotong pas di puncak huruf tertinggi. */
const WORDMARK_OVERSHOOT_EM = 0.7;
/** Jarak baseline → garis rambut. Di dalam viewBox, bukan `mt-*`, supaya ia
 *  menyusut proporsional di layar sempit alih-alih tetap 8px di mana-mana.
 *  Cukup lega untuk melewati overshoot O yang menggantung di bawah baseline. */
const WORDMARK_RULE_GAP = 8;

/**
 * Satu varian wordmark. `advanceEm` = lebar maju teksnya pada Archivo
 * wdth 125% / wght 900, DIUKUR di peramban (`getComputedTextLength()` pada
 * font-size 1000, dibagi 1000) — bukan dihitung. Ganti teksnya = ukur ulang.
 *
 * Sisanya TURUNAN, bukan tombol rasa. `fontSize` dipilih supaya lebar alami
 * teks jatuh persis di lebar viewBox, jadi `textLength` tidak perlu
 * melar/menciut sama sekali (rasio 1,00). Itulah seluruh alasan pindah ke
 * Archivo: bentuk lebarnya diambil dari sumbu `wdth`, bukan dari transformasi.
 * Kalau pita ini ingin lebih tinggi, PENDEKKAN teksnya — jangan naikkan
 * fontSize-nya, itu cuma mengembalikan distorsi lewat pintu belakang.
 */
function wordmarkVariant(text: string, advanceEm: number) {
  const fontSize = Math.round(1000 / advanceEm);
  const baseline = Math.round(fontSize * WORDMARK_OVERSHOOT_EM);
  return { text, fontSize, baseline, viewBoxH: baseline + WORDMARK_RULE_GAP };
}

/**
 * Dua varian, dipilih lewat breakpoint CSS — bukan `matchMedia`, supaya tidak
 * ada kedipan varian salah di gambar pertama.
 *
 * Kenapa versi sempit dipotong di ".ID" dan bukan disingkat jadi konsonan
 * ("CGNT" ala BSMNT): tinggi huruf di sini = lebar wadah ÷ jumlah glyph, jadi
 * memotong 3 glyph sudah menaikkan tinggi kapital ~30% — cukup untuk membuat
 * tanda ini berdiri di layar ponsel. "CGNT" memang menaikkan ~91%, tapi
 * ongkosnya halaman yang sama menampilkan DUA nama berbeda tergantung lebar
 * layar, dan kerangka konsonan cuma terbaca sebagai nama kalau pembacanya
 * sudah hafal namanya lebih dulu (BSMNT sudah, CGNT belum). ".ID" sendiri
 * bagian paling ringan isinya: alamat lengkapnya tetap ada di footer tepat
 * di bawahnya (hello@cogniti.id), jadi tidak ada informasi yang hilang.
 */
const WORDMARK_WIDE = wordmarkVariant("COGNITI.ID", 7.342);
const WORDMARK_NARROW = wordmarkVariant("COGNITI", 5.633);

/** Satu pita huruf. Dua kali dipasang (lebar + sempit), yang tidak dipakai
 *  di-`display:none` oleh breakpoint — sekaligus mencabutnya dari pohon
 *  aksesibilitas, jadi namanya tidak dibacakan dua kali. */
function WordmarkSvg({
  variant,
  className,
}: {
  variant: ReturnType<typeof wordmarkVariant>;
  className: string;
}) {
  return (
    <svg
      viewBox={`0 0 1000 ${variant.viewBoxH}`}
      /* `block` membuang celah baseline inline di bawah <svg> — tanpa itu
         ada ~4px liar antara huruf dan garis rambut yang ikut membesar
         mengikuti font-size induk. */
      className={`text-text-secondary h-auto w-full ${className}`}
      role="img"
      aria-label="cogniti.id"
    >
      <text
        x="0"
        y={variant.baseline}
        textLength="1000"
        lengthAdjust="spacingAndGlyphs"
        /* Atribut, BUKAN class `text-*`: nilainya harus satuan-pengguna
           viewBox. Class Tailwind akan menulis px/rem, dan CSS mengalahkan
           atribut presentasi — rasio viewBox di atas langsung batal. */
        fontSize={variant.fontSize}
        /* `font-display` = Archivo Variable (lihat main.tsx). Lebar & berat
           disetel lewat sumbu variabelnya, bukan lewat kelas `font-black`:
           `font-stretch: 125%` cuma berarti sesuatu pada font bersumbu
           `wdth`, dan pada font statis ia diam-diam tidak berefek. */
        className="font-display"
        style={{ fontWeight: 900, fontStretch: "125%" }}
        fill="currentColor"
      >
        {variant.text}
      </text>
    </svg>
  );
}

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
  const flat = coarse || narrow;
  const overlay = open && !flat;
  const sheet = open && flat;

  /**
   * TIGA patokan, dan pemisahannya yang bikin animasinya jalan di HP.
   *
   *   `open`     → engsel DAN kamera. Semua jalur, tanpa kecuali.
   *   `overlay`  → form menempel di layar 3D lewat `<Html transform>`.
   *   `promoted` → lapisan naik jadi `fixed inset-0` (di bawah).
   *
   * Sejarahnya dua langkah, dan keduanya bentuk kesalahan yang sama —
   * **satu bendera menggerbangi dua hal yang tak sama urusannya**:
   *
   * 17 Agu, engsel dilepas dari `overlay`. Sebelumnya jalur sentuh & jendela
   * sempit kehilangan animasinya sama sekali ("nggaada animasi laptop terbuka
   * saat aku klik") karena di sana `overlay` selamanya false.
   *
   * 18 Agu, KAMERA menyusul dilepas — perubahan ini. `overlay` menahannya
   * karena satu alasan yang sempit: keterbacaan form yang HIDUP di layar 3D
   * (INVARIANTS §6, catatan 13 Agu). Tapi di jalur ini form tidak tinggal di
   * situ; ia mendarat sebagai lembar DOM datar, dan kameranya cuma dipakai
   * sebagai TRANSISI menuju lembar itu. Keterbacaan tidak pernah jadi
   * pertanyaan, jadi gerbangnya tidak punya alasan berdiri.
   *
   * Yang tetap digerbangi `overlay` cuma `<Html>`-nya sendiri, dan di situ
   * catatan 13 Agu masih berlaku apa adanya.
   *
   * Aman terhadap `frameloop="demand"`: pendengar `progress` DAN `zoom` di
   * InquiryLaptop sama-sama memesan framenya sendiri lewat `invalidate()` tiap
   * kali nilainya berubah, jadi keduanya tetap teranimasi walau `floating` —
   * satu-satunya yang menyalakan frameloop "always" — false sepanjang jalur ini.
   */
  useEffect(() => {
    const t = open ? 1 : 0;
    /* prefers-reduced-motion: tetap bisa dibuka, tapi LANGSUNG. `jump` menyetel
       nilai tanpa menjalankan pegasnya (`set` akan menganimasikan). */
    if (reduced) {
      progress.jump(t);
      zoom.jump(t);
    } else {
      progress.set(t);
      zoom.set(t);
    }
  }, [open, reduced, progress, zoom]);

  /**
   * Lapisan overlay bertahan MENGAMBANG sampai kameranya benar-benar pulang.
   *
   * Ini betulan sebuah bug, bukan pemanis: dulu `fixed inset-0` digerbangi
   * `overlay` langsung, jadi begitu tombol tutup ditekan lapisannya SEKETIKA
   * turun kembali ke kotak sisa ekor halaman — padahal kameranya masih close-up.
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
  if (open && !settling) setSettling(true);
  const promoted = open || settling;

  useEffect(() => {
    if (open) return;
    const check = (v: number) => {
      if (v <= CAMERA_HOME) setSettling(false);
    };
    check(zoom.get()); // reduced-motion `jump` bisa sudah mendarat sebelum ini
    return zoom.on("change", check);
  }, [open, zoom]);

  /**
   * "Form-nya modal SEKARANG" — lewat jalur mana pun.
   *
   * Dipakai untuk urusan yang tidak peduli laptop 3D atau lembar datar: kunci
   * gulir, pelepasan kurungan z-index, Esc, dan perpindahan fokus. Sebelum 17
   * Agu keempatnya digerbangi `promoted` yang saat itu HANYA benar untuk jalur
   * overlay, dan jalur lembar datar tidak mendapatkan satu pun. Itu yang membuat
   * tombol tutup di HP tidak bisa ditekan: tanpa `setInquiryOpen`, `<main>`
   * tetap `z-10` dan mengurung lembar z-55 di dalamnya sebagai satu lapisan,
   * jadi Navbar z-50 menang dan menutupi tombolnya (terpotret).
   *
   * Sekarang ia cuma alias `promoted`, dan itu BUKAN kebetulan yang boleh
   * disederhanakan jadi satu nama: `promoted` menjawab "lapisannya sedang
   * `fixed inset-0`?" sementara `modal` menjawab "halaman sedang dikunci di
   * belakang sesuatu?". Keduanya kebetulan sama sejak promosi berlaku di kedua
   * jalur (18 Agu); kalau kelak salah satu jalur berhenti dipromosikan, yang
   * harus ikut berubah cuma satu dari keduanya.
   *
   * ⚠️ Dulu ada `sheetSettling`, kembaran `settling` yang menunggu pegas ENGSEL
   * karena jalur datar tidak menggerakkan kamera. Sejak kamera ikut bergerak di
   * sana, yang mendarat paling akhir tetap kamera (55/23 vs 170/26) — jadi satu
   * `settling` yang menunggu `zoom` sudah menanggung kedua jalur, dan kembarannya
   * dihapus. Jangan hidupkan lagi tanpa mengecek pegas mana yang mendarat
   * terakhir: menunggu pegas yang salah = lembarnya lenyap selagi masih ada yang
   * bergerak di baliknya.
   */
  const modal = promoted;

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

  /**
   * Kotak laptop di layar, dilaporkan oleh <InquiryLaptop/> (lihat HitRect).
   * Dipakai menciutkan pemicu "buka form" dari sekotak canvas jadi seukuran
   * laptopnya — tanpa ini separuh kotak yang kosong ikut membuka form, dan
   * kursor `pointer`-nya menyala jauh sebelum kursornya sampai di laptop.
   *
   * `null` = belum terukur (GLB belum turun). Selama itu pemicunya kembali
   * `inset-0`, bukan hilang: laptopnya memang belum terlihat, tapi tetap lebih
   * baik daripada kotak mati yang tidak bereaksi kalau ada yang mengklik duluan.
   */
  const [hit, setHit] = useState<HitRect | null>(null);
  /* ⚠️ useCallback WAJIB — fungsi ini jadi dependensi efek pengukur di sana. */
  const onHitbox = useCallback((r: HitRect) => setHit(r), []);

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
   * Lembar datar MEMUDAR MASUK mengikuti pegas KAMERA — bukan animasi bertenaga
   * durasi sendiri, dan tidak lagi menggeser dari bawah.
   *
   * Sengaja meniru cara tirai mengikuti pegas yang sama, dan alasannya sama: dua
   * animasi dengan sumber waktu berbeda untuk satu kejadian yang sama akan
   * selalu terbaca sebagai dua kejadian. Diikat ke `zoom`, lembarnya tidak bisa
   * mendahului atau tertinggal dari dorongan kameranya — termasuk saat `jump`
   * reduced-motion memasangnya langsung, tanpa perlu cabang tambahan.
   *
   * ⚠️ Sebelum 18 Agu ini `y: 100% → 0%` yang diikat ke pegas ENGSEL, dan
   * alasannya tercatat: selama masih di "100%" lembarnya di luar layar
   * sepenuhnya, jadi ia tidak bisa menelan sentuhan yang seharusnya mengenai
   * laptop di baliknya. Opacity tidak punya perlindungan itu — sebuah lembar
   * `opacity: 0` tetap menangkap sentuhan.
   *
   * Yang membuatnya aman sekarang bukan opacity-nya, melainkan bahwa TIDAK ADA
   * LAGI yang perlu disentuh di baliknya: pemicu "buka form" digerbangi
   * `!modal`, dan `modal` menyala di commit yang sama dengan `open`. Jadi
   * pemicunya sudah lepas sebelum lembarnya sempat menutupi apa pun. Kalau kelak
   * ada yang bisa diklik di balik lembar ini (mis. tutup-dengan-ketuk-di-luar),
   * perlindungan itu harus dikembalikan secara eksplisit — jangan mengandalkan
   * pola ini diam-diam tetap benar.
   */
  const sheetOpacity = useTransform(
    zoom,
    [SHEET_FADE_FROM, SHEET_FADE_TO],
    [0, 1],
  );

  /* Padding BAWAH sengaja tidak ada (`pt-*`, bukan `py-*`): ini section
     terakhir di halaman, jadi sisa 128 px di bawah footer cuma pita kosong di
     ujung dokumen. Footer di bawah menambal sendiri gutter kiri-kanannya
     dengan margin negatif. */
  return (
    <section id="contact" className="overflow-x-clip px-3 pt-24 sm:pt-32">
      {/* ⚠️ Kepala section — eyebrow "CONTACT", judul besar "Let's Start A
          Conversation.", subjudul "We typically respond within one business
          day.", dan sepasang pil CTA — DIHAPUS 13 Agu atas permintaan Keano.
          Alasannya redundansi, bukan selera: begitu form-nya pindah ke layar
          MacBook, judul dan subjudul itu ada DUA KALI di layar yang sama
          (lihat ContactForm.tsx — judul di atas, catatan waktu balas di kaki).
          Kalau kelak form-nya dilepas dari laptop, kepalanya perlu kembali.

          Dari sepasang tautannya, `hello@cogniti.id` turun ke footer di bawah
          sebagai jalur cadangan kalau form-nya gagal. "↑ Back to the office"
          sempat ikut turun, lalu DIHAPUS 18 Agu — navbar sudah membawa
          pemilih ruangan, jadi ia jalan pulang yang kedua.

          Catatan merge 13 Agu: origin/main sempat mengoreksi title-case judul
          ini ("A" → "a") tepat saat sisi sini memindahkannya ke layar MacBook;
          koreksinya dibawa ke rumah barunya di ContactForm.tsx. */}

      {/* ═══ EKOR HALAMAN — tinggi dipatok 100svh − navbar − 10px napas ═══
          Bukan dekorasi: ini yang membuat wordmark berhenti tepat di bawah
          navbar saat halaman digulir MENTOK BAWAH. Di posisi itu tepi bawah
          viewport = tepi bawah dokumen, jadi apa pun yang tingginya persis
          `100svh − navbar` akan mulai persis di garis bawah navbar. Sebelum
          ini blok ekornya lebih tinggi dari itu dan wordmark-nya tersembunyi
          di balik bilah.

          `− 10px` di ujung rumus itu jarak napas yang diminta: memendekkan
          blok berarti pangkalnya turun, karena yang terpaku adalah tepi
          BAWAHNYA (= tepi bawah dokumen), bukan pangkalnya. Ditulis di rumus
          tinggi, bukan sebagai `pt-*` di dalam blok, supaya "kapan wordmark
          mulai" tetap satu angka yang bisa dibaca sekali jalan.

          `svh`, bukan `vh`/`dvh`: di ponsel bilah URL membuat viewport
          bernapas. `svh` adalah yang TERPENDEK, jadi kesalahannya selalu ke
          arah aman — wordmark turun sedikit di bawah navbar, tidak pernah naik
          ke belakangnya.

          Karena tingginya dipatok, jarak di dalamnya jadi anggaran nol-jumlah:
          setiap piksel yang diberikan ke `mb-*`/`mt-*` diambil dari laptop
          (satu-satunya `flex-1` di sini). Itu sebabnya jaraknya lebih rapat
          dari kelaziman halaman ini — bukan karena ritmenya berubah.

          `min-h-*` menjaga kalau viewport-nya sangat pendek (ponsel lanskap):
          di situ blok ini boleh melebihi jatahnya dan wordmark naik ke balik
          navbar — mengorbankan pemandangan yang cuma terlihat di ujung gulir,
          bukan laptop yang harus tetap bisa dipakai. */}
      <div className="flex min-h-[520px] flex-col [height:calc(100svh-var(--nav-h)-10px)]">
        {/* Kepala section kembali — tapi sebagai TANDA, bukan teks. Yang dihapus
          13 Agu (lihat catatan di atas) adalah judul + subjudul yang mengulang
          isi form; wordmark ini tidak mengulang apa pun, ia cuma menutup
          halaman dengan nama perusahaannya. Karena itu ia boleh berdiri di sini
          tanpa menghidupkan kembali masalah redundansi yang sama.

          `select-none` supaya seret-pilih di dekat laptop tidak menyorot balok
          raksasa ini; namanya tetap terbaca pembaca layar lewat aria-label. */}
        <motion.div
          className="mb-10 shrink-0 select-none sm:mb-14"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <WordmarkSvg variant={WORDMARK_NARROW} className="block sm:hidden" />
          <WordmarkSvg variant={WORDMARK_WIDE} className="hidden sm:block" />
          {/* Jaraknya dijatah di dalam viewBox (WORDMARK_RULE_GAP = 8 satuan)
            supaya ikut menyusut proporsional, bukan tetap 8px di mana-mana.

            ⚠️ Justru penyusutan itu yang patah di HP (diperbaiki 18 Agu):
            8 satuan viewBox = 8 × (lebar wadah ÷ 1000), jadi ~11px di desktop
            1400px tapi cuma ~2,7px di layar ~340px — garisnya menempel ke
            kaki huruf. `mt-2.5` (10px) menambalnya HANYA di bawah `sm`,
            mengembalikan jaraknya ke kisaran yang sama dengan desktop;
            ≥640px tetap murni proporsional (`sm:mt-0`).

            Sengaja TIDAK memakai token `--line-2` (putih 12%) seperti hairline
            lain di halaman: yang ini bukan sekat tata letak, ia bagian dari
            tandanya — di lebar 1400px garis 12% praktis lenyap di bawah balok
            huruf setinggi 150px, dan komposisinya kehilangan alasnya. */}
          <div className="mt-2.5 h-px w-full bg-white/25 sm:mt-0" />
        </motion.div>

        {/* MacBook yang membuka saat diklik. Untuk sekarang lid-nya masih kosong —
          form-nya menyusul (rencana §4: ContactForm.tsx + submitInquiry.ts).
          Tingginya dipatok, bukan aspect-ratio, supaya canvas tidak ikut melar
          di layar lebar dan laptopnya tetap seukuran benda nyata.

          ⚠️ Pemicunya <button> DOM, bukan raycast ke mesh seperti pmndrs.
          Alasannya mengikat: nanti laptop ini satu-satunya jalan ke form, dan
          INVARIANTS §6 melarang scene 3D menerima interaksi di pointer kasar.
          Tombol DOM jalan di sentuh, keyboard, dan pembaca layar sekaligus —
          raycast tidak. */}
        {/* ⚠️ Jarak ke footer dulu `mt-32` supaya laptop punya ruang bernapas.
          Sejak ekor halaman dipatok 100svh − navbar itu berbalik arti: 128px
          itu diambil LANGSUNG dari laptop, satu-satunya yang melar di sini.
          Jadi angkanya diturunkan ke `mt-12` dan ruang bernapasnya justru
          bertambah. */}
        {/* Pelahap sisa. Kotak laptop di dalamnya TIDAK ikut melar tanpa batas:
            `flex-1` ada di pembungkus ini, `max-h-[520px]` tetap di kotaknya,
            dan `items-center` menaruh sisa ruangnya rata atas-bawah.

            Kenapa dipisah jadi dua elemen: `fov` three.js VERTIKAL, jadi ukuran
            laptop di layar mengikuti TINGGI canvas. Kalau kotaknya sendiri yang
            `flex-1`, di layar 1440px-tinggi ia jadi ~970px dan laptopnya
            membengkak jadi sebesar meja. Batas 520px itu juga angka yang
            dipakai rig kamera di InquiryLaptop.tsx saat menghitung rentang
            aspect-nya — menaikkannya berarti menghitung ulang rig, bukan
            sekadar memberi ruang. */}
        <div className="flex min-h-0 flex-1 items-center">
          <div
            ref={boxRef}
            className="h-full max-h-[520px] min-h-[280px] w-full"
            data-inquiry-laptop=""
          >
            {/* Tirai gelap. WAJIB elemen DOM: canvas-nya `alpha: true` dan yang ada
            di belakangnya halaman HTML, jadi tidak ada cara memburamkan halaman
            dari DALAM WebGL. `pointer-events-none` karena yang menangkap klik
            "di luar form" adalah lapisan di bawahnya, bukan tirai ini. */}
            {promoted && (
              <motion.div
                style={{ opacity: scrimOpacity }}
                /* `backdrop-blur` HANYA di jalur overlay. Di sana ia memang
                   perlu: halaman tetap terlihat di sekeliling laptop sepanjang
                   form dipakai, jadi buram membuatnya berhenti bersaing dengan
                   teks yang harus dibaca.

                   Di jalur datar ia mahal tanpa terbayar — `backdrop-filter`
                   seukuran layar penuh, di GPU HP, PERSIS selama dorongan kamera
                   berjalan; dan yang dibuatnya buram cuma terlihat kurang dari
                   setengah detik sebelum lembar legap menutupinya. Gelapnya saja
                   sudah mengerjakan seluruh tugas di sini: memadamkan wordmark
                   dan footer supaya kotak laptop jadi satu-satunya yang menyala
                   saat kameranya maju. */
                /* ⚠️ Spasi sebelum `${` itu WAJIB, bukan rapi-rapi. Pemindai
                   Tailwind v4 membaca berkas ini sebagai teks biasa — ia tidak
                   tahu mana template literal. `bg-black/70${` terbaca sebagai
                   satu calon kelas dengan modifier `/70$`, gagal diurai, dan
                   ATURANNYA TIDAK PERNAH DIBUAT. Tidak ada error di mana pun:
                   kelasnya tetap terpasang di DOM, cuma tidak ada CSS-nya, jadi
                   tirainya bening dan wordmark halaman tetap menyala di balik
                   form. Persis itu yang terjadi 18 Agu. Modifier `/angka` yang
                   paling rawan; taruh spasinya di luar, kondisinya tanpa spasi
                   di depan. */
                className={`pointer-events-none fixed inset-0 z-[54] bg-black/70 ${
                  overlay ? "backdrop-blur-md" : ""
                }`}
                aria-hidden="true"
              />
            )}

            {/* Kotak luar di atas tetap memesan tingginya, jadi saat lapisan ini
            berpindah ke `fixed` halaman di belakang tidak melompat.

            Digerbangi `promoted`, BUKAN `overlay`: lihat catatan di atas — turun
            terlalu cepat = laptop close-up digambar di kotak sisa ekor halaman dan terpotong
            footer. Selagi menutup ia sudah tidak bisa diklik lagi. */}
            <div
              className={
                promoted
                  ? `fixed inset-0 z-[55] flex items-center justify-center ${
                      overlay ? "" : "pointer-events-none"
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
                onHitbox={onHitbox}
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
                  /* Seukuran LAPTOP, bukan sekotak canvas. Angkanya diukur di
                     InquiryLaptop (lihat `onHitbox` di atas) dan dipasang
                     sebagai persen — pecahan x 100% langsung benar karena
                     `left/width` persen mengacu ke LEBAR induk dan `top/height`
                     ke TINGGI-nya, dan induknya memang kotak canvas itu sendiri.

                     `inset-0` cuma dipakai selagi belum terukur; begitu
                     angkanya masuk, `inset` dilepas supaya `left/top` yang
                     menentukan. */
                  className={`absolute cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40 ${
                    hit ? "" : "inset-0"
                  }`}
                  style={
                    hit
                      ? {
                          left: `${hit.left * 100}%`,
                          top: `${hit.top * 100}%`,
                          width: `${hit.width * 100}%`,
                          height: `${hit.height * 100}%`,
                        }
                      : undefined
                  }
                >
                  <span className="sr-only">Open the inquiry form</span>
                  <motion.span
                    aria-hidden="true"
                    style={{ opacity: hintOpacity }}
                    /* Di ATAS laptopnya, bukan di dalam kotaknya: sejak tombol
                       ini seukuran laptop, `top-0` jatuh DI PUNGGUNG lid yang
                       tertutup. `bottom-full` menaruhnya persis di luar tepi
                       atas kotak, jadi ia menempel pada laptopnya di ukuran
                       layar mana pun tanpa angka yang perlu disetel. */
                    className="pointer-events-none absolute inset-x-0 bottom-full mb-4 text-center text-[0.65rem] tracking-[0.3em] text-zinc-500 uppercase"
                  >
                    Click to open
                  </motion.span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Jalur sentuh & jendela sempit: form yang sama, lembar datar penuh layar.
          Digerbangi `flat && promoted`, bukan `sheet` — kalau ia turun tepat
          saat tombol tutup ditekan, lembarnya lenyap seketika dan dorongan
          kamera yang mundur di baliknya jadi gerakan yang tak berasal dari mana
          pun. `promoted` (bukan `open`) yang menahannya sampai kameranya pulang.

          ⚠️ Tombol tutup TIDAK diberi z-index sendiri. Ia menang atas Navbar
          karena LEMBARNYA yang z-55 sudah dilepas dari kurungan `<main>` z-10
          oleh `setInquiryOpen` (lihat `modal` di atas) — dan begitu lembarnya
          menang, latarnya yang pekat menutupi Navbar sepenuhnya. Menambah
          z-index di sini akan menyembunyikan sebabnya, bukan memperkuatnya.

          ⚠️ Ia BERSAUDARA dengan lapisan laptop di atas, sama-sama z-55, dan
          menang karena datang BELAKANGAN di DOM. Jangan tukar urutannya.

          `bg-black/80 backdrop-blur-md` diganti `bg-[#0a0b0d]` legap: buramnya
          tidak pernah terlihat (anak `min-h-full` di dalamnya sudah menutup
          seluruh viewport dengan warna yang sama), tapi `backdrop-filter`
          seukuran layar penuh tetap dihitung — dan sejak lembarnya MEMUDAR,
          ongkos itu jatuh persis di frame-frame yang paling sibuk.

          `role="dialog"` menyusul 18 Agu: sejak fokus dipindah masuk dan Esc
          menutupnya, pembaca layar butuh batas yang sama dengan jalur overlay.
          Sebelumnya jalur ini punya perilakunya tanpa penandanya. */}
        {flat && promoted && (
          <motion.div
            style={{ opacity: sheetOpacity }}
            role="dialog"
            aria-modal
            aria-label="Inquiry form"
            className={`fixed inset-0 z-[55] overflow-y-auto overscroll-contain bg-[#0a0b0d] ${
              sheet ? "" : "pointer-events-none"
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

        {/* Menempel pojok. Dulu barisnya membentang tepi ke tepi lewat `-mx-6
          sm:-mx-10` yang membatalkan padding section, lalu memasang `px-3`
          sendiri — 12px itu bukan jarak tata letak, cuma supaya huruf tidak
          benar-benar menyentuh tepi layar. Sejak 18 Agu SELURUH section pakai
          `px-3`, jadi footer tinggal ikut: margin negatif + padding tandingannya
          DILEPAS. Kalau padding section berubah lagi, footer ikut sendiri —
          itulah gunanya melepas keduanya, bukan menuliskan 12px dua kali.
          Garis pemisah `border-t` dilepas 13 Agu — di posisi mepet begini ia
          jadi sekat yang tidak memisahkan apa-apa. */}
        <footer className="mt-12 shrink-0 pb-3 text-xs text-zinc-400">
          {/* Dua baris, dipasangkan per KOLOM bukan per baris: kiri = cara
            menghubungi (surel di atas alamatnya), kanan = jejak resmi (kanal
            sosial di atas hak cipta). Susunan ini diketok 18 Agu; sebelumnya
            hak cipta memimpin baris pertama dan surel terselip di antara
            tautan sosial. */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Pindahan dari kepala section yang dihapus — di sini ia tidak
              mengulang isi form, cuma jalur cadangan kalau form-nya gagal. */}
            {/* Putih penuh, bukan zinc-400 seperti sisa footer (18 Agu):
              surel dan kanal sosial adalah SATU-SATUNYA yang bisa diklik di
              sini — kontras itu yang membedakannya dari teks mati di
              sebelahnya. Hover-nya jadi kebalikan pola biasa: meredup ke
              zinc-400, bukan menyala.

              `hidden sm:inline` — di HP surel dan alamat DISEMBUNYIKAN, sisa
              hak cipta + kanal sosial saja (18 Agu). Empat baris teks kecil
              beruntun di lebar 360px terbaca sebagai tumpukan, bukan kaki
              halaman; surel juga sudah ada di dalam form tepat di atasnya.
              `hidden`, bukan dilepas dari DOM: alamat masih terbaca crawler
              sebagai sinyal lokasi. */}
            <a
              href="mailto:hello@cogniti.id"
              className="hidden text-white transition-colors hover:text-zinc-400 sm:inline"
            >
              hello@cogniti.id
            </a>
            <div className="flex flex-wrap gap-4">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white transition-colors hover:text-zinc-400"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <span className="hidden sm:inline">
              Jl. Kediri No.27, Tuban, Badung, Bali 80361
            </span>
            <span>
              © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All
              rights reserved.
            </span>
          </div>
        </footer>
      </div>
    </section>
  );
}

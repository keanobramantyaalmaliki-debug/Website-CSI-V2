"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { PROCESS_GLYPHS_BY_KEY } from "@/components/motion/ProcessGlyphs";
import { processSteps, type ProcessStepContent } from "@/data/processSteps";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Sejak 23 Agu (malam) daftar teks + panel sticky diganti "tali" SVG yang
 * menjalar mengikuti scroll (adaptasi Skiper19/comgio): satu garis putih
 * zinc-50 masuk dari sisi kanan dan MENEMBUS PUSAT keenam slot kartu secara
 * vertikal, berselang-seling kiri–kanan — masuk tepat di tengah tepi atas
 * kartu, keluar tepat di tengah tepi bawahnya, jadi tali dan kartu selalu
 * segaris. Begitu ujungnya selesai melewati sebuah slot, kartu MENGGEMBUNG
 * dari garis tali itu — analogi Keano: tali = ular, kartu = kotak yang
 * ditelan; perutnya membesar simetris ke kiri-kanan di sepanjang garis
 * (clip-path membuka dari bilah selebar goresan di pusat ke lebar penuh),
 * isi (teks gelap) menyusul muncul. Dua varian DITOLAK Keano: tali
 * menyusuri tepi atas + kartu "dituang" ke bawah (terbaca menggantung
 * kartu), dan tali membungkus keliling kartu. Ujung tali menyentuh tepi
 * atas strip IndustriesStack yang juga zinc-50 — dua section terbaca
 * menyatu tanpa perlu gradasi. StickyScroll + useScrollStepper +
 * MobileGlyph pensiun bersama layout lama.
 *
 * Bentuk tali TIDAK digambar di viewBox statis yang di-stretch
 * (preserveAspectRatio="none" membuat tebal goresan berubah-ubah arah &
 * merusak normalisasi dash pathLength). Sebaliknya path dibangun ulang dari
 * posisi kartu hasil ukur (offsetTop/offsetLeft — sengaja bukan
 * getBoundingClientRect supaya transform animasi kartu tidak ikut terbaca),
 * jadi lekukan selalu tepat menembus kartu di lebar layar apa pun.
 */

type CardBox = { cx: number; top: number; bottom: number };

type RopeGeom = {
  w: number;
  h: number;
  d: string;
  /** fraksi panjang tali saat ujungnya selesai melintasi slot kartu ke-i */
  thresholds: number[];
  /**
   * fraksi SCROLL (progress useScroll) saat dasar slot kartu ke-i berada di
   * garis pandang TRIGGER_VH. Panjang busur tidak sebanding posisi vertikal
   * (sapuan masuk + kelokan S "makan" busur), jadi pathLength TIDAK boleh
   * dipetakan linear dari scroll — ujung tali makin tertinggal di atas
   * viewport. Pasangan stops→thresholds jadi titik patah remap piecewise:
   * ujung tali selesai melewati kartu ke-i persis saat penggunanya
   * memandang slot itu.
   */
  stops: number[];
};

/** Panjang busur kubik via sampling — cukup akurat untuk ambang reveal. */
function cubicLength(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p1: [number, number],
): number {
  let len = 0;
  let px = p0[0];
  let py = p0[1];
  const N = 24;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const x =
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0];
    const y =
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

/** Tebal goresan tali — juga lebar awal kartu saat menggembung darinya. */
const STROKE = 12;
/** Warna tali & kartu: zinc-50, sama dengan strip IndustriesStack. */
const ROPE_COLOR = "#fafafa";
/** Offset useScroll: progress 0 saat puncak wrapper di 85% vh… */
const START_VH = 0.85;
/** …dan progress 1 saat dasar wrapper (tepi atas Industries) di 50% vh. */
const END_VH = 0.5;
/**
 * Garis pandang sinkronisasi: kartu ke-i menyala ketika PUNCAK slotnya
 * menyentuh 75% tinggi viewport — saat itu ujung tali digambar tepat di
 * tepi atas kartu ("tali berada di atas component", arahan Keano), kartu
 * langsung menggembung sehingga garis tengah vertikal tak pernah terlihat
 * telanjang, dan ujung tali terasa menempel ke posisi scroll pengguna.
 */
const TRIGGER_VH = 0.75;

function buildRope(
  w: number,
  h: number,
  vh: number,
  startY: number,
  diveX: number,
  textClearY: number,
  cards: CardBox[],
): RopeGeom | null {
  if (w < 10 || h < 10 || cards.length === 0) return null;

  const r = (n: number) => Math.round(n * 10) / 10;

  let d = "";
  let total = 0;
  let cur: [number, number] = [0, 0];
  const atCardDone: number[] = [];

  const move = (p: [number, number]) => {
    d = `M ${r(p[0])} ${r(p[1])}`;
    cur = p;
  };
  const line = (p: [number, number]) => {
    d += ` L ${r(p[0])} ${r(p[1])}`;
    total += Math.hypot(p[0] - cur[0], p[1] - cur[1]);
    cur = p;
  };
  const curve = (
    c1: [number, number],
    c2: [number, number],
    p: [number, number],
  ) => {
    d += ` C ${r(c1[0])} ${r(c1[1])}, ${r(c2[0])} ${r(c2[1])}, ${r(p[0])} ${r(p[1])}`;
    total += cubicLength(cur, c1, c2, p);
    cur = p;
  };

  // Turunan ke kartu 01, dua kemungkinan bentuk (dipilih SEBELUM glide
  // digambar karena menentukan titik akhir glide):
  //
  // (a) SUDUT BUSUR — kuadran elips rx×ry (≈ lingkaran, cap 140px) lalu
  //     GARIS LURUS vertikal menembus tepi atas kartu. Kurva tunggal
  //     glide→kartu selalu terbaca lembek/miring (kelengkungan tersebar di
  //     seluruh turunan) atau patah (kelengkungan menumpuk di atas) — sudut
  //     bulat + vertikal mati menang di uji visual /tmp/rope-variants.png.
  //     Sudutnya BOLEH mulai di kiri diveX (di ketinggian startY tali masih
  //     di atas zona teks) asal saat turun ke level heading sudah melewati
  //     diveX — dicek probeX di kedalaman 70px (≈ puncak heading: gap 70
  //     dikurangi setengah goresan).
  //
  // (b) LOOP LEBAR — layar sempit, pusat kartu terlalu ke kiri: uji (a)
  //     gagal (sudut akan menimpa heading/eyebrow). Tali berbelok turun
  //     VERTIKAL dulu di kanan teks heading (bx) sampai melewati dasarnya
  //     (textClearY), baru menyapu diagonal ke pusat kartu. Kurva S tunggal
  //     glide→kartu TIDAK cukup: sapuan kirinya dimulai di atas garis teks
  //     dan goresan menyilang "How We Work" (audit mobile 390px, 28 Agu).
  const first = cards[0];
  const dy0 = first.top - startY;
  const rx = Math.min(140, dy0 * 0.45);
  const ry = Math.min(140, dy0 * 0.5);
  const cornerX = first.cx - rx;
  const probeDepth = Math.min(ry, 70);
  const cosT = 1 - probeDepth / ry;
  const probeX = cornerX + rx * Math.sqrt(Math.max(0, 1 - cosT * cosT));
  // cornerX ≥ 130 menjaga lengkung turun tidak menggantung di atas eyebrow.
  const useCorner = cornerX >= 130 && probeX >= diveX - 12;

  // Masuk horizontal dari luar tepi KIRI, mendarat di startY di atas
  // heading (koordinat negatif, di atas wrapper; svg overflow-visible +
  // section hanya meng-clip sumbu x). Glide melorot MONOTON 8px: sag lama
  // (kontrol +16 lalu balik naik ke startY) membuat garis memuncak persis
  // sebelum belokan turun — terbaca patahan di samping heading. Tangen
  // kedua ujung horizontal supaya masuk layar & sambungan turunan mulus.
  const glideEnd = useCorner ? cornerX : diveX;
  move([-64, startY - 8]);
  curve(
    [-64 + (glideEnd + 64) * 0.4, startY - 8],
    [glideEnd - (glideEnd + 64) * 0.15, startY],
    [glideEnd, startY],
  );

  /** Kubik peniru busur lingkaran (kappa). */
  const K = 0.5523;

  cards.forEach((card, i) => {
    // Kelokan menuju tengah tepi atas slot kartu (tangen akhir vertikal —
    // tali "menusuk" masuk lurus segaris pusat kartu).
    const to: [number, number] = [card.cx, card.top];
    if (i === 0) {
      if (useCorner) {
        curve(
          [cur[0] + K * rx, startY],
          [to[0], startY + (1 - K) * ry],
          [to[0], startY + ry],
        );
        line(to);
      } else {
        // Turun tegak di bx (kanan heading, clamp tepi layar), tembus
        // textClearY, lalu S bertangen vertikal ke pusat kartu. Sudutnya
        // dibuat ≈ lingkaran (ry2 = lebar belokan): ellipse jangkung
        // (ry2 sampai 120 dengan rx cuma 56) turunannya terbaca diagonal
        // yang lalu berbalik kiri di S — "patahan" di samping heading
        // (keluhan Keano 28 Agu); lingkaran menyelesaikan belokan cepat
        // lalu lurus vertikal di sisi teks.
        const bx = Math.min(diveX + 56, w - 34);
        const ry2 = Math.min(bx - cur[0], (to[1] - startY) * 0.4);
        const clearY = Math.min(
          Math.max(textClearY, startY + ry2),
          to[1] - 60,
        );
        curve(
          [cur[0] + K * (bx - cur[0]), startY],
          [bx, startY + (1 - K) * ry2],
          [bx, startY + ry2],
        );
        if (clearY > startY + ry2) line([bx, clearY]);
        const dy = to[1] - cur[1];
        curve([cur[0], cur[1] + dy * 0.45], [to[0], to[1] - dy * 0.45], to);
      }
    } else {
      const k = (to[1] - cur[1]) * 0.45;
      curve([cur[0], cur[1] + k], [to[0], to[1] - k], to);
    }

    // Ambang di SINI — ujung tali baru tiba di tengah tepi atas slot: kartu
    // langsung menggembung dari garis lintasan (perut ular menelan kotak)
    // sementara tali lanjut menembus pusat slot ke tengah tepi bawah di
    // balik kartu; garis tengah vertikalnya tak pernah terlihat telanjang.
    atCardDone.push(total);
    line([card.cx, card.bottom]);
  });

  // Ekor: turun ke tengah dan menembus tepi bawah wrapper (= tepi atas strip
  // Industries; overshoot 2px menutup celah pembulatan sub-pixel).
  const end: [number, number] = [w / 2, h + 2];
  const k = Math.max(60, (end[1] - cur[1]) * 0.5);
  curve([cur[0], cur[1] + k], [end[0], end[1] - k], end);

  // Fraksi scroll saat PUNCAK slot kartu ke-i tiba di garis TRIGGER_VH.
  // Jarak scroll total D turunan offset useScroll di bawah; dijepit + dijaga
  // naik-ketat supaya valid sebagai titik patah useTransform.
  const D = h + (START_VH - END_VH) * vh;
  let prev = 0;
  const stops = cards.map((card) => {
    let s = (card.top + (START_VH - TRIGGER_VH) * vh) / D;
    s = Math.min(Math.max(s, prev + 0.001), 0.999);
    prev = s;
    return s;
  });

  return {
    w,
    h,
    d,
    thresholds: atCardDone.map((len) => len / total),
    stops,
  };
}

function ProcessCard({
  step,
  num,
  play,
  reduced,
  setRef,
  side,
}: {
  step: ProcessStepContent;
  /** "01"–"06", diturunkan dari posisi baris oleh pemanggil — bukan kolom
   *  tersimpan. Lihat `shared/processStep.ts`. */
  num: string;
  play: boolean;
  reduced: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  side: "start" | "end";
}) {
  /* Gambar dicari lewat NAMA yang dibawa langkahnya, bukan lewat posisinya di
     larik seperti sebelum CMS (`PROCESS_GLYPHS[i]`). Bedanya baru terasa saat
     editor memindahkan atau menghapus satu langkah: dengan posisi sebagai
     kunci, "Design" naik satu baris dan tiba-tiba bergambar radar tanpa satu
     pun galat. */
  const Glyph = PROCESS_GLYPHS_BY_KEY[step.glyph];

  return (
    <div
      className={`flex min-h-[55svh] items-center px-1 sm:px-[6%] lg:px-[12%] ${
        side === "start" ? "justify-start" : "justify-end"
      }`}
    >
      {/* Div terukur dibiarkan polos (tanpa transform/clip) — animasi hidup
          di anak motion.div supaya offsetTop/offsetLeft tetap jujur. Kartu =
          perut ular: mulai sebagai bilah putih selebar goresan tepat di
          garis lintasan tali yang menembus pusat slot (warna identik, jadi
          terbaca satu benda), lalu clip-path menggembung simetris ke
          kiri-kanan sampai lebar penuh; isi menyusul belakangan. Inset kiri
          + kanan pakai persen (~(lebar − STROKE)/2) karena motion tak bisa
          menginterpolasi calc(); selisih ±1px dari 12px tertutup goresan
          tali di belakangnya. */}
      {/* Mobile sengaja lebih ramping (68vw) supaya pusat kartu ganjil/genap
          benar-benar berseberangan dan kelokan tali terbaca zig-zag; ≥sm
          kembali ke cap 20rem. */}
      <div ref={setRef} className="w-[min(20rem,68vw)]">
        <motion.div
          className="rounded-2xl bg-[#fafafa]"
          initial={false}
          animate={
            play
              ? { opacity: 1, clipPath: "inset(0% 0% 0% 0% round 16px)" }
              : {
                  opacity: 0,
                  clipPath: reduced
                    ? "inset(0% 0% 0% 0% round 16px)"
                    : "inset(0% 48.1% 0% 48.1% round 16px)",
                }
          }
          transition={{
            clipPath: { duration: 0.8, ease: EASE },
            opacity: { duration: 0.15 },
          }}
        >
          <motion.div
            className="relative px-5 py-7 sm:px-8 sm:py-10"
            initial={false}
            animate={{ opacity: play ? 1 : 0 }}
            transition={{ duration: 0.35, delay: play ? 0.45 : 0 }}
          >
            <span className="absolute top-4 left-5 text-xs tabular-nums text-zinc-400">
              {num}
            </span>
            <div className="mx-auto h-20 w-20 text-zinc-900 sm:h-28 sm:w-28">
              <Glyph play={play} reduced={reduced} />
            </div>
            <div className="mt-6 text-center">
              <span className="text-xs tracking-widest text-orange-600 uppercase">
                {step.kicker}
              </span>
              <h3 className="mt-2 text-lg font-medium text-zinc-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{step.desc}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Nol langkah = seksinya tidak ada sama sekali — judul, tali, dan landasan
 * ekornya sekalian. Merender judul "How We Work" di atas ruang kosong
 * sepanjang setengah layar jauh lebih buruk daripada tidak merender apa pun.
 *
 * AMAN untuk jarak mobile, dan itu diperiksa sebelum diputuskan: seksi ini
 * `pt-0 sm:pt-32` TANPA `pb` sama sekali, jadi ia tidak menjatah celah apa
 * pun. Celah 80px ke tetangga bawahnya (Industries) dijatah `pb-20` milik
 * Deployments di atasnya, dan itu tetap berlaku persis sama saat seksi ini
 * hilang. Bandingkan dengan seksi Visi, yang justru WAJIB selalu render karena
 * celahnya cuma dijatah dari satu tempat.
 *
 * Gerbangnya ditaruh di komponen LUAR, bukan sebagai `return null` di tengah
 * `ProcessSection`, dan itu bukan selera: hook `useScroll` di dalam sana
 * memegang `wrapRef` sebagai target. Kalau komponennya dipanggil lalu keluar
 * sebelum merender, ref itu tidak pernah menempel dan motion melempar
 * "Target ref is defined but not hydrated" satu frame kemudian — galat yang
 * jatuhnya di luar render, jadi tidak ketahuan sampai halamannya dibuka.
 * Dengan pemisahan ini, tak satu pun hook seksi itu ikut berjalan saat
 * daftarnya kosong.
 */
export default function Process() {
  /* ⚠️ DI DALAM komponen, bukan di ruang modul — `content.json` baru mendarat
     sesudah `loadContent()` di `main.tsx`, jadi `const STEPS = processSteps()`
     di kepala berkas akan membekukan isi cadangan selamanya tanpa satu pun
     galat. `[]` aman: isinya tidak berubah lagi setelah muat pertama. */
  const steps = useMemo(() => processSteps(), []);

  if (steps.length === 0) return null;
  return <ProcessSection steps={steps} />;
}

function ProcessSection({ steps }: { steps: ProcessStepContent[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geom, setGeom] = useState<RopeGeom | null>(null);
  const [lit, setLit] = useState(0);
  const reduced = !!useReducedMotion();

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const cards: CardBox[] = [];
      for (const el of cardRefs.current) {
        if (!el) continue;
        cards.push({
          cx: el.offsetLeft + el.offsetWidth / 2,
          top: el.offsetTop,
          bottom: el.offsetTop + el.offsetHeight,
        });
      }
      // Titik start tali: celah VISUAL 70px antara sisi bawah goresan dan
      // puncak heading (label eyebrow dihapus 28 Agu), dalam koordinat
      // wrapper (negatif — heading ada di atas wrapper). Path digambar dari
      // garis tengahnya, jadi offset = 70 + STROKE/2 (tepi bawah goresan);
      // glide kini melorot monoton, titik terendahnya = startY sendiri.
      // Kotak h2 blok bebas transform LineMask, jadi top dari
      // getBoundingClientRect aman (beda dengan kartu yang wajib offsetTop).
      const wrapRect = wrap.getBoundingClientRect();
      const h2 = headingRef.current;
      const startY = h2
        ? h2.getBoundingClientRect().top - wrapRect.top - (70 + STROKE / 2)
        : (cards[0]?.top ?? 280) - 280;
      // Batas tukik: tepi kanan TEKS heading (h2 block selebar kontainer,
      // jadi ukur teksnya via Range; transform y LineMask tak menggeser
      // right) + margin, dijepit agar tetap di dalam layar.
      let diveX = wrap.clientWidth * 0.5;
      const range = document.createRange();
      // jsdom (vitest) tidak punya Range.getBoundingClientRect — fallback
      // 0.5×lebar di atas sudah cukup untuk lingkungan test.
      if (h2 && typeof range.getBoundingClientRect === "function") {
        // Span pembungkus LineMask berdisplay BLOCK: selectNodeContents(h2)
        // mengembalikan kotak selebar max-w-xl, bukan lebar teks. Ukur TEXT
        // NODE terdalam supaya dapat tepi kanan glyph teks sungguhan.
        const walker = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT);
        const textNode = walker.nextNode();
        if (textNode) {
          range.selectNodeContents(textNode);
          diveX = range.getBoundingClientRect().right - wrapRect.left + 48;
        }
      }
      diveX = Math.min(Math.max(diveX, 48), wrap.clientWidth - 40);
      // Dasar teks heading (kotak h2 blok — TANPA transform LineMask, jadi
      // stabil sejak sebelum animasi) + 10px: di atas garis ini tali cabang
      // loop wajib tetap di kanan diveX supaya tidak menyilang teks.
      const textClearY = h2
        ? h2.getBoundingClientRect().bottom - wrapRect.top + 10
        : 0;
      setGeom(
        buildRope(
          wrap.clientWidth,
          wrap.clientHeight,
          window.innerHeight,
          startY,
          diveX,
          textClearY,
          cards,
        ),
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);
    // stops bergantung innerHeight; tinggi wrapper pakai svh jadi ResizeObserver
    // tidak selalu ikut terpicu saat vh berubah (URL bar mobile).
    window.addEventListener("resize", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 0 saat puncak area tali di START_VH; 1 saat dasarnya (= tepi atas
  // Industries) naik ke END_VH — ujung tali selesai memutih persis ketika
  // perbatasan kedua section masih terlihat di tengah layar.
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: [`start ${START_VH}`, `end ${END_VH}`],
  });

  // Remap piecewise scroll→panjang busur (lihat catatan RopeGeom.stops):
  // di titik patah stops[i] ujung tali tepat menyelesaikan slot kartu ke-i,
  // di antaranya interpolasi linear — ujung tali mengikuti posisi pandang.
  const pathProgress = useTransform(
    scrollYProgress,
    geom ? [0, ...geom.stops, 1] : [0, 1],
    geom ? [0, ...geom.thresholds, 1] : [0, 1],
  );

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!geom) return;
    let n = 0;
    while (n < geom.stops.length && v >= geom.stops[n]) n++;
    setLit(n);
  });

  return (
    <section
      id="process"
      /* pt mobile 0: celah 80px ke Deployments dijatah di pb-20 sana (aturan
         28 Agu, lihat PeopleIntro.tsx); ≥sm kembali pt-32. Tetap tanpa pb —
         plank Industries memang menempel. */
      className="section-shell overflow-x-clip px-3 pt-0 sm:pt-32"
    >
      {/* T1 — line-mask heading (label eyebrow dihapus 28 Agu); ref = patokan
          titik start tali (70px di atasnya) + ukur tepi kanan teks utk batas
          tukik tali */}
      <h2
        ref={headingRef}
        className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl"
      >
        <LineMask>How We Work</LineMask>
      </h2>

      <div ref={wrapRef} className="relative mt-10 sm:mt-16">
        {geom && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <motion.path
              d={geom.d}
              stroke={ROPE_COLOR}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              style={{ pathLength: reduced ? 1 : pathProgress }}
            />
          </svg>
        )}

        {steps.map((step, i) => (
          <ProcessCard
            /* Berkunci JUDUL, bukan indeks: judul unik antar langkah hidup
               (dijaga `process_steps_title_alive`), dan indeks sebagai key
               membuat React memakai ulang kartu yang salah saat urutannya
               berubah — kartu yang sudah menggembung tetap menggembung
               sementara isinya berganti. */
            key={step.title}
            step={step}
            num={String(i + 1).padStart(2, "0")}
            play={lit > i}
            reduced={reduced}
            setRef={(el) => {
              cardRefs.current[i] = el;
            }}
            side={i % 2 === 0 ? "start" : "end"}
          />
        ))}

        {/* Landasan ekor: ruang kosong tempat tali turun sendirian sebelum
            menyentuh strip Industries yang sewarna. */}
        <div className="h-[45svh]" aria-hidden="true" />
      </div>
    </section>
  );
}

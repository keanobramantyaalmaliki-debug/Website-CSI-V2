"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { PROCESS_GLYPHS } from "@/components/motion/ProcessGlyphs";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEPS: { num: string; kicker: string; title: string; desc: string }[] = [
  {
    num: "01",
    kicker: "UNDERSTAND",
    title: "Discovery",
    desc: "We map your current workflows, pain points, and goals before writing a line of code.",
  },
  {
    num: "02",
    kicker: "PLAN",
    title: "Strategy & Planning",
    desc: "Scope, architecture, and timeline locked in, so the build has a clear target.",
  },
  {
    num: "03",
    kicker: "SHAPE",
    title: "Design",
    desc: "Interfaces and flows prototyped and tested with real users before development starts.",
  },
  {
    num: "04",
    kicker: "BUILD",
    title: "Development",
    desc: "Engineers build in short, reviewable cycles. Nothing lands without a second pair of eyes.",
  },
  {
    num: "05",
    kicker: "VERIFY",
    title: "Testing & QA",
    desc: "Automated and manual checks against real-world edge cases, not just the happy path.",
  },
  {
    num: "06",
    kicker: "LAUNCH",
    title: "Deployment & Support",
    desc: "Shipped with monitoring in place, and a team that stays on for what comes after launch.",
  },
];

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
  //     diveX — dicek probeX di kedalaman 100px (≈ puncak heading; gap
  //     eyebrow 70px + tinggi eyebrow ada di atasnya).
  //
  // (b) LOOP LEBAR — layar sempit, pusat kartu terlalu ke kiri: uji (a)
  //     gagal (sudut akan menimpa heading/eyebrow). Tali terus ke kanan
  //     MELEWATI pusat kartu lalu memutar balik diagonal dan menegak tepat
  //     di pusat — jangan menarik c1 balik ke arah kartu: arah berbalik
  //     180° dan tali terlihat melipat patah di ujung glide.
  const first = cards[0];
  const dy0 = first.top - startY;
  const rx = Math.min(140, dy0 * 0.45);
  const ry = Math.min(140, dy0 * 0.5);
  const cornerX = first.cx - rx;
  const probeDepth = Math.min(ry, 100);
  const cosT = 1 - probeDepth / ry;
  const probeX = cornerX + rx * Math.sqrt(Math.max(0, 1 - cosT * cosT));
  // cornerX ≥ 130 menjaga lengkung turun tidak menggantung di atas eyebrow.
  const useCorner = cornerX >= 130 && probeX >= diveX - 12;

  // Masuk horizontal dari luar tepi KIRI, setinggi startY (30px di atas
  // label eyebrow "Our Process" — koordinat negatif, di atas wrapper; svg
  // overflow-visible + section hanya meng-clip sumbu x). Glide dengan sag
  // halus di atas label + heading; tangen ujungnya horizontal supaya
  // sambungan ke turunan mulus tanpa tekukan.
  const glideEnd = useCorner ? cornerX : diveX;
  move([-64, startY]);
  curve(
    [-64 + (glideEnd + 64) * 0.4, startY + 16],
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
        const dy = to[1] - cur[1];
        curve(
          [cur[0] + Math.min(160, dy * 0.3), cur[1]],
          [to[0], to[1] - dy * 0.45],
          to,
        );
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
  Glyph,
  play,
  reduced,
  setRef,
  side,
}: {
  step: (typeof STEPS)[number];
  Glyph: (typeof PROCESS_GLYPHS)[number];
  play: boolean;
  reduced: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  side: "start" | "end";
}) {
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
              {step.num}
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

export default function Process() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
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
      // puncak label eyebrow, dalam koordinat wrapper (negatif — label ada
      // di atas wrapper). Path digambar dari garis tengahnya, jadi offset =
      // 70 + STROKE/2 (tepi bawah goresan) + 7.5 (titik terendah sag glide,
      // yang jatuh persis di atas label — terukur via probe-rope-gap).
      // Label cuma beranimasi x + opacity, jadi top dari
      // getBoundingClientRect aman (beda dengan kartu yang wajib offsetTop).
      const wrapRect = wrap.getBoundingClientRect();
      const eyebrow = eyebrowRef.current;
      const startY = eyebrow
        ? eyebrow.getBoundingClientRect().top -
          wrapRect.top -
          (70 + STROKE / 2 + 7.5)
        : (cards[0]?.top ?? 280) - 280;
      // Batas tukik: tepi kanan TEKS heading (h2 block selebar kontainer,
      // jadi ukur teksnya via Range; transform y LineMask tak menggeser
      // right) + margin, dijepit agar tetap di dalam layar.
      let diveX = wrap.clientWidth * 0.5;
      const h2 = headingRef.current;
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
      setGeom(
        buildRope(
          wrap.clientWidth,
          wrap.clientHeight,
          window.innerHeight,
          startY,
          diveX,
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
    <section id="process" className="section-shell overflow-x-clip px-3 pt-24 sm:pt-32">
      {/* T6 — eyebrow; ref = patokan titik start tali (30px di atasnya) */}
      <motion.p
        ref={eyebrowRef}
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Process
      </motion.p>

      {/* T1 — line-mask heading; ref = ukur tepi kanan teks utk batas tukik tali */}
      <h2
        ref={headingRef}
        className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl"
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

        {STEPS.map((step, i) => (
          <ProcessCard
            key={step.num}
            step={step}
            Glyph={PROCESS_GLYPHS[i]}
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

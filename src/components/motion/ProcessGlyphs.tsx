/**
 * Original line-art glyphs, one per Process step. Abstract rather than
 * photographic, deliberately distinct from Deployments (which keeps photos
 * as real-world proof). Sampai 18 Agu 2026 bahasa visual ini dipakai berdua
 * dengan NodeGlyphs di LivingArchitecture; section itu sudah dicabut, jadi
 * Process kini satu-satunya pemakainya (glyphMotion.ts tetap dibagi).
 *
 * Each glyph is a controlled entry-reveal: the parent decides `play` (scroll
 * into view once on mobile, active sticky-panel step on desktop) and the
 * glyph traces itself in via the shared vocabulary in glyphMotion.ts. When
 * `play` goes false the glyph resets to hidden, so re-activating a step
 * replays the reveal instead of only firing once per mount.
 */

import type { ReactElement } from "react";
import { motion } from "motion/react";
import type { ProcessGlyphKey } from "@/data/processStepsFallback";
import { makeContainer, makeDraw, makePop, makeFade, makeGrowX } from "./glyphMotion";

type GlyphProps = { play: boolean; reduced: boolean; className?: string };

const BASE = "h-full w-full";

const POP_STYLE = { transformBox: "fill-box", transformOrigin: "center" } as const;
const GROW_STYLE = { transformBox: "fill-box", transformOrigin: "left center" } as const;

export function DiscoveryGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.circle cx="100" cy="100" r="60" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 6" variants={makeDraw(reduced)} />
      <motion.circle cx="100" cy="100" r="34" stroke="currentColor" strokeOpacity="0.85" strokeWidth="2" strokeDasharray="2 5" variants={makeDraw(reduced)} />
      <motion.path d="M100 40 A60 60 0 0 1 152 70" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" variants={makeDraw(reduced)} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="152" cy="70" r="5" fill="#f97316" />
        <circle cx="152" cy="70" r="9" stroke="#f97316" strokeWidth="2" strokeOpacity="0.6" />
      </motion.g>
      <motion.circle cx="57.6" cy="142.4" r="2.5" fill="currentColor" variants={makeFade(reduced, 0.9)} />
      <motion.circle cx="137.5" cy="146.9" r="2.5" fill="currentColor" variants={makeFade(reduced, 0.7)} />
      <motion.circle cx="44.3" cy="77.7" r="2.5" fill="currentColor" variants={makeFade(reduced, 0.8)} />
    </motion.svg>
  );
}

export function StrategyGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.path
        d="M40 150 L80 110 L110 135 L150 60"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="2"
        strokeDasharray="3 5"
        variants={makeDraw(reduced)}
      />
      <motion.path d="M110 135 L150 60" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" variants={makeDraw(reduced)} />
      <motion.circle cx="40" cy="150" r="4" fill="currentColor" variants={makePop(reduced, 0.9)} style={POP_STYLE} />
      <motion.circle cx="80" cy="110" r="4" fill="currentColor" variants={makePop(reduced, 0.9)} style={POP_STYLE} />
      <motion.circle cx="110" cy="135" r="4" fill="currentColor" variants={makePop(reduced, 0.9)} style={POP_STYLE} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="150" cy="60" r="6" fill="#f97316" />
        <circle cx="150" cy="60" r="11" stroke="#f97316" strokeWidth="2" strokeOpacity="0.5" />
      </motion.g>
    </motion.svg>
  );
}

export function DesignGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.rect x="55" y="65" width="70" height="70" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" variants={makeDraw(reduced)} />
      <motion.rect x="75" y="85" width="70" height="70" stroke="#f97316" strokeWidth="2.5" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.path
        d="M55 65 L75 85 M125 65 L145 85 M55 135 L75 155 M125 135 L145 155"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        variants={makeDraw(reduced)}
      />
      <motion.circle cx="75" cy="85" r="3.5" fill="#f97316" variants={makePop(reduced)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function DevelopmentGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.rect x="50" y="55" width="100" height="90" rx="4" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" variants={makeDraw(reduced)} />
      <motion.line x1="62" y1="75" x2="112" y2="75" stroke="currentColor" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="90" x2="138" y2="90" stroke="currentColor" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="105" x2="95" y2="105" stroke="#f97316" strokeWidth="3" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="120" x2="126" y2="120" stroke="currentColor" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
    </motion.svg>
  );
}

export function TestingGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.05)}
    >
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <motion.rect
            key={`${row}-${col}`}
            x={62 + col * 30}
            y={62 + row * 30}
            width="22"
            height="22"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            variants={makePop(reduced)}
            style={POP_STYLE}
          />
        )),
      )}
      <motion.path d="M67 73 L73 79 L83 65" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={makeDraw(reduced)} />
      <motion.path d="M97 103 L103 109 L113 95" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={makeDraw(reduced)} />
    </motion.svg>
  );
}

export function DeploymentGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.circle cx="55" cy="60" r="5" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.circle cx="55" cy="140" r="5" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.circle cx="90" cy="100" r="5" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.path d="M60 62 L142 98 M60 138 L142 102" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" variants={makeDraw(reduced)} />
      <motion.path d="M95 100 L142 100" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" variants={makeDraw(reduced)} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="148" cy="100" r="7" fill="#f97316" />
        <circle cx="148" cy="100" r="13" stroke="#f97316" strokeWidth="2" strokeOpacity="0.5" />
      </motion.g>
    </motion.svg>
  );
}

/**
 * Keenamnya sebagai larik, dipakai `ProcessGlyphs.test.tsx` untuk memeriksa
 * semuanya sekaligus tanpa menyebut satu per satu.
 *
 * ⚠️ INI BUKAN LAGI CARA MEMILIH GAMBAR. Sampai 2 Sep 2026 `Process.tsx`
 * mengambil `PROCESS_GLYPHS[i]` — gambar dipasangkan menurut POSISI kartu.
 * Begitu langkahnya bisa dihapus dan diurutkan dari panel CMS, pasangan itu
 * bergeser diam-diam: "Design" naik satu baris dan tiba-tiba bergambar radar,
 * tanpa seorang pun mengubah gambar apa pun dan tanpa satu pun galat. Yang
 * dipakai sekarang `PROCESS_GLYPHS_BY_KEY` di bawah, dan kuncinya disimpan di
 * kolom `glyph` milik langkahnya.
 */
export const PROCESS_GLYPHS = [
  DiscoveryGlyph,
  StrategyGlyph,
  DesignGlyph,
  DevelopmentGlyph,
  TestingGlyph,
  DeploymentGlyph,
];

/**
 * Peta kunci → komponen, satu-satunya jalan sah dari data ke gambar.
 *
 * `Record<ProcessGlyphKey, ...>` dan bukan objek biasa: begitu ada kunci
 * ketujuh ditambahkan di `shared/processStep.ts` (dan enum Postgres-nya),
 * TypeScript menolak berkas ini sampai gambarnya benar-benar dibuat — jadi
 * mustahil ada nilai tersimpan yang tidak punya gambar.
 *
 * Tipenya diambil dari `@/data/processStepsFallback`, bukan dari `shared/`,
 * dengan sengaja: berkas itu literal murni tanpa satu pun impor, jadi
 * mengambilnya dari sana tidak menarik apa pun yang lain ikut ke bundle.
 */
export const PROCESS_GLYPHS_BY_KEY: Record<
  ProcessGlyphKey,
  (props: GlyphProps) => ReactElement
> = {
  discovery: DiscoveryGlyph,
  strategy: StrategyGlyph,
  design: DesignGlyph,
  development: DevelopmentGlyph,
  testing: TestingGlyph,
  deployment: DeploymentGlyph,
};

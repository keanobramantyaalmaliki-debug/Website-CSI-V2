"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { scrollToSection } from "@/lib/smoothScroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type CareerRole = {
  title: string;
  /** "Full-time · Remote · Growth" — satu string utuh seperti di V1. */
  meta: string;
  overview: string;
  skills: string[];
  /** Foto preview yang mengikuti kursor (desktop) / tampil di body (touch). */
  photo: string;
};

/**
 * Roles list gaya V1 (Website-CSI index.html §careers): baris bernomor dengan
 * judul besar, preview foto yang membuka dari tengah dan MENGIKUTI kursor,
 * dan accordion satu-terbuka untuk detail role.
 *
 * Port dari vanilla JS → React dengan tiga penyesuaian sadar:
 *   • Toggle hanya di header (V1: seluruh item clickable, termasuk body yang
 *     sedang terbuka) — header jadi <button aria-expanded>, lebih ramah
 *     keyboard dan tidak ada interactive-dalam-interactive.
 *   • Tinggi body dianimasikan lewat grid-template-rows 0fr→1fr, bukan ukur
 *     scrollHeight manual.
 *   • Tirai reveal preview (dua panel ::before/::after warna latar) diganti
 *     clip-path inset 50%→0 — efek buka-dari-tengah sama, tanpa harus
 *     menyamakan warna panel dengan latar halaman.
 */
export default function CareersRoles({ roles }: { roles: CareerRole[] }) {
  const [active, setActive] = useState<number | null>(null);
  const hasActive = active !== null;

  return (
    // Jarak dari headline diatur pembungkusnya di Careers.tsx (split 35/65).
    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
      {roles.map((role, i) => (
        <RoleItem
          key={role.title}
          role={role}
          index={i}
          active={active === i}
          dimmed={hasActive && active !== i}
          hasActive={hasActive}
          onToggle={() => setActive((cur) => (cur === i ? null : i))}
        />
      ))}
    </div>
  );
}

function RoleItem({
  role,
  index,
  active,
  dimmed,
  hasActive,
  onToggle,
}: {
  role: CareerRole;
  index: number;
  active: boolean;
  dimmed: boolean;
  hasActive: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  const headerRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLSpanElement>(null);

  // Posisi preview digerakkan imperatif per-frame (lerp ke kursor) supaya
  // mousemove tidak memicu render React. Hanya visibilitasnya yang state.
  //
  // Digerakkan lewat TRANSFORM, bukan style.left seperti V1: `left` pada
  // elemen absolut menginvalidasi layout dokumen tiap frame, dan halaman ini
  // jauh lebih berat dari V1. Transform jalan di compositor saja.
  const targetX = useRef(0);
  const currentX = useRef(0);
  // rect.left header di-cache saat mouseenter — scroll vertikal tidak
  // mengubahnya, jadi tidak perlu getBoundingClientRect per-mousemove
  // (bacaan itu memaksa reflow di tengah frame).
  const headerLeft = useRef(0);
  const hovering = useRef(false);
  const rafId = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `mounted` = container terlihat (opacity, tanpa transisi);
  // `reveal`  = clip-path terbuka (transisi buka-dari-tengah).
  const [mounted, setMounted] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafId.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const place = () => {
    if (previewRef.current)
      // -100px = setengah lebar preview (200px), pengganti -translate-x-1/2
      // yang slotnya sudah dipakai untuk mengikuti kursor.
      previewRef.current.style.transform = `translate3d(${currentX.current - 100}px, 0, 0)`;
  };

  const tick = () => {
    currentX.current += (targetX.current - currentX.current) * 0.1;
    place();
    if (hovering.current) rafId.current = requestAnimationFrame(tick);
  };

  const show = (clientX: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    headerLeft.current = rect.left;
    // Lompat langsung ke posisi kursor saat masuk — lerp hanya untuk gerakan
    // setelahnya, bukan meluncur dari posisi hover sebelumnya.
    currentX.current = clientX - rect.left;
    targetX.current = currentX.current;
    place();
    hovering.current = true;
    setMounted(true);
    requestAnimationFrame(() => setReveal(true));
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(tick);
  };

  const hide = () => {
    hovering.current = false;
    cancelAnimationFrame(rafId.current);
    setReveal(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Tunggu tirai clip-path menutup dulu (0.26s) baru container disembunyikan.
    hideTimer.current = setTimeout(() => {
      if (!hovering.current) setMounted(false);
    }, 280);
  };

  const bodyId = `career-role-body-${index}`;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.05 + index * 0.07 }}
    >
      <div
        className={
          "transition-opacity duration-[350ms] " +
          (dimmed ? "opacity-20" : "opacity-100")
        }
      >
        <button
          ref={headerRef}
          type="button"
          onClick={() => {
            hide();
            onToggle();
          }}
          aria-expanded={active}
          aria-controls={bodyId}
          onMouseEnter={
            coarse
              ? undefined
              : (e) => {
                  if (active || hasActive) return;
                  show(e.clientX);
                }
          }
          onMouseMove={
            coarse
              ? undefined
              : (e) => {
                  if (!hovering.current) return;
                  targetX.current = e.clientX - headerLeft.current;
                }
          }
          onMouseLeave={coarse ? undefined : hide}
          className={
            "group relative flex w-full flex-wrap items-start gap-y-2 overflow-hidden px-[clamp(10px,1.4vw,26px)] py-2.5 text-left transition-[padding] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none sm:flex-nowrap sm:items-baseline sm:py-3 " +
            // Expand-saat-HOVER: baris meninggi supaya preview foto (inset-y-0,
            // ikut tinggi baris) terlihat jelas. Terpisah dari accordion klik —
            // yang itu tidak disentuh. Hanya di pointer halus, dan tidak saat
            // ada accordion terbuka (preview memang tidak muncul saat itu).
            //
            // HANYA padding-BOTTOM yang membesar (+ items-baseline, bukan
            // center): judul tidak bergerak vertikal selama expand, jadi
            // satu-satunya gerakan teks adalah translateX di compositor —
            // ini kunci hover yang smooth. (Ekspansi py simetris + center
            // bikin judul turun mengikuti animasi layout = patah-patah.)
            // pb-16 ≈ total ~105px, setara baris desain lama, jangan lebih.
            (!coarse && !active && !hasActive ? "sm:hover:pb-16" : "")
          }
        >
          {/* wash gradient tipis saat hover, ala V1 */}
          <span
            aria-hidden
            className={
              "pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.025] to-transparent to-55% transition-opacity duration-300 " +
              (active ? "opacity-0" : "opacity-0 group-hover:opacity-100")
            }
          />

          {/* will-change PERSISTEN: tanpanya teks dipromosikan jadi layer saat
              transform mulai lalu dilepas di akhir — dua "snap" rasterisasi
              yang terbaca ngeflick. Hover menerangkan lewat OPACITY (compositor,
              nol repaint), BUKAN animasi color yang me-repaint glyph tiap frame
              dan bikin gesernya keruh. */}
          <span
            className={
              // ⚠️ AKAR "flick" yang sebenarnya: Tailwind v4 men-generate
              // `translate-x-3` sebagai properti CSS `translate`, BUKAN
              // `transform`. Transisi harus mencantumkan `translate` —
              // `transition-[...,transform]` tidak menganimasikannya sama
              // sekali, gesernya lompat instan. Jangan ganti ke `transform`.
              "relative z-[1] min-w-0 flex-1 text-[17px] font-bold tracking-[-0.01em] text-zinc-100 transition-[opacity,translate] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[translate,opacity] sm:flex-none sm:text-[clamp(17px,1.4vw,21px)] " +
              (active
                ? "opacity-100"
                : "opacity-60 group-hover:translate-x-3 group-hover:opacity-100")
            }
          >
            {role.title}
          </span>

          <span
            className={
              "relative z-[1] basis-full text-[9.5px] tracking-[0.14em] uppercase transition-colors duration-300 sm:ml-auto sm:basis-auto sm:pr-7 sm:whitespace-nowrap " +
              (active ? "text-zinc-500" : "text-zinc-700 group-hover:text-zinc-500")
            }
          >
            {role.meta}
          </span>

          <span
            aria-hidden
            className={
              "relative z-[3] shrink-0 basis-full text-base transition-[transform,color] duration-[400ms] sm:basis-auto " +
              (active
                ? "rotate-90 text-zinc-500"
                : "text-zinc-700 group-hover:text-zinc-400")
            }
          >
            →
          </span>

          {/* Preview foto pengikut kursor — desktop saja. `transform` ditulis
              imperatif via ref; jangan pindahkan ke prop style. */}
          {!coarse && (
            <span
              ref={previewRef}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[200px] will-change-transform"
              style={{ opacity: mounted ? 1 : 0 }}
            >
              <span
                className="relative block h-full w-full bg-cover bg-center transition-[clip-path]"
                style={{
                  backgroundImage: `url("${role.photo}")`,
                  backgroundColor: "#161616",
                  clipPath: reveal ? "inset(0 0 0 0)" : "inset(0 50% 0 50%)",
                  transitionDuration: reveal ? "0.38s" : "0.26s",
                  transitionTimingFunction: reveal
                    ? "cubic-bezier(0.16, 1, 0.3, 1)"
                    : "cubic-bezier(0.4, 0, 1, 1)",
                }}
              >
                <span className="absolute inset-0 block bg-black/30" />
              </span>
            </span>
          )}
        </button>

        {/* Accordion body — grid 0fr→1fr menggantikan ukur scrollHeight V1. */}
        <div
          id={bodyId}
          aria-hidden={!active}
          className="grid transition-[grid-template-rows] duration-[550ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ gridTemplateRows: active ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 gap-6 px-[clamp(10px,1.4vw,26px)] pb-12 md:grid-cols-2 md:gap-16 md:pb-14">
              {/* Touch tidak punya hover → foto role tampil di dalam body,
                  meniru fallback .role-photo-mobile V1. */}
              {coarse && (
                <div
                  data-testid="career-role-photo-mobile"
                  className="aspect-[16/9] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${role.photo}")` }}
                />
              )}

              <p className="pt-0.5 text-[13px] leading-[1.75] font-light text-zinc-400 md:text-[15px]">
                {role.overview}
              </p>

              <div className="flex flex-col justify-between gap-7">
                <div>
                  <p className="mb-4 text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    What you bring
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.skills.map((skill) => (
                      <span
                        key={skill}
                        className="border border-zinc-700 px-3 py-[7px] text-[11px] tracking-[0.07em] text-zinc-400 uppercase transition-colors duration-300 hover:border-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex min-h-11 items-center gap-2.5 self-start pt-1 text-[10px] tracking-[0.12em] text-zinc-500 uppercase transition-[color,gap] duration-300 hover:gap-4 hover:text-zinc-100"
                  tabIndex={active ? 0 : -1}
                >
                  Start a conversation →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

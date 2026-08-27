"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { scrollToSection } from "@/lib/smoothScroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type CareerRole = {
  title: string;
  /** Kolom "Type" tabel — departemen saja ("Engineering"). Lokasi sengaja
   *  tidak ditampilkan, jadi jangan gabungkan lagi jadi satu string meta. */
  type: string;
  /** "closed" = baris abu-abu statis: bukan <button>, tanpa hover, tanpa
   *  preview foto, tanpa accordion. Detailnya tidak dirender sama sekali. */
  status: "open" | "closed";
  overview: string;
  skills: string[];
  /** Foto preview yang mengikuti kursor (desktop) / tampil di body (touch). */
  photo: string;
  /**
   * Slug halaman lowongan (`/careers/<slug>`), kalau materinya sudah lengkap —
   * isinya di `data/jobs.ts`.
   *
   * ADA slug  → barisnya jadi <Link> ke halaman itu; accordion TIDAK dirender.
   * TANPA slug → perilaku lama: <button aria-expanded> + accordion di tempat.
   *
   * Dua bentuk itu hidup berdampingan dengan sengaja: tiga lowongan sedang
   * dipindahkan ke halaman sendiri satu per satu, dan yang belum kebagian tetap
   * harus bisa dibaca. Baris `closed` tidak pernah pakai slug — tidak ada yang
   * bisa dilamar di sana.
   */
  slug?: string;
};

/**
 * Satu grid dipakai bersama header tabel, baris open, dan baris closed —
 * kalau ketiganya tidak memakai template yang PERSIS sama, kolom "Type"
 * tidak lurus dengan judul kolomnya. Ubah di satu tempat ini saja.
 *
 * ⚠️ Kolom status WAJIB lebar TETAP, jangan dikembalikan ke `auto`. Tiap
 * baris adalah grid TERPISAH (bukan satu <table>), jadi track `auto`
 * diukur per-baris dari isinya sendiri: header kosong → 0px, "(closed)"
 * → 54px, "(open) →" → 61px. Tiga lebar berbeda menggeser kolom Type ke
 * tiga posisi x berbeda — persis keluhan "Type tidak sejajar" 26 Agu.
 * 5rem = 80px, muat untuk isi terlebar (61px) dengan sisa aman; teks
 * status di-nowrap supaya tidak pernah membungkus di dalamnya.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_5rem] items-baseline gap-x-4 px-[clamp(10px,1.4vw,26px)]";

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
    <div className="divide-y divide-white/[0.08] border-b border-white/[0.08]">
      {/* Header tabel — divide-y pembungkus yang menggarisi bawahnya. */}
      <div className={ROW_GRID + " py-3"} aria-hidden>
        {/* Seukuran judul job (lihat RoleItem / ClosedRoleRow) — kalau
            ukurannya diubah di sana, ubah di sini juga. */}
        <span className="text-[17px] font-bold tracking-[-0.01em] text-zinc-500 sm:text-[clamp(17px,1.4vw,21px)]">
          Role
        </span>
        <span className="text-[17px] font-bold tracking-[-0.01em] text-zinc-500 sm:text-[clamp(17px,1.4vw,21px)]">
          Type
        </span>
        <span />
      </div>

      {roles.map((role, i) =>
        role.status === "closed" ? (
          // Cabang di SINI, bukan early-return di dalam RoleItem: RoleItem
          // memanggil hook (preview pengikut kursor) yang tidak boleh
          // dilewati secara kondisional.
          <ClosedRoleRow
            key={role.title}
            role={role}
            index={i}
            dimmed={hasActive}
          />
        ) : (
          <RoleItem
            key={role.title}
            role={role}
            index={i}
            active={active === i}
            dimmed={hasActive && active !== i}
            hasActive={hasActive}
            onToggle={() => setActive((cur) => (cur === i ? null : i))}
          />
        ),
      )}
    </div>
  );
}

/** Fade-in bertahap per baris; dipakai baris open maupun closed. */
function RowReveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.05 + index * 0.07 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Role yang sudah ditutup: teks abu-abu, MATI total. Bukan <button>, jadi
 * tidak bisa diklik, tidak bisa di-hover, dan tidak bisa di-tab — bukan
 * sekadar tombol yang di-disable. Overview/skills/foto sengaja tidak
 * dirender: tidak ada yang bisa membukanya.
 */
function ClosedRoleRow({
  role,
  index,
  dimmed,
}: {
  role: CareerRole;
  index: number;
  dimmed: boolean;
}) {
  return (
    <RowReveal index={index}>
      <div
        data-testid="career-role-closed"
        className={
          ROW_GRID +
          " w-full py-2.5 text-left cursor-default select-none transition-opacity duration-[350ms] sm:py-3 " +
          (dimmed ? "opacity-20" : "opacity-100")
        }
      >
        <span className="min-w-0 text-[17px] font-bold tracking-[-0.01em] text-zinc-600 sm:text-[clamp(17px,1.4vw,21px)]">
          {role.title}
        </span>
        <span className="min-w-0 text-[9.5px] leading-[1.6] font-bold tracking-[0.14em] text-zinc-700 uppercase">
          {role.type}
        </span>
        <span className="shrink-0 justify-self-end text-[9.5px] font-bold tracking-[0.14em] whitespace-nowrap text-zinc-700 uppercase">
          (closed)
        </span>
      </div>
    </RowReveal>
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
  const coarse = useCoarsePointer();

  // <button> ATAU <a>, tergantung role-nya punya halaman sendiri atau tidak.
  // Yang dipakai cuma getBoundingClientRect(), milik keduanya.
  const headerRef = useRef<HTMLElement>(null);
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

  /*
   * Role yang punya halaman sendiri: barisnya TAUTAN, bukan tombol accordion.
   *
   * <Link>, bukan <button onClick={navigate}> — supaya klik-tengah, Cmd-klik,
   * dan "Salin alamat tautan" bekerja. Tautan lowongan memang untuk dibagikan;
   * itu seluruh alasan halaman ini dibuat.
   */
  const hasPage = Boolean(role.slug);

  /* Kelas & handler dipakai bersama kedua bentuk header — dipisah ke variabel
     supaya tidak ada kemungkinan salah satunya diubah dan yang lain lupa. */
  const headerClass =
    // Mobile = GRID tiga kolom (judul | meta | panah), ala tabel "Open
    // Positions" basement: kolom meta lebarnya sama di semua baris jadi
    // tepi kirinya lurus, dan boleh wrap 2 baris. JANGAN kembalikan ke
    // flex-wrap + basis-full: judul flex-1 (basis 0%) dan meta 100%
    // muat di SATU baris flex (0+100% ≤ 100%) → judul kebagian 0px,
    // teksnya meluap per kata menumpuk dengan meta.
    ROW_GRID +
    " group relative w-full overflow-hidden py-2.5 text-left transition-[padding] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none sm:py-3 " +
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
    (!coarse && !active && !hasActive ? "sm:hover:pb-16" : "");

  const hoverHandlers = coarse
    ? {}
    : {
        onMouseEnter: (e: React.MouseEvent) => {
          if (active || hasActive) return;
          show(e.clientX);
        },
        onMouseMove: (e: React.MouseEvent) => {
          if (!hovering.current) return;
          targetX.current = e.clientX - headerLeft.current;
        },
        onMouseLeave: hide,
      };

  const headerContent = (
    <>
      {/* wash gradient tipis saat hover, ala V1 */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.025] to-transparent to-55% transition-opacity duration-300 " +
          (active ? "opacity-0" : "opacity-0 group-hover:opacity-100")
        }
      />

      {/* Judul role yang OPEN selalu terang penuh saat diam — kontras
          terhadap baris closed (zinc-600) itu inti tabelnya, jadi jangan
          diredupkan lagi jadi opacity-60 seperti desain hover lama.
          Isyarat hover-nya tinggal geser translate-x + wash gradient +
          preview foto, yang sudah cukup.

          will-change PERSISTEN: tanpanya teks dipromosikan jadi layer saat
          transform mulai lalu dilepas di akhir — dua "snap" rasterisasi
          yang terbaca ngeflick. Yang dianimasikan HANYA translate; jangan
          ganti ke animasi color, itu me-repaint glyph tiap frame dan bikin
          gesernya keruh. */}
      <span
        className={
          // ⚠️ AKAR "flick" yang sebenarnya: Tailwind v4 men-generate
          // `translate-x-3` sebagai properti CSS `translate`, BUKAN
          // `transform`. Transisi harus mencantumkan `translate` —
          // `transition-[...,transform]` tidak menganimasikannya sama
          // sekali, gesernya lompat instan. Jangan ganti ke `transform`.
          "relative z-[1] min-w-0 text-[17px] font-bold tracking-[-0.01em] text-zinc-100 transition-[translate] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[translate] sm:text-[clamp(17px,1.4vw,21px)] " +
          (active ? "" : "group-hover:translate-x-3")
        }
      >
        {role.title}
      </span>

      {/* Terang setara judul job — kolom Type-lah yang membedakan role
          open dari yang closed (zinc-700). Jangan diredupkan lagi: dua
          baris yang sama-sama abu-abu bikin status tabelnya tidak terbaca. */}
      <span className="relative z-[1] min-w-0 text-[9.5px] leading-[1.6] font-bold tracking-[0.14em] text-zinc-100 uppercase">
        {role.type}
      </span>

      <span className="relative z-[3] flex shrink-0 items-baseline gap-2 justify-self-end whitespace-nowrap">
        <span className="text-[9.5px] font-bold tracking-[0.14em] text-zinc-100 uppercase">
          (open)
        </span>
        <span
          aria-hidden
          className={
            "text-base transition-[transform,color] duration-[400ms] " +
            (active
              ? "rotate-90 text-zinc-400"
              : "text-zinc-700 group-hover:text-zinc-400")
          }
        >
          →
        </span>
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
    </>
  );

  return (
    <RowReveal index={index}>
      <div
        className={
          "transition-opacity duration-[350ms] " +
          (dimmed ? "opacity-20" : "opacity-100")
        }
      >
        {hasPage ? (
          <Link
            ref={headerRef as React.RefObject<HTMLAnchorElement>}
            to={`/careers/${role.slug}`}
            /* Preview foto disembunyikan SEBELUM pindah halaman: tanpa ini
               mouseleave tidak pernah datang (elemennya ikut unmount bersama
               route), jadi rAF lerp-nya terus berjalan sampai cleanup. */
            onClick={hide}
            className={headerClass}
            {...hoverHandlers}
          >
            {headerContent}
          </Link>
        ) : (
          <button
            ref={headerRef as React.RefObject<HTMLButtonElement>}
            type="button"
            onClick={() => {
              hide();
              onToggle();
            }}
            aria-expanded={active}
            aria-controls={bodyId}
            className={headerClass}
            {...hoverHandlers}
          >
            {headerContent}
          </button>
        )}

        {/* Accordion body — grid 0fr→1fr menggantikan ukur scrollHeight V1.
            Tidak dirender sama sekali untuk role yang punya halaman sendiri:
            isinya sudah pindah ke sana, dan panel kosong yang bisa di-tab
            adalah jebakan aksesibilitas. */}
        {!hasPage && (
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

                {/* 65ch = plafon dalam ala basement (27 Agu): overview berhenti
                    di ukuran baca, tidak ikut kolom grid melebar saat zoom-out.
                    Di ≤1440 lebar kolomnya memang ±65ch — tak ada yang berubah. */}
                <p className="max-w-[65ch] pt-0.5 text-[13px] leading-[1.75] font-light text-zinc-400 md:text-[15px]">
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
        )}
      </div>
    </RowReveal>
  );
}

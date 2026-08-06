"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";
import { DEFAULT_UNPIN_AT, trackHeight } from "@/lib/motion/pin";

/**
 * Section yang menahan isinya di layar selagi halaman terus digulir.
 *
 * ── Apa yang diberikan ke isinya ───────────────────────────────────────────
 * `progress` sudah DINORMALKAN ke rentang tahanannya: 0 saat mulai menahan, 1
 * tepat saat melepas. Jadi isinya cukup memetakan [0, 1] dan gerakannya pasti
 * selesai selagi masih diam di layar — tidak perlu tahu tinggi track-nya, dan
 * tidak ada lagi kesempatan salah menaruh rentang seperti di heroPin.ts.
 *
 * ── Kenapa `pinFrom="md"` ada ──────────────────────────────────────────────
 * Menahan berarti isinya WAJIB muat dalam satu layar: yang meluber ke bawah
 * tidak bisa digulir untuk dilihat, karena justru menggulir itulah yang
 * ditahan. Untuk canvas 3D itu tak jadi soal (Hero), untuk teks sangat jadi
 * soal — tinggi paragraf bergantung lebar layar dan ukuran font, dan di ponsel
 * sempit ia mudah melewati tinggi layar. Karena itu section berisi teks
 * sebaiknya menahan mulai `md:` saja, dan di ponsel mengalir seperti biasa.
 *
 * ── Batas yang tidak boleh dilanggar ───────────────────────────────────────
 * `className` (track) tidak boleh memuat overflow-*: `overflow` apa pun pada
 * LELUHUR elemen sticky menjadikannya scrollport baru, dan sticky lalu
 * mengacu ke situ — yang tidak pernah bergulir. Efeknya pin mati total tanpa
 * error apa pun. Taruh di `stickyClassName`; di sana ia aman.
 */
const CLIPPING = /(^|\s)overflow(-[xy])?-(hidden|clip|auto|scroll)(\s|$)/;

interface Props {
  id?: string;
  /** Kelas untuk track. TIDAK BOLEH memuat overflow-* — lihat catatan di atas. */
  className?: string;
  /** Kelas untuk anak sticky-nya: padding, latar, dan tata letak isinya. */
  stickyClassName?: string;
  /** Tinggi anak sticky sebagai panjang CSS. Tinggi track diturunkan darinya. */
  sticky?: string;
  /** Titik lepas pin, sebagai pecahan panjang track. */
  unpinAt?: number;
  /** `"md"` = mengalir biasa di ponsel, menahan mulai layar lebar. */
  pinFrom?: "always" | "md";
  children: (progress: MotionValue<number>) => ReactNode;
}

export default function PinnedSection({
  id,
  className,
  stickyClassName,
  sticky = "100dvh",
  unpinAt = DEFAULT_UNPIN_AT,
  pinFrom = "always",
  children,
}: Props) {
  // Dipanggil sebelum hook mana pun: kalau salah, komponennya memang tidak
  // boleh terpasang sama sekali, jadi tidak ada urutan hook yang bergeser.
  const track = trackHeight(sticky, unpinAt);
  if (import.meta.env.DEV && CLIPPING.test(className ?? "")) {
    throw new Error(
      `PinnedSection${id ? ` #${id}` : ""}: className track memuat ` +
        `overflow-*, yang mematikan sticky anaknya tanpa error — pin-nya ` +
        `diam-diam tidak jalan. Pindahkan ke stickyClassName.`,
    );
  }

  const trackRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end start"],
  });
  // useTransform menjepit di ujung rentangnya, jadi setelah lepas pin nilainya
  // tetap 1 — isinya berhenti di keadaan akhir, bukan berbalik.
  const pinned = useTransform(scrollYProgress, [0, unpinAt], [0, 1]);
  // Reduced-motion: tidak ada yang ditahan dan tidak ada yang bergerak, jadi
  // isinya diberi keadaan SELESAI — bukan 0, yang akan menyembunyikan apa pun
  // yang muncul seiring progress.
  const settled = useMotionValue(1);

  return (
    <section
      ref={trackRef}
      id={id}
      className={cn(
        "relative w-full",
        !reduced &&
          (pinFrom === "md" ? "md:h-[var(--pin-track)]" : "h-[var(--pin-track)]"),
        className,
      )}
      style={
        reduced
          ? undefined
          : ({ "--pin-track": track, "--pin-sticky": sticky } as CSSProperties)
      }
    >
      <div
        className={cn(
          !reduced &&
            (pinFrom === "md"
              ? "md:sticky md:top-0 md:h-[var(--pin-sticky)]"
              : "sticky top-0 h-[var(--pin-sticky)]"),
          stickyClassName,
        )}
      >
        {children(reduced ? settled : pinned)}
      </div>
    </section>
  );
}

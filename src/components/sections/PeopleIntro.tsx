import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

export default function PeopleIntro() {
  return (
    <section
      id="people-intro"
      /* Section pertama ruangannya (Office sejak tukar konten 19 Agu;
         sebelumnya Function) = yang menempel ke hero 3D, jadi
         padding-atasnya 12px (`pt-3`) di semua lebar — sama dengan gutter
         `px-3` dan sama dengan tiga ruangan lain (aturan padding-tipis, lihat
         CsiHero.tsx). Dulu `pt-6` di HP dan `md:pt-32` (128px) di desktop. */
      className="px-3 pt-3 pb-24"
    >
      <h1 className="text-[clamp(3rem,9vw,6.5rem)] font-semibold tracking-tight text-zinc-100 leading-[1.05]">
        <LineMask>The People Behind CSI.</LineMask>
      </h1>

      <FadeUpList className="mt-16 grid gap-10 max-w-3xl sm:grid-cols-2">
        <FadeUpItem tag="div">
          <p className="text-zinc-400 leading-relaxed">
            We are a collective of strategists, designers, and builders who
            believe the best digital work happens when craft meets conviction.
          </p>
        </FadeUpItem>
        <FadeUpItem tag="div">
          <p className="text-zinc-400 leading-relaxed">
            Every engagement is a genuine partnership. We embed ourselves in
            your world and leave you with something built to last.
          </p>
        </FadeUpItem>
      </FadeUpList>
    </section>
  );
}

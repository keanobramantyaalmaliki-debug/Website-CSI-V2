import type { ReactNode } from "react";
import type { RoomKey } from "@/lib/store/sceneStore";

// ── Section imports ──────────────────────────────────────────────────────────
import CsiHero from "@/components/sections/CsiHero";
import Manifesto from "@/components/sections/Manifesto";
import Deployments from "@/components/sections/Deployments";
import Services from "@/components/sections/Services";
import LivingArchitecture from "@/components/sections/LivingArchitecture";
import Process from "@/components/sections/Process";
import Industries from "@/components/sections/Industries";
import Careers from "@/components/sections/Careers";
import Vision from "@/components/sections/Vision";
import Contact from "@/components/sections/Contact";
import Office from "@/components/sections/Office";

/**
 * Konten yang ditampilkan di bawah hero untuk tiap room.
 *
 * Lounge: susunan section saat ini dipertahankan apa adanya.
 * Office: services deep-dive (Office.tsx) — reorganisasi tematik dari 9-item
 *   accordion Services di Lounge, bukan duplikat.
 * Meeting / Function: masih placeholder — user yang menentukan section mana
 *   masuk room mana dengan memindah entri di sini.
 *
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5):
 * Hero → CsiHero → Manifesto → Deployments → Services → LivingArchitecture
 *      → Process → Industries → Careers → Vision → Contact
 */
export const ROOM_CONTENT: Record<RoomKey, ReactNode> = {
  Lounge: (
    <>
      <CsiHero />
      <Manifesto />
      <Deployments />
      <Services />
      <LivingArchitecture />
      <Process />
      <Industries />
      <Careers />
      <Vision />
      <Contact />
    </>
  ),
  Office: <Office />,
  Meeting: (
    <p className="px-8 py-24 text-center text-zinc-500">
      Konten room ini — atur nanti.
    </p>
  ),
  Function: (
    <p className="px-8 py-24 text-center text-zinc-500">
      Konten room ini — atur nanti.
    </p>
  ),
  // Pantry disabled — tidak diberi route, tidak perlu konten.
  Pantry: null,
};

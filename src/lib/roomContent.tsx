import type { ReactNode } from "react";
import type { RoomKey } from "@/lib/store/sceneStore";

// ── Section imports ──────────────────────────────────────────────────────────
import CsiHero from "@/components/sections/CsiHero";
import Manifesto from "@/components/sections/Manifesto";
import TrustedBy from "@/components/sections/TrustedBy";
import Deployments from "@/components/sections/Deployments";
import LivingArchitecture from "@/components/sections/LivingArchitecture";
import Process from "@/components/sections/Process";
import Industries from "@/components/sections/Industries";
import Careers from "@/components/sections/Careers";
import Vision from "@/components/sections/Vision";
import Contact from "@/components/sections/Contact";
import Office from "@/components/sections/Office";
import MeetingLead from "@/components/sections/MeetingLead";
import CaseGrid from "@/components/sections/CaseGrid";
import CaseStudySpotlight from "@/components/sections/CaseStudySpotlight";
import PeopleIntro from "@/components/sections/PeopleIntro";
import PeopleValues from "@/components/sections/PeopleValues";
import TheCrew from "@/components/sections/TheCrew";

/**
 * Konten yang ditampilkan di bawah hero untuk tiap room.
 *
 * Office: satu-satunya tempat detail layanan (9-item accordion, pindahan
 *   dari Services.tsx yang dulu ada di Lounge — dihapus supaya tidak ada
 *   dua sumber layanan yang tumpang tindih).
 *
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5; updated
 * 2026-08-03: Careers → Function, FeaturedProjects dropped (duplicated
 * CaseGrid in Meeting), Services dropped from Lounge and merged into
 * Office as the single services deep-dive, see diskusi/bedah-content-lounge):
 * Hero → CsiHero → Manifesto → TrustedBy → Deployments
 *      → LivingArchitecture → Process → Industries → Vision → Contact
 */
export const ROOM_CONTENT: Record<RoomKey, ReactNode> = {
  Lounge: (
    <>
      <CsiHero />
      <Manifesto />
      <TrustedBy />
      <Deployments />
      <LivingArchitecture />
      <Process />
      <Industries />
      <Vision />
      <Contact />
    </>
  ),
  Office: <Office />,
  Meeting: (
    <>
      <MeetingLead />
      <CaseGrid />
      <CaseStudySpotlight />
      <Contact />
    </>
  ),
  Function: (
    <>
      <PeopleIntro />
      <PeopleValues />
      <TheCrew />
      <Careers />
      <Contact />
    </>
  ),
  // Pantry disabled — tidak diberi route, tidak perlu konten.
  Pantry: null,
};

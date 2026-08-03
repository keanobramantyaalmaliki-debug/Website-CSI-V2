import { isValidElement, type ReactNode } from "react";
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

/**
 * Ruangan yang punya konten untuk dirender. Pantry dibuang karena `null`.
 *
 * Sisa dari pola "mount semua ruangan lalu sembunyikan yang tidak aktif" yang
 * sudah DICABUT — lihat RoomContent.tsx untuk alasannya. Dipertahankan karena
 * berguna sendiri: ia menjawab "ruangan mana yang punya konten" tanpa perlu
 * menebak dari daftar route.
 */
export const ROOM_KEYS_WITH_CONTENT = (
  Object.keys(ROOM_CONTENT) as RoomKey[]
).filter((k) => ROOM_CONTENT[k] !== null);

/**
 * Ruangan yang memuat `<Contact />`, jadi `#contact` benar-benar ada di DOM
 * saat ruangan itu terbuka.
 *
 * Dipakai Navbar untuk memutuskan "Talk to us" cukup menggulir di tempat, atau
 * harus pindah ke Lounge dulu. DITURUNKAN dari ROOM_CONTENT di atas, bukan
 * ditulis ulang sebagai daftar nama: begitu Office diberi <Contact />,
 * tombolnya ikut benar sendiri tanpa ada yang perlu ingat menyunting Navbar.
 *
 * Cara memeriksanya menelusuri pohon React element — `<Contact />` bisa berdiri
 * langsung di bawah fragment ruangan (seperti sekarang) maupun terbungkus
 * elemen lain nanti.
 */
function containsContact(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(containsContact);
  if (!isValidElement(node)) return false;
  if (node.type === Contact) return true;
  const children = (node.props as { children?: ReactNode }).children;
  return children === undefined ? false : containsContact(children);
}

export function roomHasContact(room: RoomKey): boolean {
  return containsContact(ROOM_CONTENT[room]);
}

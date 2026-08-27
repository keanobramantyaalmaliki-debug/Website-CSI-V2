import { type ReactNode } from "react";
import type { RoomKey } from "@/lib/store/sceneStore";

// ── Section imports ──────────────────────────────────────────────────────────
import CsiHero from "@/components/sections/CsiHero";
import Deployments from "@/components/sections/Deployments";
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
 * Function: satu-satunya tempat detail layanan (9-item accordion di
 *   sections/Office.tsx — nama berkasnya warisan dari masa konten ini tinggal
 *   di ruangan Office; pindahan dari Services.tsx yang dulu ada di Lounge —
 *   dihapus supaya tidak ada dua sumber layanan yang tumpang tindih).
 *
 * Office ↔ Function ditukar 19 Agu: konten People (crew) lebih nyambung
 *   dengan scene Office yang karakternya duduk bekerja di meja — sekaligus
 *   hologram maintenance & glitch karakter idle (keduanya di-gate ke Office)
 *   jadi latar halaman People. Konten Services pindah ke Function.
 *
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5; updated
 * 2026-08-03: Careers → Function, FeaturedProjects dropped (duplicated
 * CaseGrid in Meeting), Services dropped from Lounge and merged into
 * Office as the single services deep-dive, see diskusi/bedah-content-lounge;
 * updated 2026-08-11: TrustedBy dropped — placeholder client logos carried
 * no real endorsement; Industries is now an expanding horizontal gallery
 * (spine columns reveal image + desc on hover/focus) instead of the old
 * Core/Also card grid; updated 2026-08-18: Manifesto dropped — CsiHero
 * sekarang membawa pernyataan pembuka Lounge sendiri, dan dua blok manifesto
 * berturut-turut di bawah hero membuat pembaca menunggu terlalu lama sebelum
 * bertemu bukti di Deployments. LivingArchitecture ikut dicabut hari yang
 * sama; berkasnya DIHAPUS beserta motion/ArchitectureGrid.tsx,
 * motion/NodeGlyphs.tsx, dan data/architectureNodes.ts — tidak ada pemakai
 * lain yang tersisa:
 * Hero → CsiHero → Deployments → Process → Industries → Vision → Contact
 */
export const ROOM_CONTENT: Record<RoomKey, ReactNode> = {
  Lounge: (
    <>
      <CsiHero />
      <Deployments />
      <Process />
      <Industries />
      <Vision />
      <Contact />
    </>
  ),
  Office: (
    <>
      <PeopleIntro />
      <PeopleValues />
      <TheCrew />
      <Careers />
      <Contact />
    </>
  ),
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
      <Office />
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

/* `roomHasContact` pernah hidup di sini — penelusur pohon element yang
   menjawab "ruangan ini memuat <Contact/>?" untuk CTA navbar "Talk to us"
   (menggulir di tempat vs pindah ke Lounge dulu). Dihapus 27 Agu bersama
   test-nya: CTA itu kini membuka modal InquiryOverlay yang jalan di ruangan
   mana pun, jadi pertanyaannya sendiri sudah tidak ditanyakan siapa-siapa.
   Kalau kelak ada yang butuh lagi, ambil dari git — jangan tulis ulang dari
   ingatan, versi lamanya sudah menanggung <Contact/> yang terbungkus elemen
   lain. */

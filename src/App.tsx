import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import HeroHandoff from "@/components/motion/HeroHandoff";
import Manifesto from "@/components/sections/Manifesto";
import Deployments from "@/components/sections/Deployments";
import Services from "@/components/sections/Services";
import LivingArchitecture from "@/components/sections/LivingArchitecture";
import Process from "@/components/sections/Process";
import Industries from "@/components/sections/Industries";
import Careers from "@/components/sections/Careers";
import Vision from "@/components/sections/Vision";
import Contact from "@/components/sections/Contact";
import { Routes, Route } from "react-router-dom";
import MatterLab from "@/components/lab/MatterLab";

/**
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5):
 * Hero → Manifesto → Deployments → Services → LivingArchitecture
 *      → Process → Industries → Careers → Vision → Contact
 * Content ported from V1 (~/Documents/Project/Apa-ini) — plain layout for now,
 * V2 gets its own animations/effects later. Scroll never moves the camera.
 */
function Landing() {
  return (
    <>
      {/* Ambient depth layer — fixed, non-interactive subtle grid behind everything */}
      <div className="ambient-grid" aria-hidden="true" />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <HeroHandoff />
        <Manifesto />
        <Deployments />
        <Services />
        <LivingArchitecture />
        <Process />
        <Industries />
        <Careers />
        <Vision />
        <Contact />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* Lab uji-coba fisika Matter.js — terpisah dari landing */}
      <Route path="/matterjs-lab" element={<MatterLab />} />
    </Routes>
  );
}

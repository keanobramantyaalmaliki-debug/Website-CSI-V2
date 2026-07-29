import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import Manifesto from "@/components/sections/Manifesto";
import Deployments from "@/components/sections/Deployments";
import Services from "@/components/sections/Services";
import LivingArchitecture from "@/components/sections/LivingArchitecture";
import Process from "@/components/sections/Process";
import Industries from "@/components/sections/Industries";
import Careers from "@/components/sections/Careers";
import Vision from "@/components/sections/Vision";
import Contact from "@/components/sections/Contact";

/**
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5):
 * Hero → Manifesto → Deployments → Services → LivingArchitecture
 *      → Process → Industries → Careers → Vision → Contact
 * Content ported from V1 (~/Documents/Project/Apa-ini) — plain layout for now,
 * V2 gets its own animations/effects later. Scroll never moves the camera.
 */
export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
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

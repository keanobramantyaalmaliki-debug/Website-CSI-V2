import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import Deployments from "@/components/sections/Deployments";
import Services from "@/components/sections/Services";
import Vision from "@/components/sections/Vision";
import Contact from "@/components/sections/Contact";

/**
 * Page structure (decided 2026-07-07, see reference/ROADMAP.md B5):
 * [3D office tour = fullscreen hero] → Deployments → Services → Vision → Contact
 * Content ported from V1 (~/Documents/Project/Apa-ini) — plain layout for now,
 * V2 gets its own animations/effects later. Scroll never moves the camera.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Deployments />
        <Services />
        <Vision />
        <Contact />
      </main>
    </>
  );
}

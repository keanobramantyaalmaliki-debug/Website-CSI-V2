import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

// Single registration point — every GSAP file in this project imports from
// here instead of calling gsap.registerPlugin() itself. This is the Lounge's
// GSAP engine, living alongside the "motion" (Framer) engine that the other
// four rooms still use. motion can be removed once every room migrates.
gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

// Exact translation of the cubic-bezier(0.16, 1, 0.3, 1) easing duplicated
// across ~23 motion-based files (and defined as --ease-out in index.css but
// never consumed from TS). CustomEase is bundled free since GSAP 3.13.
export const CSI_EASE = CustomEase.create("csi", "M0,0 C0.16,1 0.3,1 1,1");

export { gsap, useGSAP, ScrollTrigger };

"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Project = {
  title: string;
  desc: string;
  tags: string[];
  image: string;
};

// PLACEHOLDER — ganti screenshot studi kasus CSI asli setelah tersedia.
const PROJECTS: Project[] = [
  {
    title: "Citizen Service Portal",
    desc: "Unified digital front door for public services, cutting request turnaround from days to hours through automated routing and status tracking.",
    tags: ["Public Sector", "Web Platform"],
    image: "https://picsum.photos/seed/csi-project-citizen-portal/1200/800",
  },
  {
    title: "Field Operations Suite",
    desc: "Real-time monitoring and dispatch for distributed field teams, linking asset data, crew location, and incident response in one workspace.",
    tags: ["Infrastructure", "Mobile + Web"],
    image: "https://picsum.photos/seed/csi-project-field-ops/1200/800",
  },
];

/** Full-width stacked project row. Title/tags fade in over the image as the
 *  card itself scrolls into view (separate from the list's own fade-up). */
function ProjectCard({ project }: { project: Project }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inView = useInView(overlayRef, { once: true, margin: "0px 0px -100px 0px" });
  const reduced = useReducedMotion();

  return (
    <FadeUpItem tag="article" className="border-t border-white/[0.08] py-10 sm:py-14">
      <div ref={overlayRef} className="relative overflow-hidden">
        <motion.img
          src={project.image}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
          whileHover={reduced ? undefined : { opacity: 0.75 }}
          transition={{ duration: 0.3, ease: EASE }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6 sm:p-8"
          initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <h3 className="text-xl font-medium text-zinc-100 sm:text-2xl">{project.title}</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-300">{project.desc}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-200"
              >
                {tag}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </FadeUpItem>
  );
}

export default function FeaturedProjects() {
  return (
    <section id="featured-projects" className="relative px-6 py-24 sm:px-10 sm:py-32">
      <div className="grid gap-10 sm:grid-cols-[220px_1fr] sm:gap-12 lg:grid-cols-[280px_1fr] lg:gap-16">
        <div className="pt-1 sm:sticky sm:top-24 sm:self-start">
          {/* T6 — eyebrow */}
          <motion.p
            className="text-xs tracking-widest text-zinc-400 uppercase"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Featured Projects
          </motion.p>

          {/* T1 — line-mask heading */}
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            <LineMask>Concrete Work, Concrete Results</LineMask>
          </h2>

          <div className="mt-6 h-px w-full bg-white/[0.08]" />
        </div>

        <FadeUpList className="flex flex-col">
          {PROJECTS.map((p) => (
            <ProjectCard key={p.title} project={p} />
          ))}
        </FadeUpList>
      </div>
    </section>
  );
}

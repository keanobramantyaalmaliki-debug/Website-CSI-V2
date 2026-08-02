"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type CaseProject = {
  title: string;
  client: string;
  year: string;
  category: string;
  tags: string[];
  image: string;
  outcome?: string;
};

const CATEGORIES = [
  "All",
  "Public Sector",
  "Infrastructure",
  "AI & Data",
  "Enterprise",
  "Integration",
] as const;

// PLACEHOLDER — replace with actual CSI project screenshots when available.
const PROJECTS: CaseProject[] = [
  {
    title: "Citizen Service Portal",
    client: "Regional Government",
    year: "2024",
    category: "Public Sector",
    tags: ["Web Platform", "Next.js", "PostgreSQL"],
    image: "https://picsum.photos/seed/csi-citizen-portal/1200/675",
    outcome: "67% faster turnaround",
  },
  {
    title: "SIPD Implementation",
    client: "District Government",
    year: "2023",
    category: "Public Sector",
    tags: ["Gov Platform", "Training"],
    image: "https://picsum.photos/seed/csi-sipd/1200/675",
    outcome: "200+ staff trained",
  },
  {
    title: "Field Operations Suite",
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    category: "Infrastructure",
    tags: ["Real-time", "Mobile + Web"],
    image: "https://picsum.photos/seed/csi-field-ops/1200/675",
    outcome: "30% cost reduction",
  },
  {
    title: "Cloud Infrastructure Migration",
    client: "Manufacturing Group",
    year: "2024",
    category: "Infrastructure",
    tags: ["Cloud", "DevOps", "Docker"],
    image: "https://picsum.photos/seed/csi-cloud/1200/675",
    outcome: "99.9% uptime achieved",
  },
  {
    title: "Knowledge Assistant",
    client: "Financial Services Firm",
    year: "2024",
    category: "AI & Data",
    tags: ["LLM", "RAG", "React"],
    image: "https://picsum.photos/seed/csi-knowledge-ai/1200/675",
    outcome: "5,000+ queries/month",
  },
  {
    title: "Analytics Dashboard",
    client: "Government Agency",
    year: "2024",
    category: "AI & Data",
    tags: ["Data Viz", "Python"],
    image: "https://picsum.photos/seed/csi-analytics/1200/675",
    outcome: "50+ data sources unified",
  },
  {
    title: "Procurement Portal",
    client: "Enterprise Corporation",
    year: "2023",
    category: "Enterprise",
    tags: ["ERP Integration", "TypeScript"],
    image: "https://picsum.photos/seed/csi-procurement/1200/675",
    outcome: "100% paperless",
  },
  {
    title: "API Gateway & Middleware",
    client: "Telecommunications",
    year: "2024",
    category: "Integration",
    tags: ["API", "Node.js", "Legacy Bridge"],
    image: "https://picsum.photos/seed/csi-api-gateway/1200/675",
    outcome: "Zero-downtime migration",
  },
];

const CAT_STYLE: Record<string, string> = {
  "Public Sector":  "text-amber-400 border-amber-400/25 bg-amber-400/[0.06]",
  "Infrastructure": "text-blue-400 border-blue-400/25 bg-blue-400/[0.06]",
  "AI & Data":      "text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.06]",
  "Enterprise":     "text-purple-400 border-purple-400/25 bg-purple-400/[0.06]",
  "Integration":    "text-orange-400 border-orange-400/25 bg-orange-400/[0.06]",
};

function CaseCard({
  project,
  index,
}: {
  project: CaseProject;
  index: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      className="group flex flex-col overflow-hidden border-b border-r border-white/[0.06] bg-white/[0.01]"
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.45, ease: EASE, delay: (index % 3) * 0.06 }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden">
        <motion.img
          src={project.image}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
          whileHover={reduced ? undefined : { scale: 1.04 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase ${CAT_STYLE[project.category] ?? "text-zinc-400 border-white/10"}`}
          >
            {project.category}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-zinc-500">
            {project.year}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-snug text-zinc-100">
          {project.title}
        </h3>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {project.outcome && (
          <p className="border-t border-white/[0.06] pt-2 font-mono text-[10px] tracking-wider text-zinc-500">
            {project.outcome}
          </p>
        )}
      </div>
    </motion.article>
  );
}

export default function CaseGrid() {
  const [active, setActive] = useState<string>("All");

  const filtered =
    active === "All"
      ? PROJECTS
      : PROJECTS.filter((p) => p.category === active);

  return (
    <section
      id="case-grid"
      className="relative z-10 px-6 pb-24 sm:px-10 sm:pb-32"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.p
            className="text-xs tracking-widest text-zinc-400 uppercase"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Portfolio
          </motion.p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            <LineMask>All Projects</LineMask>
          </h2>
        </div>
        <motion.span
          className="font-mono text-xs text-zinc-600 sm:pb-1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        >
          {filtered.length} of {PROJECTS.length} projects
        </motion.span>
      </div>

      {/* Filter tabs — horizontal scroll on mobile keeps single line, no wrapping */}
      <div className="mb-6 -mx-6 sm:mx-0">
        <div className="flex gap-2 overflow-x-auto px-6 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={[
                "flex-none rounded-sm border px-3 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150",
                active === cat
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                  : "border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-zinc-300",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid — border-top + border-left as outer frame */}
      <div className="border-l border-t border-white/[0.06]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            // key includes active so cards remount (and re-animate) on filter change
            <CaseCard key={`${active}-${p.title}`} project={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

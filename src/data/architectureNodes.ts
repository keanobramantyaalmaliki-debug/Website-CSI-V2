export type ArchitectureGroup = "Foundation" | "Flow";

export type ArchitectureNode = {
  num: string;
  name: string;
  group: ArchitectureGroup;
  desc: string;
};

// The seven nodes of the Living Architecture, in narrative order (01 -> 07).
// Order MUST stay in lockstep with NODE_GLYPHS in
// components/motion/NodeGlyphs.tsx — ArchitectureGrid pairs node[i] with
// NODE_GLYPHS[i] by index. Foundation (4 nodes) "runs on" Flow (3 nodes);
// the group split drives the two labelled bands in the grid.
export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    num: "01",
    name: "Citizen",
    group: "Foundation",
    desc: "Every interaction starts with people — their needs drive the system.",
  },
  {
    num: "02",
    name: "Operations",
    group: "Foundation",
    desc: "Workflows that turn intent into action across every department.",
  },
  {
    num: "03",
    name: "Knowledge",
    group: "Foundation",
    desc: "Data and institutional memory that give every decision context.",
  },
  {
    num: "04",
    name: "Infrastructure",
    group: "Foundation",
    desc: "Cloud, APIs, and integrations that keep everything connected.",
  },
  {
    num: "05",
    name: "Intelligence",
    group: "Flow",
    desc: "AI and analytics that surface patterns before you ask.",
  },
  {
    num: "06",
    name: "Decision",
    group: "Flow",
    desc: "Where signals and intelligence converge into a clear course.",
  },
  {
    num: "07",
    name: "Action",
    group: "Flow",
    desc: "Outcomes in the real world — sent, deployed, delivered.",
  },
];

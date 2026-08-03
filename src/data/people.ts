export type TeamMember = {
  name: string;
  role: string;
  category: "Management" | "Design" | "Engineering";
  social?: { platform: "linkedin" | "github" | "x"; url: string }[];
};

export type Value = {
  title: string;
  tagline: string;
  description: string;
  photo?: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Keano Ericsson",
    role: "Founder & Chief Executive",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Raka Mahardika",
    role: "Head of Operations",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Nadia Salsabila",
    role: "Creative Director",
    category: "Design",
    social: [
      { platform: "linkedin", url: "#" },
      { platform: "x", url: "#" },
    ],
  },
  {
    name: "Tara Aqilah",
    role: "Senior Product Designer",
    category: "Design",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Gilang Pratama",
    role: "UX Researcher",
    category: "Design",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Rizky Firmansyah",
    role: "Lead Engineer",
    category: "Engineering",
    social: [
      { platform: "github", url: "#" },
      { platform: "linkedin", url: "#" },
    ],
  },
  {
    name: "Dimas Arya",
    role: "Full Stack Engineer",
    category: "Engineering",
    social: [{ platform: "github", url: "#" }],
  },
  {
    name: "Satria Nugroho",
    role: "Full Stack Engineer",
    category: "Engineering",
    social: [{ platform: "github", url: "#" }],
  },
];

export const VALUES: Value[] = [
  {
    title: "Craft First",
    tagline: "Precision over speed",
    description:
      "We believe the details are the work. Every margin, transition, and copy decision is deliberate — because what looks effortless took effort to get right.",
  },
  {
    title: "Partnership",
    tagline: "Embedded, not adjacent",
    description:
      "We work as part of your team, not apart from it. That means shared context, honest feedback, and outcomes we're both responsible for.",
  },
  {
    title: "Long-Term Thinking",
    tagline: "Built to outlast the brief",
    description:
      "We design systems, not artifacts. The work we ship should still make sense two years from now — even after the team changes.",
  },
];

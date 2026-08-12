export type TeamMember = {
  name: string;
  role: string;
  category: "Management" | "Developer" | "R & D";
  social?: { platform: "linkedin" | "github" | "x"; url: string }[];
  photoUrl?: string;
};

export type Value = {
  title: string;
  tagline: string;
  description: string;
  photo?: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Fahmi Maliki",
    role: "Founder & Chief Executive",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Lena Almaliki",
    role: "Chief Executive",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Jun",
    role: "Manager",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Imam Maliki",
    role: "Head of Operations",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Lisa Puspitasari",
    role: "Assistant Manager",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Bagas Nusantara Nabillah",
    role: "Senior Developer",
    category: "Developer",
    social: [
      { platform: "linkedin", url: "#" },
      { platform: "x", url: "#" },
    ],
  },
  {
    name: "Amallia Dwi Yustianti",
    role: "Senior Developer",
    category: "Developer",
    social: [
      { platform: "linkedin", url: "#" },
      { platform: "x", url: "#" },
    ],
  },
  {
    name: "Nico Arya Putra Laksana",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Keano Bramantya Almaliki",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Sayyid",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Bayu",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Roni",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Inno",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
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

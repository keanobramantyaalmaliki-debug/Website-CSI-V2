export type IndustryTier = "core" | "also";

export type Industry = {
  num: string;
  name: string;
  desc: string;
  tier: IndustryTier;
  image: string;
  imageAlt: string;
};

// The 13 sectors CSI builds for, in narrative order (01 -> 13). Core (3) are
// the flagship focus areas; the rest ("also") round out the portfolio. Order
// and text must stay in lockstep with Industries.test.tsx.
export const INDUSTRIES: Industry[] = [
  {
    num: "01",
    name: "Government & Public Sector",
    desc: "National platforms and citizen services, built to scale and stay accountable.",
    tier: "core",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Grand government building facade with columns",
  },
  {
    num: "02",
    name: "Smart Cities",
    desc: "Connected infrastructure that turns urban data into livable outcomes.",
    tier: "core",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "City skyline lit up at night",
  },
  {
    num: "03",
    name: "Digital Villages",
    desc: "Bringing modern services to rural communities, one connected village at a time.",
    tier: "core",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Rural village landscape with rolling hills",
  },
  {
    num: "04",
    name: "Healthcare",
    desc: "Systems that keep patient care coordinated, secure, and on time.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Medical professional using digital health technology",
  },
  {
    num: "05",
    name: "Education",
    desc: "Platforms that put learning and administration on the same page.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Students studying in a modern classroom",
  },
  {
    num: "06",
    name: "Finance",
    desc: "Secure, compliant systems for money that has to move and be trusted.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Financial district skyline with data overlay",
  },
  {
    num: "07",
    name: "Hospitality",
    desc: "Guest experiences that feel effortless from booking to checkout.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Elegant hotel lobby interior",
  },
  {
    num: "08",
    name: "Retail & E-Commerce",
    desc: "Storefronts and operations that keep pace with demand.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Retail storefront with shopping displays",
  },
  {
    num: "09",
    name: "Manufacturing",
    desc: "Floor-to-cloud visibility that keeps production moving.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Industrial robotic arms on a factory floor",
  },
  {
    num: "10",
    name: "Logistics",
    desc: "Tracking and routing that make every shipment predictable.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Shipping containers stacked at a port",
  },
  {
    num: "11",
    name: "Property & Real Estate",
    desc: "Tools that manage spaces, tenants, and portfolios in one place.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Modern residential building architecture",
  },
  {
    num: "12",
    name: "Professional Services",
    desc: "Workflows that let expert teams bill, deliver, and scale.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Team collaborating in a modern meeting room",
  },
  {
    num: "13",
    name: "Startups & Enterprises",
    desc: "From first MVP to enterprise rollout, built to grow with you.",
    tier: "also",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Startup team working around a whiteboard",
  },
];

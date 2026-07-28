/** SECTION — real content from V1 */

const INDUSTRIES = [
  "Government & Public Sector",
  "Smart Cities",
  "Digital Villages",
  "Healthcare",
  "Education",
  "Finance",
  "Hospitality",
  "Retail & E-Commerce",
  "Manufacturing",
  "Logistics",
  "Property & Real Estate",
  "Professional Services",
  "Startups & Enterprises",
];

export default function Industries() {
  return (
    <section id="industries" className="border-y border-zinc-900 bg-zinc-950/50">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <p className="text-xs tracking-widest text-zinc-400 uppercase">Industries</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Built Across Sectors
        </h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {INDUSTRIES.map((name) => (
            <span
              key={name}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

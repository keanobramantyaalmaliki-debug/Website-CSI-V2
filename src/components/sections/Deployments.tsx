/**
 * DEPLOYMENTS — real content from V1 (Apa-ini/index.html).
 * Plain layout for now — animations/effects will be rebuilt for V2 later.
 */

const DEPLOYMENTS = [
  {
    num: "01",
    sector: "Public Services",
    region: "Indonesia",
    desc: "Digital transformation initiatives for citizen engagement, operational visibility, and service coordination.",
  },
  {
    num: "02",
    sector: "Infrastructure",
    region: "Indonesia",
    desc: "Integrated monitoring environments connecting assets, operations, and situational awareness.",
  },
  {
    num: "03",
    sector: "Logistics",
    region: "International",
    desc: "Operational intelligence deployments supporting visibility, workflow optimization, and decision support.",
  },
  {
    num: "04",
    sector: "Hospitality",
    region: "Southeast Asia",
    desc: "Intelligence-driven engagement frameworks for modern guest experiences.",
  },
  {
    num: "05",
    sector: "Communities",
    region: "Indonesia",
    desc: "Connected environments that improve communication, participation, and collective action.",
  },
];

export default function Deployments() {
  return (
    <section id="deployments" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Deployments</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        Built for real-world environments where decisions matter.
      </h2>

      <div className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
        {DEPLOYMENTS.map((d) => (
          <article key={d.num} className="group grid gap-2 py-6 sm:grid-cols-[4rem_1fr_1fr] sm:gap-6">
            <span className="text-sm text-zinc-600 tabular-nums">{d.num}</span>
            <div>
              <h3 className="font-medium text-zinc-100 transition-colors group-hover:text-white">
                {d.sector}
              </h3>
              <p className="mt-1 text-xs text-zinc-600">{d.region}</p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">{d.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

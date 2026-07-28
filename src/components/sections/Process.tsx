/** SECTION — real content from V1 */

const STEPS: { num: string; title: string }[] = [
  { num: "01", title: "Discovery" },
  { num: "02", title: "Strategy & Planning" },
  { num: "03", title: "Design" },
  { num: "04", title: "Development" },
  { num: "05", title: "Testing & Quality Assurance" },
  { num: "06", title: "Deployment & Continuous Support" },
];

export default function Process() {
  return (
    <section id="process" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Our Process</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        How We Work
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="rounded-lg border border-zinc-900 bg-zinc-950 p-6"
          >
            <span className="text-xs text-zinc-600 tabular-nums">{step.num}</span>
            <h3 className="mt-3 font-medium text-zinc-100">{step.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

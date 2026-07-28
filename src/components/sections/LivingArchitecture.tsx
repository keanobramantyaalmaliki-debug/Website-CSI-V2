/** SECTION — real content from V1 */

const NODES: { name: string; desc: string }[] = [
  {
    name: "Citizen",
    desc: "Every interaction begins with people — citizens, users, and communities whose needs drive the system.",
  },
  {
    name: "Operations",
    desc: "Processes and workflows that translate intent into action across departments and services.",
  },
  {
    name: "Knowledge",
    desc: "Structured data, documents, and institutional memory that give context to every decision.",
  },
  {
    name: "Infrastructure",
    desc: "The technical foundation — cloud, APIs, and integrations that keep systems connected and resilient.",
  },
  {
    name: "Intelligence",
    desc: "AI and analytics layers that surface patterns, predictions, and recommendations from the data.",
  },
  {
    name: "Decision",
    desc: "The moment of clarity — where signals, context, and intelligence converge into a clear course of action.",
  },
  {
    name: "Action",
    desc: "Outcomes executed in the real world: communications sent, resources deployed, services delivered.",
  },
];

export default function LivingArchitecture() {
  return (
    <section id="living-architecture" className="border-y border-zinc-900 bg-zinc-950/50">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <p className="text-xs tracking-widest text-zinc-400 uppercase">Living Architecture</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          A Living Architecture For Decisions.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">
          We connect signals, context, knowledge, and workflows into adaptive systems that help
          organizations move from awareness to action.
        </p>

        <ol className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
          {NODES.map((node, i) => (
            <li key={node.name} className="grid gap-2 py-6 sm:grid-cols-[4rem_12rem_1fr] sm:gap-6">
              <span className="text-sm text-zinc-600 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-medium text-zinc-100">{node.name}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{node.desc}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-xs tracking-widest text-zinc-600 uppercase">
          Signal Complete&nbsp;
          <span className="text-orange-500">→</span>
          &nbsp;From awareness to action.
        </p>
      </div>
    </section>
  );
}

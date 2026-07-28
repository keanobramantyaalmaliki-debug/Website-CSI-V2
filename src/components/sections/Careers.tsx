/** SECTION — real content from V1 */

const ROLES: { title: string; type: string; mode: string; tag: string }[] = [
  { title: "Innovation & Growth Manager", type: "Full-time", mode: "Remote",  tag: "Growth" },
  { title: "Technical Lead",              type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
  { title: "Product Builder",             type: "Full-time", mode: "Remote",  tag: "Product" },
  { title: "Full Stack Engineer",         type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
];

const HIRING_STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

export default function Careers() {
  return (
    <section id="careers" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Careers</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        Build What Comes Next.
      </h2>

      <div className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
        {ROLES.map((role) => (
          <article
            key={role.title}
            className="group grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:gap-6"
          >
            <div>
              <h3 className="font-medium text-zinc-100 transition-colors group-hover:text-white">
                {role.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {role.type} · {role.mode}
              </p>
            </div>
            <span className="self-center rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
              {role.tag}
            </span>
          </article>
        ))}
      </div>

      <div className="mt-12">
        <p className="text-xs tracking-widest text-zinc-400 uppercase">How We Hire</p>
        <ol className="mt-6 flex flex-wrap items-center gap-3">
          {HIRING_STAGES.map((stage, i) => (
            <li key={stage} className="flex items-center gap-3">
              <span className="text-sm text-zinc-300">{stage}</span>
              {i < HIRING_STAGES.length - 1 && (
                <span className="text-orange-500">→</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

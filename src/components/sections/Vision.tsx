/**
 * VISION & MISSION — real content from V1 (Apa-ini/index.html).
 */

const MISSIONS = [
  "Deliver innovative and high-quality software solutions.",
  "Accelerate digital transformation through intelligent technologies.",
  "Integrate Artificial Intelligence into practical business applications.",
  "Build long-term partnerships based on trust, collaboration, and excellence.",
  "Continuously innovate to help organizations thrive in the digital era.",
];

export default function Vision() {
  return (
    <section id="vision" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Our Vision</p>
      <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-zinc-100 sm:text-3xl">
        To become a trusted technology partner that empowers organizations through
        intelligent digital innovation — creating sustainable value for businesses
        and communities worldwide.
      </h2>

      <p className="mt-16 text-xs tracking-widest text-zinc-400 uppercase">Our Mission</p>
      <ol className="mt-6 space-y-4">
        {MISSIONS.map((m, i) => (
          <li key={m} className="flex gap-4 border-b border-zinc-900 pb-4">
            <span className="text-sm text-zinc-600 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{m}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

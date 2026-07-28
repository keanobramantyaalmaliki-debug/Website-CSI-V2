/** SECTION — real content from V1 */

const LINES = [
  "Software connects information. Intelligence connects decisions.",
  "Organizations are drowning in data. Yet struggling to act.",
  "The future belongs not to those who collect, but to those who act.",
  "Intelligence should exist across every interaction. Every workflow. Every decision.",
];

export default function Manifesto() {
  return (
    <section id="manifesto" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Manifesto</p>
      <div className="mt-8 flex flex-col gap-6">
        {LINES.map((line, i) => (
          <p
            key={i}
            className="max-w-2xl text-xl font-medium leading-snug tracking-tight text-zinc-100 sm:text-2xl"
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

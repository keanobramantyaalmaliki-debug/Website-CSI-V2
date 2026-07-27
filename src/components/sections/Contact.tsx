/**
 * CONTACT — CTA closing the page. Real content from V1 (Apa-ini/index.html).
 * Will later be "twinned" with the meeting-room CTA inside the 3D tour (B6).
 */

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/baliinteraktifperkasa" }, // TODO: update to cogniti handle
  { label: "LinkedIn", href: "https://linkedin.com/company/bali-interaktif-perkasa" }, // TODO: update to cogniti page
];

export default function Contact() {
  return (
    <section id="contact" className="px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-xs tracking-widest text-zinc-400 uppercase">Contact</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
        Let&apos;s Start A Conversation.
      </h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
        We typically respond within one business day.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href="mailto:hello@cogniti.id"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          hello@cogniti.id
        </a>
        <a
          href="#office"
          className="rounded-full border border-zinc-800 px-6 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-600"
        >
          ↑ Back to the office
        </a>
      </div>

      <footer className="mt-24 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All rights reserved.
          </span>
          <div className="flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-400"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span>Jl. Kediri No.27, Tuban, Badung, Bali 80361</span>
          <span>Intelligence Infrastructure</span>
        </div>
      </footer>
    </section>
  );
}

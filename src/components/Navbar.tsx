/**
 * NAVBAR — fixed di atas semua konten (termasuk hero 3D).
 * Layout 3 bagian (ala basement): logo kiri · links tengah · CTA kanan.
 * Nanti di mode 3D juga jadi tempat snap-to-scene untuk mobile (B2/B5).
 */

const LINKS = [
  { href: "#office", label: "Office" },
  { href: "#deployments", label: "Deployments" },
  { href: "#services", label: "Services" },
  { href: "#vision", label: "Vision" },
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center bg-gradient-to-b from-black/80 to-transparent px-6 py-4 sm:px-10">
        {/* Kiri — logo */}
        <a
          href="#office"
          className="justify-self-start text-lg font-semibold tracking-tight text-zinc-100"
        >
          cogniti<span className="text-orange-500">.id</span>
        </a>

        {/* Tengah — nav links */}
        <ul className="flex items-center gap-5 justify-self-center sm:gap-8">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-xs text-zinc-400 transition-colors hover:text-orange-500 sm:text-sm"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Kanan — CTA */}
        <a
          href="#contact"
          className="flex items-center gap-3 justify-self-end text-xs text-zinc-100 transition-colors hover:text-orange-500 sm:text-sm"
        >
          <span className="hidden tracking-[0.3em] text-zinc-600 sm:inline">····</span>
          Talk to us
        </a>
      </nav>
    </header>
  );
}

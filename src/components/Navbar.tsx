"use client";

import { useSceneStore, type RoomKey } from "@/lib/store/sceneStore";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";

const ROOMS: { key: RoomKey; label: string }[] = [
  { key: "Office",   label: "Main Office" },
  { key: "Lounge",   label: "Lounge" },
  { key: "Meeting",  label: "Meeting Room" },
  { key: "Function", label: "Function Hall" },
];

const PAGE_LINKS = [
  { href: "#deployments", label: "Deployments" },
  { href: "#services",    label: "Services" },
  { href: "#vision",      label: "Vision" },
];

// id section yang di-scrollspy — urut sesuai PAGE_LINKS, referensi stabil di module scope
const SECTION_IDS = PAGE_LINKS.map((l) => l.href.slice(1));

const ROOM_LABELS: Record<RoomKey, string> = {
  Office:   "Main Office",
  Lounge:   "Lounge",
  Meeting:  "Meeting Room",
  Function: "Function Hall",
  Pantry:   "Pantry",
};

export default function Navbar() {
  const currentRoom   = useSceneStore((s) => s.currentRoom);
  const goTo          = useSceneStore((s) => s.goTo);
  const heroInView    = useSceneStore((s) => s.heroInView);
  const activeSection = useSceneStore((s) => s.activeSection);

  useScrollSpy(SECTION_IDS);

  const inHero = ROOMS.some((r) => r.key === currentRoom);

  function handleRoomClick(key: RoomKey) {
    document.getElementById("office")?.scrollIntoView({ behavior: "smooth" });
    goTo?.(key);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className={[
          "grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 sm:px-10 transition-colors duration-300",
          heroInView
            ? "bg-gradient-to-b from-black/80 to-transparent"
            : "bg-black/90 backdrop-blur-md border-b border-white/5",
        ].join(" ")}>

        {/* Kiri — logo + room name saat di hero */}
        <a href="#office" className="justify-self-start">
          <span className="text-lg font-semibold tracking-tight text-zinc-100">
            cogniti<span className="text-orange-500">.id</span>
          </span>
          {inHero && heroInView && (
            <span className="mt-0.5 block text-[9px] uppercase tracking-[2.5px] text-zinc-500 transition-all duration-300">
              {ROOM_LABELS[currentRoom]}
            </span>
          )}
        </a>

        {/* Tengah — nav links */}
        <ul className="flex items-center gap-5 justify-self-center sm:gap-8">

          {/* Office dropdown */}
          <li className="group relative">
            <button
              onClick={() => handleRoomClick("Office")}
              className={[
                "flex items-center gap-1 text-xs transition-colors sm:text-sm",
                inHero ? "text-white" : "text-zinc-400 hover:text-orange-500",
              ].join(" ")}
            >
              Office
              <svg
                className="h-3 w-3 text-zinc-600 transition-transform duration-200 group-hover:rotate-180"
                viewBox="0 0 12 12" fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="pointer-events-none absolute left-1/2 top-full mt-2 w-44 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/90 py-1 backdrop-blur-md">
                {ROOMS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleRoomClick(r.key)}
                    className={[
                      "flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors",
                      currentRoom === r.key
                        ? "text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span className={[
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      currentRoom === r.key ? "bg-orange-500" : "bg-zinc-700",
                    ].join(" ")} />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </li>

          {PAGE_LINKS.map((l) => {
            const active = activeSection === l.href.slice(1);
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "text-xs transition-colors hover:text-orange-500 sm:text-sm",
                    active ? "text-orange-500" : "text-zinc-400",
                  ].join(" ")}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
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

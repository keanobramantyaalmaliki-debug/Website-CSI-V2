"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSceneStore, pathFor, type RoomKey } from "@/lib/store/sceneStore";
import { roomHasContact } from "@/lib/roomContent";
import { ACTIVE_KEYS } from "@/components/canvas/CameraController";
import MagneticButton from "@/components/motion/MagneticButton";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Navbar() {
  const heroInView  = useSceneStore((s) => s.heroInView);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const reduced     = useReducedMotion();
  const navigate    = useNavigate();
  const [open, setOpen] = useState(false);

  function goRoom(room: RoomKey) {
    navigate(pathFor(room));
    setOpen(false);
  }

  /**
   * "Talk to us" — SCROLL DI TEMPAT, jangan memindahkan ruangan.
   *
   * `<Contact />` sekarang ada di Lounge, Meeting, DAN Function (lihat
   * roomContent.tsx), jadi dari ketiganya tombol ini cukup menggulir ke bawah.
   * Memindahkan pengunjung ke ruangan lain hanya karena ia menekan tombol
   * kontak itu mengagetkan — ia kehilangan tempatnya tanpa meminta.
   *
   * Versi sebelumnya SELALU melempar ke Lounge dari ruangan mana pun, dengan
   * alasan yang sempat benar: "#contact cuma ada di Lounge". Alasan itu gugur
   * begitu Meeting & Function ikut memuat Contact — perilakunya jadi basi
   * tanpa ada yang berubah di berkas ini.
   *
   * Office satu-satunya yang memang tidak punya Contact, dan hanya di situ
   * berpindah ke Lounge itu benar — tidak ada tujuan lain untuk dituju.
   * `RoomRouteSync` (Arah 3) yang menggulirkannya setelah Lounge ter-mount.
   *
   * ⚠️ Diturunkan dari ROOM_CONTENT, bukan daftar nama ruangan yang ditulis
   * ulang di sini: begitu Office diberi <Contact />, tombolnya ikut benar
   * dengan sendirinya tanpa ada yang perlu ingat memperbarui tempat ini.
   */
  function goToContact() {
    setOpen(false);
    if (roomHasContact(currentRoom)) {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/#contact");
  }

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={[
          "flex w-full max-w-5xl items-center justify-between gap-6 rounded-full px-5 py-2.5 transition-all duration-300 sm:px-6",
          heroInView && !open ? "bg-transparent" : "glass border border-white/10",
        ].join(" ")}
      >
        {/* Logo */}
        <Link to="/" className="shrink-0" aria-label="Cogniti — home">
          <img
            src="/brand/Logo-Final.png"
            alt="CSI Logo"
            width={76}
            height={30}
            className="object-contain"
            fetchPriority="high"
          />
        </Link>

        {/* Desktop room links */}
        <ul className="hidden items-center gap-6 md:flex">
          {ACTIVE_KEYS.map((room) => {
            const active = currentRoom === room;
            return (
              <li key={room}>
                <button
                  type="button"
                  onClick={() => goRoom(room)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "text-sm transition-colors hover:text-accent",
                    active ? "text-accent" : "text-zinc-300",
                  ].join(" ")}
                >
                  {room}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {/* CTA — pakai goToContact(), BUKAN scrollIntoView langsung.
              Versi sebelumnya memanggil scrollIntoView apa adanya di sini,
              sehingga tombol desktop & mobile berperilaku berbeda: yang mobile
              tahu harus pindah dulu kalau ruangannya tak punya Contact, yang
              ini tidak — dari Office ia diam saja tanpa umpan balik. */}
          <MagneticButton>
            <button
              type="button"
              onClick={goToContact}
              className="group hidden shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 md:flex"
            >
              Talk to us
              <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-900/10 text-zinc-900 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </button>
          </MagneticButton>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 md:hidden"
          >
            <span className={`absolute h-px w-4 bg-zinc-100 transition-all duration-300 ${open ? "rotate-45" : "-translate-y-1"}`} />
            <span className={`absolute h-px w-4 bg-zinc-100 transition-all duration-300 ${open ? "-rotate-45" : "translate-y-1"}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="glass absolute top-full mt-2 w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-white/10 p-2 md:hidden"
          >
            <ul className="flex flex-col">
              {ACTIVE_KEYS.map((room) => {
                const active = currentRoom === room;
                return (
                  <li key={room}>
                    <button
                      type="button"
                      onClick={() => goRoom(room)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "block w-full rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-white/5",
                        active ? "text-accent" : "text-zinc-200",
                      ].join(" ")}
                    >
                      {room}
                    </button>
                  </li>
                );
              })}
              <li className="p-2">
                <button
                  type="button"
                  onClick={goToContact}
                  className="block w-full rounded-full bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900"
                >
                  Talk to us
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

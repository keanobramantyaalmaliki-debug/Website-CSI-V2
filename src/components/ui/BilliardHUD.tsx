"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { VIEWS } from "@/components/canvas/CameraController";

const LOUNGE_VIEW = VIEWS.Lounge;

/**
 * Antarmuka minigame billiard — hidup di DOM, di luar Canvas.
 *
 * Dua kontrol, sesuai permintaan: geser di mana saja untuk memutar arah bidik,
 * dan bar tenaga di tepi kiri untuk kekuatan tembakan (lepas = menembak),
 * seperti game 8 Ball Pool.
 *
 * Lapisan z: Navbar 50, RoomNav 20 — HUD ini di 30/40 supaya menutupi navigasi
 * ruangan tapi tetap di bawah navbar.
 */
export default function BilliardHUD() {
  const active = useSceneStore((s) => s.billiardActive);
  const phase = useSceneStore((s) => s.billiardPhase);
  const exitBilliard = useSceneStore((s) => s.exitBilliard);
  const goToView = useSceneStore((s) => s.goToView);
  const pocketed = useSceneStore((s) => s.pocketed);
  const aimAngle = useSceneStore((s) => s.aimAngle);
  const setAimAngle = useSceneStore((s) => s.setAimAngle);
  const shotPower = useSceneStore((s) => s.shotPower);
  const setShotPower = useSceneStore((s) => s.setShotPower);
  const billiard = useSceneStore((s) => s.billiard);
  const tableRotated = useSceneStore((s) => s.tableRotated);
  const cueScreen = useSceneStore((s) => s.cueScreen);

  const aiming = phase === "aiming";
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  /** Keluar mode main sekaligus mengembalikan kamera ke pandangan Lounge —
   *  tanpa ini kamera tertinggal menempel di meja. */
  const exit = useCallback(() => {
    exitBilliard();
    setShotPower(0);
    const v = LOUNGE_VIEW;
    // up dikembalikan ke normal — kamera billiard memakai up miring.
    goToView?.(
      [v.pos.x, v.pos.y, v.pos.z],
      [v.tgt.x, v.tgt.y, v.tgt.z],
      [0, 1, 0],
    );
  }, [exitBilliard, goToView, setShotPower]);

  // ── Bar tenaga: seret ke atas untuk menambah kekuatan, lepas untuk menembak ──
  const powerFromEvent = useCallback((clientY: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    // Bawah bar = 0, atas = 1.
    const t = (r.bottom - clientY) / r.height;
    return Math.max(0, Math.min(1, t));
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => setShotPower(powerFromEvent(e.clientY));
    const up = (e: PointerEvent) => {
      const p = powerFromEvent(e.clientY);
      setDragging(false);
      // Tarikan terlalu pendek dianggap batal, bukan tembakan lemah — supaya
      // sentuhan tak sengaja tidak menghabiskan giliran. Ambangnya kecil (2%)
      // karena tembakan pelan sekarang memang sah: pemetaan tenaga kuadratik
      // membuat ujung bawah bar berguna untuk sentuhan halus.
      if (p > 0.02) billiard?.shoot(p);
      setShotPower(0);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, powerFromEvent, setShotPower, billiard]);

  // ── Tekan & putar mengelilingi bola untuk membidik ─────────────────────
  //
  // Sudutnya dihitung dari posisi kursor TERHADAP BOLA PUTIH di layar, seperti
  // memutar stik di game billiard pada umumnya. Yang dipakai adalah SELISIH
  // sudut sejak jari menyentuh, bukan sudut absolutnya — jadi stik tidak
  // melompat ke posisi kursor saat pertama disentuh, melainkan mengikuti
  // putaran tangan dari posisinya sekarang.
  //
  // Versi sebelumnya hanya membaca `dx` (geser mendatar), sehingga gerakan
  // vertikal atau miring sama sekali tidak terbaca.
  //
  // ⚠️ Nilai-nilai dibaca lewat ref, bukan dari closure. Dulu `aimAngle` ada
  // di dependency array efek ini, jadi tiap sudut berubah React memasang ulang
  // semua listener dan posisi jari sebelumnya ikut hilang — stik cuma bergeser
  // sedikit lalu macet.
  const aimRef = useRef(aimAngle);
  aimRef.current = aimAngle;
  const rotRef = useRef(tableRotated);
  rotRef.current = tableRotated;
  const cueScreenRef = useRef(cueScreen);
  cueScreenRef.current = cueScreen;

  useEffect(() => {
    if (!active || !aiming) return;

    /** Sudut kursor terhadap bola saat jari menyentuh, + sudut bidik saat itu. */
    let grab: { pointer: number; aim: number } | null = null;

    /** Sudut kursor terhadap bola putih di layar (radian). */
    const angleAt = (e: PointerEvent): number | null => {
      const c = cueScreenRef.current;
      if (!c) return null;
      const dx = e.clientX - c.x;
      const dy = e.clientY - c.y;
      // Terlalu dekat ke pusat: sudutnya jadi liar karena pembagian nyaris nol.
      if (dx * dx + dy * dy < 12 * 12) return null;
      return Math.atan2(dy, dx);
    };

    const down = (e: PointerEvent) => {
      // Abaikan kalau yang disentuh elemen HUD (bar tenaga, tombol).
      if ((e.target as HTMLElement)?.closest?.("[data-hud]")) return;
      const a = angleAt(e);
      if (a === null) return;
      grab = { pointer: a, aim: aimRef.current };
    };

    const move = (e: PointerEvent) => {
      if (!grab) return;
      const a = angleAt(e);
      if (a === null) return;

      // Selisih sudut, dinormalkan ke (−π, π] supaya melewati batas ±180°
      // tidak membuat stik berputar balik satu putaran penuh.
      let delta = a - grab.pointer;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;

      // Arahnya dibalik saat meja mendatar: di orientasi itu kamera memakai
      // up=(1,0,0), sehingga putaran yang sama terbaca berlawanan di layar.
      const sign = rotRef.current ? -1 : 1;
      setAimAngle(grab.aim + sign * delta);
    };

    const up = () => { grab = null; };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [active, aiming, setAimAngle]);

  // Esc untuk keluar — jalan pintas yang diharapkan dari mode layar penuh.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, exit]);

  // Scroll meninggalkan hero saat masih di meja → keluar otomatis.
  //
  // Dua alasan, dua-duanya baru muncul sejak FrameloopGate ada:
  //   1. HUD ini `position: fixed` dan TIDAK digerbang heroInView — tanpa ini
  //      bar tenaga & tombol tetap melayang di atas konten halaman.
  //   2. Gate mematikan render loop saat hero lewat, jadi permainan toh beku;
  //      keluar rapi (kamera dikembalikan ke Lounge lewat `exit`) lebih jujur
  //      daripada membiarkan pemain kembali ke meja yang membeku diam-diam.
  const heroInView = useSceneStore((s) => s.heroInView);
  useEffect(() => {
    if (active && !heroInView) exit();
  }, [active, heroInView, exit]);

  if (!active) return null;

  const pct = Math.round(shotPower * 100);

  return (
    <>
      {/* Bar tenaga — tepi kiri */}
      <div
        data-hud
        className="fixed left-6 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-3 select-none"
      >
        <span className="text-[9px] uppercase tracking-[1.5px] text-white/40">
          Power
        </span>

        <div
          ref={barRef}
          onPointerDown={(e) => {
            if (!aiming) return;
            e.preventDefault();
            setDragging(true);
            setShotPower(powerFromEvent(e.clientY));
          }}
          className={[
            "relative h-48 w-8 touch-none rounded-full border border-white/10 bg-white/5",
            aiming ? "cursor-grab active:cursor-grabbing" : "opacity-30",
          ].join(" ")}
        >
          {/* isian */}
          <div
            className="absolute inset-x-0 bottom-0 rounded-full bg-orange-500 transition-[height] duration-75"
            style={{ height: `${pct}%` }}
          />
          {/* pegangan */}
          <div
            className="absolute inset-x-[-3px] h-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            style={{ bottom: `calc(${pct}% - 1px)` }}
          />
        </div>

        <span className="font-mono text-[10px] tabular-nums text-white/50">
          {pct}%
        </span>
      </div>

      {/* Status + tombol — kanan bawah */}
      <div
        data-hud
        className="fixed bottom-8 right-6 z-30 flex flex-col items-end gap-3"
      >
        <p className="text-[9px] uppercase tracking-[1.5px] text-white/40">
          {pocketed}/15 pocketed
        </p>
        <p className="text-[9px] uppercase tracking-[1.5px] text-white/25">
          {aiming ? "Drag to aim · pull bar to shoot" : "…"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => billiard?.reset()}
            className="rounded-full border border-white/10 px-4 py-1.5 text-[10px] uppercase tracking-[1.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white"
          >
            Reset
          </button>
          <button
            onClick={exit}
            className="rounded-full border border-white/10 px-4 py-1.5 text-[10px] uppercase tracking-[1.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white"
          >
            Exit
          </button>
        </div>
      </div>
    </>
  );
}

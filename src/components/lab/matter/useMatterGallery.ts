"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { sceneById } from "./registry";
import { PALETTE, type SceneObjects } from "./sceneKit";

/**
 * useMatterGallery — lifecycle Matter.js untuk galeri multi-scene.
 *
 * Engine/Render/Runner/Mouse dibuat sekali; saat `sceneId` berubah, hanya ISI
 * world yang dibangun ulang (world.clear + build scene baru) — jauh lebih murah
 * daripada membongkar engine. Interaksi: seret body (mouse constraint) + klik
 * ruang kosong men-spawn bola kecil di titik klik.
 *
 * Guardrail: runner di-stop saat tab hidden atau kanvas keluar viewport
 * (visibilitychange + IntersectionObserver), dijalankan lagi saat kembali.
 * Semua resource dibersihkan saat unmount (teardown SPA).
 */
export function useMatterGallery(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  sceneId: string,
) {
  // Ref hidup: id scene terbaru dibaca fungsi rebuild tanpa re-subscribe efek utama.
  const sceneIdRef = useRef(sceneId);
  sceneIdRef.current = sceneId;
  const rebuildRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, World } = Matter;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const engine = Engine.create();
    const render = Render.create({
      canvas, engine,
      options: { width, height, wireframes: false, background: "transparent", pixelRatio: Math.min(window.devicePixelRatio || 1, 2) },
    });
    const runner = Runner.create();

    // Mouse constraint bertahan lintas rebuild (tidak dihapus world.clear kalau
    // kita simpan & tambah ulang). Lebih sederhana: buat sekali, tambah tiap build.
    const mouse = Mouse.create(canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse, constraint: { stiffness: 0.2, render: { visible: false } },
    });
    render.mouse = mouse;

    // Bangun/rebangun isi world sesuai scene aktif.
    function build() {
      const scene = sceneById(sceneIdRef.current);
      World.clear(engine.world, false);
      engine.gravity.y = scene.gravityY ?? 1;
      const objects: SceneObjects = scene.build({ M: Matter, engine, width, height, palette: PALETTE });
      Composite.add(engine.world, objects as Matter.Body[]);
      Composite.add(engine.world, mouseConstraint);
    }
    rebuildRef.current = build;
    build();

    // Klik ruang kosong → spawn bola kecil (kecuali sedang menyeret body).
    function onMouseDown() {
      if (mouseConstraint.body) return;
      const { x, y } = mouse.position;
      Composite.add(engine.world, Bodies.circle(x, y, 16, {
        restitution: 0.5, render: { fillStyle: "#f97316", strokeStyle: "rgba(255,255,255,0.14)", lineWidth: 1 },
      }));
    }
    Matter.Events.on(mouseConstraint, "mousedown", onMouseDown);

    Runner.run(runner, engine);
    Render.run(render);

    // --- Guardrail pause: hentikan runner saat tak terlihat ---
    let running = true;
    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) Runner.run(runner, engine);
      else Runner.stop(runner);
    };
    let visible = true;
    let onscreen = true;
    const sync = () => setRunning(visible && onscreen);
    const onVis = () => { visible = !document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; sync(); }, { threshold: 0 });
    io.observe(container);

    // --- Resize: sinkron kanvas + rebuild (scene menyesuaikan ukuran baru) ---
    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      render.canvas.width = width;
      render.canvas.height = height;
      render.options.width = width;
      render.options.height = height;
      render.bounds.max.x = width;
      render.bounds.max.y = height;
      Render.setPixelRatio(render, Math.min(window.devicePixelRatio || 1, 2));
      build();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      Matter.Events.off(mouseConstraint, "mousedown", onMouseDown);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      rebuildRef.current = null;
    };
    // Engine dibuat sekali; ganti scene ditangani efek di bawah lewat rebuildRef.
  }, [canvasRef]);

  // Ganti scene: panggil rebuild tanpa membongkar engine.
  useEffect(() => {
    rebuildRef.current?.();
  }, [sceneId]);
}

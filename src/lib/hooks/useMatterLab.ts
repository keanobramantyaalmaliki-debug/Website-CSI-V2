"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { getDemo } from "@/lib/lab/demos";
import type {
  MatterLabParams,
  MatterLabControls,
  DemoContext,
} from "@/lib/lab/types";

export type { MatterLabParams, MatterLabControls } from "@/lib/lab/types";

// Palet selaras token tema (lihat src/index.css).
const ACCENT = "#f97316";
const SURFACE = "#262b33";
const LINE = "rgba(255, 255, 255, 0.12)";
const WALL_THICKNESS = 120;

/**
 * Bungkus lifecycle Matter.js dalam satu hook agar komponen React tetap tipis.
 * Engine dibangun sekali; ganti demo & ubah gravitasi mengalir lewat ref tanpa
 * membangun ulang engine. Semua resource dibersihkan saat unmount.
 */
export function useMatterLab(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  params: MatterLabParams,
  demoId: string,
  controlsRef: React.MutableRefObject<MatterLabControls | null>
) {
  // Ref hidup: nilai terbaru dibaca di dalam listener tanpa re-subscribe.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const engineRef = useRef<Matter.Engine | null>(null);
  const dimsRef = useRef({ width: 0, height: 0 });
  // demoId awal dibaca via ref agar effect setup tak bergantung padanya
  // (ganti demo ditangani effect terpisah, tanpa rebuild engine).
  const demoIdRef = useRef(demoId);
  demoIdRef.current = demoId;
  // Fungsi pemuat demo aktif; dipakai reset & saat demoId berubah.
  const loadDemoRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Common } = Matter;

    let width = container.clientWidth;
    let height = container.clientHeight;
    dimsRef.current = { width, height };

    const engine = Engine.create();
    engine.gravity.y = paramsRef.current.gravity;
    engineRef.current = engine;

    const render = Render.create({
      canvas,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      },
    });

    const runner = Runner.create();

    // Warnai body dinamis: mayoritas surface, sebagian aksen agar hidup.
    function style() {
      const accent = Common.random() > 0.72;
      return {
        fillStyle: accent ? ACCENT : SURFACE,
        strokeStyle: accent ? ACCENT : LINE,
        lineWidth: 1,
      };
    }

    function makeBody(x: number, y: number) {
      const { restitution, friction } = paramsRef.current;
      const common = { restitution, friction, render: style() };
      if (Common.random() > 0.5) return Bodies.circle(x, y, 14 + Common.random() * 22, common);
      const s = 26 + Common.random() * 34;
      return Bodies.rectangle(x, y, s, s, common);
    }

    // --- Batas statis: lantai + dua dinding samping (di luar viewport) ---
    let bounds: Matter.Body[] = [];
    function buildBounds() {
      Composite.remove(engine.world, bounds);
      const opts = { isStatic: true, render: { fillStyle: SURFACE } };
      bounds = [
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width + WALL_THICKNESS * 2, WALL_THICKNESS, opts),
        Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 3, opts),
        Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 3, opts),
      ];
      Composite.add(engine.world, bounds);
    }

    // Muat demo: hapus semua kecuali dinding + mouse, lalu bangun skenario baru.
    function loadDemo(id: string) {
      const keep = new Set<Matter.Body>(bounds);
      const remove = Composite.allBodies(engine.world).filter(
        (b) => !keep.has(b) && b !== mouseConstraint.body
      );
      Composite.remove(engine.world, remove);
      // Composite (constraint chain, cradle) ikut terhapus bila kosong; bersihkan sisa.
      for (const c of engine.world.composites.slice()) Composite.remove(engine.world, c);

      const ctx: DemoContext = {
        world: engine.world,
        width,
        height,
        params: paramsRef.current,
        style,
        makeBody,
      };
      getDemo(id).build(ctx);
    }
    loadDemoRef.current = loadDemo;

    // --- Interaksi mouse/touch: tarik & lempar ---
    const mouse = Mouse.create(canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Klik ruang kosong → spawn body baru di titik klik.
    function handleMouseDown() {
      if (mouseConstraint.body) return;
      const { x, y } = mouse.position;
      Composite.add(engine.world, makeBody(x, y));
    }
    Matter.Events.on(mouseConstraint, "mousedown", handleMouseDown);

    buildBounds();
    loadDemo(demoIdRef.current);

    Runner.run(runner, engine);
    Render.run(render);

    controlsRef.current = {
      reset: () => loadDemo(demoIdRef.current),
      spawnBurst(count: number) {
        for (let i = 0; i < count; i++) {
          const x = width / 2 + (Common.random() - 0.5) * width * 0.6;
          Composite.add(engine.world, makeBody(x, -Common.random() * 200));
        }
      },
    };

    // --- Resize: sinkronkan kanvas + rakit ulang dinding ---
    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dimsRef.current = { width, height };
      render.canvas.width = width;
      render.canvas.height = height;
      render.options.width = width;
      render.options.height = height;
      render.bounds.max.x = width;
      render.bounds.max.y = height;
      Render.setPixelRatio(render, Math.min(window.devicePixelRatio || 1, 2));
      buildBounds();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // --- Teardown lengkap ---
    return () => {
      ro.disconnect();
      Matter.Events.off(mouseConstraint, "mousedown", handleMouseDown);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      engineRef.current = null;
      loadDemoRef.current = null;
      controlsRef.current = null;
    };
    // Engine dibangun sekali; demoId & params mengalir lewat effect terpisah + ref.
  }, [canvasRef, controlsRef]);

  // Gravitasi bereaksi live tanpa membangun ulang engine.
  useEffect(() => {
    if (engineRef.current) engineRef.current.gravity.y = params.gravity;
  }, [params.gravity]);

  // Ganti demo tanpa membangun ulang engine.
  useEffect(() => {
    loadDemoRef.current?.(demoId);
  }, [demoId]);
}

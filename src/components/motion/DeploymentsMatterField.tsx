"use client";

import { useRef, useEffect } from "react";
import { useReducedMotion } from "motion/react";
import Matter from "matter-js";

const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;

const SECTORS = ["Public Services", "Infrastructure", "Logistics", "Hospitality", "Communities"];

const CHIP_FILLS = [
  "rgba(63,63,70,0.82)",
  "rgba(39,39,42,0.88)",
  "rgba(52,52,58,0.80)",
  "rgba(71,71,80,0.75)",
  "rgba(45,45,51,0.85)",
];

export default function DeploymentsMatterField() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const W = container.offsetWidth;
    const H = container.offsetHeight;
    if (W === 0 || H === 0) return;

    const engine = Engine.create({ gravity: { x: 0, y: 0 } });

    const render = Render.create({
      canvas,
      engine,
      options: { width: W, height: H, wireframes: false, background: "transparent" },
    });

    const runner = Runner.create();

    // Invisible boundary walls
    const wallOpts = {
      isStatic: true,
      render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 },
    };
    const walls = [
      Bodies.rectangle(W / 2, -30, W + 60, 60, wallOpts),
      Bodies.rectangle(W / 2, H + 30, W + 60, 60, wallOpts),
      Bodies.rectangle(-30, H / 2, 60, H + 60, wallOpts),
      Bodies.rectangle(W + 30, H / 2, 60, H + 60, wallOpts),
    ];

    // Sector chip bodies (rounded rectangles)
    const chips = SECTORS.map((sector, i) => {
      const chipW = 80 + sector.length * 5.8;
      const chipH = 26;
      const x = chipW / 2 + 20 + Math.random() * (W - chipW - 40);
      const y = chipH / 2 + 20 + Math.random() * (H - chipH - 40);
      const body = Bodies.rectangle(x, y, chipW, chipH, {
        chamfer: { radius: 13 },
        restitution: 0.88,
        friction: 0,
        frictionAir: 0.003,
        render: { fillStyle: CHIP_FILLS[i] },
      });
      const speed = 0.5 + Math.random() * 0.9;
      const angle = Math.random() * Math.PI * 2;
      Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.012);
      return body;
    });

    // Decorative small dots
    const dots = Array.from({ length: 14 }, () => {
      const r = 2 + Math.random() * 4;
      const x = r + 10 + Math.random() * (W - r * 2 - 20);
      const y = r + 10 + Math.random() * (H - r * 2 - 20);
      const body = Bodies.circle(x, y, r, {
        restitution: 1,
        friction: 0,
        frictionAir: 0.001,
        render: { fillStyle: "rgba(82,82,91,0.55)" },
      });
      const speed = 0.25 + Math.random() * 0.5;
      const angle = Math.random() * Math.PI * 2;
      Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
      return body;
    });

    // Overlay sector label text on each chip after Matter draws bodies
    const drawLabels = () => {
      const ctx = render.context;
      ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(212,212,216,0.65)";
      chips.forEach((chip, i) => {
        ctx.save();
        ctx.translate(chip.position.x, chip.position.y);
        ctx.rotate(chip.angle);
        ctx.fillText(SECTORS[i], 0, 0);
        ctx.restore();
      });
    };

    Events.on(render, "afterRender", drawLabels);
    Composite.add(engine.world, [...walls, ...chips, ...dots]);
    Render.run(render);
    Runner.run(runner, engine);

    return () => {
      Events.off(render, "afterRender", drawLabels);
      Runner.stop(runner);
      Render.stop(render);
      Engine.clear(engine);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(39,39,42,0.25) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style={{
        maskImage:
          "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
        opacity: 0.22,
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { useReducedMotion } from "motion/react";
import Matter from "matter-js";

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = Matter;

const BALLS = [
  { num: "01", fill: "#27272a" },
  { num: "02", fill: "#3f3f46" },
  { num: "03", fill: "#52525b" },
  { num: "04", fill: "#3f3f46" },
  { num: "05", fill: "#f97316" },
];

const RADIUS = 28;
const STRIP_H = 180;

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
    const H = STRIP_H;

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
      Bodies.rectangle(W / 2, -25, W + 60, 50, wallOpts),
      Bodies.rectangle(W / 2, H + 25, W + 60, 50, wallOpts),
      Bodies.rectangle(-25, H / 2, 50, H + 60, wallOpts),
      Bodies.rectangle(W + 25, H / 2, 50, H + 60, wallOpts),
    ];

    // 5 numbered balls — evenly spread, random scatter velocity
    const balls = BALLS.map(({ num, fill }, i) => {
      const x = RADIUS + 20 + (i / (BALLS.length - 1)) * (W - (RADIUS + 20) * 2);
      const y = H / 2 + (Math.random() - 0.5) * (H / 2 - RADIUS - 10);
      const body = Bodies.circle(x, y, RADIUS, {
        restitution: 0.85,
        friction: 0,
        frictionAir: 0.008,
        render: { fillStyle: fill },
      });
      const speed = 2.5 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
      return { body, num };
    });

    // Draw numeral on each ball after Matter renders bodies
    const drawLabels = () => {
      const ctx = render.context;
      ctx.font = '600 12px ui-monospace, "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      balls.forEach(({ body, num }) => {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.fillText(num, 0, 0);
        ctx.restore();
      });
    };

    Events.on(render, "afterRender", drawLabels);

    // Mouse constraint — grab and throw
    const mouse = Mouse.create(render.canvas);
    // Release scroll so the page can still scroll normally
    const mw = (mouse as any).mousewheel as EventListener | undefined;
    if (mw) {
      mouse.element.removeEventListener("mousewheel", mw);
      mouse.element.removeEventListener("DOMMouseScroll", mw);
    }

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    (render as any).mouse = mouse;

    Composite.add(engine.world, [...walls, ...balls.map((b) => b.body), mouseConstraint]);
    Render.run(render);
    Runner.run(runner, engine);

    return () => {
      Events.off(render, "afterRender", drawLabels);
      Runner.stop(runner);
      Render.stop(render);
      Engine.clear(engine);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={containerRef}
      className="relative mt-8 w-full overflow-hidden rounded-sm"
      style={{ height: STRIP_H, cursor: "grab" }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

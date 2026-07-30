"use client";

import { useRef, useLayoutEffect } from "react";
import { useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Matter from "matter-js";

const { Engine, Runner, Bodies, Composite, Constraint, Events } = Matter;

interface Props {
  text: string;
  className?: string;
}

export default function PhysicsHeading({ text, className }: Props) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const words = text.split(" ");

  useLayoutEffect(() => {
    if (reduced) return;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const W = containerRect.width;
    const H = containerRect.height;

    // Measure each word's center relative to the container top-left
    const homes: { x: number; y: number; w: number; h: number }[] = [];
    wordRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      homes.push({
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top + r.height / 2,
        w: r.width,
        h: r.height,
      });
    });

    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const runner = Runner.create();

    // One physics body per word, sized to match its rendered bounding box
    const bodies = homes.map(({ x, y, w, h }) =>
      Bodies.rectangle(x, y, Math.max(w, 10), Math.max(h, 10), {
        frictionAir: 0.06,
        restitution: 0.3,
        friction: 0.1,
      })
    );

    // Spring constraint: each body is tethered to its home position
    const springs = bodies.map((body, i) =>
      Constraint.create({
        bodyA: body,
        pointB: { x: homes[i].x, y: homes[i].y },
        stiffness: 0.06,
        damping: 0.3,
        length: 0,
      })
    );

    // Floor 220px below heading (words pile up here before snapping back)
    const wallOpts = { isStatic: true, render: { visible: false } };
    const walls = [
      Bodies.rectangle(W / 2, H + 220 + 25, W + 60, 50, wallOpts),
      Bodies.rectangle(-25, H / 2, 50, H + 600, wallOpts),
      Bodies.rectangle(W + 25, H / 2, 50, H + 600, wallOpts),
    ];

    Composite.add(engine.world, [...bodies, ...springs, ...walls]);
    Runner.run(runner, engine);

    // Drive span transforms directly from physics — no React re-render
    Events.on(engine, "afterUpdate", () => {
      bodies.forEach((body, i) => {
        const el = wordRefs.current[i];
        if (!el) return;
        const dx = body.position.x - homes[i].x;
        const dy = body.position.y - homes[i].y;
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${body.angle}rad)`;
      });
    });

    const fall = () => {
      engine.gravity.y = 2.5;
      springs.forEach((s) => { s.stiffness = 0; });
    };

    const restore = () => {
      engine.gravity.y = 0;
      springs.forEach((s) => { s.stiffness = 0.06; });
    };

    container.addEventListener("mousedown", fall);
    container.addEventListener("touchstart", fall, { passive: true });
    window.addEventListener("mouseup", restore);
    window.addEventListener("touchend", restore);
    container.addEventListener("mouseleave", restore);

    return () => {
      Events.off(engine, "afterUpdate");
      Runner.stop(runner);
      Engine.clear(engine);
      container.removeEventListener("mousedown", fall);
      container.removeEventListener("touchstart", fall);
      window.removeEventListener("mouseup", restore);
      window.removeEventListener("touchend", restore);
      container.removeEventListener("mouseleave", restore);
    };
  }, [reduced]);

  // Reduced motion: render normally with LineMask
  if (reduced) {
    return (
      <h2 className={className}>
        <LineMask>{text}</LineMask>
      </h2>
    );
  }

  return (
    <div ref={containerRef} style={{ cursor: "pointer" }}>
      <h2 className={className}>
        {words.map((word, i) => (
          <span
            key={i}
            ref={(el) => { wordRefs.current[i] = el; }}
            style={{
              display: "inline-block",
              marginRight: i < words.length - 1 ? "0.28em" : 0,
              willChange: "transform",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {word}
          </span>
        ))}
      </h2>
    </div>
  );
}

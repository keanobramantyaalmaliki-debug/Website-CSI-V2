"use client";

import { useRef, useLayoutEffect } from "react";
import { useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Matter from "matter-js";

const { Engine, Runner, Bodies, Body, Composite, Events } = Matter;

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

    // Measure each word's center relative to container
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

    const bodies = homes.map(({ x, y, w, h }) =>
      Bodies.rectangle(x, y, Math.max(w, 10), Math.max(h, 10), {
        frictionAir: 0.01,  // near-zero air drag → realistic free fall
        restitution: 0.45,
        friction: 0.05,
      })
    );

    // Floor 260px below heading, side walls
    const wallOpts = { isStatic: true, render: { visible: false } };
    const walls = [
      Bodies.rectangle(W / 2, H + 260 + 25, W + 60, 50, wallOpts),
      Bodies.rectangle(-25, H / 2, 50, H + 700, wallOpts),
      Bodies.rectangle(W + 25, H / 2, 50, H + 700, wallOpts),
    ];

    Composite.add(engine.world, [...bodies, ...walls]);
    Runner.run(runner, engine);

    let physicsActive = false;

    // Drive span transforms directly from physics — no React re-render
    Events.on(engine, "afterUpdate", () => {
      if (!physicsActive) return;
      bodies.forEach((body, i) => {
        const el = wordRefs.current[i];
        if (!el) return;
        const dx = body.position.x - homes[i].x;
        const dy = body.position.y - homes[i].y;
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${body.angle}rad)`;
      });
    });

    const fall = () => {
      if (physicsActive) return;
      physicsActive = true;

      // Clear any CSS transition so physics drives freely
      wordRefs.current.forEach((el) => {
        if (el) el.style.transition = "none";
      });

      // Reset to home first in case of rapid re-hover
      bodies.forEach((body, i) => {
        Body.setPosition(body, { x: homes[i].x, y: homes[i].y });
        Body.setAngle(body, 0);
      });

      // Strong gravity → realistic fast fall
      engine.gravity.y = 10;

      // Give each word a random nudge + tumble so they don't fall in a column
      bodies.forEach((body) => {
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 0 });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
      });
    };

    const restore = () => {
      if (!physicsActive) return;
      physicsActive = false;
      engine.gravity.y = 0;

      // Silently teleport bodies back to home
      bodies.forEach((body, i) => {
        Body.setPosition(body, { x: homes[i].x, y: homes[i].y });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngle(body, 0);
        Body.setAngularVelocity(body, 0);
      });

      // CSS transition from current visual position back to exact origin
      requestAnimationFrame(() => {
        wordRefs.current.forEach((el) => {
          if (!el) return;
          el.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translate(0px, 0px) rotate(0rad)";
        });
      });
    };

    container.addEventListener("mouseenter", fall);
    container.addEventListener("mouseleave", restore);

    return () => {
      Events.off(engine, "afterUpdate");
      Runner.stop(runner);
      Engine.clear(engine);
      container.removeEventListener("mouseenter", fall);
      container.removeEventListener("mouseleave", restore);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <h2 className={className}>
        <LineMask>{text}</LineMask>
      </h2>
    );
  }

  return (
    <div ref={containerRef}>
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

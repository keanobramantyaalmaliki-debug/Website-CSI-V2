import Matter from "matter-js";
import type { Demo, DemoContext } from "./types";

const { Bodies, Composite, Composites, Constraint, Common } = Matter;

const ACCENT = "#f97316";

/**
 * Registry skenario fisika untuk /matterjs-lab. Tiap demo hanya mengisi world;
 * dinding batas & interaksi mouse ditangani hook. Ditulis meniru contoh resmi
 * Matter.js (stack, pyramid, newtonsCradle, dst) tapi diwarnai token tema.
 */

function stack({ world, width, makeBody }: DemoContext) {
  const cols = Math.max(4, Math.floor(width / 90));
  Composite.add(
    world,
    Composites.stack(width / 2 - (cols * 60) / 2, 60, cols, 5, 8, 8, (x: number, y: number) =>
      makeBody(x, y)
    )
  );
}

function circleStack({ world, width, params, style }: DemoContext) {
  const cols = Math.max(4, Math.floor(width / 90));
  Composite.add(
    world,
    Composites.stack(width / 2 - (cols * 56) / 2, 60, cols, 5, 8, 8, (x: number, y: number) =>
      Bodies.circle(x, y, 22, { restitution: params.restitution, friction: params.friction, render: style() })
    )
  );
}

function mixedShapes({ world, width, params, style }: DemoContext) {
  const cols = Math.max(4, Math.floor(width / 100));
  Composite.add(
    world,
    Composites.stack(width / 2 - (cols * 70) / 2, 60, cols, 4, 10, 10, (x: number, y: number) => {
      const opts = { restitution: params.restitution, friction: params.friction, render: style() };
      const sides = Math.round(Common.random(1, 8));
      switch (Math.round(Common.random(0, 2))) {
        case 0:
          return Bodies.rectangle(x, y, Common.random(30, 60), Common.random(30, 60), opts);
        case 1:
          return Bodies.circle(x, y, Common.random(16, 30), opts);
        default:
          return Bodies.polygon(x, y, sides < 3 ? 3 : sides, Common.random(20, 34), opts);
      }
    })
  );
}

function pyramid({ world, width, params, style }: DemoContext) {
  const rows = 8;
  Composite.add(
    world,
    Composites.pyramid(width / 2 - (rows * 42) / 2, 60, rows, rows, 0, 0, (x: number, y: number) =>
      Bodies.rectangle(x, y, 40, 40, {
        restitution: params.restitution,
        friction: params.friction,
        render: style(),
      })
    )
  );
}

function ballPool({ world, width, height, params, style }: DemoContext) {
  const count = Math.floor((width * height) / 14000);
  for (let i = 0; i < count; i++) {
    Composite.add(
      world,
      Bodies.circle(Common.random(40, width - 40), Common.random(40, height - 120), Common.random(12, 26), {
        restitution: Math.max(0.4, params.restitution),
        friction: params.friction,
        render: style(),
      })
    );
  }
}

function newtonsCradle({ world, width, height }: DemoContext) {
  const n = 5;
  const r = 26;
  const sep = r * 2;
  const startX = width / 2 - (sep * (n - 1)) / 2;
  const topY = height * 0.18;
  const length = height * 0.42;
  const cradle = Composite.create({ label: "cradle" });
  for (let i = 0; i < n; i++) {
    const x = startX + i * sep;
    const ball = Bodies.circle(x, topY + length, r, {
      inertia: Infinity,
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      slop: 1,
      render: { fillStyle: i === 0 ? ACCENT : "#262b33" },
    });
    Composite.add(cradle, ball);
    Composite.add(
      cradle,
      Constraint.create({
        pointA: { x, y: topY },
        bodyB: ball,
        stiffness: 1,
        length: 0,
        render: { strokeStyle: "rgba(255,255,255,0.25)" },
      })
    );
  }
  // Angkat bola pertama agar langsung berayun.
  const first = Composite.allBodies(cradle)[0];
  Matter.Body.translate(first, { x: -length * 0.6, y: -length * 0.35 });
  Composite.add(world, cradle);
}

function chains({ world, width, height, style }: DemoContext) {
  const group = Matter.Body.nextGroup(true);
  const y = height * 0.2;
  const rope = Composites.stack(width / 2 - 150, y, 8, 1, 6, 0, (x: number, cy: number) =>
    Bodies.rectangle(x, cy, 44, 14, { collisionFilter: { group }, render: style() })
  );
  Composites.chain(rope, 0.5, 0, -0.5, 0, {
    stiffness: 0.8,
    length: 2,
    render: { strokeStyle: "rgba(255,255,255,0.2)" },
  });
  Composite.add(rope, [
    Constraint.create({
      bodyB: Composite.allBodies(rope)[0],
      pointB: { x: -22, y: 0 },
      pointA: { x: Composite.allBodies(rope)[0].position.x, y },
      stiffness: 0.9,
      length: 0,
    }),
  ]);
  Composite.add(world, rope);
}

function bridge({ world, width, height, style }: DemoContext) {
  const group = Matter.Body.nextGroup(true);
  const y = height * 0.5;
  const links = 12;
  const gap = Math.min(40, (width * 0.7) / links);
  const startX = width / 2 - (links * gap) / 2;
  const bridgeComposite = Composites.stack(startX, y, links, 1, 0, 0, (x: number, by: number) =>
    Bodies.rectangle(x, by, gap * 1.1, 16, {
      collisionFilter: { group },
      chamfer: { radius: 4 },
      density: 0.004,
      frictionAir: 0.03,
      render: style(),
    })
  );
  Composites.chain(bridgeComposite, 0.3, 0, -0.3, 0, {
    stiffness: 0.9,
    length: 0,
    render: { strokeStyle: "rgba(255,255,255,0.15)" },
  });
  const bodies = Composite.allBodies(bridgeComposite);
  Composite.add(bridgeComposite, [
    Constraint.create({ pointA: { x: startX - gap / 2, y }, bodyB: bodies[0], pointB: { x: -gap / 2, y: 0 }, stiffness: 0.9, length: 0 }),
    Constraint.create({ pointA: { x: startX + links * gap - gap / 2, y }, bodyB: bodies[bodies.length - 1], pointB: { x: gap / 2, y: 0 }, stiffness: 0.9, length: 0 }),
  ]);
  Composite.add(world, bridgeComposite);
  // Bola berat untuk membebani jembatan.
  Composite.add(world, Bodies.circle(width / 2, y - 120, 34, { density: 0.02, render: { fillStyle: ACCENT } }));
}

function restitution({ world, width, height, style }: DemoContext) {
  const levels = [0, 0.25, 0.5, 0.75, 1];
  const gap = width / (levels.length + 1);
  levels.forEach((r, i) => {
    Composite.add(
      world,
      Bodies.circle(gap * (i + 1), height * 0.15, 26, {
        restitution: r,
        friction: 0.02,
        render: r >= 0.75 ? { fillStyle: ACCENT } : style(),
      })
    );
  });
}

export const DEMOS: Demo[] = [
  { id: "stack", name: "Stack", build: stack },
  { id: "circle-stack", name: "Circle Stack", build: circleStack },
  { id: "mixed-shapes", name: "Mixed Shapes", build: mixedShapes },
  { id: "pyramid", name: "Pyramid", build: pyramid },
  { id: "ball-pool", name: "Ball Pool", build: ballPool },
  { id: "newtons-cradle", name: "Newton's Cradle", build: newtonsCradle },
  { id: "chains", name: "Chains", build: chains },
  { id: "bridge", name: "Bridge", build: bridge },
  { id: "restitution", name: "Restitution", build: restitution },
];

export const DEFAULT_DEMO_ID = "stack";

export function getDemo(id: string): Demo {
  return DEMOS.find((d) => d.id === id) ?? DEMOS[0];
}

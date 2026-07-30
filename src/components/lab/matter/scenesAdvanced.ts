/**
 * scenesAdvanced — 5 scene Matter.js lanjutan (constraint, soft-body, tuas,
 * ayunan, zero-G). Menunjukkan Composites.chain/mesh, Constraint, dan gravitasi
 * non-standar. Lihat sceneKit.ts untuk kontrak Scene.
 */
import type { Scene } from "./sceneKit";
import { bodyRender, staticRender, makeWalls, PALETTE } from "./sceneKit";

/** 6 — Chain Bridge: rantai body tersambung, kedua ujung dipaku. */
const chainBridge: Scene = {
  id: "chain-bridge",
  label: "6 · Chain Bridge",
  hint: "seret bagian tengah jembatan lalu jatuhkan benda ke atasnya",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const y = height * 0.4;
    const links = Math.max(8, Math.floor(width / 60));
    const linkW = width / (links + 2);
    const bridge = M.Composites.stack(linkW, y, links, 1, 0, 0, (x: number, yy: number) =>
      M.Bodies.rectangle(x, yy, linkW * 1.05, 14, { collisionFilter: { group: -1 }, friction: 0.8, render: staticRender(PALETTE.surface) }),
    );
    M.Composites.chain(bridge, 0.5, 0, -0.5, 0, { stiffness: 0.9, length: 0, render: { strokeStyle: PALETTE.muted, lineWidth: 1 } });
    // Paku ujung kiri & kanan ke titik tetap.
    const bodies = bridge.bodies;
    objects.push(
      M.Constraint.create({ pointA: { x: linkW * 0.5, y }, bodyB: bodies[0], pointB: { x: -linkW * 0.5, y: 0 }, stiffness: 1 }),
      M.Constraint.create({ pointA: { x: width - linkW * 0.5, y }, bodyB: bodies[bodies.length - 1], pointB: { x: linkW * 0.5, y: 0 }, stiffness: 1 }),
      bridge,
    );
    // Beberapa bola untuk dijatuhkan ke jembatan.
    for (let i = 0; i < 5; i++) {
      objects.push(M.Bodies.circle(width / 2 + (i - 2) * 40, 60, 18, { restitution: 0.3, render: bodyRender(M, 0.4) }));
    }
    return objects;
  },
};

/** 7 — Cloth: grid soft-body dari partikel bersambung mesh, dipaku baris atas. */
const cloth: Scene = {
  id: "cloth",
  label: "7 · Cloth",
  hint: "seret kain · jatuhkan bola untuk melihatnya melar",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx, { ceiling: false });
    const cols = 16;
    const rows = 11;
    const gap = Math.min(26, (width * 0.6) / cols);
    const startX = width / 2 - (cols * gap) / 2;
    const particleR = gap * 0.28;
    const clothComposite = M.Composites.stack(startX, 70, cols, rows, gap - particleR * 2, gap - particleR * 2, (x: number, y: number) =>
      M.Bodies.circle(x, y, particleR, { inertia: Infinity, friction: 0.00001, collisionFilter: { group: -1 }, render: bodyRender(M, 0.12) }),
    );
    M.Composites.mesh(clothComposite, cols, rows, false, { stiffness: 0.5, render: { strokeStyle: PALETTE.line, lineWidth: 1 } });
    // Paku deret partikel teratas supaya kain menggantung.
    for (let c = 0; c < cols; c++) {
      const p = clothComposite.bodies[c];
      if (p) p.isStatic = true;
    }
    objects.push(clothComposite);
    objects.push(M.Bodies.circle(width / 2, height * 0.85, 34, { restitution: 0.2, render: bodyRender(M, 1) }));
    return objects;
  },
};

/** 8 — Seesaw: papan di atas pivot, lempar bola ke satu ujung. */
const seesaw: Scene = {
  id: "seesaw",
  label: "8 · Seesaw",
  hint: "jatuhkan bola berat ke satu sisi papan jungkat",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const pivotX = width / 2;
    const pivotY = height - 120;
    const plankW = Math.min(width * 0.7, 560);
    const plank = M.Bodies.rectangle(pivotX, pivotY, plankW, 16, { friction: 0.9, render: staticRender(PALETTE.accent) });
    objects.push(plank);
    objects.push(M.Constraint.create({ pointA: { x: pivotX, y: pivotY }, bodyB: plank, pointB: { x: 0, y: 0 }, stiffness: 1, length: 0 }));
    // Segitiga pivot dekoratif (statis).
    objects.push(M.Bodies.polygon(pivotX, pivotY + 22, 3, 30, { isStatic: true, angle: Math.PI, render: staticRender(PALETTE.muted) }));
    // Bola ringan sudah menunggu di ujung kiri, bola berat siap dijatuhkan dari kanan atas.
    objects.push(M.Bodies.circle(pivotX - plankW / 2 + 40, pivotY - 30, 20, { render: bodyRender(M, 0.3) }));
    objects.push(M.Bodies.circle(pivotX + plankW / 2 - 40, 80, 34, { density: 0.02, render: bodyRender(M, 1) }));
    return objects;
  },
};

/** 9 — Wrecking Ball: bola berat mengayun menghantam menara balok. */
const wreckingBall: Scene = {
  id: "wrecking-ball",
  label: "9 · Wrecking Ball",
  hint: "tarik bola besar ke belakang lalu lepas ke arah menara",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    // Menara balok di kanan.
    const towerX = width * 0.72;
    const bw = 34;
    const rows = 7;
    const tower = M.Composites.stack(towerX, height - 60 - rows * bw, 2, rows, 0, 0, (x: number, y: number) =>
      M.Bodies.rectangle(x, y, bw, bw, { friction: 0.6, render: bodyRender(M, 0.2) }),
    );
    objects.push(tower);
    // Bola berat digantung dari kiri atas.
    const anchor = { x: width * 0.18, y: height * 0.15 };
    const ball = M.Bodies.circle(anchor.x, anchor.y + height * 0.4, 46, { density: 0.06, render: bodyRender(M, 1) });
    objects.push(ball);
    objects.push(M.Constraint.create({ pointA: anchor, bodyB: ball, stiffness: 0.06, damping: 0.02, render: { strokeStyle: PALETTE.muted, lineWidth: 2 } }));
    return objects;
  },
};

/** 10 — Zero Gravity: gravitasi nol, benda melayang & mantul 4 dinding. */
const zeroGravity: Scene = {
  id: "zero-gravity",
  label: "10 · Zero-G",
  hint: "seret & lempar — tanpa gravitasi, benda melayang terus",
  gravityY: 0,
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx, { ceiling: true });
    const n = 22;
    for (let i = 0; i < n; i++) {
      const x = 60 + M.Common.random() * (width - 120);
      const y = 60 + M.Common.random() * (height - 120);
      const body = M.Common.random() < 0.5
        ? M.Bodies.circle(x, y, 14 + M.Common.random() * 20, { restitution: 1, friction: 0, frictionAir: 0, render: bodyRender(M) })
        : M.Bodies.rectangle(x, y, 30 + M.Common.random() * 24, 30 + M.Common.random() * 24, { restitution: 1, friction: 0, frictionAir: 0, render: bodyRender(M) });
      M.Body.setVelocity(body, { x: (M.Common.random() - 0.5) * 8, y: (M.Common.random() - 0.5) * 8 });
      M.Body.setAngularVelocity(body, (M.Common.random() - 0.5) * 0.2);
      objects.push(body);
    }
    return objects;
  },
};

export const ADVANCED_SCENES: Scene[] = [chainBridge, cloth, seesaw, wreckingBall, zeroGravity];

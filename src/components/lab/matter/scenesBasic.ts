/**
 * scenesBasic — 5 scene Matter.js pertama (jatuh, tumpuk, pendulum, robohan).
 * Lihat sceneKit.ts untuk kontrak Scene. Angka dipilih agar terasa enak, bukan
 * akurasi fisika nyata — ini demo interaktif.
 */
import type { Scene, SceneCtx } from "./sceneKit";
import { bodyRender, staticRender, makeWalls, PALETTE } from "./sceneKit";

/** 1 — Mixed Drop: bentuk campur jatuh & menumpuk (klasik brm.io #mixed). */
const mixedDrop: Scene = {
  id: "mixed-drop",
  label: "1 · Mixed Drop",
  hint: "seret untuk melempar · klik ruang kosong untuk menjatuhkan bentuk",
  build: (ctx) => {
    const { M, width } = ctx;
    const objects = makeWalls(ctx);
    const cols = Math.max(4, Math.floor(width / 130));
    const stack = M.Composites.stack(width / 2 - (cols * 62) / 2, 40, cols, 5, 14, 14,
      (x: number, y: number) => {
        const roll = M.Common.random();
        const render = bodyRender(M);
        if (roll < 0.34) return M.Bodies.circle(x, y, 16 + M.Common.random() * 18, { restitution: 0.4, render });
        if (roll < 0.67) return M.Bodies.rectangle(x, y, 34, 34, { restitution: 0.3, render });
        return M.Bodies.polygon(x, y, 3 + Math.floor(M.Common.random() * 4), 20 + M.Common.random() * 14, { restitution: 0.3, render });
      });
    objects.push(stack);
    return objects;
  },
};

/** 2 — Pyramid: piramida box rapi, tinggal dirobohkan. */
const pyramid: Scene = {
  id: "pyramid",
  label: "2 · Pyramid",
  hint: "seret sebuah balok untuk meruntuhkan piramida",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const rows = 8;
    const size = Math.min(46, (width * 0.6) / rows);
    const pyr = M.Composites.pyramid(
      width / 2 - (rows * size) / 2, height - 60 - rows * size, rows, rows, 0, 0,
      (x: number, y: number) => M.Bodies.rectangle(x, y, size, size, { friction: 0.6, render: bodyRender(M) }),
    );
    objects.push(pyr);
    return objects;
  },
};

/** 3 — Newton's Cradle: transfer momentum lewat pendulum bersambung. */
const newtonsCradle: Scene = {
  id: "newtons-cradle",
  label: "3 · Newton's Cradle",
  hint: "tarik bola paling ujung lalu lepas",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const n = 6;
    const r = 26;
    const sep = r * 2;
    const startX = width / 2 - (n * sep) / 2 + r;
    const topY = height * 0.2;
    const length = height * 0.42;
    for (let i = 0; i < n; i++) {
      const x = startX + i * sep;
      const bob = M.Bodies.circle(x, topY + length, r, {
        inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0,
        slop: sep * 0.02, render: { fillStyle: i === 0 ? PALETTE.accent : PALETTE.surfaceLight, strokeStyle: PALETTE.line, lineWidth: 1 },
      });
      const link = M.Constraint.create({
        pointA: { x, y: topY }, bodyB: bob, stiffness: 1,
        render: { strokeStyle: PALETTE.muted, lineWidth: 1 },
      });
      objects.push(bob, link);
    }
    return objects;
  },
};

/** 4 — Dominoes: deret kartu tipis, robohan beruntun. */
const dominoes: Scene = {
  id: "dominoes",
  label: "4 · Dominoes",
  hint: "dorong domino pertama untuk memulai reaksi berantai",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const groundY = height - 60;
    const w = 12;
    const h = 78;
    const gap = h * 0.62;
    const count = Math.max(6, Math.floor((width * 0.8) / gap));
    const startX = width / 2 - (count * gap) / 2;
    for (let i = 0; i < count; i++) {
      objects.push(
        M.Bodies.rectangle(startX + i * gap, groundY - h / 2, w, h, {
          friction: 0.6, render: bodyRender(M, i === 0 ? 1 : 0.15),
        }),
      );
    }
    // Bola pemicu kecil menggantung di kiri (biar ada yang mendorong domino awal).
    objects.push(M.Bodies.circle(startX - gap, groundY - h - 40, 18, { restitution: 0.3, render: bodyRender(M, 1) }));
    return objects;
  },
};

/** 5 — Plinko: papan peg statis, bola menetes dari atas (pachinko). */
const plinko: Scene = {
  id: "plinko",
  label: "5 · Plinko",
  hint: "klik di atas untuk menjatuhkan bola ke papan pin",
  build: (ctx) => {
    const { M, width, height } = ctx;
    const objects = makeWalls(ctx);
    const rows = 7;
    const cols = Math.max(5, Math.floor(width / 90));
    const gapX = width / (cols + 1);
    const gapY = (height * 0.62) / rows;
    const pegR = 7;
    for (let row = 0; row < rows; row++) {
      const offset = row % 2 === 0 ? 0 : gapX / 2;
      for (let c = 0; c < cols; c++) {
        const x = gapX * (c + 1) + offset - gapX / 2;
        const y = 90 + row * gapY;
        if (x < 20 || x > width - 20) continue;
        objects.push(M.Bodies.circle(x, y, pegR, { isStatic: true, render: staticRender(PALETTE.muted) }));
      }
    }
    // Beberapa bola awal.
    for (let i = 0; i < 5; i++) {
      objects.push(M.Bodies.circle(width / 2 + (M.Common.random() - 0.5) * 40, -i * 40, 12, { restitution: 0.5, friction: 0.02, render: bodyRender(M, 0.5) }));
    }
    return objects;
  },
};

export const BASIC_SCENES: Scene[] = [mixedDrop, pyramid, newtonsCradle, dominoes, plinko];
export type { SceneCtx };

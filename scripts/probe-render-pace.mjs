/**
 * Verifikasi cap 30 fps idle (renderPace.ts) + resolusi render (Scene.tsx DPR)
 * lewat CDP — tanpa dependency, pola sama dengan measure-frames.mjs.
 *
 *   node scripts/probe-render-pace.mjs [url]
 *
 * Yang diperiksa:
 *   1. drawn/ticks dari window.__renderPace: ≈0,5 saat idle (tiap 2 tick),
 *      ≈1,0 selama pointer digerakkan.
 *   2. Buffer canvas = ukuran CSS × DPR yang diminta (default 1), dan
 *      style image-rendering = pixelated.
 *
 * Browser: Brave (bukan Chrome) — CDP-nya identik, cuma beda path.
 * Peringatan renderer yang sama dengan measure-frames.mjs berlaku: headless
 * bisa jatuh ke SwiftShader; untuk probe ini tidak masalah karena yang diukur
 * RASIO tick, bukan frame time.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const URL = process.argv[2] ?? "http://localhost:3000/";

const brave = spawn(
  BRAVE,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-pace-profile",
    "--window-size=1440,900",
    "--force-device-scale-factor=2",
    URL,
  ],
  { stdio: "ignore" },
);

const json = (path) =>
  new Promise((res, rej) => {
    httpGet({ host: "127.0.0.1", port: PORT, path }, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await json("/json");
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* belum siap */
    }
    await sleep(500);
  }
  throw new Error("CDP tidak bisa dihubungi");
}

let msgId = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function main() {
  const wsUrl = await connect();
  // WebSocket global Node ≥22 — pola yang sama dengan measure-frames.mjs.
  ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).res(msg.result ?? {});
      pending.delete(msg.id);
    }
  });

  // Tunggu scene siap: __renderPace terpasang DAN tick-nya mengalir.
  process.stdout.write("menunggu scene siap ");
  for (let i = 0; i < 120; i++) {
    const ticks = await evaluate(
      "window.__renderPace ? window.__renderPace().ticks : -1",
    );
    if (ticks > 60) break;
    process.stdout.write(".");
    await sleep(1000);
  }
  console.log(" ok");

  // Tunggu sapuan reveal selesai + grace 1 dtk habis, baru ukur idle.
  await sleep(8000);

  // ── 1. Rasio idle ────────────────────────────────────────────────────────
  const a = await evaluate("window.__renderPace()");
  await sleep(3000);
  const b = await evaluate("window.__renderPace()");
  const idleRatio = (b.drawn - a.drawn) / (b.ticks - a.ticks);
  console.log(
    `idle   : ${b.ticks - a.ticks} tick, ${b.drawn - a.drawn} digambar → rasio ${idleRatio.toFixed(2)} (target ≈0,50)`,
  );

  // ── 2. Rasio saat pointer bergerak ───────────────────────────────────────
  const c = await evaluate("window.__renderPace()");
  const t0 = Date.now();
  let x = 400;
  while (Date.now() - t0 < 3000) {
    x = x === 400 ? 600 : 400;
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y: 300,
    });
    await sleep(50);
  }
  const d = await evaluate("window.__renderPace()");
  const activeRatio = (d.drawn - c.drawn) / (d.ticks - c.ticks);
  console.log(
    `pointer: ${d.ticks - c.ticks} tick, ${d.drawn - c.drawn} digambar → rasio ${activeRatio.toFixed(2)} (target ≈1,00)`,
  );

  // ── 3. DPR & pixelated ───────────────────────────────────────────────────
  const canvasInfo = await evaluate(`(() => {
    const cv = document.querySelector("canvas");
    if (!cv) return null;
    return {
      buffer: [cv.width, cv.height],
      css: [cv.clientWidth, cv.clientHeight],
      devicePixelRatio: window.devicePixelRatio,
      imageRendering: cv.style.imageRendering,
    };
  })()`);
  console.log("canvas :", JSON.stringify(canvasInfo));

  const pass =
    idleRatio > 0.4 &&
    idleRatio < 0.6 &&
    activeRatio > 0.9 &&
    canvasInfo &&
    canvasInfo.imageRendering === "pixelated" &&
    Math.abs(canvasInfo.buffer[0] - canvasInfo.css[0]) <= 2;
  console.log(pass ? "\nPASS" : "\nFAIL");
  process.exitCode = pass ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    brave.kill();
    process.exit();
  });

/**
 * Probe QC zoom-out: emulasi browser zoom-out lewat CDP lalu rekam tampilan
 * DAN ongkosnya sekaligus.
 *
 *   node scripts/probe-zoom-out.mjs [url] [zoom] [outdir]
 *
 * Browser zoom-out di Retina = viewport CSS membesar + devicePixelRatio turun
 * (zoom 50% pada dpr 2 → viewport 2880×1800 CSS px, dpr 1). Skrip ini meniru
 * itu lewat Emulation.setDeviceMetricsOverride, lalu:
 *   - screenshot di beberapa posisi scroll (bukti visual asset berantakan)
 *   - baca ukuran fisik canvas 3D (bukti beban piksel)
 *   - ukur frame time rAF (bukti frame drop)
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9226;
const URL = process.argv[2] ?? "http://localhost:3001/";
const ZOOM = Number(process.argv[3] ?? 0.5); // 0.5 = zoom 50%
const OUTDIR = process.argv[4] ?? "/tmp/zoomqc";
const BASE_DPR = 2; // Retina
const BASE_W = 1440;
const BASE_H = 900;

mkdirSync(OUTDIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-zoomqc-profile",
    `--window-size=${BASE_W},${BASE_H}`,
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

async function main() {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await json("/json/list");
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch {}
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
    if (m.method === "Runtime.exceptionThrown") {
      consoleErrors.push(
        m.params?.exceptionDetails?.exception?.description ?? "exception",
      );
    }
  });
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return r?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  // Emulasi zoom-out: viewport CSS membesar, dpr mengecil.
  const cssW = Math.round(BASE_W / ZOOM);
  const cssH = Math.round(BASE_H / ZOOM);
  const dsf = BASE_DPR * ZOOM;
  await send("Emulation.setDeviceMetricsOverride", {
    width: cssW,
    height: cssH,
    deviceScaleFactor: dsf,
    mobile: false,
  });
  await send("Page.reload");
  await sleep(14000); // GLB + shader + reveal + loader fade

  const env = await evaluate(`(() => {
    const c = document.querySelector('canvas');
    const r = c?.getBoundingClientRect();
    return {
      innerW: innerWidth, innerH: innerHeight, dpr: devicePixelRatio,
      canvasPhysical: c ? { w: c.width, h: c.height, mpx: +((c.width*c.height)/1e6).toFixed(2) } : null,
      canvasCss: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      docHeight: document.documentElement.scrollHeight,
      canvasCount: document.querySelectorAll('canvas').length,
    };
  })()`);
  console.log("env:", JSON.stringify(env));

  // Frame time di hero (canvas 3D in-view).
  const stats = await evaluate(`new Promise((resolve) => {
    const frames = [];
    let last = performance.now();
    const until = last + 6000;
    function tick(now) {
      frames.push(now - last); last = now;
      if (now < until) requestAnimationFrame(tick);
      else {
        const s = frames.slice(5).sort((a,b)=>a-b);
        const at = (q) => s[Math.floor(s.length*q)];
        resolve({ n: s.length, p50: +at(0.5).toFixed(2), p95: +at(0.95).toFixed(2),
          worst: +s[s.length-1].toFixed(2), fps: +(1000/at(0.5)).toFixed(1) });
      }
    }
    requestAnimationFrame(tick);
  })`);
  console.log("frames(hero):", JSON.stringify(stats));

  // Screenshot di beberapa posisi: hero + tiap ~90% tinggi viewport sampai bawah.
  const shots = [];
  const doc = env.docHeight;
  const step = Math.round(env.innerH * 0.9);
  let idx = 0;
  for (let y = 0; y < doc; y += step) {
    await evaluate(`scrollTo(0, ${y})`);
    await sleep(2500);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const f = `${OUTDIR}/z${Math.round(ZOOM * 100)}-${String(idx).padStart(2, "0")}-y${y}.png`;
    writeFileSync(f, Buffer.from(data, "base64"));
    shots.push(f);
    idx++;
    if (idx > 14) break; // pagar
  }
  console.log("shots:", shots.join("\n"));
  if (consoleErrors.length)
    console.log("console errors:", JSON.stringify(consoleErrors.slice(0, 10)));

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

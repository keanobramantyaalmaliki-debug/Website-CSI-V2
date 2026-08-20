/**
 * Ukur frame time interaksi roles-list Careers (/people) — idle vs hover-sweep
 * (preview foto ikut kursor) vs buka accordion. Untuk membuktikan/membantah
 * "lag setelah port V1" dan A/B sebelum-sesudah perbaikan.
 *
 *   node scripts/measure-careers-hover.mjs [dpr] [cpuThrottle]
 *
 * ⚠️ Sama seperti measure-frames.mjs: ukur di dpr 2, dpr 1 mentok vsync.
 * cpuThrottle (mis. 4) memperlambat CPU 4× — M2 tanpa throttle mengunci 60fps
 * dan menyembunyikan selisih ongkos antar-fase.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9226;
const DPR = Number(process.argv[2] ?? 2);
const THROTTLE = Number(process.argv[3] ?? 1);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-measure-careers",
    "--window-size=1440,900",
    `--force-device-scale-factor=${DPR}`,
    "http://localhost:3000/people",
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
    } catch {
      /* belum siap */
    }
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = (expression, awaitPromise = false) =>
    send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });

  await send("Page.enable");
  await send("Runtime.enable");
  if (THROTTLE > 1)
    await send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await sleep(12000);

  const r = await evalJs(`(() => {
    const el = document.querySelector("#careers");
    if (!el) return "MISSING";
    el.scrollIntoView({ block: "start" });
    return "OK";
  })()`);
  if (r?.result?.value !== "OK") throw new Error("#careers tidak ketemu");
  await sleep(2000);

  // Pengukur rAF: kumpulkan delta frame selama `ms`, kembalikan p50/p95/max.
  const measure = (ms) =>
    evalJs(
      `new Promise((done) => {
        const deltas = [];
        let prev = performance.now();
        const start = prev;
        function loop(now) {
          deltas.push(now - prev);
          prev = now;
          if (now - start < ${ms}) requestAnimationFrame(loop);
          else {
            deltas.sort((a, b) => a - b);
            const q = (p) => deltas[Math.floor(deltas.length * p)] ?? 0;
            done({ n: deltas.length, p50: q(0.5), p95: q(0.95), max: deltas[deltas.length - 1] });
          }
        }
        requestAnimationFrame(loop);
      })`,
      true,
    ).then((x) => x.result.value);

  const fmt = (label, m) =>
    console.log(
      `${label.padEnd(14)} p50 ${m.p50.toFixed(1)}ms  p95 ${m.p95.toFixed(1)}ms  max ${m.max.toFixed(1)}ms  (${m.n} frame)`,
    );

  // 1) Idle — kursor di luar list.
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700, y: 30 });
  fmt("idle", await measure(3000));

  // 2) Hover sweep — kursor bolak-balik di atas header baris ke-2 selama 4 dtk,
  //    ~60 event/dtk, preview foto aktif dan mengejar kursor.
  const pos = await evalJs(`(() => {
    const b = [...document.querySelectorAll('#careers button[aria-expanded]')][1].getBoundingClientRect();
    return { x0: Math.round(b.left + 80), x1: Math.round(b.right - 200), y: Math.round(b.top + b.height / 2) };
  })()`);
  const { x0, x1, y } = pos.result.value;
  let sweeping = true;
  const sweep = (async () => {
    let t = 0;
    while (sweeping) {
      const x = Math.round(x0 + (x1 - x0) * (0.5 + 0.5 * Math.sin(t)));
      t += 0.08;
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await sleep(16);
    }
  })();
  await sleep(300); // preview sempat muncul dulu
  fmt("hover-sweep", await measure(4000));
  sweeping = false;
  await sweep;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700, y: 30 });
  await sleep(500);

  // 3) Buka accordion — ukur selama transisi 550ms + settle.
  await evalJs(
    `document.querySelectorAll('#careers button[aria-expanded]')[0].click()`,
  );
  fmt("open-accordion", await measure(900));
  await evalJs(
    `document.querySelectorAll('#careers button[aria-expanded]')[0].click()`,
  );
  await sleep(800);

  // 4) Wheel-scroll dengan kursor DI ATAS konten — baris meluncur di bawah
  //    kursor, mouseenter/leave beruntun seperti browsing sungguhan (Lenis).
  await evalJs(`window.scrollTo(0, 0)`); // eslint-disable-line -- probe, bukan src
  await sleep(800);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 450 });
  let wheeling = true;
  const wheel = (async () => {
    while (wheeling) {
      await send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 600,
        y: 450,
        deltaX: 0,
        deltaY: 140,
      });
      await sleep(40);
    }
  })();
  fmt("wheel-scroll", await measure(6000));
  wheeling = false;
  await wheel;

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

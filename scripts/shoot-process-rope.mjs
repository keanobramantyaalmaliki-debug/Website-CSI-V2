/**
 * Potret "tali" Process (path SVG yang menjalar mengikuti scroll, §rewrite
 * 23 Agu malam) — beberapa titik progres + perbatasan Process→Industries
 * tempat ekor tali memudar ke zinc-50 dan menyatu dengan strip putih.
 *
 *   node scripts/shoot-process-rope.mjs [url-dasar] [dir-keluaran] [lebar] [tinggi]
 *
 * Turunan dari shoot-industries-stack.mjs — lihat shoot.mjs untuk catatan
 * pilihan flag & Brave-bukan-Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9226;
const BASE = process.argv[2] ?? "http://localhost:3000/";
const OUT_DIR = process.argv[3] ?? "/tmp/process-rope-shots";
const W = Number(process.argv[4] ?? 1440);
const H = Number(process.argv[5] ?? 900);

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    `--user-data-dir=/tmp/csi-probe-fresh-rope-${W}x${H}`,
    `--window-size=${W},${H}`,
    "--force-device-scale-factor=1",
    BASE,
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
  const evaluate = (expression) =>
    send("Runtime.evaluate", { expression, returnByValue: true });

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT_DIR, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${file}`);
  };

  await send("Page.enable");
  await send("Runtime.enable");
  // --window-size tidak bisa diandalkan saat profil pernah dipakai —
  // paksa ukuran viewport lewat emulasi (sekalian mode mobile di layar sempit).
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: W < 600,
  });
  // GLB + kompilasi shader + sapuan reveal + loader memudar.
  await sleep(12000);

  // Rentang scroll section Process: dari puncaknya sampai perbatasan
  // Industries duduk di 55% viewport (ujung tali harus sudah putih penuh).
  const range = `(() => {
    const sec = document.querySelector('#process');
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    const top = window.scrollY + r.top;
    const bottom = window.scrollY + r.bottom;
    const rope = sec.querySelector('svg path');
    return { top, bottom, h: r.height, vh: innerHeight, hasRope: !!rope };
  })()`;
  const info = (await evaluate(range))?.result?.value;
  console.log("process:", JSON.stringify(info));
  if (!info) throw new Error("#process tidak ketemu");
  if (!info.hasRope) throw new Error("path tali tidak dirender");

  const scrollTo = async (y, name) => {
    await evaluate(`window.scrollTo(0, ${Math.round(y)})`);
    await sleep(1200); // fade-in kartu 0.6s + jeda lenis
    const state = (
      await evaluate(
        `(() => {
          const cards = [...document.querySelectorAll('#process h3')];
          const lit = cards.filter(c =>
            +getComputedStyle(c.closest('[class*="rounded-2xl"]')).opacity > 0.5).length;
          return { y: Math.round(window.scrollY), lit };
        })()`,
      )
    )?.result?.value;
    console.log(name, JSON.stringify(state));
    await shot(name);
  };

  // Titik-titik progres: awal (tali masuk dari samping) → tengah → ekor.
  const start = info.top - info.vh * 0.4;
  const span = info.h - info.vh * 0.6;
  for (const f of [0, 0.2, 0.4, 0.6, 0.8]) {
    await scrollTo(start + span * f, `rope-${W}x${H}-${Math.round(f * 100)}`);
  }
  // Perbatasan: tepi bawah Process (= puncak strip Industries) di 55% vh,
  // lalu di 42% vh — lewat titik progress=1, tali wajib menyentuh strip.
  await scrollTo(info.bottom - info.vh * 0.55, `rope-${W}x${H}-boundary`);
  await scrollTo(info.bottom - info.vh * 0.42, `rope-${W}x${H}-merged`);

  ws.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

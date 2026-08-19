/**
 * Ukur biaya frame SAPUAN GridReveal — bukan biaya scene diam.
 *
 * `measure-frames.mjs` menjawab "berapa berat scene 3D saat didiamkan".
 * Pertanyaan di sini beda: `clip-path: url(#…)` yang berubah tiap frame itu
 * BUKAN properti yang bisa dititipkan ke compositor. Tiap kotak yang membesar
 * mengubah geometri clip, dan geometri clip dihitung di main thread — jadi
 * beban sebenarnya baru muncul selama ~900 ms sapuan, persis jendela waktu
 * yang tidak pernah terpotret oleh pengukuran scene diam.
 *
 *   node scripts/measure-sweep.mjs [dpr]
 *
 * ⚠️ Jalankan di dpr 2. Di dpr 1 scene ini sudah mentok vsync di M2, jadi
 * setelan apa pun terbaca 16,7 ms dan kesimpulannya salah (catatan yang sama
 * ada di measure-frames.mjs).
 *
 * Yang dibandingkan: p50/p95 rAF SEBELUM klik (kamera hero berputar, frameloop
 * "always") lawan p50/p95 SELAMA sapuan. Selisihnya = ongkos tirai. Kalau p95
 * sapuan melonjak jauh di atas dasar, barulah mekanismenya diganti mask
 * bertingkat.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9242;
const DPR = Number(process.argv[2] ?? 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "csi-sweep-"))}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--window-size=1440,900",
    `--force-device-scale-factor=${DPR}`,
    "http://localhost:3000/people",
  ],
  { stdio: "ignore" },
);

let ws;
let id = 0;
const pending = new Map();
for (let i = 0; i < 60; i++) {
  try {
    const list = await (
      await fetch(`http://127.0.0.1:${PORT}/json/list`)
    ).json();
    const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (page) {
      ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
      });
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) {
          pending.get(m.id)(m);
          pending.delete(m.id);
        }
      };
      break;
    }
  } catch {
    /* browser belum mengangkat port */
  }
  await sleep(300);
}
if (!ws) throw new Error("browser tidak siap");

const send = (method, params = {}) => {
  const i = ++id;
  return new Promise((res) => {
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
};
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.result?.exceptionDetails)
    throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");

const loaderGone = `[...document.querySelectorAll('div[aria-hidden]')]
  .every((d) => !String(d.className).includes('z-[60]'))`;
for (let i = 0; i < 120; i++) {
  if (await evalJs(loaderGone)) break;
  await sleep(500);
}
await sleep(2500);

const renderer = await evalJs(`(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'tidak diketahui';
})()`);

// Pencatat rAF dipasang sekali dan hidup melewati klik — sapuan TIDAK memuat
// ulang halaman (itu justru inti fiturnya), jadi ia selamat.
await evalJs(`(() => {
  window.__t = [];
  const tick = (t) => { window.__t.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})()`);

await sleep(2000);
const baseEnd = await evalJs("window.__t.length");

// Gulir sampai hero lewat — inilah syarat jalur tirai (lihat Navbar.goRoom).
await evalJs("window.scrollTo(0, document.body.scrollHeight)");
await sleep(2200);
const clickAt = await evalJs("window.__t.length");

const tClick = await evalJs("performance.now()");
const clicked = await evalJs(`(() => {
  const b = [...document.querySelectorAll('nav button')]
    .find((el) => el.textContent.trim() === 'Home');
  if (!b) return false;
  b.click();
  return true;
})()`);
if (!clicked) throw new Error('tombol "Home" tidak ditemukan di nav');

await sleep(1600);

const t = await evalJs("JSON.stringify(window.__t)").then(JSON.parse);
const stats = (arr) => {
  const d = arr.slice(1).map((v, i) => v - arr[i]).sort((a, b) => a - b);
  if (!d.length) return null;
  const q = (p) => +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1);
  return {
    n: d.length,
    p50: q(0.5),
    p95: q(0.95),
    max: +d[d.length - 1].toFixed(1),
    ">33ms": d.filter((x) => x > 33).length,
  };
};

console.log(
  JSON.stringify(
    {
      renderer,
      dpr: DPR,
      dasar_hero: stats(t.slice(0, baseEnd)),
      sapuan: stats(t.slice(clickAt)),
      // LETAK lonjakan, bukan cuma besarnya. Satu frame 185 ms di awal =
      // ongkos sekali bayar (React menukar route + goTo instan + kompilasi
      // ulang); yang sama besarnya di TENGAH sapuan artinya geometri clip-nya
      // yang mahal — dan cuma yang kedua alasan untuk mengganti mekanismenya.
      lonjakan: t
        .slice(clickAt + 1)
        .map((v, i) => ({
          sejak_klik: Math.round(v - tClick),
          delta: +(v - t[clickAt + i]).toFixed(1),
        }))
        .filter((d) => d.delta > 25),
    },
    null,
    2,
  ),
);

proc.kill();
process.exit(0);

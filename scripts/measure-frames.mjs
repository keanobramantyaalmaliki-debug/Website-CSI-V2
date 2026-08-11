/**
 * Ukur frame time scene 3D lewat Chrome DevTools Protocol — tanpa dependency.
 *
 * Dipakai untuk membandingkan setelan render (mis. multisampling 8 vs 4 vs 0)
 * secara A/B: jalankan, ubah satu setelan, jalankan lagi, bandingkan p50/p95.
 *
 *   node scripts/measure-frames.mjs [url] [detik]
 *
 * ⚠️ BACA INI SEBELUM PERCAYA ANGKANYA.
 * Headless Chrome sering memakai SwiftShader (rasterisasi CPU), bukan GPU asli.
 * Skrip ini MENCETAK renderer yang dipakai — kalau tertulis SwiftShader/llvmpipe,
 * angkanya TIDAK mewakili laptop siapa pun; ia cuma berguna sebagai perbandingan
 * relatif antar-setelan, dan bahkan itu pun bias (MSAA lebih murah di GPU asli
 * daripada di rasterizer CPU). Keputusan yang menyentuh TAMPILAN tetap harus
 * dilihat mata di browser sungguhan.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9223;
const URL = process.argv[2] ?? "http://localhost:3000/";
const SECONDS = Number(process.argv[3] ?? 8);
/**
 * Skala device-pixel-ratio. Default 1 = 1440×900 piksel nyata.
 *
 * ⚠️ Ini yang membedakan pengukuran BERGUNA dari yang menyesatkan. Di 1440×900
 * scene ini sudah mentok vsync 60 FPS di M2, jadi selisih setelan apa pun
 * TIDAK TERLIHAT — semuanya sama-sama 16,7 ms. Laptop Retina merender jauh
 * lebih banyak piksel (dpr di-cap 1.5 di Scene.tsx), dan ongkos N8AO + Bloom +
 * MSAA itu PER PIKSEL. Naikkan ini untuk melihat beban yang sebenarnya.
 */
const DPR = Number(process.argv[4] ?? 1);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    // Minta GPU sungguhan kalau tersedia; tanpa ini hampir pasti SwiftShader.
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-measure-profile",
    "--window-size=1440,900",
    `--force-device-scale-factor=${DPR}`,
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
    } catch {
      /* chrome belum siap */
    }
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak pernah muncul");

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

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return r?.result?.value;
  };

  await send("Runtime.enable");

  // Tunggu scene benar-benar siap: GLB diunduh + 233 shader dikompilasi.
  // `sceneReady` di store adalah sinyal frame nyata pertama.
  for (let i = 0; i < 90; i++) {
    const ready = await evaluate(
      `!!document.querySelector('canvas') && performance.now() > 0`,
    );
    if (ready) break;
    await sleep(500);
  }
  await sleep(6000); // lewati stall kompilasi shader + sapuan reveal

  const renderer = await evaluate(`(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return 'NO WEBGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  })()`);

  const stats = await evaluate(`new Promise((resolve) => {
    const frames = [];
    let last = performance.now();
    const until = last + ${SECONDS * 1000};
    function tick(now) {
      frames.push(now - last);
      last = now;
      if (now < until) requestAnimationFrame(tick);
      else {
        const s = frames.slice(5).sort((a, b) => a - b);  // buang warm-up
        const at = (q) => s[Math.floor(s.length * q)];
        resolve({
          n: s.length,
          p50: +at(0.50).toFixed(2),
          p95: +at(0.95).toFixed(2),
          worst: +s[s.length - 1].toFixed(2),
          fps: +(1000 / at(0.50)).toFixed(1),
        });
      }
    }
    requestAnimationFrame(tick);
  })`);

  const px = await evaluate(`(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height, mpx: +((c.width * c.height) / 1e6).toFixed(2) } : null;
  })()`);

  console.log(JSON.stringify({ url: URL, renderer, dpr: DPR, canvas: px, ...stats }, null, 2));

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

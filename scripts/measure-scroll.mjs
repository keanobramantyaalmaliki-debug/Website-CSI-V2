/**
 * Ukur KEHALUSAN SCROLL — bukan fps diam seperti `measure-frames.mjs`.
 *
 *   node scripts/measure-scroll.mjs <url> [w] [h] [throttle]
 *
 * Bedanya penting: `measure-frames.mjs` mengukur ongkos menggambar scene saat
 * halaman DIAM. Scroll "tersendat" tidak muncul di sana sama sekali — biangnya
 * bukan menggambar 3D melainkan pekerjaan yang menempel di setiap event scroll
 * (layout, compositing layer besar, transform per-frame).
 *
 * Caranya: pasang pencacah rAF, gulir lewat Input.synthesizeScrollGesture
 * (gestur ASLI lewat compositor — `window.scrollTo` melewatkan justru bagian
 * yang diukur), lalu hitung frame yang lebih lama dari 32ms.
 *
 * ⚠️ `throttle` (default 4×) WAJIB ada. Chrome desktop headless terlalu kencang
 * untuk memperlihatkan sendatan yang dirasakan di HP; tanpa dicekik, angkanya
 * nol di kedua sisi dan orang menyimpulkan "tidak ada bedanya".
 *
 * ⚠️ BATAS ALAT — dicatat supaya tidak dipercaya melebihi kemampuannya.
 * Dipakai 10 Agu untuk membandingkan hero HP versi pin-lalu-surut vs versi
 * mengalir, 3 kali tiap sisi: median 16,7ms dan p95 ~17,5ms di KEDUANYA, dengan
 * satu-dua pencilan acak di masing-masing sisi. Artinya alat ini TIDAK bisa
 * memisahkan keduanya. Yang mahal di HP betulan adalah compositing layer WebGL
 * seukuran layar yang opacity+scale-nya berubah tiap frame — dan itu dikerjakan
 * GPU, sementara `setCPUThrottlingRate` hanya mencekik CPU. Untuk keputusan
 * yang menyentuh compositing, alat ini bukan wasitnya; buka di HP betulan.
 * Ia tetap berguna untuk sendatan yang lahir di MAIN THREAD (listener scroll
 * berat, layout thrash, chunk yang dimuat di tengah gulir).
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9226;
const URL = process.argv[2] ?? "http://localhost:3000/";
const W = Number(process.argv[3] ?? 393);
const H = Number(process.argv[4] ?? 852);
const THROTTLE = Number(process.argv[5] ?? 4);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-scroll-profile",
    "--window-size=1440,900",
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
      target = (await json("/json/list")).find((t) => t.type === "page");
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
      pending.get(m.id)(m);
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

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  // Tunggu loader lewat & scene tergambar, BARU cekik CPU — mencekik lebih awal
  // cuma memperlama pemuatan dan tidak menambah apa pun ke pengukuran.
  await sleep(15000);
  await send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await sleep(1000);

  await send("Runtime.evaluate", {
    expression: `
      window.__f = [];
      (function tick(prev) {
        requestAnimationFrame((now) => {
          if (prev) window.__f.push(now - prev);
          tick(now);
        });
      })(0);
    `,
  });

  await send("Input.synthesizeScrollGesture", {
    x: Math.round(W / 2),
    y: Math.round(H / 2),
    yDistance: -1400,
    speed: 900,
    gestureSourceType: "touch",
  });
  await sleep(500);

  const m = await send("Runtime.evaluate", {
    expression: `(() => {
      const f = window.__f.slice(2);
      const sorted = [...f].sort((a, b) => a - b);
      const p = (q) => sorted[Math.floor(sorted.length * q)] ?? 0;
      return JSON.stringify({
        frames: f.length,
        median: +p(0.5).toFixed(1),
        p95: +p(0.95).toFixed(1),
        worst: +Math.max(...f).toFixed(1),
        janky32: f.filter((x) => x > 32).length,
        janky50: f.filter((x) => x > 50).length,
      });
    })()`,
    returnByValue: true,
  });

  console.log(`${W}x${H} cpu ${THROTTLE}x → ${m.result.result.value}`);
  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

/**
 * Rekam lift scroll (scrollLift.ts) di beberapa posisi gulir — satu PNG per
 * progres, untuk memeriksa framing turun + dongak dengan mata.
 *
 *   node scripts/shoot-lift.mjs [url-dasar] [dir-keluaran]
 *
 * Menggulir lewat window.scrollTo pada fraksi tinggi hero (0 → 1), menunggu
 * peredam LIFT_TAU menetap, lalu memotret. Turunan dari shoot.mjs — lihat di
 * sana untuk catatan pilihan flag & Brave-bukan-Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const BASE = process.argv[2] ?? "http://localhost:3000/";
const OUT_DIR = process.argv[3] ?? "/tmp/lift-shots";
const STEPS = [0, 0.25, 0.45, 0.65, 0.85, 1];

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-shoot-profile",
    "--window-size=1440,900",
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

  await send("Page.enable");
  await send("Runtime.enable");
  // GLB + kompilasi shader + sapuan reveal + loader memudar.
  await sleep(12000);

  for (const p of STEPS) {
    // Gulir ke fraksi p dari tinggi hero. Lenis menggulir window native,
    // jadi scrollTo langsung + event scroll biasa sudah cukup untuk
    // menggerakkan useHeroScrollProgress.
    await evaluate(`(() => {
      const el = document.getElementById("office");
      window.scrollTo(0, Math.round(el.getBoundingClientRect().height * ${p} + window.scrollY + el.getBoundingClientRect().top));
    })()`);
    // Peredam LIFT_TAU 0,12 dtk → 5τ ≈ 0,6 dtk sudah <1% dari tujuan;
    // dibulatkan ke 1 dtk supaya cap idle sempat menggambar frame penuh.
    await sleep(1000);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT_DIR, `lift-${String(p).replace(".", "_")}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${file}`);
  }

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

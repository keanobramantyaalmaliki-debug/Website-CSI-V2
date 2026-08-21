/**
 * Potret panel ServicesTicker (sabuk teks 3D di /services) di beberapa
 * keadaan — idle (pudar), sedang digulir (warna nyala + pop), dan dua potret
 * berselang untuk membuktikan drift/wrap benar-benar berjalan.
 *
 *   node scripts/shoot-services-ticker.mjs [url-dasar] [dir-keluaran]
 *
 * Turunan dari shoot-lift.mjs — lihat shoot.mjs untuk catatan pilihan flag &
 * Brave-bukan-Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const BASE = process.argv[2] ?? "http://localhost:3000/services";
const OUT_DIR = process.argv[3] ?? "/tmp/services-ticker-shots";

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-probe-fresh",
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

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT_DIR, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${file}`);
  };

  await send("Page.enable");
  await send("Runtime.enable");
  // GLB + kompilasi shader + sapuan reveal + loader memudar.
  await sleep(12000);

  // Tengahkan panel di viewport, lalu ambil koordinat pusatnya untuk
  // dispatch wheel CDP (event trusted, lewat jalur listener sungguhan).
  const center = `(() => {
    const el = document.querySelector('#services div.bg-zinc-50');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2);
    const r2 = el.getBoundingClientRect();
    return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2, scrollY: window.scrollY };
  })()`;
  const c = (await evaluate(center))?.result?.value;
  console.log("panel:", JSON.stringify(c));
  if (!c) throw new Error("panel tidak ketemu");
  await sleep(2000);
  await shot("1-idle");

  const wheelAt = (x, y, deltaY) =>
    send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });

  // Wheel DI ATAS panel: halaman wajib DIAM, sabuk bergeser + warna menguat.
  const yBefore = (await evaluate("window.scrollY"))?.result?.value;
  for (let i = 0; i < 6; i++) {
    await wheelAt(c.x, c.y, 300);
    await sleep(60);
  }
  await shot("2-wheel-hover");
  const yAfterHover = (await evaluate("window.scrollY"))?.result?.value;
  console.log(
    `scrollY saat wheel di panel: ${yBefore} → ${yAfterHover} ` +
      (yBefore === yAfterHover ? "(DIAM ✓)" : "(BERGESER ✗ — bocor ke halaman!)"),
  );

  // Menetap: warna kembali pudar, sabuk berhenti di item lain.
  await sleep(2500);
  await shot("3-settled");

  // Wheel DI LUAR panel (strip gelap bawah): halaman wajib TURUN (Lenis).
  await wheelAt(c.x, Math.min(c.y * 2 - 10, 890), 300);
  await sleep(800);
  const yAfterOutside = (await evaluate("window.scrollY"))?.result?.value;
  console.log(
    `scrollY saat wheel di luar panel: ${yAfterHover} → ${yAfterOutside} ` +
      (yAfterOutside > yAfterHover ? "(TURUN ✓)" : "(DIAM ✗ — wheel halaman ketelan!)"),
  );
  await shot("4-outside");

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

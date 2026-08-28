/**
 * Audit tampilan MOBILE: sweep semua route di viewport sempit (emulasi
 * device + touch), potret tiap langkah scroll, dan catat overflow horizontal
 * (scrollWidth > innerWidth + daftar elemen pelakunya).
 *
 *   node scripts/shoot-mobile-audit.mjs [url-dasar] [dir-keluaran] [lebar] [tinggi]
 *
 * Turunan dari shoot-process-rope.mjs — lihat shoot.mjs untuk catatan
 * pilihan flag & Brave-bukan-Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = process.argv[3] ?? "/tmp/mobile-audit";
const W = Number(process.argv[4] ?? 390);
const H = Number(process.argv[5] ?? 844);

// Route yang di-sweep: 4 room + careers + satu contoh job detail.
// Boleh dipersempit lewat env CSI_ROUTES="/,/careers" saat iterasi fix.
const ROUTES = (
  process.env.CSI_ROUTES?.split(",") ?? [
    "/",
    "/services",
    "/work",
    "/people",
    "/careers",
    "/careers/full-stack-engineer",
  ]
).map((r) => r.trim());

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    // Profil dipakai ulang antar-run supaya GLB kena cache disk;
    // ukuran viewport dipaksa lewat emulasi, bukan --window-size.
    "--user-data-dir=/tmp/csi-mobile-audit-profile",
    `--window-size=${W},${H}`,
    "about:blank",
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 2,
    mobile: true,
  });
  // pointer:coarse — komponen mobile (carousel, drag-only ticker, dsb.)
  // memilih varian lewat media query ini, bukan lewat lebar.
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT_DIR, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${file}`);
  };

  // Overflow horizontal: lebar dokumen + elemen yang menjulur keluar viewport.
  const OVERFLOW_EXPR = `(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.scrollingElement;
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cls = (typeof el.className === 'string' ? el.className : '')
          .split(/\\s+/).slice(0, 4).join('.');
        bad.push({
          tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        });
      }
    }
    // hanya pelaku terluar: buang elemen yang leluhurnya sudah tercatat
    return {
      vw,
      scrollW: doc.scrollWidth,
      overflowX: doc.scrollWidth > vw + 1,
      bad: bad.slice(0, 12),
      badCount: bad.length,
    };
  })()`;

  const report = {};
  for (const route of ROUTES) {
    const name = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
    await send("Page.navigate", { url: BASE + route });
    // Route ber-scene 3D butuh GLB + kompilasi shader + loader memudar.
    const heavy = !route.startsWith("/careers");
    await sleep(heavy ? 14000 : 6000);

    const dims = (
      await evaluate(
        `({ h: document.scrollingElement.scrollHeight, vh: innerHeight, vw: innerWidth,
            coarse: matchMedia('(pointer: coarse)').matches })`,
      )
    )?.result?.value;
    console.log(route, JSON.stringify(dims));

    const routeReport = [];
    const step = Math.round(dims.vh * 0.85);
    const maxY = Math.max(0, dims.h - dims.vh);
    let idx = 0;
    for (let y = 0; ; y += step) {
      const target = Math.min(y, maxY);
      await evaluate(`window.scrollTo(0, ${target})`);
      await sleep(1400); // fade-in konten + jeda lenis
      const state = (await evaluate(OVERFLOW_EXPR))?.result?.value;
      const label = `${name}-${String(idx).padStart(2, "0")}`;
      if (state?.overflowX || state?.badCount) {
        console.log(label, "OVERFLOW", JSON.stringify(state));
        routeReport.push({ label, y: target, ...state });
      }
      await shot(label);
      idx++;
      if (target >= maxY) break;
    }
    report[route] = { dims, overflow: routeReport };
  }

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(`laporan: ${join(OUT_DIR, "report.json")}`);
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

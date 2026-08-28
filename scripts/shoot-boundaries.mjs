/**
 * Potret PERBATASAN antar section di mobile: baca laporan
 * measure-mobile-spacing.mjs, scroll sampai tiap perbatasan ada di tengah
 * viewport, lalu screenshot — untuk menilai celah 80px secara visual
 * (union text/media di skrip ukur tidak menghitung border kartu & posisi
 * sticky saat benar-benar digulir).
 *
 *   node scripts/shoot-boundaries.mjs [url-dasar] [report.json] [dir-keluaran]
 *
 * Turunan dari measure-mobile-spacing.mjs.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9233;
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const REPORT = JSON.parse(
  readFileSync(process.argv[3] ?? "/tmp/mobile-spacing-after.json", "utf8"),
);
const OUT_DIR = process.argv[4] ?? "/tmp/mobile-boundaries";
const W = 390;
const H = 844;

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
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
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });

  for (const [route, data] of Object.entries(REPORT)) {
    const pairs = (data.pairs ?? []).filter(
      (p) => p.gapVisual != null && p.gapVisual > 0,
    );
    if (!pairs.length) continue;
    const name =
      route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
    await send("Page.navigate", { url: BASE + route });
    await sleep(route.startsWith("/careers") ? 6000 : 14000);

    const sections = Object.fromEntries(
      data.sections.map((s) => [s.id ?? s.cls, s]),
    );
    for (const p of pairs) {
      const a = sections[p.from];
      const b = sections[p.to];
      if (!a?.content || !b?.content) continue;
      const mid = Math.round((a.content.bottom + b.content.top) / 2);
      const y = Math.max(0, mid - Math.round(H / 2));
      await evaluate(`window.scrollTo(0, ${y})`);
      await sleep(1600); // animasi masuk konten yang baru terlihat
      const { data: png } = await send("Page.captureScreenshot", {
        format: "png",
      });
      const file = join(
        OUT_DIR,
        `${name}--${String(p.from).slice(0, 20)}--${String(p.to).slice(0, 20)}.png`,
      );
      writeFileSync(file, Buffer.from(png, "base64"));
      console.log("tersimpan:", file, "scrollY:", y);
    }
  }
  console.log("selesai");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

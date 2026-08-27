/**
 * Potret form lamaran di `/careers/<slug>` — desktop & ponsel, dua bahasa.
 *
 * Yang mau dilihat bukan "form-nya ada" (itu urusan probe-job-page.mjs)
 * melainkan tata letaknya: dua kolom yang runtuh jadi satu di ponsel, grid
 * skill, dan baris tombol + catatan di kaki form.
 *
 *   node scripts/shoot-apply-form.mjs [slug] [lebar] [tinggi]
 *
 * Keluarannya di /tmp/apply-form/.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;
const SLUG = process.argv[2] ?? "full-stack-engineer";
const W = Number(process.argv[3] ?? 1440);
const H = Number(process.argv[4] ?? 900);
const OUT = "/tmp/apply-form";
const URL = `http://localhost:3000/careers/${SLUG}`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    `--window-size=${W},${H}`,
    "--no-first-run",
    "--user-data-dir=/tmp/csi-shoot-apply",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    httpGet({ host: "127.0.0.1", port: PORT, path }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetchJson("/json/list");
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* browser belum siap */
    }
    await sleep(250);
  }
  throw new Error("target DevTools tidak pernah muncul");
}

const wsUrl = await waitForTarget();
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));

let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const resolve = pending.get(msg.id);
  if (resolve) {
    pending.delete(msg.id);
    resolve(msg.result);
  }
};

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((r) => pending.set(id, r));
}

async function evalJs(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return res?.result?.value;
}

async function shot(name) {
  const res = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(res.data, "base64"));
  console.log(`  ${OUT}/${name}.png`);
}

/** Bawa #apply ke puncak layar dan tunggu Lenis diam. */
async function scrollToApply(offset = 0) {
  await evalJs(
    `(() => { const s = document.getElementById('apply');
      window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + ${offset}); })()`,
  );
  await sleep(900);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: W,
  height: H,
  deviceScaleFactor: 2,
  mobile: false,
});

console.log(`desktop ${W}×${H}`);
await send("Page.navigate", { url: URL });
await sleep(3500);
await scrollToApply();
await shot("01-desktop-atas");
await scrollToApply(700);
await shot("02-desktop-skills");

/* Keadaan galat: kirim dengan isian kosong. Yang mau dilihat bukan pesannya
   (itu diuji unit) melainkan apakah tata letaknya masih terbaca saat sepuluh
   peringatan muncul serentak. */
await evalJs(
  `[...document.querySelectorAll('#apply button[type=submit]')][0]?.click()`,
);
await sleep(600);
await scrollToApply();
await shot("03-desktop-galat");

console.log("bahasa ID");
await evalJs(
  `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'id')?.click()`,
);
await sleep(600);
await scrollToApply();
await shot("04-desktop-id");

console.log("ponsel 390×844");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true,
});
await send("Page.navigate", { url: URL });
await sleep(3500);
await scrollToApply();
await shot("05-ponsel-atas");
await scrollToApply(600);
await shot("06-ponsel-skills");
await scrollToApply(1100);
await shot("07-ponsel-kaki");

ws.close();
browser.kill();
console.log(`\nselesai — ${OUT}`);

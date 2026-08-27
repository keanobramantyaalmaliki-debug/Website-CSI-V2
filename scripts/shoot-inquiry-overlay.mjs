/**
 * Probe modal inquiry CTA navbar (InquiryOverlay) — buka & tutup, desktop.
 *
 *   node scripts/shoot-inquiry-overlay.mjs [url-dasar] [dir-keluaran]
 *
 * Dua hal yang diperiksa, sesuai pelajaran 3 Agu ("ukur dulu animasinya
 * jalan"):
 *   1. SAMPEL — `transform` pembungkus yang naik + `opacity` tirai dicuplik
 *      tiap ~80 ms dan dicetak. Deret yang berubah mulus = pegasnya jalan;
 *      lompatan satu langkah = transisinya mati dan PNG-nya cuma kebetulan
 *      bagus.
 *   2. POTRET — PNG di titik-titik kunci: naik, lid membuka, kamera masuk,
 *      form penuh, lalu urutan menutup sampai lapisan tenggelam.
 *
 * Turunan dari shoot-lift.mjs — lihat shoot.mjs untuk catatan flag &
 * Brave-bukan-Chrome.
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
const OUT_DIR = process.argv[3] ?? "/tmp/inquiry-overlay-shots";

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-shoot-profile-inquiry",
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

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = join(OUT_DIR, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${file}`);
  };

  // Posisi gulir sebelum modal — dipakai membuktikan "tutup = kembali di
  // tempat yang sama". Digulir sedikit dulu supaya klaimnya berisi.
  await evaluate(`window.scrollTo(0, 400)`);
  await sleep(600);
  const y0 = (await evaluate(`window.scrollY`)).result.value;

  // Perekam sampel: transform pembungkus naik (anak pertama lapisan z-55) +
  // opacity tirai z-54, dicuplik ~80 ms di dalam halaman biar tidak terganggu
  // bolak-balik WebSocket.
  await evaluate(`(() => {
    window.__inqSamples = [];
    const t0 = performance.now();
    const tick = () => {
      const layer = document.querySelector('div[class*="z-[55]"]');
      const scrim = document.querySelector('div[class*="z-[54]"]');
      const wrap = layer && layer.firstElementChild;
      window.__inqSamples.push({
        t: Math.round(performance.now() - t0),
        y: wrap ? getComputedStyle(wrap).transform : null,
        scrim: scrim ? getComputedStyle(scrim).opacity : null,
      });
      if (performance.now() - t0 < 2600) setTimeout(tick, 80);
    };
    tick();
  })()`);

  // Klik CTA desktop "Talk to us" (yang display-nya hidup).
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) =>
        b.textContent.trim() === "Talk to us" &&
        getComputedStyle(b).display !== "none",
    );
    if (!btn) throw new Error("CTA tidak ketemu");
    btn.click();
  })()`);

  await sleep(150);
  await shot("open-1-naik-awal");
  await sleep(200);
  await shot("open-2-naik");
  await sleep(250);
  await shot("open-3-lid-mulai");
  await sleep(350);
  await shot("open-4-kamera-masuk");
  await sleep(600);
  await shot("open-5-form");
  await sleep(900);
  await shot("open-6-form-tenang");

  const samples = (await evaluate(`window.__inqSamples`)).result.value;
  console.log("── sampel buka (t ms | translateY | scrim) ──");
  for (const s of samples ?? []) {
    const m = s.y && s.y !== "none" ? s.y.match(/,\s*(-?[\d.]+)\)$/) : null;
    console.log(`${s.t}\t${m ? Math.round(m[1]) + "px" : s.y}\t${s.scrim}`);
  }

  // Tutup lewat tombolnya, rekam turunnya.
  await evaluate(`(() => {
    window.__inqSamples = [];
    const t0 = performance.now();
    const tick = () => {
      const layer = document.querySelector('div[class*="z-[55]"]');
      const wrap = layer && layer.firstElementChild;
      window.__inqSamples.push({
        t: Math.round(performance.now() - t0),
        y: wrap ? getComputedStyle(wrap).transform : null,
        vis: layer ? getComputedStyle(layer).visibility : null,
      });
      if (performance.now() - t0 < 3200) setTimeout(tick, 80);
    };
    tick();
    document.querySelector("[data-inquiry-close]").click();
  })()`);

  await sleep(300);
  await shot("close-1-form-lepas");
  await sleep(400);
  await shot("close-2-mundur");
  await sleep(500);
  await shot("close-3-turun");
  await sleep(700);
  await shot("close-4-tenggelam");
  await sleep(1200);
  await shot("close-5-selesai");

  const closes = (await evaluate(`window.__inqSamples`)).result.value;
  console.log("── sampel tutup (t ms | translateY | visibility) ──");
  for (const s of closes ?? []) {
    const m = s.y && s.y !== "none" ? s.y.match(/,\s*(-?[\d.]+)\)$/) : null;
    console.log(`${s.t}\t${m ? Math.round(m[1]) + "px" : s.y}\t${s.vis}`);
  }

  const y1 = (await evaluate(`window.scrollY`)).result.value;
  console.log(`scrollY sebelum ${y0} → sesudah ${y1} (harus sama)`);

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

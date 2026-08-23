/**
 * Potret IndustriesStack dalam viewport HP (390×844, emulasi pointer kasar)
 * — sejak 23 Agu malam stack 3D tampil di SEMUA perangkat (carousel
 * IndustriesMobile pensiun). Yang diprobe: idle (framing kamera mundur
 * responsif + navigasi `‹ 01 Nama ›` di bawah), arrow menggilir sektor
 * (plank aktif ke-tint), tap NAMA = mode fokus layar sempit (kartu
 * atas-tengah + panel lembar bawah), tap area kosong menutup, dan tap
 * langsung di plank menyinkronkan navigasi ke sektor yang dibuka.
 *
 *   node scripts/shoot-industries-mobile.mjs [url-dasar] [dir-keluaran]
 *
 * Turunan shoot-industries-stack.mjs — lihat shoot.mjs untuk catatan flag
 * & Brave-bukan-Chrome. Emulasi coarse lewat Emulation.setTouchEmulation
 * supaya useCoarsePointer ikut menyala di headless.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const BASE = process.argv[2] ?? "http://localhost:3001/";
const OUT_DIR = process.argv[3] ?? "/tmp/industries-mobile-shots";

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
    "--window-size=390,844",
    "--force-device-scale-factor=2",
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
  // Viewport HP + pointer kasar. setDeviceMetricsOverride menjamin ukuran
  // CSS 390×844 apa pun window-size headless-nya; touch emulation membuat
  // matchMedia(pointer: coarse) match di Blink.
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await evaluate("location.reload()");
  // GLB + kompilasi shader + sapuan reveal + loader memudar.
  await sleep(14000);

  // Tengahkan strip di viewport, ambil koordinatnya.
  const center = `(() => {
    const el = document.querySelector('[data-testid="industries-stack"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2);
    const r2 = el.getBoundingClientRect();
    return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2,
             top: r2.top, h: r2.height, scrollY: window.scrollY,
             coarse: matchMedia('(pointer: coarse)').matches };
  })()`;
  const c = (await evaluate(center))?.result?.value;
  console.log("strip:", JSON.stringify(c));
  if (!c) throw new Error("strip tidak ketemu");
  await sleep(4000);
  await shot("1-idle");

  const hud = async () => {
    const r = await evaluate(
      `document.querySelector('[data-testid="industries-stack"]')?.textContent`,
    );
    return r?.result?.value ?? "";
  };
  console.log("HUD idle:", (await hud()).slice(0, 160));

  const tapAt = async (x, y) => {
    await send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  // Titik tengah tombol navigasi [prev, nama, next] — dibaca ulang tiap kali
  // (tanpa scrollTo; Lenis menarik balik lompatan native — lihat
  // shoot-industries-stack.mjs).
  const navRects = async () =>
    (
      await evaluate(`(() => {
        const btns = [...document.querySelector('[data-testid="industries-stack"]').querySelectorAll('button')];
        return btns.map((b) => {
          const r = b.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      })()`)
    )?.result?.value ?? [];

  // Arrow next ×2 → navigasi wajib menunjuk sektor 03 + plank aktif ke-tint.
  let nav = await navRects();
  console.log("tombol nav:", JSON.stringify(nav));
  if (nav.length !== 3) throw new Error(`nav bukan 3 tombol: ${nav.length}`);
  // Dua tap di koordinat arrow yang SAMA — sekaligus regresi untuk bug
  // "arrow bergeser": dulu kolom nama melar mengikuti panjang teks sehingga
  // baris justify-center menggeser arrow 48px tiap nama berganti dan tap
  // beruntun meleset; kini kolom nama fixed-width, arrow wajib diam.
  // Arrow KIRI (nav[0]) yang menaikkan nomor — arah arrow spasial mengikuti
  // tumpukan (01 di kanan-atas, nomor naik ke kiri), revisi Keano.
  await tapAt(nav[0].x, nav[0].y);
  await sleep(800);
  await tapAt(nav[0].x, nav[0].y);
  await sleep(800);
  console.log("HUD nav ×2 kiri (wajib 03):", (await hud()).slice(0, 160));
  await shot("2-nav-03");

  // Tap NAMA sektor → mode fokus.
  nav = await navRects();
  await tapAt(nav[1].x, nav[1].y);
  await sleep(1500);
  console.log("HUD fokus:", (await hud()).slice(0, 200));
  await shot("3-fokus");

  // Tap area kosong (kiri atas strip, di bawah heading) → onPointerMissed
  // menutup fokus; navigasi wajib kembali menunjuk sektor yang sama.
  const c2 = (
    await evaluate(`(() => {
      const el = document.querySelector('[data-testid="industries-stack"]');
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`)
  )?.result?.value;
  await tapAt(c2.x - 150, c2.y - 100);
  await sleep(1500);
  console.log("HUD sesudah tutup:", (await hud()).slice(0, 160));
  await shot("4-kembali");

  // Tap langsung di plank (pusat tumpukan) → fokus terbuka; sesudah ditutup
  // navigasi harus SINKRON ke sektor yang barusan dibuka.
  await tapAt(c2.x, c2.y);
  await sleep(1500);
  console.log("HUD fokus (tap plank):", (await hud()).slice(0, 200));
  await shot("5-fokus-plank");
  await tapAt(c2.x - 150, c2.y - 100);
  await sleep(1500);
  console.log("HUD sinkron:", (await hud()).slice(0, 160));

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

/**
 * Potret + probe IndustriesStack (tangga spiral 3D di Home) dalam beberapa
 * keadaan — idle, hover (HUD num/nama/desc nyala), wheel di atas tumpukan
 * (WAJIB men-scroll halaman — wheel-cycling dicabut 23 Agu malam), klik
 * plank (mode fokus: kartu foto kiri + panel deskripsi kanan), dan klik
 * area kosong (fokus tertutup, spiral kembali).
 *
 *   node scripts/shoot-industries-stack.mjs [url-dasar] [dir-keluaran]
 *
 * Turunan dari shoot-services-ticker.mjs — lihat shoot.mjs untuk catatan
 * pilihan flag & Brave-bukan-Chrome.
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
const OUT_DIR = process.argv[3] ?? "/tmp/industries-stack-shots";

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

  // Tengahkan strip di viewport, ambil koordinatnya.
  const center = `(() => {
    const el = document.querySelector('[data-testid="industries-stack"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2);
    const r2 = el.getBoundingClientRect();
    return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2,
             top: r2.top, scrollY: window.scrollY };
  })()`;
  const c = (await evaluate(center))?.result?.value;
  console.log("strip:", JSON.stringify(c));
  if (!c) throw new Error("strip tidak ketemu");
  // Texture kartu diunduh saat strip mendekat (inView) — beri waktu.
  await sleep(4000);
  await shot("1-idle");

  const mouseAt = (x, y) =>
    send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  const wheelAt = (x, y, deltaY) =>
    send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
  const hud = async () => {
    const r = await evaluate(
      `document.querySelector('[data-testid="industries-stack"]')?.textContent`,
    );
    return r?.result?.value ?? "";
  };

  // Hover pusat tumpukan — HUD wajib menyala (num/nama/desc + Click to open).
  await mouseAt(c.x, c.y);
  await sleep(700);
  console.log("HUD hover:", (await hud()).slice(0, 160));
  await shot("2-hover");

  // Wheel-cycling DICABUT 23 Agu malam: wheel di atas tumpukan sekarang
  // WAJIB men-scroll halaman seperti area mana pun.
  const yBefore = (await evaluate("window.scrollY"))?.result?.value;
  await wheelAt(c.x, c.y, 120);
  await sleep(700);
  const yAfter = (await evaluate("window.scrollY"))?.result?.value;
  console.log(
    `wheel di tumpukan → scrollY ${yBefore} → ${yAfter} (wajib BERUBAH — hijack dicabut)`,
  );
  await shot("3-wheel-lolos");

  // KLIK plank → mode fokus: plank terbang ke kiri + expand foto, sisa
  // tangga fade out, panel deskripsi muncul di kanan. Koordinat strip
  // dibaca APA ADANYA (tanpa scrollTo): langkah wheel barusan memberi Lenis
  // target scroll sendiri, dan lompatan window.scrollTo native langsung
  // ditarik balik oleh rAF Lenis — koordinat hasil "restore" jadi basi.
  await sleep(1000);
  const c2 = (
    await evaluate(`(() => {
      const el = document.querySelector('[data-testid="industries-stack"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top };
    })()`)
  )?.result?.value;
  console.log("strip (klik):", JSON.stringify(c2));
  const clickAt = async (x, y) => {
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1,
    });
  };
  await mouseAt(c2.x, c2.y);
  await sleep(400);
  await clickAt(c2.x, c2.y);
  await sleep(1500);
  console.log("HUD fokus:", (await hud()).slice(0, 160));
  await shot("6-fokus");

  // Klik area kosong (kiri BAWAH strip — kiri atas tertutup navbar fixed,
  // dan sisi kanan ditempati panel deskripsi) → onPointerMissed menutup
  // fokus, spiral mengalir balik.
  await clickAt(c2.x - 620, c2.y + 250);
  await sleep(1500);
  console.log("HUD sesudah tutup:", (await hud()).slice(0, 120));
  await shot("7-kembali");

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

/**
 * Kemudikan halaman lewat CDP: klik, tunggu, geser, potret — berurutan.
 *
 *   node scripts/drive.mjs <url> <langkah.json> [dpr]
 *
 * Kenapa ada, padahal sudah ada `shoot.mjs`: yang itu memotret halaman DIAM.
 * Sebagian tampilan cuma muncul setelah sesuatu diklik — minigame billiard
 * baru ada setelah mejanya disentuh — dan itu tidak bisa diverifikasi dengan
 * potret halaman-saat-dibuka.
 *
 * ⚠️ Koordinat klik dalam PIKSEL CSS (1440×900), bukan piksel potret. Dengan
 * dpr 2 potretnya 2880×1800, jadi titik yang dibaca dari gambar harus DIBAGI
 * DUA sebelum jadi koordinat klik. Ini sumber salah yang paling sering.
 *
 * Format langkah.json — array, dijalankan berurutan:
 *   {"t":"wait","ms":12000}
 *   {"t":"click","x":720,"y":450}
 *   {"t":"move","x":700,"y":400}
 *   {"t":"drag","from":[700,400],"to":[900,500],"steps":20}
 *   {"t":"key","key":"Escape"}
 *   {"t":"shot","file":"out/a.png"}
 *   {"t":"eval","expr":"document.querySelectorAll('[data-hud]').length","label":"hud"}
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9225;
const URL = process.argv[2] ?? "http://localhost:3000/";
const STEPS = JSON.parse(readFileSync(process.argv[3], "utf8"));
const DPR = Number(process.argv[4] ?? 2);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-drive-profile",
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

  // Klik R3F butuh pointer BERGERAK dulu: raycaster-nya membaca posisi pointer
  // dari mousemove terakhir. Klik tanpa move sebelumnya menembak koordinat
  // basi (0,0) — kena "tidak ada apa-apa" walau titiknya benar.
  const move = async (x, y) => {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "none",
      buttons: 0,
    });
  };

  const click = async (x, y) => {
    await move(x, y);
    await sleep(60);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        buttons: type === "mousePressed" ? 1 : 0,
        clickCount: 1,
      });
      await sleep(30);
    }
  };

  for (const s of STEPS) {
    if (s.t === "wait") {
      await sleep(s.ms);
    } else if (s.t === "move") {
      await move(s.x, s.y);
      await sleep(s.ms ?? 120);
    } else if (s.t === "click") {
      await click(s.x, s.y);
      console.log(`klik ${s.x},${s.y}`);
    } else if (s.t === "drag") {
      const [x0, y0] = s.from;
      const [x1, y1] = s.to;
      const n = s.steps ?? 20;
      await move(x0, y0);
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: x0,
        y: y0,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: x0 + (x1 - x0) * k,
          y: y0 + (y1 - y0) * k,
          button: "left",
          buttons: 1,
        });
        await sleep(16);
      }
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: x1,
        y: y1,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      console.log(`geser ${x0},${y0} -> ${x1},${y1}`);
    } else if (s.t === "key") {
      for (const type of ["keyDown", "keyUp"]) {
        await send("Input.dispatchKeyEvent", { type, key: s.key });
      }
    } else if (s.t === "eval") {
      const m = await send("Runtime.evaluate", {
        expression: s.expr,
        returnByValue: true,
      });
      const v = m.result?.result?.value;
      console.log(`${s.label ?? "eval"}: ${JSON.stringify(v)}`);
    } else if (s.t === "shot") {
      mkdirSync(dirname(s.file), { recursive: true });
      const m = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(s.file, Buffer.from(m.result.data, "base64"));
      console.log(`tersimpan: ${s.file}`);
    }
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

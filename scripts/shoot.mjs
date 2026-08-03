/**
 * Ambil screenshot scene 3D lewat CDP — untuk membandingkan TAMPILAN setelan
 * render secara berdampingan.
 *
 *   node scripts/shoot.mjs <url> <file-keluaran.png> [dpr]
 *
 * Pasangannya `measure-frames.mjs`: yang itu mengukur ONGKOS, yang ini merekam
 * HASILNYA. Keputusan yang menyentuh tampilan butuh keduanya — angka saja
 * membuat orang menukar sesuatu yang tidak seharusnya ditukar.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9224;
const URL = process.argv[2] ?? "http://localhost:3000/";
const OUT = process.argv[3] ?? "shot.png";
const DPR = Number(process.argv[4] ?? 2);

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

  await send("Page.enable");
  // Cukup lama untuk: GLB diunduh, 233 shader dikompilasi, sapuan reveal
  // selesai, dan loader selesai memudar.
  await sleep(12000);

  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT, Buffer.from(data, "base64"));
  console.log(`tersimpan: ${OUT}`);

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

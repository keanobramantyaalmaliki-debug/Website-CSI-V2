/**
 * Screenshot roles-list Careers di /people — varian shoot.mjs yang scroll ke
 * #careers lalu memotret tiga keadaan: tertutup, hover (preview foto ikut
 * kursor), dan accordion terbuka.
 *
 *   node scripts/shoot-careers.mjs [file-keluaran.png] [lebar] [tinggi]
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const OUT = process.argv[2] ?? "shot-careers.png";
const W = Number(process.argv[3] ?? 1440);
const H = Number(process.argv[4] ?? 900);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-shoot-profile",
    `--window-size=${W},${H}`,
    "--force-device-scale-factor=2",
    "http://localhost:3000/people",
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
  await send("Runtime.enable");
  await sleep(12000);

  const evalJs = (expression) =>
    send("Runtime.evaluate", { expression, returnByValue: true });

  const r = await evalJs(`(() => {
    const list = document.querySelector("#careers");
    if (!list) return "MISSING";
    list.scrollIntoView({ block: "start" });
    return "OK";
  })()`);
  if (r?.result?.value !== "OK")
    throw new Error("#careers tidak ketemu: " + JSON.stringify(r?.result));
  await sleep(2500);

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(name, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${name}`);
  };

  await shot(OUT);

  // Hover ke tengah header role ke-2 lewat event mouse asli → preview foto
  // harus muncul mengikuti kursor.
  const pos = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('#careers button[aria-expanded]')];
    const b = btns[1].getBoundingClientRect();
    return { x: Math.round(b.left + b.width * 0.4), y: Math.round(b.top + b.height / 2) };
  })()`);
  const { x, y } = pos.result.value;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await sleep(200);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + 120, y });
  await sleep(800);
  await shot(OUT.replace(/\.png$/, "-hover.png"));

  // Klik header pertama → accordion terbuka, baris lain meredup.
  await evalJs(
    `document.querySelectorAll('#careers button[aria-expanded]')[0].click()`,
  );
  await sleep(1200);
  await shot(OUT.replace(/\.png$/, "-open.png"));

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

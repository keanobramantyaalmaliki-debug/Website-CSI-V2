/**
 * Screenshot section testimonial di /services — varian shoot.mjs yang
 * scroll dulu ke blockquote sebelum memotret.
 *
 *   node scripts/shoot-testimonial.mjs [file-keluaran.png] [lebar] [tinggi]
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9224;
const OUT = process.argv[2] ?? "shot-testimonial.png";
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
    "http://localhost:3000/services",
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

  // Scroll sampai blockquote di tengah viewport, tunggu whileInView selesai.
  const r = await evalJs(`(() => {
    const bq = document.querySelector("#services blockquote");
    if (!bq) return "MISSING";
    bq.scrollIntoView({ block: "center" });
    return "OK";
  })()`);
  if (r?.result?.value !== "OK") throw new Error("blockquote tidak ketemu: " + JSON.stringify(r?.result));
  await sleep(2000);

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(name, Buffer.from(data, "base64"));
    console.log(`tersimpan: ${name}`);
  };

  await shot(OUT);

  // Klik panah next lalu potret lagi — memverifikasi transisi & entri ke-2.
  await evalJs(
    `document.querySelector('button[aria-label="Next testimonial"]').click()`,
  );
  await sleep(1200);
  await shot(OUT.replace(/\.png$/, "-next.png"));

  // Next sekali lagi = entri ke-3 (quote terpendek) — memverifikasi tinggi
  // blok terkunci: panah & section bawah tidak boleh bergeser.
  await evalJs(
    `document.querySelector('button[aria-label="Next testimonial"]').click()`,
  );
  await sleep(1200);
  await shot(OUT.replace(/\.png$/, "-short.png"));

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

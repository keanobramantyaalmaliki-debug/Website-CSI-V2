/**
 * Screenshot beruntun selama jendela sapuan reveal — bukti visual bahwa
 * sapuannya benar-benar BERGERAK, bukan cuma bahwa state machine-nya jalan.
 *
 *   node scripts/debug-sweep-shots.mjs [url] [dirKeluaran]
 *
 * Lahir dari bug 7 Agu 2026 (dev-only): frame pertama mengompilasi shader
 * dengan uniform patch #1, replay StrictMode memasang patch #2, dan karena
 * customProgramCacheKey identik onBeforeCompile tidak dipanggil ulang —
 * progress beku di 0, layar cuma dither statis lalu pop. Log useFrame saat
 * itu TETAP melaporkan t berjalan 0→1, jadi log saja menyesatkan; satu-satunya
 * bukti adalah memotret layarnya. Fix-nya: uniform module-level di
 * revealSweep.ts. Kalau bug sekelasnya kambuh, jalankan ini dua kali —
 * profil dihapus dulu (load dingin, dulunya kena) lalu tanpa hapus (load
 * hangat, dulunya lolos): rm -rf /tmp/csi-sweepshot-profile di antara run.
 *
 * Pola CDP disalin dari measure-frames.mjs (nol dependency).
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9227;
const URL = process.argv[2] ?? "http://localhost:3000/";
const OUTDIR = process.argv[3] ?? "/tmp/sweep-shots";

mkdirSync(OUTDIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-sweepshot-profile",
    "--window-size=1440,900",
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
    } catch {}
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak pernah muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  let sweepStarted = false;
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
      return;
    }
    if (m.method === "Runtime.consoleAPICalled") {
      const text = m.params.args
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      if (/sweep-dbg/.test(text)) console.log(text);
      if (/SAPUAN MULAI/.test(text)) sweepStarted = true;
    }
  });
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: URL });

  // tunggu sapuan mulai (log dev); di build prod log tidak ada — mulai saja
  // 2,5 dtk setelah navigate dan potret jendela yang lebih panjang.
  for (let i = 0; i < 25 && !sweepStarted; i++) await sleep(100);

  for (let i = 0; i < 20; i++) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUTDIR}/sweep-${String(i).padStart(2, "0")}.png`,
      Buffer.from(shot.data, "base64"));
    await sleep(300);
  }
  console.log(`tersimpan di ${OUTDIR}`);

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

/**
 * Rekam GEOMETRI canvas laptop frame demi frame selama membuka & menutup.
 *
 *   node scripts/probe-contact-transition.mjs [url]
 *
 * Kenapa ini yang diukur: rig overlay membatalkan lompatan ukuran lewat
 * `k = size.height / dockHeight`, dan `size` itu keadaan R3F yang datang dari
 * ResizeObserver — TERLAMBAT satu frame atau lebih dari perubahan tata letak DOM.
 * Kalau dugaan itu benar, akan terlihat frame-frame dengan kotak CSS canvas sudah
 * seukuran layar sementara BUFFER gambarnya masih seukuran kotak 52vh (atau
 * sebaliknya saat menutup). Frame seperti itu = gambar yang direntang/dipepat,
 * persis "ngeflick" yang dilaporkan.
 *
 * Yang dicetak per frame: kotak CSS canvas, ukuran buffer (canvas.width/height
 * dibagi dpr), dan rasio antara keduanya. Rasio ≠ 1 = frame cacat.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9243;
const URL = process.argv[2] ?? "http://localhost:3000/";

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-transition-profile",
    "--window-size=1440,900",
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
      if (m.error) console.warn(`CDP menolak: ${JSON.stringify(m.error)}`);
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
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.consoleAPICalled") {
      const txt = m.params.args.map((a) => a.value).join(" ");
      if (txt.includes("[SYNC]")) console.log(`    console: ${txt}`);
    }
  });
  await sleep(12000); // GLB + kompilasi shader + loader memudar

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  const geom = await evaluate(`(() => {
    const el = document.querySelector('[data-inquiry-laptop]');
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height), vh: innerHeight };
  })()`);
  await evaluate(
    `window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2)})`,
  );
  await sleep(2000);

  /* Perekam: satu sampel per rAF selama `ms`, dimulai TEPAT sebelum aksinya. */
  const record = (action, ms) => evaluate(`(() => new Promise((done) => {
    const canvas = document.querySelector('[data-inquiry-laptop] canvas');
    /* Pembungkus yang tata letaknya BERPINDAH (fixed inset-0 ⇄ dalam kotak). */
    const host = canvas.closest('[data-inquiry-laptop] > div');
    const rows = [];
    const t0 = performance.now();
    const tick = () => {
      const r = canvas.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      rows.push({
        t: Math.round(performance.now() - t0),
        cssW: Math.round(r.width), cssH: Math.round(r.height),
        cssTop: Math.round(r.top),
        hostW: Math.round(h.width), hostH: Math.round(h.height),
        hostTop: Math.round(h.top),
      });
      if (performance.now() - t0 < ${ms}) requestAnimationFrame(tick);
      else done(rows);
    };
    requestAnimationFrame(tick);
    ${action}
  }))()`);

  console.log("\n=== MEMBUKA ===");
  const opening = await record(
    `document.querySelector('[data-inquiry-toggle]').click();`,
    2600,
  );
  print(opening);

  await sleep(1500);

  console.log("\n=== MENUTUP ===");
  const closing = await record(
    `document.querySelector('[data-inquiry-close]').click();`,
    3000,
  );
  print(closing);

  ws.close();
  browser.kill();
  process.exit(0);
}

function print(rows) {
  console.log("  t(ms)  host(WxH)@top   canvas(WxH)@top   selisih");
  let prev = null;
  for (const r of rows) {
    const sig = `${r.cssW}x${r.cssH}@${r.cssTop}|${r.hostW}x${r.hostH}@${r.hostTop}`;
    /* Canvas mengisi 100% host-nya. Kalau tidak sama, ini frame cacat: gambar
       laptopnya ada di ukuran/tempat yang bukan tempat host-nya. */
    const bad =
      Math.abs(r.cssH - r.hostH) > 2 ||
      Math.abs(r.cssW - r.hostW) > 2 ||
      Math.abs(r.cssTop - r.hostTop) > 2;
    if (sig !== prev) {
      console.log(
        `  ${String(r.t).padStart(5)}  ${`${r.hostW}x${r.hostH}@${r.hostTop}`.padEnd(15)} ${`${r.cssW}x${r.cssH}@${r.cssTop}`.padEnd(17)} ${bad ? "← CACAT" : "ok"}`,
      );
      prev = sig;
    }
  }
}

main().catch((e) => {
  console.error(e);
  browser.kill();
  process.exit(1);
});

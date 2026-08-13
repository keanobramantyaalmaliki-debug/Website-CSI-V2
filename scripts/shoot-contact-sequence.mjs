/**
 * Potret berurutan selama MacBook membuka dan menutup.
 *
 *   node scripts/shoot-contact-sequence.mjs [url]
 *   → /tmp/csi-contact-seq/open-000.png … close-1600.png
 *
 * Pendamping probe-contact-transition.mjs: probe itu mengukur geometri, ini
 * memperlihatkan akibatnya. Dipakai untuk memeriksa hal yang tidak muncul di
 * angka — misalnya form <Html> yang tergambar menembus punggung lid selama
 * engselnya belum sampai.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9244;
const URL = process.argv[2] ?? "http://localhost:3000/";
const OUT = "/tmp/csi-contact-seq";

mkdirSync(OUT, { recursive: true });

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-seq-profile",
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
  await sleep(12000);

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
  /* Kotaknya SENGAJA tidak ditaruh di tengah viewport: geseran `dockOffsetY`
     justru yang paling gampang salah, dan kalau kotaknya pas di tengah, dy = 0
     dan bug-nya tersembunyi. Ditaruh agak ke bawah. */
  await evaluate(
    `window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2 - 120)})`,
  );
  await sleep(2000);

  const shoot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
  };

  await shoot("open-before");
  await evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  const t0 = Date.now();
  for (let i = 0; i < 14; i++) {
    await shoot(`open-${String(Date.now() - t0).padStart(4, "0")}`);
  }
  await sleep(2000);
  await shoot("open-settled");

  await evaluate(`document.querySelector('[data-inquiry-close]').click(), true`);
  const t1 = Date.now();
  for (let i = 0; i < 16; i++) {
    await shoot(`close-${String(Date.now() - t1).padStart(4, "0")}`);
  }
  await sleep(2000);
  await shoot("close-settled");

  console.log(`potret di ${OUT}`);
  ws.close();
  browser.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  browser.kill();
  process.exit(1);
});

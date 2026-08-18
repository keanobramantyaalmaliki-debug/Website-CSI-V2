/**
 * Potret berurutan selama MacBook membuka dan menutup.
 *
 *   node scripts/shoot-contact-sequence.mjs [url]
 *   → /tmp/csi-contact-seq/open-000.png … close-1600.png
 *
 * Viewport-nya bisa ditukar lewat env — jalur HP (lembar datar + dorongan
 * kamera) hanya hidup di bawah 768px, jadi bawaan desktop tidak akan pernah
 * memotretnya:
 *
 *   CSI_W=390 CSI_H=844 CSI_OUT=/tmp/csi-contact-seq-mobile \
 *     node scripts/shoot-contact-sequence.mjs
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
const OUT = process.env.CSI_OUT ?? "/tmp/csi-contact-seq";
const W = Number(process.env.CSI_W ?? 1440);
const H = Number(process.env.CSI_H ?? 900);
/* dpr 2 kecuali diminta lain: di dpr 1 GPU-nya mentok vsync dan kesimpulan
   performanya salah — lihat catatan di measure-frames.mjs. */
const DPR = Number(process.env.CSI_DPR ?? 2);

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
    `--window-size=${W},${H}`,
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
  /* `--window-size` saja tidak cukup: `innerWidth` ikut chrome jendela, dan
     gerbang `narrow` (<768px) di Contact.tsx membacanya lewat matchMedia. Override
     ini yang membuat halaman benar-benar percaya ia di layar sebesar itu. */
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: DPR,
    mobile: W < 768,
  });
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

  /* ⚠️ Namanya dicap SETELAH potretnya kembali, bukan sebelum. `captureScreenshot`
     bisa tertahan 400–500 ms saat GPU-nya sibuk, dan kalau capnya diambil di
     awal, berkas `open-0137.png` berisi frame ~0,6 dtk — pernah membuat
     kesimpulan "lid-nya menutup dalam 137 ms" yang sepenuhnya salah 18 Agu.
     Cap sesudah = batas ATAS, dan itu arah kesalahan yang aman. */
  const shoot = async (label) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const name = typeof label === "function" ? label() : label;
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
  };

  await shoot("open-before");
  await evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  const t0 = Date.now();
  for (let i = 0; i < 14; i++) {
    await shoot(() => `open-${String(Date.now() - t0).padStart(4, "0")}`);
  }
  await sleep(2000);
  await shoot("open-settled");

  await evaluate(`document.querySelector('[data-inquiry-close]').click(), true`);
  const t1 = Date.now();
  for (let i = 0; i < 16; i++) {
    await shoot(() => `close-${String(Date.now() - t1).padStart(4, "0")}`);
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

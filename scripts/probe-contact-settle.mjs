/**
 * Melacak KOTAK LAPTOP DI LAYAR frame demi frame selama menutup.
 *
 *   node scripts/probe-contact-settle.mjs [url]
 *
 * probe-contact-transition.mjs mengukur geometri CANVAS-nya; itu sudah bersih.
 * Yang dilaporkan Keano justru gambar di dalamnya: sesudah ditutup laptopnya
 * berhenti di pose yang bukan pose awal, lalu MENYENTAK ke pose awal. Sentakan
 * seperti itu tidak terlihat di ukuran canvas — hanya di piksel.
 *
 * Cara mengukurnya: rekam layar lewat `Page.startScreencast` (jauh lebih rapat
 * daripada captureScreenshot berulang — ~satu frame per frame), lalu untuk tiap
 * frame cari kotak batas piksel TERANG. Laptopnya putih di atas latar hampir
 * hitam, jadi ambang luminansi sudah cukup; tidak perlu pustaka PNG.
 *
 * Yang dicetak: pusat & lebar kotak itu per frame, plus selisihnya dari frame
 * sebelumnya. Gerak pegas = selisih kecil yang mengecil terus. SENTAKAN =
 * satu baris dengan selisih besar SETELAH baris-baris yang sudah tenang —
 * itulah yang dicari, dan `← SENTAK` menandainya.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9245;
const URL = process.argv[2] ?? "http://localhost:3000/";
/** Di bawah ini gerakan dianggap sudah tenang (px per frame). */
const CALM = 1.5;
/** Selisih di atas ini, setelah tenang, = sentakan. */
const JUMP = 3;

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-settle-profile",
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
  const frames = [];
  let collecting = false;
  let t0 = 0;

  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      if (m.error) console.warn(`CDP menolak: ${JSON.stringify(m.error)}`);
      pending.get(m.id)(m.result);
      pending.delete(m.id);
      return;
    }
    if (m.method === "Page.screencastFrame") {
      /* WAJIB di-ack, kalau tidak alirannya berhenti setelah satu frame. */
      send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
      if (collecting) {
        frames.push({ t: Math.round(performance.now() - t0), data: m.params.data });
      }
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
  /* Sengaja TIDAK di tengah viewport — kalau pas di tengah, dockOffsetY = 0 dan
     separuh koreksinya tidak ikut teruji. Sama seperti shoot-contact-sequence. */
  await evaluate(
    `window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2 - 120)})`,
  );
  await sleep(2000);

  /* Pose ISTIRAHAT, sebelum disentuh sama sekali — ini pembanding sebenarnya. */
  await send("Page.startScreencast", {
    format: "jpeg",
    quality: 80,
    everyNthFrame: 1,
  });
  collecting = true;
  t0 = performance.now();
  await sleep(400);
  collecting = false;
  const restFrames = frames.splice(0);

  await evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  await sleep(3500);

  collecting = true;
  t0 = performance.now();
  await evaluate(`document.querySelector('[data-inquiry-close]').click(), true`);
  await sleep(4000);
  collecting = false;
  await send("Page.stopScreencast");

  const closing = frames.splice(0);

  /* Analisis DI DALAM HALAMAN: JPEG-nya digambar ke canvas 2D lalu dipindai.
     Dikirim per potongan supaya tidak ada satu expression raksasa. */
  await evaluate(`(() => {
    window.__bbox = async (dataUrl) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + dataUrl;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
      /* Ambang tinggi + hanya separuh bawah layar: navbar & kartu hero di atas
         juga terang, dan laptopnya selalu di bawah garis itu. */
      const yStart = (c.height / 2) | 0;
      for (let y = yStart; y < c.height; y++) {
        for (let px = 0; px < c.width; px++) {
          const i = (y * c.width + px) * 4;
          if (d[i] > 170 && d[i + 1] > 170 && d[i + 2] > 170) {
            if (px < lo) lo = px;
            if (px > hi) hi = px;
            if (y < top) top = y;
            if (y > bot) bot = y;
          }
        }
      }
      if (lo === Infinity) return null;
      return { cx: (lo + hi) / 2, cy: (top + bot) / 2, w: hi - lo, h: bot - top };
    };
    return true;
  })()`);

  const measure = async (list) => {
    const out = [];
    for (const f of list) {
      const b = await evaluate(
        `window.__bbox(${JSON.stringify(f.data)})`,
      );
      if (b) out.push({ t: f.t, ...b });
    }
    return out;
  };

  const rest = await measure(restFrames.slice(-3));
  const shut = await measure(closing);

  const ref = rest.at(-1);
  console.log(
    `\nPOSE ISTIRAHAT (sebelum diklik): cx=${ref.cx.toFixed(1)} cy=${ref.cy.toFixed(1)} w=${ref.w} h=${ref.h}`,
  );

  console.log("\n=== MENUTUP === (Δ = geser dari frame sebelumnya, px)");
  console.log("  t(ms)     cx      cy      w      h     Δ");
  let prev = null;
  let calmSince = null;
  for (const r of shut) {
    const d = prev
      ? Math.hypot(r.cx - prev.cx, r.cy - prev.cy) + Math.abs(r.w - prev.w)
      : 0;
    if (prev && d < CALM && calmSince === null) calmSince = r.t;
    const snap = calmSince !== null && d > JUMP;
    if (snap) calmSince = null;
    console.log(
      `  ${String(r.t).padStart(5)}  ${r.cx.toFixed(1).padStart(6)}  ${r.cy
        .toFixed(1)
        .padStart(6)}  ${String(r.w).padStart(5)}  ${String(r.h).padStart(5)}  ${d
        .toFixed(1)
        .padStart(5)}  ${snap ? "← SENTAK" : ""}`,
    );
    prev = r;
  }

  const last = shut.at(-1);
  console.log(
    `\nSELISIH AKHIR vs pose istirahat: Δcx=${(last.cx - ref.cx).toFixed(1)} Δcy=${(
      last.cy - ref.cy
    ).toFixed(1)} Δw=${last.w - ref.w} Δh=${last.h - ref.h}`,
  );

  ws.close();
  browser.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  browser.kill();
  process.exit(1);
});

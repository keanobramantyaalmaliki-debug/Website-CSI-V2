/**
 * Reproduksi keluhan 23 Agu: "buka website → scroll ke Industries → strip
 * putihnya ada tapi PLANK baru muncul 2-3 detik kemudian".
 *
 * Meniru urutan user: load dingin (cache dimatikan via CDP), begitu dokumen
 * siap langsung wheel beruntun sampai strip Industries masuk viewport, lalu
 * memotret viewport tiap ~250ms selama beberapa detik. Sambil itu halaman
 * diinstrumentasi (Page.addScriptToEvaluateOnNewDocument):
 *   - PerformanceObserver longtask  → daftar task >50ms + kapan & berapa lama
 *   - MutationObserver              → kapan elemen <canvas> muncul di dalam
 *                                     [data-testid="industries-stack"]
 * Di akhir keduanya didump, jadi timeline screenshot bisa disandingkan dengan
 * "canvas sudah mount belum" dan "main thread lagi keblok siapa".
 *
 *   node scripts/probe-industries-late-planks.mjs [url] [kbps] [outdir]
 *
 *   kbps — throttle bandwidth (meniru unduhan office.glb publik yang lambat);
 *          0 / kosong = tanpa throttle. Coba dua-duanya: tanpa throttle dulu,
 *          kalau tak reproduksi baru throttle.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9235;
const BASE = process.argv[2] ?? "http://localhost:3000/";
const KBPS = Number(process.argv[3] ?? 0);
const OUT_DIR = process.argv[4] ?? "/tmp/industries-late-planks";

mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    `--user-data-dir=/tmp/csi-probe-late-${Date.now()}`,
    "--window-size=1440,900",
    "--force-device-scale-factor=1",
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
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true }))
      ?.result?.value;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  // Load dingin sungguhan: cache HTTP dimatikan.
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  // BLOCK_GLB=1 → office.glb tidak pernah datang: memisahkan "canvas
  // Industries lambat sendiri" dari "antre di belakang pipeline GPU hero".
  if (process.env.BLOCK_GLB) {
    await send("Network.setBlockedURLs", { urls: ["*.glb"] });
    console.log("office.glb DIBLOKIR");
  }
  if (KBPS > 0) {
    await send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 40,
      downloadThroughput: (KBPS * 1024) / 8,
      uploadThroughput: (KBPS * 1024) / 8,
    });
    console.log(`throttle: ${KBPS} kbps`);
  }

  // Instrumentasi sebelum skrip halaman jalan.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__probe = { longtasks: [], canvasAt: null, glbDoneAt: null };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            window.__probe.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
        }).observe({ entryTypes: ["longtask"] });
      } catch {}
      try {
        // Kapan office.glb selesai (proxy "hero mulai parse + kompilasi shader").
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (e.name.includes(".glb"))
              window.__probe.glbDoneAt = Math.round(e.responseEnd);
        }).observe({ entryTypes: ["resource"], buffered: true });
      } catch {}
      // documentElement belum tentu ada saat skrip ini jalan (dokumen baru
      // lahir) — observer canvas dipasang lewat interval polling murah saja.
      const iv = setInterval(() => {
        if (document.querySelector('[data-testid="industries-stack"] canvas')) {
          window.__probe.canvasAt = Math.round(performance.now());
          clearInterval(iv);
        }
      }, 50);
      // ── Siapa menggambar kapan ──────────────────────────────────────────
      // getContext ditandai per-canvas; draw call pertama TIAP context dicatat
      // dengan "apakah canvasnya di dalam strip Industries". Ini membedakan
      // "invalidate telat dijadwalkan" (draw pertama ikut telat) dari
      // "digambar cepat tapi present/composite-nya yang telat".
      window.__probe.contexts = [];
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        const ctx = origGetContext.apply(this, args);
        if (ctx && String(args[0]).startsWith("webgl") && !ctx.__seen) {
          ctx.__seen = true;
          window.__probe.contexts.push({
            at: Math.round(performance.now()),
            call: "getContext:" + args[0],
            inStrip: !!this.closest?.('[data-testid="industries-stack"]'),
          });
        }
        return ctx;
      };
      const tagDraw = (proto, name) => {
        const orig = proto[name];
        if (!orig) return;
        proto[name] = function (...args) {
          if (!this.__firstDraw) {
            this.__firstDraw = true;
            const c = this.canvas;
            const inStrip = !!(c && c.closest &&
              c.closest('[data-testid="industries-stack"]'));
            window.__probe.contexts.push({
              at: Math.round(performance.now()),
              call: name,
              inStrip,
              w: c?.width, h: c?.height,
            });
          }
          return orig.apply(this, args);
        };
      };
      for (const P of [window.WebGLRenderingContext?.prototype,
                       window.WebGL2RenderingContext?.prototype]) {
        if (!P) continue;
        tagDraw(P, "drawElements");
        tagDraw(P, "drawArrays");
        tagDraw(P, "drawElementsInstanced");
        tagDraw(P, "drawArraysInstanced");
      }
    `,
  });

  const t0 = Date.now();
  const now = () => ((Date.now() - t0) / 1000).toFixed(2);
  await send("Page.navigate", { url: BASE });

  // Tunggu DOM interaktif secukupnya (user juga butuh ~1 dtk sebelum mulai
  // scroll), lalu wheel beruntun ke bawah sampai strip masuk viewport —
  // wheel, bukan scrollTo: Lenis menarik balik lompatan native.
  // WAIT_MS besar (mis. 10000) = varian "scroll santai": hero sudah selesai
  // total sebelum scroll, buat mengisolasi kontensi startup hero.
  await sleep(Number(process.env.WAIT_MS ?? 1500));

  const shots = [];
  let shotN = 0;
  const shot = async (label) => {
    const r = await send("Page.captureScreenshot", {
      format: "png",
      optimizeForSpeed: true,
    });
    if (!r?.data) return;
    const name = `${String(shotN++).padStart(2, "0")}-${label}-t${now()}s.png`;
    writeFileSync(join(OUT_DIR, name), Buffer.from(r.data, "base64"));
    shots.push(name);
  };

  const wheel = (deltaY) =>
    send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 720,
      y: 450,
      deltaX: 0,
      deltaY,
    });

  // Scroll agresif ala user penasaran: rentetan wheel besar sampai strip
  // kelihatan (top < 70% viewport), maksimal ~10 dtk.
  const stripVisible = `(() => {
    const el = document.querySelector('[data-testid="industries-stack"]');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, top: Math.round(r.top), vh: innerHeight };
  })()`;
  let arrived = false;
  for (let i = 0; i < 100 && !arrived; i++) {
    await wheel(900);
    await sleep(90);
    const s = await evaluate(stripVisible);
    if (s?.found && s.top < s.vh * 0.55) arrived = true;
  }
  console.log(`sampai strip pada t=${now()}s`);
  // Rapikan: strip ke tengah viewport via wheel halus.
  for (let i = 0; i < 6; i++) {
    const s = await evaluate(stripVisible);
    if (!s?.found) break;
    const off = s.top - Math.round((s.vh - 765) / 2);
    if (Math.abs(off) < 60) break;
    await wheel(Math.max(-600, Math.min(600, off)));
    await sleep(120);
  }

  // Potret beruntun 6 dtk — di sinilah "plank telat" harusnya kelihatan.
  // Tiap lembar dicatat juga: canvas Industries sudah ada di DOM atau belum,
  // supaya "mount telat" vs "mount tapi telat gambar" bisa dibedakan.
  for (let i = 0; i < 24; i++) {
    const hasCanvas = await evaluate(
      `!!document.querySelector('[data-testid="industries-stack"] canvas')`,
    );
    console.log(`t=${now()}s canvas=${hasCanvas}`);
    await shot("strip");
    await sleep(130);
  }

  const probe = await evaluate("window.__probe");
  const navStart = await evaluate("performance.timeOrigin");
  console.log("canvas Industries mount pada:", probe?.canvasAt, "ms sejak navigasi");
  console.log("office.glb selesai unduh pada:", probe?.glbDoneAt, "ms");
  console.log("longtasks (>50ms):", JSON.stringify(probe?.longtasks ?? []));
  console.log("draw pertama per context:", JSON.stringify(probe?.contexts ?? []));
  console.log("navStart epoch:", navStart, "| probe t0 epoch:", t0);
  console.log(`screenshot: ${shots.length} lembar di ${OUT_DIR}`);

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

/**
 * Reproduksi keluhan "deploy publik: loading nggak selesai-selesai".
 *
 * Menyerve dist/ (jalankan `bunx vite preview` dulu, port 4173), lalu membuka
 * halaman lewat Brave headless dengan THROTTLING jaringan via CDP — meniru
 * kondisi server publik yang bandwidth-nya terbatas.
 *
 *   node scripts/probe-public-loading.mjs [kbps] [blockGlb]
 *
 *   kbps     — bandwidth turun, default 2000 (≈2 Mbps, 4G pas-pasan)
 *   blockGlb — "block" untuk mensimulasikan office.glb GAGAL (404/putus)
 *
 * Yang dicetak tiap detik: apakah overlay loader (z-[60]) masih ada, dan
 * progres unduhan office.glb. Plus semua console error dari halaman.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;
const URL = "http://localhost:4173/";
const KBPS = Number(process.argv[2] ?? 2000);
const BLOCK_GLB = process.argv[3] === "block";
const MAX_S = 120;

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-probe-public",
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
    } catch {
      /* belum siap */
    }
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const glb = { received: 0, total: 0, done: false, failed: "" };

  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      if (m.error) console.warn(`CDP menolak: ${JSON.stringify(m.error)}`);
      pending.get(m.id)(m.result);
      pending.delete(m.id);
      return;
    }
    // Pantau unduhan office.glb + error console
    if (m.method === "Network.responseReceived") {
      const u = m.params.response.url;
      if (u.includes("office.glb")) {
        const h = m.params.response.headers;
        glb.total = Number(h["content-length"] ?? h["Content-Length"] ?? 0);
        glb.reqId = m.params.requestId;
        console.log(`  [net] office.glb status=${m.params.response.status} total=${glb.total}`);
      }
    }
    if (m.method === "Network.dataReceived" && m.params.requestId === glb.reqId) {
      glb.received += m.params.dataLength;
    }
    if (m.method === "Network.loadingFinished" && m.params.requestId === glb.reqId) {
      glb.done = true;
    }
    if (m.method === "Network.loadingFailed" && m.params.requestId === glb.reqId) {
      glb.failed = m.params.errorText;
    }
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
      const txt = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300);
      console.log(`  [console.${m.params.type}] ${txt}`);
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
  await send("Network.enable");
  // Tanpa dua baris ini run kedua membaca dari disk cache dan throttle-nya
  // tidak menyentuh apa pun — persis yang terjadi saat skrip ini pertama
  // dipakai: glb "selesai" di detik 1.
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Network.clearBrowserCache");

  if (BLOCK_GLB) {
    await send("Network.setBlockedURLs", { urls: ["*office.glb*"] });
    console.log("MODE: office.glb DIBLOKIR (simulasi 404/koneksi putus)");
  }

  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100,
    downloadThroughput: (KBPS * 1000) / 8,
    uploadThroughput: (KBPS * 1000) / 8,
  });
  console.log(`MODE: throttle ${KBPS} kbps, RTT 100 ms → ${URL}`);

  await send("Page.navigate", { url: URL });

  const t0 = Date.now();
  let overlaySeen = false;
  let loaderGoneAt = null;
  let retryClicked = false;
  for (let s = 0; s < MAX_S; s++) {
    await sleep(1000);
    const { result } = await send("Runtime.evaluate", {
      expression: `(() => {
        const overlay = document.querySelector('div.fixed.inset-0[class*="z-[60]"]');
        const canvas3d = document.querySelector('section canvas, [class*="h-dvh"] canvas');
        const retry = [...document.querySelectorAll('button')].find(b => /reload 3d/i.test(b.textContent));
        return JSON.stringify({
          overlay: !!overlay,
          canvas3d: !!canvas3d,
          label: overlay?.textContent?.trim() ?? "",
          retry: !!retry,
        });
      })()`,
      returnByValue: true,
    });
    const st = JSON.parse(result?.value ?? "{}");
    if (st.overlay) overlaySeen = true;
    const pct = glb.total ? Math.round((glb.received / glb.total) * 100) : 0;
    const elapsed = Math.round((Date.now() - t0) / 1000);
    console.log(
      `t=${elapsed}s overlay=${st.overlay ? "MASIH" : overlaySeen ? "hilang" : "belum-ada"} canvas=${st.canvas3d ? "ada" : "-"} glb=${pct}%${glb.done ? " (selesai)" : ""}${glb.failed ? ` GAGAL:${glb.failed}` : ""}${st.label ? ` teks="${st.label}"` : ""}${st.retry ? " [tombol retry TAMPIL]" : ""}`,
    );
    // Baru dianggap "selesai loading" kalau overlay-nya PERNAH ada lalu hilang
    // — di detik-detik awal JS belum termuat, jadi absennya overlay bukan
    // berarti loading beres.
    if (overlaySeen && !st.overlay && loaderGoneAt === null) {
      loaderGoneAt = elapsed;
      console.log(`\n>>> Overlay loader hilang di detik ke-${loaderGoneAt}\n`);
      if (!BLOCK_GLB) break;
    }

    // Mode blokir: begitu tombol retry tampil, buka blokirnya lalu klik —
    // menguji pemulihan DI TEMPAT (tanpa reload halaman).
    if (BLOCK_GLB && st.retry && !retryClicked) {
      retryClicked = true;
      await send("Network.setBlockedURLs", { urls: [] });
      await send("Runtime.evaluate", {
        expression: `[...document.querySelectorAll('button')].find(b => /reload 3d/i.test(b.textContent))?.click()`,
      });
      console.log(">>> Blokir dibuka + tombol retry DIKLIK — menunggu pemulihan…");
    }
    if (BLOCK_GLB && retryClicked && glb.done && st.canvas3d) {
      console.log(`\n>>> PULIH di detik ke-${elapsed}: glb terunduh & canvas 3D hidup lagi.\n`);
      break;
    }
  }
  if (loaderGoneAt === null)
    console.log(
      overlaySeen
        ? `\n>>> Overlay loader MASIH MENUTUPI layar setelah ${MAX_S} detik.\n`
        : `\n>>> Overlay tidak pernah terdeteksi — periksa selector/halaman.\n`,
    );

  chrome.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

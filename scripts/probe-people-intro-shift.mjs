/**
 * Probe: "konten di bawah hero ikut geser turun lalu balik" di HP (/people).
 *
 * Hipotesis yang diuji: hero `h-[70dvh]` — `dvh` ikut BERNAPAS bersama bilah
 * URL browser HP. Toolbar sembunyi → dvh membesar → hero memanjang → seluruh
 * konten di bawahnya bergeser TURUN di koordinat dokumen; toolbar balik →
 * konten balik ke posisi semula.
 *
 * Bilah URL tidak bisa diemulasi CDP, jadi yang disimulasikan efeknya:
 * ubah tinggi viewport emulasi tanpa menyentuh scrollY, lalu ukur offset
 * dokumen section pertama.
 *
 *   node scripts/probe-people-intro-shift.mjs [url] [w] [h_kecil] [h_besar]
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9243;
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const W = Number(process.argv[3] ?? 390);
const H_SMALL = Number(process.argv[4] ?? 788); // toolbar TAMPIL
const H_BIG = Number(process.argv[5] ?? 844); // toolbar SEMBUNYI

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-people-shift-profile",
    `--window-size=${W},${H_BIG}`,
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

const PROBE = `(() => {
  const hero = document.getElementById('office');
  const sec = document.querySelector('main section');
  const doc = document.scrollingElement;
  const r = (el) => { const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), h: Math.round(b.height),
             docTop: Math.round(b.top + doc.scrollTop) }; };
  const chain = [];
  for (let el = sec; el && el !== document.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.transform !== 'none' || cs.translate !== 'none' || cs.position !== 'static')
      chain.push({ tag: el.tagName.toLowerCase() + (el.id ? '#'+el.id : ''),
                   pos: cs.position, transform: cs.transform, translate: cs.translate });
  }
  return {
    scrollY: Math.round(doc.scrollTop),
    innerHeight: innerHeight,
    dvh100: Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--probe-dvh')) || 0),
    hero: hero ? r(hero) : null,
    firstSection: sec ? { id: sec.id, ...r(sec) } : null,
    docHeight: doc.scrollHeight,
    chain,
  };
})()`;

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
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = (expression) =>
    send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r?.result?.value);

  await send("Page.enable");
  await send("Runtime.enable");
  const metrics = (h) => send("Emulation.setDeviceMetricsOverride", {
    width: W, height: h, deviceScaleFactor: 2, mobile: true,
  });
  await metrics(H_BIG);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  await send("Page.navigate", { url: BASE + "/people" });
  await sleep(15000);

  // sisipkan pengukur 100dvh murni
  await evaluate(`(() => {
    let p = document.getElementById('__dvhprobe');
    if (!p) { p = document.createElement('div'); p.id = '__dvhprobe';
      p.style.cssText='position:absolute;top:0;left:0;width:1px;height:100dvh;pointer-events:none;visibility:hidden';
      document.body.appendChild(p); }
    const ro = () => document.documentElement.style.setProperty('--probe-dvh', p.getBoundingClientRect().height + 'px');
    ro(); new ResizeObserver(ro).observe(p); return true;
  })()`);

  const out = {};
  // 1. diam di puncak
  await evaluate(`window.scrollTo(0,0)`); await sleep(900);
  out.top_hBig = await evaluate(PROBE);

  // 2. gulir sampai batas hero↔konten
  const y = Math.round(out.top_hBig.hero.h * 0.75);
  await evaluate(`window.scrollTo(0, ${y})`); await sleep(1200);
  out.scrolled_hBig = await evaluate(PROBE);

  // 3. viewport MENGECIL (bilah URL muncul) — scrollY tidak disentuh
  await metrics(H_SMALL); await sleep(1200);
  out.scrolled_hSmall = await evaluate(PROBE);

  // 4. balik MEMBESAR (bilah URL sembunyi lagi)
  await metrics(H_BIG); await sleep(1200);
  out.scrolled_hBig_again = await evaluate(PROBE);

  console.log(JSON.stringify(out, null, 2));
  const a = out.scrolled_hBig, b = out.scrolled_hSmall;
  console.log("\n── RINGKAS ──");
  console.log(`viewport ${H_BIG} → ${H_SMALL} (Δ${H_SMALL - H_BIG}px)`);
  console.log(`  tinggi hero      : ${a.hero.h} → ${b.hero.h}  (Δ${b.hero.h - a.hero.h})`);
  console.log(`  docTop section-1 : ${a.firstSection.docTop} → ${b.firstSection.docTop}  (Δ${b.firstSection.docTop - a.firstSection.docTop})`);
  console.log(`  top layar sec-1  : ${a.firstSection.top} → ${b.firstSection.top}  (Δ${b.firstSection.top - a.firstSection.top})`);
  console.log(`  scrollY          : ${a.scrollY} → ${b.scrollY}`);
  ws.close();
}

main().catch((e) => { console.error("GAGAL:", e); process.exitCode = 1; })
  .finally(() => chrome.kill());

/**
 * Audit JARAK di tampilan mobile: ukur (1) celah visual antar section
 * bertetangga dan (2) jarak heading→subteks di tiap section, pada emulasi
 * device 390×844 + touch.
 *
 *   node scripts/measure-mobile-spacing.mjs [url-dasar] [file-keluaran]
 *
 * Cara ukurnya RENDERED, bukan baca kelas Tailwind:
 *  - sweep dulu ke dasar halaman supaya semua animasi whileInView `once`
 *    selesai (kalau tidak, elemen ber-`y: 8` awal bikin angka meleset),
 *    lalu balik ke atas dan ukur di scrollY 0;
 *  - "isi" section = union rect semua text node + media (img/canvas/svg/
 *    video), jadi celah antar section = jarak piksel yang benar-benar
 *    terlihat mata, berapapun kombinasi padding/margin penyusunnya.
 *
 * Turunan dari shoot-mobile-audit.mjs — lihat shoot.mjs untuk catatan
 * pilihan flag & Brave-bukan-Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9232;
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = process.argv[3] ?? "/tmp/mobile-spacing-report.json";
const W = 390;
const H = 844;

// /careers telanjang cuma redirect ke /people#careers — tidak perlu disweep.
const ROUTES = (
  process.env.CSI_ROUTES?.split(",") ?? [
    "/",
    "/services",
    "/work",
    "/people",
    "/careers/full-stack-engineer",
  ]
).map((r) => r.trim());

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-mobile-audit-profile",
    `--window-size=${W},${H}`,
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

// Diukur SETELAH sweep, di scrollY 0 (sticky header PeopleValues balik ke
// posisi natural). Semua koordinat dikonversi ke koordinat halaman.
const MEASURE_EXPR = `(() => {
  const sy = () => window.scrollY;
  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return true;
  };

  // Section tingkat-atas: <section> atau <article> ber-shell yang tidak
  // bersarang di section lain (Contact punya div.section-shell di dalam).
  const all = [...document.querySelectorAll('section, article.section-shell')];
  const tops = all.filter((s) => {
    if (!visible(s)) return false;
    const r = s.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    return !all.some((o) => o !== s && o.contains(s));
  }).sort((a, b) =>
    a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  // Union rect isi yang kelihatan: text node + media.
  const contentUnion = (root) => {
    let top = Infinity, bottom = -Infinity;
    const push = (r) => {
      if (r.width <= 0 || r.height <= 0) return;
      if (r.top + sy() < top) top = r.top + sy();
      if (r.bottom + sy() > bottom) bottom = r.bottom + sy();
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const p = n.parentElement;
      if (!visible(p)) continue;
      const cs = getComputedStyle(p);
      if (Number(cs.opacity) === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) push(r);
    }
    for (const m of root.querySelectorAll('img, canvas, svg, video')) {
      if (!visible(m)) continue;
      push(m.getBoundingClientRect());
    }
    return top === Infinity ? null : { top: Math.round(top), bottom: Math.round(bottom) };
  };

  const sections = tops.map((s) => {
    const r = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    const union = contentUnion(s);

    // Heading pertama + <p> terdekat sebelum (eyebrow) & sesudah (subteks).
    const head = [...s.querySelectorAll('h1, h2, h3')].find(
      (h) => visible(h) && h.getBoundingClientRect().height > 0);
    let headInfo = null;
    if (head) {
      const hr = head.getBoundingClientRect();
      const ps = [...s.querySelectorAll('p')].filter(
        (p) => visible(p) && p.getBoundingClientRect().height > 0);
      const after = ps.find((p) =>
        head.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING);
      const before = [...ps].reverse().find((p) =>
        head.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING);
      const gapOf = (a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return Math.round(rb.top - ra.bottom);
      };
      headInfo = {
        headText: head.textContent.trim().slice(0, 40),
        headTag: head.tagName.toLowerCase(),
        subText: after ? after.textContent.trim().slice(0, 40) : null,
        gapHeadToSub: after ? gapOf(head, after) : null,
        subMarginTop: after ? getComputedStyle(after).marginTop : null,
        eyebrowText: before ? before.textContent.trim().slice(0, 40) : null,
        gapEyebrowToHead: before ? gapOf(before, head) : null,
      };
    }

    return {
      id: s.id || null,
      tag: s.tagName.toLowerCase(),
      cls: (typeof s.className === 'string' ? s.className : '')
        .split(/\\s+/).slice(0, 6).join(' '),
      boxTop: Math.round(r.top + sy()),
      boxBottom: Math.round(r.bottom + sy()),
      padTop: cs.paddingTop, padBottom: cs.paddingBottom,
      marTop: cs.marginTop, marBottom: cs.marginBottom,
      content: union,
      head: headInfo,
    };
  });

  const pairs = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1];
    pairs.push({
      from: a.id ?? a.cls, to: b.id ?? b.cls,
      gapVisual: a.content && b.content ? b.content.top - a.content.bottom : null,
      gapBox: b.boxTop - a.boxBottom,
      aPadBottom: a.padBottom, bPadTop: b.padTop,
    });
  }

  return { vw: innerWidth, coarse: matchMedia('(pointer: coarse)').matches,
           sections, pairs };
})()`;

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
  const evaluate = (expression) =>
    send("Runtime.evaluate", { expression, returnByValue: true });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });

  const report = {};
  for (const route of ROUTES) {
    await send("Page.navigate", { url: BASE + route });
    const heavy = !route.startsWith("/careers");
    await sleep(heavy ? 14000 : 6000);

    // Sweep sampai dasar supaya whileInView `once` semuanya terpicu.
    const dims = (
      await evaluate(
        `({ h: document.scrollingElement.scrollHeight, vh: innerHeight })`,
      )
    )?.result?.value;
    const step = Math.round(dims.vh * 0.85);
    const maxY = Math.max(0, dims.h - dims.vh);
    for (let y = 0; ; y += step) {
      const t = Math.min(y, maxY);
      await evaluate(`window.scrollTo(0, ${t})`);
      await sleep(900);
      if (t >= maxY) break;
    }
    await evaluate(`window.scrollTo(0, 0)`);
    await sleep(1500);

    const state = (await evaluate(MEASURE_EXPR))?.result?.value;
    report[route] = state;
    console.log(route, "sections:", state?.sections?.length);
  }

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`laporan: ${OUT}`);
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

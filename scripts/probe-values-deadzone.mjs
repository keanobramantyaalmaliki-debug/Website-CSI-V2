/**
 * Bukti "nyangkut" di What We Stand For (/people): scroll bertahap melewati
 * seluruh section values sambil mencatat posisi ketiga panel + label + section
 * berikutnya. Zona mati = rentang scrollY di mana TIDAK ADA satupun elemen itu
 * yang bergerak di layar (semua sticky/tertutup) — di situlah scroll terasa
 * macet.
 *
 *   node scripts/probe-values-deadzone.mjs
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-values-deadzone",
    "--window-size=1440,900",
    "http://localhost:3000/people",
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
      target = (await json("/json/list")).find((t) => t.type === "page");
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
  const evalJs = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })).result
      .value;

  await send("Page.enable");
  await send("Runtime.enable");
  await sleep(12000);

  // Batas section values di koordinat dokumen.
  const bounds = await evalJs(`(() => {
    const sec = document.querySelector("#people-values");
    const r = sec.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) };
  })()`);
  if (!bounds) throw new Error("#people-values tidak ketemu");

  // scrollTo + ukur SINKRON dalam satu expression — bebas balapan dengan Lenis.
  // Sampling tiap 10px dari sebelum section sampai lewat ujungnya.
  const from = bounds.top - 900;
  const to = bounds.bottom + 300;
  const samples = await evalJs(`(() => {
    const tops = () => {
      const h2s = [...document.querySelectorAll("#people-values li h2")];
      const label = [...document.querySelectorAll("#people-values p")].find(
        (p) => p.textContent.trim() === "What We Stand For",
      );
      const next = document.querySelector("#people-values").nextElementSibling;
      return [
        ...h2s.map((h) => Math.round(h.getBoundingClientRect().top)),
        label ? Math.round(label.getBoundingClientRect().top) : null,
        next ? Math.round(next.getBoundingClientRect().top) : null,
      ];
    };
    const out = [];
    for (let y = ${from}; y <= ${to}; y += 10) {
      window.scrollTo(0, y);
      out.push([y, ...tops()]);
    }
    window.scrollTo(0, 0);
    return out;
  })()`);

  console.log(`section: ${bounds.top}..${bounds.bottom} (tinggi ${bounds.bottom - bounds.top})`);
  console.log("kolom: scrollY | h2#1 h2#2 h2#3 | label | nextSection (viewport top)");

  // Zona mati: langkah di mana ketiga h2 + label semuanya diam (delta 0)
  // — satu-satunya gerak tinggal section berikutnya jauh di bawah.
  let zoneStart = null;
  const zones = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    const frozen = [1, 2, 3, 4].every(
      (k) => prev[k] != null && cur[k] != null && cur[k] === prev[k],
    );
    if (frozen && zoneStart == null) zoneStart = prev[0];
    if (!frozen && zoneStart != null) {
      zones.push([zoneStart, prev[0]]);
      zoneStart = null;
    }
  }
  if (zoneStart != null) zones.push([zoneStart, samples[samples.length - 1][0]]);

  for (const [a, b] of zones) {
    if (b - a < 30) continue; // riak kecil, abaikan
    const at = samples.find((s) => s[0] === a);
    console.log(
      `ZONA MATI: scrollY ${a}..${b} (${b - a}px) — h2#3 di ${at[3]}, next section di ${at[5]}`,
    );
  }
  if (!zones.some(([a, b]) => b - a >= 30)) console.log("tidak ada zona mati ≥30px");

  // Cetak juga sampel di sekitar transisi panel 2 → 3 untuk dilihat manual.
  const pin3 = samples.find((s) => s[3] != null && s[3] <= 110);
  if (pin3) {
    const idx = samples.indexOf(pin3);
    for (let i = Math.max(0, idx - 5); i < Math.min(samples.length, idx + 25); i += 2) {
      const s = samples[i];
      console.log(`y=${s[0]}  h2: ${s[1]} ${s[2]} ${s[3]}  label: ${s[4]}  next: ${s[5]}`);
    }
  }

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

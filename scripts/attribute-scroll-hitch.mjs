/**
 * Atribusi hitch scroll di /people: wheel-scroll dari atas ke bawah sambil
 * mencatat scrollY tiap frame; cetak frame terpanjang + posisinya relatif
 * terhadap batas-batas section. Jawaban untuk "lag-nya di section mana?".
 *
 *   node scripts/attribute-scroll-hitch.mjs [dpr] [cpuThrottle]
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9227;
const DPR = Number(process.argv[2] ?? 2);
const THROTTLE = Number(process.argv[3] ?? 1);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-attr-hitch",
    "--window-size=1440,900",
    `--force-device-scale-factor=${DPR}`,
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
  const evalJs = (expression, awaitPromise = false) =>
    send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });

  await send("Page.enable");
  await send("Runtime.enable");
  if (THROTTLE > 1)
    await send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await sleep(12000);

  // Peta section: id → [top, bottom] (posisi dokumen).
  const sections = (
    await evalJs(`(() => {
      return [...document.querySelectorAll("section[id], div[id]")]
        .filter((el) => el.id && el.getBoundingClientRect().height > 200)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.id, top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) };
        });
    })()`)
  ).result.value;

  // Mulai perekam frame di halaman, lalu wheel dari luar.
  await evalJs(`(() => {
    window.__frames = [];
    let prev = performance.now();
    function loop(now) {
      window.__frames.push([now - prev, Math.round(scrollY)]);
      prev = now;
      if (window.__recording) requestAnimationFrame(loop);
    }
    window.__recording = true;
    requestAnimationFrame(loop);
  })()`);

  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 450 });
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 600,
      y: 450,
      deltaX: 0,
      deltaY: 140,
    });
    await sleep(40);
  }
  const frames = (
    await evalJs(`(window.__recording = false, window.__frames)`)
  ).result.value;

  const locate = (y) => {
    const hit = sections.find((s) => y + 450 >= s.top && y + 450 <= s.bottom);
    return hit ? hit.id : "?";
  };

  console.log("section map:", sections.map((s) => `${s.id}@${s.top}`).join("  "));
  const worst = frames
    .map(([d, y], i) => ({ d, y, i }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 8);
  for (const w of worst)
    console.log(
      `frame ${String(w.i).padStart(4)}  ${w.d.toFixed(1).padStart(7)}ms  scrollY ${w.y}  ≈ ${locate(w.y)}`,
    );

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

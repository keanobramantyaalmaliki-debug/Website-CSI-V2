/**
 * Bedah jalur kirim form inquiry — MENGAPA sebuah kiriman tidak sampai.
 *
 *   node scripts/probe-inquiry-send.mjs            # aman: fetch disadap, tak ada yang dikirim
 *   node scripts/probe-inquiry-send.mjs --live     # KIRIM SUNGGUHAN ke Web3Forms
 *
 * Bedanya dengan probe-contact-form.mjs: yang itu membuktikan form-nya BISA
 * DIPAKAI (hit-testing menembus canvas). Yang ini membuktikan apa yang
 * BERANGKAT — sebab sejak Web3Forms dipasang, form bisa "berhasil" di layar
 * sambil tidak mengirim apa pun: honeypot yang ter-autofill sengaja dibuang
 * diam-diam DAN dilaporkan sukses. Gejalanya identik dengan kiriman yang hilang.
 *
 * Karena itu yang dilaporkan di sini bertingkat: isi honeypot → fetch dipanggil
 * atau tidak → badan kirimannya → jawaban server. Titik putusnya langsung
 * kelihatan di baris mana ia berhenti.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const LIVE = process.argv.includes("--live");
const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9241;
const URL =
  process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000/";

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-inquiry-probe",
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

  const clickAt = async (selector) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);
    if (!box) throw new Error(`tidak ketemu: ${selector}`);
    for (const type of ["mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", {
        type, x: box.x, y: box.y, button: "left", clickCount: 1,
      });
    return box;
  };

  /* Sadap fetch SEBELUM form dibuka. Dalam mode aman ia menjawab tiruan
     "success" supaya UI tetap menempuh jalur sukses yang sesungguhnya —
     yang dinilai bentuk kirimannya, bukan jawaban servernya. */
  await evaluate(`(() => {
    window.__sent = [];
    const real = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
      if (String(url).includes('web3forms')) {
        const rec = { url: String(url), body: JSON.parse(opts.body) };
        window.__sent.push(rec);
        if (${LIVE}) {
          const res = await real(url, opts);
          const clone = res.clone();
          rec.status = res.status;
          rec.reply = await clone.json().catch(() => null);
          return res;
        }
        return new Response(JSON.stringify({ success: true, message: 'stub' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return real(url, opts);
    };
    return true;
  })()`);

  /* Cooldown dibersihkan: probe yang gagal karena jatah 5 menit sendiri
     akan terbaca sebagai "kiriman hilang", padahal sistemnya benar. */
  await evaluate(`localStorage.removeItem('cogniti_last_sent'), true`);

  const geom = await evaluate(`(() => {
    const el = document.querySelector('[data-inquiry-laptop]');
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height), vh: innerHeight };
  })()`);
  await evaluate(`window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2)})`);
  await sleep(2000);
  await evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  await sleep(3000);

  const honeypotAtRest = await evaluate(
    `(document.querySelector("input[name='botcheck']") || {}).value ?? '<TIDAK ADA>'`,
  );
  console.log(`honeypot saat form baru terbuka : ${JSON.stringify(honeypotAtRest)}`);

  await evaluate(`(() => {
    const set = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = [...document.querySelectorAll('input')];
    set(inputs.find(i => i.getAttribute('aria-label') === 'Your name'), 'Keano');
    set(inputs.find(i => i.getAttribute('aria-label') === 'Company or organisation'), 'Cogniti');
    set(inputs.find(i => i.type === 'email'), 'keano@cogniti.id');
    set(document.getElementById('inquiry-message'), 'Tes dari probe-inquiry-send.');
    return true;
  })()`);
  await sleep(300);

  const honeypotAfterFill = await evaluate(
    `(document.querySelector("input[name='botcheck']") || {}).value ?? '<TIDAK ADA>'`,
  );
  console.log(`honeypot setelah isian diisi    : ${JSON.stringify(honeypotAfterFill)}`);

  await clickAt("button[aria-pressed][type='button']");
  await sleep(300);
  await clickAt("button[type='submit']");
  await sleep(LIVE ? 6000 : 2500);

  const sent = await evaluate(`window.__sent`);
  const note = await evaluate(
    `document.querySelector("p[aria-live='polite']").textContent`,
  );
  const btn = await evaluate(
    `document.querySelector("button[type='submit']").textContent`,
  );

  console.log(`\nfetch ke web3forms dipanggil    : ${sent.length} kali`);
  if (sent.length) console.log(JSON.stringify(sent[0], null, 2));
  console.log(`\ntombol : "${btn}"`);
  console.log(`catatan : "${note}"`);
  console.log(
    `\nVONIS: ${
      sent.length
        ? "permintaan BERANGKAT dari browser."
        : "permintaan TIDAK PERNAH berangkat — dihadang di sisi klien."
    }`,
  );

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

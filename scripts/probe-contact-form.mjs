/**
 * Buktikan form di layar MacBook benar-benar BISA DIPAKAI, bukan cuma terlihat.
 *
 *   node scripts/probe-contact-form.mjs [url]          # aman: tak ada email terkirim
 *   node scripts/probe-contact-form.mjs [url] --live   # KIRIM SUNGGUHAN ke Web3Forms
 *
 * Kenapa perlu terpisah dari shoot-contact.mjs: potret cuma membuktikan form-nya
 * TERGAMBAR. Yang belum terbukti justru rantai masukannya, dan rantai itu panjang
 * dan tidak biasa — pointer harus menembus tirai modal, canvas WebGL yang
 * menutupi seluruh layar, lalu mendarat di elemen DOM yang dimiringkan
 * `<Html transform>` milik drei lewat CSS 3D. Ada tiga cara diam-diam gagal:
 *
 *   1. canvas menelan pointer → form mati total walau kelihatan;
 *   2. `pointer-events` hilang di lapisan <Html> → sama, tapi cuma di sebagian;
 *   3. klik di DALAM form merambat ke pembungkusnya → tiap ketukan MENUTUP
 *      modalnya. Ini yang paling menyakitkan dan paling gampang lolos review.
 *
 * Karena itu kliknya pakai `Input.dispatchMouseEvent` di KOORDINAT LAYAR asli —
 * `element.click()` melewati hit-testing dan akan lulus walau ketiganya rusak.
 *
 * ⚠️ Sejak Web3Forms dipasang (§4bd), langkah 3 di bawah menekan tombol kirim
 * SUNGGUHAN. Dulu itu tak berakibat apa-apa karena `submitInquiry()` cuma stub;
 * sekarang tiap kali probe ini jalan ia akan mengirim email ke kotak masuk
 * sungguhan dan memakan jatah 250/bulan. Karena yang dibuktikan di sini adalah
 * RANTAI MASUKAN — bukan pengirimannya — fetch ke web3forms disadap dan dijawab
 * tiruan "success". Jalur UI yang ditempuh tetap jalur sukses yang sebenarnya.
 * Pakai --live hanya kalau memang mau menguji pengiriman ujung-ke-ujung.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const LIVE = process.argv.includes("--live");
const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9230;
const URL = process.argv.slice(2).find((a) => a.startsWith("http")) ??
  "http://localhost:3000/";

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-probe-profile",
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

const results = [];
function check(label, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${label.padEnd(42)} ${detail}`);
}

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

  /** Klik SUNGGUHAN di tengah elemen — lewat hit-testing, bukan .click(). */
  const clickAt = async (selector) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);
    if (!box) throw new Error(`tidak ketemu: ${selector}`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x: box.x,
        y: box.y,
        button: "left",
        clickCount: 1,
      });
    }
    return box;
  };

  /* Sadap fetch SEBELUM apa pun diklik — lihat catatan ⚠️ di kepala berkas. */
  await evaluate(`(() => {
    window.__sentLive = ${LIVE};
    const real = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
      if (String(url).includes('web3forms') && !${LIVE}) {
        /* Jeda 800ms DISENGAJA. Jawaban seketika membuat keadaan "Sending"
           lewat dalam satu frame, dan check-nya jatuh karena stub-nya terlalu
           cepat — bukan karena UI-nya salah. Jaringan sungguhan tidak pernah
           seketika, jadi ini justru versi yang jujur. */
        await new Promise((r) => setTimeout(r, 800));
        return new Response(JSON.stringify({ success: true, message: 'stub' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return real(url, opts);
    };
    return true;
  })()`);

  /* Cooldown 5 menit dibersihkan: dua kali jalan beruntun akan gagal di langkah
     3 dengan alasan yang salah — terbaca "form rusak", padahal justru bekerja. */
  await evaluate(`localStorage.removeItem('cogniti_last_sent'), true`);

  const geom = await evaluate(`(() => {
    const el = document.querySelector('[data-inquiry-laptop]');
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height), vh: innerHeight };
  })()`);
  await evaluate(
    `window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2)})`,
  );
  await sleep(2000);

  await evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  /* Pegas engsel ~0,5 dtk, pegas kamera ~1,4 dtk (terpisah dan sengaja lebih
     lambat sejak 13 Agu). Menunggu YANG PALING LAMBAT: mengklik chip selagi
     kamera masih maju berarti koordinat layarnya sudah basi saat peristiwanya
     mendarat, dan probe-nya gagal karena alasan yang salah. */
  await sleep(3000);

  check(
    "form terpasang di layar",
    Boolean(await evaluate(`!!document.getElementById('inquiry-message')`)),
  );

  /* 1. Chip diklik lewat koordinat layar. Ini sekaligus menguji hit-testing
        menembus canvas DAN bahwa modalnya tidak ikut tertutup. */
  const chip = "button[aria-pressed][type='button']";
  const at = await clickAt(chip);
  await sleep(400);
  check(
    "chip menyala saat diklik betulan",
    (await evaluate(`document.querySelector(${JSON.stringify(chip)}).getAttribute('aria-pressed')`)) ===
      "true",
    `di (${at.x},${at.y})`,
  );
  check(
    "modal TIDAK tertutup oleh klik itu",
    Boolean(await evaluate(`!!document.getElementById('inquiry-message')`)),
  );

  /* 2. Isi ketiga isian wajib lewat setter native + event input, lalu pastikan
        tombol kirim hidup. Yang diuji di sini logikanya, bukan hit-testing. */
  await evaluate(`(() => {
    const set = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = [...document.querySelectorAll('input')];
    set(inputs.find(i => i.getAttribute('aria-label') === 'Your name'), 'Keano');
    set(inputs.find(i => i.type === 'email'), 'keano@cogniti.id');
    set(document.getElementById('inquiry-message'), 'Halo dari probe.');
    return true;
  })()`);
  await sleep(300);
  check(
    "tombol kirim hidup setelah isian lengkap",
    (await evaluate(`!document.querySelector("button[type='submit']").disabled`)),
  );

  /* 3. Kirim. Keadaan "sending" harus terlihat dulu sebelum berubah jadi
        "sent" — di mode aman jawabannya tiruan, jalur UI-nya tetap asli. */
  await clickAt("button[type='submit']");
  await sleep(300);
  const mid = await evaluate(
    `document.querySelector("button[type='submit']").textContent`,
  );
  check("keadaan mengirim terlihat", /Sending/i.test(mid), `teks: "${mid}"`);

  await sleep(LIVE ? 4000 : 1500);
  const done = await evaluate(
    `document.querySelector("button[type='submit']").textContent`,
  );
  check(
    "terkirim",
    /Sent/i.test(done),
    LIVE ? `teks: "${done}" — SUNGGUHAN` : `teks: "${done}" (jawaban tiruan)`,
  );

  /* 4. Esc menutup. */
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await sleep(1200);
  check(
    "Esc menutup modal",
    Boolean(await evaluate(`!document.getElementById('inquiry-message')`)),
  );
  /* Dua check di bawah SENGAJA belum benar di 1,2 dtk. Lapisan overlay bertahan
     sampai kameranya betul-betul pulang (`settling` di Contact.tsx) — kalau
     tidak, laptop yang masih close-up jatuh kembali ke kotak 52vh dan terpotong
     footer. Selama jendela ~2 dtk itu halaman tetap TERKUNCI (kalau digulir,
     kotak tujuannya pindah dan laptopnya mendarat meleset) dan tidak boleh ada
     tombol buka yang bisa diklik di bawah laptop yang masih terbang.
     Jadi jedanya yang ditambah, bukan check-nya yang dilonggarkan. */
  await sleep(2200);
  check(
    "gulir tidak lagi terkunci",
    (await evaluate(`document.documentElement.style.overflow`)) !== "hidden",
  );
  check(
    "pemicu buka kembali muncul",
    Boolean(await evaluate(`!!document.querySelector('[data-inquiry-toggle]')`)),
  );

  const pass = results.every(Boolean);
  console.log(pass ? "\nLULUS — form bisa dipakai" : "\nGAGAL — lihat di atas");
  ws.close();
  chrome.kill();
  process.exitCode = pass ? 0 : 1;
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

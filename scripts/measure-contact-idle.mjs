/**
 * Buktikan gerbang frameloop canvas InquiryLaptop benar-benar menutup.
 *
 *   node scripts/measure-contact-idle.mjs [url] [detik-per-fase]
 *
 * Kenapa perlu skrip sendiri, bukan `measure-frames.mjs`: yang itu mengukur
 * di puncak halaman dan menjawab "berapa ongkos menggambar kantor". Yang ini
 * menjawab pertanyaan yang berbeda dan lebih penting untuk canvas KEDUA —
 * "apakah ia berhenti menggambar setelah tidak ada yang menyentuhnya".
 *
 * Sejarahnya kenapa ini diukur, bukan diasumsikan: bug "laptop panas" (3 Agu)
 * lahir dari mesin yang tetap berdetak 60fps di balik layar sementara semua
 * gerbang di kode TAMPAK benar.
 *
 * ⚠️ **Kontraknya BERUBAH sejak form masuk ke layar laptop.** Dulu pose terbuka
 * melayang terus, jadi 60fps selamanya itu disengaja dan yang bisa diuji cuma
 * gerbang inView-nya. Sekarang gerak melayang dimatikan selama form terbuka
 * (FLOAT_WHEN_OPEN di Contact.tsx), jadi pose terbuka pun WAJIB 0 draw — klaim
 * yang jauh lebih keras daripada yang lama.
 *
 * Empat fase:
 *
 *   1. tertutup, terlihat     → 0     (keadaan bawaan halaman)
 *   2. sedang membuka         → > 0   (KONTROL POSITIF, lihat di bawah)
 *   3. terbuka, diam          → 0     (pegas usai; tidak ada yang menggambar)
 *   4. ditutup lagi           → 0     (kembali diam)
 *
 * Fase 2 bukan hiasan. Tanpa satu fase yang WAJIB bukan-nol, tiga fase nol
 * sisanya lulus dengan sendirinya kalau canvas-nya mati total atau tidak pernah
 * dipasang — persis kegagalan yang paling ingin ditangkap skrip ini.
 *
 * Fase "digulir pergi selagi terbuka" yang lama DIHAPUS, bukan lupa: form yang
 * terbuka mengunci gulir halaman (setScrollLocked) dan lapisannya `fixed
 * inset-0`, jadi keadaan "terbuka tapi di luar layar" tidak bisa lagi terjadi.
 * Sebagai gantinya posisi gulir DIPERIKSA selama fase terbuka — kalau
 * penguncinya melompatkan halaman ke puncak, canvas KANTOR yang masuk layar dan
 * angka fase 3 jadi milik canvas yang salah.
 *
 * Caranya: pasang pencacah di `drawElements`/`drawArrays` SEBELUM skrip halaman
 * jalan, lalu baca selisihnya per fase.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9229;
const URL = process.argv[2] ?? "http://localhost:3000/";
const IDLE_S = Number(process.argv[3] ?? 4);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-idle-profile",
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

  // WAJIB dipasang sebelum navigasi: three.js menyimpan referensi ke method
  // context saat renderer dibuat, jadi menambal setelahnya bisa terlewat.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__draws = 0;
      window.__frames = 0;
      for (const proto of [WebGLRenderingContext, WebGL2RenderingContext]) {
        for (const fn of ["drawElements", "drawArrays", "drawElementsInstanced"]) {
          const orig = proto.prototype[fn];
          if (!orig) continue;
          proto.prototype[fn] = function (...a) { window.__draws++; return orig.apply(this, a); };
        }
      }
      (function tick() { window.__frames++; requestAnimationFrame(tick); })();
    `,
  });

  await send("Page.navigate", { url: URL });
  await sleep(13000); // GLB + kompilasi shader + loader memudar

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
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height), vh: innerHeight };
  })()`);
  if (!geom) throw new Error("[data-inquiry-laptop] tidak ditemukan");

  const AT_LAPTOP = Math.round(geom.top + geom.height / 2 - geom.vh / 2);

  /* Dua tombol berbeda: pemicu buka cuma ada selagi TERTUTUP (kalau ia tetap
     membungkus laptop, susunannya jadi <button><input></button> dan tiap klik
     di dalam form ikut menutup). Klik kedua ke selector lama akan melempar. */
  const openLaptop = () =>
    evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  const closeLaptop = () =>
    evaluate(`document.querySelector('[data-inquiry-close]').click(), true`);

  /** Diamkan IDLE_S detik lalu kembalikan selisih pencacah. */
  const measure = async () => {
    const a = await evaluate(`[window.__draws, window.__frames]`);
    await sleep(IDLE_S * 1000);
    const b = await evaluate(`[window.__draws, window.__frames]`);
    return { draws: b[0] - a[0], frames: b[1] - a[1] };
  };

  const results = [];
  const phase = async (label, want) => {
    const { draws, frames } = await measure();
    const ok = want === "zero" ? draws === 0 : draws > 0;
    results.push(ok);
    console.log(
      `${ok ? "LULUS" : "GAGAL"}  ${label.padEnd(26)} draw=${String(draws).padStart(5)}  rAF=${frames}  (harap ${want === "zero" ? "0" : "> 0"})`,
    );
  };

  await evaluate(`window.scrollTo(0, ${AT_LAPTOP})`);
  await sleep(2500); // lenis mengejar
  await phase("1 tertutup, terlihat", "zero");

  /* Jendela ukurnya dibuka TEPAT saat diklik, jadi pegas engsel + majunya
     kamera pasti tercakup — tidak perlu menebak-nebak waktunya. */
  await openLaptop();
  await phase("2 sedang membuka", "nonzero");

  /* Pencacahnya global untuk SEMUA konteks WebGL. Kalau pengunci gulir sempat
     melompatkan halaman ke puncak, canvas kantor masuk layar dan menggambar
     60fps — fase 3 jadi mengukur canvas yang salah lalu "gagal" karena alasan
     yang keliru. Diperiksa, bukan diandaikan. */
  const y = await evaluate("Math.round(window.scrollY)");
  if (Math.abs(y - AT_LAPTOP) > geom.vh / 2) {
    console.warn(
      `⚠️  gulir melompat saat form dibuka: ${y} (harusnya ~${AT_LAPTOP}) — angka fase 3 tidak bisa dipercaya`,
    );
  }
  await phase("3 terbuka, diam", "zero");

  await closeLaptop();
  /* Menutup punya TIGA babak, bukan dua, dan babak ketiga yang dulu terlewat:
     engsel (~0,5 dtk) → kamera mundur (pegas overdamped, ~2 dtk sampai lewat
     ambang CAMERA_HOME) → lapisan overlay TURUN. Turunnya lapisan itu sendiri
     sah menggambar 2 frame (prop dock kembali nol, lalu canvas berubah ukuran
     dari layar penuh ke kotak 52vh). Terukur 4 draw = 2 frame × 2 mesh.

     Jedanya harus melewati babak ketiga, bukan mendarat di tengahnya: 2600ms
     dulu jatuh persis di perbatasan, jadi fase 4 "gagal" karena mengukur
     transisi yang wajar, bukan karena ada yang bocor. Yang diuji fase ini
     adalah DIAM SESUDAHNYA. */
  await sleep(3800);
  await phase("4 ditutup lagi, terlihat", "zero");

  const pass = results.every(Boolean);
  console.log(pass ? "\nLULUS — gerbang frameloop menutup" : "\nGAGAL — lihat fase di atas");

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

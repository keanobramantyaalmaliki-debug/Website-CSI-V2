/**
 * Potret section Contact sebelum/selama/sesudah laptop diklik — untuk memeriksa
 * rig engsel MacBook (InquiryLaptop) membuka ke arah yang benar, berhenti di
 * pose yang benar, dan form di layarnya terbaca tegak lurus menghadap kamera.
 *
 *   node scripts/shoot-contact.mjs [url] [prefix] [dpr]
 *
 * Bedanya dengan `shoot.mjs`: yang itu memotret satu keadaan diam di puncak
 * halaman. Yang ini menggulir ke #contact, MENGKLIK laptopnya, lalu memotret
 * DERET — karena yang diperiksa adalah gerakan, dan satu bingkai tidak bisa
 * membuktikan arah putar.
 *
 * ⚠️ Dulu skrip ini menggulir ke beberapa titik karena animasinya digerakkan
 * scroll. Pemicunya sekarang KLIK (Contact.tsx), jadi scroll-nya cuma sekali
 * untuk membawa laptop ke tengah layar; sisanya urusan waktu.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9228;
const URL = process.argv[2] ?? "http://localhost:3000/";
const PREFIX = process.argv[3] ?? "/tmp/contact";
const DPR = Number(process.argv[4] ?? 2);

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-contact-profile",
    "--window-size=1440,900",
    `--force-device-scale-factor=${DPR}`,
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
      // ⚠️ CDP melaporkan kegagalan lewat `m.error`, bukan lewat exception.
      // Dulu baris ini cuma meneruskan m.result, jadi perintah yang DITOLAK
      // lewat tanpa suara dan skripnya lanjut memotret keadaan yang salah.
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

  let reload = false;

  /* CSI_WIN=390,844 → periksa rig kamera SEMPIT (useNarrowViewport, < 768px).
     ⚠️ Lewat CDP, bukan flag `--window-size`: flag-nya diam-diam diabaikan
     kalau Brave menyambung ke instance/profil yang sudah jalan, dan skripnya
     lanjut memotret ukuran lama tanpa mengeluh.
     ⚠️ Dan override-nya sendiri LULUH sendiri beberapa detik setelah reload —
     terpantau bingkai 1–5 keluar 390×844 sementara sisanya balik ke 1440×900.
     Karena itu dipasang ulang sebelum TIAP potret, bukan sekali di awal. */
  const applyWin = async () => {
    if (!process.env.CSI_WIN) return;
    const [w, h] = process.env.CSI_WIN.split(",").map(Number);
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: DPR,
      mobile: true,
    });
  };
  if (process.env.CSI_WIN) {
    await applyWin();
    reload = true;
  }

  /* CSI_TOUCH=1 → periksa jalur PERANGKAT SENTUH (lembar datar, bukan laptop 3D).
     ⚠️ Wajib terpisah dari CSI_WIN. `setDeviceMetricsOverride({mobile:true})`
     TIDAK membuat `(pointer: coarse)` cocok — terbukti 13 Agu: potret 390px-nya
     tetap menampilkan overlay 3D, jadi tampak "fallback sentuh rusak" padahal
     yang diuji memang bukan itu. `useCoarsePointer` menanyai pointer, bukan
     lebar layar (lihat alasannya di hook-nya), jadi emulasi sentuhnya harus
     dinyalakan sendiri. */
  if (process.env.CSI_TOUCH === "1") {
    await send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });
    await send("Emulation.setEmitTouchEventsForMouse", {
      enabled: true,
      configuration: "mobile",
    });
    reload = true;
  }

  // CSI_REDUCED=1 → periksa jalur fallback. Yang diharapkan BUKAN "laptop mati":
  // ia tetap bisa dibuka, tapi LANGSUNG terbuka di bingkai "opening-120" (pegas
  // dilewati). Bingkai "settled-a"/"settled-b" tetap identik seperti biasa.
  if (process.env.CSI_REDUCED === "1") {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    reload = true;
  }

  if (reload) await send("Page.reload");

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
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), vh: innerHeight };
  })()`);
  if (!geom) throw new Error("[data-inquiry-laptop] tidak ditemukan");
  console.log("laptop:", JSON.stringify(geom));

  // Bawa laptop ke tengah layar sekali saja, lalu diamkan scroll-nya.
  await evaluate(
    `window.scrollTo(0, ${Math.round(geom.top + geom.height / 2 - geom.vh / 2)})`,
  );
  await sleep(1800); // lenis mengejar

  const shot = async (tag) => {
    await applyWin();
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const out = `${PREFIX}-${tag}.png`;
    writeFileSync(out, Buffer.from(data, "base64"));
    /* Ukuran viewport ikut dicetak, bukan diandaikan: emulasi CSI_WIN pernah
       luruh diam-diam di tengah deret dan separuh bingkainya keluar 1440×900
       sementara log-nya tetap tampak sehat. */
    const w = await evaluate("innerWidth");
    console.log(`${tag.padEnd(10)} → ${out}  (viewport ${w}px)`);
  };

  /* Buka dan tutup lewat dua tombol yang BERBEDA. Dulu keduanya satu klik di
     `[data-inquiry-toggle]`, tapi pemicu itu sekarang cuma ada selagi laptop
     TERTUTUP — begitu terbuka ia dilepas dari pohon (kalau tidak, susunannya
     jadi <button><input></button>: HTML tak sah, dan tiap klik di dalam form
     ikut menutup laptopnya). Klik kedua ke selector lama akan melempar
     "Cannot read properties of null". */
  const openLaptop = () =>
    evaluate(`document.querySelector('[data-inquiry-toggle]').click(), true`);
  const closeLaptop = () =>
    evaluate(`document.querySelector('[data-inquiry-close]').click(), true`);

  await shot("closed");

  /* Membuka. Ada DUA pegas dengan kecepatan berbeda sejak 13 Agu: engsel
     (~0,5 dtk) dan kamera (~1,4 dtk, sengaja overdamped — lihat CAMERA_SPRING).
     Deretnya dirapatkan di awal untuk membuktikan arah putar lid, lalu diberi
     satu titik di 900ms yang jatuh SETELAH engsel diam tapi SELAGI kamera masih
     berjalan — itu satu-satunya bingkai yang bisa membedakan "dua pegas" dari
     "satu pegas lambat". */
  await openLaptop();
  let at = 0;
  for (const ms of [120, 380, 800, 1100]) {
    await sleep(Math.max(0, ms - at));
    at = ms;
    await shot(`opening-${ms}`);
  }
  await sleep(1600);
  await shot("open");

  /* Dua bingkai berjarak ~2 dtk, dan sekarang harus IDENTIK — kebalikan dari
     dulu. Gerak melayang sengaja dimatikan selama form terbuka
     (FLOAT_WHEN_OPEN di Contact.tsx): sasaran klik yang bergoyang susah
     dikenai, dan <Html transform> meraster DOM lalu memiringkannya lewat CSS
     3D, jadi miring sedikit = teks melunak. Kalau kedua bingkai ini BEDA,
     berarti ada yang masih menggerakkan pose terbuka. */
  await sleep(2000);
  await shot("settled-a");
  await sleep(2000);
  await shot("settled-b");

  /* Menutup lagi — pose akhir harus kembali PERSIS seperti "closed".
     Jedanya diperpanjang mengikuti pegas kamera yang lebih lambat, dan
     kesamaan bingkai ini sekarang menguji dua hal sekaligus: kameranya pulang
     tepat ke rig halaman, DAN lapisan overlay-nya turun tepat waktu (kalau ia
     turun terlalu cepat, laptop close-up sempat terpotong footer). */
  await closeLaptop();
  /* Bingkai DI TENGAH penutupan — inilah yang dulu memperlihatkan bug-nya:
     lapisannya sudah turun ke kotak 52vh sementara kameranya masih close-up,
     jadi laptopnya terpotong footer. Sekarang harus masih selebar layar. */
  await sleep(500);
  await shot("closing-500");
  await sleep(2100);
  await shot("reclosed");

  ws.close();
  chrome.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());

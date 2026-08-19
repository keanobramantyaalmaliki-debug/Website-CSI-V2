/**
 * Rekam FILMSTRIP transisi GridReveal — pindah ruangan dari dalam konten.
 *
 * Sapuannya SATU ARAH: 3D ruangan tujuan muncul kotak demi kotak DI ATAS
 * halaman konten, sampai penuh. Tidak ada fase menutup, tidak ada bidang polos.
 * Yang mau dibuktikan ada empat, dan semuanya cuma kelihatan dari rentetan
 * frame berurutan:
 *
 *   · yang tersingkap sejak kotak PERTAMA sudah ruangan tujuan — kalau
 *     gerbang frameloop (`pendingRoom`, INVARIANTS §7) lepas, kotak-kotak awal
 *     berisi frame basi ruangan LAMA dan itu satu-satunya tandanya
 *   · yang belum tersapu tetap halaman konten, bukan warna polos — sisi
 *     "gridnya adalah halaman itu sendiri"
 *   · tidak ada camera fly: sudutnya sudah sudut akhir sejak awal
 *   · URL baru berganti di UJUNG sapuan. Kalau `url` di filmstrip berubah
 *     selagi `reveal` masih < `rects`, konten yang sedang disapu sudah
 *     di-unmount di tengah jalan.
 *
 *   node scripts/probe-grid-reveal.mjs [dari] [ke] [dpr]
 *   node scripts/probe-grid-reveal.mjs /office Lounge 2
 *
 * Hasilnya /tmp/grid-reveal/NN-*.png. Brave, bukan Chrome (lihat shoot.mjs).
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;
/** ⚠️ Path RUANGAN, bukan `#office`. `/office` bukan route — ROOM_SLUGS
 *  memetakan Office ke "/services" (lihat sceneStore.ts). */
const FROM = process.argv[2] ?? "/services";
const TO = process.argv[3] ?? "Lounge";
const DPR = Number(process.argv[4] ?? 2);
/** "hero" = jangan digulir dulu — jalur regresi camera fly yang harus TETAP ada. */
const MODE = process.argv[5] ?? "konten";
const OUT = "/tmp/grid-reveal";

/**
 * ⚠️ Tombol navbar menampilkan LABEL, bukan nama ruangan. Skrip ini dipanggil
 * dengan nama ruangan (yang dipakai di kode), jadi terjemahannya di sini.
 * Cerminan ROOM_LABELS di sceneStore.ts — kalau di sana berubah, di sini ikut.
 *
 * ⚠️ Office dan Function GAMPANG TERTUKAR, dan tabel ini sempat tertukar
 * beneran (dibetulkan 19 Agu). Namanya melawan intuisi: ruangan `Office` adalah
 * area meja terbuka yang dijual sebagai "People", sedangkan `Function` adalah
 * lounge TV yang dijual sebagai "Services". Slug-nya ikut pola yang sama
 * (`Office` → /people, `Function` → /services), jadi menebak dari nama ruangan
 * SELALU salah — baca ROOM_SLUGS/ROOM_LABELS, jangan diterka.
 *
 * Salahnya tidak diam total: klik yang meleset melempar "tombol … tidak
 * ditemukan di nav" kalau labelnya tidak ada sama sekali. Yang berbahaya justru
 * saat tertukar seperti kemarin — labelnya ADA, tombolnya ketemu, dan probe
 * dengan tenang menguji ruangan yang salah.
 */
const LABELS = {
  Lounge: "Home",
  Office: "People",
  Meeting: "Work",
  Function: "Services",
  Pantry: "Pantry",
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-grid-profile",
    `--window-size=${process.env.CSI_SIZE ?? "1440,900"}`,
    `--force-device-scale-factor=${DPR}`,
    `http://localhost:3000${FROM}`,
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
  /** Frame screencast yang masuk — lihat alasannya di dekat startScreencast. */
  const cast = [];
  let casting = false;
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Page.screencastFrame") {
      if (casting)
        cast.push({
          // ⚠️ Waktu TANGKAP, bukan waktu terima. Frame screencast datang
          // lewat WebSocket dan bisa menumpuk: pada rekaman 19 Agu ada jeda
          // 114 ms antara dua frame berurutan sementara jejak numerik (yang
          // jalan di main thread) tetap 16 ms. Memberi nama berkas dari
          // Date.now() saat itu menggeser frame-frame terakhir ke depan dan
          // membuat sapuan yang sudah selesai TERLIHAT masih menyisakan
          // kotak — cacat yang tidak pernah ada di layar.
          //
          // `metadata.timestamp` detik epoch dari browser; t0 juga epoch.
          t: m.params.metadata?.timestamp
            ? Math.round(m.params.metadata.timestamp * 1000)
            : Date.now(),
          data: m.params.data,
        });
      ws.send(
        JSON.stringify({
          id: ++id,
          method: "Page.screencastFrameAck",
          params: { sessionId: m.params.sessionId },
        }),
      );
      return;
    }
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

  const evalJs = async (expr) => {
    const r = await send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + expr);
    return r?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  // CSI_REDUCED=1 → jalur prefers-reduced-motion: satu bidang pudar, tanpa
  // kisi, dan tanpa Lenis (useSmoothScroll tidak instantiate sama sekali).
  if (process.env.CSI_REDUCED) {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await send("Page.reload");
  }
  /**
   * ⚠️ Ditunggu SAMPAI loader hilang, bukan dijeda sekian detik.
   *
   * Versi jeda-tetap (14 dtk) menipu justru di jalur yang paling perlu jujur:
   * MODE=hero melewatkan gulir + endapannya (~2,2 dtk), jadi ia mengklik lebih
   * awal — dan pada rekaman 19 Agu kliknya mendarat selagi layar PREPARING…
   * masih berdiri. `goTo` belum ada, Navbar jatuh ke jalur lamanya, dan
   * hasilnya terbaca seolah regresi camera fly-nya lolos padahal yang diuji
   * bukan itu.
   *
   * Loader dilepas dari pohon saat selesai (`if (gone) return null`), jadi
   * ketiadaannya sinyal yang tegas.
   */
  console.log("menunggu scene…");
  const loaderGone = `[...document.querySelectorAll('div[aria-hidden]')]
    .every((d) => !String(d.className).includes('z-[60]'))`;
  for (let i = 0; i < 120; i++) {
    if (await evalJs(loaderGone)) break;
    await sleep(500);
  }
  // Endapan: kamera pembuka masih bergerak sebentar setelah loader lepas.
  await sleep(2500);

  // Gulir jauh ke bawah lewat RODA, bukan window.scrollTo — Lenis memegang
  // gulirnya dan setelan langsung akan ditariknya balik di frame berikutnya.
  for (let i = 0; MODE !== "hero" && i < 24; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 700,
      y: 500,
      deltaX: 0,
      deltaY: 320,
    });
    await sleep(40);
  }
  await sleep(1200);

  const before = await evalJs(
    "JSON.stringify({ y: Math.round(window.scrollY), url: location.pathname })",
  );
  console.log("sebelum klik:", before);
  const { data: pre } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/00-sebelum.png`, Buffer.from(pre, "base64"));

  // Klik tautan ruangan tujuan di bilah nav.
  // Di layar sempit daftar ruangan hidup di overlay burger, DI LUAR <nav>
  // (dirender sebelum nav supaya nav bisa `relative z-10` di atasnya).
  if (process.env.CSI_MOBILE) {
    const opened = await evalJs(`(() => {
      const b = document.querySelector('[aria-controls="mobile-menu"]');
      if (!b) return false;
      b.click();
      return true;
    })()`);
    if (!opened) throw new Error("tombol burger tidak ditemukan");
    await sleep(700);
  }

  const scope = process.env.CSI_MOBILE ? "#mobile-menu button" : "nav button";
  const clickExpr = `(() => {
    const b = [...document.querySelectorAll(${JSON.stringify(scope)})]
      .find((el) => el.textContent.trim() === ${JSON.stringify(LABELS[TO] ?? TO)});
    if (!b) return false;
    b.click();
    return true;
  })()`;

  // `reveal/rects` = berapa kotak clip yang sudah membesar. Ini yang membuat
  // jejaknya bisa DIBACA sebagai angka, bukan cuma ditatap: kemajuan sapuan,
  // dan apakah `url` berganti sebelum atau sesudah penuh.
  const probeExpr = `JSON.stringify((() => {
    const svg = document.querySelector('[data-testid=grid-reveal]');
    const r = svg ? [...svg.querySelectorAll('rect')] : [];
    return {
      url: location.pathname,
      y: Math.round(window.scrollY),
      rects: r.length,
      // style.transform cuma NIAT (semua flip ke scale(1) serentak). Yang
      // dicari kemajuan NYATA-nya, dan itu di computed style: di tengah
      // transisi ia berupa matrix dengan skala < 1.
      // (tanpa backtick di komentar ini — seluruh blok hidup di template
      //  literal, dan satu backtick nyasar menutupnya di tengah jalan)
      reveal: r.filter((el) => {
        const m = getComputedStyle(el).transform;
        if (m === 'none') return true;
        // Tanpa regex: literal ini hidup di dalam template literal Node,
        // dan escape-nya termakan satu lapis sebelum sampai ke browser.
        const n = Number(m.slice(m.indexOf('(') + 1).split(',')[0]);
        return Number.isNaN(n) ? true : n > 0.999;
      }).length,
      // Kotak yang BENAR-BENAR di tengah jalan. Dipisah dari reveal supaya
      // "belum mulai" (skala 0) dan "sedang membesar" tidak tertukar — itu
      // beda antara sapuan yang masih jalan dan sapuan yang mundur lagi.
      partial: r.filter((el) => {
        const m = getComputedStyle(el).transform;
        if (m === 'none') return false;
        const n = Number(m.slice(m.indexOf('(') + 1).split(',')[0]);
        return n > 0.001 && n < 0.999;
      }).length,
      pinned: !!document.querySelector('[style*="grid-reveal-clip"]'),
    };
  })())`;

  /**
   * ── Kenapa screencast, BUKAN Page.captureScreenshot berulang ─────────────
   * Sapuannya cuma 420 ms. `captureScreenshot` di dpr 2 memakan ratusan
   * milidetik per panggilan dan MEMBLOKIR halaman selama itu, jadi loop
   * screenshot bukan cuma jarang mengambil sampel — ia mengubah yang diukur.
   * Percobaan pertama (19 Agu) menghasilkan tiga frame yang semuanya sudah
   * 276/276: mustahil dibedakan dari transisi yang langsung jadi.
   *
   * `Page.startScreencast` dikirim BROWSER tiap kali ia menggambar. Ongkosnya
   * ditanggung di sana, urutannya asli, dan halamannya tidak ditahan.
   */
  await send("Page.startScreencast", {
    format: "jpeg",
    quality: 70,
    everyNthFrame: 1,
  });
  casting = true;
  const t0 = Date.now();

  const clicked = await evalJs(clickExpr);
  if (!clicked)
    throw new Error(`tombol "${LABELS[TO] ?? TO}" (${TO}) tidak ditemukan di nav`);

  // Jejak numerik terpisah, ~16 ms — cukup rapat untuk melihat sapuan MENDAKI,
  // bukan cuma hasil akhirnya.
  const trace = [];
  for (let i = 0; i < 110; i++) {
    trace.push({ t: Date.now() - t0, m: JSON.parse(await evalJs(probeExpr)) });
    await sleep(16);
  }

  casting = false;
  await send("Page.stopScreencast");

  // Diurutkan ulang: `t` sekarang waktu tangkap, dan frame yang tertahan di
  // antrean WebSocket bisa tiba setelah frame yang lebih baru.
  cast.sort((a, b) => a.t - b.t);
  cast.forEach((f, i) => {
    writeFileSync(
      `${OUT}/${String(i).padStart(3, "0")}-${f.t - t0}ms.jpg`,
      Buffer.from(f.data, "base64"),
    );
  });

  await sleep(1500);
  const after = await evalJs(
    // `overflow` ikut dilaporkan: kunci gulir yang bocor tidak kelihatan di
    // screenshot mana pun, dan gejalanya baru muncul jauh kemudian sebagai
    // "halamannya tidak bisa digulir".
    `JSON.stringify({
      y: Math.round(window.scrollY),
      url: location.pathname,
      sisa: !!document.querySelector('[data-testid=grid-reveal]'),
      pinned: !!document.querySelector('[style*="grid-reveal-clip"]'),
      overflow: document.documentElement.style.overflow || '(kosong)',
    })`,
  );
  const { data: post } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/99-sesudah.png`, Buffer.from(post, "base64"));

  // Cetak hanya baris yang BERUBAH — 110 sampel identik tidak memberi tahu
  // apa pun, dan yang dicari justru titik-titik peralihannya.
  console.log(`\njejak (${cast.length} frame screencast tersimpan):`);
  let prev = "";
  for (const s of trace) {
    const line = JSON.stringify(s.m);
    if (line === prev) continue;
    prev = line;
    console.log(`  ${String(s.t).padStart(5)}ms  ${line}`);
  }
  console.log("\nsesudah:", after);
  console.log(`\nberkas di ${OUT}`);

  ws.close();
  browser.kill();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => browser.kill());

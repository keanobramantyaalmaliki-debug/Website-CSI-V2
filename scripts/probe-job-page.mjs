/**
 * Bukti halaman lowongan `/careers/<slug>` berkelakuan benar — di Brave, bukan
 * jsdom.
 *
 * Lima hal yang tidak bisa dibuktikan test unit, dan semuanya pernah jadi
 * kelas bug nyata di proyek ini:
 *
 *   1. URL-nya BERTAHAN. RoomRouteSync punya dua arah yang saling menulis; path
 *      non-ruangan dulu dipantulkan balik ke pathFor(currentRoom).
 *   2. Gulirnya mulai dari PUNCAK. Tidak ada <ScrollRestoration> di situs ini.
 *   3. Canvas TIDAK di-resize saat hero disembunyikan — `h-0 overflow-hidden`,
 *      bukan display:none (memory r3f-canvas-resize-lag: R3F menyusul layout
 *      ~58 ms di belakang DOM, dan itu terbaca sebagai kedipan saat kembali).
 *   4. Gerbang frameloop MATI: nol draw call selagi orang membaca teks
 *      (INVARIANTS §7).
 *   5. Deep-link dingin tidak mengunduh office.glb dan tidak menampilkan
 *      loader — kalau <LoadingScreen> lolos gerbangnya, halaman ini tertutup
 *      layar putih permanen (INVARIANTS §3).
 *
 *   node scripts/probe-job-page.mjs [slug] [dpr]
 *
 * Screenshot-nya di /tmp/job-page/. Keluar dengan kode 1 kalau ada yang gagal.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9237;
const SLUG = process.argv[2] ?? "full-stack-engineer";
const DPR = Number(process.argv[3] ?? 2);
const JOB_PATH = `/careers/${SLUG}`;
/* Judul yang diharapkan, diturunkan dari slug ("full-stack-engineer" → "Full
   Stack Engineer"). Berlaku selama penamaan slug situs tetap kebab-case dari
   judulnya — kalau suatu saat menyimpang, probe ini yang harus menyusul. */
const TITLE = SLUG.split("-")
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(" ");
const OUT = "/tmp/job-page";
const PROFILE = "/tmp/csi-job-profile";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
/* Profil dibuang tiap jalan. Kalau tidak, localStorage["cogniti:job-lang"]
   bertahan dari jalan sebelumnya dan uji toggle-nya jadi bohong: ia mengklik
   "id" di halaman yang MEMANG sudah id, lalu lulus tanpa menukar apa pun. */
rmSync(PROFILE, { recursive: true, force: true });

const browser = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    `--user-data-dir=${PROFILE}`,
    `--window-size=${process.env.CSI_SIZE ?? "1440,900"}`,
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

const fails = [];
function check(ok, label, detail = "") {
  console.log(`${ok ? "  ok " : "  ✗  "} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) fails.push(label);
}

/**
 * Penghitung draw call, dipasang SEBELUM skrip halaman jalan.
 *
 * Satu-satunya cara jujur mengukur "render loop mati": angka dari store R3F
 * tidak terjangkau dari luar canvas (memory perf-measurement-scripts).
 */
const DRAWCALL_HOOK = `
(() => {
  window.__draws = 0;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    if (!C) continue;
    for (const fn of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const orig = C.prototype[fn];
      if (!orig) continue;
      C.prototype[fn] = function (...a) { window.__draws++; return orig.apply(this, a); };
    }
  }
})();`;

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
  /** URL yang diminta halaman — dipakai membuktikan GLB tidak ikut terunduh. */
  const requests = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Network.requestWillBeSent") requests.push(m.params.request.url);
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
    /*
     * `-0`, `NaN`, dan `Infinity` tidak muat di JSON, jadi CDP mengirimnya
     * lewat `unserializableValue` dan MENGOSONGKAN `value`. Membaca `value`
     * saja membuat angka-angka itu pulang sebagai `undefined`.
     *
     * Bukan kasus teoretis: `Math.round(rect.top)` menghasilkan `-0` begitu
     * anchor-nya mendarat sepersekian piksel di atas puncak viewport — persis
     * yang terjadi saat gulir ke #careers BERHASIL. Probe-nya lalu melapor
     * "#careers tidak pernah muncul" padahal pendaratannya tepat sasaran.
     */
    const res = r?.result;
    if (res && res.unserializableValue !== undefined) {
      return Number(res.unserializableValue);
    }
    return res?.value;
  };

  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: DRAWCALL_HOOK });

  /** Loader dilepas dari pohon saat selesai, jadi ketiadaannya sinyal tegas. */
  const loaderGone = `[...document.querySelectorAll('div[aria-hidden]')]
    .every((d) => !String(d.className).includes('z-[60]'))`;

  // ── A. Jalur hangat: dari /people, klik barisnya ──────────────────────────
  console.log("\nA. dari /people (3D sudah hidup)");
  await send("Page.reload");
  await sleep(1500);
  for (let i = 0; i < 120; i++) {
    if (await evalJs(loaderGone)) break;
    await sleep(500);
  }
  await sleep(2500);

  // Gulir lewat RODA, bukan window.scrollTo — Lenis memegang gulirnya.
  for (let i = 0; i < 26; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: 700, y: 500, deltaX: 0, deltaY: 320,
    });
    await sleep(40);
  }
  await sleep(1200);

  const canvasBefore = await evalJs(
    `(() => { const c = document.querySelector('canvas');
      return c ? c.width + 'x' + c.height : 'tidak ada'; })()`,
  );
  const scrolledY = await evalJs("Math.round(window.scrollY)");
  await shot("00-people-careers");

  /*
   * Perekam tulisan history. Diam kalau semuanya benar — isinya cuma dicetak
   * saat URL-nya TIDAK bertahan, dan di situ ia langsung menunjuk pelakunya:
   * bug rintangan #1 terlihat sebagai pushState "/careers/<slug>" yang disusul
   * pushState "/people" dari RoomRouteSync. Pernah kambuh sekali gara-gara
   * `git checkout` menghapus penjaganya, jadi jejak ini sengaja ditinggal.
   */
  await evalJs(`(() => {
    window.__hist = [];
    for (const fn of ["pushState", "replaceState"]) {
      const orig = history[fn].bind(history);
      history[fn] = function (a, b, url) {
        window.__hist.push({ fn, url, stack: new Error().stack });
        return orig(a, b, url);
      };
    }
  })()`);

  const linkFound = await evalJs(
    `(() => { const a = document.querySelector('a[href="${JOB_PATH}"]');
      if (!a) return false; a.click(); return true; })()`,
  );
  check(linkFound, `baris ${TITLE} adalah <a> yang bisa diklik`);

  await sleep(1800);

  const afterClick = await evalJs(
    `JSON.stringify({
      url: location.pathname,
      y: Math.round(window.scrollY),
      h1: document.querySelector('h1')?.textContent ?? '',
      canvas: (() => { const c = document.querySelector('canvas');
        return c ? c.width + 'x' + c.height : 'tidak ada'; })(),
      heroH: (() => { const c = document.querySelector('canvas');
        const w = c?.closest('div[aria-hidden="true"]');
        return w ? Math.round(w.getBoundingClientRect().height) : -1; })(),
      loader: !(${loaderGone}),
    })`,
  );
  const a = JSON.parse(afterClick);
  await shot("01-halaman-lowongan");

  check(a.url === JOB_PATH, "URL bertahan di halaman lowongan", a.url);
  if (a.url !== JOB_PATH) {
    const hist = JSON.parse(await evalJs("JSON.stringify(window.__hist ?? [])"));
    for (const h of hist) {
      console.log(`      ${h.fn} ${h.url}`);
      for (const line of String(h.stack).split("\n").slice(1, 5)) {
        console.log("          " + line.trim().replace(/https?:\/\/[^/]+\//, ""));
      }
    }
  }
  check(a.y <= 2, "mendarat di puncak halaman", `scrollY ${a.y} (sebelumnya ${scrolledY})`);
  check(a.h1.includes(TITLE), "judul lowongan tampil", a.h1);
  check(a.canvas === canvasBefore, "canvas TIDAK di-resize", `${canvasBefore} → ${a.canvas}`);
  check(a.heroH === 0, "hero terpotong habis (h-0)", `tinggi pembungkus ${a.heroH}px`);
  check(!a.loader, "tidak ada overlay loader");

  // Gerbang frameloop: hitung draw call selama 2 detik halaman diam.
  const draws0 = await evalJs("window.__draws");
  await sleep(2000);
  const draws1 = await evalJs("window.__draws");
  check(
    draws1 - draws0 === 0,
    "nol draw call selagi halaman lowongan dibaca",
    `${draws1 - draws0} dalam 2 dtk`,
  );

  // Toggle bahasa
  const headsEn = JSON.parse(
    await evalJs(
      "JSON.stringify([...document.querySelectorAll('h2')].map((h) => h.textContent.trim()))",
    ),
  );
  check(
    headsEn.includes("What you will do"),
    "profil bersih membuka halaman dalam bahasa Inggris",
    headsEn.join(" / "),
  );

  await evalJs(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'id')?.click()`,
  );
  await sleep(600);
  /*
   * Lewat <h2>, bukan document.body.innerText: innerText memantulkan apa yang
   * DIRENDER, dan bullet-nya masih di bawah lipatan dengan whileInView
   * motion belum menyala — teksnya ada di DOM tapi tidak di innerText.
   * textContent tidak peduli itu.
   */
  const heads = JSON.parse(
    await evalJs(
      "JSON.stringify([...document.querySelectorAll('h2')].map((h) => h.textContent.trim()))",
    ),
  );
  check(
    heads.includes("Apa yang akan kamu kerjakan"),
    "toggle ID menukar isi halaman",
    heads.join(" / "),
  );
  await shot("02-bahasa-id");

  /*
   * Tombol pintasan "Apply for this role" dicabut 27 Agu; form-nya langsung
   * menyambung di bawah daftar. Jadi yang diperiksa bukan lagi lompatannya
   * melainkan bahwa #apply memang ada di halaman yang sama dan bisa dicapai
   * dengan menggulir biasa.
   */
  check(
    !(await evalJs(
      `[...document.querySelectorAll('button')]
        .some((b) => /lamar posisi ini|apply for this role/i.test(b.textContent))`,
    )),
    "tombol pintasan Apply tidak kembali",
  );
  await evalJs(
    `(() => { const s = document.getElementById('apply');
      if (s) window.scrollTo(0, s.getBoundingClientRect().top + scrollY); })()`,
  );
  let atApply = null;
  for (let i = 0; i < 12; i++) {
    await sleep(400);
    const v = await evalJs(
      `(() => { const s = document.getElementById('apply');
        if (!s) return null; return Math.round(s.getBoundingClientRect().top); })()`,
    );
    if (typeof v === "number") {
      atApply = v;
      if (v > -200 && v < 400) break;
    }
  }
  check(
    atApply !== null && atApply > -200 && atApply < 400,
    "form lamaran (#apply) ada di halaman yang sama",
    atApply === null ? "#apply tidak ditemukan" : `top ${atApply}px`,
  );

  /*
   * Tombol kirim: putih seperti Send di Contact, dan REDUP selagi isian
   * wajibnya masih kosong. Yang diukur nilai terhitungnya — opacity bisa saja
   * ditimpa oleh kelas lain yang menang belakangan.
   */
  const btn = JSON.parse(
    await evalJs(
      `(() => {
        const b = document.querySelector('#apply button[type=submit]');
        const cs = getComputedStyle(b);
        return JSON.stringify({ bg: cs.backgroundColor, op: Number(cs.opacity) });
      })()`,
    ),
  );
  check(
    /255,\s*255,\s*255/.test(btn.bg) && btn.op < 0.6,
    "tombol kirim putih & redup saat isian kosong",
    `${btn.bg} · opacity ${btn.op}`,
  );

  /* Isi keenam isian wajibnya lalu ukur lagi: harus menyala penuh. */
  await evalJs(
      `(() => {
        const set = (el, v) => {
          const proto = el instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : el instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype;
          /* Nilai React ditulis lewat setter aslinya, kalau tidak onChange-nya
             tidak pernah menyala dan state-nya diam di tempat. */
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        for (const id of ['firstName','lastName','location','motivation'])
          set(document.getElementById('apply-' + id), 'x');
        set(document.getElementById('apply-email'), 'a@b.co');
        const sel = document.getElementById('apply-experience');
        set(sel, sel.options[1].value);
      })()`,
  );
  /* Satu tarikan napas: kelas tombolnya baru berganti setelah React me-render
     ulang. Diukur di tick yang sama, yang terbaca masih nilai LAMA — dan
     probe-nya melapor gagal justru saat kodenya benar. */
  await sleep(400);
  const btnFull = JSON.parse(
    await evalJs(
      `(() => {
        const cs = getComputedStyle(document.querySelector('#apply button[type=submit]'));
        return JSON.stringify({ bg: cs.backgroundColor, op: Number(cs.opacity) });
      })()`,
    ),
  );
  check(
    /255,\s*255,\s*255/.test(btnFull.bg) && btnFull.op > 0.9,
    "tombol kirim menyala penuh setelah isian wajib terisi",
    `${btnFull.bg} · opacity ${btnFull.op}`,
  );
  await shot("03-apply-form");

  /* Form lamaran menggantikan section Contact di halaman ini. Kalau keduanya
     muncul, pelamar harus menebak mana yang benar-benar mengirim lamaran. */
  const forms = JSON.parse(
    await evalJs(
      `JSON.stringify({
        apply: Boolean(document.getElementById('apply')),
        contact: Boolean(document.getElementById('contact')),
        fields: [...document.querySelectorAll('#apply input, #apply select, #apply textarea')].length,
        skillBoxes: [...document.querySelectorAll('#apply input[type="checkbox"]')].length,
      })`,
    ),
  );
  check(
    forms.apply && !forms.contact,
    "cuma SATU form di halaman lowongan (Contact dicabut)",
    `apply ${forms.apply} · contact ${forms.contact}`,
  );
  /* 6 wajib + 2 tautan (portfolio & linkedin; GitHub dicabut 27 Agu) +
     honeypot = 9 isian tetap; centang skill mengikuti lowongannya
     (data/jobs.ts), jadi yang dikunci angkanya cuma yang tetap. */
  check(
    forms.skillBoxes > 0 && forms.fields - forms.skillBoxes === 9,
    "seluruh isian terpasang",
    `${forms.fields} isian (${forms.skillBoxes} skill)`,
  );

  // Kembali ke daftar
  await evalJs(
    `document.querySelector('a[href="/people#careers"]')?.click()`,
  );
  await sleep(2000);
  const back = JSON.parse(
    await evalJs(
      `JSON.stringify({
        url: location.pathname + location.hash,
        loader: !(${loaderGone}),
        canvas: (() => { const c = document.querySelector('canvas');
          return c ? c.width + 'x' + c.height : 'tidak ada'; })(),
      })`,
    ),
  );
  /*
   * Mendarat DI section Careers, bukan sekadar di /people. Hash-nya diurus
   * Arah 3 RoomRouteSync, dan konten /people mount ulang saat kembali — jadi
   * inilah tempat "scrollTo ke anchor yang belum ada" akan terlihat.
   */
  let careersTop = null;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    const v = await evalJs(
      `(() => { const c = document.getElementById('careers');
        return c ? Math.round(c.getBoundingClientRect().top) : null; })()`,
    );
    if (typeof v === "number") {
      careersTop = v;
      if (v > -300 && v < 500) break;
    }
  }
  check(
    careersTop !== null && careersTop > -300 && careersTop < 500,
    "kembali mendarat DI section Careers",
    careersTop === null ? "#careers tidak pernah muncul" : `top ${careersTop}px`,
  );

  check(back.url.startsWith("/people"), "kembali ke /people", back.url);
  check(!back.loader, "kembali TANPA loading screen (Canvas tidak pernah unmount)");
  check(back.canvas === canvasBefore, "canvas utuh setelah kembali", back.canvas);
  await shot("04-kembali-people");

  // ── B. Deep-link dingin ───────────────────────────────────────────────────
  console.log("\nB. deep-link dingin (tab baru)");
  requests.length = 0;
  await send("Page.navigate", { url: `http://localhost:3000${JOB_PATH}` });
  await sleep(4000);

  const cold = JSON.parse(
    await evalJs(
      `JSON.stringify({
        url: location.pathname,
        h1: document.querySelector('h1')?.textContent ?? '',
        loader: !(${loaderGone}),
        canvases: document.querySelectorAll('canvas').length,
        draws: window.__draws,
        /* Warna TERHITUNG tiap tautan ruangan di navbar. Halaman lowongan bukan
           salah satu dari lima ruangan, jadi tidak boleh ada yang menyala
           oranye — store-nya masih memegang ruangan terakhir dan dulu itu bocor
           ke navbar sebagai "Home" oranye. Diukur, bukan dibaca dari kelasnya:
           kelas text-accent bisa tetap terpasang sementara nilainya berubah.
           (Tanpa backtick di komentar ini: seluruh blok ini SENDIRI berada di
           dalam template literal, satu backtick memutusnya di tengah.) */
        navColors: [...document.querySelectorAll('nav ul button')].map(
          (b) => getComputedStyle(b).color,
        ),
      })`,
    ),
  );
  await sleep(2000);
  const coldDraws2 = await evalJs("window.__draws");
  await shot("05-deeplink-dingin");

  /*
   * Yang diuji: office.glb — 60+ MB scene kantor. macbook-inquiry.glb sengaja
   * TIDAK dihitung: itu laptop modal "Talk to us" di navbar, ikut di setiap
   * halaman situs, dan halaman lowongan juga memakainya.
   */
  const glb = requests.filter((u) => u.includes("office.glb"));
  check(cold.url === JOB_PATH, "deep-link bertahan", cold.url);
  check(cold.h1.includes(TITLE), "isinya tampil", cold.h1);
  check(
    cold.navColors.length === 4 &&
      cold.navColors.every((c) => !/2[45]\d,\s*1[01]\d,\s*\d\d/.test(c)),
    "tidak ada tautan navbar yang oranye di halaman lowongan",
    cold.navColors.join(" / "),
  );
  check(!cold.loader, "TIDAK ada layar loader (INVARIANTS §3)");
  check(
    cold.canvases <= 1,
    "hero tidak di-mount (canvas yang ada cuma laptop inquiry navbar)",
    `${cold.canvases} canvas`,
  );
  check(glb.length === 0, "office.glb tidak ikut diunduh", `${glb.length} permintaan`);
  /*
   * Nol SELISIH, bukan nol total: gerbang frameloop laptop inquiry ada di
   * "demand" (memory contact-laptop-click), jadi ia sah menggambar sekali
   * saat mount. Yang tidak boleh ada di halaman teks adalah loop yang
   * berdetak terus.
   */
  check(
    coldDraws2 - cold.draws === 0,
    "nol draw call saat diam",
    `${coldDraws2 - cold.draws} dalam 2 dtk (${cold.draws} sekali saat mount)`,
  );

  // Bahasa bertahan menyeberangi reload — inti janji localStorage-nya.
  await send("Page.reload");
  await sleep(3500);
  const stillId = JSON.parse(
    await evalJs(
      "JSON.stringify([...document.querySelectorAll('h2')].map((h) => h.textContent.trim()))",
    ),
  );
  check(
    stillId.includes("Apa yang akan kamu kerjakan"),
    "pilihan ID bertahan setelah refresh",
    stillId.join(" / "),
  );

  // Navbar tetap berfungsi dari halaman lowongan (bukan cuma hiasan).
  await evalJs(
    `[...document.querySelectorAll('a,button')]
      .find((n) => n.textContent.trim() === 'Services')?.click()`,
  );
  await sleep(2500);
  const viaNav = await evalJs("location.pathname");
  check(viaNav !== JOB_PATH, "navbar membawa keluar dari halaman lowongan", viaNav);

  // Tabel Careers: SETIAP lowongan open sekarang punya halamannya sendiri.
  //
  // Dulu di sini diklik accordion Customer Success — role open terakhir yang
  // materinya belum lengkap. Sejak ia ikut pindah ke `/careers/<slug>` tidak
  // ada lagi accordion yang tayang, jadi yang dijaga dibalik: tidak boleh ada
  // baris open yang tertinggal sebagai <button aria-expanded>, karena tautannya
  // tidak akan pernah bisa dibagikan. (Mekanisme accordion-nya sendiri masih
  // hidup di CareersRoles untuk baris tanpa slug, dijaga Careers.test.tsx.)
  await send("Page.navigate", { url: "http://localhost:3000/people" });
  await sleep(6000);
  for (let i = 0; i < 26; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: 700, y: 500, deltaX: 0, deltaY: 320,
    });
    await sleep(40);
  }
  await sleep(1200);
  const openRows = await evalJs(
    `(() => {
      const rows = [...document.querySelectorAll('#careers a[href^="/careers/"]')];
      const accordions = [...document.querySelectorAll('#careers button[aria-expanded]')];
      return JSON.stringify({
        links: rows.map((n) => n.getAttribute('href')),
        accordions: accordions.map((n) => n.textContent.trim().slice(0, 40)),
      });
    })()`,
  );
  const rows = JSON.parse(openRows);
  check(
    rows.accordions.length === 0 && rows.links.includes(JOB_PATH),
    "semua lowongan open jadi tautan halaman, nol accordion tersisa",
    `${rows.links.length} tautan · ${rows.accordions.length} accordion`,
  );
  await shot("06-careers-rows");

  // Slug ngawur
  await send("Page.navigate", { url: "http://localhost:3000/careers/ngawur" });
  await sleep(3000);
  const bogus = await evalJs("location.pathname + location.hash");
  check(bogus === "/people#careers", "slug tak dikenal dipulangkan ke daftar", bogus);

  ws.close();
  console.log(`\nscreenshot: ${OUT}`);
  if (fails.length) {
    console.log(`\nGAGAL ${fails.length}:`);
    for (const f of fails) console.log("  · " + f);
  } else {
    console.log("\nsemua lolos.");
  }
  process.exitCode = fails.length ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => browser.kill());

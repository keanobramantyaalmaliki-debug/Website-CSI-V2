/**
 * Jalan-jalan alamat panel admin: SATU port, path sungguhan.
 *
 *   node scripts/probe-admin-path.mjs
 *
 * Yang dibuktikan di sini bukan fitur CMS-nya, melainkan ALAMATNYA:
 *
 *   • `localhost:3000/admin` (port situs, bukan :5174) membuka panel, dan
 *     yang pertama terlihat adalah layar depan panel — bukan daftar entitas
 *     mana pun, bukan pula halaman situs;
 *   • tiap menu punya alamatnya sendiri, `/admin/<entitas>`, dan alamat itu
 *     berubah saat menunya diklik;
 *   • alamat dalam itu SELAMAT DIMUAT ULANG. Ini inti pindahnya dari hash ke
 *     path: hash tidak pernah sampai ke server, path selalu, jadi refresh di
 *     `/admin/crew` menguji rantai penuh (dev: proxy :3000 → :5174;
 *     produksi: `serve.json` → `dist/admin/index.html`);
 *   • tombol Back peramban bekerja, yang cuma mungkin kalau ada pendengar
 *     `popstate` — `pushState` sendirian diam saja;
 *   • dan situsnya sendiri tidak ikut terseret: `/` tetap situs, `/people`
 *     tetap situs. Aturan `/!(admin)` di `serve.json` gampang sekali
 *     "disederhanakan" jadi `**` oleh orang berikutnya, dan probe ini yang
 *     akan berteriak.
 *
 * Probe ini TIDAK menyentuh data: tidak menyimpan, tidak Publish. Karena itu
 * ia tidak perlu menandai audit_log dan aman diulang kapan saja.
 *
 * Prasyarat tiga proses hidup: API :3001, situs :3000, admin :5174.
 * Brave, bukan Chrome, sama seperti seluruh skrip verifikasi di folder ini.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9251;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const ASAL = process.env.CSI_ORIGIN ?? "http://localhost:3000";

rmSync("/tmp/csi-admin-path", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-admin-path",
    "--window-size=1440,1200",
    `${ASAL}/admin`,
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

const BEKAL = `
  window.__isi = (label, nilai) => {
    const teks = [...document.querySelectorAll("label")]
      .find((l) => l.textContent.trim().startsWith(label));
    if (!teks) throw new Error("isian tidak ada: " + label);
    const el = teks.parentElement.querySelector("input, textarea");
    const proto = el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, nilai);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  window.__klik = (teks) => {
    const b = [...document.querySelectorAll("button, summary")]
      .find((x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks));
    if (!b) throw new Error("tombol tidak ada: " + teks);
    b.click();
  };
  window.__teks = () => document.body.innerText;
  window.__judulLayar = () => document.querySelector("main h2")?.textContent.trim() ?? "";
  window.__jalan = () => location.pathname;

  window.__grup = (label) => {
    const li = [...document.querySelectorAll(".sisi-daftar > li")].find(
      (el) => el.querySelector(".sisi-judul > span")?.textContent.trim() === label,
    );
    if (!li) throw new Error("grup menu tidak ada: " + label);
    return li;
  };
  window.__anak = (label) =>
    [...__grup(label).querySelectorAll(".sisi-anak > li")].map((x) => x.innerText.trim());
  window.__bukaGrup = (label) => __grup(label).querySelector(".sisi-judul").click();
  window.__klikAnak = (grup, label) => {
    const b = [...__grup(grup).querySelectorAll(".sisi-anak button")].find(
      (x) => x.textContent.trim() === label,
    );
    if (!b) throw new Error("isi menu tidak ada: " + label);
    b.click();
  };
  window.__klikSisi = (label) => {
    const b = [...document.querySelectorAll(".sisi-daftar .sisi-judul")]
      .find((x) => x.textContent.trim() === label);
    if (!b) throw new Error("menu sisi tidak ada: " + label);
    b.click();
  };
`;

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
    await sleep(400);
  }
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const galatKonsol = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      galatKonsol.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    }
    if (m.method === "Runtime.exceptionThrown") {
      galatKonsol.push(m.params.exceptionDetails.exception?.description ?? "lemparan");
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

  const jalan = async (ekspresi) => {
    const r = await send("Runtime.evaluate", {
      expression: ekspresi,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        `di halaman: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`,
      );
    }
    return r.result.value;
  };

  const potret = async (nama) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`/tmp/adminpath-${nama}.png`, Buffer.from(data, "base64"));
  };

  /** Sabar tiga puluh detik: permintaan pertama ke :3000 menerjemahkan
      ratusan modul, dan yang ke :5174 lewat proxy menambah satu lapis lagi. */
  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 120; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);
  const buka = async (path) => {
    await send("Page.navigate", { url: `${ASAL}${path}` });
    await sleep(300);
  };
  const cekJalan = async (harus, apa) => {
    const p = await jalan(`location.pathname`);
    if (p !== harus) throw new Error(`${apa}: alamatnya "${p}", bukan "${harus}"`);
  };

  /* 1 — `/admin` (tanpa garis miring penutup) sudah membuka panel. */
  await tunggu(
    `!!document.querySelector(".sisi") || document.body.innerText.includes("Kata sandi")`,
    "panel :3000/admin",
  );
  await jalan(BEKAL);
  lapor(`${ASAL}/admin membuka panel, bukan situs`);

  if (await jalan(`__teks().includes("Kata sandi")`)) {
    await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
    await jalan(`__klik("Masuk")`);
    await tunggu(`!!document.querySelector(".sisi")`, "sesi masuk");
    await jalan(BEKAL);
    lapor("masuk dengan sandi");
  }

  /* 2 — yang pertama terlihat itu LAYAR DEPAN, bukan daftar entitas. */
  await cekJalan("/admin", "sesudah masuk");
  const judulDepan = await jalan(`__judulLayar()`);
  /* Layar depan panel itu peta isi, bukan tabel. Kalau ada satu baris tabel
     pun di sini, `bacaRute()` sudah salah membaca `/admin` sebagai entitas. */
  if (await jalan(`!!document.querySelector("main tbody tr")`)) {
    throw new Error(`"/admin" langsung menampilkan daftar: "${judulDepan}"`);
  }
  lapor(`"/admin" = layar depan panel ("${judulDepan}")`);
  await potret("depan");

  /* 3 — klik menu = alamat berubah. Crew ada di kelompok People. */
  await jalan(`__bukaGrup("People")`);
  await tunggu(`__anak("People").length > 0`, "kelompok People terbuka");
  await jalan(BEKAL);
  await jalan(`__klikAnak("People", "Crew")`);
  await tunggu(`!!document.querySelector("main table") || !!document.querySelector("main .kosong")`, "daftar crew");
  await cekJalan("/admin/crew", "sesudah klik menu Crew");
  lapor('klik menu "Crew" menaikkan alamat jadi /admin/crew');

  /* 4 — alamat dalam SELAMAT dimuat ulang. Inti pindahnya dari hash. */
  await buka("/admin/crew");
  await tunggu(`!!document.querySelector("main table") || !!document.querySelector("main .kosong")`, "crew sesudah reload");
  await jalan(BEKAL);
  await cekJalan("/admin/crew", "sesudah muat ulang");
  const judulCrew = await jalan(`__judulLayar()`);
  lapor(`muat ulang di /admin/crew tetap mendarat di layarnya ("${judulCrew}")`);
  await potret("crew");

  /* 5 — rute bertingkat dua tingkat, langsung dari alamat. */
  await buka("/admin/crew/baru");
  await tunggu(`!!document.querySelector("main form")`, "form crew baru");
  await jalan(BEKAL);
  await cekJalan("/admin/crew/baru", "form baru");
  lapor("/admin/crew/baru langsung membuka formnya");

  /* 6 — layar tanpa kelompok: Riwayat & Review. */
  for (const [path, kata] of [["/admin/riwayat", "Riwayat"], ["/admin/review", "Review"]]) {
    await buka(path);
    await tunggu(`!!document.querySelector("main")`, `layar ${kata}`);
    await jalan(BEKAL);
    await cekJalan(path, kata);
    const j = await jalan(`__judulLayar()`);
    if (!j.toLowerCase().includes(kata.toLowerCase())) {
      throw new Error(`${path} membuka layar lain: "${j}"`);
    }
    lapor(`${path} = layar ${kata}`);
  }

  /* 7 — tombol Back peramban. `pushState` sendirian tidak menggerakkan apa
     pun; yang diuji di sini pendengar `popstate` di App.tsx. */
  await buka("/admin");
  await tunggu(`!!document.querySelector(".sisi")`, "layar depan");
  await jalan(BEKAL);
  await jalan(`__bukaGrup("People")`);
  await tunggu(`__anak("People").length > 0`, "kelompok People terbuka lagi");
  await jalan(BEKAL);
  await jalan(`__klikAnak("People", "Crew")`);
  await tunggu(`location.pathname === "/admin/crew"`, "alamat naik ke crew");
  await jalan(`history.back()`);
  await tunggu(`location.pathname === "/admin"`, "Back mengembalikan alamat");
  await sleep(400);
  await jalan(BEKAL);
  if (await jalan(`!!document.querySelector("main tbody tr")`)) {
    throw new Error("Back mengubah alamat tapi layarnya masih daftar crew");
  }
  lapor("tombol Back peramban mengembalikan alamat DAN layarnya");

  /* 8 — situsnya tidak ikut terseret. */
  await buka("/");
  await tunggu(`!!document.querySelector("canvas") || !!document.querySelector("nav")`, "situs di /");
  const adaSisi = await jalan(`!!document.querySelector(".sisi")`);
  if (adaSisi) throw new Error('"/" malah membuka panel admin');
  lapor('"/" tetap situs, tidak tersedot aturan /admin');

  await buka("/people");
  await tunggu(`!!document.querySelector("canvas") || !!document.querySelector("nav")`, "situs di /people");
  if (await jalan(`!!document.querySelector(".sisi")`)) {
    throw new Error('"/people" malah membuka panel admin');
  }
  await cekJalan("/people", "rute situs dalam");
  lapor('"/people" tetap situs (aturan /!(admin) di serve.json utuh)');

  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/adminpath-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

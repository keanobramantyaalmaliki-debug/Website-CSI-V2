/**
 * Tema terang/gelap panel admin, diperiksa lewat CDP.
 *
 *   node scripts/probe-tema-admin.mjs
 *
 * Yang diuji di sini justru yang tidak bisa diuji unit test: warna yang
 * BENAR-BENAR dilukis peramban setelah seluruh cascade selesai. Unit test bisa
 * memastikan atribut `data-tema` berubah, dan tetap lolos sementara panelnya
 * putih semua karena satu aturan CSS menulis `#fff` langsung alih-alih token.
 *
 * Empat hal yang dijaga:
 *   1. terang = dominan putih, gelap = dominan hitam;
 *   2. SEMUA warna abu-abu murni (R=G=B) — tidak ada rona yang menyelinap;
 *   3. pilihan bertahan setelah muat ulang;
 *   4. tema sudah terpasang sebelum React jalan (skrip anti-kedip).
 *
 * Prasyarat: API :3001 dan admin :5174 hidup. Brave, bukan Chrome.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9233;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";

rmSync("/tmp/csi-tema-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-tema-probe",
    "--window-size=1280,900",
    "http://localhost:5174/admin/",
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

/* Dijalankan DI DALAM halaman. `rgb(a, b, c)` → [a,b,c]; dipakai untuk
   memutuskan "abu-abu murni" dan "terang/gelap" dari angka, bukan dari mata. */
const BEKAL = `
  window.__rgb = (s) => (s.match(/\\d+/g) ?? []).slice(0, 3).map(Number);
  window.__warna = (sel, prop) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("elemen tidak ada: " + sel);
    return __rgb(getComputedStyle(el)[prop]);
  };
  /* Semua warna yang benar-benar dipakai di halaman ini, dari elemen yang
     benar-benar ada — bukan daftar token yang ditulis ulang dari CSS. Daftar
     yang ditulis ulang akan tetap hijau untuk aturan yang lupa memakai
     token. */
  window.__semuaWarna = () => {
    const keluar = [];
    for (const el of document.querySelectorAll("*")) {
      const g = getComputedStyle(el);
      for (const p of ["color", "backgroundColor", "borderTopColor", "borderLeftColor"]) {
        const v = g[p];
        if (!v || v === "rgba(0, 0, 0, 0)" || v === "transparent") continue;
        const [r, gg, b] = __rgb(v);
        if (r !== gg || gg !== b) keluar.push(el.tagName + "." + el.className + " " + p + ": " + v);
      }
    }
    return keluar;
  };
  window.__isi = (label, nilai) => {
    const teks = [...document.querySelectorAll("label")]
      .find((l) => l.textContent.trim().startsWith(label));
    const el = teks.parentElement.querySelector("input, textarea");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, nilai);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  window.__tombolTema = () => document.querySelector(".tombol-tema");
  /* Cincin fokus hanya ada saat elemennya benar-benar difokuskan, jadi ia
     tidak bisa ikut __semuaWarna() — diperiksa sendiri, per jenis elemen. */
  window.__fokus = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("elemen tidak ada: " + sel);
    el.focus();
    const g = getComputedStyle(el);
    return { sel, warna: __rgb(g.outlineColor), tebal: g.outlineWidth, gaya: g.outlineStyle };
  };
`;

async function main() {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      target = (await json("/json/list")).find((t) => t.type === "page");
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
    writeFileSync(`/tmp/tema-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 40; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (t) => console.log(`✓ ${t}`);
  const dekat = (a, b, toleransi = 24) => Math.abs(a - b) <= toleransi;

  /* Preferensi sistem DIPALSUKAN, tidak diwarisi dari macOS yang menjalankan
     skrip ini. Tanpa ini hasilnya berbeda antara laptop bertema gelap dan
     laptop bertema terang, dan yang gagal justru probenya — bukan panelnya. */
  const sistem = (nilai) =>
    send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: nilai }],
    });

  await sistem("light");
  await send("Page.reload");
  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk");

  /* 2 — tombolnya ada, dan ada di sebelah KIRI nama. Diperiksa lewat posisi
     nyata di layar, bukan lewat urutan di JSX: satu `float` atau satu
     `flex-direction` yang salah memindahkannya tanpa menyentuh JSX. */
  await tunggu(`!!__tombolTema()`, "tombol tema");
  const tataLetak = await jalan(`(() => {
    const b = __tombolTema().getBoundingClientRect();
    const siapa = document.querySelector(".siapa").getBoundingClientRect();
    return { kiriTombol: Math.round(b.left), kiriBaris: Math.round(siapa.left),
             lebar: Math.round(b.width), teks: document.querySelector(".siapa").innerText.trim() };
  })()`);
  if (tataLetak.kiriTombol > tataLetak.kiriBaris + 2) {
    throw new Error(`tombol tidak di paling kiri baris nama: ${JSON.stringify(tataLetak)}`);
  }
  lapor(`tombol tema di kiri "${tataLetak.teks.split("\n")[0]}" (${tataLetak.lebar}px)`);

  /* 3 — tema terang: dominan putih */
  const terang = await jalan(`({
    tema: document.documentElement.dataset.tema,
    dasar: __warna("body", "backgroundColor"),
    teks: __warna("body", "color"),
    label: __tombolTema().getAttribute("aria-label"),
  })`);
  if (terang.tema !== "terang") throw new Error(`bukan tema terang: ${terang.tema}`);
  if (!dekat(terang.dasar[0], 255)) throw new Error(`terang tidak dominan putih: ${terang.dasar}`);
  if (!dekat(terang.teks[0], 0)) throw new Error(`teks terang tidak hitam: ${terang.teks}`);
  await potret("1-terang");
  lapor(`terang: dasar rgb(${terang.dasar}) teks rgb(${terang.teks}) — "${terang.label}"`);

  const ronaTerang = await jalan(`__semuaWarna()`);
  if (ronaTerang.length) throw new Error(`ada warna berona di tema terang:\n  ${ronaTerang.join("\n  ")}`);
  lapor(`terang: ${await jalan(`document.querySelectorAll("*").length`)} elemen, semua abu-abu murni`);

  /* 3a — cincin fokus keyboard. Bawaan peramban BIRU (terukur: rgb(0,95,204)
     terang, rgb(153,200,255) gelap), dan ia mengelilingi apa pun yang sedang
     dipakai — warna berona paling terlihat yang bisa tersisa di panel ini. */
  const cekFokus = async (tema) => {
    /* Semuanya ada di beranda. Isian teks diperiksa terpisah di langkah form,
       karena beranda memang tidak punya satu pun. */
    for (const sel of [".sisi button", "button.utama", "button.polos", ".tombol-tema"]) {
      const f = await jalan(`__fokus(${JSON.stringify(sel)})`);
      const [r, g, b] = f.warna;
      if (r !== g || g !== b) throw new Error(`cincin fokus berona di ${tema} pada ${sel}: rgb(${f.warna})`);
      if (f.tebal !== "2px") throw new Error(`cincin fokus ${f.tebal} di ${tema} pada ${sel}`);
    }
    /* Cincinnya menjorok 2px keluar tombol, dan daftar menu bisa bergulir —
       tanpa ruang untuknya, menjelajah menu dengan Tab memunculkan bilah
       gulir mendatar. */
    const luber = await jalan(`(() => {
      const d = document.querySelector(".sisi-daftar");
      d.querySelector("button").focus();
      return d.scrollWidth - d.clientWidth;
    })()`);
    if (luber > 0) throw new Error(`cincin fokus meluber ${luber}px di menu sisi (${tema})`);
    await jalan(`document.activeElement.blur()`);
    lapor(`${tema}: cincin fokus abu-abu murni 2px, tidak meluber di menu sisi`);
  };
  await cekFokus("terang");

  /* 3b — SEBELUM tombolnya pernah disentuh, panel ikut sistem — dan ikut
     terus, bukan cuma saat dimuat. macOS berganti sendiri saat matahari
     terbenam; panel yang tertinggal putih sampai di-reload terbaca sebagai
     temanya rusak. */
  await sistem("dark");
  await sleep(250);
  const ikutSistem = await jalan(`({
    tema: document.documentElement.dataset.tema,
    dasar: __warna("body", "backgroundColor"),
    simpan: localStorage.getItem("cogniti-tema"),
  })`);
  if (ikutSistem.tema !== "gelap" || !dekat(ikutSistem.dasar[0], 0)) {
    throw new Error(`tidak ikut sistem yang berganti ke gelap: ${JSON.stringify(ikutSistem)}`);
  }
  if (ikutSistem.simpan !== null) {
    throw new Error(`ikut sistem seharusnya tidak menyimpan apa pun: ${ikutSistem.simpan}`);
  }
  lapor("ikut sistem saat berganti ke gelap, tanpa menyimpan pilihan");

  await sistem("light");
  await sleep(250);
  if ((await jalan(`document.documentElement.dataset.tema`)) !== "terang") {
    throw new Error("tidak ikut sistem yang kembali ke terang");
  }
  lapor("ikut sistem saat kembali ke terang");

  /* 4 — klik, lalu tema gelap: dominan hitam. Sistemnya SENGAJA dibiarkan
     terang di sini: kalau pilihan orang tidak benar-benar mengalahkan
     sistem, langkah ini yang menangkapnya. */
  await jalan(`__tombolTema().click()`);
  await sleep(250);
  const gelap = await jalan(`({
    tema: document.documentElement.dataset.tema,
    dasar: __warna("body", "backgroundColor"),
    teks: __warna("body", "color"),
    label: __tombolTema().getAttribute("aria-label"),
    simpan: localStorage.getItem("cogniti-tema"),
  })`);
  if (gelap.tema !== "gelap") throw new Error(`tidak berpindah ke gelap: ${gelap.tema}`);
  if (!dekat(gelap.dasar[0], 0)) throw new Error(`gelap tidak dominan hitam: ${gelap.dasar}`);
  if (!dekat(gelap.teks[0], 255, 32)) throw new Error(`teks gelap tidak putih: ${gelap.teks}`);
  if (gelap.simpan !== "gelap") throw new Error(`tidak tersimpan: ${gelap.simpan}`);
  await potret("2-gelap");
  lapor(`gelap: dasar rgb(${gelap.dasar}) teks rgb(${gelap.teks}) — "${gelap.label}"`);

  const ronaGelap = await jalan(`__semuaWarna()`);
  if (ronaGelap.length) throw new Error(`ada warna berona di tema gelap:\n  ${ronaGelap.join("\n  ")}`);
  lapor("gelap: semua abu-abu murni");
  await cekFokus("gelap");

  /* 5 — form: isian, tabel, dan dialog ikut gelap. Ini yang paling sering
     tertinggal, karena ketiganya digambar sebagian oleh peramban. */
  await jalan(`location.hash = "/lowongan"`);
  await sleep(600);
  await jalan(BEKAL);
  const daftarGelap = await jalan(`({
    tabel: __warna("td", "borderBottomColor"),
    kepalaTabel: __warna("th", "color"),
  })`);
  await potret("3-gelap-daftar");
  lapor(`gelap/daftar: garis baris rgb(${daftarGelap.tabel}), kepala rgb(${daftarGelap.kepalaTabel})`);

  await jalan(`document.querySelector(".utama").click()`);
  await sleep(600);
  await jalan(BEKAL);
  const formGelap = await jalan(`({
    isian: __warna('input[type="text"]', "backgroundColor"),
    isianTeks: __warna('input[type="text"]', "color"),
    skema: getComputedStyle(document.documentElement).colorScheme,
  })`);
  const fokusIsian = await jalan(`__fokus('input[type="text"]')`);
  if (new Set(fokusIsian.warna).size !== 1) {
    throw new Error(`cincin fokus isian berona: rgb(${fokusIsian.warna})`);
  }
  await jalan(`document.activeElement.blur()`);
  if (!dekat(formGelap.isian[0], 0)) throw new Error(`isian masih putih di tema gelap: ${formGelap.isian}`);
  if (formGelap.skema !== "dark") throw new Error(`color-scheme bukan dark: ${formGelap.skema}`);
  await potret("4-gelap-form");
  lapor(`gelap/form: isian rgb(${formGelap.isian}) teks rgb(${formGelap.isianTeks}), color-scheme ${formGelap.skema}, cincin fokus rgb(${fokusIsian.warna})`);

  /* 5b — dialog konfirmasi. Satu-satunya tempat yang dulu menulis warna
     langsung (`rgba(0,0,0,.4)` untuk tirainya), jadi satu-satunya tempat yang
     paling mungkin tertinggal di tema terang. */
  await jalan(`location.hash = "/lowongan"`);
  await sleep(600);
  await jalan(BEKAL);
  await jalan(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Hapus").click()`);
  await sleep(400);
  await jalan(BEKAL);
  const dialogGelap = await jalan(`({
    ada: !!document.querySelector("dialog[open]"),
    dasar: __warna("dialog", "backgroundColor"),
    tepi: __warna("dialog", "borderTopColor"),
  })`);
  if (!dialogGelap.ada) throw new Error("dialog konfirmasi tidak terbuka");
  if (!dekat(dialogGelap.dasar[0], 0)) {
    throw new Error(`dialog masih putih di tema gelap: ${dialogGelap.dasar}`);
  }
  await potret("5-gelap-dialog");
  lapor(`gelap/dialog: dasar rgb(${dialogGelap.dasar}), tepi rgb(${dialogGelap.tepi})`);
  await jalan(`[...document.querySelectorAll("dialog button")].find((b) => b.textContent.trim() === "Batal").click()`);
  await sleep(250);

  /* 5c — layar masuk. Ia dirender SEBELUM tombol temanya ada, jadi ia satu-
     satunya layar yang temanya sepenuhnya bergantung pada skrip di
     `index.html` dan bukan pada React. */
  await jalan(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Keluar").click()`);
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk lagi");
  await jalan(BEKAL);
  const masukGelap = await jalan(`({
    dasar: __warna("body", "backgroundColor"),
    isian: __warna('input[type="password"]', "backgroundColor"),
  })`);
  if (!dekat(masukGelap.dasar[0], 0) || !dekat(masukGelap.isian[0], 0)) {
    throw new Error(`layar masuk tidak ikut gelap: ${JSON.stringify(masukGelap)}`);
  }
  await potret("6-gelap-masuk");
  lapor(`gelap/masuk: dasar rgb(${masukGelap.dasar}), isian rgb(${masukGelap.isian})`);
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "masuk lagi");
  await jalan(BEKAL);

  /* 6 — bertahan setelah muat ulang, DAN sudah terpasang sebelum React jalan.
     Yang kedua diperiksa lewat `document.currentScript`-nya skrip anti-kedip:
     kalau atributnya baru dipasang React, ia belum ada saat <body> diurai. */
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `document.addEventListener("DOMContentLoaded", () => {
      window.__temaSaatUrai = document.documentElement.dataset.tema;
    });`,
  });
  await send("Page.reload");
  await sleep(2500);
  await jalan(BEKAL);
  await tunggu(`!!__tombolTema()`, "panel setelah muat ulang");
  const sesudah = await jalan(`({
    tema: document.documentElement.dataset.tema,
    saatUrai: window.__temaSaatUrai,
    dasar: __warna("body", "backgroundColor"),
  })`);
  if (sesudah.tema !== "gelap") throw new Error(`tema hilang setelah muat ulang: ${sesudah.tema}`);
  if (sesudah.saatUrai !== "gelap") {
    throw new Error(`tema baru dipasang setelah React (kedip putih): ${sesudah.saatUrai}`);
  }
  lapor(`muat ulang: tetap gelap, dan sudah "${sesudah.saatUrai}" sejak HTML selesai diurai (tanpa kedip)`);

  /* 7 — balik ke terang */
  await jalan(`__tombolTema().click()`);
  await sleep(250);
  const balik = await jalan(`({ tema: document.documentElement.dataset.tema, dasar: __warna("body","backgroundColor") })`);
  if (balik.tema !== "terang" || !dekat(balik.dasar[0], 255)) {
    throw new Error(`tidak balik ke terang: ${JSON.stringify(balik)}`);
  }
  lapor("kembali ke terang");

  if (galatKonsol.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of galatKonsol) console.log("  " + g);
  }
  console.log("\nPotret: /tmp/tema-1-terang.png .. /tmp/tema-4-gelap-form.png");

  ws.close();
  brave.kill();
}

main().catch((e) => {
  console.error("✗ " + e.message);
  brave.kill();
  process.exit(1);
});

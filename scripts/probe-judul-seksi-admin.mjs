/**
 * Jalan-jalan panel admin untuk JUDUL SEKSI.
 *
 *   node scripts/probe-judul-seksi-admin.mjs
 *
 * Entitas ini bentuk KETIGA di CMS ini, sesudah "daftar" (lowongan, crew, …)
 * dan "tunggal" (visi, footer): sebelas baris yang tetap: boleh diubah, tidak
 * boleh ditambah, dihapus, atau diurutkan. Karena bentuknya baru, yang diuji
 * di sini sebagian besar justru yang TIDAK boleh ada:
 *
 *   • tiap kelompok halaman punya anak menu "Judul seksi", dan daftarnya
 *     memuat seksi halaman itu urut seperti di situs, bukan urut abjad;
 *   • tidak ada "+ Tambah", "Hapus", "Naikkan", maupun kolom Status;
 *   • `/admin/judul-home/baru` tidak membuka form LOWONGAN, lubang yang sama
 *     yang dulu ditambal `tanpaDaftar()` untuk alamat liar visi;
 *   • isian subteks cuma muncul di seksi yang memang menampilkannya, jadi
 *     tidak ada tempat mengetik kalimat yang tak akan pernah tampil;
 *   • membatalkan lewat layar Review menulis balik judul lama TANPA menghapus
 *     barisnya, cabang yang cuma dimiliki bentuk berkunci-tetap ini.
 *
 * Langkah terakhirnya membuka `/` yang sungguhan di lebar 360px. Sampai titik
 * itu yang terbukti baru "database → berkas"; yang dijanjikan adalah judul
 * dua baris dengan animasi per KATA, dan bagian itu cuma bisa dilihat di
 * halaman aslinya, di lebar yang paling mudah dilubernya.
 *
 * Judul semula dikembalikan di langkah terakhir, termasuk saat probe gagal di
 * tengah: ini baris yang sama yang dipakai halaman depan sungguhan, dan tidak
 * seperti lowongan atau nilai ia tidak bisa sekadar dihapus.
 *
 * Prasyarat tiga proses hidup: API :3001, situs :3000, admin :5174.
 * Brave, bukan Chrome, sama seperti seluruh skrip verifikasi di folder ini.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";
import { tandaiAudit, sapuAudit } from "./lib/audit.mjs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9246;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";

/* Dua baris, karena baris kedua itulah yang paling mudah hilang: `\n` yang
   tidak selamat melewati textarea, JSON, atau `sectionHeading()` akan terbaca
   di sini sebagai satu baris panjang. Kata "intelligence" sengaja dipakai
   lagi: ia kata terpanjang di judul asli dan biang gulir horizontal di 360px. */
const JUDUL_BARU = "Probe judul seksi.\nDua baris intelligence.";
const JUDUL_KETIGA = "Probe judul seksi ketiga.";

rmSync("/tmp/csi-judul-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-judul-probe",
    "--window-size=1440,1800",
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
  window.__baca = (label) => {
    const teks = [...document.querySelectorAll("label")]
      .find((l) => l.textContent.trim().startsWith(label));
    if (!teks) throw new Error("isian tidak ada: " + label);
    return teks.parentElement.querySelector("input, textarea").value;
  };
  window.__adaIsian = (label) =>
    [...document.querySelectorAll("label")]
      .some((l) => l.textContent.trim().startsWith(label));
  window.__klik = (teks) => {
    const b = [...document.querySelectorAll("button, summary")]
      .find((x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks));
    if (!b) throw new Error("tombol tidak ada: " + teks);
    b.click();
  };
  window.__teks = () => document.body.innerText;
  window.__judulLayar = () => document.querySelector("main h2")?.textContent.trim() ?? "";

  /* ── menu sisi ────────────────────────────────────────────────────── */
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

  /* ── daftar judul seksi ───────────────────────────────────────────── */

  /** Kepala tabelnya, dipakai membuktikan kolom Status TIDAK ada: layar ini
      tidak punya draf, dan kolom kosong yang terlanjur ikut tersalin dari
      daftar lain akan terbaca sebagai "ada yang belum diisi". */
  window.__kolom = () =>
    [...document.querySelectorAll("main thead th")].map((th) => th.innerText.trim());
  window.__barisJudul = () =>
    [...document.querySelectorAll("main tbody > tr")].map((tr) => {
      const sel = [...tr.children].map((td) => td.innerText.trim());
      return { no: sel[0], bagian: sel[1], judul: sel[2], sub: sel[3], diubah: sel[4] };
    });
  window.__ubahBaris = (i) => {
    const tr = [...document.querySelectorAll("main tbody > tr")][i];
    if (!tr) throw new Error("baris " + i + " tidak ada");
    const b = [...tr.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ubah");
    if (!b) throw new Error("baris " + i + " tidak punya tombol Ubah");
    b.click();
  };
  /** Tombol terlarang dicari di seluruh MAIN, bukan cuma di form: yang
      dilarang bentuk ini adalah menambah dan menghapus, dan tombolnya akan
      hidup di kepala daftar, bukan di dalam form. Bilah Publish dan menu sisi
      di luar <main>, jadi tombol "Publish"-nya sendiri tidak ikut terjaring. */
  window.__tombolMain = () =>
    [...document.querySelectorAll("main button")].map((b) => b.textContent.trim());

  /* ── bilah bawah ──────────────────────────────────────────────────── */
  window.__publish = () => {
    const b = document.querySelector(".bar button.utama");
    if (!b) throw new Error("bilah Publish tidak ada");
    if (b.disabled) throw new Error("tombol Publish mati: tidak ada yang menunggu");
    b.click();
  };
  window.__terpublish = () => {
    const b = document.querySelector(".bar button.utama");
    return !!b && b.disabled;
  };
  window.__reviewDariBar = () => {
    const b = [...document.querySelectorAll(".bar .bar-tombol button")]
      .find((x) => x.textContent.trim() === "Review");
    if (!b) throw new Error("tombol Review tidak ada di bilah");
    b.click();
  };

  /* ── layar Review & Riwayat ───────────────────────────────────────── */
  window.__baris = () =>
    [...document.querySelectorAll("main tbody > tr")]
      .filter((tr) => !tr.classList.contains("riwayat-isi"))
      .map((tr) => ({
        sel: [...tr.children].map((td) => td.innerText.trim()),
        tombol: [...tr.querySelectorAll("button")].map((b) => b.textContent.trim()),
      }));
  window.__cariBaris = (kata) =>
    __baris().findIndex((b) => b.sel.join(" | ").includes(kata));
  window.__tombolBaris = (i, teks) => {
    const tr = [...document.querySelectorAll("main tbody > tr")]
      .filter((x) => !x.classList.contains("riwayat-isi"))[i];
    if (!tr) throw new Error("baris " + i + " tidak ada");
    const b = [...tr.querySelectorAll("button")].find((x) => x.textContent.trim() === teks);
    if (!b) throw new Error("baris " + i + " tidak punya tombol " + teks);
    b.click();
  };
  window.__banding = () => {
    const t = document.querySelector("table.banding");
    if (!t) return null;
    const out = {};
    for (const tr of t.querySelectorAll("tbody > tr")) {
      const sel = [...tr.children].map((td) => td.innerText.trim());
      out[sel[0]] = { sebelum: sel[1], sesudah: sel[2] };
    }
    return out;
  };
  window.__yaBatal = () => document.querySelector("dialog[open] button.utama").click();
  window.__layarSiap = () =>
    !document.body.innerText.includes("Memuat") &&
    (!!document.querySelector("main table tbody tr") ||
     !!document.querySelector("main .kosong"));
`;

let bersihkan = null;
let tanda = null;

async function main() {
  tanda = await tandaiAudit();

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
    writeFileSync(`/tmp/judul-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 40; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  /** Sabar tiga puluh detik. Khusus untuk `localhost:3000`: di sana Vite
      menerjemahkan ratusan modul saat permintaan pertama, dan sepuluh detik
      milik `tunggu()` sering habis sebelum satu piksel pun tergambar. */
  const tungguLama = async (ekspresi, apa) => {
    for (let i = 0; i < 120; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);
  const konten = async () =>
    (await fetch("http://localhost:3000/content.json")).json();
  /** Judul csi-hero yang sedang TAYANG. `null` kalau content.json belum
      pernah memuat bagian ini, yang wajar sebelum Publish pertama. */
  const heroTayang = async () => {
    const c = await konten();
    return c.sectionTexts?.find((s) => s.key === "csi-hero")?.heading ?? null;
  };

  const kePanel = async () => {
    if (!(await jalan(`!!document.querySelector(".sisi")`))) {
      await send("Page.navigate", { url: "http://localhost:5174/admin/" });
      await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    }
    await jalan(BEKAL);
  };

  const bukaDaftar = async (grup = "Home") => {
    await kePanel();
    if ((await jalan(`__anak(${JSON.stringify(grup)}).length`)) === 0) {
      await jalan(`__bukaGrup(${JSON.stringify(grup)})`);
      await tunggu(`__anak(${JSON.stringify(grup)}).length > 0`, `grup ${grup} terbuka`);
    }
    await jalan(`__klikAnak(${JSON.stringify(grup)}, "Judul seksi")`);
    await tunggu(`!!document.querySelector("main tbody tr")`, "daftar judul seksi");
    await jalan(BEKAL);
  };

  /** Buka form seksi tertentu lewat daftarnya, seperti editor sungguhan. */
  const bukaForm = async (grup, bagian) => {
    await bukaDaftar(grup);
    const i = await jalan(`__barisJudul().findIndex((b) => b.bagian === ${JSON.stringify(bagian)})`);
    if (i < 0) throw new Error(`baris "${bagian}" tidak ada di daftar ${grup}`);
    await jalan(`__ubahBaris(${i})`);
    await tunggu(`!!document.querySelector("main form textarea")`, `form ${bagian}`);
    await jalan(BEKAL);
  };

  /** Kedua isian ditulis dalam SATU kunjungan form: menyimpan mengembalikan
      layar ke daftarnya, jadi kunjungan kedua untuk mengisi subteks akan
      mencari isian yang sudah tidak ada lagi di layar. */
  const simpanHero = async (judul, sub = null) => {
    await bukaForm("Home", "Hero halaman depan");
    await jalan(`__isi("Judul", ${JSON.stringify(judul)})`);
    if (sub !== null) await jalan(`__isi("Subteks", ${JSON.stringify(sub)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`__teks().includes("tersimpan")`, "kabar tersimpan");
    await jalan(BEKAL);
  };

  const publish = async () => {
    await jalan(`__publish()`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
  };

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — keempat kelompok halaman punya anak menu "Judul seksi", dan
     beranda sudah tahu isinya sebelum satu pun layarnya dibuka. */
  for (const grup of ["Home", "Services", "Work", "People"]) {
    if ((await jalan(`__anak(${JSON.stringify(grup)}).length`)) === 0) {
      await jalan(`__bukaGrup(${JSON.stringify(grup)})`);
      await tunggu(`__anak(${JSON.stringify(grup)}).length > 0`, `grup ${grup}`);
    }
    const anak = await jalan(`__anak(${JSON.stringify(grup)})`);
    if (!anak.some((a) => a.startsWith("Judul seksi"))) {
      throw new Error(`grup ${grup} tidak punya "Judul seksi": ${JSON.stringify(anak)}`);
    }
  }
  lapor("keempat kelompok halaman punya anak menu Judul seksi");

  const beranda = await jalan(`__teks()`);
  if (!/4 bagian/.test(beranda)) {
    throw new Error(`beranda tidak menghitung judul seksi Home:\n${beranda.slice(0, 600)}`);
  }
  lapor("beranda menyebut jumlah bagiannya tanpa layarnya dibuka");
  await potret("1-beranda");

  /* 3 — bentuk daftarnya. Urutan barisnya urutan SITUS, bukan abjad: kolom
     "#" berjanji begitu, dan jawaban server tidak dipercaya untuk itu. */
  await bukaDaftar("Home");
  const kolom = await jalan(`__kolom()`);
  if (kolom.some((k) => k === "Status")) {
    throw new Error(`daftar judul seksi punya kolom Status: ${JSON.stringify(kolom)}`);
  }
  const urutan = await jalan(`__barisJudul().map((b) => b.bagian)`);
  const DIHARAP = ["Hero halaman depan", "Deployment", "Cara kerja", "Industri"];
  if (JSON.stringify(urutan) !== JSON.stringify(DIHARAP)) {
    throw new Error(`urutan baris bukan urutan situs: ${JSON.stringify(urutan)}`);
  }
  const tombol = await jalan(`__tombolMain()`);
  const terlarang = tombol.filter((t) =>
    /^(\+ Tambah|Hapus|Naikkan|Turunkan)/.test(t),
  );
  if (terlarang.length) {
    throw new Error(`daftar punya tombol terlarang: ${JSON.stringify(terlarang)}`);
  }
  lapor("daftar urut seperti situs, tanpa kolom Status dan tanpa Tambah/Hapus/urutan");
  await potret("2-daftar");

  /* 4 — isian subteks cuma di seksi yang memang menampilkannya. Ini bukan
     kerapian: mengetik subteks di seksi yang tidak punya tempatnya berarti
     menulis kalimat yang tidak akan pernah dibaca siapa pun. */
  await bukaForm("Home", "Deployment");
  if (await jalan(`__adaIsian("Subteks")`)) {
    throw new Error("form Deployment menampilkan isian Subteks");
  }
  lapor("seksi tanpa subteks tidak menampilkan isiannya");

  await bukaForm("Home", "Hero halaman depan");
  if (!(await jalan(`__adaIsian("Subteks")`))) {
    throw new Error("form Hero tidak menampilkan isian Subteks");
  }

  /* Judul semula dicatat DARI FORM, bukan dari content.json: sebelum Publish
     pertama, berkas itu belum punya bagian judul seksi sama sekali. */
  const semula = await jalan(`__baca("Judul")`);
  const semulaSub = await jalan(`__baca("Subteks")`);
  if (!semula.includes("\n")) {
    throw new Error(`judul hero semula bukan dua baris: ${JSON.stringify(semula)}`);
  }
  lapor(`form memuat judul yang sedang dipakai (${JSON.stringify(semula)})`);
  await potret("3-form");

  /* Dinyalakan tepat sebelum simpan pertama: mengembalikan baris yang belum
     tersentuh cuma menaikkan updatedAt dan menyalakan badge tanpa sebab. */
  let kotor = false;

  const pulihkan = async () => {
    await kePanel();
    await simpanHero(semula, semulaSub);
    await publish();
    const akhir = await heroTayang();
    if (akhir !== semula) {
      throw new Error(
        `gagal mengembalikan judul semula:\n  ${JSON.stringify(akhir)}\n  ${JSON.stringify(semula)}`,
      );
    }
    kotor = false;
    lapor("judul & subteks semula dikembalikan, halaman depan kembali seperti sebelum probe");
  };

  bersihkan = async () => {
    if (kotor) await pulihkan();
  };

  /* 5 — judul kosong ditolak, dan baris yang tayang tidak ikut rusak. */
  await jalan(`__isi("Judul", "   ")`);
  await jalan(`document.querySelector("main form").requestSubmit()`);
  await tunggu(`__teks().includes("belum benar")`, "galat judul kosong");
  lapor("judul kosong ditolak di form");

  /* 6 — simpan judul dua baris → badge menyala → content.json belum berubah */
  kotor = true;
  await simpanHero(JUDUL_BARU);
  await tunggu(`__teks().includes("perubahan belum terpublish")`, "badge belum terpublish");
  lapor("menyimpan judul menyalakan badge 'belum terpublish'");

  const sebelumPublish = await heroTayang();
  if (sebelumPublish !== null && sebelumPublish === JUDUL_BARU) {
    throw new Error("judul baru bocor ke content.json sebelum Publish");
  }
  lapor("sebelum Publish, content.json belum memuat judul baru");

  /* 7 — Review menyebutnya, dengan isian bernama "Judul" */
  await jalan(`__reviewDariBar()`);
  await tunggu(`__layarSiap()`, "layar Review");
  await jalan(BEKAL);
  const iReview = await jalan(`__cariBaris("Judul seksi Home")`);
  if (iReview < 0) {
    throw new Error(`Review tidak menyebut judul seksi:\n${await jalan(`__teks()`)}`);
  }
  await jalan(`__tombolBaris(${iReview}, "Lihat")`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel banding");
  await jalan(BEKAL);
  const banding = await jalan(`__banding()`);
  if (!banding?.Judul) {
    throw new Error(`banding tidak punya baris "Judul": ${JSON.stringify(banding)}`);
  }
  if (!banding.Judul.sesudah.includes("Dua baris")) {
    throw new Error(`banding tidak menunjukkan judul barunya: ${JSON.stringify(banding.Judul)}`);
  }
  lapor("Review menyebut perubahannya dengan isian bernama 'Judul'");
  await potret("4-review");

  /* 8 — Publish → content.json ikut berubah */
  await publish();
  const tayang = await heroTayang();
  if (tayang !== JUDUL_BARU) {
    throw new Error(`content.json tidak memuat judul baru: ${JSON.stringify(tayang)}`);
  }
  lapor("judul baru masuk content.json sesudah Publish");

  /* 9 — halaman depan sungguhan, di 360px.
     Dua hal sekaligus yang cuma bisa dilihat di sini: `\n` benar-benar jadi
     DUA baris, dan tiap KATA masih jadi elemennya sendiri, karena itulah
     koreografi FadeUpItem yang membuat judulnya muncul sepotong-sepotong. */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await tungguLama(`!!document.querySelector("#csi h2")`, "hero di halaman depan");

  /* Muat ulang kalau judulnya masih yang lama. Bukan menutupi kegagalan:
     `loadContent()` menyerah sesudah 1,5 detik dan memakai isi bundle, dan di
     dev server yang baru bangun batas itu memang sering terlewat oleh
     permintaan pertama. Kalau tiga muatan berturut-turut tetap memakai isi
     bundle, barulah itu kegagalan sungguhan, dan langkah di bawah yang
     melaporkannya. */
  const sudahBaru = () =>
    jalan(`document.body.innerText.includes("Dua baris intelligence.")`);
  for (let i = 0; i < 3 && !(await sudahBaru()); i++) {
    await send("Page.reload");
    await tungguLama(`!!document.querySelector("#csi h2")`, "hero sesudah muat ulang");
    await sleep(800);
  }
  await sleep(1200);

  const hero = await jalan(`
    (() => {
      const s = document.querySelector("#csi");
      if (!s) return null;
      const h = s.querySelector("h2");
      const baris = [...h.children].map((sp) => sp.innerText.trim());
      const kata = [...h.querySelectorAll("span > div")];
      const r = h.getBoundingClientRect();
      return {
        baris,
        kata: kata.length,
        buram: kata.filter((k) => +getComputedStyle(k).opacity < 0.99).length,
        lebarJudul: Math.round(r.width),
        lebarLayar: document.documentElement.clientWidth,
        gulir: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()
  `);
  if (!hero) throw new Error("seksi #csi tidak ada di halaman depan");
  if (hero.baris.length !== 2) {
    throw new Error(`judul tidak jadi dua baris: ${JSON.stringify(hero.baris)}`);
  }
  /* Enam kata: "Probe judul seksi." + "Dua baris intelligence." */
  if (hero.kata !== 6) {
    throw new Error(`kata tidak dipecah per FadeUpItem: ${hero.kata} elemen`);
  }
  if (hero.buram > 0) {
    throw new Error(`${hero.buram} kata tidak pernah selesai muncul (opacity < 1)`);
  }
  if (hero.gulir > 0) {
    throw new Error(
      `halaman bisa digeser ke samping ${hero.gulir}px di lebar 360 (judul ${hero.lebarJudul}px)`,
    );
  }
  lapor(
    `halaman depan merender judul CMS: ${hero.baris.length} baris, ${hero.kata} kata, tanpa gulir horizontal di 360px`,
  );
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
  `);
  await sleep(600);
  await potret("5-halaman-depan-360");
  await send("Emulation.clearDeviceMetricsOverride");

  /* 10 — pembatalan lewat Review. Bentuk berkunci-tetap cuma punya satu
     cabang: tulis balik isi yang tayang. Yang dijaga di sini barisnya TIDAK
     ikut hilang, karena seksi tanpa judul adalah seksi berkepala kosong. */
  await simpanHero(JUDUL_KETIGA);
  await jalan(`__reviewDariBar()`);
  await tunggu(`__layarSiap()`, "layar Review (kedua)");
  await jalan(BEKAL);
  const iBatal = await jalan(`__cariBaris("Judul seksi Home")`);
  if (iBatal < 0) throw new Error("Review tidak menyebut suntingan ketiga");
  await jalan(`__tombolBaris(${iBatal}, "Batalkan")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  await jalan(`__yaBatal()`);
  await tunggu(`!document.querySelector("dialog[open]")`, "dialog tertutup");
  await tunggu(`__terpublish()`, "bilah Publish kembali diam");
  lapor("membatalkan lewat Review mematikan bilah Publish");

  await bukaDaftar("Home");
  const sesudahBatal = await jalan(`__barisJudul()`);
  if (sesudahBatal.length !== 4) {
    throw new Error(`baris ikut hilang sesudah dibatalkan: ${sesudahBatal.length} baris`);
  }
  if (!sesudahBatal[0].judul.includes("Dua baris")) {
    throw new Error(
      `pembatalan tidak menulis balik judul yang tayang: ${JSON.stringify(sesudahBatal[0].judul)}`,
    );
  }
  lapor("pembatalan mengembalikan judul yang tayang tanpa menghapus barisnya");
  await potret("6-sesudah-batal");

  /* 11 — Riwayat menyebutnya, dan tombol Buka-nya mendarat di layar yang
     benar. Empat nama entitas ada justru supaya tautan ini punya empat
     tujuan berbeda; salah petakan berarti tautannya membuka halaman lain. */
  await kePanel();
  await jalan(`__klik("Riwayat")`);
  await tunggu(`__layarSiap()`, "layar Riwayat");
  await jalan(BEKAL);
  const iRiwayat = await jalan(`__cariBaris("Judul seksi Home")`);
  if (iRiwayat < 0) {
    throw new Error(`Riwayat tidak menyebut judul seksi:\n${await jalan(`__teks()`)}`);
  }
  await jalan(`__tombolBaris(${iRiwayat}, "Lihat")`);
  await tunggu(`!!document.querySelector("table.banding")`, "banding di Riwayat");
  await jalan(BEKAL);
  const bandingRiwayat = await jalan(`__banding()`);
  if (!bandingRiwayat?.Judul) {
    throw new Error(`Riwayat tidak menamai isiannya "Judul": ${JSON.stringify(bandingRiwayat)}`);
  }
  lapor("Riwayat menyebut perubahannya dengan isian bernama 'Judul'");
  await potret("7-riwayat");

  /* 12 — alamat yang tidak punya layar. `judul-home` berstatus siap, jadi
     `/admin/judul-home/baru` lolos penjaga rute; tanpa `tanpaTambah()` ia
     jatuh ke rantai form dan membuka form LOWONGAN di alamat judul seksi. */
  await send("Page.navigate", {
    url: "http://localhost:5174/admin/judul-home/baru",
  });
  await sleep(700);
  await tunggu(`!!document.querySelector(".sisi")`, "panel sesudah alamat liar");
  await jalan(BEKAL);
  const judulLayar = await jalan(`__judulLayar()`);
  if (/lowongan/i.test(judulLayar) || (await jalan(`__adaIsian("Tipe")`))) {
    throw new Error(`/admin/judul-home/baru membuka layar lain: "${judulLayar}"`);
  }
  if (!(await jalan(`!!document.querySelector("main tbody tr")`))) {
    throw new Error(`/admin/judul-home/baru tidak jatuh ke daftarnya: "${judulLayar}"`);
  }
  lapor("/admin/judul-home/baru jatuh ke daftar judul seksi, bukan form lowongan");

  /* 13 — kembalikan judul semula lewat panel, seperti editor sungguhan. */
  await pulihkan();

  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/judul-*.png");
  ws.close();
}

main()
  .catch(async (e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
    try {
      await bersihkan?.();
    } catch (lagi) {
      console.error(
        `⚠ judul seksi TERTINGGAL di panel dan halaman depan, kembalikan manual: ${lagi.message}`,
      );
    }
  })
  .finally(async () => {
    await sapuAudit(tanda);
    brave.kill();
  });

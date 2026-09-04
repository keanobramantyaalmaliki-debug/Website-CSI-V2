/**
 * Jalan-jalan lengkap panel admin lewat CDP — login sampai lowongan tayang.
 *
 *   node scripts/probe-admin.mjs
 *
 * Ini bukan test unit: yang diuji justru hal yang tidak pernah dilihat unit
 * test — apakah React-nya benar-benar merender tanpa lempar, apakah cookie
 * sesi ikut lewat proxy Vite, dan apakah menekan Publish betul-betul mengubah
 * `dist/content.json` yang dibaca situs. Prasyaratnya tiga proses hidup:
 * API :3001, situs :3000, admin :5174.
 *
 * Brave, bukan Chrome — sama seperti seluruh skrip verifikasi di folder ini.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9231;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const JUDUL = "Probe Engineer";

/* Profil dibuang tiap kali: cookie sesi yang tertinggal dari jalan-jalan
   sebelumnya membuat langkah "masuk" terlewat, dan justru langkah itu yang
   paling sering rusak. */
rmSync("/tmp/csi-admin-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-admin-probe",
    "--window-size=1280,1600",
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

/* Dijalankan DI DALAM halaman. Mengisi input React lewat `.value = x` saja
   tidak cukup: React memasang setter sendiri di prototipe, jadi nilainya
   berubah di DOM tapi state-nya tidak ikut. Jalannya harus lewat setter asli
   plus event `input` — persis seperti orang mengetik. */
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
  window.__radio = (teks) => {
    const l = [...document.querySelectorAll(".pilihan label")]
      .find((x) => x.textContent.trim().startsWith(teks));
    if (!l) throw new Error("pilihan tidak ada: " + teks);
    l.click();
  };
  window.__teks = () => document.body.innerText;
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
    writeFileSync(`/tmp/admin-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 40; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await potret("1-masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  lapor("masuk sebagai editor, menu sisi muncul");
  await jalan(BEKAL);
  await potret("2-beranda");

  /* 1b — menu menaruh lowongan di halaman yang benar.
     Yang diuji bukan CSS-nya melainkan janji menunya: kalau di situs lowongan
     ada di halaman People, di panel juga. Peta yang menyimpang bikin editor
     mencari di grup yang salah, dan tidak ada yang meneriakkannya. */
  const anakPeople = await jalan(`__anak("People").join(" | ")`);
  if (!anakPeople.includes("Lowongan")) {
    throw new Error(`Lowongan tidak ada di dalam grup People: ${anakPeople}`);
  }
  lapor("menu sisi menaruh Lowongan di dalam People");

  /* 1c — grup dibuka/ditutup, dan hanya satu terbuka pada satu waktu.
     Diuji lewat perilakunya, bukan lewat kelas CSS: yang dijanjikan ke Keano
     adalah "diklik → turunannya muncul", dan itu yang diperiksa. */
  const homeSebelum = await jalan(`__anak("Home").length`);
  if (homeSebelum !== 0) throw new Error("grup Home sudah terbuka sebelum diklik");
  await jalan(`__bukaGrup("Home")`);
  const homeSesudah = await jalan(`__anak("Home").join(" | ")`);
  if (!homeSesudah.includes("Industri")) {
    throw new Error(`grup Home tidak memunculkan turunannya: ${homeSesudah}`);
  }
  if ((await jalan(`__anak("People").length`)) !== 0) {
    throw new Error("dua grup terbuka sekaligus — People tidak ikut menutup");
  }
  lapor("grup diklik → turunannya muncul, grup sebelumnya menutup");

  /* 1d — konten yang belum bisa diubah tetap terdaftar, dengan penandanya.
     Disembunyikan = editor mencari sesuatu yang memang belum ada. */
  await jalan(`__bukaGrup("People")`);
  const jumlahBelum = await jalan(
    `[...document.querySelectorAll(".sisi-item.mati")]
       .filter((el) => el.textContent.includes("Belum tersedia")).length`,
  );
  if (jumlahBelum < 1) throw new Error("tidak ada penanda 'Belum tersedia' di menu sisi");
  lapor(`menu sisi mendaftar ${jumlahBelum} konten yang belum bisa diubah (grup People)`);

  /* 1e — tombol lipat yang menumpang di garis pemisah.
     Diperiksa karena satu-satunya jalan kembali dari keadaan terlipat adalah
     tombol itu sendiri: kalau ia ikut hilang saat menu disembunyikan, editor
     terkunci tanpa menu sampai halaman dimuat ulang. */
  await jalan(`document.querySelector(".sisi-lipat").click()`);
  await potret("2b-menu-terlipat");
  if (await jalan(`!!document.querySelector(".sisi-daftar")`)) {
    throw new Error("menu tidak ikut tersembunyi saat tombol lipat ditekan");
  }
  if (!(await jalan(`!!document.querySelector(".sisi-lipat")`))) {
    throw new Error("tombol lipat ikut hilang — tidak ada jalan kembali");
  }
  await jalan(`document.querySelector(".sisi-lipat").click()`);
  await tunggu(`!!document.querySelector(".sisi-daftar")`, "menu kembali");
  lapor("tombol di garis pemisah melipat menu dan membukanya lagi");

  /* 1f — turun ke lowongan lewat menunya, seperti editor sungguhan. */
  await jalan(`__klikAnak("People", "Lowongan")`);
  await tunggu(`!!document.querySelector("table")`, "daftar lowongan");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Lowongan") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar lowongan dan menandai posisinya");

  await potret("3-daftar");

  /* Sisa jalan-jalan yang gagal di tengah akan menempati slug yang sama.
     Dibersihkan lewat panel, bukan lewat SQL — sekalian membuktikan tombol
     hapusnya bekerja pada baris apa pun, bukan hanya yang baru dibuat. */
  while (
    await jalan(
      `[...document.querySelectorAll("tbody tr")].some((r) =>
         r.innerText.includes(${JSON.stringify(JUDUL)}))`,
    )
  ) {
    await jalan(
      `[...document.querySelectorAll("tbody tr")]
         .find((r) => r.innerText.includes(${JSON.stringify(JUDUL)}))
         .querySelectorAll("button")[1].click()`,
    );
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi (bersih-bersih)");
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(
      `![...document.querySelectorAll("tbody tr")].some((r) =>
         r.innerText.includes(${JSON.stringify(JUDUL)}))`,
      "sisa terhapus",
    );
    await jalan(BEKAL);
  }

  const sebelum = await jalan(`document.querySelectorAll("tbody tr").length`);

  /* 2 — buat draf */
  await jalan(`__klik("+ Tambah lowongan")`);
  await tunggu(`!!document.querySelector('textarea')`, "form lowongan");
  await jalan(BEKAL);

  /* Jalan pulang dari form, diperiksa sebelum isiannya diisi. "Batal" di kaki
     form sudah melakukan hal yang sama, tapi ia berada di ujung halaman yang
     panjang; tombol di kepala inilah yang membuat lowongan yang terlanjur
     dibuka bisa ditutup tanpa menggulir sampai habis dulu. */
  await jalan(`__klik("\u2039 Semua lowongan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar lowongan");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah lowongan")`);
  await tunggu(`!!document.querySelector('textarea')`, "form lowongan (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Judul lowongan", ${JSON.stringify(JUDUL)})`);
  await jalan(`__isi("Departemen", "Engineering")`);
  await jalan(`__isi("Ringkasan", "Lowongan uji coba dari probe-admin.mjs.")`);
  await jalan(`__isi("Keahlian", "Probing")`);
  await potret("4-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`document.querySelectorAll("tbody tr").length`);
  if (sesudah !== sebelum + 1) throw new Error(`baris ${sebelum} → ${sesudah}, harusnya +1`);
  const adaDraf = await jalan(
    `[...document.querySelectorAll("tbody tr")].some((r) =>
       r.innerText.includes(${JSON.stringify(JUDUL)}) && r.innerText.includes("Draft"))`,
  );
  if (!adaDraf) throw new Error("baris draf tidak ditemukan di tabel");
  lapor("lowongan draf tersimpan dan tampil di daftar");
  await potret("5-draf");

  /* 3 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  const isiDraf = await (await fetch("http://localhost:3000/content.json")).json();
  if (isiDraf.jobs.some((j) => j.title === JUDUL)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 4 — ubah jadi Open lalu publish */
  await jalan(BEKAL);
  await jalan(
    `[...document.querySelectorAll("tbody tr")]
       .find((r) => r.innerText.includes(${JSON.stringify(JUDUL)}))
       .querySelector("button").click()`,
  );
  await tunggu(`!!document.querySelector('textarea')`, "form lowongan (ubah)");
  await jalan(BEKAL);
  await jalan(`__radio("Open")`);

  /* Sengaja menekan Simpan SEBELUM memilih foto: lowongan tayang wajib
     berfoto, dan yang diperiksa di sini bukan aturannya (itu urusan unit test
     `shared/`) melainkan apakah penolakannya benar-benar sampai ke layar
     alih-alih hilang diam-diam. */
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Foto belum dipilih")`, "galat foto muncul");
  lapor("status Open tanpa foto ditolak, alasannya tampil di form");

  await jalan(`document.querySelector(".foto").click()`);
  await jalan(BEKAL);
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum terpublish")`, "angka belum terpublish");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const isiTayang = await (await fetch("http://localhost:3000/content.json")).json();
  const terbit = isiTayang.jobs.find((j) => j.title === JUDUL);
  if (!terbit) throw new Error("lowongan tayang tidak ada di content.json");
  if (terbit.skills[0] !== "Probing") throw new Error("skill tidak ikut terbawa");
  lapor(`lowongan tayang masuk content.json (slug: ${terbit.slug})`);
  await potret("6-tayang");

  /* 5 — hapus, publish, hilang */
  await jalan(
    `[...document.querySelectorAll("tbody tr")]
       .find((r) => r.innerText.includes(${JSON.stringify(JUDUL)}))
       .querySelectorAll("button")[1].click()`,
  );
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(JUDUL)) throw new Error("dialog tidak menyebut judulnya");
  await potret("7-konfirmasi");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(
    `![...document.querySelectorAll("tbody tr")].some((r) =>
       r.innerText.includes(${JSON.stringify(JUDUL)}))`,
    "baris hilang dari daftar",
  );
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  const isiAkhir = await (await fetch("http://localhost:3000/content.json")).json();
  if (isiAkhir.jobs.some((j) => j.title === JUDUL)) {
    throw new Error("lowongan terhapus masih ada di content.json");
  }
  lapor("dihapus + Publish → hilang dari content.json");

  if (galatKonsol.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of galatKonsol) console.log("  " + g);
  } else {
    lapor("tidak ada galat di konsol sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/admin-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

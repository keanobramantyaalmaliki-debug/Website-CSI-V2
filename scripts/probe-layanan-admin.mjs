/**
 * Jalan-jalan panel admin untuk LAYANAN — login sampai halaman Services
 * yang sungguhan ikut berubah.
 *
 *   node scripts/probe-layanan-admin.mjs
 *
 * Saudara kembar `probe-nilai-admin.mjs`. Dua hal yang tidak ada di sana:
 *
 *  1. RINCIAN. Isian ketiga di form ini bukan kotak teks tunggal melainkan
 *     daftar yang bisa ditambah dan diurutkan sendiri. Yang diuji bukan
 *     "tersimpan", melainkan "tersimpan DALAM URUTAN YANG DIKETIK" — server
 *     menulisnya dengan hapus-lalu-sisip ke tabel anak, dan tabel anak tanpa
 *     kolom urutan akan pulang dalam urutan sesuka Postgres.
 *
 *  2. Langkah terakhir memeriksa daftar `sr-only`, BUKAN teks yang terlihat.
 *     Sabuk 3D di halaman Services itu `aria-hidden` dan teksnya troika —
 *     tidak ada di DOM, tidak terindeks, tidak terbaca pembaca layar. Yang
 *     ada di DOM cuma daftar tersembunyi di bawahnya, dan daftar itulah
 *     satu-satunya bentuk halaman Services yang sampai ke mesin pencari.
 *     Memeriksa `body.innerText` di sini akan lulus untuk alasan yang salah.
 *
 * Prasyarat tiga proses hidup: API :3001, situs :3000, admin :5174.
 * Brave, bukan Chrome — sama seperti seluruh skrip verifikasi di folder ini.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9233;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const JUDUL = "Probe Layanan";
const JELAS = "Layanan uji coba dari probe-layanan-admin.mjs.";
/* Sengaja TIDAK urut abjad: kalau server memulangkannya urut abjad — atau
   urut apa pun selain urutan ketik — perbedaannya langsung kelihatan. */
const RINCIAN = ["Zebra Crossing", "Alpha Channel", "Mid Journey"];

rmSync("/tmp/csi-layanan-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-layanan-probe",
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

/* Sama persis dengan bekal di `probe-nilai-admin.mjs`, plus tiga fungsi
   khusus daftar Rincian. */
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

  /** Judul tiap baris, urut seperti di layar. */
  window.__judul = () =>
    [...document.querySelectorAll("tbody tr")].map((r) =>
      r.querySelector("strong")?.textContent.trim() ?? "",
    );
  window.__baris = (judul) => {
    const r = [...document.querySelectorAll("tbody tr")].find(
      (x) => x.querySelector("strong")?.textContent.trim() === judul,
    );
    if (!r) throw new Error("baris tidak ada: " + judul);
    return r;
  };
  /** Tombol di dalam satu baris, dicari lewat teksnya — bukan lewat urutan
      anak. Indeks akan diam-diam menunjuk tombol lain begitu ada tombol baru
      disisipkan, dan probe-nya tetap "lulus" sambil menguji hal lain. */
  window.__aksi = (judul, teks) => {
    const b = [...__baris(judul).querySelectorAll("button")].find(
      (x) => x.textContent.trim() === teks,
    );
    if (!b) throw new Error("tombol " + teks + " tidak ada di baris " + judul);
    if (b.disabled) throw new Error("tombol " + teks + " mati di baris " + judul);
    b.click();
  };

  /* ── daftar Rincian (komponen DaftarTeks) ────────────────────────────────
     Dicari lewat blok .isian yang label-nya "Rincian", bukan lewat urutan
     isian di form: begitu ada isian baru disisipkan di atasnya, pencarian
     berbasis urutan akan diam-diam mengisi kotak lain. */
  window.__blokRincian = () => {
    const lab = [...document.querySelectorAll(".isian > label")].find(
      (l) => l.textContent.trim() === "Rincian",
    );
    if (!lab) throw new Error("blok Rincian tidak ada di form");
    return lab.parentElement;
  };
  window.__tambahRincian = () => {
    const b = [...__blokRincian().querySelectorAll("button")].find(
      (x) => x.textContent.trim() === "+ Tambah",
    );
    if (!b) throw new Error("tombol + Tambah rincian tidak ada");
    b.click();
  };
  window.__isiRincian = (i, nilai) => {
    const el = __blokRincian().querySelectorAll(".baris input")[i];
    if (!el) throw new Error("baris rincian ke-" + i + " tidak ada");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      .set.call(el, nilai);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  window.__nilaiRincian = () =>
    [...__blokRincian().querySelectorAll(".baris input")].map((x) => x.value);
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
    writeFileSync(`/tmp/layanan-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 40; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);
  const konten = async () =>
    (await fetch("http://localhost:3000/content.json")).json();
  const judulTayang = async () =>
    (await konten()).services.map((s) => s.title);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — beranda menyebut layanan sebelum halamannya dibuka.
     Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
     `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
     lahir kosong dan berubah sendiri belakangan. */
  const beranda = await jalan(`__teks()`);
  if (!/\d+ layanan/.test(beranda)) {
    throw new Error(`beranda tidak menyebut jumlah layanan:\n${beranda}`);
  }
  lapor("beranda menyebut jumlah layanan tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — turun ke Layanan lewat menu, seperti editor sungguhan.
     Grup dibuka hanya kalau memang masih tertutup: menekan judul grup itu
     tombol buka-tutup, jadi menekannya membabi buta justru menutup grup yang
     sudah terbuka — dan probe-nya gagal dengan pesan yang menuduh hal lain. */
  if ((await jalan(`__anak("Services").length`)) === 0) {
    await jalan(`__bukaGrup("Services")`);
    await tunggu(`__anak("Services").length > 0`, "grup Services terbuka");
  }
  const anakServices = await jalan(`__anak("Services").join(" | ")`);
  if (!anakServices.includes("Layanan")) {
    throw new Error(`Layanan tidak ada di dalam grup Services: ${anakServices}`);
  }
  await jalan(`__klikAnak("Services", "Layanan")`);
  await tunggu(`!!document.querySelector("table")`, "daftar layanan");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Layanan") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar layanan dan menandai posisinya");
  await potret("2-daftar");

  /* Sisa jalan-jalan yang gagal di tengah dibersihkan lewat panel. */
  while (await jalan(`__judul().includes(${JSON.stringify(JUDUL)})`)) {
    await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Hapus")`);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog (bersih-bersih)");
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(`!__judul().includes(${JSON.stringify(JUDUL)})`, "sisa terhapus");
    await jalan(BEKAL);
  }

  const semula = await jalan(`__judul()`);
  if (semula.length < 2) {
    throw new Error(
      `butuh minimal 2 layanan untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
    );
  }

  /* 4 — buat draf, dengan judul saja: draf memang tidak wajib berpenjelasan,
     dan itulah yang membuat langkah 6 punya sesuatu untuk ditolak. */
  await jalan(`__klik("+ Tambah layanan")`);
  await tunggu(`!!document.querySelector("textarea")`, "form layanan");
  await jalan(BEKAL);

  /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
  await jalan(`__klik("‹ Semua layanan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar layanan");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah layanan")`);
  await tunggu(`!!document.querySelector("textarea")`, "form layanan (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Nama layanan", ${JSON.stringify(JUDUL)})`);
  await potret("3-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`__judul()`);
  if (sesudah.length !== semula.length + 1) {
    throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
  }
  /* Layanan baru mendarat di BAWAH — urutan di sini adalah urutan judul di
     sabuk, dan yang baru menyusul di belakang yang sudah ada. */
  if (sesudah[sesudah.length - 1] !== JUDUL) {
    throw new Error(`layanan baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
  }
  lapor("layanan draf tersimpan tanpa penjelasan, mendarat di baris paling bawah");
  await potret("4-draf");

  /* 5 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 6 — jadikan Live: ditolak dulu karena penjelasannya masih kosong.
     Inilah aturan yang paling gampang terasa berlebihan dari dalam form —
     tidak ada yang berubah di layar kalau penjelasannya kosong — dan justru
     karena itu ia diuji: tanpa penjelasan, layanan ini tayang ke pembaca
     layar sebagai "Probe Layanan:" lalu berhenti. */
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Ubah")`);
  await tunggu(`!!document.querySelector("textarea")`, "form layanan (ubah)");
  await jalan(BEKAL);
  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Penjelasan belum diisi")`, "galat penjelasan muncul");
  lapor("status Live tanpa penjelasan ditolak, alasannya tampil di form");
  await potret("5-galat-penjelasan");

  /* 7 — isi penjelasan + rincian. Rincian ditambah satu-satu karena
     tombolnya memang begitu; tiap penambahan ditunggu sampai kotaknya benar
     lahir, bukan diasumsikan langsung ada — React merender ulang setelah
     klik, tidak di dalam klik. */
  await jalan(`__isi("Penjelasan", ${JSON.stringify(JELAS)})`);
  for (let i = 0; i < RINCIAN.length; i++) {
    await jalan(`__tambahRincian()`);
    await tunggu(`__nilaiRincian().length === ${i + 1}`, `kotak rincian ke-${i + 1}`);
    await jalan(`__isiRincian(${i}, ${JSON.stringify(RINCIAN[i])})`);
  }
  const diketik = await jalan(`__nilaiRincian()`);
  if (diketik.join("|") !== RINCIAN.join("|")) {
    throw new Error(`rincian di form sudah salah sebelum disimpan: ${diketik.join(" | ")}`);
  }
  await potret("6-rincian");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const jumlahRincian = await jalan(
    `__baris(${JSON.stringify(JUDUL)}).children[3].textContent.trim()`,
  );
  if (jumlahRincian !== String(RINCIAN.length)) {
    throw new Error(`kolom Rincian di tabel menyebut "${jumlahRincian}", harusnya ${RINCIAN.length}`);
  }
  lapor(`tabel menghitung ${RINCIAN.length} rincian di baris layanannya`);

  await tunggu(`__teks().includes("perubahan belum terpublish")`, "angka belum terpublish");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const tayang = await konten();
  const terbit = tayang.services.find((s) => s.title === JUDUL);
  if (!terbit) throw new Error("layanan tayang tidak ada di content.json");
  if (terbit.desc !== JELAS) throw new Error("penjelasan tidak ikut terbawa");
  /* Urutan rincian, bukan sekadar isinya: tabel anaknya ditulis
     hapus-lalu-sisip, dan tanpa kolom urutan Postgres bebas memulangkannya
     dalam urutan apa pun — yang terdengar sebagai kalimat berbeda di telinga
     pemakai pembaca layar, tanpa satu pun galat. */
  if (terbit.subs.join("|") !== RINCIAN.join("|")) {
    throw new Error(
      `urutan rincian berubah di perjalanan: ${terbit.subs.join(" | ")} (diketik: ${RINCIAN.join(" | ")})`,
    );
  }
  lapor("layanan tayang masuk content.json, rincian utuh dan urut seperti diketik");
  await potret("7-tayang");

  /* 8 — URUTAN. Tombol yang tidak punya kotak teks, jadi tidak ada unit test
     yang bisa membuktikannya. */
  const sebelumUrut = await judulTayang();
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Naikkan")`);
  await tunggu(
    `__judul().indexOf(${JSON.stringify(JUDUL)}) === __judul().length - 2`,
    "baris naik satu tingkat",
  );
  await jalan(BEKAL);
  lapor("Naikkan menukar baris dengan tetangganya di layar");

  /* Menaikkan baris adalah perubahan yang menunggu Publish, sama seperti
     menyunting isinya — kalau badge-nya diam, editor menutup panel dengan
     yakin urutan barunya sudah tayang padahal belum. */
  await tunggu(`__teks().includes("perubahan belum terpublish")`, "badge menyala setelah pindah");
  lapor("memindahkan baris menyalakan badge 'belum terpublish'");

  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  const sesudahUrut = await judulTayang();
  const posisiLama = sebelumUrut.indexOf(JUDUL);
  const posisiBaru = sesudahUrut.indexOf(JUDUL);
  if (posisiBaru !== posisiLama - 1) {
    throw new Error(
      `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
    );
  }
  lapor(`urutan sabuk ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);

  /* 9 — halaman Services yang sungguhan membacanya.
     Yang diperiksa daftar `sr-only`, BUKAN teks yang terlihat: judul di sabuk
     dirender troika di dalam canvas, jadi ia tidak pernah ada di DOM sama
     sekali. `body.innerText` yang menyebut JUDUL justru akan menandakan
     sesuatu yang lain sedang terjadi. */
  await send("Page.navigate", { url: "http://localhost:3000/services" });
  await tunggu(
    `[...document.querySelectorAll("ul.sr-only li")].some(
       (li) => li.textContent.startsWith(${JSON.stringify(JUDUL)}))`,
    "layanan di daftar sr-only halaman Services",
  );
  const baris = await jalan(`
    [...document.querySelectorAll("ul.sr-only li")]
      .find((li) => li.textContent.startsWith(${JSON.stringify(JUDUL)}))
      .textContent
  `);
  if (!baris.includes(JELAS)) {
    throw new Error(`penjelasan tidak ikut terender di halaman Services: ${baris}`);
  }
  if (!baris.includes(RINCIAN.join(", "))) {
    throw new Error(`rincian tidak ikut terender di halaman Services: ${baris}`);
  }
  lapor(`daftar sr-only halaman Services membacanya dari CMS: "${baris}"`);

  /* Urutan sr-only = urutan content.json. Inilah yang dibaca pembaca layar
     dari atas ke bawah; kalau ia melenceng dari yang diatur editor, tidak ada
     satu pun yang terlihat salah di layar. */
  const urutSrOnly = await jalan(`
    [...document.querySelectorAll("ul.sr-only li")].map(
      (li) => li.textContent.split(":")[0].trim())
  `);
  if (urutSrOnly.join("|") !== sesudahUrut.join("|")) {
    throw new Error(
      `urutan sr-only ≠ urutan content.json:\n  layar : ${urutSrOnly.join(" | ")}\n  berkas: ${sesudahUrut.join(" | ")}`,
    );
  }
  lapor("urutan daftar sr-only sama persis dengan urutan di content.json");

  /* Panel putihnya sendiri harus ikut ada dan punya ukuran: `Office.tsx`
     menggerbangi seluruh blok sabuk dengan `daftar.length > 0`, jadi daftar
     yang gagal dibaca akan menghilangkan panelnya diam-diam — sementara
     daftar sr-only di atas tetap ada karena ia ada DI DALAM gerbang yang sama.
     Yang diukur di sini bahwa gerbangnya memang terbuka. */
  const kotak = await jalan(`
    (() => {
      const p = document.querySelector('#services div[aria-hidden="true"]');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })()
  `);
  if (!kotak || kotak.w < 100 || kotak.h < 100) {
    throw new Error(`panel sabuk layanan tidak punya ukuran: ${JSON.stringify(kotak)}`);
  }
  lapor(`panel sabuk terpasang di halaman Services (${kotak.w}×${kotak.h}px)`);

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia
     baru menyingkir saat scene 3D siap, dan di sini scene itu tidak akan
     pernah siap. Overlay-nya disingkirkan untuk potret ini saja — yang
     dipotret memang bagian di baliknya. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
    document.querySelector("#services")?.scrollIntoView({ block: "center" });
  `);
  await sleep(600);
  await potret("8-services");

  /* 10 — bersihkan: hapus lalu publish, dan halaman Services ikut kehilangan */
  await send("Page.navigate", { url: "http://localhost:5174/admin/" });
  await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
  await jalan(BEKAL);
  if ((await jalan(`__anak("Services").length`)) === 0) {
    await jalan(`__bukaGrup("Services")`);
    await tunggu(`__anak("Services").length > 0`, "grup Services terbuka lagi");
  }
  await jalan(`__klikAnak("Services", "Layanan")`);
  await tunggu(`!!document.querySelector("table")`, "daftar layanan lagi");
  await jalan(BEKAL);

  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Hapus")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(JUDUL)) throw new Error("dialog tidak menyebut nama layanannya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__judul().includes(${JSON.stringify(JUDUL)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("layanan terhapus masih ada di content.json");
  }
  const akhir = await judulTayang();
  lapor(`dihapus + Publish → hilang dari content.json (sisa ${akhir.length}: ${akhir.join(", ")})`);

  /* Galat konsol dari halaman /services tidak dihitung: di headless tanpa
     GPU, scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe
     ini. */
  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/layanan-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

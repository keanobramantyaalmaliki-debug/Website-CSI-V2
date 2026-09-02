/**
 * Jalan-jalan panel admin untuk INDUSTRI — login sampai strip di halaman
 * depan berubah.
 *
 *   node scripts/probe-industri-admin.mjs
 *
 * Saudara `probe-nilai-admin.mjs`, dengan satu langkah yang tidak ada di
 * entitas mana pun sebelumnya: BATAS 13 SEKTOR. Itu satu-satunya aturan di
 * CMS ini yang tidak bisa dijawab dengan melihat satu baris — pemeriksa isian
 * tidak memegang daftarnya, jadi yang menegakkannya server, dan yang
 * memberitahu editor lebih dulu adalah tombol "Tambah sektor" yang mati.
 * Keduanya cuma bisa dibuktikan dengan daftar sungguhan yang memang penuh.
 *
 * Karena daftar seed memang sudah penuh (13 dari 13), probe ini meminjam satu
 * tempat: sektor terakhir diturunkan jadi draf, dipakai, lalu dikembalikan
 * persis seperti semula di langkah terakhir. Kalau probe gagal di tengah,
 * pesan gagalnya menyebut sektor mana yang tertinggal sebagai draf.
 *
 * Langkah 9 membuka halaman "/" yang sungguhan. Sampai titik itu yang terbukti
 * baru "database → berkas"; yang dijanjikan ke Keano adalah "database → strip
 * di layar", dan bagian terakhirnya cuma bisa dilihat di halaman aslinya.
 * Yang diperiksa di sana daftar `sr-only`-nya, bukan planknya: plank hidup di
 * WebGL, dan headless tanpa GPU tidak pernah menggambarnya.
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
const NAMA = "Probe Sector";
const KALIMAT = "Sektor uji coba dari probe-industri-admin.mjs.";
/** Batas yang sama dengan `MAX_LIVE_INDUSTRIES` di `shared/industry.ts`.
 *  Ditulis ulang di sini karena skrip ini Node polos tanpa bundler — dan
 *  dibandingkan dengan angka yang ditampilkan panel, jadi kalau keduanya
 *  melenceng probe-nya yang berteriak. */
const BATAS = 13;

rmSync("/tmp/csi-industri-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-industri-probe",
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

/* Sama dengan bekal `probe-nilai-admin.mjs`, plus `__mati` — di panel ini
   tombol yang MATI adalah salah satu hal yang diuji, dan `__aksi` sengaja
   melempar begitu menemukan tombol mati. */
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
  window.__tombol = (teks) =>
    [...document.querySelectorAll("button, summary")]
      .find((x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks));
  window.__klik = (teks) => {
    const b = __tombol(teks);
    if (!b) throw new Error("tombol tidak ada: " + teks);
    b.click();
  };
  window.__mati = (teks) => {
    const b = __tombol(teks);
    if (!b) throw new Error("tombol tidak ada: " + teks);
    return b.disabled === true;
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

  /** Nama tiap baris, urut seperti di layar. */
  window.__judul = () =>
    [...document.querySelectorAll("tbody tr")].map((r) =>
      r.querySelector("strong")?.textContent.trim() ?? "",
    );
  /** Nama sektor yang barisnya berstatus Live, urut seperti di layar. */
  window.__hidup = () =>
    [...document.querySelectorAll("tbody tr")]
      .filter((r) => [...r.querySelectorAll(".penanda")].some((p) => p.textContent.trim() === "Live"))
      .map((r) => r.querySelector("strong")?.textContent.trim() ?? "");
  window.__baris = (nama) => {
    const r = [...document.querySelectorAll("tbody tr")].find(
      (x) => x.querySelector("strong")?.textContent.trim() === nama,
    );
    if (!r) throw new Error("baris tidak ada: " + nama);
    return r;
  };
  /** Nomor yang tercetak di kolom pertama satu baris — yang sama dengan nomor
      yang dilihat pengunjung di plank-nya. */
  window.__nomor = (nama) => __baris(nama).querySelector("td").textContent.trim();
  /** Tombol di dalam satu baris, dicari lewat teksnya — bukan lewat urutan
      anak. Indeks akan diam-diam menunjuk tombol lain begitu ada tombol baru
      disisipkan, dan probe-nya tetap "lulus" sambil menguji hal lain. */
  window.__aksi = (nama, teks) => {
    const b = [...__baris(nama).querySelectorAll("button")].find(
      (x) => x.textContent.trim() === teks,
    );
    if (!b) throw new Error("tombol " + teks + " tidak ada di baris " + nama);
    if (b.disabled) throw new Error("tombol " + teks + " mati di baris " + nama);
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
    writeFileSync(`/tmp/industri-${nama}.png`, Buffer.from(data, "base64"));
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
  const namaTayang = async () => (await konten()).industries.map((i) => i.name);

  /** Buka daftar Industri lewat menu sisi, dari mana pun posisinya. */
  const bukaDaftar = async () => {
    if ((await jalan(`__anak("Home").length`)) === 0) {
      await jalan(`__bukaGrup("Home")`);
      await tunggu(`__anak("Home").length > 0`, "grup Home terbuka");
    }
    await jalan(`__klikAnak("Home", "Industri")`);
    await tunggu(`!!document.querySelector("table")`, "daftar industri");
    await jalan(BEKAL);
  };

  /** Ganti status satu sektor lewat form, lalu kembali ke daftar. */
  const ubahStatus = async (nama, status) => {
    await jalan(`__aksi(${JSON.stringify(nama)}, "Ubah")`);
    await tunggu(`!!document.querySelector("textarea")`, `form ${nama}`);
    await jalan(BEKAL);
    await jalan(`__radio(${JSON.stringify(status)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);
  };

  /* Sektor yang tempatnya dipinjam probe. Disimpan di luar `try` supaya pesan
     gagal bisa menyebutkan namanya. */
  let dipinjam = null;

  try {
    await sleep(2500);
    await jalan(BEKAL);

    /* 1 — masuk */
    await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
    await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
    await jalan(`document.querySelector("form").requestSubmit()`);
    await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
    await jalan(BEKAL);
    lapor("masuk sebagai editor");

    /* 2 — beranda menyebut sektor sebelum halamannya dibuka.
       Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
       `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
       lahir kosong dan berubah sendiri belakangan. */
    const beranda = await jalan(`__teks()`);
    if (!/\d+ sektor/.test(beranda)) {
      throw new Error(`beranda tidak menyebut jumlah sektor:\n${beranda}`);
    }
    lapor("beranda menyebut jumlah sektor tanpa halamannya dibuka");
    await potret("1-beranda");

    /* 3 — turun ke Industri lewat menu, seperti editor sungguhan. */
    await bukaDaftar();
    const anakHome = await jalan(`__anak("Home").join(" | ")`);
    if (!anakHome.includes("Industri")) {
      throw new Error(`Industri tidak ada di dalam grup Home: ${anakHome}`);
    }
    const tandaAktif = await jalan(
      `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
    );
    if (tandaAktif !== "Industri") {
      throw new Error(
        `menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`,
      );
    }
    lapor("menu sisi membuka daftar industri dan menandai posisinya");
    await potret("2-daftar");

    /* Sisa jalan-jalan yang gagal di tengah dibersihkan lewat panel. */
    while (await jalan(`__judul().includes(${JSON.stringify(NAMA)})`)) {
      await jalan(`__aksi(${JSON.stringify(NAMA)}, "Hapus")`);
      await tunggu(`!!document.querySelector("dialog[open]")`, "dialog (bersih-bersih)");
      await jalan(BEKAL);
      await jalan(`__klik("Ya, hapus")`);
      await tunggu(`!__judul().includes(${JSON.stringify(NAMA)})`, "sisa terhapus");
      await jalan(BEKAL);
    }

    const semula = await jalan(`__judul()`);
    const hidupSemula = await jalan(`__hidup()`);
    if (semula.length < 2) {
      throw new Error(
        `butuh minimal 2 sektor untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
      );
    }

    /* 4 — BATAS. Yang membedakan entitas ini dari semua yang lain.
       Diperiksa dari dua sisi: tombolnya mati saat penuh, dan kalimat di
       atas tabel menyebut angka yang sama dengan yang dipakai server. */
    const isiHalaman = await jalan(`__teks()`);
    if (!isiHalaman.includes(`maksimal ${BATAS}`)) {
      throw new Error(
        `panel tidak menyebut batas ${BATAS} sektor — angka panel dan angka server melenceng`,
      );
    }
    const penuh = hidupSemula.length >= BATAS;
    const tombolMati = await jalan(`__mati("+ Tambah sektor")`);
    if (penuh !== tombolMati) {
      throw new Error(
        `tombol Tambah ${tombolMati ? "mati" : "hidup"} padahal sektor tayang ${hidupSemula.length}/${BATAS}`,
      );
    }
    lapor(
      penuh
        ? `daftar penuh (${hidupSemula.length}/${BATAS}) dan tombol Tambah ikut mati`
        : `daftar belum penuh (${hidupSemula.length}/${BATAS}) dan tombol Tambah hidup`,
    );
    await potret("3-batas");

    /* 5 — pinjam satu tempat kalau memang penuh. Sektor terakhir yang tayang
       diturunkan jadi draf; dikembalikan di langkah 11. */
    if (penuh) {
      dipinjam = hidupSemula[hidupSemula.length - 1];
      await ubahStatus(dipinjam, "Draft");
      if (await jalan(`__mati("+ Tambah sektor")`)) {
        throw new Error(
          "tombol Tambah tetap mati padahal satu sektor sudah diturunkan jadi draf",
        );
      }
      lapor(`satu tempat dipinjam dari "${dipinjam}" — tombol Tambah hidup lagi`);
    }

    /* 6 — buat sektor baru */
    await jalan(`__klik("+ Tambah sektor")`);
    await tunggu(`!!document.querySelector("textarea")`, "form sektor");
    await jalan(BEKAL);

    /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
    await jalan(`__klik("‹ Semua sektor")`);
    await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
    lapor("tombol kembali di kepala form mengantar ke daftar sektor");
    await jalan(BEKAL);
    await jalan(`__klik("+ Tambah sektor")`);
    await tunggu(`!!document.querySelector("textarea")`, "form sektor (dibuka lagi)");
    await jalan(BEKAL);

    await jalan(`__isi("Nama sektor", ${JSON.stringify(NAMA)})`);
    await jalan(`__isi("Kalimat penjelas", ${JSON.stringify(KALIMAT)})`);
    await potret("4-form");
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);

    const sesudah = await jalan(`__judul()`);
    if (sesudah.length !== semula.length + 1) {
      throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
    }
    /* Sektor baru mendarat di BAWAH: urutan di sini urutan plank sekaligus
       nomornya, jadi sektor baru tidak boleh menggeser nomor sektor lain. */
    if (sesudah[sesudah.length - 1] !== NAMA) {
      throw new Error(`sektor baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
    }
    /* Draf belum bernomor: nomor yang tercetak di situs dihitung dari baris
       yang tayang saja, dan draf tidak menempati plank. Kolom ini pernah
       memakai nomor baris apa adanya, dan satu draf di tengah cukup untuk
       membuat seluruh nomor di bawahnya meleset satu. */
    const nomorDraf = await jalan(`__nomor(${JSON.stringify(NAMA)})`);
    if (nomorDraf !== "\u2014") {
      throw new Error(`draf ikut bernomor padahal belum punya plank: ${nomorDraf}`);
    }
    lapor("sektor draf tersimpan di baris terakhir, dan sengaja belum bernomor");
    await potret("5-draf");

    /* 7 — publish selagi masih draf: tidak boleh ikut terangkut */
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
    if ((await namaTayang()).includes(NAMA)) {
      throw new Error("draf ikut masuk content.json — gerbang state bocor");
    }
    lapor("draf TIDAK ikut ke content.json setelah Publish");

    /* 8 — jadikan Live: ditolak dulu karena belum berfoto */
    await jalan(BEKAL);
    await jalan(`__aksi(${JSON.stringify(NAMA)}, "Ubah")`);
    await tunggu(`!!document.querySelector("textarea")`, "form sektor (ubah)");
    await jalan(BEKAL);
    await jalan(`__radio("Live")`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`__teks().includes("Foto belum dipilih")`, "galat foto muncul");
    lapor("status Live tanpa foto ditolak, alasannya tampil di form");
    await potret("6-galat-foto");

    await jalan(`document.querySelector(".foto").click()`);
    await jalan(BEKAL);
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);
    await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

    const tayang = await konten();
    const terbit = tayang.industries.find((i) => i.name === NAMA);
    if (!terbit) throw new Error("sektor tayang tidak ada di content.json");
    if (terbit.desc !== KALIMAT) throw new Error("kalimat penjelas tidak ikut terbawa");
    if (!terbit.image) throw new Error("foto tidak ikut terbawa");
    if (tayang.industries.length > BATAS) {
      throw new Error(
        `content.json memuat ${tayang.industries.length} sektor — lebih dari yang muat di tumpukan`,
      );
    }
    lapor(
      `sektor tayang masuk content.json lengkap dengan foto (${tayang.industries.length}/${BATAS})`,
    );

    /* Nomor di panel harus sama persis dengan nomor yang dicetak situs, dan
       nomor situs = posisi di antara yang TAYANG. Dibandingkan dengan
       content.json, bukan dengan nomor baris, supaya kalau keduanya melenceng
       yang ketahuan bukan cuma "panel berubah". */
    await jalan(BEKAL);
    const nomorPanel = await jalan(`__nomor(${JSON.stringify(NAMA)})`);
    const nomorSitus = String(
      tayang.industries.findIndex((i) => i.name === NAMA) + 1,
    ).padStart(2, "0");
    if (nomorPanel !== nomorSitus) {
      throw new Error(
        `nomor di panel (${nomorPanel}) beda dengan nomor yang tercetak di situs (${nomorSitus})`,
      );
    }
    lapor(`nomor di panel sama dengan nomor yang tercetak di situs (${nomorPanel})`);
    await potret("7-tayang");

    /* 9 — kalau tempatnya dipinjam, daftar sekarang penuh lagi. Menaikkan
       sektor yang tadi diturunkan HARUS ditolak — inilah batas yang ditegakkan
       server, dilihat dari kursi editor. */
    if (dipinjam) {
      await jalan(`__aksi(${JSON.stringify(dipinjam)}, "Ubah")`);
      await tunggu(`!!document.querySelector("textarea")`, "form sektor pinjaman");
      await jalan(BEKAL);
      await jalan(`__radio("Live")`);
      await jalan(`__klik("Simpan")`);
      await tunggu(
        `__teks().includes("${BATAS} sektor")`,
        "penolakan batas dari server",
      );
      lapor(`sektor ke-${BATAS + 1} ditolak server, alasannya terbaca di form`);
      await potret("8-batas-ditolak");
      await jalan(`__klik("Batal")`);
      await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
      await jalan(BEKAL);
    }

    /* 10 — URUTAN. Inti kedua probe ini: tombol yang tidak punya kotak teks,
       dan yang memindahkan DUA hal sekaligus di situs — plank dan nomornya. */
    const sebelumUrut = await namaTayang();
    const barisAwal = await jalan(`__judul().indexOf(${JSON.stringify(NAMA)})`);

    /* Ditekan sampai TETANGGA TAYANG-nya terlewati, bukan sekali.
       Sekali tekan cuma menukar dengan baris di atasnya, dan kalau baris itu
       draf, urutan yang tayang tidak berubah sama sekali — probe yang menekan
       sekali lalu membandingkan content.json akan melapor "urutan tidak ikut
       berubah" untuk panel yang sebenarnya bekerja benar. */
    let tekan = 0;
    const semulaHidup = await jalan(`__hidup().indexOf(${JSON.stringify(NAMA)})`);
    while (tekan < 5) {
      await jalan(`__aksi(${JSON.stringify(NAMA)}, "Naikkan")`);
      tekan += 1;
      await tunggu(
        `__judul().indexOf(${JSON.stringify(NAMA)}) === ${barisAwal - tekan}`,
        "baris naik satu tingkat",
      );
      await jalan(BEKAL);
      if ((await jalan(`__hidup().indexOf(${JSON.stringify(NAMA)})`)) < semulaHidup) break;
    }
    if ((await jalan(`__hidup().indexOf(${JSON.stringify(NAMA)})`)) !== semulaHidup - 1) {
      throw new Error(`Naikkan ${tekan}× tidak melewati satu sektor tayang pun`);
    }
    lapor(
      `Naikkan (${tekan}×) menukar baris dengan tetangganya dan melewati satu sektor tayang`,
    );

    /* Memindahkan baris adalah perubahan yang menunggu Publish, sama seperti
       menyunting isinya — kalau badge-nya diam, editor menutup panel dengan
       yakin urutan barunya sudah tayang padahal belum. */
    await tunggu(`__teks().includes("perubahan belum tayang")`, "badge menyala setelah pindah");
    lapor("memindahkan baris menyalakan badge 'belum tayang'");

    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
    const sesudahUrut = await namaTayang();
    const posisiLama = sebelumUrut.indexOf(NAMA);
    const posisiBaru = sesudahUrut.indexOf(NAMA);
    if (posisiBaru !== posisiLama - 1) {
      throw new Error(
        `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
      );
    }
    lapor(`urutan plank ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);
    await potret("9-urutan");

    /* 11 — halaman depan yang sungguhan membacanya.
       Yang diperiksa daftar `sr-only`-nya: planknya hidup di WebGL, dan
       headless tanpa GPU tidak pernah menggambarnya. Daftar itu bukan
       pengganti yang lebih lemah — ia satu-satunya bentuk strip ini yang
       sampai ke pembaca layar dan mesin pencari. */
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await tunggu(
      `document.body.innerText.includes(${JSON.stringify(NAMA)})`,
      "sektor di halaman depan",
    );
    const baris = await jalan(`
      (() => {
        const li = [...document.querySelectorAll("li")].find(
          (x) => x.textContent.includes(${JSON.stringify(NAMA)}),
        );
        return li ? li.textContent.trim() : null;
      })()
    `);
    if (!baris || !baris.includes(KALIMAT)) {
      throw new Error(`kalimat penjelas tidak ikut terender di halaman depan: ${baris}`);
    }
    const jumlahBaris = await jalan(`
      (() => {
        const s = document.querySelector("#industries");
        return s ? s.querySelectorAll("ul.sr-only > li").length : 0;
      })()
    `);
    if (jumlahBaris !== sesudahUrut.length) {
      throw new Error(
        `halaman depan merender ${jumlahBaris} sektor, content.json berisi ${sesudahUrut.length}`,
      );
    }
    lapor(`halaman depan merender ${jumlahBaris} sektor dari CMS, lengkap kalimatnya`);
    await potret("10-home");

    /* 12 — bersihkan: hapus sektor probe, kembalikan yang tempatnya dipinjam,
       lalu pastikan daftar tayang persis seperti sebelum probe jalan. */
    await send("Page.navigate", { url: "http://localhost:5174/admin/" });
    await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    await jalan(BEKAL);
    await bukaDaftar();

    await jalan(`__aksi(${JSON.stringify(NAMA)}, "Hapus")`);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
    const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
    if (!isiDialog.includes(NAMA)) throw new Error("dialog tidak menyebut namanya");
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(`!__judul().includes(${JSON.stringify(NAMA)})`, "baris hilang dari daftar");
    await jalan(BEKAL);

    if (dipinjam) {
      await ubahStatus(dipinjam, "Live");
      const kembali = dipinjam;
      dipinjam = null;
      lapor(`"${kembali}" dikembalikan ke Live`);
    }

    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
    const akhir = await namaTayang();
    if (akhir.join("|") !== hidupSemula.join("|")) {
      throw new Error(
        `daftar tayang tidak kembali seperti semula:\n  sebelum: ${hidupSemula.join(" | ")}\n  sesudah: ${akhir.join(" | ")}`,
      );
    }
    lapor(`dihapus + Publish → daftar tayang kembali persis seperti semula (${akhir.length} sektor)`);

    /* Galat konsol dari halaman "/" tidak dihitung: di headless tanpa GPU,
       scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe. */
    const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
    if (relevan.length) {
      console.log("\n⚠ galat konsol:");
      for (const g of relevan) console.log("  " + g);
    } else {
      lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
    }

    console.log("\nscreenshot: /tmp/industri-*.png");
  } finally {
    if (dipinjam) {
      console.error(
        `\n⚠ TERTINGGAL: "${dipinjam}" masih berstatus Draft — kembalikan ke Live lewat panel, lalu Publish.`,
      );
    }
    ws.close();
  }
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

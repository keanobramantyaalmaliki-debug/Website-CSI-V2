/**
 * Jalan-jalan panel admin untuk CARA KERJA — login sampai kartu di seksi
 * "How We Work" halaman depan berubah.
 *
 *   node scripts/probe-proses-admin.mjs
 *
 * Saudara `probe-industri-admin.mjs`, dan sengaja meniru bentuknya sampai ke
 * nama langkahnya: dua entitas ini punya dua sifat yang sama, dan sifat itulah
 * yang paling mahal kalau rusak diam-diam.
 *
 *   1. URUTAN = ISI. Baris di panel menentukan urutan kartu DAN nomor "01"–"06"
 *      yang tercetak di sudutnya. Nomor itu tidak disimpan di kolom mana pun.
 *   2. ADA BATAS: enam. Ditegakkan server (`routes/processSteps.ts`), dan
 *      diberitahukan lebih dulu oleh tombol "+ Tambah langkah" yang mati.
 *
 * Satu langkah TIDAK ada di probe industri, dan justru dialah alasan slice ini
 * ditulis dengan hati-hati: ILUSTRASI IKUT PINDAH BERSAMA LANGKAHNYA. Sebelum
 * CMS, gambar tiap kartu dipilih dari POSISI barisnya (`PROCESS_GLYPHS[i]`) —
 * kalau itu tertinggal, memindahkan satu langkah akan menukar gambarnya dengan
 * tetangganya tanpa ada yang menyalak. Langkah 10 membandingkan peta
 * judul→ilustrasi sebelum dan sesudah pindah; keduanya harus sama persis.
 *
 * Karena daftar seed memang sudah penuh (6 dari 6), probe ini meminjam satu
 * tempat: langkah terakhir yang tayang diturunkan jadi draf, dipakai, lalu
 * dikembalikan persis seperti semula di langkah terakhir. Kalau probe gagal di
 * tengah, pesan gagalnya menyebut langkah mana yang tertinggal sebagai draf.
 *
 * Langkah 11 membuka halaman "/" yang sungguhan. Sampai titik itu yang terbukti
 * baru "database → berkas"; yang dijanjikan adalah "database → kartu di layar".
 * Beda dengan industri, kartu di sini DOM biasa — jadi yang diperiksa kartunya
 * sendiri, bukan daftar `sr-only` pengganti.
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
const PORT = 9234;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const NAMA = "Probe Step";
const KICKER = "PROBE";
const KALIMAT = "Langkah uji coba dari probe-proses-admin.mjs.";
/** Batas yang sama dengan `MAX_LIVE_PROCESS_STEPS` di `shared/processStep.ts`.
 *  Ditulis ulang di sini karena skrip ini Node polos tanpa bundler — dan
 *  dibandingkan dengan angka yang ditampilkan panel, jadi kalau keduanya
 *  melenceng probe-nya yang berteriak. */
const BATAS = 6;
/** Salinan `NAMA_ILUSTRASI` dari `admin/src/FormProses.tsx`, dengan alasan yang
 *  sama seperti BATAS di atas. Dipakai menerjemahkan `glyph` di content.json ke
 *  nama yang tercetak di kolom "Ilustrasi", supaya keduanya bisa dibandingkan
 *  sebagai satu peta. */
const ILUSTRASI = {
  discovery: "Radar",
  strategy: "Grafik naik",
  design: "Artboard",
  development: "Jendela kode",
  testing: "Kisi centang",
  deployment: "Simpul menyatu",
};

rmSync("/tmp/csi-proses-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-proses-probe",
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

/* Sama dengan bekal `probe-industri-admin.mjs`, plus `__ilustrasi` — kolom itu
   satu-satunya isi baris yang tidak ada di entitas mana pun sebelumnya, dan
   dialah yang dibandingkan sebelum/sesudah pindah. */
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

  /** Judul tiap baris, urut seperti di layar. */
  window.__judul = () =>
    [...document.querySelectorAll("tbody tr")].map((r) =>
      r.querySelector("strong")?.textContent.trim() ?? "",
    );
  /** Judul langkah yang barisnya berstatus Live, urut seperti di layar. */
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
      yang dilihat pengunjung di sudut kartunya. */
  window.__nomor = (nama) => __baris(nama).querySelector("td").textContent.trim();
  /** Nama ilustrasi satu baris. Kolomnya dicari lewat JUDUL KOLOM, bukan lewat
      angka: kolom yang disisipkan di kiri suatu hari akan menggeser indeks, dan
      probe yang memakai angka tetap "lulus" sambil membaca kolom lain. */
  window.__kolom = (judul) => {
    const i = [...document.querySelectorAll("thead th")].findIndex(
      (x) => x.textContent.trim() === judul,
    );
    if (i < 0) throw new Error("kolom tidak ada: " + judul);
    return i;
  };
  window.__ilustrasi = (nama) =>
    __baris(nama).children[__kolom("Ilustrasi")].textContent.trim();
  /** Peta judul→ilustrasi seluruh baris, sebagai teks yang bisa dibandingkan
      utuh. Urutan kuncinya sengaja urutan layar: yang diperiksa pasangannya,
      dan urutannya dibandingkan terpisah lewat __judul(). */
  window.__peta = () =>
    __judul().map((j) => j + " = " + __ilustrasi(j)).join(" | ");
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
    writeFileSync(`/tmp/proses-${nama}.png`, Buffer.from(data, "base64"));
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
  const judulTayang = async () => (await konten()).processSteps.map((s) => s.title);
  /** Peta judul→ilustrasi dari content.json, dalam bentuk yang sama persis
   *  dengan `__peta()` di panel — supaya keduanya bisa dibandingkan sebagai
   *  satu tali, bukan dua daftar yang harus dicocokkan sendiri. */
  const petaTayang = async () =>
    (await konten()).processSteps
      .map((s) => `${s.title} = ${ILUSTRASI[s.glyph] ?? s.glyph}`)
      .join(" | ");

  /** Buka daftar Cara kerja lewat menu sisi, dari mana pun posisinya. */
  const bukaDaftar = async () => {
    if ((await jalan(`__anak("Home").length`)) === 0) {
      await jalan(`__bukaGrup("Home")`);
      await tunggu(`__anak("Home").length > 0`, "grup Home terbuka");
    }
    await jalan(`__klikAnak("Home", "Cara kerja")`);
    await tunggu(`!!document.querySelector("table")`, "daftar langkah");
    await jalan(BEKAL);
  };

  /** Ganti status satu langkah lewat form, lalu kembali ke daftar. */
  const ubahStatus = async (nama, status) => {
    await jalan(`__aksi(${JSON.stringify(nama)}, "Ubah")`);
    await tunggu(`!!document.querySelector("textarea")`, `form ${nama}`);
    await jalan(BEKAL);
    await jalan(`__radio(${JSON.stringify(status)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);
  };

  /* Langkah yang tempatnya dipinjam probe. Disimpan di luar `try` supaya pesan
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

    /* 2 — beranda menyebut jumlah langkah sebelum halamannya dibuka.
       Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
       `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
       lahir kosong dan berubah sendiri belakangan. */
    const beranda = await jalan(`__teks()`);
    if (!/\d+ langkah/.test(beranda)) {
      throw new Error(`beranda tidak menyebut jumlah langkah:\n${beranda}`);
    }
    lapor("beranda menyebut jumlah langkah tanpa halamannya dibuka");
    await potret("1-beranda");

    /* 3 — turun ke Cara kerja lewat menu, seperti editor sungguhan. */
    await bukaDaftar();
    const anakHome = await jalan(`__anak("Home").join(" | ")`);
    if (!anakHome.includes("Cara kerja")) {
      throw new Error(`Cara kerja tidak ada di dalam grup Home: ${anakHome}`);
    }
    const tandaAktif = await jalan(
      `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
    );
    if (tandaAktif !== "Cara kerja") {
      throw new Error(
        `menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`,
      );
    }
    lapor("menu sisi membuka daftar cara kerja dan menandai posisinya");
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
    const petaSemula = await jalan(`__peta()`);
    if (semula.length < 2) {
      throw new Error(
        `butuh minimal 2 langkah untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
      );
    }

    /* 4 — BATAS. Diperiksa dari dua sisi: tombolnya mati saat penuh, dan
       kalimat di atas tabel menyebut angka yang sama dengan yang dipakai
       server. */
    const isiHalaman = await jalan(`__teks()`);
    if (!isiHalaman.includes(`maksimal ${BATAS}`)) {
      throw new Error(
        `panel tidak menyebut batas ${BATAS} langkah — angka panel dan angka server melenceng`,
      );
    }
    const penuh = hidupSemula.length >= BATAS;
    const tombolMati = await jalan(`__mati("+ Tambah langkah")`);
    if (penuh !== tombolMati) {
      throw new Error(
        `tombol Tambah ${tombolMati ? "mati" : "hidup"} padahal langkah tayang ${hidupSemula.length}/${BATAS}`,
      );
    }
    lapor(
      penuh
        ? `daftar penuh (${hidupSemula.length}/${BATAS}) dan tombol Tambah ikut mati`
        : `daftar belum penuh (${hidupSemula.length}/${BATAS}) dan tombol Tambah hidup`,
    );
    await potret("3-batas");

    /* 5 — pinjam satu tempat kalau memang penuh. Langkah terakhir yang tayang
       diturunkan jadi draf; dikembalikan di langkah 12. */
    if (penuh) {
      dipinjam = hidupSemula[hidupSemula.length - 1];
      await ubahStatus(dipinjam, "Draft");
      if (await jalan(`__mati("+ Tambah langkah")`)) {
        throw new Error(
          "tombol Tambah tetap mati padahal satu langkah sudah diturunkan jadi draf",
        );
      }
      lapor(`satu tempat dipinjam dari "${dipinjam}" — tombol Tambah hidup lagi`);
    }

    /* 6 — buat langkah baru */
    await jalan(`__klik("+ Tambah langkah")`);
    await tunggu(`!!document.querySelector("textarea")`, "form langkah");
    await jalan(BEKAL);

    /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
    await jalan(`__klik("‹ Semua langkah")`);
    await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
    lapor("tombol kembali di kepala form mengantar ke daftar langkah");
    await jalan(BEKAL);
    await jalan(`__klik("+ Tambah langkah")`);
    await tunggu(`!!document.querySelector("textarea")`, "form langkah (dibuka lagi)");
    await jalan(BEKAL);

    await jalan(`__isi("Judul langkah", ${JSON.stringify(NAMA)})`);
    await jalan(`__isi("Kicker", ${JSON.stringify(KICKER)})`);
    await jalan(`__isi("Penjelasan", ${JSON.stringify(KALIMAT)})`);
    /* Ilustrasi dipilih EKSPLISIT, bukan dibiarkan di bawaannya: yang diuji
       langkah 10 adalah gambar ini ikut pindah, dan gambar bawaan kebetulan
       sama dengan gambar langkah pertama seed. */
    await jalan(`__radio(${JSON.stringify(ILUSTRASI.strategy)})`);
    await potret("4-form");
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);

    const sesudah = await jalan(`__judul()`);
    if (sesudah.length !== semula.length + 1) {
      throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
    }
    /* Langkah baru mendarat di BAWAH: urutan di sini urutan kartu sekaligus
       nomornya, jadi langkah baru tidak boleh menggeser nomor langkah lain. */
    if (sesudah[sesudah.length - 1] !== NAMA) {
      throw new Error(`langkah baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
    }
    /* Ilustrasi yang dipilih tersimpan sebagai MILIK barisnya, bukan dihitung
       dari posisinya — baris terakhir tetap "Grafik naik", bukan gambar yang
       kebetulan seurutan dengannya. */
    const gambarBaru = await jalan(`__ilustrasi(${JSON.stringify(NAMA)})`);
    if (gambarBaru !== ILUSTRASI.strategy) {
      throw new Error(
        `ilustrasi yang tersimpan bukan yang dipilih: "${gambarBaru}" (harusnya "${ILUSTRASI.strategy}")`,
      );
    }
    /* Draf belum bernomor: nomor yang tercetak di situs dihitung dari baris
       yang tayang saja, dan draf tidak punya kartu. Kolom ini pernah memakai
       nomor baris apa adanya, dan satu draf di tengah cukup untuk membuat
       seluruh nomor di bawahnya meleset satu. */
    const nomorDraf = await jalan(`__nomor(${JSON.stringify(NAMA)})`);
    if (nomorDraf !== "—") {
      throw new Error(`draf ikut bernomor padahal belum punya kartu: ${nomorDraf}`);
    }
    lapor("langkah draf tersimpan di baris terakhir dengan ilustrasi pilihannya, dan sengaja belum bernomor");
    await potret("5-draf");

    /* 7 — publish selagi masih draf: tidak boleh ikut terangkut */
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
    if ((await judulTayang()).includes(NAMA)) {
      throw new Error("draf ikut masuk content.json — gerbang state bocor");
    }
    lapor("draf TIDAK ikut ke content.json setelah Publish");

    /* 8 — jadikan Live, lalu Publish */
    await jalan(BEKAL);
    await ubahStatus(NAMA, "Live");
    await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

    const tayang = await konten();
    const terbit = tayang.processSteps.find((s) => s.title === NAMA);
    if (!terbit) throw new Error("langkah tayang tidak ada di content.json");
    if (terbit.desc !== KALIMAT) throw new Error("penjelasan tidak ikut terbawa");
    if (terbit.kicker !== KICKER) throw new Error("kicker tidak ikut terbawa");
    if (ILUSTRASI[terbit.glyph] !== ILUSTRASI.strategy) {
      throw new Error(
        `ilustrasi di content.json bukan yang dipilih editor: ${terbit.glyph}`,
      );
    }
    if (tayang.processSteps.length > BATAS) {
      throw new Error(
        `content.json memuat ${tayang.processSteps.length} langkah — lebih dari batasnya`,
      );
    }
    lapor(
      `langkah tayang masuk content.json lengkap dengan ilustrasinya (${tayang.processSteps.length}/${BATAS})`,
    );

    /* Nomor di panel harus sama persis dengan nomor yang dicetak situs, dan
       nomor situs = posisi di antara yang TAYANG. Dibandingkan dengan
       content.json, bukan dengan nomor baris, supaya kalau keduanya melenceng
       yang ketahuan bukan cuma "panel berubah". */
    await jalan(BEKAL);
    const nomorPanel = await jalan(`__nomor(${JSON.stringify(NAMA)})`);
    const nomorSitus = String(
      tayang.processSteps.findIndex((s) => s.title === NAMA) + 1,
    ).padStart(2, "0");
    if (nomorPanel !== nomorSitus) {
      throw new Error(
        `nomor di panel (${nomorPanel}) beda dengan nomor yang tercetak di situs (${nomorSitus})`,
      );
    }
    lapor(`nomor di panel sama dengan nomor yang tercetak di situs (${nomorPanel})`);
    await potret("6-tayang");

    /* 9 — kalau tempatnya dipinjam, daftar sekarang penuh lagi. Menaikkan
       langkah yang tadi diturunkan HARUS ditolak — inilah batas yang
       ditegakkan server, dilihat dari kursi editor. */
    if (dipinjam) {
      await jalan(`__aksi(${JSON.stringify(dipinjam)}, "Ubah")`);
      await tunggu(`!!document.querySelector("textarea")`, "form langkah pinjaman");
      await jalan(BEKAL);
      await jalan(`__radio("Live")`);
      await jalan(`__klik("Simpan")`);
      await tunggu(
        `__teks().includes("${BATAS} langkah")`,
        "penolakan batas dari server",
      );
      lapor(`langkah ke-${BATAS + 1} ditolak server, alasannya terbaca di form`);
      await potret("7-batas-ditolak");
      await jalan(`__klik("Batal")`);
      await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
      await jalan(BEKAL);
    }

    /* 10 — URUTAN, dan yang ikut bersamanya. Inti kedua probe ini: tombol yang
       tidak punya kotak teks, yang memindahkan TIGA hal sekaligus di situs —
       kartu, nomornya, dan gambarnya. */
    const sebelumUrut = await judulTayang();
    const petaSebelum = await jalan(`__peta()`);
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
      throw new Error(`Naikkan ${tekan}× tidak melewati satu langkah tayang pun`);
    }
    const dilewati = (await jalan(`__hidup()`))[semulaHidup];
    lapor(
      `Naikkan (${tekan}×) menukar baris dengan tetangganya dan melewati "${dilewati}"`,
    );

    /* Kalau langkah yang dilewati kebetulan bergambar sama, pemeriksaan di
       bawah tidak membuktikan apa-apa: gambar yang terikat POSISI pun akan
       terlihat utuh. Lebih baik probe-nya berhenti dan minta diganti daripada
       lulus tanpa menguji apa pun. */
    const gambarDilewati = await jalan(`__ilustrasi(${JSON.stringify(dilewati)})`);
    if (gambarDilewati === ILUSTRASI.strategy) {
      throw new Error(
        `"${dilewati}" bergambar sama dengan langkah probe ("${gambarDilewati}") — ` +
          `ganti ILUSTRASI yang dipakai probe di skrip ini, kalau tidak pemeriksaan ilustrasinya tidak menguji apa-apa`,
      );
    }

    /* INI yang membedakan entitas ini dari industri: pasangan judul→ilustrasi
       harus UTUH sesudah baris berpindah. Sebelum CMS, gambar dipilih dari
       posisi baris (`PROCESS_GLYPHS[i]`) — kalau sisa cara itu tertinggal di
       mana pun, dua langkah yang bertukar tempat akan ikut bertukar gambar,
       dan tidak ada galat yang menyalak. */
    const petaSesudah = await jalan(`__peta()`);
    const urutSebelum = petaSebelum.split(" | ").sort().join(" | ");
    const urutSesudah = petaSesudah.split(" | ").sort().join(" | ");
    if (urutSebelum !== urutSesudah) {
      throw new Error(
        `ilustrasi ikut tertukar saat baris pindah:\n  sebelum: ${petaSebelum}\n  sesudah: ${petaSesudah}`,
      );
    }
    if (petaSebelum === petaSesudah) {
      throw new Error(`urutan baris tidak berubah sama sekali: ${petaSesudah}`);
    }
    lapor("ilustrasi ikut pindah bersama langkahnya — pasangan judul→gambar utuh");

    /* Memindahkan baris adalah perubahan yang menunggu Publish, sama seperti
       menyunting isinya — kalau badge-nya diam, editor menutup panel dengan
       yakin urutan barunya sudah tayang padahal belum. */
    await tunggu(`__teks().includes("perubahan belum tayang")`, "badge menyala setelah pindah");
    lapor("memindahkan baris menyalakan badge 'belum tayang'");

    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
    const sesudahUrut = await judulTayang();
    const posisiLama = sebelumUrut.indexOf(NAMA);
    const posisiBaru = sesudahUrut.indexOf(NAMA);
    if (posisiBaru !== posisiLama - 1) {
      throw new Error(
        `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
      );
    }
    lapor(`urutan kartu ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);

    /* Dan pasangan judul→gambar di content.json harus sama persis dengan yang
       tercetak di panel: dua tempat, satu jawaban. */
    await jalan(BEKAL);
    const petaBerkas = await petaTayang();
    const petaPanel = await jalan(
      `__hidup().map((j) => j + " = " + __ilustrasi(j)).join(" | ")`,
    );
    if (petaPanel !== petaBerkas) {
      throw new Error(
        `panel dan content.json menyebut ilustrasi yang beda:\n  panel:  ${petaPanel}\n  berkas: ${petaBerkas}`,
      );
    }
    lapor(
      `panel dan content.json sepakat soal urutan dan ilustrasinya (${sesudahUrut.length} langkah)`,
    );
    await potret("8-urutan");

    /* 11 — halaman depan yang sungguhan membacanya. Beda dengan industri,
       kartunya DOM biasa: yang diperiksa judul dan penjelasan di kartunya
       sendiri, bukan daftar pengganti. */
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await tunggu(
      `!!document.querySelector("#process")`,
      "seksi How We Work di halaman depan",
    );
    await tunggu(
      `[...document.querySelectorAll("#process h3")].some((h) => h.textContent.trim() === ${JSON.stringify(NAMA)})`,
      "kartu probe di halaman depan",
    );
    const kartu = await jalan(`
      (() => {
        const h = [...document.querySelectorAll("#process h3")].find(
          (x) => x.textContent.trim() === ${JSON.stringify(NAMA)},
        );
        return h ? h.parentElement.innerText.trim() : null;
      })()
    `);
    if (!kartu || !kartu.includes(KALIMAT) || !kartu.includes(KICKER)) {
      throw new Error(`isi kartu tidak lengkap di halaman depan: ${kartu}`);
    }
    const jumlahKartu = await jalan(
      `document.querySelectorAll("#process h3").length`,
    );
    if (jumlahKartu !== sesudahUrut.length) {
      throw new Error(
        `halaman depan merender ${jumlahKartu} kartu, content.json berisi ${sesudahUrut.length}`,
      );
    }
    const urutKartu = await jalan(
      `[...document.querySelectorAll("#process h3")].map((h) => h.textContent.trim()).join(" | ")`,
    );
    if (urutKartu !== sesudahUrut.join(" | ")) {
      throw new Error(
        `urutan kartu di halaman depan beda dengan content.json:\n  halaman: ${urutKartu}\n  berkas:  ${sesudahUrut.join(" | ")}`,
      );
    }
    lapor(`halaman depan merender ${jumlahKartu} kartu dari CMS, urut dan lengkap isinya`);
    await potret("9-home");

    /* 12 — bersihkan: hapus langkah probe, kembalikan yang tempatnya dipinjam,
       lalu pastikan daftar tayang persis seperti sebelum probe jalan —
       urutannya DAN gambarnya. */
    await send("Page.navigate", { url: "http://localhost:5174/admin/" });
    await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    await jalan(BEKAL);
    await bukaDaftar();

    await jalan(`__aksi(${JSON.stringify(NAMA)}, "Hapus")`);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
    const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
    if (!isiDialog.includes(NAMA)) throw new Error("dialog tidak menyebut judulnya");
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
    const akhir = await judulTayang();
    if (akhir.join("|") !== hidupSemula.join("|")) {
      throw new Error(
        `daftar tayang tidak kembali seperti semula:\n  sebelum: ${hidupSemula.join(" | ")}\n  sesudah: ${akhir.join(" | ")}`,
      );
    }
    const petaAkhir = await jalan(`__peta()`);
    if (petaAkhir !== petaSemula) {
      throw new Error(
        `pasangan judul→ilustrasi tidak kembali seperti semula:\n  sebelum: ${petaSemula}\n  sesudah: ${petaAkhir}`,
      );
    }
    lapor(
      `dihapus + Publish → daftar tayang kembali persis seperti semula (${akhir.length} langkah, ilustrasi utuh)`,
    );

    /* Galat konsol dari halaman "/" tidak dihitung: di headless tanpa GPU,
       scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe. */
    const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
    if (relevan.length) {
      console.log("\n⚠ galat konsol:");
      for (const g of relevan) console.log("  " + g);
    } else {
      lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
    }

    console.log("\nscreenshot: /tmp/proses-*.png");
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

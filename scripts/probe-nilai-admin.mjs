/**
 * Jalan-jalan panel admin untuk NILAI — login sampai panel People berubah.
 *
 *   node scripts/probe-nilai-admin.mjs
 *
 * Saudara kembar `probe-admin.mjs`, dengan satu langkah yang tidak ada di
 * sana: URUTAN. Naikkan/Turunkan adalah satu-satunya isian di panel ini yang
 * tidak berbentuk isian — ia tidak punya kotak teks yang bisa diperiksa unit
 * test, dan yang membuktikan ia bekerja hanyalah urutan `content.json`
 * berubah setelah tombolnya ditekan.
 *
 * Langkah terakhir membuka halaman /people yang sungguhan. Sampai titik itu
 * yang terbukti baru "database → berkas"; yang dijanjikan ke Keano adalah
 * "database → panel di layar", dan bagian terakhirnya cuma bisa dilihat di
 * halaman aslinya.
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
const PORT = 9232;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const JUDUL = "Probe Value";
const BARIS = "Diuji oleh probe";

rmSync("/tmp/csi-nilai-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-nilai-probe",
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

/* Sama persis dengan bekal di `probe-admin.mjs`, plus `__baris` — di panel
   nilai hampir semua pemeriksaan berbentuk "baris ke berapa", karena nomor
   barisnya justru yang sedang diuji. */
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
  let galatKonsol = [];
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
    writeFileSync(`/tmp/nilai-${nama}.png`, Buffer.from(data, "base64"));
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
    (await konten()).values.map((v) => v.title);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — beranda menyebut nilai sebelum halamannya dibuka.
     Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
     `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
     lahir kosong dan berubah sendiri belakangan. */
  const beranda = await jalan(`__teks()`);
  if (!/\d+ nilai/.test(beranda)) {
    throw new Error(`beranda tidak menyebut jumlah nilai:\n${beranda}`);
  }
  lapor("beranda menyebut jumlah nilai tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — turun ke Nilai lewat menu, seperti editor sungguhan.
     Dibuka hanya kalau memang masih tertutup: menekan judul grup itu tombol
     buka-tutup, jadi menekannya membabi buta justru menutup grup yang sudah
     terbuka — dan probe-nya gagal dengan pesan "Nilai tidak ada di People"
     yang menuduh hal yang sama sekali lain. */
  if ((await jalan(`__anak("People").length`)) === 0) {
    await jalan(`__bukaGrup("People")`);
    await tunggu(`__anak("People").length > 0`, "grup People terbuka");
  }
  const anakPeople = await jalan(`__anak("People").join(" | ")`);
  if (!anakPeople.includes("Nilai")) {
    throw new Error(`Nilai tidak ada di dalam grup People: ${anakPeople}`);
  }
  await jalan(`__klikAnak("People", "Nilai")`);
  await tunggu(`!!document.querySelector("table")`, "daftar nilai");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Nilai") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar nilai dan menandai posisinya");
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
      `butuh minimal 2 nilai untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
    );
  }

  /* 4 — buat draf */
  await jalan(`__klik("+ Tambah nilai")`);
  await tunggu(`!!document.querySelector("textarea")`, "form nilai");
  await jalan(BEKAL);

  /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
  await jalan(`__klik("‹ Semua nilai")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar nilai");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah nilai")`);
  await tunggu(`!!document.querySelector("textarea")`, "form nilai (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Judul", ${JSON.stringify(JUDUL)})`);
  await jalan(`__isi("Baris pendek", ${JSON.stringify(BARIS)})`);
  await jalan(`__isi("Uraian", "Nilai uji coba dari probe-nilai-admin.mjs.")`);
  await potret("3-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`__judul()`);
  if (sesudah.length !== semula.length + 1) {
    throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
  }
  /* Nilai baru mendarat di BAWAH — kebalikan dari lowongan, karena urutan di
     sini adalah urutan panel di halaman People. */
  if (sesudah[sesudah.length - 1] !== JUDUL) {
    throw new Error(`nilai baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
  }
  lapor("nilai draf tersimpan dan mendarat di baris paling bawah");
  await potret("4-draf");

  /* 5 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 6 — jadikan Live: ditolak dulu karena belum berfoto */
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Ubah")`);
  await tunggu(`!!document.querySelector("textarea")`, "form nilai (ubah)");
  await jalan(BEKAL);
  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Foto belum dipilih")`, "galat foto muncul");
  lapor("status Live tanpa foto ditolak, alasannya tampil di form");
  await potret("5-galat-foto");

  await jalan(`document.querySelector(".foto").click()`);
  await jalan(BEKAL);
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const tayang = await konten();
  const terbit = tayang.values.find((v) => v.title === JUDUL);
  if (!terbit) throw new Error("nilai tayang tidak ada di content.json");
  if (terbit.tagline !== BARIS) throw new Error("baris pendek tidak ikut terbawa");
  if (!terbit.photo) throw new Error("foto tidak ikut terbawa");
  lapor("nilai tayang masuk content.json lengkap dengan foto");
  await potret("6-tayang");

  /* 7 — URUTAN. Inti probe ini: tombol yang tidak punya kotak teks. */
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
  await tunggu(`__teks().includes("perubahan belum tayang")`, "badge menyala setelah pindah");
  lapor("memindahkan baris menyalakan badge 'belum tayang'");

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
  lapor(`urutan panel ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);
  await potret("7-urutan");

  /* 8 — halaman People yang sungguhan membacanya.
     Sampai langkah 7 yang terbukti baru "database → berkas". Yang berikut ini
     bagian terakhirnya: berkas → panel di layar. */
  await send("Page.navigate", { url: "http://localhost:3000/people" });
  await tunggu(
    `document.body.innerText.includes(${JSON.stringify(JUDUL)})`,
    "panel nilai di halaman People",
  );
  /* Dibandingkan huruf kecil semua: baris pendek dirender `uppercase` lewat
     CSS, dan `innerText` ikut menuruti `text-transform` — pembandingan apa
     adanya akan gagal justru saat semuanya benar. */
  const tekstPeople = await jalan(`document.body.innerText.toLowerCase()`);
  if (!tekstPeople.includes(BARIS.toLowerCase())) {
    throw new Error("baris pendek tidak ikut terender di halaman People");
  }

  /* "Ada di DOM" belum tentu "punya panel". Ukurannya diperiksa supaya
     judul yang menetes ke elemen setinggi nol — tersembunyi, terpotong,
     atau tidak pernah ikut tata letak — tidak lolos sebagai lulus. */
  const kotak = await jalan(`
    (() => {
      const h = [...document.querySelectorAll("h2")].find(
        (x) => x.textContent.trim() === ${JSON.stringify(JUDUL)},
      );
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })()
  `);
  if (!kotak || kotak.w < 50 || kotak.h < 10) {
    throw new Error(`panel nilai ada di DOM tapi tidak punya ukuran: ${JSON.stringify(kotak)}`);
  }
  lapor(`halaman People merender panel nilai dari CMS (judul ${kotak.w}×${kotak.h}px)`);

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia
     baru menyingkir saat scene 3D siap, dan di sini scene itu tidak akan
     pernah siap. Overlay-nya disingkirkan untuk potret ini saja — yang
     dipotret memang bagian di baliknya. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
    [...document.querySelectorAll("h2")]
      .find((x) => x.textContent.trim() === ${JSON.stringify(JUDUL)})
      ?.scrollIntoView({ block: "center" });
  `);
  await sleep(600);
  await potret("8-people");

  /* 9 — bersihkan: hapus lalu publish, dan halaman People ikut kehilangan */
  await send("Page.navigate", { url: "http://localhost:5174/admin/" });
  await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
  await jalan(BEKAL);
  if ((await jalan(`__anak("People").length`)) === 0) {
    await jalan(`__bukaGrup("People")`);
    await tunggu(`__anak("People").length > 0`, "grup People terbuka lagi");
  }
  await jalan(`__klikAnak("People", "Nilai")`);
  await tunggu(`!!document.querySelector("table")`, "daftar nilai lagi");
  await jalan(BEKAL);

  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Hapus")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(JUDUL)) throw new Error("dialog tidak menyebut judulnya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__judul().includes(${JSON.stringify(JUDUL)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("nilai terhapus masih ada di content.json");
  }
  const akhir = await judulTayang();
  lapor(`dihapus + Publish → hilang dari content.json (sisa: ${akhir.join(", ")})`);

  /* Galat konsol dari halaman /people tidak dihitung: di headless tanpa GPU,
     scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe ini. */
  const relevan = galatKonsol.filter(
    (g) => !/webgl|context|three|gl_/i.test(g),
  );
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/nilai-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

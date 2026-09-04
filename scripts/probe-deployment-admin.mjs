/**
 * Jalan-jalan panel admin untuk DEPLOYMENT — login sampai kartu di halaman
 * depan berubah.
 *
 *   node scripts/probe-deployment-admin.mjs
 *
 * Saudara `probe-industri-admin.mjs`, dengan satu langkah yang tidak ada di
 * entitas mana pun sebelumnya: PASANGAN SEKTOR + WILAYAH. Di semua entitas
 * lain, "kembar" berarti satu kolom yang sama; di sini sektor yang sama justru
 * SAH — "Logistics · Indonesia" dan "Logistics · International" memang dua
 * sistem berbeda. Yang tidak boleh dobel pasangannya. Itu satu-satunya aturan
 * di CMS ini yang jawabannya berubah tergantung isian KEDUA, dan ia cuma bisa
 * dibuktikan dengan dua kartu sungguhan: yang pertama ditolak, yang kedua
 * (wilayahnya diganti) diterima. Penolakannya pun harus mendarat di isian
 * Wilayah, bukan Sektor — kalau mendarat di Sektor, editor menyimpulkan nama
 * sektornya terlarang lalu mengarang nama palsu.
 *
 * Yang SENGAJA tidak ada di sini, beda dari probe industri: batas jumlah.
 * Grid-nya `sm:grid-cols-2 lg:grid-cols-3` — kartu ke-20 cuma menambah baris.
 * Jadi tidak ada tempat yang perlu dipinjam, dan tidak ada tombol Tambah yang
 * perlu mati.
 *
 * Langkah 10 membuka halaman "/" yang sungguhan. Sampai titik itu yang
 * terbukti baru "database → berkas"; yang dijanjikan ke Keano adalah
 * "database → kartu di layar". Beda dengan industri, kartu deployment hidup
 * di DOM biasa (bukan WebGL), jadi yang diperiksa di sana kartunya sendiri:
 * <h3> sektornya, baris meta "NN · Wilayah", dan kalimatnya.
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

const SEKTOR = "Probe Sector";
const WILAYAH = "Probe Region";
/** Wilayah kedua untuk sektor yang SAMA — inti langkah 7. */
const WILAYAH2 = "Probe Region Dua";
const KALIMAT = "Kartu uji coba dari probe-deployment-admin.mjs.";
const LABEL = `${SEKTOR} · ${WILAYAH}`;
const LABEL2 = `${SEKTOR} · ${WILAYAH2}`;

rmSync("/tmp/csi-deployment-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-deployment-probe",
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

/* Sama dengan bekal `probe-industri-admin.mjs`, dengan satu perbedaan yang
   bukan kosmetik: baris di sini dikenali lewat PASANGAN sektor·wilayah, bukan
   lewat nama sendirian. Dua baris bersektor sama itu sah di entitas ini, jadi
   pencari yang cuma melihat <strong> akan memilih baris pertama yang cocok —
   diam-diam menekan tombol di baris yang salah, dan tetap "lulus". */
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

  /** Pesan galat yang menempel di SATU isian — bukan kabar merah di kepala
      form. Yang diuji langkah 7 bukan "ada galat", tapi galatnya mendarat di
      isian yang mana. */
  window.__galat = (label) => {
    const isian = [...document.querySelectorAll(".isian")].find(
      (x) => x.querySelector("label")?.textContent.trim().startsWith(label),
    );
    if (!isian) throw new Error("isian tidak ada: " + label);
    return isian.querySelector(".galat")?.textContent.trim() ?? "";
  };

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

  /** Nama satu baris seperti yang dipakai manusia menyebutnya, dan seperti
      yang dipakai panel sendiri di tombol dan dialog: "Sektor · Wilayah".
      Kolom wilayah mencetak "—" saat kosong; itu bukan bagian namanya. */
  window.__label = (r) => {
    const s = r.querySelector("strong")?.textContent.trim() ?? "";
    const w = r.querySelectorAll("td")[2]?.textContent.trim() ?? "";
    return w && w !== "—" ? s + " · " + w : s;
  };
  /** Nama tiap baris, urut seperti di layar. */
  window.__judul = () => [...document.querySelectorAll("tbody tr")].map(__label);
  /** Baris yang berstatus Live, urut seperti di layar. */
  window.__hidup = () =>
    [...document.querySelectorAll("tbody tr")]
      .filter((r) => [...r.querySelectorAll(".penanda")].some((p) => p.textContent.trim() === "Live"))
      .map(__label);
  window.__baris = (nama) => {
    const r = [...document.querySelectorAll("tbody tr")].find((x) => __label(x) === nama);
    if (!r) throw new Error("baris tidak ada: " + nama);
    return r;
  };
  /** Nomor yang tercetak di kolom pertama satu baris — yang sama dengan nomor
      yang dilihat pengunjung di kartunya. */
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
    writeFileSync(`/tmp/deployment-${nama}.png`, Buffer.from(data, "base64"));
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
  /** Kartu tayang, dalam bentuk nama yang sama dengan yang dipakai panel. */
  const labelTayang = async () =>
    (await konten()).deployments.map((d) => `${d.sector} · ${d.region}`);

  /** Buka daftar Deployment lewat menu sisi, dari mana pun posisinya. */
  const bukaDaftar = async () => {
    if ((await jalan(`__anak("Home").length`)) === 0) {
      await jalan(`__bukaGrup("Home")`);
      await tunggu(`__anak("Home").length > 0`, "grup Home terbuka");
    }
    await jalan(`__klikAnak("Home", "Deployment")`);
    await tunggu(`!!document.querySelector("table")`, "daftar deployment");
    await jalan(BEKAL);
  };

  /** Hapus satu baris lewat dialog konfirmasi, seperti editor sungguhan. */
  const hapusBaris = async (label) => {
    await jalan(`__aksi(${JSON.stringify(label)}, "Hapus")`);
    await tunggu(`!!document.querySelector("dialog[open]")`, `dialog ${label}`);
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(
      `!__judul().includes(${JSON.stringify(label)})`,
      `baris ${label} hilang`,
    );
    await jalan(BEKAL);
  };

  /* Baris yang dibuat probe. Disimpan di luar `try` supaya pesan gagal bisa
     menyebutkan mana yang tertinggal di database kalau berhenti di tengah. */
  const tertinggal = new Set();

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

    /* 2 — beranda menyebut jumlah kartu sebelum halamannya dibuka.
       Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
       `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
       lahir kosong dan berubah sendiri belakangan. */
    const beranda = await jalan(`__teks()`);
    if (!/\d+ kartu/.test(beranda)) {
      throw new Error(`beranda tidak menyebut jumlah kartu:\n${beranda}`);
    }
    lapor("beranda menyebut jumlah kartu tanpa halamannya dibuka");
    await potret("1-beranda");

    /* 3 — turun ke Deployment lewat menu, seperti editor sungguhan. */
    await bukaDaftar();
    const anakHome = await jalan(`__anak("Home").join(" | ")`);
    if (!anakHome.includes("Deployment")) {
      throw new Error(`Deployment tidak ada di dalam grup Home: ${anakHome}`);
    }
    const tandaAktif = await jalan(
      `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
    );
    if (tandaAktif !== "Deployment") {
      throw new Error(
        `menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`,
      );
    }
    lapor("menu sisi membuka daftar deployment dan menandai posisinya");
    await potret("2-daftar");

    /* Sisa jalan-jalan yang gagal di tengah dibersihkan lewat panel. Dicari
       lewat sektornya, bukan pasangan lengkapnya: run yang mati persis di
       tengah langkah 7 bisa meninggalkan wilayah mana pun. */
    for (;;) {
      const sisa = await jalan(
        `__judul().find((x) => x.startsWith(${JSON.stringify(SEKTOR)})) ?? null`,
      );
      if (!sisa) break;
      await hapusBaris(sisa);
    }

    const semula = await jalan(`__judul()`);
    const hidupSemula = await jalan(`__hidup()`);
    if (hidupSemula.length < 2) {
      throw new Error(
        `butuh minimal 2 kartu tayang untuk menguji urutan, yang ada ${hidupSemula.length} — jalankan bun run db:seed`,
      );
    }

    /* 4 — TIDAK ADA batas. Kebalikan dari langkah 4 probe industri, dan
       diperiksa justru karena kemiripan dua panel ini bikin gampang salah
       menyalin `MAX_LIVE_*` ke sini. Tombol Tambah harus hidup berapa pun
       isinya, dan halamannya harus mengatakan begitu. */
    const isiHalaman = await jalan(`__teks()`);
    if (!isiHalaman.includes("Tidak ada batas jumlah")) {
      throw new Error("panel tidak memberi tahu bahwa jumlah kartu tak dibatasi");
    }
    if (await jalan(`__mati("+ Tambah kartu")`)) {
      throw new Error(
        `tombol Tambah mati padahal deployment tidak punya batas (${hidupSemula.length} kartu tayang)`,
      );
    }
    lapor(
      `tidak ada batas: tombol Tambah tetap hidup di ${hidupSemula.length} kartu tayang`,
    );

    /* 5 — buat kartu baru */
    await jalan(`__klik("+ Tambah kartu")`);
    await tunggu(`!!document.querySelector("textarea")`, "form kartu");
    await jalan(BEKAL);

    /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
    await jalan(`__klik("‹ Semua deployment")`);
    await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
    lapor("tombol kembali di kepala form mengantar ke daftar deployment");
    await jalan(BEKAL);
    await jalan(`__klik("+ Tambah kartu")`);
    await tunggu(`!!document.querySelector("textarea")`, "form kartu (dibuka lagi)");
    await jalan(BEKAL);

    await jalan(`__isi("Sektor", ${JSON.stringify(SEKTOR)})`);
    await jalan(`__isi("Wilayah", ${JSON.stringify(WILAYAH)})`);
    await jalan(`__isi("Keterangan", ${JSON.stringify(KALIMAT)})`);
    await potret("3-form");
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
    await jalan(BEKAL);
    tertinggal.add(LABEL);

    const sesudah = await jalan(`__judul()`);
    if (sesudah.length !== semula.length + 1) {
      throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
    }
    /* Kartu baru mendarat di BAWAH: urutan di sini urutan kartu sekaligus
       nomornya, jadi kartu baru tidak boleh menggeser nomor kartu lain. */
    if (sesudah[sesudah.length - 1] !== LABEL) {
      throw new Error(
        `kartu baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`,
      );
    }
    /* Draf belum bernomor: nomor yang tercetak di situs dihitung dari baris
       yang tayang saja, dan draf tidak menempati kartu. Kolom ini pernah
       memakai nomor baris apa adanya di entitas lain, dan satu draf di tengah
       cukup untuk membuat seluruh nomor di bawahnya meleset satu. */
    const nomorDraf = await jalan(`__nomor(${JSON.stringify(LABEL)})`);
    if (nomorDraf !== "—") {
      throw new Error(`draf ikut bernomor padahal kartunya belum ada: ${nomorDraf}`);
    }
    lapor("kartu draf tersimpan di baris terakhir, dan sengaja belum bernomor");
    await potret("4-draf");

    /* 6 — publish selagi masih draf: tidak boleh ikut terangkut */
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
    if ((await labelTayang()).includes(LABEL)) {
      throw new Error("draf ikut masuk content.json — gerbang state bocor");
    }
    lapor("draf TIDAK ikut ke content.json setelah Publish");

    /* 7 — PASANGAN sektor+wilayah. Yang membedakan entitas ini dari semua yang
       lain, dan diperiksa dari dua sisi dalam satu form yang sama:
       pasangan persis ditolak, sektor sama + wilayah beda diterima. */
    await jalan(BEKAL);
    await jalan(`__klik("+ Tambah kartu")`);
    await tunggu(`!!document.querySelector("textarea")`, "form kartu kedua");
    await jalan(BEKAL);
    await jalan(`__isi("Sektor", ${JSON.stringify(SEKTOR)})`);
    await jalan(`__isi("Wilayah", ${JSON.stringify(WILAYAH)})`);
    await jalan(`__isi("Keterangan", ${JSON.stringify(KALIMAT)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`__galat("Wilayah") !== ""`, "penolakan pasangan kembar");

    /* Mendaratnya DI MANA, bukan cuma ada. Galat yang sama di isian Sektor
       memberi tahu editor hal yang salah: bahwa nama sektornya terlarang. */
    const galatSektor = await jalan(`__galat("Sektor")`);
    if (galatSektor !== "") {
      throw new Error(
        `penolakan pasangan kembar ikut menuduh isian Sektor: ${galatSektor}`,
      );
    }
    const galatWilayah = await jalan(`__galat("Wilayah")`);
    if (!galatWilayah.includes(WILAYAH)) {
      throw new Error(`galat Wilayah tidak menyebut wilayahnya: ${galatWilayah}`);
    }
    lapor("pasangan sektor+wilayah kembar ditolak, alasannya mendarat di isian Wilayah");
    await potret("5-kembar");

    /* Sektor yang sama, wilayah beda — harus lolos. Inilah separuh aturan
       yang akan hilang diam-diam kalau suatu hari `sector` dibuat unik
       sendirian: penolakan di atas tetap terjadi, dan tidak ada yang tahu
       bahwa yang sah ikut tertolak. */
    await jalan(`__isi("Wilayah", ${JSON.stringify(WILAYAH2)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`!!document.querySelector("table")`, "kartu kedua tersimpan");
    await jalan(BEKAL);
    tertinggal.add(LABEL2);
    if (!(await jalan(`__judul().includes(${JSON.stringify(LABEL2)})`))) {
      throw new Error("kartu bersektor sama dengan wilayah berbeda tidak tersimpan");
    }
    lapor("sektor yang sama dengan wilayah berbeda diterima sebagai kartu kedua");

    /* 8 — jadikan Live: ditolak dulu karena belum berfoto */
    await jalan(`__aksi(${JSON.stringify(LABEL)}, "Ubah")`);
    await tunggu(`!!document.querySelector("textarea")`, "form kartu (ubah)");
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
    await tunggu(`__teks().includes("perubahan belum terpublish")`, "angka belum terpublish");
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");

    const tayang = await konten();
    const terbit = tayang.deployments.find(
      (d) => d.sector === SEKTOR && d.region === WILAYAH,
    );
    if (!terbit) throw new Error("kartu tayang tidak ada di content.json");
    if (terbit.desc !== KALIMAT) throw new Error("keterangan tidak ikut terbawa");
    if (!terbit.image) throw new Error("foto tidak ikut terbawa");
    /* Kartu kedua masih draf, dan draf tidak boleh menyelinap lewat pintu
       mana pun — termasuk lewat Publish yang dipicu saudaranya. */
    if ((await labelTayang()).includes(LABEL2)) {
      throw new Error("kartu kedua yang masih draf ikut terangkut ke content.json");
    }
    lapor(
      `kartu tayang masuk content.json lengkap dengan foto (${tayang.deployments.length} kartu)`,
    );

    /* Nomor di panel harus sama persis dengan nomor yang dicetak situs, dan
       nomor situs = posisi di antara yang TAYANG. Dibandingkan dengan
       content.json, bukan dengan nomor baris, supaya kalau keduanya melenceng
       yang ketahuan bukan cuma "panel berubah". */
    await jalan(BEKAL);
    const nomorPanel = await jalan(`__nomor(${JSON.stringify(LABEL)})`);
    const nomorSitus = String(
      tayang.deployments.findIndex(
        (d) => d.sector === SEKTOR && d.region === WILAYAH,
      ) + 1,
    ).padStart(2, "0");
    if (nomorPanel !== nomorSitus) {
      throw new Error(
        `nomor di panel (${nomorPanel}) beda dengan nomor yang tercetak di situs (${nomorSitus})`,
      );
    }
    lapor(`nomor di panel sama dengan nomor yang tercetak di situs (${nomorPanel})`);
    await potret("7-tayang");

    /* 9 — URUTAN. Tombol yang tidak punya kotak teks, dan yang memindahkan
       DUA hal sekaligus di situs: posisi kartu dan nomor yang tercetak di
       kepalanya. */
    const sebelumUrut = await labelTayang();
    const barisAwal = await jalan(`__judul().indexOf(${JSON.stringify(LABEL)})`);

    /* Ditekan sampai TETANGGA TAYANG-nya terlewati, bukan sekali.
       Sekali tekan cuma menukar dengan baris di atasnya, dan kalau baris itu
       draf, urutan yang tayang tidak berubah sama sekali — probe yang
       menekan sekali lalu membandingkan content.json akan melapor "urutan
       tidak ikut berubah" untuk panel yang sebenarnya bekerja benar.
       Lihat memori `cms-industri-nomor-draf-gotcha`. */
    const semulaHidup = await jalan(`__hidup().indexOf(${JSON.stringify(LABEL)})`);
    let tekan = 0;
    while (tekan < 5) {
      await jalan(`__aksi(${JSON.stringify(LABEL)}, "Naikkan")`);
      tekan += 1;
      await tunggu(
        `__judul().indexOf(${JSON.stringify(LABEL)}) === ${barisAwal - tekan}`,
        "baris naik satu tingkat",
      );
      await jalan(BEKAL);
      if ((await jalan(`__hidup().indexOf(${JSON.stringify(LABEL)})`)) < semulaHidup) break;
    }
    if ((await jalan(`__hidup().indexOf(${JSON.stringify(LABEL)})`)) !== semulaHidup - 1) {
      throw new Error(`Naikkan ${tekan}× tidak melewati satu kartu tayang pun`);
    }
    lapor(
      `Naikkan (${tekan}×) menukar baris dengan tetangganya dan melewati satu kartu tayang`,
    );

    /* Memindahkan baris adalah perubahan yang menunggu Publish, sama seperti
       menyunting isinya — kalau badge-nya diam, editor menutup panel
       dengan yakin urutan barunya sudah tayang padahal belum. */
    await tunggu(`__teks().includes("perubahan belum terpublish")`, "badge menyala setelah pindah");
    lapor("memindahkan baris menyalakan badge 'belum terpublish'");

    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
    const sesudahUrut = await labelTayang();
    const posisiLama = sebelumUrut.indexOf(LABEL);
    const posisiBaru = sesudahUrut.indexOf(LABEL);
    if (posisiBaru !== posisiLama - 1) {
      throw new Error(
        `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
      );
    }
    lapor(`urutan kartu ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);
    await potret("8-urutan");

    /* 10 — halaman depan yang sungguhan membacanya.
       Beda dari industri: kartu deployment DOM biasa, jadi yang diperiksa
       kartunya sendiri — <h3> sektornya, baris meta "NN · Wilayah",
       dan kalimatnya. Nomor di baris meta itu yang paling layak diperiksa di
       sini: ia tidak ada di database mana pun, lahir dari posisi, dan satu
       kartu yang absen di tengah cukup untuk membuatnya meleset diam-diam. */
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await tunggu(
      `document.body.innerText.includes(${JSON.stringify(SEKTOR)})`,
      "kartu di halaman depan",
    );
    const kartu = await jalan(`
      (() => {
        const a = [...document.querySelectorAll("#deployments article")].find(
          (x) => x.querySelector("h3")?.textContent.trim() === ${JSON.stringify(SEKTOR)},
        );
        if (!a) return null;
        return {
          meta: a.querySelector("p")?.textContent.trim() ?? "",
          desc: a.textContent.includes(${JSON.stringify(KALIMAT)}),
          foto: !!a.querySelector("img"),
        };
      })()
    `);
    if (!kartu) throw new Error("kartu probe tidak terender di halaman depan");
    const metaHarusnya = `${String(posisiBaru + 1).padStart(2, "0")} · ${WILAYAH}`;
    if (kartu.meta !== metaHarusnya) {
      throw new Error(
        `baris nomor kartu berbunyi "${kartu.meta}", harusnya "${metaHarusnya}"`,
      );
    }
    if (!kartu.desc) throw new Error("keterangan tidak ikut terender di kartunya");
    if (!kartu.foto) throw new Error("foto kartu tidak ikut terender");

    const jumlahKartu = await jalan(
      `document.querySelectorAll("#deployments article").length`,
    );
    if (jumlahKartu !== sesudahUrut.length) {
      throw new Error(
        `halaman depan merender ${jumlahKartu} kartu, content.json berisi ${sesudahUrut.length}`,
      );
    }
    lapor(
      `halaman depan merender ${jumlahKartu} kartu dari CMS — kartu probe bernomor "${kartu.meta}", lengkap kalimat dan fotonya`,
    );
    await potret("9-home");

    /* 11 — bersihkan: hapus kedua kartu probe, lalu pastikan daftar tayang
       persis seperti sebelum probe jalan. */
    await send("Page.navigate", { url: "http://localhost:5174/admin/" });
    await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    await jalan(BEKAL);
    await bukaDaftar();

    await jalan(`__aksi(${JSON.stringify(LABEL)}, "Hapus")`);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
    const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
    /* Dialognya harus menyebut PASANGANNYA, bukan sektornya sendirian: dengan
       dua baris bersektor sama di layar, "Hapus Probe Sector?" tidak memberi
       tahu yang mana yang akan hilang. */
    if (!isiDialog.includes(LABEL)) {
      throw new Error(
        `dialog tidak menyebut pasangan sektor·wilayahnya:\n${isiDialog}`,
      );
    }
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(`!__judul().includes(${JSON.stringify(LABEL)})`, "baris hilang dari daftar");
    await jalan(BEKAL);
    tertinggal.delete(LABEL);

    await hapusBaris(LABEL2);
    tertinggal.delete(LABEL2);

    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
    const akhir = await labelTayang();
    if (akhir.join("|") !== hidupSemula.join("|")) {
      throw new Error(
        `daftar tayang tidak kembali seperti semula:\n  sebelum: ${hidupSemula.join(" | ")}\n  sesudah: ${akhir.join(" | ")}`,
      );
    }
    lapor(
      `dihapus + Publish → daftar tayang kembali persis seperti semula (${akhir.length} kartu)`,
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

    console.log("\nscreenshot: /tmp/deployment-*.png");
  } finally {
    if (tertinggal.size) {
      console.error(
        `\n⚠ TERTINGGAL di database: ${[...tertinggal]
          .map((x) => `"${x}"`)
          .join(", ")} — hapus lewat panel, lalu Publish.`,
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

/**
 * Jalan-jalan panel admin untuk PROYEK "Selected Work" — login sampai kartu di
 * halaman Work berubah.
 *
 *   node scripts/probe-proyek-admin.mjs
 *
 * Saudara kembar `probe-nilai-admin.mjs`. Dua hal yang tidak ada di sana:
 *
 *  - LABEL. Satu-satunya isian yang berbentuk daftar-di-dalam-form. Yang bisa
 *    salah bukan isinya, melainkan barisnya: baris kosong yang tidak terkirim,
 *    atau label yang tersimpan dua kali karena disimpan ulang.
 *  - KARTUNYA GAMBAR. Di panel nilai foto cuma pelengkap; di sini kartu Work
 *    SELURUHNYA gambar, jadi "Live tanpa gambar" wajib ditolak dan gambarnya
 *    wajib benar-benar terpasang di halaman aslinya.
 *
 * Langkah terakhir membuka halaman /work yang sungguhan. Sampai titik itu yang
 * terbukti baru "database → berkas"; yang dijanjikan ke Keano adalah "database
 * → kartu di layar", dan bagian terakhirnya cuma bisa dilihat di halaman
 * aslinya.
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
const JUDUL = "Probe Project";
const KLIEN = "Probe Client";
const TAHUN = "2026";
const HASIL = "9 langkah lulus";
const LABEL = ["React", "Node.js"];

rmSync("/tmp/csi-proyek-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-proyek-probe",
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

/* Bekal `probe-nilai-admin.mjs`, plus `__blok`/`__tambahBaris`/`__isiBaris`
   untuk daftar Label. Isian biasa dicari lewat teks label-nya; baris daftar
   tidak bisa — semuanya berbagi satu label, yang membedakan cuma nomornya. */
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

  /** Satu blok isian, dikenali dari teks label-nya persis. */
  window.__blok = (label) => {
    const el = [...document.querySelectorAll(".isian")].find(
      (x) => x.querySelector("label")?.textContent.trim() === label,
    );
    if (!el) throw new Error("blok isian tidak ada: " + label);
    return el;
  };
  window.__jumlahBaris = (label) => __blok(label).querySelectorAll(".baris").length;
  window.__tambahBaris = (label) => {
    const b = [...__blok(label).querySelectorAll("button")].find(
      (x) => x.textContent.trim() === "+ Tambah",
    );
    if (!b) throw new Error("tombol + Tambah tidak ada di blok: " + label);
    b.click();
  };
  /** Pilih gambar yang sudah ada, yang path-nya dimulai dengan "awalan". */
  window.__pilihGambar = (awalan) => {
    const b = [...document.querySelectorAll("button.foto")].find((x) =>
      (x.querySelector("img")?.getAttribute("src") ?? "").startsWith(awalan),
    );
    if (!b) throw new Error("tidak ada gambar yang dimulai dengan: " + awalan);
    b.click();
    return b.querySelector("img").getAttribute("src");
  };
  window.__isiBaris = (label, i, teks) => {
    const el = __blok(label).querySelectorAll(".baris input, .baris textarea")[i];
    if (!el) throw new Error("baris ke-" + i + " tidak ada di blok: " + label);
    const proto = el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, teks);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
`;

/* Bekal khusus halaman Work — tidak ada hubungannya dengan panel admin, jadi
   sengaja tidak dititipkan ke `BEKAL` yang dipasang ulang belasan kali di
   sana. */
const BEKAL_WORK = `
  window.__bukaKartu = async (judul, gambar) => {
    const fan = document.querySelector('[data-testid="fan-slider"]');
    if (!fan) throw new Error("tumpukan kartu tidak ada di halaman ini");
    const titik = [...document.querySelectorAll("button")].find(
      (x) => x.getAttribute("aria-label") === "Show " + judul,
    );
    if (!titik) throw new Error("titik penanda kartu tidak ada: " + judul);
    titik.click();

    /* Kartu lama menyelesaikan animasi keluarnya dulu (AnimatePresence
       mode wait), baru yang baru masuk. */
    for (let i = 0; i < 40 && !fan.innerText.includes(judul); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }

    const h = [...fan.querySelectorAll("h3")].find(
      (x) => x.textContent.trim() === judul,
    );
    const r = h?.getBoundingClientRect();
    /* Dibandingkan sebagai URL yang sudah diselesaikan, bukan pathname:
       gambar CMS bisa berupa path lokal ("/people/bayu.webp") ATAU tautan
       penuh ke luar, dan pathname menyamakan dua tautan luar yang berbeda
       query-nya. */
    const penuh = new URL(gambar, location.href).href;
    const img = [...fan.querySelectorAll("img")].find(
      (x) => new URL(x.src, location.href).href === penuh,
    );
    return {
      judulTerbuka: !!h,
      teks: fan.innerText,
      kotak: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      gambar: img ? { lebar: img.naturalWidth, tinggi: img.naturalHeight } : null,
    };
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
    writeFileSync(`/tmp/proyek-${nama}.png`, Buffer.from(data, "base64"));
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
    (await konten()).projects.map((p) => p.title);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — beranda menyebut proyek sebelum halamannya dibuka.
     Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
     `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
     lahir kosong dan berubah sendiri belakangan. */
  const beranda = await jalan(`__teks()`);
  if (!/\d+ proyek/.test(beranda)) {
    throw new Error(`beranda tidak menyebut jumlah proyek:\n${beranda}`);
  }
  lapor("beranda menyebut jumlah proyek tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — turun ke Selected work lewat menu, seperti editor sungguhan.
     Dibuka hanya kalau memang masih tertutup: menekan judul grup itu tombol
     buka-tutup, jadi menekannya membabi buta justru menutup grup yang sudah
     terbuka — dan probe-nya gagal dengan pesan yang menuduh hal lain. */
  if ((await jalan(`__anak("Work").length`)) === 0) {
    await jalan(`__bukaGrup("Work")`);
    await tunggu(`__anak("Work").length > 0`, "grup Work terbuka");
  }
  const anakWork = await jalan(`__anak("Work").join(" | ")`);
  if (!anakWork.includes("Selected work")) {
    throw new Error(`Selected work tidak ada di dalam grup Work: ${anakWork}`);
  }
  /* Testimoni pernah salah alamat ke sini. Peta isinya sudah dibetulkan dan
     diuji unit; yang diperiksa di sini adalah apa yang benar-benar terpampang
     di menu sisi — satu-satunya tempat editor melihatnya. */
  if (/[Tt]estimoni/.test(anakWork)) {
    throw new Error(`testimoni muncul lagi di menu Work: ${anakWork}`);
  }
  await jalan(`__klikAnak("Work", "Selected work")`);
  await tunggu(`!!document.querySelector("table")`, "daftar proyek");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Selected work") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar proyek dan menandai posisinya");
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
      `butuh minimal 2 proyek untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
    );
  }

  /* 4 — buat draf */
  await jalan(`__klik("+ Tambah proyek")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form proyek");
  await jalan(BEKAL);

  /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
  await jalan(`__klik("‹ Semua proyek")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar proyek");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah proyek")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form proyek (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Nama proyek", ${JSON.stringify(JUDUL)})`);
  await jalan(`__isi("Klien", ${JSON.stringify(KLIEN)})`);
  await jalan(`__isi("Tahun", ${JSON.stringify(TAHUN)})`);
  await jalan(`__isi("Hasil", ${JSON.stringify(HASIL)})`);

  /* Label ditambah satu per satu, menunggu barisnya benar-benar muncul dulu.
     Menekan "+ Tambah" dua kali beruntun lalu mengisi keduanya sekaligus akan
     lulus di React yang membilas tiap klik dan gagal di React yang menundanya
     — dan kegagalannya berbunyi "baris ke-1 tidak ada", bukan "sabar". */
  for (const [i, label] of LABEL.entries()) {
    await jalan(`__tambahBaris("Label")`);
    await tunggu(`__jumlahBaris("Label") === ${i + 1}`, `baris label ke-${i + 1}`);
    await jalan(`__isiBaris("Label", ${i}, ${JSON.stringify(label)})`);
  }
  /* Satu baris kosong ditinggal dengan sengaja: menekan "+ Tambah" lalu
     berubah pikiran adalah hal yang paling sering terjadi, dan form-nya
     berjanji membuang baris itu diam-diam alih-alih menolak simpanan. */
  await jalan(`__tambahBaris("Label")`);
  await tunggu(`__jumlahBaris("Label") === ${LABEL.length + 1}`, "baris label kosong");

  await potret("3-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`__judul()`);
  if (sesudah.length !== semula.length + 1) {
    throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
  }
  /* Proyek baru mendarat di BAWAH — urutan di sini adalah urutan kartu, dan
     kartu paling atas adalah yang sudah terbuka saat halaman Work dibuka. */
  if (sesudah[sesudah.length - 1] !== JUDUL) {
    throw new Error(`proyek baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
  }
  lapor("proyek draf tersimpan (baris label kosong dibuang) dan mendarat paling bawah");
  await potret("4-draf");

  /* 5 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 6 — jadikan Live: ditolak dulu karena kartunya belum bergambar */
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Ubah")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form proyek (ubah)");
  await jalan(BEKAL);

  /* Label yang tersimpan dibaca ulang dari server, bukan diingat form.
     Dua salinan "React" berarti simpan-ulang menumpuk, bukan mengganti. */
  const labelTersimpan = await jalan(`
    [...__blok("Label").querySelectorAll(".baris input")].map((x) => x.value)
  `);
  if (labelTersimpan.join("|") !== LABEL.join("|")) {
    throw new Error(
      `label tidak kembali apa adanya: ${JSON.stringify(labelTersimpan)}`,
    );
  }
  lapor("label tersimpan urut & tanpa baris kembar saat form dibuka lagi");

  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Gambar belum dipilih")`, "galat gambar muncul");
  lapor("status Live tanpa gambar ditolak, alasannya tampil di form");
  await potret("5-galat-gambar");

  /* Sengaja yang path-nya lokal, bukan sekadar gambar pertama di daftar:
     langkah terakhir memeriksa gambarnya benar-benar TERMUAT, dan sebagian
     isi daftar ini adalah tautan Unsplash. Gambar seberang laut yang gagal
     dimuat karena jaringan kantor sedang batuk akan dilaporkan sebagai kartu
     rusak — tuduhan yang salah alamat. */
  const gambarDipilih = await jalan(`__pilihGambar("/")`);
  await jalan(BEKAL);
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const tayang = await konten();
  const terbit = tayang.projects.find((p) => p.title === JUDUL);
  if (!terbit) throw new Error("proyek tayang tidak ada di content.json");
  if (terbit.client !== KLIEN) throw new Error("klien tidak ikut terbawa");
  if (terbit.year !== TAHUN) throw new Error("tahun tidak ikut terbawa");
  if (terbit.outcome !== HASIL) throw new Error("hasil tidak ikut terbawa");
  if (terbit.tags.join("|") !== LABEL.join("|")) {
    throw new Error(`label tidak ikut terbawa utuh: ${JSON.stringify(terbit.tags)}`);
  }
  if (terbit.image !== gambarDipilih) {
    throw new Error(
      `gambar yang tayang bukan yang dipilih: ${terbit.image} vs ${gambarDipilih}`,
    );
  }
  lapor("proyek tayang masuk content.json lengkap dengan label & gambar");
  await potret("6-tayang");

  /* 7 — URUTAN. Inti probe ini: tombol yang tidak punya kotak teks.
     Tetangga di atas harus Live juga — kalau ia draf, urutan di content.json
     memang tidak berubah, dan probe-nya akan menuduh Naikkan rusak. */
  const barisSekarang = await jalan(`__judul()`);
  const tetangga = barisSekarang[barisSekarang.indexOf(JUDUL) - 1];
  const statusTetangga = await jalan(`__baris(${JSON.stringify(tetangga)}).innerText`);
  if (!statusTetangga.includes("Live")) {
    throw new Error(
      `tetangga di atas ("${tetangga}") bukan Live, urutan tayang tidak akan berubah — jalankan bun run db:seed`,
    );
  }

  const sebelumUrut = await judulTayang();
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
  if (posisiBaru !== posisiLama - 1 || sesudahUrut[posisiLama] !== tetangga) {
    throw new Error(
      `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
    );
  }
  lapor(`urutan kartu ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);
  await potret("7-urutan");

  /* 8 — halaman Work yang sungguhan merender kartunya.
     Sampai langkah 7 yang terbukti baru "database → berkas". Yang berikut ini
     bagian terakhirnya: berkas → kartu di layar. */
  await send("Page.navigate", { url: "http://localhost:3000/work" });
  await tunggu(
    `!!document.querySelector('[data-testid="fan-slider"]')`,
    "tumpukan kartu di halaman Work",
  );

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia
     baru menyingkir saat scene 3D siap, dan di sini scene itu tidak akan
     pernah siap. Overlay-nya disingkirkan supaya potretnya memperlihatkan
     bagian di baliknya. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
  `);
  await jalan(BEKAL_WORK);

  /* Semua pemeriksaan DIKURUNG di dalam tumpukan kartunya, dan itu bukan
     kerewelan: tumpukan versi ponsel ikut hadir di DOM halaman yang sama
     (disembunyikan CSS) dengan SELURUH judul di dalamnya. Mencari judul di
     `body` akan menemukannya di sana dan lulus tanpa satu pun kartu desktop
     benar-benar terbuka — persis yang terjadi di ronde pertama probe ini.

     Klik + tunggu + ukur dijadikan satu perjalanan ke halaman karena kartu
     yang terbuka berganti sendiri tiap 5 detik: apa pun yang diperiksa dengan
     perintah terpisah memeriksa kartu yang mungkin sudah bukan yang tadi
     dibuka. Menunggunya juga wajib — pergantian kartu memakai `mode="wait"`,
     jadi selama 0,4 detik pertama yang masih terpampang justru kartu LAMA. */
  const kartu = await jalan(
    `__bukaKartu(${JSON.stringify(JUDUL)}, ${JSON.stringify(terbit.image)})`,
  );
  if (!kartu.judulTerbuka) {
    throw new Error(
      `kartu tidak pernah terbuka setelah titiknya ditekan; yang terpampang: ${JSON.stringify(kartu.teks)}`,
    );
  }
  for (const [apa, teks] of [
    ["klien", KLIEN],
    ["tahun", TAHUN],
    ["hasil", HASIL],
    ["label", LABEL[0]],
  ]) {
    if (!kartu.teks.includes(teks)) {
      throw new Error(`${apa} tidak ikut terender di kartu: ${JSON.stringify(kartu.teks)}`);
    }
  }

  /* "Ada di DOM" belum tentu "punya kartu". Ukurannya diperiksa supaya judul
     yang menetes ke elemen setinggi nol — tersembunyi, terpotong, atau tidak
     pernah ikut tata letak — tidak lolos sebagai lulus. Gambarnya diperiksa
     terpisah: kartu Work SELURUHNYA gambar, jadi judul yang benar di atas
     gambar yang gagal dimuat tetap kartu kosong. */
  if (!kartu.kotak || kartu.kotak.w < 50 || kartu.kotak.h < 10) {
    throw new Error(`kartu ada di DOM tapi tidak punya ukuran: ${JSON.stringify(kartu.kotak)}`);
  }
  if (!kartu.gambar) {
    throw new Error(`gambar ${terbit.image} tidak dipasang di tumpukan kartu`);
  }
  if (kartu.gambar.lebar === 0) {
    throw new Error(`gambar ${terbit.image} terpasang tapi gagal dimuat (naturalWidth 0)`);
  }
  lapor(
    `halaman Work merender kartu dari CMS (judul ${kartu.kotak.w}×${kartu.kotak.h}px, gambar ${kartu.gambar.lebar}×${kartu.gambar.tinggi}px)`,
  );

  /* Dibuka sekali lagi tepat sebelum dipotret: jeda menggulung dan menunggu
     cukup untuk giliran kartunya lewat. */
  await jalan(`
    document.querySelector('[data-testid="fan-slider"]').scrollIntoView({ block: "center" });
  `);
  await jalan(`__bukaKartu(${JSON.stringify(JUDUL)}, ${JSON.stringify(terbit.image)})`);
  await potret("8-work");

  /* 9 — bersihkan: hapus lalu publish, dan halaman Work ikut kehilangan */
  await send("Page.navigate", { url: "http://localhost:5174/admin/" });
  await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
  await jalan(BEKAL);
  if ((await jalan(`__anak("Work").length`)) === 0) {
    await jalan(`__bukaGrup("Work")`);
    await tunggu(`__anak("Work").length > 0`, "grup Work terbuka lagi");
  }
  await jalan(`__klikAnak("Work", "Selected work")`);
  await tunggu(`!!document.querySelector("table")`, "daftar proyek lagi");
  await jalan(BEKAL);

  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Hapus")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(JUDUL)) throw new Error("dialog tidak menyebut nama proyeknya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__judul().includes(${JSON.stringify(JUDUL)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("proyek terhapus masih ada di content.json");
  }
  const akhir = await judulTayang();
  lapor(`dihapus + Publish → hilang dari content.json (sisa: ${akhir.join(", ")})`);

  /* Galat konsol dari halaman /work tidak dihitung: di headless tanpa GPU,
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

  console.log("\nscreenshot: /tmp/proyek-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

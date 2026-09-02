/**
 * Jalan-jalan panel admin untuk TESTIMONI — login sampai kutipannya benar-benar
 * muncul di dasar halaman Services.
 *
 *   node scripts/probe-testimoni-admin.mjs
 *
 * Saudara kembar `probe-nilai-admin.mjs`. Dua hal yang khas testimoni:
 *
 *   1. Tidak ada foto. Komponennya di situs menggambar ikon orang yang sama
 *      untuk semua kutipan, jadi tidak ada langkah "Live ditolak karena belum
 *      berfoto" seperti di nilai — yang menolak di sini adalah JABATAN.
 *   2. Halaman Services cuma menampilkan SATU kutipan saat dibuka: yang
 *      pertama. Jadi probe-nya tidak cukup menayangkan; ia harus menaikkan
 *      barisnya sampai ke puncak dulu. Itu sekaligus yang membuktikan tombol
 *      Naikkan benar-benar mengubah apa yang dilihat pengunjung, bukan cuma
 *      menukar dua baris di tabel admin.
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
const NAMA = "Probe Testimoni";
const JABATAN = "Kepala Uji Coba, probe-testimoni-admin.mjs";
const KUTIPAN =
  "Kutipan uji coba dari probe — kalau kalimat ini terbaca di halaman Services, seluruh jalurnya hidup.";

rmSync("/tmp/csi-testimoni-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-testimoni-probe",
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

/* Bekal yang sama dengan `probe-nilai-admin.mjs`; `__judul` di sini membaca
   NAMA, karena itulah yang ditebalkan di kolom pertama tabel testimoni. */
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

  /** Nama tiap baris, urut seperti di layar. */
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
    writeFileSync(`/tmp/testimoni-${nama}.png`, Buffer.from(data, "base64"));
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
  const namaTayang = async () =>
    (await konten()).testimonials.map((t) => t.name);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — beranda menyebut testimoni sebelum halamannya dibuka.
     Angkanya diambil saat memuat panel, bukan saat masuk halamannya: kalau
     `muat()` cuma mengambil entitas yang sedang dibuka, kalimat ini akan
     lahir kosong dan berubah sendiri belakangan. */
  const beranda = await jalan(`__teks()`);
  if (!/\d+ testimoni/.test(beranda)) {
    throw new Error(`beranda tidak menyebut jumlah testimoni:\n${beranda}`);
  }
  lapor("beranda menyebut jumlah testimoni tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — turun ke Testimoni lewat menu, seperti editor sungguhan.
     Grupnya dibuka hanya kalau memang masih tertutup: menekan judul grup itu
     tombol buka-tutup, jadi menekannya membabi buta justru menutup grup yang
     sudah terbuka. */
  if ((await jalan(`__anak("Services").length`)) === 0) {
    await jalan(`__bukaGrup("Services")`);
    await tunggu(`__anak("Services").length > 0`, "grup Services terbuka");
  }
  const anakServices = await jalan(`__anak("Services").join(" | ")`);
  if (!anakServices.includes("Testimoni")) {
    throw new Error(`Testimoni tidak ada di dalam grup Services: ${anakServices}`);
  }
  await jalan(`__klikAnak("Services", "Testimoni")`);
  await tunggu(`!!document.querySelector("table")`, "daftar testimoni");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Testimoni") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar testimoni dan menandai posisinya");
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
  if (semula.length < 2) {
    throw new Error(
      `butuh minimal 2 testimoni untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
    );
  }

  /* 4 — buat draf */
  await jalan(`__klik("+ Tambah testimoni")`);
  await tunggu(`!!document.querySelector("textarea")`, "form testimoni");
  await jalan(BEKAL);

  /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
  await jalan(`__klik("‹ Semua testimoni")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar testimoni");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah testimoni")`);
  await tunggu(`!!document.querySelector("textarea")`, "form testimoni (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Kutipan", ${JSON.stringify(KUTIPAN)})`);
  await jalan(`__isi("Nama", ${JSON.stringify(NAMA)})`);
  await potret("3-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`__judul()`);
  if (sesudah.length !== semula.length + 1) {
    throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
  }
  /* Testimoni baru mendarat di BAWAH: baris teratas adalah kutipan yang
     terlihat saat halaman Services dibuka, dan itu bukan sesuatu yang boleh
     berpindah sendiri hanya karena ada kutipan baru ditulis. */
  if (sesudah[sesudah.length - 1] !== NAMA) {
    throw new Error(`testimoni baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
  }
  lapor("testimoni draf tersimpan (tanpa jabatan) dan mendarat di baris paling bawah");
  await potret("4-draf");

  /* 5 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await namaTayang()).includes(NAMA)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 6 — jadikan Live: ditolak dulu karena jabatannya kosong.
     Ini padanan langkah "belum berfoto" di probe nilai — aturan yang cuma
     berlaku untuk yang tayang, dan satu-satunya isian yang boleh kosong di
     draf tapi tidak boleh kosong di depan pengunjung. */
  await jalan(`__aksi(${JSON.stringify(NAMA)}, "Ubah")`);
  await tunggu(`!!document.querySelector("textarea")`, "form testimoni (ubah)");
  await jalan(BEKAL);
  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Jabatan belum diisi")`, "galat jabatan muncul");
  lapor("status Live tanpa jabatan ditolak, alasannya tampil di form");
  await potret("5-galat-jabatan");

  await jalan(`__isi("Jabatan", ${JSON.stringify(JABATAN)})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const tayang = await konten();
  const terbit = tayang.testimonials.find((t) => t.name === NAMA);
  if (!terbit) throw new Error("testimoni tayang tidak ada di content.json");
  if (terbit.quote !== KUTIPAN) throw new Error("kutipannya tidak ikut terbawa");
  if (terbit.role !== JABATAN) throw new Error("jabatannya tidak ikut terbawa");
  lapor("testimoni tayang masuk content.json lengkap dengan jabatannya");
  await potret("6-tayang");

  /* 7 — URUTAN. Inti probe ini: tombol yang tidak punya kotak teks.
     Dinaikkan sampai puncak, bukan sekali — halaman Services cuma menampilkan
     kutipan pertama saat dibuka, jadi "sampai puncak" itu juga persiapan
     langkah 8. */
  const sebelumUrut = await namaTayang();
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(NAMA)}, "Naikkan")`);
  await tunggu(
    `__judul().indexOf(${JSON.stringify(NAMA)}) === __judul().length - 2`,
    "baris naik satu tingkat",
  );
  await jalan(BEKAL);
  lapor("Naikkan menukar baris dengan tetangganya di layar");

  /* Menaikkan baris adalah perubahan yang menunggu Publish, sama seperti
     menyunting isinya — kalau badge-nya diam, editor menutup panel dengan
     yakin urutan barunya sudah tayang padahal belum. */
  await tunggu(`__teks().includes("perubahan belum tayang")`, "badge menyala setelah pindah");
  lapor("memindahkan baris menyalakan badge 'belum tayang'");

  /* Sisa jalan ke puncak. Batas perulangannya jumlah baris, supaya tombol
     Naikkan yang macet berhenti sebagai galat, bukan sebagai probe yang
     menggantung selamanya. */
  const jumlahBaris = (await jalan(`__judul().length`)) ?? 0;
  for (let i = 0; i < jumlahBaris + 1; i++) {
    const posisi = await jalan(`__judul().indexOf(${JSON.stringify(NAMA)})`);
    if (posisi === 0) break;
    if (i === jumlahBaris) throw new Error("Naikkan tidak pernah sampai ke puncak");
    await jalan(`__aksi(${JSON.stringify(NAMA)}, "Naikkan")`);
    await tunggu(
      `__judul().indexOf(${JSON.stringify(NAMA)}) === ${posisi - 1}`,
      `baris naik ke posisi ${posisi - 1}`,
    );
    await jalan(BEKAL);
  }
  /* Di puncak, tombol Naikkan harus mati — kalau tidak, urutannya bisa
     dikirim dengan indeks di luar daftar. */
  const naikMati = await jalan(`
    [...__baris(${JSON.stringify(NAMA)}).querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Naikkan")?.disabled === true
  `);
  if (!naikMati) throw new Error("tombol Naikkan masih hidup di baris teratas");

  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  const sesudahUrut = await namaTayang();
  if (sesudahUrut[0] !== NAMA) {
    throw new Error(
      `urutan di content.json tidak ikut berubah: ${sebelumUrut.join(" | ")} → ${sesudahUrut.join(" | ")}`,
    );
  }
  lapor(`urutan panel ikut berubah di content.json (${sebelumUrut.join(", ")} → ${sesudahUrut.join(", ")})`);
  await potret("7-urutan");

  /* 8 — halaman Services yang sungguhan membacanya.
     Sampai langkah 7 yang terbukti baru "database → berkas". Yang berikut ini
     bagian terakhirnya: berkas → kutipan di layar. */
  await send("Page.navigate", { url: "http://localhost:3000/services" });
  await tunggu(
    `document.body.innerText.includes(${JSON.stringify(NAMA)})`,
    "kutipan di halaman Services",
  );
  const tekstServices = await jalan(`document.body.innerText`);
  if (!tekstServices.includes(KUTIPAN)) {
    throw new Error("kutipannya tidak ikut terender di halaman Services");
  }
  if (!tekstServices.includes(JABATAN)) {
    throw new Error("jabatannya tidak ikut terender di halaman Services");
  }

  /* "Ada di DOM" belum tentu "terbaca". Ukurannya diperiksa supaya kutipan
     yang menetes ke elemen setinggi nol — tersembunyi, terpotong, atau tidak
     pernah ikut tata letak — tidak lolos sebagai lulus. */
  const kotak = await jalan(`
    (() => {
      const el = [...document.querySelectorAll("blockquote, p")].find(
        (x) => x.textContent.includes(${JSON.stringify(KUTIPAN)}),
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })()
  `);
  if (!kotak || kotak.w < 50 || kotak.h < 10) {
    throw new Error(`kutipan ada di DOM tapi tidak punya ukuran: ${JSON.stringify(kotak)}`);
  }
  lapor(`halaman Services merender kutipan dari CMS (${kotak.w}×${kotak.h}px)`);

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia
     baru menyingkir saat scene 3D siap, dan di sini scene itu tidak akan
     pernah siap. Overlay-nya disingkirkan untuk potret ini saja — yang
     dipotret memang bagian di baliknya. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
    [...document.querySelectorAll("blockquote, p")]
      .find((x) => x.textContent.includes(${JSON.stringify(KUTIPAN)}))
      ?.scrollIntoView({ block: "center" });
  `);
  await sleep(600);
  await potret("8-services");

  /* 9 — bersihkan: hapus lalu publish, dan halaman Services ikut kehilangan */
  await send("Page.navigate", { url: "http://localhost:5174/admin/" });
  await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
  await jalan(BEKAL);
  if ((await jalan(`__anak("Services").length`)) === 0) {
    await jalan(`__bukaGrup("Services")`);
    await tunggu(`__anak("Services").length > 0`, "grup Services terbuka lagi");
  }
  await jalan(`__klikAnak("Services", "Testimoni")`);
  await tunggu(`!!document.querySelector("table")`, "daftar testimoni lagi");
  await jalan(BEKAL);

  await jalan(`__aksi(${JSON.stringify(NAMA)}, "Hapus")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(NAMA)) throw new Error("dialog tidak menyebut namanya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__judul().includes(${JSON.stringify(NAMA)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await namaTayang()).includes(NAMA)) {
    throw new Error("testimoni terhapus masih ada di content.json");
  }
  const akhir = await namaTayang();
  lapor(`dihapus + Publish → hilang dari content.json (sisa: ${akhir.join(", ")})`);

  /* Galat konsol dari halaman /services tidak dihitung: di headless tanpa
     GPU, scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe
     ini. */
  const relevan = galatKonsol.filter(
    (g) => !/webgl|context|three|gl_/i.test(g),
  );
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/testimoni-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

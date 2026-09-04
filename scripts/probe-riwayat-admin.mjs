/**
 * Jalan-jalan panel admin untuk RIWAYAT.
 *
 *   node scripts/probe-riwayat-admin.mjs
 *
 * Layar ini beda dari semua probe entitas lain di folder ini: ia tidak
 * menyunting apa pun. Yang diuji bukan "isian tersimpan", melainkan apakah
 * catatan yang SUDAH ada bisa dibaca dengan benar. Karena itu probe ini
 * membuat riwayatnya sendiri lebih dulu — satu nilai dibuat, diubah, lalu
 * dihapus, masing-masing diikuti Publish — dan sesudah tiap langkah
 * menanyakan apa yang muncul di Riwayat:
 *
 *   • menu sisi punya "Riwayat" di dasar, DI LUAR grup konten mana pun;
 *   • `/admin/riwayat` bertahan sesudah halaman dimuat ulang — pola rute generik
 *     `^/([a-z-]+)$` menolaknya lewat `siap()`, jadi tanpa cabang khusus ia
 *     mendarat di Beranda dan alamatnya berbohong;
 *   • perubahan yang BELUM ditekan Publish belum muncul, dan muncul begitu
 *     Publish ditekan — gerbang inilah yang paling mudah terbalik arah, dan
 *     kalau terbalik riwayatnya justru kehilangan masa lalunya tiap kali
 *     seseorang menyimpan sesuatu;
 *   • masuk panel dan Publish sendiri TIDAK pernah jadi baris;
 *   • Dibuat menampilkan isi barunya dengan kolom "Sebelum" kosong;
 *   • Diubah menampilkan judul LAMA di Sebelum dan judul BARU di Sesudah —
 *     ini inti seluruh layar, dan satu-satunya bagian yang tidak bisa
 *     dibuktikan test server sendirian;
 *   • "Terakhir diubah" TIDAK ikut jadi baris perbandingan, padahal ia
 *     berubah di setiap penyimpanan tanpa kecuali;
 *   • Dihapus menyimpan isi terakhirnya, jadi yang hilang masih bisa dibaca;
 *   • penyaring jenis konten benar-benar mempersempit daftarnya.
 *
 * Probe ini MENEKAN PUBLISH beberapa kali, jadi ia menulis `dist/content.json`
 * setempat dari isi database setempat — persis yang terjadi kalau tombolnya
 * ditekan orang. Nilai yang dibuatnya berstatus draf, jadi ia tidak pernah
 * ikut tayang di situs.
 *
 * Nilai yang dibuatnya DIHAPUS lagi di langkah terakhir, termasuk saat probe
 * gagal di tengah: nilai berjudul "Probe riwayat" yang tertinggal di panel
 * akan ikut tayang begitu ada orang lain menekan Publish. Baris audit-nya
 * sendiri memang tinggal, dan itu benar — riwayat adalah catatan bahwa hal
 * ini pernah terjadi, dan menghapusnya berarti membuang bukti.
 *
 * Prasyarat dua proses hidup: API :3001 dan admin :5174.
 * Brave, bukan Chrome — sama seperti seluruh skrip verifikasi di folder ini.
 */
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { rmSync, writeFileSync } from "node:fs";
import { tandaiAudit, sapuAudit } from "./lib/audit.mjs";

const BROWSER =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9241;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";

const JUDUL_AWAL = "Probe riwayat sebelum";
const JUDUL_BARU = "Probe riwayat sesudah";
const TAGLINE = "Baris pendek dari probe-riwayat-admin.mjs";

rmSync("/tmp/csi-riwayat-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-riwayat-probe",
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
  window.__klik = (teks) => {
    const b = [...document.querySelectorAll("button, summary")]
      .find((x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks));
    if (!b) throw new Error("tombol tidak ada: " + teks);
    b.click();
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
  window.__judulLayar = () => document.querySelector("h2")?.textContent.trim() ?? "";

  /** Penghapusan benar-benar selesai: dialognya tertutup DAN barisnya hilang
      dari daftar. Sengaja bukan menunggu kata "dihapus" muncul di halaman —
      kalimat di dalam dialog konfirmasinya sendiri memuat kata itu, jadi
      penantian seperti itu lolos seketika, sebelum servernya sempat menjawab.
      Yang terjadi berikutnya halus dan menyesatkan: selesai() di App
      memanggil pergi("/nilai") sesudah jawabannya tiba, jadi layar yang
      sudah sempat dipindah probe ditarik balik ke daftar nilai. */
  window.__terhapus = () =>
    !document.querySelector("dialog[open]") &&
    ![...document.querySelectorAll("tbody > tr")].some(
      (tr) => tr.innerText.includes("Probe riwayat"),
    );

  /* ── bilah Publish ────────────────────────────────────────────────── */

  /** Tombolnya dicari lewat kelas bilahnya, bukan lewat teksnya: kata
      "Publish" juga
      muncul di kalimat bilahnya sendiri dan di beberapa tombol layar lain.

      Kelas "utama" ikut dipakai, bukan cuma kelas bilahnya: sejak ada tombol "Review" di
      sebelah kirinya, tombol PERTAMA di bilah ini bukan lagi Publish — dan
      pemilih yang lama tetap menemukan sebuah tombol, menekannya, lalu
      menunggu sesuatu yang tidak akan pernah terjadi. */
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

  /* ── khusus layar riwayat ─────────────────────────────────────────── */

  /** Baris riwayat yang TERLIHAT, tanpa baris perbandingan yang sedang
      terbuka (yang itu punya className "riwayat-isi"). */
  window.__baris = () =>
    [...document.querySelectorAll("tbody > tr")]
      .filter((tr) => !tr.classList.contains("riwayat-isi"))
      .map((tr) => {
        const sel = [...tr.children].map((td) => td.innerText.trim());
        return {
          waktu: sel[0], siapa: sel[1], konten: sel[2], terjadi: sel[3],
          bisaDibuka: !!tr.querySelector("button"),
        };
      });

  /** Buka baris ke-i, lalu baca tabel perbandingannya sebagai
      { isian: {sebelum, sesudah} }. */
  window.__buka = (i) => {
    const tr = [...document.querySelectorAll("tbody > tr")]
      .filter((x) => !x.classList.contains("riwayat-isi"))[i];
    const b = tr.querySelector("button");
    if (!b) throw new Error("baris " + i + " tidak punya tombol Lihat");
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
  /** Riwayat benar-benar selesai memuat: kata "Memuat" sudah hilang, DAN
      layarnya sudah memutuskan mau menampilkan baris atau kalimat kosong.
      Menunggu tabelnya saja tidak cukup dan pernah menipu probe ini: layar
      yang sedang memuat sempat menggambar kepala tabel tanpa satu pun baris,
      dan setiap pemeriksaan jumlah baris lolos dengan nol. */
  window.__riwayatSiap = () =>
    !document.body.innerText.includes("Memuat") &&
    (!!document.querySelector("main table tbody tr") ||
     !!document.querySelector(".kosong"));

  /** Apakah nilai bikinan probe sudah muncul di daftar riwayat. Dicari lewat
      isi barisnya, bukan lewat nomor baris: riwayat mesin ini bisa saja sudah
      berisi perubahan lain milik orang yang memakainya. */
  window.__adaDiRiwayat = (judul) =>
    __baris().some((b) => b.terjadi.includes(judul)) ||
    [...document.querySelectorAll("tbody > tr")].some((tr) =>
      tr.innerText.includes(judul),
    );
  window.__pilihJenis = (label) => {
    const s = document.querySelector("select");
    const o = [...s.options].find((x) => x.textContent.trim() === label);
    if (!o) throw new Error("pilihan jenis tidak ada: " + label);
    const set = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype, "value").set;
    set.call(s, o.value);
    s.dispatchEvent(new Event("change", { bubbles: true }));
  };
`;

let bersihkan = null;
let tanda = null;

async function main() {
  /* Ditandai sebelum satu klik pun terjadi, supaya tidak ada baris probe yang
     lahir lebih dulu dari tandanya lalu tertinggal di riwayat. */
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
    writeFileSync(`/tmp/riwayat-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa) => {
    for (let i = 0; i < 40; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);
  const sama = (dapat, harap, apa) => {
    if (dapat !== harap) {
      throw new Error(`${apa}\n  dapat : ${JSON.stringify(dapat)}\n  harap : ${JSON.stringify(harap)}`);
    }
  };

  const bukaNilai = async () => {
    if ((await jalan(`__anak("People").length`)) === 0) {
      await jalan(`__bukaGrup("People")`);
      await tunggu(`__anak("People").length > 0`, "grup People terbuka");
    }
    await jalan(`__klikAnak("People", "Nilai")`);
    await tunggu(`__judulLayar() === "Nilai"`, "daftar nilai");
    await jalan(BEKAL);
  };

  /* Daftar riwayat BOLEH kosong, dan di mesin yang baru saja dikosongkan
     memang begitu. Yang ditunggu karena itu "selesai memuat" — tabelnya ada
     ATAU kalimat kosongnya ada — bukan "ada barisnya". */
  const bukaRiwayat = async () => {
    await jalan(`__klik("Riwayat")`);
    await tunggu(`__judulLayar() === "Riwayat"`, "layar riwayat");
    await tunggu(`__riwayatSiap()`, "riwayat selesai memuat");
    await jalan(BEKAL);

    /* Permintaan yang gagal terlihat SAMA PERSIS dengan riwayat kosong: layar
       menampilkan kalimat "belum ada perubahan" dan pemeriksaan jumlah baris
       lolos dengan nol. Pesan galatnya diperiksa di sini supaya kegagalan API
       tidak pernah lewat sebagai "kebetulan memang kosong". */
    const kabar = await jalan(
      `document.querySelector("main .kabar.tegas")?.innerText.trim() ?? ""`,
    );
    if (kabar) throw new Error(`riwayat gagal dimuat: ${kabar}`);
  };

  /** Tunggu baris teratas riwayat memperlihatkan aksi tertentu. Dipakai
      sesudah Publish: daftarnya memuat ulang sendiri, dan membacanya seketika
      berarti membaca keadaan sebelum muat ulang itu mulai. */
  const tungguTeratas = (aksi) =>
    tunggu(
      `__baris()[0] && __baris()[0].terjadi.startsWith(${JSON.stringify(aksi)})`,
      `baris teratas jadi "${aksi}"`,
    );

  /** Tekan Publish dan tunggu sampai benar-benar selesai. */
  const publish = async () => {
    await tunggu(`!__terpublish()`, "bilah Publish menyadari ada yang menunggu");
    await jalan(`__publish()`);
    await tunggu(`__terpublish()`, "publish selesai");
    await jalan(BEKAL);
  };

  let kotor = false;

  bersihkan = async () => {
    if (!kotor) return;
    await send("Page.navigate", { url: "http://localhost:5174/admin/nilai" });
    await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    await jalan(BEKAL);
    await bukaNilai();
    const ada = await jalan(`__teks().includes(${JSON.stringify(JUDUL_BARU)}) ||
                             __teks().includes(${JSON.stringify(JUDUL_AWAL)})`);
    if (!ada) {
      kotor = false;
      return;
    }
    await jalan(`
      (() => {
        const tr = [...document.querySelectorAll("tbody > tr")].find(
          (x) => x.innerText.includes(${JSON.stringify(JUDUL_BARU)}) ||
                 x.innerText.includes(${JSON.stringify(JUDUL_AWAL)}));
        [...tr.querySelectorAll("button")]
          .find((b) => b.textContent.trim() === "Hapus").click();
      })()
    `);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog hapus (pulih)");
    await jalan(`document.querySelector("dialog[open] button.utama").click()`);
    await tunggu(`__terhapus()`, "baris hilang dari daftar (pulih)");
    kotor = false;
    lapor("nilai probe dihapus, panel bersih seperti sebelum probe");
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

  /* 2 — "Riwayat" ada di dasar menu, DI LUAR grup konten. Kalau ia sampai
     masuk salah satu grup, `src/lib/contentMap.test.ts` yang menjaga menu ini
     tetap sama dengan navbar situs akan menuduh navbar-nya yang salah. */
  const dalamGrup = await jalan(`
    [...document.querySelectorAll(".sisi-anak button")]
      .some((b) => b.textContent.trim() === "Riwayat")
  `);
  if (dalamGrup) throw new Error("Riwayat ikut masuk grup konten di menu sisi");

  /* Dua baris terakhir, bukan satu: "Review" berdiri bersama Riwayat di dasar
     menu, dan garis pemisahnya pindah ke atasnya. Yang dijaga di sini tetap
     hal yang sama — keduanya ada DI LUAR grup konten dan dipisah dari grup
     terakhir oleh garis, bukan menempel di ujung salah satu halaman situs. */
  const dasar = await jalan(`
    [...document.querySelectorAll(".sisi-daftar > li")].slice(-2).map((li) => ({
      label: li.innerText.trim(),
      dipisah: li.classList.contains("sisi-pisah"),
    }))
  `);
  sama(
    dasar.map((d) => d.label).join(", "),
    "Review, Riwayat",
    "dua baris terakhir menu sisi",
  );
  if (!dasar[0].dipisah) {
    throw new Error("Review/Riwayat tidak dipisah garis dari grup konten");
  }
  lapor('menu sisi: "Review" lalu "Riwayat" di dasar, dipisah garis, di luar semua grup');

  /* 3 — layarnya terbuka. Probe ini BARU SAJA login, jadi kalau baris masuk
     bocor ke layar ia pasti ada di paling atas. */
  await bukaRiwayat();
  const awal = await jalan(`__baris()`);
  const bocor = awal.filter(
    (b) => b.konten === "Masuk panel" || b.konten === "Publish" ||
           b.terjadi.startsWith("Masuk") || b.terjadi.startsWith("Dipublish"),
  );
  if (bocor.length) {
    throw new Error(`baris bukan konten ikut tampil: ${JSON.stringify(bocor[0])}`);
  }
  await potret("1-daftar");
  lapor(`layar Riwayat terbuka, ${awal.length} baris, tanpa baris Masuk maupun Publish`);

  /* 4 — `/admin/riwayat` bertahan sesudah muat ulang. Ini yang dulu jatuh ke
     Beranda: "riwayat" bukan entri konten, jadi penjaga `siap()` di
     `bacaRute` menolaknya dan alamatnya jadi berbohong. */
  sama(
    await jalan(`location.pathname`),
    "/admin/riwayat",
    "alamat sesudah membuka Riwayat",
  );
  await send("Page.navigate", { url: "http://localhost:5174/admin/riwayat" });
  await send("Page.loadEventFired");
  await send("Page.reload");
  /* Ditunggu SAMPAI halaman baru selesai dimuat lebih dulu, bukan langsung
     memeriksa judulnya: dokumen LAMA masih berdiri beberapa puluh milidetik
     sesudah `Page.reload` dijawab, dan judul yang dicari sudah ada di sana —
     pemeriksaan lolos di dokumen yang sebentar lagi dibuang, lalu langkah
     berikutnya menemukan panel yang belum sempat menggambar apa-apa.
     Bekal ikut hilang bersama dokumen lamanya, jadi kedua pemeriksaan ini
     ditulis tanpa bantuan apa pun. `window.__x?.()` pun tidak menolong:
     pengenal yang belum pernah dideklarasikan melempar ReferenceError sebelum
     optional chaining sempat bekerja. */
  await sleep(500);
  await tunggu(
    `document.querySelectorAll(".sisi-daftar > li").length > 0 &&
     document.querySelector("main h2")?.textContent.trim() === "Riwayat"`,
    "riwayat bertahan sesudah muat ulang",
  );
  await jalan(BEKAL);
  lapor("/admin/riwayat bertahan sesudah halaman dimuat ulang, tidak jatuh ke Beranda");

  /* 5 — buat satu nilai, lalu tanya riwayatnya */
  await bukaNilai();
  await jalan(`__klik("+ Tambah nilai")`);
  await tunggu(`!!document.querySelector("form")`, "form nilai");
  await jalan(BEKAL);
  kotor = true;
  await jalan(`__isi("Judul", ${JSON.stringify(JUDUL_AWAL)})`);
  await jalan(`__isi("Baris pendek", ${JSON.stringify(TAGLINE)})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__judulLayar() === "Nilai"`, "kembali ke daftar nilai");
  await jalan(BEKAL);

  /* Belum ditekan Publish: perubahannya belum sampai ke pengunjung, jadi ia
     belum boleh muncul. Bilah di bawah yang memberitahu editor bahwa ada yang
     menunggu; riwayat menjawab pertanyaan lain. */
  await bukaRiwayat();
  if (await jalan(`__adaDiRiwayat(${JSON.stringify(JUDUL_AWAL)})`)) {
    throw new Error("nilai yang belum dipublish sudah muncul di riwayat");
  }
  await potret("2-belum-publish");
  lapor("nilai baru disimpan tapi BELUM dipublish: belum muncul di riwayat");

  /* 6 — Publish ditekan, barulah ia masuk riwayat. */
  await publish();
  await bukaRiwayat();
  await tungguTeratas("Dibuat");
  const sesudahBuat = await jalan(`__baris()`);
  sama(sesudahBuat[0].konten, "Nilai", "kolom Konten sesudah membuat nilai");
  if (!sesudahBuat[0].terjadi.startsWith("Dibuat")) {
    throw new Error(`baris teratas bukan "Dibuat": ${JSON.stringify(sesudahBuat[0])}`);
  }
  if (!sesudahBuat[0].siapa || sesudahBuat[0].siapa === "—") {
    throw new Error("kolom Siapa kosong padahal editornya sedang login");
  }

  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingBuat = await jalan(`__banding()`);
  sama(bandingBuat["Judul"]?.sebelum, "kosong", "kolom Sebelum saat Dibuat");
  sama(bandingBuat["Judul"]?.sesudah, JUDUL_AWAL, "kolom Sesudah saat Dibuat");
  await potret("3-dibuat");
  lapor('sesudah Publish ditekan: baris "Dibuat" muncul, kolom Sebelum kosong');

  /* 7 — ubah judulnya. Inilah yang sebenarnya diminta: perbandingan sebelum
     dan sesudah, di layar, tanpa membuka database. */
  await bukaNilai();
  await jalan(`
    (() => {
      const tr = [...document.querySelectorAll("tbody > tr")].find(
        (x) => x.innerText.includes(${JSON.stringify(JUDUL_AWAL)}));
      if (!tr) throw new Error("nilai probe tidak ada di daftar");
      [...tr.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Ubah").click();
    })()
  `);
  await tunggu(`!!document.querySelector("form")`, "form ubah nilai");
  await jalan(BEKAL);
  await jalan(`__isi("Judul", ${JSON.stringify(JUDUL_BARU)})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__judulLayar() === "Nilai"`, "kembali ke daftar nilai");
  await jalan(BEKAL);

  /* Sekali lagi gerbangnya, kali ini dengan riwayat yang SUDAH berisi: yang
     lama harus tetap berdiri sementara yang baru menunggu. Gerbang yang salah
     arah terlihat di sini, bukan di langkah 5 — di sana daftar kosong terlihat
     sama saja apa pun arahnya. */
  await bukaRiwayat();
  const tertahan = await jalan(`__baris()`);
  if (!tertahan[0].terjadi.startsWith("Dibuat")) {
    throw new Error(
      `perubahan yang belum dipublish sudah menggeser baris teratas: ${JSON.stringify(tertahan[0])}`,
    );
  }
  lapor("perubahan berikutnya menunggu Publish, dan yang lama tetap berdiri");

  /* Publish ditekan SAMBIL berdiri di layar riwayat, bukan dari layar lain.
     Daftarnya harus menyegarkan diri sendiri; kalau ia menunggu layarnya
     ditinggalkan dulu, editor yang baru menekan Publish melihat daftar yang
     diam dan menyimpulkan perubahannya tidak tercatat. */
  await publish();
  await bukaRiwayat();
  await tungguTeratas("Diubah");
  const sesudahUbah = await jalan(`__baris()`);
  if (!sesudahUbah[0].terjadi.startsWith("Diubah")) {
    throw new Error(`baris teratas bukan "Diubah": ${JSON.stringify(sesudahUbah[0])}`);
  }
  /* Cuma judulnya yang disentuh, jadi ringkasannya menyebut nama isiannya —
     bukan "1 isian". */
  if (!sesudahUbah[0].terjadi.includes("judul")) {
    throw new Error(`ringkasan tidak menyebut isian yang berubah: ${sesudahUbah[0].terjadi}`);
  }

  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingUbah = await jalan(`__banding()`);
  sama(bandingUbah["Judul"]?.sebelum, JUDUL_AWAL, "kolom Sebelum saat Diubah");
  sama(bandingUbah["Judul"]?.sesudah, JUDUL_BARU, "kolom Sesudah saat Diubah");
  sama(Object.keys(bandingUbah).join(", "), "Judul", "isian yang muncul di perbandingan");
  await potret("4-diubah");
  lapor(`Diubah: "${JUDUL_AWAL}" → "${JUDUL_BARU}", dan HANYA judul yang jadi baris`);

  /* 8 — "Baris pendek" tidak disentuh, jadi ia tidak boleh muncul; begitu
     juga "Terakhir diubah", yang berubah di SETIAP penyimpanan dan akan
     muncul di seratus persen baris kalau ikut dibandingkan. */
  for (const jangan of ["Baris pendek", "Terakhir diubah", "updatedAt", "id"]) {
    if (jangan in bandingUbah) {
      throw new Error(`"${jangan}" ikut muncul di perbandingan padahal tidak berubah`);
    }
  }
  lapor("isian yang tidak berubah dan isian pembukuan tidak ikut jadi baris");

  /* 9 — penyaring jenis konten */
  await jalan(`__pilihJenis("Nilai")`);
  await tunggu(
    `__baris().length > 0 && __baris().every((b) => b.konten === "Nilai")`,
    "daftar tersaring ke Nilai saja",
  );
  await jalan(BEKAL);
  const tersaring = await jalan(`__baris().length`);
  await potret("5-tersaring");
  lapor(`penyaring "Nilai" menyisakan ${tersaring} baris, semuanya Nilai`);

  /* 10 — hapus, dan pastikan isi terakhirnya masih terbaca sesudah barisnya
     hilang dari panel. Ini alasan riwayat ada: yang dihapus tidak bisa
     ditanyakan lagi ke daftar mana pun. */
  await bukaNilai();
  await jalan(`
    (() => {
      const tr = [...document.querySelectorAll("tbody > tr")].find(
        (x) => x.innerText.includes(${JSON.stringify(JUDUL_BARU)}));
      [...tr.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Hapus").click();
    })()
  `);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog hapus");
  await jalan(`document.querySelector("dialog[open] button.utama").click()`);
  await tunggu(`__terhapus()`, "baris hilang dari daftar");
  kotor = false;
  await jalan(BEKAL);

  await publish();
  await bukaRiwayat();
  await tungguTeratas("Dihapus");
  const sesudahHapus = await jalan(`__baris()`);
  if (!sesudahHapus[0].terjadi.startsWith("Dihapus")) {
    throw new Error(`baris teratas bukan "Dihapus": ${JSON.stringify(sesudahHapus[0])}`);
  }
  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingHapus = await jalan(`__banding()`);
  sama(bandingHapus["Judul"]?.sebelum, JUDUL_BARU, "isi terakhir yang dihapus");
  sama(bandingHapus["Judul"]?.sesudah, "kosong", "kolom Sesudah saat Dihapus");
  await potret("6-dihapus");
  lapor("Dihapus: isi terakhirnya masih terbaca walau barisnya sudah hilang dari panel");

  /* 11 — tidak ada satu pun tombol yang bisa menyunting dari layar ini.
     Riwayat yang bisa disunting dari panel yang sama dengan yang mencatatnya
     berhenti bisa dipakai menjawab "siapa yang mengubah ini". */
  const tombol = await jalan(`
    [...document.querySelector("main").querySelectorAll("button")]
      .map((b) => b.textContent.trim())
      .filter((t) => /simpan|hapus|tambah|ubah|urut|naik|turun/i.test(t))
  `);
  if (tombol.length) {
    throw new Error(`layar riwayat punya tombol penyunting: ${tombol.join(", ")}`);
  }
  lapor("layar riwayat tidak punya satu pun tombol yang mengubah data");

  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/riwayat-*.png");
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
        `⚠ nilai "${JUDUL_AWAL}"/"${JUDUL_BARU}" TERTINGGAL di panel, hapus manual: ${lagi.message}`,
      );
    }
  })
  .finally(async () => {
    /* Sesudah `bersihkan()`, bukan sebelumnya: pemulihan itu menghapus nilai
       probe lewat panel dan penghapusan itu sendiri menambah baris audit. */
    await sapuAudit(tanda);
    brave.kill();
  });

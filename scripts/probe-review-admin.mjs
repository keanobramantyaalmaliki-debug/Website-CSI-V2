/**
 * Jalan-jalan panel admin untuk REVIEW.
 *
 *   node scripts/probe-review-admin.mjs
 *
 * Layar Review menjawab satu pertanyaan yang sebelum ini tidak punya jawaban
 * di mana pun: "apa saja yang akan berubah di situs kalau Publish ditekan
 * sekarang". Yang ada cuma ANGKA di bilah bawah, dan angka itu memaksa editor
 * membuka dua belas layar entitas satu per satu untuk mencari mana yang
 * bertanda belum terpublish.
 *
 * Kembarannya layar Riwayat dengan gerbang dibalik, jadi yang diperiksa di
 * sini persis hal-hal yang tidak bisa dibuktikan test server sendirian:
 *
 *   • tombol "Review" duduk PERSIS di sebelah Publish, di bilah yang sama —
 *     di situlah pertanyaannya muncul, satu detik sebelum tombolnya ditekan;
 *   • "Review" juga ada di dasar menu sisi, di luar grup konten mana pun;
 *   • `/admin/review` bertahan sesudah halaman dimuat ulang — pola rute generik
 *     `^/([a-z-]+)$` menolaknya lewat `siap()`, jadi tanpa cabang khusus ia
 *     mendarat di Beranda dan alamatnya berbohong;
 *   • yang belum ditekan Publish MUNCUL di sini (kebalikan Riwayat), dan
 *     hilang begitu Publish ditekan;
 *   • daftarnya menyegarkan diri sendiri saat Publish ditekan DARI layar ini,
 *     bukan menunggu layarnya ditinggalkan dulu;
 *   • dua penyimpanan atas benda yang sama tetap SATU baris, dan
 *     pembandingnya keadaan sewaktu Publish terakhir — bukan keadaan sesaat
 *     sebelum penyimpanan terakhir, yang tidak pernah dilihat pengunjung;
 *   • tombol "Buka" benar-benar mendarat di form benda itu, bukan di Beranda;
 *   • penghapusan yang belum dipublish terbaca "masih tayang sampai Publish";
 *   • tombol "Batalkan" per baris mengembalikan SATU konten ke keadaan yang
 *     sekarang tayang, dan yang dikembalikan itu keadaan TAYANG bukan draf
 *     terakhir — bedanya cuma kelihatan lewat panel, karena test server tidak
 *     bisa membuktikan form-nya benar-benar memuat judul lama;
 *   • sesudah pembatalan, DUA penghitung sama-sama berhenti menghitung:
 *     daftar Review kosong dan tombol Publish mati. Keduanya dihitung dari
 *     sumber yang berbeda (baris audit vs cap waktu baris), jadi yang satu
 *     beres tidak berarti yang lain ikut.
 *
 * Probe ini MENEKAN PUBLISH beberapa kali, jadi ia menulis `dist/content.json`
 * setempat dari isi database setempat — persis yang terjadi kalau tombolnya
 * ditekan orang. Nilai yang dibuatnya berstatus draf, jadi ia tidak pernah
 * ikut tayang di situs, dan dihapus lagi di langkah terakhir termasuk saat
 * probe gagal di tengah.
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
const PORT = 9243;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";

const JUDUL_AWAL = "Probe review sebelum";
const JUDUL_BARU = "Probe review sesudah";
const TAGLINE = "Baris pendek dari probe-review-admin.mjs";
const TAGLINE_BARU = "Baris pendek yang disunting kedua kalinya";
const JUDUL_KEDUA = "Probe review nilai kedua";

rmSync("/tmp/csi-review-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-review-probe",
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
  window.__judulLayar = () => document.querySelector("main h2")?.textContent.trim() ?? "";

  window.__terhapus = () =>
    !document.querySelector("dialog[open]") &&
    ![...document.querySelectorAll("tbody > tr")].some(
      (tr) => tr.innerText.includes("Probe review"),
    );

  /* ── bilah bawah ──────────────────────────────────────────────────── */

  /** Isi kotak tombol di bilah bawah, terurut kiri ke kanan. Yang diperiksa
      probe ini bukan sekadar "tombol Review ada", melainkan bahwa ia BERSEBELAHAN
      dengan Publish — permintaannya memang tentang letak. */
  window.__tombolBar = () =>
    [...document.querySelectorAll(".bar .bar-tombol button")].map((b) => ({
      teks: b.textContent.trim(),
      mati: b.disabled,
    }));
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

  /* ── khusus layar review ──────────────────────────────────────────── */

  window.__baris = () =>
    [...document.querySelectorAll("main tbody > tr")]
      .filter((tr) => !tr.classList.contains("riwayat-isi"))
      .map((tr) => {
        const sel = [...tr.children].map((td) => td.innerText.trim());
        return {
          konten: sel[0], judul: sel[1], terjadi: sel[2],
          waktu: sel[3], siapa: sel[4],
          tombol: [...tr.querySelectorAll("button")].map((b) => b.textContent.trim()),
        };
      });
  window.__cariBaris = (judul) =>
    __baris().findIndex((b) => b.judul.includes(judul));
  window.__buka = (i) => {
    const tr = [...document.querySelectorAll("main tbody > tr")]
      .filter((x) => !x.classList.contains("riwayat-isi"))[i];
    if (!tr) throw new Error("baris " + i + " tidak ada");
    [...tr.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Lihat").click();
  };
  window.__bukaForm = (i) => {
    const tr = [...document.querySelectorAll("main tbody > tr")]
      .filter((x) => !x.classList.contains("riwayat-isi"))[i];
    const b = [...tr.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Buka");
    if (!b) throw new Error("baris " + i + " tidak punya tombol Buka");
    b.click();
  };
  window.__batalBaris = (i) => {
    const tr = [...document.querySelectorAll("main tbody > tr")]
      .filter((x) => !x.classList.contains("riwayat-isi"))[i];
    if (!tr) throw new Error("baris " + i + " tidak ada");
    const b = [...tr.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Batalkan");
    if (!b) throw new Error("baris " + i + " tidak punya tombol Batalkan");
    b.click();
  };
  window.__dialog = () => {
    const d = document.querySelector("dialog[open]");
    if (!d) return null;
    return {
      teks: d.innerText.trim(),
      tombol: [...d.querySelectorAll("button")].map((b) => b.textContent.trim()),
    };
  };
  window.__yaBatal = () =>
    document.querySelector("dialog[open] button.utama").click();
  window.__kabar = () =>
    document.querySelector("main .kabar:not(.tegas)")?.innerText.trim() ?? "";
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
  /** Selesai memuat: kata "Memuat" hilang, DAN layarnya sudah memutuskan mau
      menggambar baris atau kalimat kosong. Menunggu tabelnya saja pernah
      menipu probe sejenis: layar yang sedang memuat sempat menggambar kepala
      tabel tanpa satu pun baris, dan tiap pemeriksaan jumlah lolos dengan
      nol. */
  window.__reviewSiap = () =>
    !document.body.innerText.includes("Memuat") &&
    (!!document.querySelector("main table tbody tr") ||
     !!document.querySelector("main .kosong"));
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
    writeFileSync(`/tmp/review-${nama}.png`, Buffer.from(data, "base64"));
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
  const memuat = (teks, bagian, apa) => {
    if (!String(teks).includes(bagian)) {
      throw new Error(`${apa}\n  dapat : ${JSON.stringify(teks)}\n  harus memuat : ${JSON.stringify(bagian)}`);
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

  const bukaReview = async () => {
    await jalan(`__reviewDariBar()`);
    await tunggu(`__judulLayar() === "Review"`, "layar review");
    await tunggu(`__reviewSiap()`, "review selesai memuat");
    await jalan(BEKAL);

    /* Permintaan yang gagal terlihat SAMA PERSIS dengan "tidak ada yang
       menunggu": kalimat kosongnya muncul dan tiap pemeriksaan jumlah baris
       lolos dengan nol. */
    const kabar = await jalan(
      `document.querySelector("main .kabar.tegas")?.innerText.trim() ?? ""`,
    );
    if (kabar) throw new Error(`review gagal dimuat: ${kabar}`);
  };

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
    const ada = await jalan(`__teks().includes("Probe review")`);
    if (!ada) {
      kotor = false;
      return;
    }
    await jalan(`
      (() => {
        const tr = [...document.querySelectorAll("tbody > tr")].find(
          (x) => x.innerText.includes("Probe review"));
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

  /* 2 — inti permintaannya: tombolnya duduk di SEBELAH Publish. Ditulis
     sebagai urutan, bukan sekadar keberadaan — tombol Review yang benar tapi
     mendarat di ujung lain bilah tidak menjawab apa pun. */
  const tombolBar = await jalan(`__tombolBar()`);
  sama(
    tombolBar.map((t) => t.teks).join(", "),
    "Review, Publish",
    "urutan tombol di bilah bawah",
  );
  lapor('bilah bawah: "Review" persis di sebelah kiri "Publish"');

  /* 3 — "Review" juga ada di dasar menu sisi, di luar grup konten mana pun.
     Kalau ia masuk salah satu grup, `src/lib/contentMap.test.ts` yang menjaga
     menu ini tetap sama dengan navbar situs akan menuduh navbar-nya salah. */
  const dalamGrup = await jalan(`
    [...document.querySelectorAll(".sisi-anak button")]
      .some((b) => b.textContent.trim() === "Review")
  `);
  if (dalamGrup) throw new Error("Review ikut masuk grup konten di menu sisi");

  const dasar = await jalan(`
    [...document.querySelectorAll(".sisi-daftar > li")].slice(-2).map((li) => ({
      label: li.innerText.trim(),
      dipisah: li.classList.contains("sisi-pisah"),
    }))
  `);
  sama(dasar.map((d) => d.label).join(", "), "Review, Riwayat", "dua baris terakhir menu sisi");
  if (!dasar[0].dipisah) throw new Error("Review tidak dipisah garis dari grup konten");
  lapor('menu sisi: "Review" lalu "Riwayat" di dasar, dipisah garis, di luar semua grup');

  /* 4 — mulai dari keadaan bersih. Kalau mesin ini masih menyimpan perubahan
     dari pekerjaan lain, ditayangkan dulu — probe ini menghitung baris, dan
     baris milik orang lain membuat tiap angka di bawah tidak bisa dipercaya. */
  await bukaReview();
  if (!(await jalan(`__terpublish()`))) {
    await publish();
    await bukaReview();
  }
  await tunggu(`!!document.querySelector("main .kosong")`, "layar Review kosong");
  memuat(
    await jalan(`document.querySelector("main .kosong").innerText`),
    "sudah terpublish",
    "kalimat saat tidak ada yang menunggu",
  );
  await potret("1-kosong");
  lapor("tidak ada yang menunggu: layar Review bilang semuanya sudah terpublish");

  /* 5 — `/admin/review` bertahan sesudah muat ulang. Ini yang akan jatuh ke
     Beranda kalau cabang khususnya di `bacaRute` hilang: "review" bukan entri
     konten, jadi penjaga `siap()` menolaknya. */
  sama(
    await jalan(`location.pathname`),
    "/admin/review",
    "alamat sesudah membuka Review",
  );
  await send("Page.navigate", { url: "http://localhost:5174/admin/review" });
  await send("Page.reload");
  /* Ditunggu SAMPAI dokumen barunya berdiri: dokumen lama masih ada beberapa
     puluh milidetik sesudah `Page.reload` dijawab, dan judul yang dicari
     sudah ada di sana. Bekal ikut hilang bersamanya, jadi pemeriksaan ini
     ditulis tanpa bantuan apa pun — `window.__x?.()` pun tidak menolong,
     pengenal yang belum dideklarasikan melempar ReferenceError sebelum
     optional chaining sempat bekerja. */
  await sleep(500);
  await tunggu(
    `document.querySelectorAll(".sisi-daftar > li").length > 0 &&
     document.querySelector("main h2")?.textContent.trim() === "Review"`,
    "review bertahan sesudah muat ulang",
  );
  await jalan(BEKAL);
  lapor("/admin/review bertahan sesudah halaman dimuat ulang, tidak jatuh ke Beranda");

  /* 6 — buat satu nilai, JANGAN dipublish. Inilah kebalikan gerbang Riwayat:
     yang belum tayang justru yang harus muncul. */
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

  await bukaReview();
  const sesudahBuat = await jalan(`__baris()`);
  sama(sesudahBuat.length, 1, "jumlah baris sesudah membuat satu nilai");
  sama(sesudahBuat[0].konten, "Nilai", "kolom Konten");
  sama(sesudahBuat[0].judul, JUDUL_AWAL, "kolom Yang berubah");
  memuat(sesudahBuat[0].terjadi, "Dibuat", "penanda aksi");
  memuat(sesudahBuat[0].terjadi, "belum pernah tayang", "ringkasan untuk yang baru dibuat");
  if (!sesudahBuat[0].siapa || sesudahBuat[0].siapa === "—") {
    throw new Error("kolom Siapa kosong padahal editornya sedang login");
  }
  await potret("2-dibuat");
  lapor('nilai baru yang BELUM dipublish muncul di Review sebagai "Dibuat"');

  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingBuat = await jalan(`__banding()`);
  sama(bandingBuat["Judul"]?.sebelum, "kosong", "kolom Sebelum saat Dibuat");
  sama(bandingBuat["Judul"]?.sesudah, JUDUL_AWAL, "kolom Sesudah saat Dibuat");
  lapor("perbandingannya terbuka: kolom Sebelum kosong, Sesudah berisi isi barunya");

  /* 7 — Publish ditekan SAMBIL berdiri di layar Review. Daftarnya harus
     mengosongkan dirinya sendiri; kalau ia menunggu layarnya ditinggalkan
     dulu, editor yang baru menekan Publish melihat daftar yang tidak berubah
     dan menyimpulkan tombolnya tidak bekerja. */
  await publish();
  await tunggu(`!!document.querySelector("main .kosong")`, "daftar Review mengosongkan diri");
  sama(await jalan(`__judulLayar()`), "Review", "masih di layar Review sesudah Publish");
  await potret("3-sesudah-publish");
  lapor("Publish ditekan dari layar Review: daftarnya mengosongkan diri sendiri");

  /* 8 — sunting DUA KALI. Satu benda, satu baris — bukan dua. Dan
     pembandingnya keadaan sewaktu Publish terakhir, bukan keadaan sesaat
     sebelum penyimpanan terakhir: yang di tengah tidak pernah dilihat
     pengunjung, jadi menampilkannya menjawab pertanyaan yang tidak ditanya
     siapa pun. */
  const ubahNilai = async (isian) => {
    await bukaNilai();
    await jalan(`
      (() => {
        const tr = [...document.querySelectorAll("tbody > tr")].find(
          (x) => x.innerText.includes("Probe review"));
        if (!tr) throw new Error("nilai probe tidak ada di daftar");
        [...tr.querySelectorAll("button")]
          .find((b) => b.textContent.trim() === "Ubah").click();
      })()
    `);
    await tunggu(`!!document.querySelector("form")`, "form ubah nilai");
    await jalan(BEKAL);
    for (const [label, nilai] of isian) {
      await jalan(`__isi(${JSON.stringify(label)}, ${JSON.stringify(nilai)})`);
    }
    await jalan(`__klik("Simpan")`);
    await tunggu(`__judulLayar() === "Nilai"`, "kembali ke daftar nilai");
    await jalan(BEKAL);
  };

  await ubahNilai([["Judul", JUDUL_BARU]]);
  await bukaReview();
  const sekali = await jalan(`__baris()`);
  sama(sekali.length, 1, "jumlah baris sesudah satu suntingan");
  memuat(sekali[0].terjadi, "Diubah", "penanda aksi");
  /* Cuma judulnya yang disentuh, jadi ringkasannya menyebut nama isiannya,
     bukan "1 isian". */
  memuat(sekali[0].terjadi, "judul", "ringkasan menyebut isian yang berubah");

  await ubahNilai([["Baris pendek", TAGLINE_BARU]]);
  await bukaReview();
  const duaKali = await jalan(`__baris()`);
  sama(duaKali.length, 1, "dua penyimpanan atas benda yang sama tetap satu baris");
  memuat(duaKali[0].terjadi, "disimpan 2 kali", "ringkasan menyebut berapa kali disimpan");
  memuat(duaKali[0].terjadi, "2 isian", "ringkasan menyebut jumlah isian yang berubah");

  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingUbah = await jalan(`__banding()`);
  sama(bandingUbah["Judul"]?.sebelum, JUDUL_AWAL, "Sebelum = keadaan sewaktu Publish terakhir");
  sama(bandingUbah["Judul"]?.sesudah, JUDUL_BARU, "Sesudah = keadaan sekarang");
  sama(bandingUbah["Baris pendek"]?.sesudah, TAGLINE_BARU, "isian kedua ikut terbaca");
  /* "Terakhir diubah" berubah di SETIAP penyimpanan tanpa kecuali, jadi ia
     akan muncul di seratus persen baris kalau ikut dibandingkan. */
  for (const jangan of ["Terakhir diubah", "updatedAt", "id"]) {
    if (jangan in bandingUbah) {
      throw new Error(`"${jangan}" ikut jadi baris perbandingan padahal isian pembukuan`);
    }
  }
  await potret("4-dua-suntingan");
  lapor("dua suntingan = satu baris, dibandingkan dari keadaan terakhir yang tayang");

  /* 9 — tombol "Buka". Alasan seluruh layar ini ada adalah supaya editor
     tidak perlu mencari lokasi kontennya satu per satu; tombol yang mendarat
     di Beranda mengembalikan persis kerepotan itu. */
  await jalan(`__bukaForm(0)`);
  await tunggu(`!!document.querySelector("form")`, "form nilai terbuka dari Review");
  await jalan(BEKAL);
  const alamatBuka = await jalan(`location.pathname`);
  if (!/^\/admin\/nilai\/ubah\/.+/.test(alamatBuka)) {
    throw new Error(`tombol Buka mendarat di alamat yang salah: ${alamatBuka}`);
  }
  const judulForm = await jalan(
    `document.querySelector('form input')?.value ?? ""`,
  );
  sama(judulForm, JUDUL_BARU, "isian judul di form yang dibuka dari Review");
  await potret("5-buka-form");
  lapor(`tombol "Buka" mendarat tepat di form nilai itu (${alamatBuka})`);

  /* 10 — penghapusan yang belum dipublish. Kalimatnya sengaja beda dari
     Riwayat: di sana "isi terakhirnya masih bisa dilihat", di sini yang perlu
     diketahui editor justru bahwa isinya MASIH terlihat pengunjung sampai
     Publish ditekan. */
  await bukaNilai();
  await jalan(`
    (() => {
      const tr = [...document.querySelectorAll("tbody > tr")].find(
        (x) => x.innerText.includes("Probe review"));
      [...tr.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Hapus").click();
    })()
  `);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog hapus");
  await jalan(`document.querySelector("dialog[open] button.utama").click()`);
  await tunggu(`__terhapus()`, "baris hilang dari daftar");
  kotor = false;
  await jalan(BEKAL);

  await bukaReview();
  const sesudahHapus = await jalan(`__baris()`);
  sama(sesudahHapus.length, 1, "jumlah baris sesudah menghapus");
  memuat(sesudahHapus[0].terjadi, "Dihapus", "penanda aksi");
  memuat(sesudahHapus[0].terjadi, "masih tayang sampai Publish", "ringkasan untuk yang dihapus");
  /* Dua suntingan tadi TIDAK terpisah dari penghapusan ini: ketiganya satu
     benda yang sama dan sama-sama belum dipublish, jadi satu baris, tiga kali
     simpan. */
  memuat(sesudahHapus[0].terjadi, "disimpan 3 kali", "suntingan ikut lebur ke baris penghapusan");
  /* Kolom "Yang berubah" menamai BENDANYA, jadi ia pakai nama terbarunya
     sekalipun nama itu belum pernah tayang: kalau ia memakai nama lama,
     editor yang barusan mengganti judul lalu menghapusnya tidak akan
     mengenali baris ini sebagai pekerjaannya sendiri. */
  sama(sesudahHapus[0].judul, JUDUL_BARU, "nama terbaru dipakai untuk menamai baris");
  /* Yang sudah dihapus tidak punya form lagi, jadi tombol "Buka" boleh ada
     tapi tidak boleh menjanjikan form: ia menuju daftar. */
  await jalan(`__buka(0)`);
  await tunggu(`!!document.querySelector("table.banding")`, "tabel perbandingan");
  await jalan(BEKAL);
  const bandingHapus = await jalan(`__banding()`);
  /* Yang muncul di kolom Sebelum adalah JUDUL_AWAL, bukan JUDUL_BARU — dan
     itu justru inti layar ini. Pertanyaannya "apa yang berubah di SITUS kalau
     Publish ditekan", dan yang ada di situs sekarang masih judul lama;
     JUDUL_BARU cuma pernah ada di database, tidak pernah dilihat pengunjung.
     Menampilkannya di sini akan mengaku-ngaku ada isi yang hilang padahal
     tidak pernah tayang. */
  sama(bandingHapus["Judul"]?.sebelum, JUDUL_AWAL, "yang hilang = yang sekarang TAYANG, bukan draf terakhir");
  sama(bandingHapus["Judul"]?.sesudah, "kosong", "kolom Sesudah saat Dihapus");
  await potret("6-dihapus");
  lapor("penghapusan yang belum dipublish dibandingkan dengan yang MASIH tayang");

  /* 11 — "Batalkan" pada penghapusan. Yang dibuktikan di sini bukan cuma
     bahwa bendanya kembali, melainkan bahwa yang kembali adalah keadaan yang
     SEKARANG TAYANG (JUDUL_AWAL), bukan draf terakhir sebelum dihapus
     (JUDUL_BARU). Dua suntingan tadi ikut hangus bersama penghapusannya,
     karena ketiganya satu kelompok yang sama, dan itu memang yang dijanjikan
     kalimat dialognya. */
  const dialogHapus = await (async () => {
    await jalan(`__batalBaris(0)`);
    await tunggu(`!!__dialog()`, "dialog konfirmasi pembatalan");
    return jalan(`__dialog()`);
  })();
  memuat(dialogHapus.teks, "Batalkan penghapusan?", "judul dialog pembatalan");
  /* Tombolnya sengaja BUKAN "Ya, batalkan": tombol mundur milik dialog itu
     sendiri sudah bernama "Batal", dan dua kata yang sama bersebelahan dengan
     arti berlawanan adalah cara paling cepat menekan yang salah. Urutannya
     ikut diperiksa karena tombol pengiya duduk DULUAN di seluruh dialog
     panel; yang tertukar di satu layar saja melatih tangan yang salah. */
  sama(
    dialogHapus.tombol.join(", "),
    "Ya, kembalikan, Batal",
    "tombol di dialog pembatalan penghapusan",
  );
  await potret("7-dialog-batal");

  await jalan(`__yaBatal()`);
  await tunggu(`!__dialog()`, "dialog tertutup");
  await tunggu(`!!document.querySelector("main .kosong")`, "daftar Review kosong lagi");
  memuat(await jalan(`__kabar()`), "dikembalikan ke daftar", "kalimat sesudah berhasil");
  /* Penghitung KEDUA. Daftar Review membaca baris audit, tombol Publish
     membaca cap waktu baris; yang satu beres tidak berarti yang lain ikut,
     dan editor yang melihat "0 menunggu" berdampingan dengan tombol Publish
     yang masih hidup tidak punya cara menebak mana yang benar. */
  await tunggu(`__terpublish()`, "tombol Publish mati lagi");
  lapor("Batalkan pada penghapusan: baris hilang DAN tombol Publish ikut mati");

  await bukaNilai();
  kotor = true;
  const judulPulih = await jalan(`
    [...document.querySelectorAll("tbody > tr")]
      .filter((tr) => tr.innerText.includes("Probe review"))
      .map((tr) => tr.children[1].innerText.trim())
  `);
  sama(judulPulih.join(", "), JUDUL_AWAL, "nilai kembali dengan judul yang TAYANG");
  await potret("8-pulih");
  lapor(`nilainya kembali ke daftar dengan judul yang tayang ("${JUDUL_AWAL}"), bukan draf terakhirnya`);

  /* 12 — inti permintaannya: per konten, bukan semua sekaligus. Dua perubahan
     berdiri berdampingan, satu dibatalkan, yang satunya harus tetap utuh dan
     tetap menunggu Publish. */
  await ubahNilai([["Judul", JUDUL_BARU]]);
  await bukaNilai();
  await jalan(`__klik("+ Tambah nilai")`);
  await tunggu(`!!document.querySelector("form")`, "form nilai kedua");
  await jalan(BEKAL);
  await jalan(`__isi("Judul", ${JSON.stringify(JUDUL_KEDUA)})`);
  await jalan(`__isi("Baris pendek", ${JSON.stringify(TAGLINE)})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__judulLayar() === "Nilai"`, "kembali ke daftar nilai");
  await jalan(BEKAL);

  await bukaReview();
  sama((await jalan(`__baris()`)).length, 2, "dua perubahan menunggu sekaligus");
  const iKedua = await jalan(`__cariBaris(${JSON.stringify(JUDUL_KEDUA)})`);
  if (iKedua < 0) throw new Error("baris nilai kedua tidak ketemu di Review");
  await jalan(`__batalBaris(${iKedua})`);
  await tunggu(`!!__dialog()`, "dialog pembatalan pembuatan");
  const dialogBuat = await jalan(`__dialog()`);
  memuat(dialogBuat.teks, "Batalkan pembuatan?", "judul dialog pembatalan pembuatan");
  sama(
    dialogBuat.tombol.join(", "),
    "Ya, hapus, Batal",
    "tombol di dialog pembatalan pembuatan",
  );
  await jalan(`__yaBatal()`);
  await tunggu(`!__dialog()`, "dialog tertutup");
  await tunggu(`__baris().length === 1`, "tinggal satu baris di Review");

  const sisa = await jalan(`__baris()`);
  sama(sisa[0].judul, JUDUL_BARU, "yang tersisa adalah perubahan yang TIDAK dibatalkan");
  memuat(sisa[0].terjadi, "Diubah", "yang tersisa masih berupa suntingan");
  if (await jalan(`__terpublish()`)) {
    throw new Error("tombol Publish ikut mati padahal masih ada satu perubahan menunggu");
  }
  await potret("9-satu-dibatalkan");
  lapor("satu dari dua dibatalkan: yang lain tetap utuh dan tetap menunggu Publish");

  await bukaNilai();
  const daftarSisa = await jalan(`
    [...document.querySelectorAll("tbody > tr")]
      .filter((tr) => tr.innerText.includes("Probe review"))
      .map((tr) => tr.children[1].innerText.trim())
  `);
  sama(daftarSisa.join(", "), JUDUL_BARU, "nilai kedua hilang, yang pertama tinggal");
  lapor("nilai yang pembuatannya dibatalkan hilang dari daftar, yang lain tidak tersentuh");

  /* 13 — "Batalkan" pada suntingan. Dibuktikan lewat FORM-nya, bukan lewat
     daftar: yang perlu diyakini editor adalah bahwa isian yang ia buka
     berikutnya benar-benar berisi teks lama, dan itu hal yang tidak bisa
     dilihat test server. */
  await bukaReview();
  await jalan(`__batalBaris(0)`);
  await tunggu(`!!__dialog()`, "dialog pembatalan suntingan");
  const dialogUbah = await jalan(`__dialog()`);
  memuat(dialogUbah.teks, "Batalkan suntingan?", "judul dialog pembatalan suntingan");
  await jalan(`__yaBatal()`);
  await tunggu(`!__dialog()`, "dialog tertutup");
  await tunggu(`!!document.querySelector("main .kosong")`, "daftar Review kosong");
  await tunggu(`__terpublish()`, "tombol Publish mati");

  await bukaNilai();
  await jalan(`
    (() => {
      const tr = [...document.querySelectorAll("tbody > tr")].find(
        (x) => x.innerText.includes("Probe review"));
      [...tr.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Ubah").click();
    })()
  `);
  await tunggu(`!!document.querySelector("form")`, "form nilai sesudah pembatalan");
  await jalan(BEKAL);
  sama(
    await jalan(`document.querySelector('form input')?.value ?? ""`),
    JUDUL_AWAL,
    "form memuat judul LAMA sesudah suntingannya dibatalkan",
  );
  await potret("10-form-judul-lama");
  lapor(`suntingan dibatalkan: form memuat kembali "${JUDUL_AWAL}"`);
  await bukaNilai();

  /* 14 — layar Review boleh membatalkan, tapi tidak boleh MENYUNTING. Yang
     ditampilkannya keputusan orang lain tentang apa yang akan tayang; tombol
     simpan atau tambah di sini berarti Review bisa dipakai menerbitkan
     sesuatu tanpa pernah melewati layar entitasnya. Membatalkan tidak menambah
     apa pun ke antrean tayang, ia justru mengeluarkan sesuatu darinya. */
  await ubahNilai([["Judul", JUDUL_BARU]]);
  await bukaReview();
  const tombol = await jalan(`
    [...document.querySelector("main").querySelectorAll("button")]
      .map((b) => b.textContent.trim())
      .filter((t) => /simpan|tambah|urut|naik|turun/i.test(t))
  `);
  if (tombol.length) {
    throw new Error(`layar Review punya tombol penyunting: ${tombol.join(", ")}`);
  }
  const adaBatal = await jalan(`__baris()[0].tombol.includes("Batalkan")`);
  if (!adaBatal) throw new Error("baris kehilangan tombol Batalkan");
  lapor("layar Review punya Batalkan, tapi tidak satu pun tombol yang menyunting");

  /* 15 — bersih lagi sesudah Publish terakhir. Nilai probe dihapus dulu supaya
     yang ditayangkan tidak memuat satu pun barisnya. */
  await bukaNilai();
  await jalan(`
    (() => {
      const tr = [...document.querySelectorAll("tbody > tr")].find(
        (x) => x.innerText.includes("Probe review"));
      [...tr.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Hapus").click();
    })()
  `);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog hapus terakhir");
  await jalan(`document.querySelector("dialog[open] button.utama").click()`);
  await tunggu(`__terhapus()`, "baris hilang dari daftar");
  kotor = false;
  await jalan(BEKAL);

  await bukaReview();
  await publish();
  await tunggu(`!!document.querySelector("main .kosong")`, "layar Review kosong lagi");
  lapor("sesudah Publish terakhir: tidak ada lagi yang menunggu");

  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/review-*.png");
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
        `⚠ nilai "Probe review" TERTINGGAL di panel, hapus manual: ${lagi.message}`,
      );
    }
  })
  .finally(async () => {
    /* Sesudah `bersihkan()`, bukan sebelumnya: pemulihan itu menghapus nilai
       probe lewat panel dan penghapusan itu sendiri menambah baris audit. */
    await sapuAudit(tanda);
    brave.kill();
  });

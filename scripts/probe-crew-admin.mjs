/**
 * Jalan-jalan crew lewat CDP — dari panel admin sampai namanya benar-benar
 * terbaca di halaman People situsnya.
 *
 *   node scripts/probe-crew-admin.mjs
 *
 * Kenapa ada terpisah dari `probe-admin.mjs`: yang paling mudah rusak di
 * potongan crew BUKAN penyimpanannya (itu sudah dijaga 26 test di
 * `server/routes/crew.test.ts`) melainkan sambungan terakhirnya. `TheCrew.tsx`
 * dulu menghitung kelompok namanya di RUANG MODUL, dan itu beku sebelum
 * `content.json` selesai diambil: CMS menyimpan, Publish berhasil,
 * `content.json` benar, halamannya tetap memperlihatkan nama lama — tanpa satu
 * pun galat. Yang bisa menangkap kegagalan seperti itu cuma membuka halaman
 * aslinya dan membaca teksnya.
 *
 * Prasyaratnya tiga proses hidup: API :3001, situs :3000, admin :5174.
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

/* Nama uji sengaja diawali "Zzz": `TheCrew.tsx` mengurutkan A–Z di dalam tiap
   departemen, jadi baris ini pasti mendarat di ekor kelompoknya — kalau ia
   muncul di tempat lain, yang rusak urutannya, bukan penyimpanannya. */
const NAMA = "Zzz Probe Crew";
const JABATAN = "Probe Engineer";

rmSync("/tmp/csi-crew-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-crew-probe",
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

/* Sama seperti probe-admin: mengisi input React lewat `.value = x` saja tidak
   cukup — React memasang setter sendiri di prototipe, jadi nilainya berubah di
   DOM tapi state-nya tidak ikut. */
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
  window.__isiAria = (aria, nilai) => {
    const el = document.querySelector('[aria-label="' + aria + '"]');
    if (!el) throw new Error("isian tidak ada: " + aria);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      .set.call(el, nilai);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  window.__pilih = (label, nilai) => {
    const teks = [...document.querySelectorAll("label")]
      .find((l) => l.textContent.trim().startsWith(label));
    if (!teks) throw new Error("pilihan tidak ada: " + label);
    const el = teks.parentElement.querySelector("select");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")
      .set.call(el, nilai);
    el.dispatchEvent(new Event("change", { bubbles: true }));
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
  /* Menekan judul grup itu TOGGLE, bukan "buka": grup People sudah terbuka
     sendiri sesudah masuk, jadi klik tanpa syarat justru menutupnya. */
  window.__bukaGrup = (label) => {
    if (__anak(label).length === 0) __grup(label).querySelector(".sisi-judul").click();
  };
  window.__klikAnak = (grup, label) => {
    const b = [...__grup(grup).querySelectorAll(".sisi-anak button")].find(
      (x) => x.textContent.trim() === label,
    );
    if (!b) throw new Error("isi menu tidak ada: " + label);
    b.click();
  };
  window.__baris = (nama) =>
    [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes(nama));
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
    writeFileSync(`/tmp/crew-${nama}.png`, Buffer.from(data, "base64"));
  };

  const tunggu = async (ekspresi, apa, putaran = 40) => {
    for (let i = 0; i < putaran; i++) {
      if (await jalan(ekspresi)) return;
      await sleep(250);
    }
    throw new Error(`kelewat lama menunggu: ${apa}`);
  };

  const lapor = (langkah) => console.log(`✓ ${langkah}`);
  const q = (s) => JSON.stringify(s);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${q(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — Crew harus ada DI DALAM People, dan bukan lagi "Belum tersedia".
     Itu janji peta konten ke editor: susunan menu = susunan halaman. */
  await jalan(`__bukaGrup("People")`);
  await tunggu(`__anak("People").length > 0`, "grup People terbuka");
  const anakPeople = await jalan(`__anak("People").join(" | ")`);
  if (!anakPeople.includes("Crew")) {
    throw new Error(`Crew tidak ada di dalam grup People: ${anakPeople}`);
  }
  if (/Crew[^|]*Belum tersedia/.test(anakPeople)) {
    throw new Error("Crew masih ditandai 'Belum tersedia' di menu sisi");
  }
  lapor("menu sisi menaruh Crew di dalam People, tanpa penanda 'Belum tersedia'");

  await jalan(`__klikAnak("People", "Crew")`);
  await tunggu(`!!document.querySelector("table")`, "daftar crew");
  await jalan(BEKAL);
  await potret("1-daftar");

  /* Sisa jalan-jalan yang gagal di tengah memakai nama yang sama — dan nama
     itu unik selama barisnya hidup. Dibersihkan lewat panel, bukan lewat SQL,
     sekalian membuktikan hapusnya bekerja pada baris apa pun. */
  while (await jalan(`!!__baris(${q(NAMA)})`)) {
    await jalan(`__baris(${q(NAMA)}).querySelectorAll("button")[1].click()`);
    await tunggu(`!!document.querySelector("dialog[open]")`, "dialog (bersih-bersih)");
    await jalan(BEKAL);
    await jalan(`__klik("Ya, hapus")`);
    await tunggu(`!__baris(${q(NAMA)})`, "sisa terhapus");
    await jalan(BEKAL);
  }

  const sebelum = await jalan(`document.querySelectorAll("tbody tr").length`);

  /* 3 — draf: cuma nama, tanpa jabatan. Draf memang boleh setengah jalan. */
  await jalan(`__klik("+ Tambah anggota")`);
  await tunggu(`!!document.querySelector('select')`, "form crew");
  await jalan(BEKAL);
  await jalan(`__klik("‹ Semua crew")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar crew");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah anggota")`);
  await tunggu(`!!document.querySelector('select')`, "form crew (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Nama", ${q(NAMA)})`);
  await jalan(`__pilih("Departemen", "R & D")`);
  await potret("2-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`document.querySelectorAll("tbody tr").length`);
  if (sesudah !== sebelum + 1) throw new Error(`baris ${sebelum} → ${sesudah}, harusnya +1`);
  if (!(await jalan(`__baris(${q(NAMA)}).innerText.includes("Draft")`))) {
    throw new Error("baris draf tidak bertanda Draft");
  }
  lapor("draf tanpa jabatan tersimpan — draf boleh setengah jalan");

  /* 4 — Publish selagi draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
  const isiDraf = await (await fetch("http://localhost:3000/content.json")).json();
  if ((isiDraf.crew ?? []).some((m) => m.name === NAMA)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 5 — Live tanpa jabatan harus DITOLAK, dan alasannya harus sampai ke layar.
     Aturannya sendiri sudah diuji di `shared/validateCrew.test.ts`; yang
     diperiksa di sini apakah penolakannya terlihat atau hilang diam-diam. */
  await jalan(BEKAL);
  await jalan(`__baris(${q(NAMA)}).querySelector("button").click()`);
  await tunggu(`!!document.querySelector('select')`, "form crew (ubah)");
  await jalan(BEKAL);
  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Jabatan belum diisi")`, "galat jabatan muncul");
  lapor("Live tanpa jabatan ditolak, alasannya tampil di form");

  /* 6 — lengkapi: jabatan + satu tautan sosial tanpa https:// (harus ditolak),
     lalu dibetulkan. Tautan tanpa skema adalah salah ketik yang tidak pernah
     melempar apa pun — ia cuma mendaratkan pengunjung di 404 situs sendiri. */
  await jalan(`__isi("Jabatan", ${q(JABATAN)})`);
  await jalan(`__klik("+ Tambah tautan")`);
  await jalan(`__isiAria("Alamat tautan 1", "linkedin.com/in/probe")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("harus diawali https://")`, "galat tautan muncul");
  lapor("tautan tanpa https:// ditolak di form");

  await jalan(`__isiAria("Alamat tautan 1", "https://linkedin.com/in/probe")`);
  await potret("3-form-live");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum terpublish")`, "angka belum terpublish");

  /* Foto sengaja dibiarkan kosong — kotak tanpa foto punya tampilan sendiri
     yang memang dirancang, dan itu isi empat dari tiga belas baris hari ini.
     Kalau suatu saat foto dijadikan wajib, langkah ini yang akan gagal. */
  if (!(await jalan(`__baris(${q(NAMA)}).innerText.includes("Live")`))) {
    throw new Error("baris tidak bertanda Live sesudah disimpan");
  }
  lapor("Live tanpa foto diterima — kotak kosong memang dirancang begitu");

  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
  const isiTayang = await (await fetch("http://localhost:3000/content.json")).json();
  const terbit = (isiTayang.crew ?? []).find((m) => m.name === NAMA);
  if (!terbit) throw new Error("anggota Live tidak ada di content.json");
  if (terbit.role !== JABATAN) throw new Error("jabatan tidak ikut terbawa");
  if (terbit.social[0]?.platform !== "linkedin") throw new Error("tautan tidak ikut terbawa");
  lapor("anggota Live masuk content.json lengkap dengan jabatan dan tautannya");

  /* 7 — INI langkah yang tidak bisa digantikan unit test: halaman aslinya.
     Kalau `TheCrew.tsx` kembali menghitung kelompoknya di ruang modul, semua
     langkah di atas tetap hijau dan yang ini yang jatuh. */
  await send("Page.navigate", { url: "http://localhost:3000/people" });
  await sleep(3000);
  await tunggu(
    `document.body.innerText.includes(${q(NAMA)})`,
    "nama dari CMS muncul di halaman People",
    120,
  );
  await potret("4-halaman-people");
  const adaJabatan = await jalan(`document.body.innerText.includes(${q(JABATAN)})`);
  if (!adaJabatan) throw new Error("nama muncul tapi jabatannya tidak ikut");
  lapor("halaman People membaca crew dari content.json, bukan dari bundel");

  /* 8 — hapus, publish, hilang — dari content.json DAN dari halamannya. */
  await send("Page.navigate", { url: "http://localhost:5174/admin/crew" });
  await tunggu(`!!document.querySelector("table")`, "kembali ke panel", 120);
  await jalan(BEKAL);
  await jalan(`__baris(${q(NAMA)}).querySelectorAll("button")[1].click()`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(NAMA)) throw new Error("dialog tidak menyebut namanya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__baris(${q(NAMA)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
  const isiAkhir = await (await fetch("http://localhost:3000/content.json")).json();
  if ((isiAkhir.crew ?? []).some((m) => m.name === NAMA)) {
    throw new Error("anggota terhapus masih ada di content.json");
  }
  lapor("dihapus + Publish → hilang dari content.json");

  if (galatKonsol.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of galatKonsol) console.log("  " + g);
  } else {
    lapor("tidak ada galat di konsol sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/crew-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

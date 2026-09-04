/**
 * Jalan-jalan panel admin untuk VISI — login sampai halaman depan berubah.
 *
 *   node scripts/probe-visi-admin.mjs
 *
 * Saudara `probe-nilai-admin.mjs`, tapi entitasnya berbentuk lain: visi cuma
 * SATU baris, selamanya. Yang diuji di sini karena itu bukan "baris bertambah
 * dan berpindah", melainkan yang sebaliknya — bahwa barisnya TIDAK bisa
 * bertambah, tidak bisa hilang, dan tidak punya keadaan draf:
 *
 *   • menu sisi mengantar langsung ke form, tanpa daftar di depannya;
 *   • tidak ada "+ Tambah", "Hapus", "Naikkan", maupun pilihan Draft/Live;
 *   • `/admin/visi/baru` dan `/admin/visi/ubah/1` tidak membuka form entitas lain —
 *     alamat itu sah menurut penjaga rute, dan tanpa pengecualian khusus ia
 *     dulu jatuh ke form LOWONGAN dengan judul "Visi" di menu sisi;
 *   • menyimpan dua kali tetap satu baris di content.json.
 *
 * Langkah terakhir membuka halaman depan yang sungguhan. Sampai titik itu
 * yang terbukti baru "database → berkas"; yang dijanjikan adalah "database →
 * paragraf besar di layar", dan bagian terakhirnya cuma bisa dilihat di
 * halaman aslinya.
 *
 * Kalimat semula dikembalikan di langkah terakhir — probe ini menyunting
 * baris yang sama yang dipakai halaman depan sungguhan, jadi ia wajib
 * membersihkan jejaknya sendiri. Tidak seperti nilai atau lowongan, ia tidak
 * bisa sekadar menghapus barisnya. Karena itu pengembaliannya juga berjalan
 * saat probe-nya GAGAL di tengah: probe yang mati di langkah 10 tanpa itu
 * meninggalkan kalimat "uji coba dari probe" terpampang di halaman depan
 * sampai ada yang menyadarinya.
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
const PORT = 9236;
const SANDI = process.env.ADMIN_PASSWORD ?? "wibujosjis12345";
const KALIMAT = "Kalimat visi uji coba dari probe-visi-admin.mjs.";

rmSync("/tmp/csi-visi-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-visi-probe",
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

/* Bekal yang sama dengan probe entitas lain, dikurangi semua yang berurusan
   dengan tabel: layar ini tidak punya satu pun. */
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
  window.__baca = (label) => {
    const teks = [...document.querySelectorAll("label")]
      .find((l) => l.textContent.trim().startsWith(label));
    if (!teks) throw new Error("isian tidak ada: " + label);
    return teks.parentElement.querySelector("input, textarea").value;
  };
  window.__klik = (teks) => {
    const b = [...document.querySelectorAll("button, summary")]
      .find((x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks));
    if (!b) throw new Error("tombol tidak ada: " + teks);
    b.click();
  };
  /* Dibatasi ke dalam <form>, bukan seluruh halaman: menu sisi punya tombol
     ringkasnya sendiri berlambang "‹", dan panel publish punya tombolnya —
     keduanya memang ada di setiap layar dan bukan urusan bentuk entitas ini. */
  window.__adaTombolForm = (teks) =>
    [...document.querySelectorAll("form button")].some(
      (x) => x.textContent.trim() === teks || x.textContent.trim().startsWith(teks),
    );
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
  /** Judul <h2> layar yang sedang terbuka — dipakai membuktikan alamat aneh
      tidak mendarat di form entitas lain. */
  window.__judulLayar = () =>
    document.querySelector("form h2, h2")?.textContent.trim() ?? "";
`;

/**
 * Diisi oleh `main()` begitu ia tahu kalimat semula dan punya cara memakai
 * panel. Digantung di luar `main()` supaya `.catch()` di bawah bisa
 * memanggilnya — probe yang mati di tengah tetap wajib mengembalikan kalimat
 * halaman depan, dan `main()` yang sudah melempar tidak bisa melakukannya
 * sendiri. `null` selama probe belum sempat menyentuh apa pun.
 */
let bersihkan = null;

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
    writeFileSync(`/tmp/visi-${nama}.png`, Buffer.from(data, "base64"));
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
  const visiTayang = async () => (await konten()).vision;

  /* Kalimat & foto yang sedang tayang, dicatat SEBELUM apa pun disentuh.
     Ini yang dikembalikan di langkah terakhir. */
  const semula = await visiTayang();
  if (!semula) {
    throw new Error(
      "content.json belum punya bagian visi — jalankan bun run db:seed lalu Publish sekali",
    );
  }

  const bukaVisi = async () => {
    if ((await jalan(`__anak("Home").length`)) === 0) {
      await jalan(`__bukaGrup("Home")`);
      await tunggu(`__anak("Home").length > 0`, "grup Home terbuka");
    }
    await jalan(`__klikAnak("Home", "Visi")`);
    await tunggu(`!!document.querySelector("textarea")`, "form visi");
    await jalan(BEKAL);
  };

  /* Dinyalakan tepat sebelum simpan yang pertama. Dipakai `finally` di bawah
     untuk memutuskan apakah masih ada yang perlu dikembalikan — mengembalikan
     baris yang belum pernah disentuh cuma akan menaikkan `updatedAt` dan
     menyalakan badge "belum terpublish" tanpa ada yang berubah. */
  let kotor = false;

  const pulihkan = async () => {
    await send("Page.navigate", { url: "http://localhost:5174/admin/" });
    await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
    await jalan(BEKAL);
    await bukaVisi();
    /* Cuma kalimatnya yang ditulis balik: probe ini tidak pernah menyentuh
       fotonya, dan `simpanVisi` mengirim kedua isian sekaligus dari isi form
       yang baru saja dimuat dari server. Fotonya tetap diperiksa di bawah —
       kalau ternyata ikut berubah, itu bug yang justru ingin terlihat. */
    await jalan(`__isi("Kalimat visi", ${JSON.stringify(semula.statement)})`);
    await jalan(`__klik("Simpan")`);
    await tunggu(`__teks().includes("Visi tersimpan")`, "kabar tersimpan (pulih)");
    await jalan(BEKAL);
    await jalan(`__klik("Publish")`);
    await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish (pulih)");
    const akhir = await visiTayang();
    if (akhir.statement !== semula.statement || akhir.photo !== semula.photo) {
      throw new Error(
        `gagal mengembalikan visi semula:\n  ${JSON.stringify(akhir)}\n  ${JSON.stringify(semula)}`,
      );
    }
    kotor = false;
    lapor("kalimat & foto semula dikembalikan — halaman depan kembali seperti sebelum probe");
  };

  bersihkan = async () => {
    if (!kotor) return;
    await pulihkan();
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

  /* 2 — beranda menyebut keadaan visi sebelum halamannya dibuka.
     Kalimatnya berbeda dari entitas lain: yang lain dihitung ("7 nilai"),
     visi tidak punya yang bisa dihitung, jadi ia "Terisi". Kalau `muat()`
     lupa mengambilnya, kalimat itu akan berbunyi "Belum terisi" untuk baris
     yang sebenarnya ada. */
  const beranda = await jalan(`__teks()`);
  if (!/Terisi/.test(beranda) || /Belum terisi/.test(beranda)) {
    throw new Error(`beranda tidak menyebut visi sebagai terisi:\n${beranda}`);
  }
  lapor("beranda menyebut visi sudah terisi tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — menu sisi mengantar LANGSUNG ke form. Ini bentuk yang membedakan
     visi dari semua entitas lain: tidak ada tabel satu baris di depannya. */
  await bukaVisi();
  if (await jalan(`!!document.querySelector("table")`)) {
    throw new Error("layar visi menampilkan tabel — seharusnya form langsung");
  }
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Visi") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka form visi langsung, tanpa daftar, dan menandai posisinya");

  /* 4 — form terisi kalimat yang sedang tayang, bukan kosong. */
  const terbaca = await jalan(`__baca("Kalimat visi")`);
  if (terbaca.trim() !== semula.statement.trim()) {
    throw new Error(
      `form tidak memuat kalimat yang tayang:\n  form:  ${terbaca}\n  tayang: ${semula.statement}`,
    );
  }
  lapor("form membuka kalimat yang sedang tayang");
  await potret("2-form");

  /* 5 — yang TIDAK boleh ada. Satu baris selamanya berarti tidak ada tombol
     yang bisa menambah atau menghilangkannya, dan tidak ada draf. */
  const larangan = await jalan(`({
    tambah: __adaTombolForm("+ Tambah"),
    hapus: __adaTombolForm("Hapus"),
    naik: __adaTombolForm("Naikkan"),
    batal: __adaTombolForm("Batal"),
    kembali: __adaTombolForm("‹"),
    pilihan: document.querySelectorAll("form .pilihan input[type=radio]").length,
  })`);
  const salah = Object.entries(larangan).filter(([, v]) => v);
  if (salah.length) {
    throw new Error(
      `layar visi punya yang seharusnya tidak ada: ${salah.map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  lapor("tidak ada Tambah/Hapus/Naikkan/Batal/kembali maupun pilihan Draft-Live");

  /* 6 — kalimat kosong ditolak, dan baris yang tayang tidak ikut rusak. */
  await jalan(`__isi("Kalimat visi", "   ")`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`__teks().includes("belum benar")`, "galat kalimat kosong");
  const masihTayang = await visiTayang();
  if (masihTayang.statement !== semula.statement) {
    throw new Error("simpan yang ditolak sempat mengubah baris yang tayang");
  }
  lapor("kalimat kosong ditolak di form, baris yang tayang tidak tersentuh");
  await potret("3-galat");

  /* 7 — simpan kalimat baru → badge belum terpublish menyala → Publish */
  kotor = true;
  await jalan(`__isi("Kalimat visi", ${JSON.stringify(KALIMAT)})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Visi tersimpan")`, "kabar tersimpan");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum terpublish")`, "badge belum terpublish");
  lapor("menyimpan visi menyalakan badge 'belum terpublish'");

  /* Tersimpan ≠ tayang: sebelum Publish, content.json wajib masih berisi
     kalimat lama. Ini gerbang yang sama dengan entitas lain, cuma tanpa
     Draft/Live yang ikut menjaganya di sana. */
  if ((await visiTayang()).statement !== semula.statement) {
    throw new Error("kalimat baru bocor ke content.json sebelum Publish");
  }
  lapor("sebelum Publish, content.json masih berisi kalimat lama");

  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish");
  const sesudah = await visiTayang();
  if (sesudah.statement !== KALIMAT) {
    throw new Error(`content.json tidak ikut berubah: ${sesudah.statement}`);
  }
  if (!sesudah.photo) throw new Error("foto hilang dari content.json");
  lapor(`kalimat baru masuk content.json (foto tetap ${sesudah.photo})`);
  await potret("4-tayang");

  /* 8 — menyimpan lagi tetap SATU baris. `PUT` yang keliru menulis `insert`
     akan menambah baris kedua di sini — atau, karena ada CHECK-nya, meledak
     dengan galat kunci ganda. Keduanya tertangkap di langkah ini. */
  await bukaVisi();
  await jalan(`__isi("Kalimat visi", ${JSON.stringify(KALIMAT + " Dua kali.")})`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Visi tersimpan")`, "kabar tersimpan (kedua)");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah terpublish")`, "kabar publish (kedua)");
  const dua = await visiTayang();
  if (Array.isArray(dua)) throw new Error("visi di content.json berbentuk daftar");
  if (dua.statement !== KALIMAT + " Dua kali.") {
    throw new Error(`simpan kedua tidak menimpa baris yang sama: ${dua.statement}`);
  }
  lapor("simpan kedua menimpa baris yang sama — tetap satu visi");

  /* 9 — alamat yang tidak punya layar. Dengan `visi` berstatus siap,
     `/admin/visi/baru` lolos penjaga rute; tanpa pengecualian khusus ia jatuh
     ke rantai form dan membuka form LOWONGAN di alamat visi. */
  for (const alamat of ["/admin/visi/baru", "/admin/visi/ubah/1"]) {
    await send("Page.navigate", { url: `http://localhost:5174${alamat}` });
    await sleep(600);
    await tunggu(`!!document.querySelector(".sisi")`, `panel di ${alamat}`);
    await jalan(BEKAL);
    const judul = await jalan(`__judulLayar()`);
    if (judul !== "Visi") {
      throw new Error(`${alamat} membuka layar "${judul}", bukan form visi`);
    }
  }
  lapor("/admin/visi/baru dan /admin/visi/ubah/1 tetap mendarat di form visi");

  /* 10 — halaman depan yang sungguhan membacanya.
     Sampai langkah 9 yang terbukti baru "database → berkas". Yang berikut ini
     bagian terakhirnya: berkas → paragraf besar di layar. */
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await tunggu(
    `document.body.innerText.includes(${JSON.stringify(KALIMAT)})`,
    "kalimat visi di halaman depan",
  );

  /* "Ada di DOM" belum tentu "terlihat". Ukurannya diperiksa supaya kalimat
     yang menetes ke elemen setinggi nol tidak lolos sebagai lulus — dan
     fotonya ikut diperiksa lewat `naturalWidth`, satu-satunya cara
     membedakan gambar yang tampil dari `src` yang 404. */
  const kotak = await jalan(`
    (() => {
      const s = document.querySelector("#vision");
      if (!s) return null;
      const p = s.querySelector("p");
      const img = s.querySelector("img");
      const r = p.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        src: img?.getAttribute("src") ?? "",
        muat: img?.naturalWidth ?? 0,
      };
    })()
  `);
  if (!kotak) throw new Error("seksi #vision tidak ada di halaman depan");
  if (kotak.w < 50 || kotak.h < 10) {
    throw new Error(`kalimat visi ada di DOM tapi tidak punya ukuran: ${JSON.stringify(kotak)}`);
  }
  if (kotak.src !== sesudah.photo) {
    throw new Error(`foto di halaman bukan yang dari CMS: ${kotak.src} vs ${sesudah.photo}`);
  }
  lapor(`halaman depan merender visi dari CMS (kalimat ${kotak.w}×${kotak.h}px, foto ${kotak.src})`);

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia
     baru menyingkir saat scene 3D siap, dan di sini scene itu tidak akan
     pernah siap. Overlay-nya disingkirkan untuk potret ini saja. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
    document.querySelector("#vision")?.scrollIntoView({ block: "center" });
  `);
  await sleep(900);
  await potret("5-halaman-depan");

  /* 11 — kembalikan kalimat semula. Dijalankan lewat panel, sama seperti
     editor sungguhan, supaya jalan pulangnya ikut terbukti. */
  await pulihkan();

  /* Galat konsol dari halaman depan tidak dihitung: di headless tanpa GPU,
     scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe ini. */
  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/visi-*.png");
  ws.close();
}

main()
  .catch(async (e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
    /* Kegagalan mengembalikan dilaporkan, bukan dilempar: yang ingin dibaca
       orang di baris terakhir adalah kenapa probe-nya gagal, bukan kenapa
       bersih-bersihnya ikut gagal. Tapi ia harus terlihat — kalimat "uji coba
       dari probe" yang tertinggal tayang di halaman depan jauh lebih mahal
       daripada probe yang merah. */
    try {
      await bersihkan?.();
    } catch (lagi) {
      console.error(
        `⚠ kalimat visi TERTINGGAL di panel dan halaman depan — kembalikan manual: ${lagi.message}`,
      );
    }
  })
  .finally(() => brave.kill());

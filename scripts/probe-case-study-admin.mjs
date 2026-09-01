/**
 * Jalan-jalan panel admin untuk CASE STUDY — login sampai ceritanya terbuka di
 * halaman Work.
 *
 *   node scripts/probe-case-study-admin.mjs
 *
 * Saudara kembar `probe-proyek-admin.mjs`. Yang beda dan karena itu diuji di
 * sini:
 *
 *  - PARAGRAF. Satu-satunya isian di seluruh CMS ini yang bentuknya dibawa oleh
 *    SPASI PUTIH, bukan oleh struktur data. Satu Enter dan dua Enter tampak
 *    nyaris sama di kotak isian, tapi cuma yang kedua memulai paragraf baru di
 *    situs. Jalurnya diikuti sampai ujung: hitungan di form → `\n\n` di
 *    content.json → jumlah `<p>` di halaman aslinya.
 *  - HASIL WAJIB. Di kartu "Selected work" baris hasil boleh kosong karena
 *    kartunya menggerbangi barisnya; di sini ia dicetak apa adanya, jadi
 *    "Live tanpa hasil" harus ditolak — aturan yang gampang ikut tersalin
 *    keliru dari slice sebelumnya.
 *  - CERITANYA TERTUTUP. Isi cerita baru ada di DOM sesudah gambarnya ditekan
 *    (`Disclosure`), jadi "judulnya ada di halaman" belum membuktikan apa pun.
 *
 * Langkah terakhir membuka halaman /work yang sungguhan. Sampai titik itu yang
 * terbukti baru "database → berkas"; yang dijanjikan adalah "database → cerita
 * di layar".
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
const JUDUL = "Probe Case Study";
const KLIEN = "Probe Client";
const TAHUN = "2026";
const SEKTOR = "Probe Sector";
const HASIL = "9 langkah lulus";
const KUTIPAN = "Semua permohonan masih diproses manual di loket.";
const PARAGRAF = [
  "Paragraf pertama menceritakan masalahnya, dan ini kalimat penandanya.",
  "Paragraf kedua menceritakan apa yang dikerjakan, dengan penanda yang lain.",
];
const CERITA = PARAGRAF.join("\n\n");
const LINGKUP = ["Web Platform", "Staff Training"];

rmSync("/tmp/csi-case-probe", { recursive: true, force: true });

const brave = spawn(
  BROWSER,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-case-probe",
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

/* Bekal `probe-proyek-admin.mjs` apa adanya — daftar Lingkup pekerjaan memakai
   komponen `DaftarTeks` yang sama persis dengan daftar Label di sana. */
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
  /** Kalimat penghitung paragraf di bawah kotak Cerita — satu-satunya tempat
      editor bisa melihat pemisah yang tak terlihat itu terbaca atau tidak. */
  window.__hitungParagraf = () =>
    [...__blok("Cerita").querySelectorAll(".petunjuk")]
      .map((x) => x.textContent.trim())
      .find((t) => /paragraf akan tayang|Belum ada isi/.test(t)) ?? "";
`;

/* Bekal khusus halaman Work — tidak ada hubungannya dengan panel admin, jadi
   sengaja tidak dititipkan ke `BEKAL` yang dipasang ulang belasan kali. */
const BEKAL_WORK = `
  window.__bukaCerita = async (judul, gambar) => {
    const seksi = document.querySelector("#case-spotlight");
    if (!seksi) throw new Error("seksi Case Studies tidak ada di halaman ini");

    const artikel = [...seksi.querySelectorAll("article")].find((a) =>
      [...a.querySelectorAll("h3")].some((h) => h.textContent.trim() === judul),
    );
    if (!artikel) {
      return { ketemu: false, teks: seksi.innerText };
    }

    const tombol = artikel.querySelector("button[aria-expanded]");
    /* Judul di dalam gambar ikut TERLIHAT saat cerita masih tertutup — yang
       membuktikan CMS-nya sampai ke layar adalah isi di baliknya, dan itu baru
       ada di DOM sesudah tombolnya ditekan. */
    if (tombol.getAttribute("aria-expanded") !== "true") tombol.click();
    for (let i = 0; i < 40 && !artikel.querySelector('[role="region"]'); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const isi = artikel.querySelector('[role="region"]');
    /* Tinggi dianimasikan 0 → auto; diukur sesudah animasinya selesai supaya
       "punya ukuran" tidak dinilai di tengah jalan. */
    await new Promise((r) => setTimeout(r, 500));

    const h = [...artikel.querySelectorAll("h3")].find(
      (x) => x.textContent.trim() === judul,
    );
    const r = h?.getBoundingClientRect();
    /* Dibandingkan sebagai URL yang sudah diselesaikan, bukan pathname:
       gambar CMS bisa berupa path lokal ATAU tautan penuh ke luar, dan
       pathname menyamakan dua tautan luar yang cuma beda query. */
    const penuh = new URL(gambar, location.href).href;
    const img = [...artikel.querySelectorAll("img")].find(
      (x) => new URL(x.src, location.href).href === penuh,
    );
    return {
      ketemu: true,
      terbuka: !!isi,
      teks: artikel.innerText,
      /* Bukan "semua <p> di dalam kotak isi": kutipan pembuka juga sebuah <p>
         dan berdiri sejajar dengan wadah paragrafnya, jadi menghitung semuanya
         akan selalu kelebihan satu. Yang dicari wadah yang SELURUH anaknya
         <p> — itulah blok cerita yang sudah dipecah di baris kosongnya. */
      paragraf: (() => {
        const kotak = isi?.querySelector(":scope > div");
        const wadah = kotak
          ? [...kotak.children].find(
              (el) =>
                el.tagName === "DIV" &&
                el.children.length > 0 &&
                [...el.children].every((c) => c.tagName === "P"),
            )
          : null;
        return wadah ? [...wadah.children].map((p) => p.textContent.trim()) : [];
      })(),
      lingkup: isi ? [...isi.querySelectorAll("span")].map((s) => s.textContent.trim()) : [],
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
    writeFileSync(`/tmp/case-${nama}.png`, Buffer.from(data, "base64"));
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
    (await konten()).caseStudies.map((s) => s.title);

  await sleep(2500);
  await jalan(BEKAL);

  /* 1 — masuk */
  await tunggu(`!!document.querySelector('input[type="password"]')`, "layar masuk");
  await jalan(`__isi("Kata sandi", ${JSON.stringify(SANDI)})`);
  await jalan(`document.querySelector("form").requestSubmit()`);
  await tunggu(`!!document.querySelector(".sisi")`, "menu sisi");
  await jalan(BEKAL);
  lapor("masuk sebagai editor");

  /* 2 — beranda menyebut case study sebelum halamannya dibuka. Angkanya
     diambil saat memuat panel, bukan saat masuk halamannya. */
  const beranda = await jalan(`__teks()`);
  if (!/\d+ case study/.test(beranda)) {
    throw new Error(`beranda tidak menyebut jumlah case study:\n${beranda}`);
  }
  lapor("beranda menyebut jumlah case study tanpa halamannya dibuka");
  await potret("1-beranda");

  /* 3 — turun ke Case study lewat menu, seperti editor sungguhan. */
  if ((await jalan(`__anak("Work").length`)) === 0) {
    await jalan(`__bukaGrup("Work")`);
    await tunggu(`__anak("Work").length > 0`, "grup Work terbuka");
  }
  const anakWork = await jalan(`__anak("Work").join(" | ")`);
  for (const wajib of ["Selected work", "Case study"]) {
    if (!anakWork.includes(wajib)) {
      throw new Error(`${wajib} tidak ada di dalam grup Work: ${anakWork}`);
    }
  }
  /* Testimoni pernah salah alamat ke grup ini. Peta isinya sudah dibetulkan
     dan diuji unit; yang diperiksa di sini adalah apa yang benar-benar
     terpampang di menu sisi — satu-satunya tempat editor melihatnya. */
  if (/[Tt]estimoni/.test(anakWork)) {
    throw new Error(`testimoni muncul lagi di menu Work: ${anakWork}`);
  }
  await jalan(`__klikAnak("Work", "Case study")`);
  await tunggu(`!!document.querySelector("table")`, "daftar case study");
  await jalan(BEKAL);
  const tandaAktif = await jalan(
    `document.querySelector(".sisi button.aktif")?.textContent.trim() ?? ""`,
  );
  if (tandaAktif !== "Case study") {
    throw new Error(`menu sisi tidak menandai posisi sekarang: ${JSON.stringify(tandaAktif)}`);
  }
  lapor("menu sisi membuka daftar case study dan menandai posisinya");
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
      `butuh minimal 2 case study untuk menguji urutan, yang ada ${semula.length} — jalankan bun run db:seed`,
    );
  }

  /* 4 — buat draf */
  await jalan(`__klik("+ Tambah case study")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form case study");
  await jalan(BEKAL);

  /* Jalan pulang di kepala form, diperiksa sebelum isiannya diisi. */
  await jalan(`__klik("‹ Semua case study")`);
  await tunggu(`!!document.querySelector("table")`, "kembali lewat kepala form");
  lapor("tombol kembali di kepala form mengantar ke daftar case study");
  await jalan(BEKAL);
  await jalan(`__klik("+ Tambah case study")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form case study (dibuka lagi)");
  await jalan(BEKAL);

  await jalan(`__isi("Judul", ${JSON.stringify(JUDUL)})`);
  await jalan(`__isi("Klien", ${JSON.stringify(KLIEN)})`);
  await jalan(`__isi("Tahun", ${JSON.stringify(TAHUN)})`);
  await jalan(`__isi("Sektor", ${JSON.stringify(SEKTOR)})`);
  await jalan(`__isi("Hasil", ${JSON.stringify(HASIL)})`);
  await jalan(`__isi("Kutipan pembuka", ${JSON.stringify(KUTIPAN)})`);

  /* Penghitung paragraf diperiksa DUA kali dengan teks yang cuma beda jumlah
     Enter-nya. Ini satu-satunya tempat editor bisa melihat pemisah yang tak
     terlihat itu terbaca atau tidak — kalau penghitungnya salah, ia berbohong
     dengan meyakinkan dan ceritanya tayang sebagai satu blok panjang. */
  await jalan(`__isi("Cerita", ${JSON.stringify(PARAGRAF.join("\n"))})`);
  await tunggu(
    `__hitungParagraf().startsWith("1 paragraf")`,
    "penghitung paragraf membaca satu Enter sebagai satu paragraf",
  );
  await jalan(`__isi("Cerita", ${JSON.stringify(CERITA)})`);
  await tunggu(
    `__hitungParagraf().startsWith("2 paragraf")`,
    "penghitung paragraf membaca baris kosong",
  );
  lapor("penghitung paragraf membedakan satu Enter dari baris kosong");

  /* Lingkup ditambah satu per satu, menunggu barisnya benar-benar muncul dulu.
     Menekan "+ Tambah" dua kali beruntun lalu mengisi keduanya sekaligus akan
     lulus di React yang membilas tiap klik dan gagal di React yang menundanya
     — dan kegagalannya berbunyi "baris ke-1 tidak ada", bukan "sabar". */
  for (const [i, label] of LINGKUP.entries()) {
    await jalan(`__tambahBaris("Lingkup pekerjaan")`);
    await tunggu(
      `__jumlahBaris("Lingkup pekerjaan") === ${i + 1}`,
      `baris lingkup ke-${i + 1}`,
    );
    await jalan(`__isiBaris("Lingkup pekerjaan", ${i}, ${JSON.stringify(label)})`);
  }
  /* Satu baris kosong ditinggal dengan sengaja: menekan "+ Tambah" lalu
     berubah pikiran adalah hal yang paling sering terjadi, dan form-nya
     berjanji membuang baris itu diam-diam alih-alih menolak simpanan. */
  await jalan(`__tambahBaris("Lingkup pekerjaan")`);
  await tunggu(
    `__jumlahBaris("Lingkup pekerjaan") === ${LINGKUP.length + 1}`,
    "baris lingkup kosong",
  );

  await potret("3-form");
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);

  const sesudah = await jalan(`__judul()`);
  if (sesudah.length !== semula.length + 1) {
    throw new Error(`baris ${semula.length} → ${sesudah.length}, harusnya +1`);
  }
  /* Cerita baru mendarat di BAWAH — urutan di sini adalah urutan bacanya di
     halaman Work, dan yang teratas adalah yang pertama dibaca pengunjung. */
  if (sesudah[sesudah.length - 1] !== JUDUL) {
    throw new Error(`case study baru tidak mendarat di baris terakhir: ${sesudah.join(" | ")}`);
  }
  lapor("case study draf tersimpan (baris lingkup kosong dibuang) dan mendarat paling bawah");
  await potret("4-draf");

  /* 5 — publish selagi masih draf: tidak boleh ikut terangkut */
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("draf ikut masuk content.json — gerbang state bocor");
  }
  lapor("draf TIDAK ikut ke content.json setelah Publish");

  /* 6 — jadikan Live, dua penolakan dulu */
  await jalan(BEKAL);
  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Ubah")`);
  await tunggu(`!!document.querySelector('input[type="file"]')`, "form case study (ubah)");
  await jalan(BEKAL);

  /* Lingkup yang tersimpan dibaca ulang dari server, bukan diingat form. Dua
     salinan berarti simpan-ulang menumpuk, bukan mengganti. */
  const lingkupTersimpan = await jalan(`
    [...__blok("Lingkup pekerjaan").querySelectorAll(".baris input")].map((x) => x.value)
  `);
  if (lingkupTersimpan.join("|") !== LINGKUP.join("|")) {
    throw new Error(
      `lingkup tidak kembali apa adanya: ${JSON.stringify(lingkupTersimpan)}`,
    );
  }
  /* Ceritanya pulang dengan baris kosongnya utuh: kalau `\n\n` terpotong di
     salah satu persinggahan (repo, JSON, form), penghitungnya jatuh ke 1 dan
     paragrafnya lenyap di situs tanpa satu pun galat. */
  await tunggu(
    `__hitungParagraf().startsWith("2 paragraf")`,
    "cerita tersimpan pulang dengan dua paragraf",
  );
  lapor("lingkup & paragraf kembali utuh saat form dibuka lagi");

  await jalan(`__radio("Live")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Gambar belum dipilih")`, "galat gambar muncul");
  lapor("status Live tanpa gambar ditolak, alasannya tampil di form");
  await potret("5-galat-gambar");

  /* Hasil dikosongkan sebentar. Di kartu "Selected work" ini SAH — barisnya
     digerbangi di sana. Di cerita ini baris hasil dicetak apa adanya di antara
     judul dan tombol pembuka, jadi aturan yang ikut tersalin keliru dari slice
     sebelumnya akan ketahuan tepat di sini. */
  await jalan(BEKAL);
  await jalan(`__isi("Hasil", "")`);
  await jalan(`__klik("Simpan")`);
  await tunggu(`__teks().includes("Baris hasil belum diisi")`, "galat hasil muncul");
  lapor("status Live tanpa baris hasil ditolak — beda aturan dengan kartu proyek");
  await jalan(BEKAL);
  await jalan(`__isi("Hasil", ${JSON.stringify(HASIL)})`);

  /* Sengaja yang path-nya lokal, bukan sekadar gambar pertama di daftar:
     langkah 8 memeriksa gambarnya benar-benar TERMUAT, dan sebagian isi daftar
     ini adalah tautan Unsplash. Gambar seberang laut yang gagal dimuat karena
     jaringan kantor sedang batuk akan dilaporkan sebagai cerita rusak —
     tuduhan yang salah alamat. */
  const gambarDipilih = await jalan(`__pilihGambar("/")`);
  await jalan(BEKAL);
  await jalan(`__klik("Simpan")`);
  await tunggu(`!!document.querySelector("table")`, "kembali ke daftar");
  await jalan(BEKAL);
  await tunggu(`__teks().includes("perubahan belum tayang")`, "angka belum tayang");
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");

  const tayang = await konten();
  const terbit = tayang.caseStudies.find((s) => s.title === JUDUL);
  if (!terbit) throw new Error("case study tayang tidak ada di content.json");
  for (const [apa, ada, harus] of [
    ["klien", terbit.client, KLIEN],
    ["tahun", terbit.year, TAHUN],
    ["sektor", terbit.industry, SEKTOR],
    ["hasil", terbit.outcome, HASIL],
    ["kutipan", terbit.quote, KUTIPAN],
    ["cerita", terbit.desc, CERITA],
    ["lingkup", terbit.scope.join("|"), LINGKUP.join("|")],
    ["gambar", terbit.image, gambarDipilih],
  ]) {
    if (ada !== harus) {
      throw new Error(`${apa} tidak ikut terbawa utuh: ${JSON.stringify(ada)}`);
    }
  }
  /* Diperiksa terpisah dari perbandingan teks di atas supaya kegagalannya
     menyebut hal yang benar: yang dibaca situs bukan `desc`, melainkan
     `desc.split("\\n\\n")`. */
  if (terbit.desc.split("\n\n").length !== PARAGRAF.length) {
    throw new Error(
      `jeda paragraf tidak selamat sampai content.json: ${JSON.stringify(terbit.desc)}`,
    );
  }
  lapor("cerita tayang masuk content.json lengkap, jeda paragrafnya selamat");
  await potret("6-tayang");

  /* 7 — URUTAN. Tetangga di atas harus Live juga: kalau ia draf, urutan di
     content.json memang tidak berubah, dan probe-nya akan menuduh Naikkan
     rusak. */
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
  lapor(`urutan cerita ikut berubah di content.json (posisi ${posisiLama} → ${posisiBaru})`);
  await potret("7-urutan");

  /* 8 — halaman Work yang sungguhan merender ceritanya.
     Sampai langkah 7 yang terbukti baru "database → berkas". Yang berikut ini
     bagian terakhirnya: berkas → cerita di layar. */
  await send("Page.navigate", { url: "http://localhost:3000/work" });
  await tunggu(
    `!!document.querySelector("#case-spotlight")`,
    "seksi Case Studies di halaman Work",
  );

  /* Layar penuh di headless tanpa GPU akan selalu berisi LoadingScreen: ia baru
     menyingkir saat scene 3D siap, dan di sini scene itu tidak akan pernah
     siap. Overlay-nya disingkirkan supaya potretnya memperlihatkan bagian di
     baliknya — dan supaya kliknya sampai ke tombolnya. */
  await jalan(`
    [...document.querySelectorAll("div")]
      .find((el) => el.className.split(" ").includes("z-[60]"))
      ?.remove();
  `);
  await jalan(`
    document.querySelector("#case-spotlight").scrollIntoView({ block: "center" });
  `);
  await sleep(600);
  await jalan(BEKAL_WORK);

  /* Klik + tunggu + ukur dijadikan satu perjalanan ke halaman: isi cerita baru
     ada di DOM sesudah gambarnya ditekan, dan tingginya dianimasikan 0 → auto,
     jadi apa pun yang diperiksa lewat perintah terpisah memeriksa keadaan yang
     mungkin sudah bukan yang tadi dibuka. */
  const cerita = await jalan(
    `__bukaCerita(${JSON.stringify(JUDUL)}, ${JSON.stringify(terbit.image)})`,
  );
  if (!cerita.ketemu) {
    throw new Error(
      `cerita tidak ada di seksi Case Studies; yang terpampang: ${JSON.stringify(cerita.teks)}`,
    );
  }
  if (!cerita.terbuka) {
    throw new Error("gambarnya ditekan tapi isi ceritanya tidak pernah terbuka");
  }
  for (const [apa, teks] of [
    ["klien", KLIEN],
    ["tahun", TAHUN],
    ["sektor", SEKTOR],
    ["hasil", HASIL],
    ["kutipan", KUTIPAN],
  ]) {
    if (!cerita.teks.includes(teks)) {
      throw new Error(`${apa} tidak ikut terender: ${JSON.stringify(cerita.teks)}`);
    }
  }

  /* Inti langkah ini: DUA paragraf, bukan satu blok panjang. Jumlahnya yang
     diperiksa, bukan teksnya — teksnya sudah lulus di baris-baris di atas, dan
     satu blok panjang berisi kedua kalimat juga akan lulus di sana. */
  if (cerita.paragraf.length !== PARAGRAF.length) {
    throw new Error(
      `cerita tayang sebagai ${cerita.paragraf.length} paragraf, harusnya ${PARAGRAF.length}: ${JSON.stringify(cerita.paragraf)}`,
    );
  }
  for (const label of LINGKUP) {
    if (!cerita.lingkup.includes(label)) {
      throw new Error(
        `lingkup "${label}" tidak terender di kaki cerita: ${JSON.stringify(cerita.lingkup)}`,
      );
    }
  }

  /* "Ada di DOM" belum tentu "punya kartu". Ukurannya diperiksa supaya judul
     yang menetes ke elemen setinggi nol tidak lolos sebagai lulus. Gambarnya
     diperiksa terpisah: gambar itu sekaligus tombol pembukanya, jadi judul yang
     benar di atas gambar yang gagal dimuat tetap cerita yang tak bisa dibuka. */
  if (!cerita.kotak || cerita.kotak.w < 50 || cerita.kotak.h < 10) {
    throw new Error(`judul ada di DOM tapi tidak punya ukuran: ${JSON.stringify(cerita.kotak)}`);
  }
  if (!cerita.gambar) {
    throw new Error(`gambar ${terbit.image} tidak dipasang di cerita`);
  }
  if (cerita.gambar.lebar === 0) {
    throw new Error(`gambar ${terbit.image} terpasang tapi gagal dimuat (naturalWidth 0)`);
  }
  lapor(
    `halaman Work membuka cerita dari CMS (${cerita.paragraf.length} paragraf, judul ${cerita.kotak.w}×${cerita.kotak.h}px, gambar ${cerita.gambar.lebar}×${cerita.gambar.tinggi}px)`,
  );
  await potret("8-work");

  /* 9 — bersihkan: hapus lalu publish, dan halaman Work ikut kehilangan */
  await send("Page.navigate", { url: "http://localhost:5174/admin/" });
  await tunggu(`!!document.querySelector(".sisi")`, "panel admin lagi");
  await jalan(BEKAL);
  if ((await jalan(`__anak("Work").length`)) === 0) {
    await jalan(`__bukaGrup("Work")`);
    await tunggu(`__anak("Work").length > 0`, "grup Work terbuka lagi");
  }
  await jalan(`__klikAnak("Work", "Case study")`);
  await tunggu(`!!document.querySelector("table")`, "daftar case study lagi");
  await jalan(BEKAL);

  await jalan(`__aksi(${JSON.stringify(JUDUL)}, "Hapus")`);
  await tunggu(`!!document.querySelector("dialog[open]")`, "dialog konfirmasi");
  const isiDialog = await jalan(`document.querySelector("dialog").innerText`);
  if (!isiDialog.includes(JUDUL)) throw new Error("dialog tidak menyebut judul ceritanya");
  await jalan(BEKAL);
  await jalan(`__klik("Ya, hapus")`);
  await tunggu(`!__judul().includes(${JSON.stringify(JUDUL)})`, "baris hilang dari daftar");
  await jalan(BEKAL);
  await jalan(`__klik("Publish")`);
  await tunggu(`__teks().includes("Sudah tayang")`, "kabar publish");
  if ((await judulTayang()).includes(JUDUL)) {
    throw new Error("case study terhapus masih ada di content.json");
  }
  const akhir = await judulTayang();
  lapor(`dihapus + Publish → hilang dari content.json (sisa: ${akhir.join(", ")})`);

  /* Galat konsol dari halaman /work tidak dihitung: di headless tanpa GPU,
     scene 3D-nya mengeluh soal WebGL dan keluhan itu bukan urusan probe ini. */
  const relevan = galatKonsol.filter((g) => !/webgl|context|three|gl_/i.test(g));
  if (relevan.length) {
    console.log("\n⚠ galat konsol:");
    for (const g of relevan) console.log("  " + g);
  } else {
    lapor("tidak ada galat konsol panel sepanjang jalan-jalan");
  }

  console.log("\nscreenshot: /tmp/case-*.png");
  ws.close();
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => brave.kill());

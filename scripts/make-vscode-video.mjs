/**
 * Bikin video sintetis "VS Code sedang mengetik" untuk layar MacBook —
 * pixel-art yang DIGAMBAR di resolusi target, bukan rekaman yang dikecilkan.
 *
 *   node scripts/make-vscode-video.mjs
 *   → public/screens/vscode-coding.mp4
 *
 * ── Kenapa sintetis, bukan rekaman layar ────────────────────────────────────
 * Sudah dicoba (5 Agu) dan hasilnya PUCET, dan sebabnya struktural, bukan
 * salah setelan: rekaman 2908 px diturunkan ke 72 px berarti reduksi 40× —
 * huruf setinggi 12 px jadi 0,3 px, jadi `flags=area` melarutkan teks putih
 * ke latar gelapnya dan luma maksimal videonya cuma 94/255. Satu-satunya
 * penyelamat adalah kurva yang MENGANGKAT BLACK POINT (0/0.24), dan kurva itu
 * persis yang membuat layarnya kelabu pucat di samping monitor AOC yang
 * pixel-art-nya digambar langsung dengan hitam sungguhan.
 *
 * Di sini tiap "baris kode" adalah balok 2 px yang ditaruh dengan sengaja —
 * sekelas dengan spotify-home.png, jadi kedua layar akhirnya setara: latar
 * gelap sungguhan, token warna jenuh penuh, tanpa kurva apa pun.
 *
 * ── Resolusi & encode ───────────────────────────────────────────────────────
 * Digambar 72×50 (aturan lebar-tampil ÷ 3 di screens.ts; aspek quad 1,438)
 * lalu digandakan ke 144×100 dengan `flags=neighbor` — BUKAN menaikkan
 * resolusi, cuma melawan subsampling chroma yuv420 yang 2×2 (penjelasan
 * lengkap di screens.ts). 12 fps cukup untuk animasi ketik dan menahan ukuran
 * berkas; `-an` wajib karena browser menolak autoplay video bersuara.
 *
 * ── Deterministik ───────────────────────────────────────────────────────────
 * "Random"-nya LCG ber-seed, jadi menjalankan ulang script menghasilkan berkas
 * yang identik — diff aset tidak pernah bising gara-gara undian.
 */
import { spawn } from "node:child_process";

const W = 72;
const H = 50;
const FPS = 12;
const SECONDS = 21;
const FRAMES = FPS * SECONDS;
const OUT = "public/screens/vscode-coding.mp4";

// ── Palet (sRGB) ─────────────────────────────────────────────────────────────
// Warna VS Code Dark+ tapi saturasinya dinaikkan: di 72 px satu token cuma
// beberapa piksel, warna kalem bawaan temanya melebur jadi abu-abu dari jarak
// 2,4 m. Latarnya #1e1e2a asli — TANPA black point terangkat; kontras datang
// dari kontennya, bukan dari kurva.
const BG = [30, 30, 42];
const TITLEBAR = [58, 58, 70];
const ACTIVITYBAR = [42, 42, 54];
const SIDEBAR = [37, 37, 48];
const SIDEBAR_ITEM = [130, 132, 148];
const SIDEBAR_ACTIVE = [235, 237, 245];
const TERMBG = [20, 20, 28];
const CARET = [255, 255, 255];
const STATUS = [0, 122, 204]; // biru khas status bar VS Code
const TRAFFIC = [
  [255, 95, 86],
  [255, 189, 46],
  [39, 201, 63],
];
// Token kode. Bobot kasar lewat pengulangan entri.
const TOKENS = [
  [197, 120, 220], // keyword ungu
  [197, 120, 220],
  [90, 170, 255], // biru identifier
  [90, 170, 255],
  [255, 150, 80], // string oranye
  [235, 235, 130], // kuning nama fungsi
  [225, 225, 235], // putih tanda baca/variabel
  [225, 225, 235],
];
const COMMENT = [85, 200, 105]; // hijau komentar — SATU baris, bukan dinding
const TERMTEXT = [80, 220, 110];
const TERMWHITE = [220, 224, 232];

// ── LCG ──────────────────────────────────────────────────────────────────────
let seed = 0xc51;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── Kanvas ───────────────────────────────────────────────────────────────────
const buf = new Uint8Array(W * H * 3);
function rect(x, y, w, h, [r, g, b]) {
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = Math.max(0, y); yy < y1; yy++)
    for (let xx = Math.max(0, x); xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
    }
}

// ── Tata letak ───────────────────────────────────────────────────────────────
// Meniru proporsi VS Code, dibulatkan ke piksel utuh:
//   y 0-2   title bar        x 0-2   activity bar
//   y 3-37  area kerja       x 3-13  sidebar (explorer)
//   y 38-47 panel terminal   x 14-71 editor
//   y 48-49 status bar
// Lebar entri sidebar — diundi SEKALI supaya stabil antar frame.
const SIDEBAR_W = Array.from({ length: 7 }, () => ri(5, 8));

const ED_X = 15; // 1 px jarak dari sidebar
const ED_TOP = 5;
const ROW_H = 3; // balok 2 px + 1 px spasi — "line-height" pixel-art
const ED_ROWS = 11; // (37-5)/3
const TERM_TOP = 39;
const TERM_ROWS = 4;

/**
 * Satu baris kode = indent + deretan segmen berwarna. Digambar sebagai balok
 * 2 px; lebar & warna segmen yang membuatnya terbaca "kode", bukan hurufnya.
 */
function makeLine() {
  if (rnd() < 0.12) {
    // Baris komentar: satu segmen hijau panjang.
    return { indent: ri(0, 2) * 3, segs: [{ w: ri(16, 30), c: COMMENT }] };
  }
  const segs = [];
  const n = ri(2, 4);
  for (let i = 0; i < n; i++) segs.push({ w: ri(4, 10), c: pick(TOKENS) });
  return { indent: ri(0, 3) * 3, segs };
}

// ── Keadaan animasi ──────────────────────────────────────────────────────────
const lines = []; // baris yang sudah dikomit (yang tampil = 11 terakhir)
let cur = makeLine(); // baris yang sedang "diketik"
let curPx = 0; // sudah terungkap berapa piksel
const termLines = []; // {w, c} — output terminal
let termBurst = 0; // sisa baris burst yang masih akan muncul
let termCooldown = ri(20, 40);

function drawFrame(f) {
  // Chrome jendela — statis, digambar ulang tiap frame (murah di 72×50).
  rect(0, 0, W, H, BG);
  rect(0, 0, W, 3, TITLEBAR);
  TRAFFIC.forEach((c, i) => rect(2 + i * 2, 1, 1, 1, c));
  rect(0, 3, 3, H - 3, ACTIVITYBAR);
  rect(1, 5, 1, 1, SIDEBAR_ACTIVE);
  rect(1, 8, 1, 1, SIDEBAR_ITEM);
  rect(1, 11, 1, 1, SIDEBAR_ITEM);
  rect(3, 3, 11, H - 3, SIDEBAR);
  // Daftar berkas; entri aktif ikut baris yang sedang diketik supaya sidebar
  // tidak terbaca beku. Lebarnya dari SIDEBAR_W (dihitung sekali di bawah) —
  // menyentuh `seed` di sini akan mereset LCG tiap frame dan membekukan
  // seluruh "random" animasinya.
  const active = Math.floor(lines.length / 6) % 7;
  SIDEBAR_W.forEach((w, i) => {
    rect(4, 5 + i * 3, w, 1, i === active ? SIDEBAR_ACTIVE : SIDEBAR_ITEM);
  });

  // Editor: 11 baris terakhir + baris yang sedang diketik di bawahnya.
  const visible = lines.slice(-(ED_ROWS - 1));
  const drawLine = (ln, row, clipPx) => {
    let x = ED_X + ln.indent;
    let left = clipPx;
    for (const s of ln.segs) {
      const w = Math.min(s.w, left);
      if (w <= 0) break;
      rect(x, ED_TOP + row * ROW_H, w, 2, s.c);
      x += s.w + 2;
      left -= s.w + 2;
    }
    return Math.min(x, ED_X + ln.indent + clipPx);
  };
  visible.forEach((ln, i) => drawLine(ln, i, 999));
  const caretX = drawLine(cur, visible.length, curPx);
  // Caret berkedip 3 frame nyala / 3 mati — 12 fps → 2 Hz, kedip khas editor.
  if (f % 6 < 3) rect(caretX, ED_TOP + visible.length * ROW_H, 1, 2, CARET);

  // Terminal.
  rect(3, TERM_TOP - 1, W - 3, H - TERM_TOP - 1, TERMBG);
  termLines.slice(-TERM_ROWS).forEach((t, i) => {
    rect(5, TERM_TOP + i * 2, t.w, 1, t.c);
  });

  // Status bar biru — bidang warna kecil yang langsung memberi tanda
  // "ini VS Code" bahkan di ukuran tampil 200-an px.
  rect(0, H - 2, W, 2, STATUS);
  rect(2, H - 2 + 1, 6, 1, [160, 210, 255]);
}

function step() {
  // Mengetik: 2-3 px per frame ≈ satu baris tiap ±0,8 s.
  curPx += ri(2, 3);
  const total = cur.segs.reduce((a, s) => a + s.w + 2, 0);
  if (curPx >= total) {
    lines.push(cur);
    cur = makeLine();
    curPx = 0;
  }

  // Terminal hidup dalam SEMBURAN: diam, lalu 2-4 baris muncul cepat —
  // pola "jalankan perintah, keluar output" alih-alih tetesan konstan.
  if (termBurst > 0) {
    termLines.push({ w: ri(10, 34), c: rnd() < 0.25 ? TERMWHITE : TERMTEXT });
    termBurst--;
    if (termBurst === 0) termCooldown = ri(25, 55);
  } else if (--termCooldown <= 0) {
    termBurst = ri(2, 4);
  }
}

// ── Render → ffmpeg ──────────────────────────────────────────────────────────
const ff = spawn(
  "ffmpeg",
  [
    "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-s", `${W}x${H}`,
    "-r", String(FPS),
    "-i", "-",
    // Naik 2× neighbor: piksel logis jatuh pas di blok chroma 2×2 yuv420.
    "-vf", "scale=144:100:flags=neighbor",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-g", "24",
    "-an",
    "-movflags", "+faststart",
    OUT,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

// Pra-isi editor supaya frame pertama tidak kosong — layar yang baru priming
// satu frame (lihat screenVideo.ts) pun sudah tampak berisi kode.
for (let i = 0; i < 8; i++) lines.push(makeLine());
termLines.push({ w: 22, c: TERMTEXT }, { w: 14, c: TERMWHITE });

for (let f = 0; f < FRAMES; f++) {
  drawFrame(f);
  step();
  if (!ff.stdin.write(Buffer.from(buf))) {
    await new Promise((res) => ff.stdin.once("drain", res));
  }
}
ff.stdin.end();
ff.on("close", (code) => {
  if (code !== 0) process.exit(code);
  console.log(`OK → ${OUT} (${FRAMES} frame, ${SECONDS} s @ ${FPS} fps)`);
});

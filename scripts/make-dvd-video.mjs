/**
 * Bikin video "logo cogniti mantul" ala screensaver DVD untuk TV Function Room.
 *
 *   node scripts/make-dvd-video.mjs
 *   → public/screens/dvd-logo.mp4
 *
 * ── Kenapa disintesis, bukan direkam/dianimasikan di tool lain ──────────────
 * Isinya cuma satu gambar yang bergeser di atas latar hitam. Merekam layar
 * atau meng-export dari After Effects untuk itu berarti menyimpan aset yang
 * tidak bisa diubah tanpa membuka tool-nya lagi; di sini kecepatan, ukuran
 * logo, dan panjang loop-nya angka di kepala berkas ini.
 *
 * Lebih penting: hasilnya DETERMINISTIK. Tidak ada undian sama sekali (beda
 * dengan make-vscode-video.mjs yang pakai LCG ber-seed), jadi menjalankan
 * ulang script menghasilkan berkas yang identik byte demi byte.
 *
 * ── Loop-nya HARUS mulus, dan itu yang menentukan angka-angkanya ────────────
 * Gerak mantul itu gelombang segitiga. Horizontal dan vertikal punya periode
 * sendiri-sendiri, dan kalau panjang video bukan kelipatan persekutuan
 * keduanya, logo akan MELOMPAT setiap kali video mengulang — cacat yang
 * gampang lolos waktu ngecek 5 detik pertama lalu bikin orang menyalahkan
 * encode-nya.
 *
 * Dihindari dengan memaksa kedua periode SAMA PERSIS dengan panjang video:
 * kecepatannya diturunkan DARI panjang loop (`2 × rentang ÷ FRAMES`), bukan
 * dipilih lalu diharap pas. Mau ubah kecepatan? ubah FRAMES.
 *
 * ── Kenapa tidak pernah kena sudut ──────────────────────────────────────────
 * Kalau fase X dan Y sama, keduanya mencapai ujung di frame yang sama dan logo
 * kena sudut di SETIAP pantulan — persis yang membunuh leluconnya. Fase Y
 * digeser seperempat periode, jadi dalam satu loop ada empat pantulan yang
 * jaraknya rata dan tidak satu pun di sudut. Penontonnya menunggu selamanya,
 * dan memang itu intinya.
 *
 * ── Kenapa digambar 212 px lalu digandakan 2× ───────────────────────────────
 * 212 px itu ukuran aset yang dipakai TV meeting (~0,38 teksel per piksel
 * tampil); dua TV bersebelahan harus sama kasarnya. Penggandaan ke 424 px
 * BUKAN menaikkan resolusi — itu melawan subsampling chroma yuv420 yang 2×2,
 * yang kalau tidak dilawan membuat aksen MERAH logo lembek sementara bagian
 * silver-nya tetap tajam. Alasan lengkapnya di screens.ts (entri MacBook).
 */
import { spawn, spawnSync } from "node:child_process";

// ── Kanvas ───────────────────────────────────────────────────────────────────
// Aspek quad TV Function 1,711; 212×124 = 1,710. Selisihnya di bawah setengah
// piksel, jadi gambarnya tidak melar.
const W = 212;
const H = 124;

// Lebar logo dalam piksel aset, bisa ditimpa dari CLI:
//
//   node scripts/make-dvd-video.mjs 60
//
// Ada sebagai argumen karena ini satu-satunya angka yang dipilih dengan MATA,
// bukan dihitung — dan memilihnya berarti me-render beberapa kandidat lalu
// membandingkannya DI DALAM SCENE, bukan menatap mp4-nya. Layarnya kecil dan
// miring di kejauhan; ukuran yang terasa pas waktu video diputar sendirian
// selalu kegedean begitu ditempel ke TV.
//
// Riwayatnya: 100 px (47% lebar layar) ditolak — kegedean, dan ruang mantulnya
// habis sehingga geraknya terbaca bergetar bukan melayang. 76/60/44 juga
// dirender; yang dipilih 32 px (15% lebar layar), sesuai permintaan "kecil
// banget". Di ukuran itu tulisan "cogniti" memang tinggal 12 px tingginya dan
// tidak terbaca sebagai kata — dan itu MEMANG maunya: yang dijual gerak
// mantulnya, bukan logonya. Jangan "perbaiki" dengan membesarkannya.
//
// Semua kandidat diukur di scene dan tidak satu pun menembus ambang Bloom
// (maks 227–230, 0% di atas 249), jadi mengubah angka ini tidak menggeser
// `emissive: 1.0` di screens.ts.
const LOGO_W = Number(process.argv[2] ?? 32);

// DITURUNKAN, bukan ditulis tangan — aspek logo aslinya 2914/1067 = 2,731, dan
// mengetiknya sendiri berarti satu angka lagi yang bisa lupa diubah waktu
// LOGO_W diganti (gejalanya logo gepeng, dan itu tidak kentara di 212 px).
const LOGO_H = Math.round((LOGO_W * 1067) / 2914);

const FPS = 15;
const FRAMES = 300; // 20 detik, sekaligus panjang satu periode mantul penuh
const SRC = "public/brand/Logo-Final.png";
const OUT = "public/screens/dvd-logo.mp4";

const RANGE_X = W - LOGO_W;
const RANGE_Y = H - LOGO_H;

// Diturunkan DARI panjang loop — lihat catatan "loop harus mulus" di atas.
const VX = (2 * RANGE_X) / FRAMES;
const VY = (2 * RANGE_Y) / FRAMES;

// Seperempat periode. Ini satu-satunya alasan logo tidak pernah kena sudut.
const PHASE_Y = RANGE_Y / 2;

/** Gelombang segitiga: memantul di 0 dan `range`, tanpa diskontinuitas. */
function bounce(t, v, range, phase) {
  const span = 2 * range;
  const x = (t * v + phase) % span;
  return Math.round(Math.abs(x - range));
}

/**
 * Muat logo sebagai RGB mentah, SUDAH dikomposit di atas hitam.
 *
 * Komposit dilakukan di resolusi PENUH lalu baru diperkecil, bukan sebaliknya.
 * Logo-nya PNG beralpha, dan memperkecil RGBA lebih dulu membuat scaler ikut
 * merata-ratakan warna piksel yang alpha-nya nol — di berkas ini piksel itu
 * PUTIH, jadi hasilnya garis terang tipis mengelilingi tiap huruf. Cacat itu
 * tak kelihatan di 2914 px dan menelan hurufnya di 32 px.
 *
 * Karena latar videonya memang hitam, hasil komposit itu bisa dipakai apa
 * adanya sebagai gambar opaque — tidak perlu blending sama sekali saat
 * menyusun frame.
 *
 * `flags=area`, bukan neighbor: ini grafis vektor bersih, dan neighbor di
 * reduksi 91× (2914 → 32) tidak merata-ratakan apa pun — ia mengambil satu
 * piksel per 91 dan batang huruf yang tipis akan hilang sama sekali, bukan
 * sekadar kasar. Kekasaran PS1-nya tetap datang, tapi dari NearestFilter di
 * GPU yang membesarkan aset 212 px ke ±560 px layar.
 */
function loadLogo() {
  const r = spawnSync(
    "ffmpeg",
    [
      "-v", "error",
      "-i", SRC,
      "-filter_complex",
      `color=c=black:s=2914x1067[bg];[bg][0:v]overlay=format=auto,` +
        `scale=w=${LOGO_W}:h=${LOGO_H}:flags=area,format=rgb24`,
      // WAJIB. Sumber `color` itu generator TAK TERBATAS — ia terus mengeluarkan
      // frame hitam selamanya, dan `overlay` mengikuti durasi input pertamanya.
      // Tanpa batas ini perintahnya tidak pernah selesai; gejalanya bukan error
      // melainkan MENGGANTUNG, lalu spawnSync membunuhnya karena maxBuffer
      // penuh dan stderr-nya kosong sehingga tidak ada petunjuk sama sekali.
      "-frames:v", "1",
      "-f", "rawvideo",
      "-pix_fmt", "rgb24",
      "-",
    ],
    { maxBuffer: 1 << 28 },
  );

  if (r.error || r.status !== 0) {
    throw new Error(
      `Gagal membaca ${SRC}:\n${r.stderr?.toString() ?? r.error?.message}`,
    );
  }

  const want = LOGO_W * LOGO_H * 3;
  if (r.stdout.length !== want) {
    throw new Error(
      `Ukuran logo tidak sesuai dugaan: ${r.stdout.length} byte, ` +
        `harusnya ${want}. Sumbernya berubah?`,
    );
  }
  return r.stdout;
}

const logo = loadLogo();

const ff = spawn(
  "ffmpeg",
  [
    "-v", "error",
    "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-s", `${W}x${H}`,
    "-r", String(FPS),
    "-i", "-",
    // Penggandaan 2× melawan chroma yuv420 — lihat kepala berkas.
    "-vf", `scale=w=${W * 2}:h=${H * 2}:flags=neighbor`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "26",
    "-g", String(FPS * 2),
    // -an: browser MENOLAK autoplay video bersuara, dan layarnya akan beku di
    // frame pertama — bukan sekadar bisu. Video ini memang tak punya audio,
    // tapi flag-nya tetap ditulis supaya tidak hilang kalau resepnya disalin.
    "-an",
    // +faststart: tanpa ini atom moov ditaruh di akhir dan browser harus
    // mengunduh seluruh berkas sebelum bisa memutar. Dijaga otomatis oleh
    // screenVideo.invariant.test.ts.
    "-movflags", "+faststart",
    OUT,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const frame = Buffer.alloc(W * H * 3);

for (let t = 0; t < FRAMES; t++) {
  frame.fill(0); // layar TV mati: hitam pekat, bukan abu-abu

  const x = bounce(t, VX, RANGE_X, 0);
  const y = bounce(t, VY, RANGE_Y, PHASE_Y);

  for (let row = 0; row < LOGO_H; row++) {
    logo.copy(
      frame,
      ((y + row) * W + x) * 3, // tujuan
      row * LOGO_W * 3, // awal baris sumber
      (row + 1) * LOGO_W * 3, // akhir baris sumber
    );
  }

  if (!ff.stdin.write(frame)) {
    await new Promise((res) => ff.stdin.once("drain", res));
  }
}

ff.stdin.end();

const code = await new Promise((res) => ff.on("close", res));
if (code !== 0) {
  console.error(`ffmpeg keluar dengan kode ${code}`);
  process.exit(1);
}

console.log(
  `${OUT} — ${W * 2}×${H * 2}, ${FPS} fps, ${FRAMES} frame ` +
    `(${(FRAMES / FPS).toFixed(1)} detik, loop mulus)`,
);

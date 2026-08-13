/**
 * Hapus logo Apple dari punggung lid `macbook-inquiry.glb`.
 *
 *   node scripts/strip-macbook-logo.mjs [glb] [--dry]
 *
 * Kenapa ada skrip, bukan sekali edit manual di Photoshop: logonya hidup di
 * tekstur yang TERTANAM di dalam GLB, jadi menggantinya berarti membongkar dan
 * menyusun ulang chunk BIN plus semua offset bufferView. Ditulis sekali di sini
 * supaya bisa diulang kalau asetnya di-export ulang dari Blender — bukan langkah
 * manual yang hilang begitu orangnya lupa.
 *
 * Cara menghapusnya: INPAINT, bukan menimpa dengan satu warna solid. Tiap baris
 * di dalam kotak logo di-interpolasi mendatar antara piksel bersih persis di
 * kiri dan kanannya, jadi gradasi halus punggung lid (250 di kiri → 247 di
 * kanan, dan bervariasi menurut baris) ikut terjaga dan tidak ada tambalan
 * kotak yang kelihatan.
 *
 * Terverifikasi: logonya HANYA ada di baseColor. Normal map rata (128,128,255)
 * dan occlusion/metallic-roughness seragam di kotak yang sama — jadi tidak ada
 * "hantu" timbul yang tertinggal setelah baseColor ditambal.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { readGlb, repackBin, writeGlb } from "./lib/glb.mjs";

const args = process.argv.slice(2);
const GLB = args.find((a) => !a.startsWith("--")) ?? "public/3d/models/macbook-inquiry.glb";
const DRY = args.includes("--dry");

/** Kotak pencarian: punggung lid saja. Sengaja tidak seluruh tekstur — layar
 *  dan keyboard juga gelap, dan pernah membuat bbox-nya melar ke 293×413. */
const SEARCH = { x0: 100, x1: 420, y0: 60, y1: 320 };
const DARK = 150; // luminance; latar punggung lid ada di 240-253
const PAD = 6; // tepi anti-alias logonya lebih lebar dari piksel gelapnya

const { json, bin } = readGlb(GLB);

const matIdx = json.materials?.findIndex(
  (m) => m.pbrMetallicRoughness?.baseColorTexture,
);
if (matIdx == null || matIdx < 0) throw new Error("tidak ada baseColorTexture");
const texIdx = json.materials[matIdx].pbrMetallicRoughness.baseColorTexture.index;
const imgIdx = json.textures[texIdx].source;
const image = json.images[imgIdx];
const view = json.bufferViews[image.bufferView];
const start = view.byteOffset ?? 0;
const original = bin.subarray(start, start + view.byteLength);

const { data, info } = await sharp(original)
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const sx = W / 1024;
const sy = H / 1024;

// 1. temukan kotak logo
let x0 = Infinity;
let x1 = -1;
let y0 = Infinity;
let y1 = -1;
for (let y = Math.round(SEARCH.y0 * sy); y < Math.round(SEARCH.y1 * sy); y++) {
  for (let x = Math.round(SEARCH.x0 * sx); x < Math.round(SEARCH.x1 * sx); x++) {
    const i = (y * W + x) * C;
    if ((data[i] + data[i + 1] + data[i + 2]) / 3 >= DARK) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
if (x1 < 0) throw new Error("logo tidak ditemukan — apakah sudah dihapus?");

x0 = Math.max(1, x0 - PAD);
x1 = Math.min(W - 2, x1 + PAD);
y0 = Math.max(0, y0 - PAD);
y1 = Math.min(H - 1, y1 + PAD);
console.log(`kotak logo (+pad ${PAD}): x ${x0}..${x1}  y ${y0}..${y1}`);

// 2. inpaint mendatar per baris
for (let y = y0; y <= y1; y++) {
  const li = (y * W + (x0 - 1)) * C;
  const ri = (y * W + (x1 + 1)) * C;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0 + 1) / (x1 - x0 + 2);
    const i = (y * W + x) * C;
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.round(data[li + c] * (1 - t) + data[ri + c] * t);
    }
  }
}

// 3. buktikan bersih — jangan percaya begitu saja
let left = 0;
for (let y = Math.round(SEARCH.y0 * sy); y < Math.round(SEARCH.y1 * sy); y++) {
  for (let x = Math.round(SEARCH.x0 * sx); x < Math.round(SEARCH.x1 * sx); x++) {
    const i = (y * W + x) * C;
    if ((data[i] + data[i + 1] + data[i + 2]) / 3 < DARK) left++;
  }
}
if (left) throw new Error(`masih ada ${left} piksel gelap di punggung lid`);
console.log("punggung lid bersih: 0 piksel gelap tersisa");

/* `effort: 10`, bukan default sharp (7). Tanpa itu hasilnya 327KB — LEBIH BESAR
   dari 262KB aslinya, karena encoder bawaan sharp menyerah lebih cepat daripada
   yang memampatkan PNG ini pertama kali. Dengan effort penuh: 140KB, dan tetap
   LOSSLESS. Kuantisasi palet (`palette: true`) juga mendarat di 140KB, jadi
   tidak ada alasan menukar gradasi punggung lid dengan 256 warna. */
const png = await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();
console.log(
  `tekstur ${(view.byteLength / 1024).toFixed(0)}KB → ${(png.length / 1024).toFixed(0)}KB`,
);

if (DRY) {
  writeFileSync("/tmp/basecolor-nologo.png", png);
  console.log("--dry: /tmp/basecolor-nologo.png, GLB tidak disentuh");
  process.exit(0);
}

// 4. susun ulang BIN — panjang PNG-nya berubah, jadi semua offset setelahnya geser
const newBin = repackBin(json, bin, { [image.bufferView]: png });
if (image.mimeType) image.mimeType = "image/png";

writeGlb(GLB, json, newBin);
console.log(`ditulis ${GLB}`);

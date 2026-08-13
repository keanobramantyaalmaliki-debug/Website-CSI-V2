/**
 * Padamkan layar `macbook-inquiry.glb` — wallpaper macOS-nya dihapus, muka lid
 * jadi hitam rata, siap dipakai sebagai latar form HTML.
 *
 *   node scripts/blacken-macbook-screen.mjs [glb] [--dry]
 *
 * Kenapa MERASTER SEGITIGA, bukan menghitamkan kotak UV:
 * pulau UV itu bukan persegi panjang. Bounding box muka lid (x 515..853,
 * y 1..513) ikut memuat 8 piksel milik DUA segitiga `Base` di pojoknya —
 * luminance ~202, perak terang, jelas bukan layar. Menghitamkan seluruh kotak
 * berarti melubangi geometri Base dengan bercak hitam. Jadi masker dibangun
 * dari segitiga yang sebenarnya:
 *
 *   masker = raster(muka lid, +dilate)  DIKURANGI  raster(semua segitiga lain)
 *
 * Dilate-nya perlu karena bilinear/mipmap mencicip di luar tepi UV; pengurangan
 * segitiga lain memastikan dilate itu tidak merembes ke tetangga.
 *
 * Kenapa SELURUH muka lid, bukan cuma area gambar: pada MacBook asli bezel dan
 * panel itu satu lembar kaca hitam yang sama. Grup normal (0, 0.3, 0.9) di mesh
 * Lid persis seluas muka lid (692,8 cm² ≈ 31,3 × 22,16 cm), jadi menghitamkan
 * grup itu = menghitamkan kaca depannya. Bibir aluminium di sekelilingnya
 * bernormal lain, tidak ikut tersentuh.
 *
 * Warnanya tidak nol pekat. Material ini `metallic = 1`, dan untuk logam
 * three.js memakai baseColor sebagai F0 — baseColor 0 berarti NOL pantulan,
 * layarnya jadi lubang mati yang datar. `SCREEN` di bawah menyisakan pantulan
 * lingkungan tipis, jadi bacaannya kaca hitam, bukan guntingan kertas.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { imageBytes, readAccessor, readGlb, repackBin, writeGlb } from "./lib/glb.mjs";

const args = process.argv.slice(2);
const GLB = args.find((a) => !a.startsWith("--")) ?? "public/3d/models/macbook-inquiry.glb";
const DRY = args.includes("--dry");

const LID_MESH = "Lid";
const FRONT_NZ = 0.5; // normal.z di atas ini = menghadap depan (muka lid ≈ 0,94)
/* Marginnya 4 piksel, bukan 1-2: pojok muka lid membulat, jadi di luar segitiga
   langsung ada latar atlas yang PUTIH. Mipmap mencicip lebih lebar dari
   bilinear, dan sepercik putih di pojok layar hitam sangat kentara. Melebarkan
   margin tidak berisiko — masker `keep` di bawah tetap mengurangi apa pun yang
   dipakai geometri lain, dan terukur 0 piksel yang perlu dilewati. */
const DILATE = 4;
const SCREEN = [8, 8, 10]; // kaca hitam, bukan nol pekat — lihat docstring

const { json, bin } = readGlb(GLB);

// --- kumpulkan segitiga: mana muka lid, mana bukan
const lidFront = [];
const others = [];
json.meshes.forEach((mesh) => {
  const isLid = mesh.name === LID_MESH;
  mesh.primitives.forEach((prim) => {
    const N = readAccessor(json, bin, prim.attributes.NORMAL);
    const UV = readAccessor(json, bin, prim.attributes.TEXCOORD_0);
    const I = readAccessor(json, bin, prim.indices);
    for (let t = 0; t < I.length; t += 3) {
      const tri = [I[t], I[t + 1], I[t + 2]];
      const front = isLid && tri.every((i) => N[i][2] > FRONT_NZ);
      (front ? lidFront : others).push(tri.map((i) => UV[i]));
    }
  });
});
if (!lidFront.length) throw new Error(`tidak ada segitiga menghadap depan di mesh "${LID_MESH}"`);
console.log(`segitiga muka lid ${lidFront.length}, segitiga lain ${others.length}`);

// --- tekstur baseColor
const material = json.materials.find((m) => m.pbrMetallicRoughness?.baseColorTexture);
if (!material) throw new Error("tidak ada baseColorTexture");
const imgIdx = json.textures[material.pbrMetallicRoughness.baseColorTexture.index].source;
const image = json.images[imgIdx];
const original = imageBytes(json, bin, imgIdx);

const { data, info } = await sharp(original).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

/**
 * Raster segitiga UV ke masker piksel. Uji cakupan barisentrik di TITIK TENGAH
 * piksel; bbox-nya diperluas 1 piksel supaya segitiga tipis yang tidak melewati
 * satu pun titik tengah tetap tertangkap lewat dilate.
 */
function rasterize(tris) {
  const mask = new Uint8Array(W * H);
  for (const tri of tris) {
    const px = tri.map(([u, v]) => [u * W, v * H]);
    const x0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[0])) - 1));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...px.map((p) => p[0])) + 1));
    const y0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[1])) - 1));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(...px.map((p) => p[1])) + 1));

    const [ax, ay] = px[0];
    const [bx, by] = px[1];
    const [cx, cy] = px[2];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue; // segitiga degenerate di UV

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const pxc = x + 0.5;
        const pyc = y + 0.5;
        const w0 = ((bx - ax) * (pyc - ay) - (by - ay) * (pxc - ax)) / area;
        const w1 = ((cx - bx) * (pyc - by) - (cy - by) * (pxc - bx)) / area;
        const w2 = ((ax - cx) * (pyc - cy) - (ay - cy) * (pxc - cx)) / area;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) mask[y * W + x] = 1;
      }
    }
  }
  return mask;
}

function dilate(mask, radius) {
  let cur = mask;
  for (let r = 0; r < radius; r++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (cur[y * W + x]) continue;
        const up = y > 0 && cur[(y - 1) * W + x];
        const down = y < H - 1 && cur[(y + 1) * W + x];
        const left = x > 0 && cur[y * W + x - 1];
        const right = x < W - 1 && cur[y * W + x + 1];
        if (up || down || left || right) next[y * W + x] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

const screen = dilate(rasterize(lidFront), DILATE);
const keep = dilate(rasterize(others), 1);

let painted = 0;
let spared = 0;
for (let i = 0; i < screen.length; i++) {
  if (!screen[i]) continue;
  if (keep[i]) {
    spared++;
    continue;
  }
  const p = i * C;
  data[p] = SCREEN[0];
  data[p + 1] = SCREEN[1];
  data[p + 2] = SCREEN[2];
  painted++;
}
console.log(`dicat ${painted} piksel; ${spared} dilewati karena dipakai geometri lain`);

// --- buktikan, jangan percaya begitu saja
if (!painted) throw new Error("nol piksel dicat — masker meleset");
let bright = 0;
for (let i = 0; i < screen.length; i++) {
  if (!screen[i] || keep[i]) continue;
  const p = i * C;
  if ((data[p] + data[p + 1] + data[p + 2]) / 3 > 20) bright++;
}
if (bright) throw new Error(`masih ada ${bright} piksel terang di muka lid`);
console.log("muka lid padam: 0 piksel terang tersisa");

/* `effort: 10` wajib — default sharp (7) menghasilkan PNG lebih besar dari
   aslinya. Lihat catatan yang sama di `strip-macbook-logo.mjs`. */
const png = await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();
console.log(
  `tekstur ${(original.length / 1024).toFixed(0)}KB → ${(png.length / 1024).toFixed(0)}KB`,
);

if (DRY) {
  writeFileSync("/tmp/basecolor-blackscreen.png", png);
  console.log("--dry: /tmp/basecolor-blackscreen.png, GLB tidak disentuh");
  process.exit(0);
}

const newBin = repackBin(json, bin, { [image.bufferView]: png });
if (image.mimeType) image.mimeType = "image/png";
writeGlb(GLB, json, newBin);
console.log(`ditulis ${GLB}`);

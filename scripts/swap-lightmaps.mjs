/**
 * Tukar byte image lightmap di GLB dengan versi baru dari folder PNG —
 * geometri & semua bufferView lain tersalin byte-identik.
 *
 * Saudara kandung shrink-lightmaps.mjs (baca komentar di sana kenapa
 * WAJIB operasi level kontainer, bukan gltf-transform: decode+encode ulang
 * Draco itu lossy dan pernah memunculkan segitiga terang di rak cubby).
 *
 * Dipakai pertama 6 Agu untuk pass denoise+white-balance meeting room:
 * EXR bake → denoise OIDN (compositor Blender) → ÷4 clamp → PNG per image
 * (nama LMT8_<x>.png) → skrip ini memasukkannya kembali sebagai WebP
 * seukuran image yang digantikan (256px, mengikuti hasil shrink-lightmaps).
 *
 *   node scripts/swap-lightmaps.mjs <in.glb> <folder-png> <out.glb>
 *
 * Hanya image yang PUNYA pasangan file di folder yang disentuh; sisanya
 * dibiarkan. Nama file harus sama dengan `image.name` di GLB + ".png".
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const [input, dir, output] = process.argv.slice(2);
if (!input || !dir || !output) {
  console.error("pakai: node scripts/swap-lightmaps.mjs <in.glb> <folder-png> <out.glb>");
  process.exit(1);
}

// ── Bongkar kontainer GLB ──────────────────────────────────────────────────
const glb = await readFile(input);
if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error("bukan file GLB");
const chunks = [];
for (let p = 12; p < glb.readUInt32LE(8); ) {
  const len = glb.readUInt32LE(p);
  const type = glb.readUInt32LE(p + 4);
  chunks.push({ type, data: glb.subarray(p + 8, p + 8 + len) });
  p += 8 + len;
}
const JSON_TYPE = 0x4e4f534a;
const BIN_TYPE = 0x004e4942;
const json = JSON.parse(chunks.find((c) => c.type === JSON_TYPE).data.toString());
const bin = chunks.find((c) => c.type === BIN_TYPE).data;

// ── Pasangkan file PNG dengan image GLB ────────────────────────────────────
const available = new Set(await readdir(dir));
const replacements = new Map(); // bufferView index → Buffer baru
let swapped = 0;
for (const image of json.images ?? []) {
  const file = `${image.name}.png`;
  if (!image.name || !available.has(file) || image.bufferView == null) continue;
  const bv = json.bufferViews[image.bufferView];
  const old = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  const { width } = await sharp(old).metadata();
  // Ikuti resolusi image yang digantikan (hasil shrink 256px) — PNG sumber
  // 512/1024/2048 diciutkan ke situ. Lossless: alasan sama dgn shrink-lightmaps.
  const out = await sharp(join(dir, file))
    .resize(width, width, { fit: "inside" })
    .webp({ lossless: true })
    .toBuffer();
  replacements.set(image.bufferView, out);
  swapped++;
}
console.log(`swap ${swapped} lightmap dari ${dir}`);

// ── Rakit ulang BIN (identik dengan shrink-lightmaps.mjs) ──────────────────
const align4 = (n) => (n + 3) & ~3;
let offset = 0;
const parts = [];
for (const bv of json.bufferViews) {
  const data =
    replacements.get(json.bufferViews.indexOf(bv)) ??
    bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  offset = align4(offset);
  parts.push({ pad: offset - (parts.at(-1)?.end ?? 0), data });
  bv.byteOffset = offset;
  bv.byteLength = data.length;
  parts.at(-1).end = offset + data.length;
  offset += data.length;
}
const newBin = Buffer.concat(parts.flatMap((p) => [Buffer.alloc(p.pad), p.data]));
json.buffers[0].byteLength = newBin.length;

// ── Tulis GLB baru ─────────────────────────────────────────────────────────
let jsonBuf = Buffer.from(JSON.stringify(json));
jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(align4(jsonBuf.length) - jsonBuf.length, 0x20)]);
const binPadded = Buffer.concat([newBin, Buffer.alloc(align4(newBin.length) - newBin.length)]);
const total = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
const head = Buffer.alloc(12 + 8);
head.writeUInt32LE(0x46546c67, 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(total, 8);
head.writeUInt32LE(jsonBuf.length, 12);
head.writeUInt32LE(JSON_TYPE, 16);
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(binPadded.length, 0);
binHead.writeUInt32LE(BIN_TYPE, 4);
await writeFile(output, Buffer.concat([head, jsonBuf, binHead, binPadded]));
console.log(`ditulis: ${output}`);

/**
 * Ciutkan lightmap GLB ke 256px TANPA menyentuh geometri.
 *
 * Bekerja di level kontainer GLB (JSON chunk + BIN chunk): hanya byte image
 * yang ditukar; bufferView Draco tersalin byte-per-byte identik.
 *
 * KENAPA BUKAN gltf-transform API: NodeIO.read men-decode Draco, jadi menulis
 * balik WAJIB encode ulang — dan itu lossy apa pun setelannya (grid kuantisasi
 * baru tak pernah persis sama dengan milik exporter). Review 5 Agu: encode
 * ulang memunculkan segitiga terang di panel rak cubby (bocor UV antar island
 * lightmap) MESKI lightmap rak itu tidak diciutkan; menaikkan quantizeTexcoord
 * ke 14 bit tidak menolong. `gltf-transform resize` CLI juga bukan pilihan:
 * ia melewati tekstur WebP diam-diam (hanya dukung PNG/JPEG).
 *
 * Lightmap (image bernama "LM…") aman diturunkan ke 256px karena isinya
 * low-frequency — gradasi cahaya, bukan detail tajam. Image lain tidak
 * disentuh.
 *
 *   node scripts/shrink-lightmaps.mjs <input.glb> <output.glb> [maxsize=256]
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

/**
 * Lightmap yang TIDAK diciutkan (tetap resolusi asli), berdasarkan nama
 * tekstur. Rak cubby dikecualikan sebagai kehati-hatian saat menyelidiki
 * artefak 5 Agu; boleh dicoba dilepas setelah pipeline byte-identik ini
 * terbukti bersih.
 */
const KEEP_FULL = new Set(["LM_OP_Shelf_Cubby_B"]);

const [input, output, maxArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("pakai: node scripts/shrink-lightmaps.mjs <in.glb> <out.glb> [maxsize]");
  process.exit(1);
}
const MAX = Number(maxArg ?? 256);

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
const JSON_TYPE = 0x4e4f534a; // 'JSON'
const BIN_TYPE = 0x004e4942; // 'BIN\0'
const json = JSON.parse(chunks.find((c) => c.type === JSON_TYPE).data.toString());
const bin = chunks.find((c) => c.type === BIN_TYPE).data;

// ── Tentukan image mana yang boleh diciutkan ───────────────────────────────
// Di GLB ini nama hidup di `images` (tekstur-teksturnya anonim; source WebP
// dirujuk lewat extensions.EXT_texture_webp.source, bukan texture.source),
// jadi cukup saring berdasarkan nama image itu sendiri.
const shrinkable = (image) => {
  const name = image.name ?? "";
  return name.startsWith("LM") && !KEEP_FULL.has(name);
};

// ── Ciutkan image terpilih ─────────────────────────────────────────────────
const replacements = new Map(); // bufferView index → Buffer baru
let resized = 0;
for (const image of json.images ?? []) {
  if (!shrinkable(image) || image.bufferView == null) continue;
  const bv = json.bufferViews[image.bufferView];
  const bytes = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  const meta = await sharp(bytes).metadata();
  if (Math.max(meta.width, meta.height) <= MAX) continue;
  // Lossless: sumbernya sudah WebP lossy; kompresi lossy kedua menumpuk
  // artefak blok di gradasi gelap — persis area yang paling terlihat di
  // lightmap. Downsample-nya sendiri sudah menghemat.
  const out = await sharp(bytes)
    .resize(MAX, MAX, { fit: "inside" })
    .webp({ lossless: true })
    .toBuffer();
  replacements.set(image.bufferView, out);
  resized++;
}
console.log(`resized ${resized} lightmap → ≤${MAX}px`);

// ── Rakit ulang BIN: salin tiap bufferView apa adanya / pakai pengganti ────
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
const newBin = Buffer.concat(
  parts.flatMap((p) => [Buffer.alloc(p.pad), p.data]),
);
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

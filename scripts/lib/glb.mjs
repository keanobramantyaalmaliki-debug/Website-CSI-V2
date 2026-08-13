/**
 * Bedah GLB biner: baca chunk, baca accessor, susun ulang BIN, tulis balik.
 *
 * Dipakai bersama oleh `strip-macbook-logo.mjs` dan `blacken-macbook-screen.mjs`.
 * Dipisah ke sini karena mengganti satu tekstur tertanam berarti MEMBANGUN ULANG
 * seluruh chunk BIN — panjang PNG-nya berubah, jadi tiap `bufferView.byteOffset`
 * setelahnya ikut geser. Salah satu offset meleset = GLB rusak diam-diam
 * (three.js memuatnya tanpa error, hasilnya mesh berantakan). Ditulis sekali.
 */
import { readFileSync, writeFileSync } from "node:fs";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const MAGIC = 0x46546c67; // "glTF"

/** Baca GLB dari disk → `{ json, bin }`. `bin` disalin, aman dimutasi. */
export function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== MAGIC) throw new Error(`${path}: bukan GLB`);

  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString("utf8"));
    else if (type === BIN_CHUNK) bin = Buffer.from(data);
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json || !bin) throw new Error(`${path}: GLB tanpa chunk JSON/BIN`);
  return { json, bin };
}

/** Rakit `{ json, bin }` jadi satu Buffer GLB v2. */
export function buildGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBuf.length + jsonPad + 8 + bin.length + binPad;

  const out = Buffer.alloc(total);
  let o = 0;
  out.writeUInt32LE(MAGIC, o);
  o += 4;
  out.writeUInt32LE(2, o);
  o += 4;
  out.writeUInt32LE(total, o);
  o += 4;

  out.writeUInt32LE(jsonBuf.length + jsonPad, o);
  o += 4;
  out.writeUInt32LE(JSON_CHUNK, o);
  o += 4;
  jsonBuf.copy(out, o);
  o += jsonBuf.length;
  out.fill(0x20, o, o + jsonPad); // JSON dipadding SPASI
  o += jsonPad;

  out.writeUInt32LE(bin.length + binPad, o);
  o += 4;
  out.writeUInt32LE(BIN_CHUNK, o);
  o += 4;
  bin.copy(out, o);
  o += bin.length;
  out.fill(0x00, o, o + binPad); // BIN dipadding NOL

  return out;
}

/**
 * Susun ulang chunk BIN dengan sebagian bufferView diganti isinya.
 *
 * @param replacements `{ [indeks bufferView]: Buffer }`
 * @returns BIN baru. `json.bufferViews[*].byteOffset/byteLength` dan
 *          `json.buffers[0].byteLength` ikut diperbarui di tempat.
 */
export function repackBin(json, bin, replacements) {
  const parts = [];
  let cursor = 0;
  json.bufferViews.forEach((bv, i) => {
    const src =
      replacements[i] ??
      bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) {
      parts.push(Buffer.alloc(pad));
      cursor += pad;
    }
    bv.byteOffset = cursor;
    bv.byteLength = src.length;
    parts.push(src);
    cursor += src.length;
  });
  const out = Buffer.concat(parts);
  json.buffers[0].byteLength = out.length;
  return out;
}

/** Tulis `{ json, bin }` ke disk sebagai GLB. */
export function writeGlb(path, json, bin) {
  writeFileSync(path, buildGlb(json, bin));
}

const COMPONENT = {
  5120: ["readInt8", 1],
  5121: ["readUInt8", 1],
  5122: ["readInt16LE", 2],
  5123: ["readUInt16LE", 2],
  5125: ["readUInt32LE", 4],
  5126: ["readFloatLE", 4],
};
const COMPONENTS_PER = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/**
 * Baca satu accessor jadi array biasa. SCALAR → `number[]`, sisanya → `number[][]`.
 *
 * ⚠️ Nama method Buffer-nya bukan tebakan: `readFloatLE`, BUKAN `readFloat32LE`
 * (yang tidak ada dan gagalnya baru kelihatan saat runtime).
 */
export function readAccessor(json, bin, index) {
  const a = json.accessors[index];
  const bv = json.bufferViews[a.bufferView];
  const [fn, size] = COMPONENT[a.componentType];
  const n = COMPONENTS_PER[a.type];
  const stride = bv.byteStride || size * n;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);

  const out = [];
  for (let k = 0; k < a.count; k++) {
    if (n === 1) {
      out.push(bin[fn](base + k * stride));
      continue;
    }
    const row = [];
    for (let c = 0; c < n; c++) row.push(bin[fn](base + k * stride + c * size));
    out.push(row);
  }
  return out;
}

/** Ambil byte mentah satu `json.images[i]` dari BIN. */
export function imageBytes(json, bin, imageIndex) {
  const bv = json.bufferViews[json.images[imageIndex].bufferView];
  const start = bv.byteOffset ?? 0;
  return bin.subarray(start, start + bv.byteLength);
}

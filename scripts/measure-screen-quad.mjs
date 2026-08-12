/**
 * Ukur quad layar di office.glb: aspek dunia, orientasi UV, dan UKURAN TAMPIL
 * dari sebuah VIEWS.
 *
 *   node scripts/measure-screen-quad.mjs OMacbook_D8 OMon_AOC_3 [--view=Office]
 *
 * Kenapa ada: tiga angka di screens.ts (resolusi aset, crop aspek, flipX)
 * semuanya diturunkan dari geometri — bukan ditebak. Berkas ini yang
 * menurunkannya, supaya pengukuran berikutnya tidak perlu ditulis ulang.
 *
 * GLB-nya diurai langsung (JSON chunk + BIN chunk) ketimbang lewat GLTFLoader:
 * loader butuh lingkungan DOM, sementara yang dibutuhkan di sini cuma dua
 * accessor dan satu matriks.
 */
import { readFileSync } from "node:fs";

const GLB = "public/3d/models/office.glb";

// three(x, y, z) = blender(x, z, −y) — konversi yang sama dengan `bl` di
// CameraController.tsx.
const bl = (x, y, z) => [x, z, -y];
const VIEWS = {
  Office: { pos: bl(-3.97, -2.48, 1.13), tgt: bl(-7.8, -3.6, 0.79) },
  Lounge: { pos: bl(1.65, -4.98, 1.6), tgt: bl(0.01, -2.37, 1.25) },
  Meeting: { pos: bl(-14.91, 0.83, 1.37), tgt: bl(-18.46, -0.93, 0.81) },
  Function: { pos: bl(1.46, 7.51, 1.37), tgt: bl(-1.08, 10.59, 1.05) },
};

// ── GLB ────────────────────────────────────────────────────────────────────
const buf = readFileSync(GLB);
let off = 12;
let json, bin;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
  else if (type === 0x004e4942) bin = data;
  off += 8 + len + ((4 - ((8 + len) % 4)) % 4) * 0;
  off += (4 - (len % 4)) % 4;
}

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/**
 * office.glb memakai KHR_draco_mesh_compression, jadi accessor atributnya TIDAK
 * punya bufferView — verteksnya terkubur di dalam blok Draco dan tidak bisa
 * dibaca tanpa decoder. Yang selamat cuma `min`/`max`: glTF mewajibkan keduanya
 * tetap ditulis pada accessor POSITION.
 *
 * Untuk yang dibutuhkan berkas ini itu sudah cukup — quad layar memang KOTAK,
 * jadi delapan sudut AABB lokalnya berimpit dengan sudut aslinya. Yang hilang
 * cuma UV, dan arah u diturunkan dari rotasi node (lihat catatan flipX di
 * screens.ts), bukan dari sini.
 */
function localCorners(accessorIndex) {
  const a = json.accessors[accessorIndex];
  if (!a.min || !a.max) return null;
  const pts = [];
  for (const x of [a.min[0], a.max[0]])
    for (const y of [a.min[1], a.max[1]])
      for (const z of [a.min[2], a.max[2]]) pts.push([x, y, z]);
  return pts;
}

function readAccessor(i) {
  const a = json.accessors[i];
  const n = NUM[a.type];
  const out = new Float32Array(a.count * n);
  if (a.bufferView === undefined) return out;
  const bv = json.bufferViews[a.bufferView];
  const Arr = COMP[a.componentType];
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const stride = bv.byteStride ?? n * Arr.BYTES_PER_ELEMENT;
  for (let e = 0; e < a.count; e++) {
    const view = new Arr(bin.buffer, bin.byteOffset + base + e * stride, n);
    for (let c = 0; c < n; c++) out[e * n + c] = view[c];
  }
  return out;
}

// ── matriks ────────────────────────────────────────────────────────────────
const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
function trs(node) {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const apply = (m, [x, y, z]) => {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
};

// Node dunia: telusuri dari root scene.
const world = new Map();
const nodeByName = new Map();
(function walk(idx, parent) {
  const n = json.nodes[idx];
  const m = mul(parent, trs(n));
  world.set(idx, m);
  if (n.name) nodeByName.set(n.name, idx);
  for (const c of n.children ?? []) walk(c, m);
})(json.scenes[json.scene ?? 0].nodes[0], I());
for (const root of json.scenes[json.scene ?? 0].nodes) {
  if (!world.has(root)) (function walk(idx, parent) {
    const n = json.nodes[idx];
    const m = mul(parent, trs(n));
    world.set(idx, m);
    if (n.name) nodeByName.set(n.name, idx);
    for (const c of n.children ?? []) walk(c, m);
  })(root, I());
}

// ── kamera ─────────────────────────────────────────────────────────────────
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

function project(p, view, W, H, fovDeg = 60) {
  const fwd = norm(sub(view.tgt, view.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const d = sub(p, view.pos);
  const z = dot(d, fwd);
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const aspect = W / H;
  return { x: (0.5 + (dot(d, right) * (f / aspect)) / z / 2) * W, y: (0.5 - (dot(d, up) * f) / z / 2) * H, z };
}

// ── laporan ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const viewName = (args.find((a) => a.startsWith("--view=")) ?? "--view=Office").split("=")[1];
const view = VIEWS[viewName];

for (const name of args.filter((a) => !a.startsWith("--"))) {
  const idx = nodeByName.get(name);
  if (idx === undefined) { console.log(`\n### ${name}\n   TIDAK ADA di GLB`); continue; }
  const n = json.nodes[idx];
  const m = world.get(idx);
  console.log(`\n### ${name}  (node ${idx}, mesh ${n.mesh})`);

  const collect = (meshIdx, mat) => {
    const mesh = json.meshes[meshIdx];
    mesh.primitives.forEach((p, pi) => {
      const matName = json.materials[p.material]?.name ?? "?";
      const isScreen = /screen/i.test(matName);
      const draco = json.accessors[p.attributes.POSITION].bufferView === undefined;
      const uv =
        !draco && p.attributes.TEXCOORD_0 !== undefined
          ? readAccessor(p.attributes.TEXCOORD_0)
          : null;
      const count = json.accessors[p.attributes.POSITION].count;
      console.log(`   prim[${pi}] mat="${matName}" verts=${count}${draco ? " (draco)" : ""}${isScreen ? "   ← LAYAR" : ""}`);
      if (!isScreen) return;

      const local = localCorners(p.attributes.POSITION);
      if (!local) { console.log("      accessor tanpa min/max — tidak bisa diukur"); return; }
      const pts = local.map((c) => apply(mat, c));
      const mn = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])));
      const mx = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])));
      const size = mx.map((v, k) => v - mn[k]);
      const [w, h] = size.slice().sort((a, b) => b - a); // dua sumbu terbesar
      console.log(`      dunia three min=[${mn.map((v) => v.toFixed(4))}] max=[${mx.map((v) => v.toFixed(4))}]`);
      console.log(`      ukuran=[${size.map((v) => v.toFixed(4))}]  ASPEK=${(w / h).toFixed(4)}`);

      // Proyeksi tiap sudut + arah u.
      for (const [W, H, dpr] of [[1440, 900, 2], [1920, 1080, 1.5]]) {
        const scr = pts.map((p) => project(p, view, W, H));
        const xs = scr.map((s) => s.x), ys = scr.map((s) => s.y);
        const dw = Math.max(...xs) - Math.min(...xs), dh = Math.max(...ys) - Math.min(...ys);
        console.log(`      tampil @${W}×${H} dpr${dpr}: ${dw.toFixed(0)} × ${dh.toFixed(0)} px CSS  (jarak ${Math.min(...scr.map((s) => s.z)).toFixed(2)} m)`);
      }
      if (uv) {
        // Arah u di layar: bandingkan x proyeksi vertex u≈0 lawan u≈1.
        let u0 = null, u1 = null;
        for (let i = 0; i < count; i++) {
          const u = uv[i * 2];
          if (u0 === null || u < u0.u) u0 = { u, i };
          if (u1 === null || u > u1.u) u1 = { u, i };
        }
        const a = project(pts[u0.i], view, 1440, 900), b = project(pts[u1.i], view, 1440, 900);
        console.log(`      UV: u=${u0.u.toFixed(2)} di x=${a.x.toFixed(0)}px, u=${u1.u.toFixed(2)} di x=${b.x.toFixed(0)}px  → flipX ${b.x < a.x ? "PERLU" : "TIDAK perlu"}`);
        const vs = [];
        for (let i = 0; i < count; i++) vs.push({ v: uv[i * 2 + 1], y: pts[i][1] });
        const vlo = vs.reduce((p, c) => (c.v < p.v ? c : p));
        const vhi = vs.reduce((p, c) => (c.v > p.v ? c : p));
        console.log(`      UV: v=${vlo.v.toFixed(2)} di y=${vlo.y.toFixed(3)}m, v=${vhi.v.toFixed(2)} di y=${vhi.y.toFixed(3)}m  → v=0 di ${vlo.y > vhi.y ? "ATAS (benar)" : "BAWAH"}`);
      }
    });
  };
  if (n.mesh !== undefined) collect(n.mesh, m);
  for (const c of n.children ?? []) {
    const cn = json.nodes[c];
    if (cn.mesh !== undefined) collect(cn.mesh, world.get(c));
  }
}

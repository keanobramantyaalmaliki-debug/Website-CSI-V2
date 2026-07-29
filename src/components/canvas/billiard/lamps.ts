/**
 * Menyembunyikan lampu gantung billiard saat minigame aktif.
 *
 * Dua hal yang membuat ini tidak sesederhana `obj.visible = false`:
 *
 * 1. Mesh kap lampu billiard sudah DIGABUNG dengan lampu front desk dalam satu
 *    objek (`MG_Lounge_M_BilLight_Cage`, 3.300 tris) demi menekan draw call.
 *    Menyembunyikan objek itu ikut memadamkan lampu front desk. Solusinya
 *    memecah geometrinya jadi dua group berdasarkan posisi.
 *
 * 2. Bohlam memakai material emissive `M_BilLight_Bulb` (strength 12) yang
 *    DIPAKAI BERSAMA 8 lampu di seluruh kantor. Materialnya harus di-clone
 *    dulu, kalau tidak lampu lain ikut padam.
 *
 * Pemilihan objek memakai POSISI DUNIA, bukan nama — nama node bisa berubah
 * saat GLB di-export ulang, posisi meja tidak.
 */
import {
  Box3,
  BufferGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";

/** Kotak udara tepat di atas meja billiard (koordinat three). */
const OVER_TABLE = {
  xMin: -0.9,
  xMax: 1.7,
  zMin: -3.1,
  zMax: -0.2,
  yMin: 1.5, // di atas permukaan meja (0,807), jadi meja sendiri tidak ikut
};

/** Material yang menandai bagian lampu gantung. */
const LAMP_MATERIALS = ["M_BilLight_Cage", "M_BilLight_Bulb"];

export interface LampFader {
  /** 0 = lampu billiard hilang total, 1 = tampil normal. */
  set: (t: number) => void;
}

/**
 * Mesh gabungan: bagian yang dipudarkan ada di group 0, sisanya group 1.
 * Meredam opacity saja TIDAK CUKUP — material kap lampu metallic 0.85, dan
 * pantulan environment map tidak ikut diredam opacity, jadi rangkanya tetap
 * terlihat sebagai siluet gelap. Group-nya harus benar-benar dilepas dari
 * daftar gambar.
 */
interface SplitMesh {
  mesh: Mesh;
  /** Jumlah indeks milik bagian yang dipudarkan (group 0). */
  overCount: number;
  /** Jumlah indeks milik bagian yang harus tetap tampil (group 1). */
  restCount: number;
}

export function prepareLampFade(scene: Object3D): LampFader | null {
  const mats: Material[] = [];
  const objs: Object3D[] = [];
  const splits: SplitMesh[] = [];

  const box = new Box3();
  const center = new Vector3();

  // Kumpulkan dulu, baru diubah — mengubah material sambil traverse bisa
  // membuat objek yang berbagi material terlewat.
  const meshes: Mesh[] = [];
  scene.traverse((o) => { if (o instanceof Mesh) meshes.push(o); });

  for (const mesh of meshes) {
    const names = asArray(mesh.material).map((m) => m?.name ?? "");
    if (!names.some((n) => LAMP_MATERIALS.includes(n))) continue;

    box.setFromObject(mesh);
    if (!box.isEmpty()) box.getCenter(center);

    // Objek yang SELURUHNYA di atas meja (bohlam, soket) bisa disembunyikan
    // apa adanya.
    if (isOverTable(center.x, center.y, center.z)) {
      const clone = cloneMaterial(mesh.material);
      if (clone) {
        mesh.material = clone;
        mats.push(...asArray(clone));
        objs.push(mesh);
      }
      continue;
    }

    // Mesh yang membentang jauh melewati meja = mesh gabungan; pecah per
    // segitiga supaya lampu di ruangan lain tidak ikut hilang.
    const split = splitOverTable(mesh);
    if (split) {
      mats.push(split.material);
      splits.push(split.entry);
    }
  }

  if (!mats.length && !splits.length) return null;

  // Transparansi dinyalakan sejak awal: mengaktifkannya saat animasi berjalan
  // memicu kompilasi ulang shader dan tersendat tepat di momen transisi.
  for (const m of mats) m.transparent = true;

  let hidden = false;

  return {
    set: (t: number) => {
      const a = Math.max(0, Math.min(1, t));
      for (const m of mats) {
        m.opacity = a;
        m.depthWrite = a > 0.99;
      }
      // Sabuk pengaman untuk material emissive: pada opacity 0 bloom masih bisa
      // menangkap sisa pendarnya, jadi objeknya sekalian tidak digambar.
      for (const o of objs) o.visible = a > 0.02;

      // Mesh gabungan tidak bisa di-`visible = false` (bagian front desk ikut
      // hilang), jadi group 0 yang dikosongkan. Opacity 0 saja menyisakan
      // siluet: material kap metallic 0.85 dan pantulan environment map tidak
      // diredam opacity.
      //
      // ⚠️ Yang diubah HANYA `count` group, bukan susunan group-nya.
      // Office.tsx membungkus scene dengan <Bvh>, dan BVH itu dibangun sekali
      // di awal dari daftar group saat itu. Menghapus group (clearGroups lalu
      // menyusun ulang) membuat BVH menunjuk ke group yang tidak ada lagi,
      // dan raycast berikutnya — mis. saat memutar arah bidik billiard —
      // meledak dengan "Cannot read properties of undefined (materialIndex)".
      const wantHidden = a <= 0.02;
      if (wantHidden !== hidden) {
        hidden = wantHidden;
        for (const s of splits) {
          const geo = s.mesh.geometry as BufferGeometry;
          const g = geo.groups[0];
          if (g) g.count = hidden ? 0 : s.overCount;
        }
      }
    },
  };
}

function isOverTable(x: number, y: number, z: number): boolean {
  return (
    x > OVER_TABLE.xMin && x < OVER_TABLE.xMax &&
    z > OVER_TABLE.zMin && z < OVER_TABLE.zMax &&
    y > OVER_TABLE.yMin
  );
}

function asArray(m: Material | Material[]): Material[] {
  return Array.isArray(m) ? m : [m];
}

function cloneMaterial(m: Material | Material[]): Material | Material[] | null {
  // Wajib di-clone: material lampu dipakai bersama lampu lain di kantor.
  if (Array.isArray(m)) return m.map((x) => x.clone());
  return m ? m.clone() : null;
}

/**
 * Pecah geometri gabungan jadi dua group: segitiga di atas meja billiard
 * (group 0, bisa dipudarkan) dan sisanya (group 1, jangan disentuh).
 */
function splitOverTable(
  mesh: Mesh,
): { material: Material; entry: SplitMesh } | null {
  const geo = mesh.geometry as BufferGeometry;
  const pos = geo.attributes.position;
  if (!pos) return null;

  const index = geo.index;
  const triCount = index ? index.count / 3 : pos.count / 3;

  const over: number[] = [];
  const rest: number[] = [];

  // OVER_TABLE berkoordinat DUNIA, sedangkan atribut position berkoordinat
  // lokal — titik tengah harus ditransformasi dulu. Pada GLB sekarang node
  // kap lampu kebetulan tanpa transform sehingga keduanya sama, tapi begitu
  // objeknya digeser di Blender, tanpa ini split-nya salah diam-diam.
  mesh.updateWorldMatrix(true, false);
  const m = mesh.matrixWorld;
  const mid = new Vector3();

  for (let t = 0; t < triCount; t++) {
    const a = index ? index.getX(t * 3) : t * 3;
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    // Titik tengah segitiga — lebih tahan terhadap vertex di perbatasan.
    mid.set(
      (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
      (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3,
      (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3,
    ).applyMatrix4(m);
    (isOverTable(mid.x, mid.y, mid.z) ? over : rest).push(a, b, c);
  }

  if (!over.length || !rest.length) return null;

  geo.setIndex([...over, ...rest]);
  geo.clearGroups();
  geo.addGroup(0, over.length, 0);
  geo.addGroup(over.length, rest.length, 1);

  const base = asArray(mesh.material)[0];
  const fadeMat = (base as MeshStandardMaterial).clone();
  mesh.material = [fadeMat, base];
  return {
    material: fadeMat,
    entry: { mesh, overCount: over.length, restCount: rest.length },
  };
}

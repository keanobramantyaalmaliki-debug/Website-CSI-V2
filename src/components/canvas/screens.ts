/**
 * Konten di layar monitor/laptop/TV — gambar pixel-art dipasang ke material
 * layar GLB saat runtime.
 *
 * ── Kenapa runtime, bukan di-bake di Blender ────────────────────────────────
 * Blender hanya bisa memanggang tekstur DIAM ke dalam GLB, dan tiap kali
 * kontennya diganti seluruh model harus di-export ulang (8,5 MB). Di sini
 * cukup mengganti satu PNG 23 KB di public/screens/.
 *
 * ── Kenapa pixelasinya OFFLINE, bukan shader ────────────────────────────────
 * Gambarnya memang disimpan kecil (192×108) lalu dibesarkan oleh GPU dengan
 * NearestFilter. Tidak ada shader, tidak ada canvas 2D per frame, tidak ada
 * quantize UV — GPU sudah melakukan persis itu secara gratis saat mengambil
 * sampel texture yang lebih kecil dari layarnya.
 *
 * Konsekuensinya: tingkat pixelasi ditentukan saat membuat aset, bukan di
 * kode. Untuk mengubahnya, buat ulang PNG-nya (lihat resep di bawah), jangan
 * cari-cari angka di file ini.
 *
 *   ffmpeg -i sumber.png \
 *     -vf "crop=W:H:X:Y,scale=96:54:flags=neighbor" keluaran.png
 *
 * `flags=neighbor` WAJIB. Tanpa itu ffmpeg memakai bicubic yang merata-ratakan
 * piksel tetangga, dan hasilnya blur kecil — bukan pixel-art. Crop dilakukan
 * SEBELUM scale supaya rasionya sudah benar dan gambarnya tidak melar.
 *
 * ── Kenapa 96×54, dan cara memilih angka ini untuk layar lain ───────────────
 * Yang menentukan BUKAN seberapa enak gambarnya dilihat sendirian, melainkan
 * seberapa besar layar itu tampil di viewport. Monitor AOC dari VIEWS.Office
 * berjarak 2,49 m dan hanya mengisi ±278 × 181 piksel (1080p, dpr 1,5).
 *
 * Artinya aset 192px mendarat di 0,69 teksel per piksel layar — nyaris 1:1,
 * jadi GPU hampir tidak membesarkan apa pun dan blok pixelnya tidak pernah
 * terbentuk. Itu sebabnya 192 terlihat "kurang pixel" meski di file-nya jelas
 * pixel-art.
 *
 * Dibandingkan pada UKURAN TAMPIL SESUNGGUHNYA (bukan diperbesar):
 *   192 → blok terlalu halus, terbaca sebagai gambar biasa yang agak kasar
 *    96 → blok jelas terbaca, tata letak Spotify masih dikenali  ← DIPAKAI
 *    64 → sudah jadi bidang warna; tidak lagi terbaca sebagai antarmuka
 *
 * Untuk layar lain, ULANGI pengukurannya — TV meeting yang jauh lebih besar
 * di layar akan butuh angka lebih tinggi untuk kekasaran yang sama. Aturan
 * praktisnya: bidik ±0,3 teksel per piksel tampil, yaitu lebar-tampil ÷ 3.
 */
import {
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  SRGBColorSpace,
  Texture,
} from "three";

/**
 * Terang layar. Ini dipakai sebagai `emissiveIntensity`, BUKAN sekadar `map`.
 *
 * Material layar di GLB baseColor-nya ~0,01 (hitam) dan ambient scene cuma
 * 0,03 — dipasang sebagai `map` saja, gambarnya praktis tak terlihat. Yang
 * membuatnya "menyala" adalah emissiveMap, yang tidak bergantung cahaya
 * sekitar sama sekali.
 *
 * ⚠️ JANGAN dinaikkan tanpa melihat hasilnya. Bloom di Scene.tsx ambangnya
 * 0,95: di atas itu layar tidak cuma terang, ia MENYEBAR pendar ke sekitarnya
 * dan terbaca seperti lampu, bukan monitor. Karena `toneMapped` sengaja
 * dibiarkan menyala di sini (lihat catatan di applyScreen), nilai ini melewati
 * ACES dulu, jadi 1,0 mendarat aman di bawah ambang.
 */
const SCREEN_EMISSIVE = 1.0;

export interface ScreenContent {
  /** Nama node di office.glb yang layarnya diisi. */
  node: string;
  /** Path gambar di public/. */
  url: string;
  /**
   * Balik arah horizontal.
   *
   * Perlu untuk monitor AOC: quad layarnya normal menghadap −Z dengan u=0 di
   * sisi +X, jadi tanpa dibalik gambarnya tampil sebagai bayangan cermin.
   * Ini sifat mesh-nya, bukan gambarnya — makanya jadi setelan per-node.
   */
  flipX?: boolean;
}

/**
 * Daftar layar yang diisi. Sengaja daftar eksplisit, bukan "semua yang
 * materialnya *_Screen": hanya layar yang benar-benar terlihat dari salah satu
 * VIEWS yang perlu diisi, sisanya buang memori texture percuma.
 */
export const SCREENS: ScreenContent[] = [
  { node: "OMon_AOC_2", url: "/screens/spotify-home.png", flipX: true },
];

/**
 * Pasang satu texture ke material layar sebuah node.
 *
 * ── Kenapa materialnya di-CLONE ─────────────────────────────────────────────
 * Keempat monitor (OMon_AOC_0..3) berbagi mesh 9 DAN material OMon_Screen yang
 * sama persis. Menempelkan texture langsung ke material itu akan membuat
 * KEEMPAT monitor menampilkan gambar yang sama. Clone memberi tiap layar
 * materialnya sendiri.
 *
 * Ongkosnya satu draw call tambahan per layar yang diisi — itulah kenapa
 * SCREENS di atas dijaga tetap pendek.
 *
 * ⚠️ Clone HARUS terjadi sebelum prepareRevealSweep() berjalan, atau material
 * hasil clone tidak ikut dapat patch sapuan dan layarnya akan tampil utuh
 * sejak frame pertama sementara kantor di sekitarnya masih terbentuk.
 */
function applyScreen(root: Object3D, cfg: ScreenContent, tex: Texture): boolean {
  const node = root.getObjectByName(cfg.node);
  if (!node) return false;

  let applied = false;

  node.traverse((o: Object3D) => {
    if (!(o instanceof Mesh)) return;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      if (!(m instanceof MeshStandardMaterial)) return m;
      // Node monitor punya 3 primitive (lambert1 = casing, OMon_Screen =
      // layar, lambert2 = tombol). Hanya yang layar yang disentuh.
      if (!/screen/i.test(m.name)) return m;

      const clone = m.clone();
      clone.name = `${m.name}__${cfg.node}`;
      clone.emissiveMap = tex;
      // emissive HARUS putih: emissiveMap dikalikan dengan warna ini, jadi
      // kalau dibiarkan hitam (bawaan) hasil perkaliannya nol dan gambarnya
      // tidak muncul sama sekali — gejala yang mudah disalahartikan sebagai
      // "texture-nya gagal dimuat".
      clone.emissive.setScalar(1);
      clone.emissiveIntensity = SCREEN_EMISSIVE;
      // map ikut dipasang supaya layar yang mati/redup tetap punya warna dasar
      // yang masuk akal, dan supaya AO & bayangan kontak punya sesuatu untuk
      // digelapkan alih-alih bidang hitam rata.
      clone.map = tex;
      // toneMapped SENGAJA dibiarkan menyala — beda dari lampu & LED strip di
      // Office.tsx yang mematikannya. Lampu memang harus menembus ACES supaya
      // berpendar; layar tidak. Dimatikan, warnanya melompat lebih terang dari
      // seluruh scene dan monitornya terlihat seperti ditempel, bukan berada
      // di dalam ruangan yang sama.
      clone.needsUpdate = true;
      applied = true;
      return clone;
    });

    o.material = Array.isArray(o.material) ? next : next[0];
  });

  return applied;
}

/**
 * Siapkan texture: pixel-art butuh setelan filter yang berlawanan dengan
 * bawaan three.
 */
export function prepareScreenTexture(tex: Texture, flipX = false): Texture {
  // INI yang membuat pixelnya kotak. Bawaan three LinearFilter, yang
  // menginterpolasi antar teksel dan mengubah pixel-art jadi bubur blur begitu
  // dibesarkan.
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  // Mipmap dimatikan: ia merata-ratakan teksel untuk jarak jauh, yang sekali
  // lagi melawan maksud pixel-art. Dengan NearestFilter tanpa mipmap layar
  // akan berkilau (aliasing) dari jarak jauh — itu justru khas tampilan retro.
  tex.generateMipmaps = false;
  // PNG adalah data sRGB. Tanpa ini three memperlakukannya sebagai linear dan
  // gambarnya tampil pucat & terlalu terang.
  tex.colorSpace = SRGBColorSpace;

  // ⚠️ WAJIB false, dan ini gampang terlewat.
  //
  // glTF menaruh titik asal UV di KIRI-ATAS, sedangkan WebGL di KIRI-BAWAH.
  // GLTFLoader mendamaikannya dengan menyetel `texture.flipY = false` pada
  // setiap texture yang IA muat (three r0.185, GLTFLoader.js:3252) — tapi
  // texture ini tidak dimuat olehnya, melainkan oleh TextureLoader lewat
  // useTexture, yang bawaannya `flipY = true` (Texture.js:281).
  //
  // Dibiarkan bawaan, gambarnya TERBALIK ATAS-BAWAH: UV quad layar ini menaruh
  // v=0 di tepi ATAS (verifikasi dari accessor: pos.y 0,407 → v=0; pos.y 0,108
  // → v=1), jadi dengan flipY=true tepi atas layar menampilkan baris paling
  // bawah gambar.
  tex.flipY = false;

  if (flipX) {
    // Dibalik lewat repeat negatif + offset 1, bukan dengan menyiapkan dua
    // versi file: hemat satu aset, dan arah balik tetap terbaca di kode.
    tex.repeat.x = -1;
    tex.offset.x = 1;
  }

  tex.needsUpdate = true;
  return tex;
}

/**
 * Pasang semua layar. `textures` dipetakan per URL — dipanggil dari Office.tsx
 * setelah useTexture selesai memuat.
 *
 * Mengembalikan jumlah layar yang berhasil dipasang, untuk dicek di DEV.
 */
export function applyScreens(
  root: Object3D,
  textures: Record<string, Texture>,
): number {
  let n = 0;
  for (const cfg of SCREENS) {
    const tex = textures[cfg.url];
    if (!tex) continue;
    prepareScreenTexture(tex, cfg.flipX);
    if (applyScreen(root, cfg, tex)) n++;
  }
  return n;
}

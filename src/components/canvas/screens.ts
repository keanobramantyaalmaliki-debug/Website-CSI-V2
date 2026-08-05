/**
 * Konten di layar monitor/laptop/TV — gambar pixel-art (dan video) dipasang ke
 * material layar GLB saat runtime.
 *
 * Berkas ini mengurus PEMASANGAN ke material dan setelan texture-nya. Sumber
 * bergerak ditangani screenVideo.ts, dan gerbang "kapan diputar" ada di
 * Office.tsx — tiga tempat berbeda karena umurnya berbeda: material hidup
 * selama GLB, elemen video hidup selama tab, pemutaran berubah tiap ruangan.
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
 *
 * Aturan itu sudah dipakai sekali lagi untuk layar MacBook `OMacbook_D7`.
 * Diukur dengan memproyeksikan keempat sudut quad-nya dari VIEWS.Office:
 *
 *   1440×900 dpr 2 → tampil 208 px → 0,3 × 208 ≈ 62
 *   1920×1080 dpr 2 → tampil 250 px → 75
 *
 * Dipilih 72×50 (aspek quad-nya 1,438). Bandingkan dengan AOC yang 96 px untuk
 * tampil 278 px — rasionya sama, jadi kedua layar sama kasarnya saat dilihat
 * berdampingan. Itu yang penting, bukan angka mutlaknya.
 *
 * ⚠️ Resep `flags=neighbor` di atas berlaku untuk PIXEL-ART yang digambar
 * sendiri. Untuk sumber REKAMAN atau foto, neighbor justru merusak — lihat
 * penjelasan panjang di entri MacBook di bawah.
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
  /** Path gambar (atau video, kalau `video` true) di public/. */
  url: string;
  /**
   * Balik arah horizontal.
   *
   * Perlu untuk monitor AOC: quad layarnya normal menghadap −Z dengan u=0 di
   * sisi +X, jadi tanpa dibalik gambarnya tampil sebagai bayangan cermin.
   * Ini sifat mesh-nya, bukan gambarnya — makanya jadi setelan per-node.
   */
  flipX?: boolean;
  /**
   * `url` menunjuk ke video, bukan gambar.
   *
   * Teksturnya datang dari screenVideo.ts (elemen `<video>` + VideoTexture),
   * bukan dari useTexture — dan pemutarannya digerbangi supaya tidak men-dekode
   * saat layarnya tidak terlihat. Lihat Office.tsx.
   */
  video?: boolean;
  /**
   * Terang layar ini sendiri, menimpa SCREEN_EMISSIVE.
   *
   * Ada karena tiap layar punya terang bawaan berbeda di GLB dan konten yang
   * kecerahan rata-ratanya berbeda pula. Lihat catatan di entri MacBook.
   */
  emissive?: number;
}

/**
 * Daftar layar yang diisi. Sengaja daftar eksplisit, bukan "semua yang
 * materialnya *_Screen": hanya layar yang benar-benar terlihat dari salah satu
 * VIEWS yang perlu diisi, sisanya buang memori texture percuma.
 */
export const SCREENS: ScreenContent[] = [
  { node: "OMon_AOC_2", url: "/screens/spotify-home.png", flipX: true },
  /**
   * MacBook di meja terdekat kamera Office (2,44 m), tempat CH_Person2 duduk.
   * REKAMAN LAYAR sungguhan (VS Code + terminal, 5 Agu 14.30), di-encode ala
   * basement.studio: resolusi moderat + NearestFilter, BUKAN diperkecil ke
   * ukuran-tampil. Pembanding: video monitor mereka 1592×968 untuk layar yang
   * tampil jauh lebih kecil — pixelasinya dari sampling NearestFilter di GPU,
   * bukan dari resolusi asetnya.
   *
   * Resep encode-nya (dari Screen Recording 2026-08-05 at 14.30.50.mov):
   *
   *   ffmpeg -i rekaman.mov \
   *     -vf "crop=2692:1872:108:0,scale=720:500:flags=area,fps=12,eq=gamma=1.4" \
   *     -c:v libx264 -pix_fmt yuv420p -crf 28 -g 24 -an \
   *     -movflags +faststart public/screens/vscode-real.mp4
   *
   * • crop 2692×1872: buang bezel kiri supaya rasionya pas aspek quad 1,438
   *   (720/500 = 1,44) — tanpa ini gambarnya melar.
   * • scale 720: reduksi cuma 4× dari sumber 2908 px, jadi teks 12 px masih
   *   ~3 px dan SELAMAT. Ini pelajaran dari kegagalan 5 Agu pagi: target
   *   72 px (aturan lebar-tampil ÷ 3) berarti reduksi 40× yang melarutkan
   *   teks putih ke latarnya (luma maks tinggal 94/255). Aturan ÷3 itu untuk
   *   PIXEL-ART yang digambar di resolusi itu — untuk rekaman, ikut cara
   *   basement: biarkan besar, NearestFilter yang mengasarkan.
   *   Terverifikasi pada berkas ini: luma maks 255, teks terbaca di preview.
   * • fps=12: rekaman aslinya efektif ~3,7 fps (layar diam lama), 12 cukup
   *   dan menahan ukuran berkas (700 KB untuk 21 detik).
   * • eq=gamma=1.4: konten VS Code tema gelap nyaris tak punya piksel terang
   *   (0,1% di atas 180, vs 7,2% di spotify-home.png) sehingga layarnya
   *   terbaca lebih redup dari AOC di sebelahnya. Gamma mengangkat MIDTONE
   *   (teks/panel) tapi membiarkan hitam tetap hitam (min cuma naik 0 → 20) —
   *   beda dengan kurva black-point yang dulu memucatkan latar ke ~61.
   *   Terukur: luma rata² 31 → 63 (AOC: 51). JANGAN naik ke 1.7: min-nya 38,
   *   sudah masuk wilayah "latar kelabu" yang sama dengan kegagalan itu.
   * • flags=area untuk menurunkan rekaman/foto; neighbor cuma untuk
   *   pixel-art buatan (neighbor pada rekaman = teks jadi bintik acak,
   *   sudah dicoba di 72/108/144, semuanya bubur).
   *
   * • `-an` membuang trek audio. Browser MENOLAK autoplay video bersuara —
   *   layarnya akan beku di frame pertama.
   *
   * • `-movflags +faststart` WAJIB, dan kelalaiannya menipu. Tanpa itu atom
   *   `moov` (indeks berkas) ditulis di AKHIR, jadi browser harus mengunduh
   *   seluruh video sebelum bisa memutar apa pun. Yang terlihat bukan "video
   *   lambat" melainkan video BEKU DI FRAME 0 — dan cuma pada berkas yang
   *   cukup besar, sehingga gejalanya muncul-hilang saat mengganti footage.
   *   Kejadian nyata 5 Agu; verifikasi dengan membaca urutan atom-nya, `moov`
   *   harus muncul sebelum `mdat`. (Sudah dicek pada berkas ini: moov@36.)
   *
   * Alternatif sebelumnya — video sintetis "VS Code mengetik" — berkasnya
   * (vscode-coding.mp4) sudah dihapus, tapi generatornya masih ada:
   * scripts/make-vscode-video.mjs, deterministik, tinggal jalankan ulang.
   * Cocok kalau suatu saat butuh look pixel-art penuh yang blok-bloknya
   * sekasar spotify-home.png di AOC.
   *
   * ⚠️ Kalau menukar videonya, JANGAN pasang url yang berkasnya belum ada.
   * Video gagal-muat tidak "sekadar tidak muncul": emissiveMap-nya tetap
   * terpasang sebagai placeholder 1×1 HITAM, jadi layarnya justru LEBIH GELAP
   * daripada sebelum diisi — tanpa satu pun error di konsol.
   *
   * ── flipX ─────────────────────────────────────────────────────────────────
   * Diturunkan dari geometri, bukan dari coba-coba: keempat sudut quad layar
   * diproyeksikan ke layar dari VIEWS.Office dan u=0 mendarat di KANAN u=1,
   * sama seperti monitor AOC. Tanpa ini gambarnya tampil kecermin.
   *
   * ── Kenapa emissive-nya 2.2, bukan 1.0 seperti AOC ───────────────────────
   * GLB memberi M_MacBook_Screen emissiveStrength 2,5 dan bake sudah merekam
   * tumpahan birunya ke meja & casing; cahaya panggang itu tidak ikut berubah
   * di sini. Pada 1,0 layarnya jadi lebih gelap dari pantulannya sendiri di
   * meja — terbaca seperti monitor mati yang kena lampu.
   *
   * Plafonnya 2,4, dan itu DIHITUNG bukan ditebak: kurva ACESFilmic three
   * pada exposure 1,6 (Scene.tsx) memetakan teksel putih paling terang ke
   *
   *   1,0 → 0,856   1,6 → 0,916   2,0 → 0,936   2,5 → 0,952
   *
   * sementara ambang Bloom-nya 0,95. Di atas 2,4 teks putih mulai memancar
   * dan MacBook-nya terbaca sebagai lampu, bukan layar.
   *
   * ⚠️ Kalau layarnya terlihat gelap, JANGAN naikkan angka ini — itu jalan
   * buntu yang sudah dicoba (2,2 vs 2,8 berdampingan: hanya memberi luma
   * 20 → 25, sama-sama gelap). Emissive mengangkat teks dan latar BERSAMAAN,
   * jadi hasilnya abu-abu rata. Yang bekerja: cerahkan KONTENNYA — warna
   * token & proporsi bidang terang diatur di scripts/make-vscode-video.mjs.
   */
  {
    node: "OMacbook_D7",
    url: "/screens/vscode-real.mp4",
    flipX: true,
    video: true,
    emissive: 2.2,
  },
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
      clone.emissiveIntensity = cfg.emissive ?? SCREEN_EMISSIVE;
      // map ikut dipasang supaya layar yang mati/redup tetap punya warna dasar
      // yang masuk akal, dan supaya AO & bayangan kontak punya sesuatu untuk
      // digelapkan alih-alih bidang hitam rata.
      //
      // Untuk VIDEO sengaja dilewati. Alasannya bukan penghematan: sebelum
      // frame pertama ter-dekode, texture-nya masih placeholder 1×1 HITAM, dan
      // memasangnya sebagai map berarti baseColor layar dipaksa hitam pekat —
      // lebih gelap dari nilai 0,012 milik GLB, yang justru warna layar-mati
      // yang benar. Bonusnya satu sampel texture lebih sedikit per fragmen.
      if (!cfg.video) clone.map = tex;
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
    // Texture video sudah disiapkan saat dibuat di screenVideo.ts — di sana,
    // bukan di sini, karena elemen `<video>`-nya di-cache di level modul dan
    // hidup lebih lama dari pemanggilan ini.
    if (!cfg.video) prepareScreenTexture(tex, cfg.flipX);
    if (applyScreen(root, cfg, tex)) n++;
  }
  return n;
}

/**
 * Sapuan "kantor terbentuk" — animasi yang berjalan SETELAH office.glb selesai
 * dimuat, menggantikan pop-in mendadak.
 *
 * Sebuah bidang tegak menyeberangi ruangan sepanjang sumbu X. Di belakang
 * bidang, geometri tampil normal; di depannya belum ada apa-apa; dan di garis
 * pertemuannya piksel muncul bertahap lewat pola dither, dengan tepi berwarna
 * silver brand.
 *
 * ── Arahnya LOUNGE → MEETING, dan itu bukan sembarang pilihan ───────────────
 * Kantor ini DIMULAI DARI LOUNGE — itu pintu masuknya. Jadi sapuan bergerak
 * dari timur (Lounge, x +2,55) ke barat (Meeting Room, x −21,70), mengikuti
 * urutan orang benar-benar memasuki ruangan: lounge dulu, lalu office area,
 * baru ruangan di ujung. Dibalik, kantor terbentuk dari ruangan terdalam yang
 * belum pernah dilihat pengunjung — terbaca seperti pemindaian denah, bukan
 * seperti memasuki tempat.
 *
 * ── Kenapa dither, bukan alpha fade seperti referensinya ────────────────────
 * Referensi (basement.studio) memudarkan alpha: `material.transparent = true`
 * lalu alpha diturunkan di garis sapuan. Itu bekerja untuk SATU objek, tapi di
 * sini ada 233 material. Menyalakan transparent di semuanya berarti three
 * memindahkan mereka ke pass transparan yang diurutkan per jarak — urutan
 * gambarnya jadi salah di geometri yang saling tembus (kusen di dalam dinding,
 * kaki kursi di dalam karpet), dan depth write mati sehingga objek di belakang
 * bocor ke depan. Ditambah ongkos sortir 294 primitive tiap frame.
 *
 * `discard` menghindari semuanya: material tetap OPAQUE, depth buffer tetap
 * benar, urutan gambar tidak berubah. Yang hilang cuma kehalusan gradasi —
 * dan justru itu yang ditutup pola dither: mata membaca kerapatan titik
 * sebagai gradasi, persis seperti halftone koran.
 *
 * ⚠️ JANGAN ganti `discard` jadi alpha tanpa mengukur ulang keempat ruangan.
 *
 * ── Kenapa satu fungsi patch yang dipakai bersama ───────────────────────────
 * `Material.customProgramCacheKey()` bawaan three mengembalikan
 * `this.onBeforeCompile.toString()` (three/src/materials/Material.js:543).
 * Artinya: selama SEMUA material memakai referensi fungsi yang SAMA, cache
 * key-nya sama dan WebGL hanya mengompilasi SATU program tambahan. Kalau tiap
 * material dapat closure-nya sendiri (mis. dibuat di dalam loop), string-nya
 * tetap sama sih — tapi uniform-nya tidak akan berbagi objek dan kita harus
 * menyetel 233 uniform tiap frame. Satu objek uniform bersama = satu penulisan.
 */
import {
  Color,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type IUniform,
  type WebGLProgramParametersWithUniforms,
} from "three";

/**
 * Silver logo Cogniti — diambil dari public/brand/Logo-Final.png, warna huruf
 * "cogniti" (#d2d3d4, piksel terbanyak kedua setelah putih latar).
 *
 * Merah #ec2028 dari segitiga logo sengaja TIDAK dipakai di sini: menyapu
 * seluruh kantor dengan merah terbaca sebagai peringatan sistem, bukan brand.
 * Simpan merah untuk aksen kecil yang memang menuntut perhatian.
 */
const EDGE_COLOR = "#d2d3d4";

/**
 * Lebar pita dither dalam METER dunia.
 *
 * Kantor membentang x −21,70..2,55 (24,25 m). 3,5 m ≈ 14% dari bentangan —
 * cukup lebar untuk terbaca sebagai gradasi bertekstur, cukup sempit supaya
 * tetap terbaca sebagai "garis yang bergerak" dan bukan kabut menyeluruh.
 */
const BAND = 3.5;

/**
 * Lebar pita yang diwarnai silver, dalam meter. Lebih sempit dari BAND supaya
 * warnanya jatuh di ujung depan sapuan saja — bagian yang baru saja muncul —
 * sementara sisa pita sudah kembali ke warna asli materialnya.
 */
const EDGE = 1.4;

/**
 * Batas sapuan sumbu X, diukur dari accessor POSITION office.glb (30 Jul).
 *
 * X_FROM > X_TO: sapuan bergerak ke arah −X (Lounge → Meeting), lihat catatan
 * arah di kepala berkas. Cukup menukar kedua angka ini untuk membalik arahnya —
 * shader-nya sendiri tidak peduli tanda.
 */
const X_FROM = 2.55; // tepi timur — Lounge, tempat tur dimulai
const X_TO = -21.7; // tepi barat — Meeting Room, ujung terdalam

export interface RevealSweep {
  /**
   * 0 = kantor belum tergambar sama sekali, 1 = tampil penuh tanpa sisa efek.
   *
   * Di luar rentang itu nilainya dijepit, jadi aman dipanggil dengan hasil
   * easing yang sedikit melewati batas (overshoot).
   */
  set: (t: number) => void;
  /**
   * Lepas patch dari semua material dan kompilasi ulang shader aslinya.
   *
   * WAJIB dipanggil setelah animasi selesai. Tanpa ini, tiap fragmen di seluruh
   * kantor tetap menghitung dither + discard selamanya, padahal hasilnya sudah
   * pasti "tampil penuh".
   */
  dispose: () => void;
}

/**
 * Pasang sapuan pada seluruh material MeshStandardMaterial di dalam `scene`.
 *
 * Mengembalikan null kalau tidak ada satu pun material yang cocok — pemanggil
 * memakai itu sebagai tanda untuk langsung menampilkan scene apa adanya, bukan
 * menggantung di layar kosong.
 */
export function prepareRevealSweep(scene: Object3D): RevealSweep | null {
  // Satu objek uniform yang DIBAGI semua material. Menyetel progress = menulis
  // satu angka, bukan 233.
  const uProgress: IUniform<number> = { value: 0 };
  const uBand: IUniform<number> = { value: BAND };
  const uEdge: IUniform<number> = { value: EDGE };
  const uEdgeColor: IUniform<Color> = { value: new Color(EDGE_COLOR) };
  // Tanda arah sapuan, diturunkan dari X_FROM/X_TO — bukan konstanta terpisah
  // yang bisa lupa disesuaikan saat arahnya dibalik.
  const uDir: IUniform<number> = { value: Math.sign(X_TO - X_FROM) || 1 };

  /**
   * Fungsi patch TUNGGAL — lihat catatan customProgramCacheKey di atas.
   *
   * Titik sisip dipilih dari three r0.185 (sudah diverifikasi baris demi baris
   * di node_modules, bukan dari ingatan):
   *
   * VERTEX — `project_vertex` (meshphysical.glsl.js:44). Pada titik itu
   * `transformed` SUDAH melewati morph, skinning, dan displacement. Itu yang
   * membuat 5 karakter ber-skin ikut tersapu di posisi pose-nya yang sebenarnya
   * alih-alih di bind pose. Menyisip sebelum `skinning_vertex` akan membuat
   * karakter muncul di tempat yang salah.
   *
   * FRAGMENT — `dithering_fragment` (meshphysical.glsl.js:221). Ini chunk
   * TERAKHIR, setelah `tonemapping_fragment` (217) dan `colorspace_fragment`
   * (218). Konsekuensinya penting: di titik itu gl_FragColor sudah dalam sRGB
   * akhir, jadi warna tepi tampil PERSIS #d2d3d4 tanpa diredam ACES. Kalau
   * dipindah ke sebelum tonemapping, silver-nya berubah jadi abu kusam dan
   * harus dikonversi manual.
   */
  const patch = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uRevealProgress = uProgress;
    shader.uniforms.uRevealBand = uBand;
    shader.uniforms.uRevealEdge = uEdge;
    shader.uniforms.uRevealEdgeColor = uEdgeColor;
    shader.uniforms.uRevealDir = uDir;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */ `
        #include <project_vertex>
        vRevealX = ( modelMatrix * vec4( transformed, 1.0 ) ).x;
      `,
    );
    shader.vertexShader = `varying float vRevealX;\n${shader.vertexShader}`;


    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      /* glsl */ `
        #include <dithering_fragment>

        {
          // Garis sapuan berjalan dari X_FROM ke X_TO. Rentangnya dilebarkan
          // sebesar BAND di KEDUA ujung supaya pada progress 0 seluruh kantor
          // ada di depan garis (belum tergambar), dan pada progress 1 seluruhnya
          // sudah lewat di belakang termasuk ekor pitanya. Tanpa pelebaran itu,
          // ruangan di ujung awal sudah terlanjur solid di frame pertama dan
          // ruangan di ujung akhir masih berbintik saat animasi dinyatakan usai.
          //
          // uRevealDir = +1 kalau sapuan ke arah +X, −1 kalau ke −X. Dikalikan
          // pada pelebaran DAN pada jarak di bawah, sehingga membalik arah cukup
          // dengan menukar X_FROM/X_TO di TypeScript — tidak ada tanda yang
          // perlu dikoreksi manual di dalam shader.
          float head = mix(
            ${X_FROM.toFixed(2)} - uRevealBand * uRevealDir,
            ${X_TO.toFixed(2)} + uRevealBand * uRevealDir,
            uRevealProgress
          );

          // Jarak fragmen di DEPAN garis, selalu positif untuk yang belum
          // tergambar. Negatif = sudah dilewati sapuan.
          float ahead = ( vRevealX - head ) * uRevealDir;

          // Pola dither Bayer 4×4 dalam koordinat piksel layar. Sengaja pakai
          // gl_FragCoord, bukan UV atau posisi dunia: polanya jadi terkunci ke
          // layar dengan kerapatan tetap 1 titik/piksel, sama rapatnya pada
          // dinding jauh maupun meja di depan hidung. Pola berbasis UV akan
          // melar mengikuti perspektif dan terlihat seperti tekstur kotor.
          ivec2 p = ivec2( mod( gl_FragCoord.xy, 4.0 ) );
          int bayerIndex = p.y * 4 + p.x;
          float bayer = 0.0;
          // Matriks Bayer 4×4 baku, dinormalkan ke 0..1. Ditulis sebagai rantai
          // if alih-alih array const: array indexing dinamis di GLSL ES 1.0
          // (WebGL1) tidak dijamin didukung, dan proyek ini belum mengunci
          // WebGL2. Rantai ini dikompilasi jadi lookup konstan, ongkosnya nol.
          if ( bayerIndex ==  0 ) bayer =  0.0 / 16.0;
          else if ( bayerIndex ==  1 ) bayer =  8.0 / 16.0;
          else if ( bayerIndex ==  2 ) bayer =  2.0 / 16.0;
          else if ( bayerIndex ==  3 ) bayer = 10.0 / 16.0;
          else if ( bayerIndex ==  4 ) bayer = 12.0 / 16.0;
          else if ( bayerIndex ==  5 ) bayer =  4.0 / 16.0;
          else if ( bayerIndex ==  6 ) bayer = 14.0 / 16.0;
          else if ( bayerIndex ==  7 ) bayer =  6.0 / 16.0;
          else if ( bayerIndex ==  8 ) bayer =  3.0 / 16.0;
          else if ( bayerIndex ==  9 ) bayer = 11.0 / 16.0;
          else if ( bayerIndex == 10 ) bayer =  1.0 / 16.0;
          else if ( bayerIndex == 11 ) bayer =  9.0 / 16.0;
          else if ( bayerIndex == 12 ) bayer = 15.0 / 16.0;
          else if ( bayerIndex == 13 ) bayer =  7.0 / 16.0;
          else if ( bayerIndex == 14 ) bayer = 13.0 / 16.0;
          else bayer = 5.0 / 16.0;

          // Peluang tampil: 1 di belakang garis, meluruh ke 0 sepanjang pita.
          float show = 1.0 - smoothstep( 0.0, uRevealBand, ahead );

          // Inti dither. Fragmen tampil kalau peluangnya melebihi ambang piksel
          // ini. Karena ambangnya berbeda-beda per piksel dalam petak 4×4,
          // hasilnya kerapatan titik yang berubah halus — bukan tepi keras.
          if ( show < bayer ) discard;

          // Tepi silver di ujung depan sapuan: bagian yang BARU muncul diwarnai
          // penuh, lalu memudar kembali ke warna asli material dalam EDGE meter.
          float edge = 1.0 - smoothstep( 0.0, uRevealEdge, abs( ahead ) );
          // Dipangkatkan supaya warnanya memusat di garis depan alih-alih
          // mengabu rata di seluruh pita.
          edge *= edge;
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uRevealEdgeColor, edge );
        }
      `,
    );
    // Deklarasi GLSL wajib ditambahkan sendiri: mengisi `shader.uniforms` hanya
    // menyediakan NILAI-nya ke three, tidak membuat variabelnya ada di shader.
    // Tanpa baris ini kompilasi gagal dengan "undeclared identifier".
    //
    // Disisipkan lewat prefiks, bukan replace pada chunk tertentu: shader string
    // dari three belum mengandung `#version` (WebGLProgram yang menambahkannya
    // di depan belakangan), jadi menaruh deklarasi di baris pertama aman.
    shader.fragmentShader = /* glsl */ `
      uniform float uRevealProgress;
      uniform float uRevealBand;
      uniform float uRevealEdge;
      uniform float uRevealDir;
      uniform vec3 uRevealEdgeColor;
      varying float vRevealX;
    ` + shader.fragmentShader;
  };

  // Kumpulkan dulu lalu ubah, dan pakai Set: 233 material dipakai bersama oleh
  // 294 primitive, jadi tanpa dedup ada material yang di-patch berkali-kali
  // (dan `needsUpdate` dipicu berulang tanpa guna).
  const patched = new Set<MeshStandardMaterial>();

  scene.traverse((o: Object3D) => {
    if (!(o instanceof Mesh)) return;
    const mats: Material[] = Array.isArray(o.material)
      ? o.material
      : [o.material];
    for (const m of mats) {
      if (!(m instanceof MeshStandardMaterial)) continue;
      if (patched.has(m)) continue;
      patched.add(m);
    }
  });

  if (!patched.size) return null;

  /**
   * `onBeforeCompile` bawaan material disimpan dulu, bukan diasumsikan kosong.
   *
   * Di GLB ini asumsinya kebetulan benar, tapi menimpanya buta akan menghapus
   * patch milik orang lain diam-diam kalau nanti ada yang menambah — bug yang
   * hanya muncul sebagai "efek X tiba-tiba hilang" berbulan-bulan kemudian.
   */
  const previous = new Map<
    MeshStandardMaterial,
    (
      p: WebGLProgramParametersWithUniforms,
      r: Parameters<Material["onBeforeCompile"]>[1],
    ) => void
  >();

  for (const m of patched) {
    previous.set(m, m.onBeforeCompile);
    m.onBeforeCompile = patch;
    m.needsUpdate = true;
  }

  let disposed = false;

  return {
    set: (t: number) => {
      if (disposed) return;
      uProgress.value = Math.max(0, Math.min(1, t));
    },

    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const m of patched) {
        // Kembalikan yang asli, jangan disetel ke no-op: no-op tetap mengubah
        // customProgramCacheKey dan memaksa kompilasi program ketiga.
        const prev = previous.get(m);
        if (prev) m.onBeforeCompile = prev;
        m.needsUpdate = true;
      }
      patched.clear();
      previous.clear();
    },
  };
}

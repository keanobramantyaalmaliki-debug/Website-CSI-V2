"use client";

/**
 * Hologram "under maintenance" yang menutup lubang pintu di sisi timur laut
 * area Office (7 Agu 2026).
 *
 * Lubang itu tidak menuju ke mana-mana: di balik y 1,75 tidak ada ruangan yang
 * dimodelkan, jadi dari dalam kantor ia terbaca sebagai kotak hitam pekat dan
 * mengundang pertanyaan "itu kok buntu?". Ditutup tembok biasa masalahnya
 * selesai, tapi kesempatannya hilang — pengunjung membaca dinding kosong
 * sebagai batas peta. Hologram membacanya sebagai pintu yang SENGAJA dikunci,
 * dan itu menyiratkan ada sesuatu di baliknya nanti.
 *
 * ── Kenapa satu plane unlit, bukan geometri baru di Blender ─────────────────
 * Menambal di Blender berarti re-bake lightmap untuk dinding itu (dan lantai
 * di depannya, karena bidang baru mengubah bounce). Ongkosnya jauh melampaui
 * hasilnya untuk satu bukaan 1,6 × 2,5 m. Plane runtime tidak menyentuh GLB
 * sama sekali: satu draw call, nol perubahan pipeline aset.
 */

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  NearestFilter,
  ShaderMaterial,
  type Object3D,
} from "three";
import {
  REVEAL_BAND,
  REVEAL_X_FROM,
  REVEAL_X_TO,
  revealProgress,
} from "./revealSweep";

/**
 * Bukaan pintunya, DIUKUR dari MG_Office_M_SM_Wall_Cream lewat Blender MCP
 * (7 Agu 2026) — bukan ditaksir dari screenshot.
 *
 * Koordinat Blender (Z-up):
 *   x −14,30 … −12,70   → lebar 1,60 m
 *   z   0,00 …   2,50   → tinggi 2,50 m
 *   y   1,60 …   1,75   → tebal dinding 0,15 m; y 1,60 sisi yang menghadap
 *                          kantor (normal face-nya 0,−1,0)
 *
 * Konversi ke three memakai pemetaan yang sama dengan CameraController:
 *   bl(x, y, z) → Vector3(x, z, −y)
 * sehingga (−13,50 · 1,25 · −1,675) = titik tengah TEROWONGAN pintu.
 */
const CENTER: [number, number, number] = [-13.5, 1.25, -1.675];

/**
 * Ukuran plane, 2 cm lebih besar dari bukaannya di kedua sumbu.
 *
 * Kelebihannya masuk ke dalam kusen — plane duduk 7,5 cm di dalam terowongan,
 * jadi 1 cm di tiap sisi tertutup daging dinding dan tidak pernah terlihat.
 * Gunanya menutup celah rambut di tepi: pas-pasan pada 1,600 m membuat sisa
 * pembulatan float tampil sebagai garis hitam setipis piksel di pinggir.
 *
 * Bagian bawahnya (y −0,01) memang tenggelam di lantai — permukaan lantai ada
 * di z 0,10, bukan 0,00 — dan itu justru yang diinginkan: hologramnya terbit
 * dari lantai tanpa celah, bukan melayang 10 cm di atasnya.
 */
const PLANE_W = 1.62;
const PLANE_H = 2.52;

/**
 * Warna hologram, putih netral (diganti dari cyan #4fd6e8 pada 7 Agu 2026).
 *
 * Putih bekerja di sini justru karena ia TIDAK punya warna: seluruh ruangan
 * hangat (LED strip lantai + track light kuning), jadi bidang netral di antara
 * dinding krem tetap terbaca sebagai benda asing tanpa harus menjerit seperti
 * cyan. Dan yang lebih penting untuk versi ini — dither baru kelihatan sebagai
 * DITHER kalau kontras antar tangganya murni kecerahan; pada cyan, mata ikut
 * membaca perbedaan rona dan polanya melebur.
 *
 * Merah brand #ec2028 sengaja dihindari dengan alasan yang SAMA seperti di
 * revealSweep.ts — merah sepenuh bidang terbaca sebagai galat fatal, bukan
 * pemeliharaan terjadwal.
 *
 * new Color() dari hex sudah mengonversi sRGB → linear (ColorManagement aktif
 * secara bawaan di three r155+), dan itu yang benar di sini: ShaderMaterial
 * mentah tidak menyertakan <colorspace_fragment>, jadi nilai yang kita tulis
 * masuk ke render target apa adanya lalu di-encode sRGB oleh pass akhir
 * EffectComposer.
 */
const COLOR = "#ffffff";

/**
 * Pengali kecerahan sebelum ditulis ke framebuffer.
 *
 * Ambang Bloom di Scene.tsx 0,95, dan itu diukur pada nilai SETELAH tone
 * mapping. ShaderMaterial mentah melewati ACES sama sekali (tidak ada
 * <tonemapping_fragment> di dalamnya), jadi angka di sini sampai ke composer
 * tanpa diredam — perlakuannya setara `toneMapped = false` pada lampu & LED
 * strip di Office.tsx.
 *
 * ⚠️ Turun 1,5 → 1,0 SEIRING pergantian ke putih, dan itu wajib, bukan selera.
 * Putih linear = (1 · 1 · 1); pada 1,5 setiap piksel yang menyala penuh masuk
 * jauh di atas ambang 0,95 dan Bloom melebarkannya sampai titik-titik dither
 * yang bersebelahan saling menutup — polanya berubah jadi kabut rata dan
 * seluruh usaha dither-nya hilang. Pada 1,0 hanya alpha PENUH (teks dan tepi)
 * yang menyentuh ambang; tangga-tangga di bawahnya tetap tajam.
 *
 * Turun lagi 1,0 → 0,65 atas permintaan "opacity-nya kurangin". GAIN adalah
 * SATU-SATUNYA tuas yang aman untuk itu, karena ia mengali warna SESUDAH
 * kuantisasi — panelnya meredup tanpa menggeser satu pun tangga dither.
 * Menurunkan basis 0,125 atau bobot teks 0,50 akan merusak aritmetika yang
 * bikin keduanya jatuh tepat di 8/16 sel Bayer, dan papan caturnya bubar.
 */
const GAIN = 0.65;

/**
 * Ukuran satu sel dither, dalam piksel PERANGKAT.
 *
 * Ini yang membuat dither-nya terbaca. Bayer 4×4 pada 1 piksel perangkat
 * berarti seluruh matriksnya cuma 4 × 4 px — di layar Retina itu 2 × 2 px CSS,
 * di bawah batas mata pada jarak pandang normal, jadi ia terbaca sebagai
 * bintik acak (grain), bukan pola. Pada 2, satu selnya = 1 px CSS di Retina
 * dan matriksnya jadi kotak 8 × 8 px perangkat yang benar-benar kelihatan
 * berulang.
 *
 * Di layar dpr 1 selnya jadi 2 px CSS dan hasilnya lebih kasar lagi — itu
 * bukan bug, dan sengaja tidak dikompensasi lewat uniform: seluruh scene
 * memang lebih kasar di dpr 1 (NearestFilter, MSAA mati), jadi dither yang
 * ikut mengasar justru konsisten.
 */
const DITHER_PX = 2.0;

/** Arah sapuan reveal, diturunkan dari batas X-nya — lihat revealSweep.ts. */
const REVEAL_DIR = Math.sign(REVEAL_X_TO - REVEAL_X_FROM) || 1;

/**
 * Texture teks, digambar di canvas saat runtime alih-alih dimuat dari PNG.
 *
 * Alasannya bukan kemalasan: isinya murni tipografi datar tanpa gradasi, jadi
 * PNG-nya akan jadi aset yang harus ikut di-commit, ikut diunduh, dan ikut
 * diingat orang saat teksnya mau diubah. Digambar di sini, mengubah kalimatnya
 * = mengubah satu string.
 *
 * 256 × 398 mengikuti rasio plane (1,62 : 2,52 = 0,643). Ukurannya dipilih dari
 * ukuran TAMPIL, bukan dikira-kira: pada pandangan Office plane setinggi 2,52 m
 * berjarak ~10 m mengisi ≈ 190 px tinggi layar, jadi 398 px sudah di atas 1:1
 * dan masih menyisakan ruang kalau pengunjung mendekat lewat waypoint.
 *
 * NearestFilter + tanpa mipmap: sama seperti seluruh layar monitor di
 * screens.ts — huruf harus bertangga tegas, bukan lembek ter-interpolasi.
 */
function makeTextTexture(): CanvasTexture {
  const W = 256;
  const H = 398;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.clearRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff";

  // ── Hanya "UNDER MAINTENANCE" ──────────────────────────────────────────
  // Sampai 7 Agu ada empat elemen lain: "ACCESS RESTRICTED" di atas, dua garis
  // pemisah, dan "COGNITI · SYS.02" di bawah. Semuanya dibuang.
  //
  // Canvas mengukur v dari ATAS, sedangkan UV plane dari BAWAH. Texture-nya
  // TIDAK di-flip (flipY bawaan three sudah menangani itu), jadi yang digambar
  // di y kecil memang muncul di bagian ATAS plane.
  //
  // 179 & 219 bukan angka lama yang disisakan: dua barisnya berjarak 40 px,
  // jadi titik tengah bloknya (179 + 219) / 2 = 199 = tepat setengah dari 398.
  // Waktu masih ada empat elemen lain, blok ini sengaja duduk di ATAS tengah
  // supaya seluruh susunannya seimbang; sendirian, ia harus benar-benar di
  // tengah bidang.
  //
  // ── Kenapa hurufnya digedekan (30/23 → 38/28) ──────────────────────────
  // Ini konsekuensi langsung dari menurunkan bobot teks jadi 0,50 supaya ia
  // menyatu dengan dither. Begitu hurufnya ikut ter-dither, separuh piksel
  // goresannya turun satu tangga — dan pada 23px, goresan yang sudah menyusut
  // ~2:1 saat tampil tinggal ~2 piksel layar, jadi separuhnya yang meredup
  // membuat hurufnya larut ke dalam papan catur di jarak kamera Office.
  // Digedekan, tiap goresan punya cukup piksel untuk tetap terbaca sebagai
  // huruf meski separuhnya bertangga lebih rendah.
  //
  // Pembesarannya dibayar dari letterSpacing, bukan dari lebar bidang:
  // "MAINTENANCE" 11 huruf pada Courier bold (lebar maju 0,6em) = 11 × 16,8 px
  // + 10 sela × 2 px ≈ 207 px, jadi masih menyisakan ~24 px di tiap sisi. Itu
  // batas yang harus dijaga — pendar tepi selebar 0,16 m memakan ≈25 px di
  // tiap sisi texture, dan huruf yang menembusnya akan tenggelam di pendar.
  //
  // letterSpacing baru ada di Chrome 99+/Safari 17+. Dibiarkan gagal diam-diam
  // di browser lama: yang hilang cuma kerenggangan huruf, teksnya tetap terbaca.
  g.letterSpacing = "8px";
  g.font = 'bold 38px "Courier New", ui-monospace, monospace';
  g.fillText("UNDER", W / 2, 179);
  g.letterSpacing = "2px";
  g.font = 'bold 28px "Courier New", ui-monospace, monospace';
  g.fillText("MAINTENANCE", W / 2, 219);

  const tex = new CanvasTexture(c);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Raycast dimatikan.
 *
 * Plane ini menutupi bukaan setinggi 2,5 m tepat di jalur pandang beberapa
 * waypoint. Dibiarkan bisa di-raycast, ia akan menelan klik yang ditujukan ke
 * waypoint atau ke meja billiard di belakangnya — dan karena hologramnya
 * sendiri tidak punya handler, gejalanya "klik saya kok tidak ngapa-ngapain",
 * bukan error yang kelihatan.
 */
const NO_RAYCAST: Object3D["raycast"] = () => {};

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4( position, 1.0 );
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3      uColor;
  uniform sampler2D uText;
  uniform float     uRevealProgress;

  varying vec2 vUv;
  varying vec3 vWorld;

  // Matriks Bayer 4×4. Ditulis sebagai rantai if, bukan array const, dengan
  // alasan yang sama seperti di revealSweep.ts: indexing array dinamis tidak
  // dijamin didukung di GLSL ES 1.0, dan proyek ini belum mengunci WebGL2.
  // Rantainya dikompilasi jadi lookup konstan.
  //
  // Koordinatnya jadi PARAMETER, tidak lagi membaca gl_FragCoord langsung,
  // karena bidang ini butuh DUA skala dither yang berbeda — lihat pemakaiannya
  // di main().
  float bayer4( vec2 co ) {
    ivec2 p = ivec2( mod( co, 4.0 ) );
    int i = p.y * 4 + p.x;
    if ( i ==  0 ) return  0.0 / 16.0;
    if ( i ==  1 ) return  8.0 / 16.0;
    if ( i ==  2 ) return  2.0 / 16.0;
    if ( i ==  3 ) return 10.0 / 16.0;
    if ( i ==  4 ) return 12.0 / 16.0;
    if ( i ==  5 ) return  4.0 / 16.0;
    if ( i ==  6 ) return 14.0 / 16.0;
    if ( i ==  7 ) return  6.0 / 16.0;
    if ( i ==  8 ) return  3.0 / 16.0;
    if ( i ==  9 ) return 11.0 / 16.0;
    if ( i == 10 ) return  1.0 / 16.0;
    if ( i == 11 ) return  9.0 / 16.0;
    if ( i == 12 ) return 15.0 / 16.0;
    if ( i == 13 ) return  7.0 / 16.0;
    if ( i == 14 ) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  void main() {
    // ── Dua skala dither, dan itu disengaja ────────────────────────────────
    // fineBayer (1 px perangkat) dipakai HANYA untuk gerbang reveal, supaya
    // tepi sapuannya di bidang ini persis sekasar tepi sapuan di 233 material
    // kantor lainnya — kalau ia ikut mengasar, satu bidang akan terlihat
    // "beda pola" selama 2,6 detik sapuan berjalan.
    //
    // ditherBayer (DITHER_PX px perangkat) dipakai untuk tampilan hologramnya.
    // Yang ini justru HARUS kasar; itu seluruh maksudnya.
    float fineBayer   = bayer4( gl_FragCoord.xy );
    float ditherBayer = bayer4( floor( gl_FragCoord.xy / ${DITHER_PX.toFixed(1)} ) );

    // ── Ikut sapuan "kantor terbentuk" ─────────────────────────────────────
    // Rumus yang sama persis dengan revealSweep.ts, dengan objek uniform yang
    // SAMA. Tanpa ini hologramnya sudah menyala utuh di ruang kosong sementara
    // dinding yang memeganginya belum tergambar.
    {
      float head = mix(
        ${REVEAL_X_FROM.toFixed(2)} - ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
        ${REVEAL_X_TO.toFixed(2)} + ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
        uRevealProgress
      );
      float ahead = ( vWorld.x - head ) * ${REVEAL_DIR.toFixed(1)};
      float show  = 1.0 - smoothstep( 0.0, ${REVEAL_BAND.toFixed(2)}, ahead );
      if ( show < fineBayer ) discard;
    }

    // ── Kabut dasar ────────────────────────────────────────────────────────
    // Sengaja SANGAT rendah. Bidang ini HARUS tetap tembus pandang: kegelapan
    // di baliknya yang memberi kesan ada ruang, bukan tembok dempet.
    //
    // ⚠️ Angka-angka intensitas di blok ini SALING MENUMPUK dan hasilnya
    // dijepit di 1,0. Percobaan pertama (7 Agu) memakai 0,14 + scan 0,30 +
    // miring 0,10 dan itu SALAH: dijumlahkan, bidangnya nyaris selalu di atas
    // 0,45 sehingga tampil sebagai panel padat — pintunya hilang, persis yang
    // mau dihindari. Kalau menaikkan salah satunya, cek totalnya.
    //
    // 0,125 bukan angka bulat sembarangan: dikali 4 tangga hasilnya TEPAT 0,5,
    // dan ambang Bayer 4×4 punya 16 nilai yang tersebar rata, jadi persis 8
    // dari 16 sel lolos. Itu papan catur 50% — pola dither paling tegas yang
    // bisa dihasilkan matriks ini. Digeser sedikit saja ke 0,10 atau 0,15,
    // kerapatannya jadi 6/16 atau 10/16 dan polanya berubah dari papan catur
    // jadi kisi yang timpang.
    //
    // ⚠️ Nilai-nilai di bawah ini ditata ulang untuk kuantisasi 4 TANGGA (lihat
    // blok alpha di bawah). Pada 16 tangga angka berapa pun "aman"; pada 4,
    // rentang yang tidak melintasi batas 0,25 akan mendarat rata di satu
    // tangga dan berhenti ter-dither sama sekali.
    float i = 0.125;

    // ── ⚠️ TIDAK ADA scanline di sini, dan itu diminta ──────────────────────
    // Sampai 7 Agu ada gelombang sinus 7 garis/m di ruang dunia yang merayap
    // naik 0,10 m/detik dengan amplitudo 0,34. Dibuang bersama bar sapuan
    // supaya yang tersisa murni dither.
    //
    // Konsekuensi yang perlu diketahui kalau mau mengembalikannya: scanline
    // itu satu-satunya suku yang memberi bidang ini GRADASI. Tanpa dia, nilai
    // masukan kuantisasi sama persis di seluruh bidang, jadi yang tampil
    // adalah matriks Bayer-nya sendiri yang berulang — pola tetap, bukan
    // gradasi yang ter-dither. Itu justru yang dimaui di sini, tapi artinya
    // menambahkan apa pun yang bervariasi secara spasial akan langsung terlihat
    // jauh lebih menonjol daripada dulu waktu ia menumpang di atas scanline.

    // ── ⚠️ TIDAK ADA garis miring "hazard" di sini, dan itu hasil percobaan ──
    // Versi pertama (7 Agu) punya diagonal 45° berperiode 0,34 m dengan bobot
    // 0,05. Ia GAGAL, dan penyebabnya bukan bobotnya melainkan tabrakannya
    // dengan kuantisasi alpha di bawah: 0,34 m ≈ 19 piksel perangkat pada
    // jarak pandang Office, jadi selisih 0,05 antara jalur terang dan gelap
    // jatuh tepat di batas satu tangga — separuh bidang dibulatkan ke atas,
    // separuhnya ke bawah, dan hasilnya petak-petak ketupat sebesar 19 px yang
    // terbaca sebagai kotoran, bukan garis.
    //
    // Pelajarannya umum: pola apa pun yang selisihnya SEORDE dengan satu
    // tangga kuantisasi akan diperbesar jadi belang. Kalau mau menambah motif
    // di sini, entah bobotnya jelas melampaui satu tangga atau periodenya
    // dibuat serapat pola dither-nya sendiri.
    //
    // ⚠️ Satu tangga sekarang 0,25, bukan lagi 1/16 seperti waktu catatan ini
    // ditulis — kuantisasinya turun ke 4 tingkat demi dither yang kelihatan.
    // Artinya ambang "aman" untuk motif baru naik EMPAT KALI LIPAT, dan bobot
    // 0,05 seperti diagonal yang gagal itu sekarang malah lebih berbahaya.

    // ── Pendar tepi ────────────────────────────────────────────────────────
    // Jarak ke tepi diubah ke METER dulu supaya lebar pendarnya sama di sisi
    // pendek dan sisi panjang; dihitung di UV mentah, sisi 1,62 m akan dapat
    // pendar yang jauh lebih tebal daripada sisi 2,52 m.
    vec2 d = ( vec2( 0.5 ) - abs( vUv - 0.5 ) ) * vec2( ${PLANE_W.toFixed(2)}, ${PLANE_H.toFixed(2)} );
    //
    // Lebarnya dinaikkan 0,10 → 0,16 m dan bobotnya diturunkan 0,75 → 0,60.
    // Alasannya kuantisasi lagi: pendar setebal 0,10 m yang langsung menghantam
    // 0,75 melompati tiga tangga sekaligus dalam beberapa piksel, jadi tepinya
    // tampil sebagai bingkai putih pejal tanpa dither. Melebar dan lebih pelan,
    // gradasinya punya ruang untuk meluruh bertangga-tangga.
    float edge = 1.0 - smoothstep( 0.0, 0.16, min( d.x, d.y ) );
    i += edge * edge * 0.60;

    // ── ⚠️ TIDAK ADA bar sapuan yang naik di sini, dan itu disengaja ────────
    // Sampai 7 Agu ada satu pita terang selebar 0,16 m yang merayap dari bawah
    // ke atas sekali tiap ~11 detik (bobot 0,45). Ia dibuang bersama pergantian
    // ke tampilan dither.
    //
    // Alasannya bukan sekadar "terlalu ramai". Bar itu sisa dari versi cyan
    // yang halus, tempat gradasi 0,45 punya belasan tangga untuk meluruh
    // dengan mulus. Pada kuantisasi 4 tangga, 0,45 = hampir dua tangga penuh,
    // jadi pitanya tidak lagi meluruh — ia MELOMPAT: satu blok yang tepinya
    // keras bergerak naik, dan tiap kali tepinya menyeberangi batas tangga
    // seluruh baris piksel berganti serempak. Yang terbaca bukan sapuan
    // cahaya, melainkan pola dither yang ikut tergeret ke atas, dan itu
    // merusak justru kesan bidangnya diam dan bertekstur.
    //
    // Kalau suatu saat mau dikembalikan, ia harus dihitung SEBELUM kuantisasi
    // dengan bobot yang jelas di bawah satu tangga (< 0,25) — atau, lebih
    // baik, dengan menaikkan jumlah tangganya khusus di daerah pita itu.

    // ── Teks ───────────────────────────────────────────────────────────────
    // Hanya kanal alpha yang dipakai: canvas-nya digambar putih di atas
    // transparan, jadi .a adalah mask hurufnya dan warnanya tetap ikut uColor.
    //
    // ── Bobotnya 0,50, dan itu dihitung supaya HURUFNYA IKUT TER-DITHER ─────
    // Sebelumnya 0,80. Dijumlah kabut dasar jadi 0,925; dikali 4 tangga = 3,7,
    // artinya 70% piksel huruf mendarat di tangga tertinggi (1,0) dan sisanya
    // di 0,75. Hurufnya jadi blok putih nyaris pejal yang DITEMPEL di atas
    // papan catur — dua bahasa visual berbeda di satu bidang.
    //
    // Pada 0,50 totalnya 0,125 + 0,50 = 0,625; dikali 4 = TEPAT 2,5, jadi
    // persis 8 dari 16 sel Bayer lolos. Hurufnya jadi papan catur juga —
    // berselang-seling antara tangga 0,75 dan 0,50 — dengan kotak yang persis
    // sebesar dan sefase dengan kotak latarnya. Bukan teks di atas dither,
    // melainkan teks yang TERBUAT dari dither.
    //
    // Terbacanya tetap aman dan itu bukan kebetulan: KEDUA tangga huruf (0,75
    // dan 0,50) berada di atas KEDUA tangga latar (0,25 dan 0). Tidak ada satu
    // pun piksel huruf yang bisa jatuh serendah piksel latar paling terang,
    // jadi hurufnya tak pernah bolong betulan — cuma bertekstur.
    //
    // ⚠️ Angka ini terikat pada kabut dasar 0,125 DAN pada 4 tangga. Mengubah
    // salah satunya tanpa menghitung ulang 0,50 akan menggeser huruf keluar
    // dari titik 50% dan polanya berhenti sefase dengan latar.
    i += texture2D( uText, vUv ).a * 0.50;

    // ── ⚠️ TIDAK ADA kedip di sini, dan itu KONSEKUENSI dari dua penghapusan ─
    // di atas, bukan permintaan terpisah. Dulu ada i *= 0,95 + 0,05·sin·sin.
    //
    // (Catatan buat yang menyunting berkas ini: JANGAN pakai backtick di dalam
    // komentar shader. Seluruh FRAG adalah template literal, jadi backtick di
    // komentar GLSL sekalipun akan MEMUTUS string-nya — galatnya muncul sebagai
    // "',' expected" di baris yang kelihatannya cuma komentar.)
    //
    // Selama masih ada scanline, kedip itu aman: tiap piksel punya nilai dasar
    // yang berbeda-beda, jadi goyangan 0,05 cuma menyeret piksel yang KEBETULAN
    // sedang duduk di batas tangga — hasilnya kelap-kelip butiran. Begitu
    // scanline hilang, seluruh bidang bernilai sama persis, dan goyangan yang
    // sama menyeret SEMUA piksel melewati ambangnya SEREMPAK: papan caturnya
    // berdenyut rapat-renggang seperti panel lampu yang mau putus. Motif yang
    // dulu tak terlihat jadi cacat paling mencolok di bidang ini.
    //
    // Jadi kalau scanline dikembalikan, kedipnya boleh ikut kembali. Selama
    // bidangnya rata, jangan.

    // ── Alpha bertangga ────────────────────────────────────────────────────
    // Dibulatkan ke tingkat diskret dengan ambang Bayer per piksel. Ini yang
    // menjaga gradasinya BERTITIK alih-alih mulus — sejalan dengan look PS1 di
    // seluruh scene (NearestFilter, MSAA mati).
    //
    // 4 tangga (dari 16). Ini keputusan tampilan yang paling menentukan di
    // berkas ini: jumlah tangga berbanding TERBALIK dengan seberapa kelihatan
    // dither-nya. Pada 16 tangga selisih antar tangga cuma 6%, jadi Bayer cuma
    // perlu menukar-nukar piksel antara dua nilai yang nyaris sama — mata
    // membacanya sebagai gradasi mulus dan polanya tak pernah muncul. Pada 4
    // tangga selisihnya 25%, cukup besar sampai pola kotak-kotaknya jadi
    // tekstur yang benar-benar terbaca. Itu yang dimaksud "dither effect".
    //
    // Turun lagi ke 2 tangga (1-bit) sudah dicoba di kepala dan ditinggalkan:
    // dengan warna putih dan Bloom di 0,95, piksel yang menyala pasti bernilai
    // 1,0 dan ikut mekar, sehingga titik-titik yang bersebelahan saling
    // menyambung — polanya balik jadi kabut, cuma lebih terang.
    float a = clamp( i, 0.0, 1.0 );
    a = floor( a * 4.0 + ditherBayer ) / 4.0;

    // Blending aditif: hasil akhir = uColor * GAIN * a, ditambahkan ke apa pun
    // yang sudah ada di belakang. Warna ditulis tanpa dikali a lebih dulu —
    // faktor SrcAlpha yang mengalikannya, jadi kalau di sini ikut dikali
    // kontribusinya jadi a² dan seluruh bidang terlihat jauh lebih redup.
    gl_FragColor = vec4( uColor * ${GAIN.toFixed(2)}, a );
  }
`;

/**
 * ⚠️ Komponen ini SENGAJA tidak punya useFrame, dan itu bukan kelalaian.
 *
 * Sampai 7 Agu ada satu callback per frame yang menambah uniform uTime, plus
 * penjaga useReducedMotion() untuk membekukannya. Ketiga suku yang memakai
 * waktu — scanline, bar sapuan, kedip — sudah dibuang, jadi menyisakan uTime
 * berarti membayar satu callback per frame untuk menaikkan angka yang tidak
 * dibaca siapa pun.
 *
 * Efek sampingnya justru bagus dan patut dijaga: shader-nya kini sepenuhnya
 * statis kecuali uRevealProgress, yang berhenti berubah setelah sapuan pembuka
 * selesai. Kalau nanti ada mode "jeda render saat idle", bidang ini tidak
 * memberi alasan apa pun untuk membangunkan frameloop.
 *
 * useReducedMotion() ikut dilepas karena tanpa gerak ia tidak punya kerjaan —
 * bukan karena aksesibilitasnya diabaikan. Menambahkan gerak apa pun ke sini
 * berarti mengembalikan penjaganya juga.
 */
export default function MaintenanceHologram() {
  const tex = useMemo(() => makeTextTexture(), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uColor: { value: new Color(COLOR) },
          uText: { value: tex },
          // Objek uniform BERSAMA dengan revealSweep.ts — bukan salinan. Lihat
          // catatan di ekspornya.
          uRevealProgress: revealProgress,
        },
        transparent: true,
        blending: AdditiveBlending,
        // depthWrite mati: bidang tembus pandang yang menulis depth akan
        // menghalangi apa pun yang digambar sesudahnya, termasuk kegelapan di
        // balik pintu yang justru ingin terlihat.
        depthWrite: false,
        // depthTest TETAP menyala — kusen di sekelilingnya harus bisa menutupi
        // hologram saat dilihat dari sudut miring, kalau tidak ia terlihat
        // menembus dinding.
        depthTest: true,
        // Bukaan ini secara teori cuma terlihat dari sisi kantor (y < 1,60),
        // tapi waypoint bisa membawa kamera ke sudut yang tidak terduga dan
        // plane satu sisi akan HILANG TOTAL dari belakang tanpa petunjuk apa
        // pun. Dua sisi ongkosnya nol di satu draw call.
        side: DoubleSide,
      }),
    [tex],
  );

  useEffect(
    () => () => {
      material.dispose();
      tex.dispose();
    },
    [material, tex],
  );

  return (
    <mesh
      position={CENTER}
      material={material}
      raycast={NO_RAYCAST}
      // ⚠️ JANGAN naikkan renderOrder di sini. Dulu nilainya 2, dengan alasan
      // "mengunci urutan biar tidak bergantung urutan traverse GLB". Alasan itu
      // salah dan menimbulkan bug nyata: dari Lounge, hologram terlihat menembus
      // tembok.
      //
      // Sebabnya, kaca meeting room ikut antrean transparan dan depthWrite-nya
      // mati, jadi ia tidak pernah menulis depth — depthTest tidak bisa menolak
      // apa pun di belakangnya. Yang menentukan siapa menimpa siapa cuma urutan
      // gambar, dan three.js mengurutkan antrean transparan pakai renderOrder
      // SEBAGAI KUNCI UTAMA, jarak baru jadi kunci kedua. renderOrder 2 berarti
      // hologram selalu digambar terakhir — termasuk di atas kaca yang berada di
      // DEPANNYA. Aditif pula, jadi ia ditambahkan pada kaca dengan kecerahan
      // penuh, tanpa diredam sedikit pun. Persis seperti menembus.
      //
      // Dengan renderOrder 0, pengurutan jarak belakang-ke-depan berlaku lagi:
      // dari Lounge hologram digambar lebih dulu, lalu kaca menimpanya dan
      // meredamnya — yang memang perilaku yang benar. Dari Office tidak ada kaca
      // di antara kamera dan hologram, jadi tampilannya tidak berubah.
      renderOrder={0}
    >
      <planeGeometry args={[PLANE_W, PLANE_H]} />
    </mesh>
  );
}

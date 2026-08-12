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
  Box3,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import type { RoomKey } from "@/lib/store/sceneStore";

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
   * Ruangan tempat layar ini terlihat. WAJIB diisi kalau `video` true.
   *
   * Gerbang di Office.tsx memutar HANYA video milik ruangan yang sedang
   * ditempati. Tanpa ini, masuk ke Meeting Room ikut menyalakan dekode video
   * MacBook di ruang Office yang tidak terlihat sama sekali dari sana — persis
   * pemborosan yang gerbang itu ada untuk mencegahnya.
   */
  room?: RoomKey;
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
   * Monitor AOC di meja SEBELAHNYA (1,20 m ke +Z three, baris yang sama) —
   * wallpaper foto: sebuah MacBook menyala di ruangan gelap.
   *
   * ── Kenapa foto, bukan antarmuka ─────────────────────────────────────────
   * Layar ini tampil 219 px dan duduk tepat di sebelah AOC yang menampilkan
   * Spotify. Dua antarmuka bersebelahan pada kekasaran ini saling berebut
   * perhatian dan dua-duanya kalah — tidak ada yang cukup besar untuk terbaca.
   * Foto terbaca dari BENTUK dan WARNA saja, jadi ia masih bekerja di 80 px,
   * dan kontras "satu layar kerja, satu layar nganggur" itu sendiri yang
   * membuat deretan meja ini terbaca sebagai kantor yang dipakai orang.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i "wallpaper monitor AOC.jpg" \
   *     -vf "crop=4846:2728:0:351,scale=80:45:flags=area,\
   *          eq=contrast=1.4:brightness=0.2:gamma=2.0" \
   *     public/screens/aoc-wallpaper.png
   *
   * • crop 4846×2728 dari sumber 4846×3431: sumbernya beraspek 1,412 sedangkan
   *   quad-nya 1,776, jadi 703 px HARUS dibuang dari TINGGI atau gambarnya
   *   melar tinggi. Dipotong dari tengah (offset 351) — laptopnya memang duduk
   *   di tengah bingkai, jadi tidak ada yang hilang.
   * • flags=area, BUKAN neighbor: ini FOTO. Sudah dua kali tercatat di berkas
   *   ini bahwa neighbor pada sumber rekaman/foto mengubah detail jadi bintik
   *   acak; yang mengasarkan di sini NearestFilter di GPU, bukan encode-nya.
   *
   * ── Kenapa 80 px, dan kenapa TIDAK boleh lebih besar ─────────────────────
   * Dipilih dengan MENYAMAKAN kekasarannya ke monitor AOC di sebelahnya, yang
   * memang satu-satunya kriteria yang berlaku untuk dua layar yang tampil
   * berdampingan dalam satu bingkai. Diukur dengan memproyeksikan sudut quad
   * dari VIEWS.Office (scripts/measure-screen-quad.mjs):
   *
   *   OMon_AOC_2 (spotify, 96 px)  tampil 278 px → 0,345 teksel/px
   *   OMon_AOC_3 (layar ini)       tampil 219 px → 80 px = 0,365 teksel/px
   *
   * Selisih 6% tidak terbaca; 96 px yang disalin mentah dari tetangganya akan
   * memberi 0,44 dan layar ini jadi terlihat lebih "HD" tanpa alasan.
   *
   * Plafonnya 219 px, dan itu bukan soal selera: prepareScreenTexture mematikan
   * mipmap DAN memakai NearestFilter, jadi aset yang lebih besar dari ukuran
   * tampil tidak dirata-ratakan saat dikecilkan — tiap piksel layar mengambil
   * satu teksel sembarang dan hasilnya BERKEDIP saat kamera bergerak. Pada 80
   * px GPU selalu MEMBESARKAN (2,7×), jadi tidak ada yang bisa berkedip.
   *
   * ── eq: melebarkan RENTANG, bukan menerangkan ────────────────────────────
   * Fotonya gelap dan puncaknya cuma 182 — tidak ada putih sama sekali untuk
   * dipakai emissive. Dibiarkan apa adanya, satu-satunya cara membuatnya
   * terlihat adalah emissive tinggi, dan itu mengangkat latar hitamnya
   * BERSAMAAN sehingga layarnya jadi bidang kelabu. Mode gagal yang sama sudah
   * tercatat tiga kali di berkas ini.
   *
   * Angkanya diturunkan, bukan dicoba-coba: memetakan [0, 182] → [0, 255]
   * butuh kemiringan 255/182 = 1,40, dan eq berputar di sekitar 0,5 sehingga
   *   keluar = (masuk − 0,5) × 1,40 + 0,5 + b,  b = 0,5 × 1,40 − 0,5 = 0,20.
   *
   * ── gamma 2.0: dipasang setelah dirender, bukan sebelumnya ───────────────
   * Contrast+brightness saja MELEBARKAN rentang tapi meninggalkan latarnya di
   * p50 = 3, dan hasil render pertamanya salah dengan cara yang tidak terlihat
   * dari asetnya: dari VIEWS.Office, karakter yang duduk di depan menutupi
   * layar ini dan yang tersisa cuma JALUR SEMPIT DI TEPI KIRI — kira-kira 15%
   * bidangnya. Di foto itu, tepi kirinya kebetulan bagian yang paling hitam:
   * laptopnya duduk di tengah-kanan. Jadi monitornya terukur p50 = 10 dan
   * terbaca MATI, padahal asetnya sendiri baik-baik saja.
   *
   * Godaannya menaikkan emissive sampai jalur itu terlihat — dan itu memang
   * "berhasil", justru karena bagian terangnya tersembunyi sehingga tidak ikut
   * terbakar. Sengaja TIDAK ditempuh: yang begitu cuma benar selama karakter
   * dan kameranya tidak pernah bergeser sedikit pun. gamma dipasang di ASETNYA
   * supaya wallpaper-nya jadi foto gelap yang ter-ekspos wajar dari sudut mana
   * pun, lalu monitornya memakai emissive BAWAAN — sama persis dengan AOC_2 di
   * sebelahnya, karena keduanya monitor yang sama di ruangan yang sama.
   *
   * Sasarannya diambil dari tetangganya itu, bukan dikira-kira. spotify-home
   * (emissive bawaan 1,0) beraset p50 = 31 / avg 60 dan terender p50 = 27:
   *
   *   gamma 1,0 → aset p50  3        gamma 1,7 → aset p50 20
   *   gamma 1,5 → aset p50 14        gamma 2,0 → aset p50 27 / avg 63  ←
   *
   * 2,0 mendaratkan asetnya praktis di histogram yang sama dengan spotify,
   * jadi dua monitor kembar itu kini cuma berbeda ISINYA. Pantulan cahaya di
   * meja ikut naik ke jalur yang terlihat, dan sudut kiri-atasnya tetap hitam
   * — masih foto ruangan gelap, bukan bidang kelabu.
   */
  {
    node: "OMon_AOC_3",
    url: "/screens/aoc-wallpaper.png",
    flipX: true,
  },
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
    room: "Office",
    emissive: 2.2,
  },
  /**
   * MacBook di meja di BELAKANGNYA (0,90 m ke +Z three) — situs Desa Darmasaba
   * yang sedang dibuka di browser.
   *
   * Isinya sengaja proyek yang SAMA dengan video yang diputar di TV Meeting
   * Room ("Desa+"): satu klien yang sama muncul dua kali di dua ruangan
   * berbeda, jadi kantor ini terbaca sedang mengerjakan sesuatu yang nyata
   * alih-alih memajang isi layar acak. Kalau videonya suatu saat diganti,
   * pertimbangkan mengganti yang ini juga supaya pasangannya tidak pecah.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i "Screenshot 2026-08-12 at 10.41.35.png" \
   *     -vf "crop=2749:1912:95:0,scale=96:67:flags=area" \
   *     public/screens/desa-site.png
   *
   * • crop 2749×1912 dari sumber 2940×1912: quad-nya beraspek 1,438 sedangkan
   *   tangkapannya 1,538, jadi 191 px dibuang dari LEBAR (bukan tinggi — arah
   *   potongnya kebalikan dari entri iMac, karena di sana sumbernya justru
   *   lebih jangkung dari quad-nya). Dibagi rata 95 px kiri-kanan: yang hilang
   *   cuma tepi tombol jendela dan ikon ekstensi, sementara memotong sebelah
   *   saja akan menggeser halamannya keluar dari tengah layar.
   * • flags=area — tangkapan layar, bukan pixel-art. Sama seperti iMac.
   * • TANPA eq, dan itu diperiksa bukan diasumsikan: rentangnya sudah [0, 255]
   *   apa adanya (avg 193, p50 217). Ini situs bertema TERANG — kebalikan dari
   *   semua layar lain di berkas ini, yang justru butuh eq karena sumbernya
   *   gelap. Tidak ada rentang yang perlu dilebarkan di sini.
   *
   * ── Kenapa 96 px ─────────────────────────────────────────────────────────
   * Layar ini tampil 133 px dari VIEWS.Office (1080p dpr 1,5) — paling kecil
   * di seluruh daftar, karena ia MacBook yang berdiri di baris meja kedua.
   * 96 px mendarat di 0,72 teksel per piksel tampil, praktis sama dengan iMac
   * cogniti-site (0,66) yang isinya juga halaman web penuh teks.
   *
   * Sengaja TIDAK memakai aturan lebar-tampil ÷ 3 (yang memberi 44): pada 44
   * px halamannya tinggal bidang warna dan tidak lagi terbaca sebagai situs.
   * Aturan ÷3 itu untuk pixel-art yang digambar di resolusi itu — untuk
   * tangkapan layar, biarkan besar dan NearestFilter yang mengasarkan. Ini
   * pengulangan ketiga dari pelajaran yang sama di berkas ini.
   *
   * Batas atasnya tetap 133 px (ukuran tampilnya): di atas itu GPU MENGECILKAN
   * tanpa mipmap dan layarnya berkedip. 96 aman dengan margin.
   *
   * ── flipX diturunkan dari geometri ───────────────────────────────────────
   * Node ini memakai MESH YANG SAMA dengan OMacbook_D7 (mesh 12 di GLB), jadi
   * UV-nya identik sampai ke teksel. Yang berbeda cuma rotasi node-nya: D7
   * ber-yaw 101°, yang ini 90°. Selisih 11° tidak mungkin membalik arah u —
   * untuk itu butuh 180° — jadi flipX-nya ikut D7 tanpa perlu diukur ulang.
   * (Pola yang sama sudah dicatat di entri iMac wallpaper: quad tegak lurus
   * lawan quad miring 12°, UV-nya tetap sama.)
   *
   * ── emissive 0,45: PALING RENDAH di seluruh daftar, dan itu benar ────────
   * Isinya situs bertema terang — avg 193 dengan 16,8% tekselnya sudah rata di
   * 255 DI DALAM ASET. Semua layar lain di berkas ini bertema gelap dan butuh
   * emissive tinggi justru karena piksel terangnya jarang; di sini kebalikannya
   * persis, jadi angka tetangga mana pun akan meleset jauh kalau disalin.
   *
   * Ini bukan layar redup: yang menentukan terang TAMPIL adalah emissive ×
   * kecerahan teksel, dan teksel di sini sudah mentok. Terukur pada kotak di
   * dalam layarnya, dibandingkan dua layar yang sudah dikalibrasi:
   *
   *   layar ini (0,45)        p50 121  p90 145  max 159  > ambang: 0,00%
   *   iMac cogniti (ref)      p50  30  p90 118  max 255  > ambang: 2,22%
   *   OMacbook_D7 (ref)       p50  62  p90  96  max 230  > ambang: 0,00%
   *
   * Bacaannya: TENGAHNYA dua kali lipat tetangga mana pun — halamannya memang
   * putih dan harus terbaca putih — sementara PUNCAKNYA justru yang paling
   * rendah, nol piksel menembus ambang bloom. Itu yang dicari. Menaikkannya
   * sampai putihnya menyentuh ambang berarti >50% bidang layar ikut mekar
   * sekaligus, dan layarnya berubah jadi slab putih menyilaukan — mode gagal
   * yang persis sama sudah tercatat pada TV Function di berkas ini.
   *
   * ── PERINGATAN: layar ini tidak terlihat dari VIEWS.Office ───────────────
   * Diuji, bukan dikira: emissive-nya dinaikkan sementara ke 25 lalu framenya
   * dibandingkan piksel-per-piksel dengan frame biasa — NOL dari 14.490 piksel
   * di kotak proyeksinya berubah (delta maks 3, sekadar derau encode). Kursi
   * dan CH_Person2 di depannya menutup rapat; parallax kursor cuma ±9 cm, jauh
   * dari cukup untuk mengintip melewatinya.
   *
   * Jadi angka-angka di atas diambil dari kamera debug yang ditaruh sementara
   * di atas sandaran kursi, BUKAN dari bingkai yang benar-benar tayang. Aman
   * dilakukan karena emissive tidak bergantung sudut pandang — yang berubah
   * cuma apa yang menutupinya.
   *
   * Entrinya tetap dipasang dan tetap dikalibrasi: tanpa itu layarnya memakai
   * material layar-mati bawaan GLB, dan begitu kursinya digeser atau kameranya
   * diubah sedikit saja, yang muncul adalah satu-satunya MacBook padam di
   * ruangan yang semua layarnya menyala. Murah sekarang, mahal kalau ketahuan
   * belakangan.
   */
  {
    node: "OMacbook_D8",
    url: "/screens/desa-site.png",
    flipX: true,
    emissive: 0.45,
  },
  /**
   * iMac di meja seberang MacBook — beranda cogniti.id sendiri.
   *
   * Node-nya TIDAK ada di GLB: ia dibuat saat runtime oleh splitMergedScreens()
   * di bawah, karena kesepuluh layar iMac ruang Office sudah digabung jadi satu
   * mesh. Lihat catatan panjang di SCREEN_SPLITS.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i sumber.png \
   *     -vf "crop=3726:2160:57:0,scale=192:112:flags=area,\
   *          eq=contrast=1.355:brightness=0.134" \
   *     public/screens/cogniti-site.png
   *
   * • crop 3726 (bukan 3840): quad layarnya beraspek 1,725, bukan 16:9. Tanpa
   *   crop, halamannya melar 3% ke samping. 57 px dibuang dari tiap sisi.
   * • flags=area, BUKAN neighbor: ini screenshot, bukan pixel-art yang digambar
   *   di resolusi itu. Sudah jadi pelajaran di MacBook — neighbor pada sumber
   *   rekaman mengubah teks jadi bintik acak.
   *
   * • 192 px, SENGAJA menyalahi aturan lebar-tampil ÷ 3. Aturan itu memberi 96
   *   (layar ini tampil 290 px pada 1080p dpr 1,5, AOC 278 px) dan 96 memang
   *   dipakai lebih dulu — tapi Keano minta dinaikkan, dan hasilnya lebih baik:
   *   pada 96 hanya headline yang terbaca, pada 192 nav, paragraf, dan bilah
   *   browser ikut terbaca. Aturan ÷3 itu untuk PIXEL-ART; sama seperti kasus
   *   MacBook, sumber screenshot/rekaman lebih baik dibiarkan besar dan
   *   dikasarkan NearestFilter di GPU.
   *
   *   Konsekuensinya layar ini SEDIKIT lebih halus dari AOC di sebelahnya. Itu
   *   pilihan sadar, bukan kelalaian — jangan "diperbaiki" balik ke 96 tanpa
   *   bertanya. 192 dipilih tepat 2× dari 96 supaya kisi pikselnya tetap rapi.
   *
   * ── Kenapa contrast, dan kenapa BUKAN gamma ──────────────────────────────
   * Halaman ini nyaris hitam (luma rata² 20, vs 51 milik spotify-home.png),
   * jadi refleks pertamanya menyalin resep MacBook: eq=gamma. Itu KELIRU di
   * sini. Sumbernya tidak punya hitam sejati — latarnya sudah 12/255 setelah
   * diperkecil — sehingga gamma 1,6 mengangkat MINIMUM-nya ke 52, dan seluruh
   * halaman berubah jadi bidang KELABU. Persis mode gagal "latar memucat" yang
   * dicatat di entri MacBook, cuma lewat pintu yang berbeda.
   *
   * Yang bekerja adalah melebarkan RENTANG-nya: contrast 1,355 + brightness
   * 0,134 memetakan [12, 227] ke [7, 255]. Hitamnya tetap hitam (min 12 → 7)
   * sementara puncaknya naik 227 → 255, jadi layarnya terbaca MENYALA tanpa
   * kehilangan sifat "situs bertema gelap". (Angka ini dipertahankan apa adanya
   * saat aset naik 96 → 192 px; yang berubah cuma puncaknya, karena pengecilan
   * yang lebih ringan lebih sedikit merata-ratakan coretan teks yang tipis:
   * pada 96 px puncaknya masih 232, pada 192 px sudah 255.)
   *
   * ⚠️ JANGAN kejar luma rata-rata 51 supaya "setara AOC". Halaman ini memang
   * hitam; memaksanya ke sana berarti mengubahnya jadi halaman kelabu, yaitu
   * membuang justru hal yang membuatnya dikenali. Kecerahan tampilnya diurus
   * emissive di bawah, bukan oleh isi gambarnya.
   *
   * ── emissive 6,2 (DIUKUR, bukan diturunkan dari rumus) ───────────────────
   * Angka ini jauh di atas AOC (1,0), dan itu memang benar — tapi aku sempat
   * menebak 2,4 dari analogi MacBook dan MELESET ~3×. Catatan supaya orang
   * berikutnya tidak mengulang jalan buntu yang sama:
   *
   * Yang SUDAH dipastikan, jadi jangan dicurigai lagi:
   * • materialnya benar dan stabil — ei=2,4, emissive putih, emissiveMap
   *   terpasang, toneMapped=false, dibaca dari konsol aplikasi pada t+0 dan
   *   t+9 s. Tidak ada yang menimpanya belakangan.
   * • applyScreens melaporkan "layar terisi=3/3", jadi pemecahan mesh dan
   *   pencocokan node-nya jalan.
   * • TIDAK ada geometri di depan layar. Raycast dari posisi kamera VIEWS.Office
   *   menembus MG_Office_iMac_Screen sebagai hit PERTAMA (2,854 m). Dugaan
   *   "panel kaca iMac meredam emissive" sudah diuji dan SALAH.
   *
   * Cara menyetelnya: naikkan emissive, tembak layar, ukur kotak layarnya.
   * Terbukti berskala (mendekati linear di ruang linear, wajar):
   *     aset  96 px, ei 2,4 → max 135, p99  88
   *     aset  96 px, ei 7,2 → max 214, p99 117   ← AOC frame sama: max 218
   *     aset 192 px, ei 6,2 → max 252, p99 116   ← p99/p90/avg praktis sama
   * (Deret di atas diukur dengan kotak proyeksi AABB layar, yang sedikit
   * melebihi layarnya. Entri iMac-2 di bawah memakai kotak yang lebih ketat,
   * jadi angka untuk ei 6,2 di sana beda tipis — bukan pengukuran yang
   * bertentangan, cuma daerah yang tidak sama.)
   * Jadi angkanya dipilih karena MENYAMAKAN terang tampilnya dengan AOC, bukan
   * karena ada rumus yang menghasilkannya.
   *
   * ⚠️ emissive TERIKAT pada resolusi aset. Waktu aset naik 96 → 192 px,
   * puncaknya ikut naik 232 → 255 sehingga 7,2 jadi kelewat terang; 6,2 yang
   * mengembalikan p99/p90/rata-ratanya ke tingkat semula. Kalau asetnya
   * dibuat ulang pada ukuran lain, UKUR LAGI — jangan bawa angkanya begitu saja.
   *
   * Kenapa butuh setinggi itu padahal AOC cukup 1,0: isi halaman ini nyaris
   * seluruhnya mendekati hitam dan piksel terangnya jarang — beda dari UI
   * Spotify yang penuh bidang terang. Teksel paling terang aset ini (232, huruf
   * "T" pada "Think") bahkan TERTUTUP kepala karakter yang duduk di situ, jadi
   * yang benar-benar terlihat berasal dari bagian rentang yang lebih rendah.
   * Membandingkan max aset lawan max render antar dua layar ini menyesatkan.
   *
   * Batas atasnya: pada 6,2 hanya 3 dari 64.400 piksel layar (0,00%) melewati
   * ambang Bloom 0,95 — layarnya terang tapi tidak ikut mekar. Kalau asetnya
   * nanti diganti dengan halaman yang lebih terang, angka ini WAJIB diturunkan;
   * cara mengeceknya: hitung piksel sRGB > 249 di dalam kotak layarnya.
   */
  {
    node: "OScreen_iMac_Cogniti",
    url: "/screens/cogniti-site.png",
    flipX: true,
    emissive: 6.2,
  },
  /**
   * iMac di sebelahnya (1,19 m ke −Y, baris meja yang sama) — EASTER EGG.
   * Node-nya juga dibuat runtime; lihat entri kedua di SCREEN_SPLITS.
   *
   * ── Isinya, dan kenapa justru berantakan ─────────────────────────────────
   * Layar ini menampilkan desktop kerja sungguhan: Blender terbuka dengan model
   * kantor INI di viewport-nya, jendela Finder, dan — kecil di pojok — logo
   * cogniti di Preview. Sekilas cuma workstation seseorang; logonya baru
   * ketahuan kalau diperhatikan.
   *
   * Versi pertama layar ini memakai tangkapan logo yang memenuhi layar, dan
   * DITOLAK karena persis itu masalahnya: terbaca sebagai papan nama, bukan
   * temuan. Jadi "ramai dan logonya kecil" di sini adalah SPESIFIKASI, bukan
   * kekurangan aset. Kalau suatu saat tergoda menggantinya dengan logo yang
   * lebih besar dan bersih, itu membatalkan gunanya.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i sumber.png \
   *     -vf "crop=2940:1704:0:0,scale=192:112:flags=area" \
   *     public/screens/cogniti-easter-egg.png
   *
   * • crop 2940×1704 dari sumber 2940×1912: aspek quad-nya 1,725 sedangkan
   *   tangkapan layarnya 1,537, jadi 208 px HARUS dibuang dari tinggi atau
   *   gambarnya melar. Dipotong dari BAWAH — yang hilang cuma Dock dan sedikit
   *   wallpaper, sementara memotong dari tengah akan memakan menu bar di atas.
   * • 192×112 dan flags=area sama persis dengan iMac pertama, supaya kedua
   *   layar yang bersebelahan ini sama kasarnya. Itu memang syarat utamanya.
   *   192 px juga yang membuat logo Preview-nya masih terbaca (±53 px lebar);
   *   pada 96 px logonya larut dan easter egg-nya hilang sama sekali.
   *
   * ── Kenapa TANPA eq, padahal iMac pertama pakai ──────────────────────────
   * `contrast=1.355:brightness=0.134` di sana ada untuk melebarkan rentang
   * halaman yang nyaris hitam. Sumber di sini sudah sehat apa adanya: min 20,
   * max 253, avg 76, p90 133 — tidak ada rentang yang perlu dilebarkan.
   *
   * Dipaksa pakai eq, hasilnya avg 94 dan p90 172: layarnya berteriak, padahal
   * yang diinginkan justru tidak menarik perhatian. Jadi alasannya NIAT, bukan
   * kerusakan — mentoknya cuma 0,8%, tidak parah. (Aset versi pertama layar ini
   * memang rusak kena eq, 10,5% mentok; itu berlaku untuk aset ITU, bukan ini.)
   *
   * ── emissive 1,5 ─────────────────────────────────────────────────────────
   * JAUH di bawah tetangganya (6,2), dan itu bukan ketidakkonsistenan: 6,2 ada
   * di sana justru KARENA halamannya hampir hitam dan piksel terangnya jarang.
   *
   * Yang harus disamakan antar dua layar bersebelahan adalah TINGKAT PUTIHNYA
   * — berapa render dari teksel 255 — BUKAN rata-rata atau p90-nya. Layar yang
   * menampilkan isi terang memang SEHARUSNYA terlihat lebih terang; memaksa
   * p90-nya turun sampai setara halaman hitam justru membuatnya salah.
   * Diukur pada kotak di dalam layar, frame yang sama:
   *     iMac-1 (ei 6,2) → max 254, p99 133, p90  71, p50 13
   *     iMac-2 (ei 1,5) → max 205, p99 145, p90 120, p50 40
   * Tingkat putihnya berdekatan, p90-nya memang jauh — persis seperti yang
   * diharapkan dari desktop terang lawan halaman hitam. Nol piksel di atas
   * ambang Bloom di layar ini.
   *
   * ⚠️ Jangan meramalkan angka ini dari emissive tetangganya lewat hitungan.
   * Aku sempat mencoba dan meleset jauh: model memperkirakan teksel 255 mendarat
   * di 115, hasil ukurnya 205. Naikkan, tembak, ukur kotaknya — itu saja.
   */
  {
    node: "OScreen_iMac_EasterEgg",
    url: "/screens/cogniti-easter-egg.png",
    flipX: true,
    emissive: 1.5,
  },
  /**
   * iMac di BARIS MEJA BELAKANG (blender x ≈ −11,1), sekitar 7,7 m dari kamera
   * Office — sekadar wallpaper macOS, layar yang menyala tanpa isi.
   *
   * Node-nya juga dibuat runtime; lihat SCREEN_SPLITS. Bedanya dari dua iMac di
   * atas: quad baris ini TEGAK LURUS sumbu X (normal +1,0,0), bukan miring 12°.
   * Itu tidak mengubah apa pun soal UV — tata letaknya identik, termasuk
   * u=0 yang mendarat di sisi +Y sehingga `flipX` tetap perlu.
   *
   * ── Kenapa 96 px, padahal tetangganya 192 ────────────────────────────────
   * Bukan kompromi kualitas, melainkan JARAK. Diukur dengan memproyeksikan
   * keempat sudut quad-nya dari VIEWS.Office (1440×900 dpr 2, sama seperti
   * shoot.mjs):
   *
   *   iMac Cogniti/EasterEgg  jarak 2,5–2,9 m → tampil 322 × 192 px
   *   dua layar baris ini     jarak 7,4–7,7 m → tampil  98 × 63 px
   *
   * Aset 192 px untuk layar yang cuma tampil 98 px berarti GPU MENGECILKAN 2×
   * — dan karena prepareScreenTexture mematikan mipmap serta memakai
   * NearestFilter, pengecilan itu tidak merata-ratakan apa pun: tiap piksel
   * layar mengambil satu teksel acak dan hasilnya berkedip (aliasing), bukan
   * lebih tajam. 96 px mendarat di ~0,98 teksel per piksel tampil, jadi nyaris
   * 1:1 dan tidak ada yang perlu dibuang.
   *
   * Kekasaran tampilnya memang sedikit lebih halus dari dua iMac depan (yang
   * 0,66 teksel/px), tapi itu selisih yang tak terbaca pada layar sekecil ini.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i "wallpaper mac.jpg" \
   *     -vf "crop=3974:2304:61:0,scale=96:56:flags=area" \
   *     public/screens/imac-wallpaper.png
   *
   * • crop 3974 dari 4096: sumbernya 16:9 sedangkan quad-nya beraspek 1,725,
   *   jadi 61 px dibuang dari tiap sisi supaya gradiennya tidak melar.
   * • TANPA eq. Wallpaper ini rentangnya sudah sehat apa adanya (min 70, max
   *   241, rata² 116) — tidak ada yang perlu dilebarkan, beda dari dua layar
   *   di atas yang sumbernya nyaris hitam.
   *
   * ── emissive 0,7: paling rendah di seluruh daftar, dan itu benar ─────────
   * Bukan karena layarnya jauh — emissive tidak meredup oleh jarak, cuma
   * mengecil. Alasannya ISI: tiap piksel wallpaper ini terang (min 70, rata²
   * 116) sementara semua layar lain punya latar gelap yang mendominasi. Pada
   * ei 1,0 layar ini renders max 218 / p90 177, jauh melewati easter egg
   * (max 179) — sebidang warna mencolok di latar ruangan yang gelap.
   *
   * 0,7 mendudukkan TINGKAT PUTIHNYA setara tetangga-tetangganya, yang memang
   * kriterianya (lihat catatan panjang di entri easter egg). Diukur pada frame
   * yang sama, kotak di dalam masing-masing layar:
   *
   *   easter egg (ei 1,5)  → max 180, p90 121, avg 58
   *   wallpaper  (ei 0,7)  → max 186, p90 151, avg 88   ← DIPAKAI
   *   dasbor     (ei 2,6)  → max 183, p90  92, avg 45
   *
   * p90-nya tetap lebih tinggi, dan itu memang seharusnya: isinya terang
   * merata. Nol piksel di atas ambang Bloom.
   */
  {
    node: "OScreen_iMac_Wallpaper",
    url: "/screens/imac-wallpaper.png",
    flipX: true,
    emissive: 0.7,
  },
  /**
   * iMac di sebelahnya (1,2 m ke +Y, baris belakang yang sama) — dasbor
   * manajer proyek internal yang dipakai tim ini sungguhan, dengan tab
   * "cogniti.id — 3D Office Tour" ikut terbuka di sebelahnya.
   *
   * ── Resep aset ────────────────────────────────────────────────────────────
   *   ffmpeg -i "Screenshot 2026-08-07 at 00.26.20.png" \
   *     -vf "crop=2940:1704:0:0,scale=96:56:flags=area,\
   *          eq=contrast=1.9:brightness=0.32" \
   *     public/screens/pm-dashboard.png
   *
   * • crop 2940×1704 dari 2940×1912, dipotong dari BAWAH — persis alasan yang
   *   sama seperti easter egg: aspek quad 1,725 lawan tangkapan 1,537, dan yang
   *   hilang di bawah cuma ekor daftar, sementara memotong dari atas akan
   *   memakan bilah tab yang justru membuatnya terbaca sebagai browser.
   *
   * ── Kenapa contrast 1,9 padahal easter egg tanpa eq sama sekali ──────────
   * Tangkapan ini tema gelap DAN tidak punya puncak terang: setelah diperkecil
   * ke 96 px, rentangnya cuma [0, 138] — teks putihnya larut ke latar saat
   * dirata-ratakan (di sumber aslinya max 255, tapi cuma 0,17% piksel).
   * Dibiarkan apa adanya, layarnya terbaca sebagai bidang abu gelap.
   *
   * contrast 1,9 + brightness 0,32 memetakan [0, 138] → [0, 232]: puncaknya
   * naik 1,7× sementara rata-ratanya nyaris tak berubah (29,2 → 29,9) dan
   * minimumnya tetap 0. Ini melebarkan RENTANG, bukan mengangkat seluruh
   * gambar — bedanya penting, dan sudah tercatat dua kali di berkas ini sebagai
   * mode gagal "latar memucat". Perbandingan yang diuji:
   *
   *   c=1,60 b=0,37 → min  31, avg 78  ← latar sudah kelabu, DITOLAK
   *   c=1,74 b=0,32 → min   0, avg 46  ← masih mengangkat latar
   *   c=1,90 b=0,32 → min   0, avg 30  ← DIPAKAI, latar tetap gelap
   *
   * Nol piksel di atas 249, jadi tidak ada yang mentok sebelum emissive.
   *
   * ── emissive 2,6 (DIUKUR) ────────────────────────────────────────────────
   * Isinya tema gelap dengan puncak 232, jadi butuh lebih tinggi dari easter
   * egg (1,5) untuk sampai ke tingkat putih yang sama — pola yang persis sama
   * dengan cogniti-site vs easter egg di atas, cuma tidak seekstrem itu.
   * Langkah yang diukur (kotak sama, frame sama):
   *
   *   ei 1,6 → max 155, p90 74, avg 38   ← masih terbaca lebih redup
   *   ei 2,6 → max 183, p90 92, avg 45   ← DIPAKAI, setara easter egg (180)
   *
   * Nol piksel di atas ambang Bloom.
   */
  {
    node: "OScreen_iMac_Dashboard",
    url: "/screens/pm-dashboard.png",
    flipX: true,
    emissive: 2.6,
  },
  /**
   * TV Meeting Room — video presentasi produk "Desa+" yang sedang diputar untuk
   * Person4 yang duduk di meja rapat.
   *
   * Layar TERBESAR di seluruh scene: quad-nya 2,17 × 1,23 m dan dari
   * VIEWS.Meeting (jarak 6,71 m) ia mengisi 280 × 164 px CSS — lebih besar
   * daripada monitor AOC (278) maupun iMac depan (322 × 192). Itu yang membuat
   * angka-angka di bawah tidak boleh disalin dari layar mana pun.
   *
   * ── Resep encode ─────────────────────────────────────────────────────────
   *   ffmpeg -i "Done. Video Desa+ new Design.mp4" \
   *     -vf "crop=1908:1080:6:0,scale=w=212:h=120:flags=neighbor,fps=15" \
   *     -c:v libx264 -pix_fmt yuv420p -crf 30 -g 30 -an \
   *     -movflags +faststart public/screens/desa-plus.mp4
   *
   * Sumbernya 1920×1080 30 fps 69 detik, 133 MB → 363 KB (366×).
   *
   * • crop 1908 (6 px dari tiap sisi): quad-nya beraspek 1,767, sumbernya
   *   1,778. Selisihnya kecil tapi tetap harus dibuang, atau gambarnya melar.
   * • flags=neighbor — dan ini menyalahi peringatan di kepala berkas ("untuk
   *   rekaman, neighbor justru merusak"). Peringatan itu tidak salah, ia cuma
   *   menganggap keterbacaan selalu yang dimenangkan. Di sini TIDAK: lihat
   *   bagian "Kenapa 212 px" di bawah — teks kecilnya memang dikorbankan, dan
   *   itu keputusan yang disengaja, bukan kelalaian encode.
   * • flags=area TIDAK dipakai justru karena ia yang bikin gambarnya lembek.
   *   area merata-ratakan piksel tetangga, jadi mengecilkan dengannya
   *   menghilangkan KETAJAMAN tanpa memunculkan KOTAK — hasilnya terbaca
   *   sebagai video blur, bukan layar PS1. Dibandingkan berdampingan pada
   *   resolusi yang sama, keduanya sama kasarnya secara angka tapi cuma
   *   neighbor yang tepinya bergerigi.
   * • Berkasnya justru LEBIH BESAR daripada versi area pada resolusi yang sama
   *   (363 KB vs 208 KB) — tepi keras mahal buat h264. Wajar, bukan gejala
   *   encode yang salah.
   * • fps=15, bukan 12 seperti MacBook. Layar MacBook memang diam berlama-lama
   *   sehingga 12 tak terasa; ini showreel yang animasinya bergerak terus, dan
   *   pada 12 fps gerakannya patah-patah.
   * • `-an` membuang trek audionya. Browser MENOLAK autoplay video bersuara —
   *   layarnya akan beku di frame pertama, bukan sekadar bisu.
   * • `-movflags +faststart` WAJIB; lihat catatan panjang di entri MacBook.
   *   Sudah dijaga otomatis oleh screenVideo.invariant.test.ts.
   *
   * ── Kenapa 212 px, dipilih dari perbandingan yang benar-benar dirender ────
   * Layar ini tampil 559 px perangkat (dpr 2), jadi 212 px = ~0,38 teksel per
   * piksel tampil — praktis sekasar monitor AOC (0,35), yang berarti TV ini
   * tidak lagi menonjol sebagai satu-satunya layar "HD" di ruangan. Itu yang
   * dikejar; angka mutlaknya sendiri tidak penting.
   *
   * Versi pertama yang terpasang 636 px `area` (~1,14 teksel/px) mengikuti cara
   * basement — resolusi moderat, biar NearestFilter yang mengasarkan. Keano
   * minta lebih kasar, jadi enam varian (636/424/318/212 × area/neighbor)
   * dipasang bergantian, ditembak shoot.mjs, dan dibandingkan pada ukuran
   * tampil sesungguhnya. 318 px sempat terpasang sebentar sebelum turun lagi
   * ke 212.
   *
   * ⚠️ Yang dibayar, dan ini disengaja: sub-judul beranimasi ("Mendukung
   * kinerja perangkat desa…") SUDAH TIDAK TERBACA di resolusi ini — hurufnya
   * larut jadi bintik. Judul besar "IMPLEMENTASI APLIKASI DESA DIGITAL" dan
   * mockup ponselnya masih terbaca, dan itu dianggap cukup: TV-nya berperan
   * sebagai properti ruangan, bukan sebagai sesuatu yang dibaca pengunjung.
   *
   * Jadi JANGAN "perbaiki" keterbacaannya dengan menaikkan resolusi — itu
   * membatalkan pilihan yang sudah dibuat sadar setelah melihat keenamnya.
   * Kalau videonya nanti diganti dan teks kecilnya memang harus terbaca,
   * barulah ulangi perbandingannya; 318 px `neighbor` adalah titik terakhir
   * yang sub-judulnya masih selamat.
   *
   * ⚠️ Saat membandingkan tangkapan antar varian: tiap tembakan mendarat di
   * frame berbeda, dan pada video ini ada teks yang sedang fade-in. Bandingkan
   * KEKASARAN hurufnya, bukan lengkap-tidaknya kalimat — sempat membuat varian
   * 424 terlihat paling parah padahal itu cuma soal waktu tembakan.
   *
   * ── emissive 0,8 (DIUKUR) ────────────────────────────────────────────────
   * Paling rendah di seluruh daftar, dan itu bukan kelalaian: isi video ini
   * penuh bidang PUTIH (mockup ponsel, panel UI), kebalikan dari cogniti-site
   * yang nyaris hitam dan justru karena itu butuh 6,2. Layar besar tidak
   * otomatis butuh emissive besar — yang menentukan isinya, bukan ukurannya.
   *
   * Diukur pada kotak di dalam layar (x 1630 y 450, 470×240 px pada tangkapan
   * dpr 2 dari shoot.mjs):
   *
   *   ei 1,0 → max 255, p99 255, p90 255, avg 62,3, >249 = 12,0%  ← MENTOK
   *   ei 0,8 → max 243, p99 241, p90 207, avg 56,9, >249 =  0,0%  ← DIPAKAI
   *   ei 0,6 → max 214, p99 214, p90 207, avg 49,3, >249 =  0,0%
   *
   * Pada 1,0 layarnya bukan sekadar terang — 12% pikselnya rata di 255,
   * artinya mockup ponsel putih di tengah kehilangan seluruh detailnya DAN
   * ikut melewati ambang Bloom (0,95) sehingga TV-nya mekar seperti lampu.
   * 0,6 aman tapi menyisakan tingkat putih 214, setara monitor AOC yang jauh
   * lebih kecil; 0,8 mendudukkannya di 243, tepat di bawah ambang.
   *
   * Tabel itu diukur saat asetnya masih 636 px dan tetap berlaku setelah turun
   * ke 212 — sudah diperiksa: keenam varian (636/424/318/212, area maupun
   * neighbor) mengukur max 243 dan >249 = 0,0% yang sama persis. Ini kelihatan
   * bertentangan dengan catatan iMac ("emissive terikat resolusi aset", 96 →
   * 192 px menaikkan puncak 232 → 255), padahal
   * tidak: yang bergeser di sana adalah coretan teks TIPIS yang ikut
   * dirata-ratakan saat diperkecil. Puncak di video ini datang dari bidang
   * putih LEBAR (mockup ponsel), dan bidang lebar tidak peduli resolusi.
   * Aturannya: resolusi menggeser emissive hanya kalau piksel paling terangnya
   * berasal dari detail setipis satu-dua piksel.
   *
   * ⚠️ Dua jebakan yang membuat pengukuran di sini lebih rewel daripada layar
   * gambar diam, dan dua-duanya sempat menghasilkan angka palsu:
   *
   * 1. Sapuan reveal bisa BELUM selesai saat shoot.mjs menembak (12 detik
   *    ternyata tidak selalu cukup). Gejalanya angka gelap yang tampak masuk
   *    akal — avg 10,2 pada ei 0,6 — padahal yang terpotret cuma pola dither
   *    setengah jalan. SELALU lihat crop-nya sebelum percaya angkanya.
   * 2. Ini VIDEO: tiap tembakan bisa mendarat di frame berbeda, jadi avg/p50/
   *    p90 antar tembakan TIDAK sebanding (tabel di atas memang berasal dari
   *    dua frame berbeda). Yang tetap sebanding adalah `max` dan persentase
   *    >249 — keduanya milik teksel 255 yang nilainya sama di frame mana pun.
   *    Bandingkan itu, bukan rata-ratanya.
   *
   * Kalau videonya diganti dengan konten bertema gelap, angka ini WAJIB diukur
   * ulang; konten terang dan konten gelap butuh emissive yang berbeda jauh, dan
   * di berkas ini sudah dua kali tercatat salah kalau ditebak dari tetangganya.
   *
   * ── flipX diturunkan dari geometri, bukan coba-coba ──────────────────────
   * Keempat sudut quad-nya diproyeksikan dari VIEWS.Meeting: u=0 mendarat di
   * x≈1090 px dan u=1 di x≈817 px, jadi u bertambah ke KIRI — persis seperti
   * semua layar lain di berkas ini. Tanpa flipX gambarnya tampil kecermin.
   *
   * Orientasi VERTIKALNYA sempat terbaca terbalik saat diperiksa di Blender
   * (v=0 di tepi bawah) dan nyaris dibetulkan dengan flip kedua. Itu KELIRU:
   * exporter glTF membalik V, jadi v=0 di bawah pada Blender = v=0 di ATAS pada
   * berkas yang dibaca three — sama persis dengan quad iMac yang sudah jalan.
   * Diverifikasi dengan mengulang pengukuran yang sama pada MG_Office_iMac_
   * Screen sebagai kontrol. Jangan "perbaiki" tanpa mengulang kontrol itu.
   */
  {
    node: "MG_MeetingWest_MR_TVScreen",
    url: "/screens/desa-plus.mp4",
    flipX: true,
    video: true,
    room: "Meeting",
    emissive: 0.8,
  },
  /**
   * TV Function Room — logo cogniti mantul ala screensaver DVD, ditonton
   * CH_Person5 yang duduk di sofa. Dibuat oleh `scripts/make-dvd-video.mjs`
   * (deterministik; jalankan ulang untuk mengubah kecepatan/ukuran logo).
   *
   * ── Ini juga MEMBETULKAN cacat, bukan cuma menghias ────────────────────────
   * Sebelum diisi, layar ini me-render PUTIH POLOS: terukur avg 255,0 dengan
   * 99,9% pikselnya di atas ambang Bloom, jadi ia benda paling terang di
   * ruangan dan mekar seperti lampu. Material `M_SM_TV_Screen` di GLB memang
   * begitu bawaannya. Jadi kalau suatu saat entri ini dihapus, yang kembali
   * BUKAN layar hitam yang netral — melainkan slab menyilaukan itu lagi.
   *
   * ── Kenapa konten ini yang cocok di sini ──────────────────────────────────
   * Layarnya tampil ~283 × 180 px CSS dari VIEWS.Function, sekelas TV meeting,
   * jadi asetnya 212 px dan sama blocky-nya. Pada kekasaran itu apa pun yang
   * bergantung teks kecil tidak akan terbaca — konten harus terbaca dari
   * GERAK, BENTUK, dan WARNA. Logo mantul di latar hitam memenuhi ketiganya,
   * dan latar hitamnya sekaligus menjawab masalah putih di atas.
   *
   * ── Ukuran logonya kecil, dan itu disengaja ────────────────────────────────
   * Logonya 32 px di aset — 15% lebar layar, jadi ±43 px CSS waktu tampil.
   * Dipilih Keano dari kandidat 100/76/60/44/32 yang semuanya dirender DI
   * DALAM scene. Dua hal yang cuma kelihatan di sana:
   *
   *   • makin besar logonya, makin sempit ruang mantulnya — di 100 px geraknya
   *     terbaca sebagai BERGETAR, bukan melayang. Yang dijual lelucon ini
   *     adalah perjalanan panjang menuju sudut, dan itu butuh ruang kosong.
   *   • di 32 px tulisan "cogniti" tinggal 12 px tingginya dan tidak terbaca
   *     sebagai kata. Itu bukan cacat: yang tersisa siluet + titik merah brand,
   *     dan itu sudah cukup untuk dikenali dari sofa. Jangan "perbaiki"
   *     keterbacaannya dengan membesarkan logonya — biayanya gerak tadi.
   *
   * Semua kandidat diukur, maks-nya 227–230 dan tidak satu pun menembus ambang
   * Bloom, jadi mengganti ukuran logo TIDAK menggeser emissive di bawah.
   *
   * ── emissive 1,0 (DIUKUR, dan kebetulan sama dengan SCREEN_EMISSIVE) ──────
   * Diukur pada kotak di dalam layar (x 1800 y 530, 440×230 px pada tangkapan
   * dpr 2 dari shoot.mjs):
   *
   *   ei 1,7 → max 255, p99 255, >249 = 2,4%  ← mekar
   *   ei 1,3 → max 255, p99 251, >249 = 1,7%  ← mekar
   *   ei 1,0 → max 234, p99 224, >249 = 0,0%  ← DIPAKAI
   *   ei 0,7 → max 197, p99 191, >249 = 0,0%
   *
   * 1,0 adalah nilai tertinggi yang belum menyentuh ambang Bloom — di 1,3 ujung
   * logonya sudah rata di 255 dan TV-nya mulai mekar lagi, yaitu persis cacat
   * yang entri ini ada untuk menghilangkan.
   *
   * ⚠️ Ditulis EKSPLISIT walau nilainya kebetulan sama dengan SCREEN_EMISSIVE.
   * Bukan tulisan mubazir: SCREEN_EMISSIVE itu default bersama, dan kalau suatu
   * hari dinaikkan demi layar lain, layar INI ikut naik lalu mulai mekar tanpa
   * ada yang menghubungkannya dengan perubahan tadi. Angka ini hasil ukur, jadi
   * dipaku.
   *
   * ⚠️ Perhatikan bahwa teksel paling terang di aset ini cuma 210 (silver brand
   * #d2d3d4), BUKAN 255. Jadi angka 234 di atas TIDAK sebanding langsung dengan
   * "tingkat putih" layar tetangga (TV meeting 243 dari teksel 255) — di sini
   * memang tidak ada teksel putih untuk diukur. Kalau logonya nanti diganti
   * dengan yang mengandung putih murni, ULANGI pengukurannya; ei 1,0 hampir
   * pasti akan mentok.
   */
  {
    node: "MG_Function_M_SM_TV_Screen",
    url: "/screens/dvd-logo.mp4",
    flipX: true,
    video: true,
    room: "Function",
    emissive: 1.0,
  },
];

/**
 * Layar yang harus DIPISAH dulu dari mesh gabungan sebelum bisa diisi.
 *
 * ── Kenapa ini perlu ──────────────────────────────────────────────────────
 * Demi menekan draw call (lihat Documentations.md §4), objek sejenis digabung
 * per-material saat menyiapkan GLB. Akibatnya KESEPULUH layar iMac ruang
 * Office duduk di satu mesh `MG_Office_iMac_Screen` dengan satu material
 * `iMac_Screen`. Menempelkan texture ke situ akan menyalakan kesepuluhnya —
 * dan karena tiap layar punya UV 0..1 sendiri, kesepuluhnya menampilkan
 * halaman yang sama persis. Empat di antaranya terlihat dari sudut Office.
 *
 * ── Kenapa dipisah di sini, bukan di Blender ─────────────────────────────
 * Memisahnya di Blender lebih rapi sebagai aset, tapi menuntut export ulang
 * seluruh GLB (8,5 MB) — dan resep export itu punya banyak jebakan yang sudah
 * tercatat: texCoord lightmap harus 1, hanya aoMap channel 1 yang boleh jadi
 * lightMap, WebP gagal diam-diam untuk image depth < 24, dan penggabungan ORM
 * bisa membuat material magenta. Semuanya risiko yang mengenai SELURUH model,
 * demi memisahkan 12 segitiga. Di sini ongkosnya satu draw call tambahan dan
 * tidak ada yang lain yang bisa rusak.
 *
 * ── Kotaknya dalam ruang DUNIA three, dan itu disengaja ──────────────────
 * Angkanya diambil dari bounding box layar itu di Blender lalu dikonversi
 * dengan three(x, y, z) = blender(x, z, −y), plus margin 2 cm. Layar tetangga
 * terdekat berjarak 64 cm pusat-ke-pusat dan sisi terdekatnya masih 8 cm di
 * luar kotak, jadi pemisahannya tidak ambigu.
 *
 * Ruang dunia dipakai supaya angkanya bisa dibaca ulang langsung dari Blender
 * kalau suatu saat modelnya bergeser — bukan angka lokal yang cuma bermakna
 * relatif terhadap transform node induk.
 */
interface ScreenSplit {
  /** Node hasil merge di GLB yang dipecah. */
  from: string;
  /** Nama mesh baru — inilah yang dirujuk `node` di SCREENS. */
  to: string;
  /** Sudut kotak batas (ruang dunia three) yang memuat layar yang diambil. */
  min: [number, number, number];
  max: [number, number, number];
}

const SCREEN_SPLITS: ScreenSplit[] = [
  {
    from: "MG_Office_iMac_Screen",
    to: "OScreen_iMac_Cogniti",
    // Blender: min (−6,081  −4,720  0,919) max (−5,969  −4,202  1,226)
    min: [-6.101, 0.899, 4.182],
    max: [-5.949, 1.246, 4.74],
  },
  {
    from: "MG_Office_iMac_Screen",
    to: "OScreen_iMac_EasterEgg",
    // Blender: min (−6,081  −5,920  0,919) max (−5,969  −5,402  1,226)
    // Layar tetangga di baris yang sama, 1,19 m ke arah −Y.
    min: [-6.101, 0.899, 5.3822],
    max: [-5.949, 1.246, 5.9401],
  },
  // ── Baris meja belakang, blender x ≈ −11,1 ────────────────────────────────
  // Enam layar sisanya duduk di baris ini. Yang dua di bawah adalah yang
  // MENGHADAP kamera Office (normal +X) dan tidak terhalang apa pun — sudah
  // diverifikasi dengan raycast dari VIEWS.Office: keduanya jadi hit PERTAMA
  // (7,40 m dan 7,82 m), bukan tertutup baris meja depan.
  //
  // Layar terdekat berikutnya berjarak 0,36 m di sumbu x (baris yang saling
  // membelakangi) dan 0,50 m di sumbu z, keduanya di LUAR kotak — jadi
  // pemisahannya tidak ambigu, sama seperti dua entri di atas.
  {
    from: "MG_Office_iMac_Screen",
    to: "OScreen_iMac_Wallpaper",
    // Blender: min (−11,097  −5,9575  0,919) max (−11,095  −5,4285  1,226)
    min: [-11.117, 0.899, 5.4085],
    max: [-11.075, 1.246, 5.9775],
  },
  {
    from: "MG_Office_iMac_Screen",
    to: "OScreen_iMac_Dashboard",
    // Blender: min (−11,097  −4,7525  0,919) max (−11,095  −4,2235  1,226)
    // Tetangga di baris yang sama, 1,205 m ke arah +Y.
    min: [-11.117, 0.899, 4.2035],
    max: [-11.075, 1.246, 4.7725],
  },
];

/**
 * Pindahkan segitiga milik satu layar dari mesh gabungan ke mesh sendiri.
 *
 * Vertex yang terpakai DISALIN, bukan dipakai bersama. Berbagi buffer atribut
 * memang lebih hemat, tapi bounding sphere-nya lalu ikut menghitung seluruh 80
 * vertex — artinya mesh sepetak 53 cm mengklaim bola sebesar seluruh deretan
 * meja dan praktis tidak pernah ter-cull. Menyalin 8 vertex jauh lebih murah
 * daripada kehilangan frustum culling.
 */
function splitScreen(root: Object3D, s: ScreenSplit): boolean {
  // Idempoten: useGLTF menyimpan scene-nya di cache, jadi fungsi ini bisa
  // terpanggil dua kali untuk objek yang sama (mis. saat komponen di-mount
  // ulang). Panggilan kedua TIDAK boleh jalan — segitiganya sudah pindah, jadi
  // pencarian di bawah akan menghasilkan nol dan layarnya justru hilang.
  if (root.getObjectByName(s.to)) return true;

  const src = root.getObjectByName(s.from);
  if (!(src instanceof Mesh)) return false;

  const geo = src.geometry as BufferGeometry;
  const index = geo.getIndex();
  // Geometri bergrup memakai beberapa material lewat RENTANG index. Menyusun
  // ulang index-nya akan mengacak pemetaan itu, jadi lebih baik menyerah.
  if (!index || geo.groups.length > 1) return false;

  const pos = geo.getAttribute("position");
  if (!(pos instanceof BufferAttribute)) return false;
  src.updateWorldMatrix(true, false);

  const box = new Box3(new Vector3(...s.min), new Vector3(...s.max));
  const v = new Vector3();
  const inBox = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld);
    inBox[i] = box.containsPoint(v) ? 1 : 0;
  }

  // Syaratnya KETIGA vertex di dalam kotak, bukan sekadar titik tengah
  // segitiga: yang terakhir bisa menarik ikut segitiga milik layar tetangga
  // yang kebetulan menjorok.
  const taken: number[] = [];
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    (inBox[a] && inBox[b] && inBox[c] ? taken : kept).push(a, b, c);
  }
  if (!taken.length) return false;

  // Peta vertex lama → baru, dibangun sambil jalan supaya hanya vertex yang
  // benar-benar dirujuk yang ikut disalin.
  const remap = new Map<number, number>();
  const order: number[] = [];
  const subIndex = taken.map((vi) => {
    let n = remap.get(vi);
    if (n === undefined) {
      n = order.length;
      remap.set(vi, n);
      order.push(vi);
    }
    return n;
  });

  const sub = new BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    const attr = geo.attributes[name];
    if (!(attr instanceof BufferAttribute)) return false;
    // Tipe array-nya ditiru, bukan dipaksa Float32Array: atribut ternormalisasi
    // (mis. warna vertex Uint8) akan rusak nilainya kalau dipindah tipe.
    const Arr = attr.array.constructor as Float32ArrayConstructor;
    const dst = new BufferAttribute(
      new Arr(order.length * attr.itemSize),
      attr.itemSize,
      attr.normalized,
    );
    order.forEach((vi, n) => dst.copyAt(n, attr, vi));
    sub.setAttribute(name, dst);
  }
  sub.setIndex(subIndex);
  sub.computeBoundingSphere();

  // Materialnya sengaja dibiarkan menunjuk material bersama: applyScreen()
  // yang akan meng-CLONE-nya sesaat lagi, dan clone itulah yang jadi milik
  // mesh ini. Mesh asal tidak tersentuh.
  const mesh = new Mesh(sub, src.material);
  mesh.name = s.to;
  mesh.castShadow = src.castShadow;
  mesh.receiveShadow = src.receiveShadow;
  mesh.renderOrder = src.renderOrder;
  // Dipasang sebagai ANAK, bukan saudara: dengan transform identitas ia
  // mewarisi matriks induk apa adanya, jadi tidak ada transform yang perlu
  // disalin — dan tidak ada yang bisa meleset kalau suatu saat node induknya
  // dipindah di Blender.
  src.add(mesh);

  geo.setIndex(kept);
  // Bounding sphere mesh asal sengaja TIDAK dihitung ulang: three menghitungnya
  // dari atribut position (seluruh 80 vertex), bukan dari index, jadi hasilnya
  // akan sama persis. Bola yang sedikit kebesaran hanya menunda cull, tidak
  // pernah menyembunyikan yang seharusnya tampak.

  return true;
}

/**
 * Pecah semua mesh gabungan yang layarnya perlu diisi sendiri-sendiri.
 *
 * Mengembalikan jumlah yang berhasil. Dipanggil dari applyScreens() supaya
 * urutannya tidak bisa salah — node-nya harus ada sebelum dicari.
 */
export function splitMergedScreens(root: Object3D): number {
  let n = 0;
  for (const s of SCREEN_SPLITS) if (splitScreen(root, s)) n++;
  return n;
}

/**
 * Material layar hasil clone → emissiveIntensity kalibrasinya.
 *
 * Ada supaya efek lain (ScreensSleep) bisa meredupkan layar tanpa menebak
 * material mana yang layar. Menebaknya lewat nama bisa saja — clone-nya diberi
 * nama `<asli>__<node>` beberapa baris di bawah — tapi itu mengikat efek lain
 * pada pola penamaan internal berkas ini, dan pola begitu berubah diam-diam.
 *
 * Nilai yang disimpan adalah emissive KALIBRASI per layar, bukan satu angka
 * global: tiap entri SCREENS punya emissive-nya sendiri (0,7 sampai 6,2) dan
 * semuanya hasil PENGUKURAN, bukan rumus — lihat catatan panjang di masing-
 * masing entri. Peredup wajib bekerja sebagai pecahan dari angka ini.
 */
const screenMaterials = new Map<MeshStandardMaterial, number>();

/** Lihat screenMaterials. Kosong sebelum applyScreens() berjalan. */
export function getScreenMaterials(): ReadonlyMap<MeshStandardMaterial, number> {
  return screenMaterials;
}

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
      screenMaterials.set(clone, clone.emissiveIntensity);
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
  // WAJIB duluan: sebagian node di SCREENS baru ada SETELAH ini berjalan.
  // Dipanggil dari sini, bukan dari Office.tsx, supaya urutannya melekat pada
  // kodenya dan bukan pada ingatan orang yang mengeditnya nanti. Kalau gagal,
  // node-nya tak ditemukan dan hitungan kembalian di bawah ikut turun — yang
  // langsung tertangkap pemeriksaan DEV di Office.tsx.
  splitMergedScreens(root);

  // Dikosongkan tiap kali, bukan diakumulasi: pemanggilan ini menghasilkan
  // material clone yang BARU (StrictMode memanggilnya dua kali, ChunkBoundary
  // bisa me-mount ulang seluruh scene). Tanpa reset, peredup layar akan terus
  // memegang clone dari scene yang sudah dibuang dan menulis ke material yang
  // tidak ada lagi di layar — tidak error, cuma diam-diam tidak bekerja.
  screenMaterials.clear();

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

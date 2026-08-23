# Documentations — Cogniti Office 3D Tour

Dokumentasi progres pembuatan 3D office tour ala [basement.studio](https://basement.studio) untuk **cogniti.id**.
Terakhir diupdate: **19 Agustus 2026**.

**Status ringkas:** **5 ruangan sudah ~95% jadi** dan seluruhnya sudah jalan di browser (lihat MVP 1 di bawah):
- **Lounge/Billiard** (§2) & **Function Room** (eks Smoking, §3) — furniture & dekorasi lengkap
- **Office Area** (§3b) — 11 desk pod `ODesk_*`, elektronik meja (7 iMac + Magic KB/Mouse), lunch table, bar stool, kursi kerja, rak, tanaman, socket, whiteboard, dinding kaca `GWL_*`/`GWO_*`, pantry cabinet L, printer/shredder/wardrobe/microwave, track lighting + LED strip lantai
- **Meeting Room** (§3c) — meja V-frame, TV 98" frameless + cabinet, replika Rally Camera & Mic Pod ×4, Apple TV/remote/KB/trackpad, 9 kursi, snake plant, 6 downlight
- **West Room / Pantry wing** — counter, sink, bar table, rak

**0 material prosedural** tersisa (semua sudah di-bake ke image texture).

**Per 29 Jul** — kemajuan besar di atas MVP1:
- **GLB sudah terintegrasi ke web** (§4h) — bukan lagi cuma viewer HTML. Hero fullscreen + navigasi antar-ruangan + hash routing + scrollspy navbar. Blocker path model sudah dibetulkan.
- **5 karakter sudah TAMPIL & BERANIMASI di web** (§6b) — Leonard (sofa lounge), Person2 & Person3 (mengetik di office), Person4 (meeting room), Person5 (function room). Sudah di-export ke `office.glb`; **tanpa lampu khusus** — `CharacterLights.tsx` dihapus 6 Agu setelah ketahuan lampu ber-layer tidak pernah jalan (§6b).
- **Minigame billiard dibangun** (§6d) — fisika **cannon-es** (bukan Rapier lagi, lihat §6d) + kamera top-down + bar tenaga. ✅ **Kini FINAL** — direview di browser 12 Agu, clear tanpa revisi.
- **Konten web V1 di-port ke V2** oleh rekan tim (§4i) — 5 section baru + animasi teks pakai `motion`.
- **Manajer paket disatukan ke `bun`** (§7) — `pnpm-lock.yaml` dihapus, build terverifikasi lolos.
- **Build pindah Next.js → Vite + React SPA** (§4j) — dikerjakan rekan tim di hari yang sama.

**Per 30 Jul** — dikerjakan di branch `feature/waypoint-nav-lighting`, kini **sudah di-merge ke `main`** (lewat rangkaian merge 31 Jul):
- **Navigasi diganti waypoint 3D** (§4k) — `RoomNav.tsx` dihapus; scroll, swipe, dan panah keyboard **dicabut semua**. Berpindah ruangan sekarang hanya lewat bidang waypoint di dalam ruangan + dropdown Navbar.
- **Lighting scene dirombak** (§4l) — lightmap **DINYALAKAN** (`LIGHTMAP_INTENSITY` 0 → 1), N8AO + contact shadow masuk, bloom turun 1,6 → 0,4, ambient 0,12 → 0,03. Scene tidak lagi "terang rata".
- **Sapuan "kantor terbentuk"** (§4m) — dither Bayer 4×4 menyeberangi ruangan 2,6 s saat GLB selesai dimuat, tepi silver brand `#d2d3d4`. Terverifikasi 60 FPS di browser.
- **Titik awal tur pindah ke Lounge** (§4k) — `START_ROOM` di store, satu konstanta untuk kamera + `currentRoom` + hash URL.
- **Konten layar monitor jalan** (§6c) — Spotify pixel-art 96×54 di `OMon_AOC_2` lewat `emissiveMap`; blocker Blender **dilewati**, bukan dibereskan.
- **Light cone volumetrik DIHAPUS** (§4l) — sempat dibangun lalu dibuang; dua temuan mahalnya dicatat supaya tidak diulang.

**Per 31 Jul** — sudah masuk `main`:
- **Loading screen isometrik SELESAI** (§4n) — port animasi basement.studio, di-render di **Web Worker** supaya tidak beku saat kompilasi 233 shader (stall 2,3 s). Menjawab TODO "loader saat mengunduh". Koreografi: intro → idle putar-jeda → outro; gerbang `sceneReady` (dari `dt > 0.25` di `Office.tsx`), bukan `useProgress` drei yang bohong.
- **🐛 Bug merge lintas-wilayah dibetulkan** (§4o) — `frameloop="demand"` (dari `main`) vs tiga `useFrame` baru (dari `feature/screen-content`) **lolos auto-merge tanpa konflik** lalu membekukan seluruh scene: tampilan stuck + berat tapi navigasi tetap jalan. `frameloop="demand"` dicabut. Penjaganya: **`INVARIANTS.md`** + dua test invariant (frameloop & loader gate).
- **perf(billiard): traverse tiap frame dihentikan** (§6d) — `BilliardLights` menyapu seluruh scene graph 60×/detik sepanjang tur padahal minigame tak dibuka (dan 0 node cocok). Digerbangi `active`.
- **Label waypoint mengekor kursor** (§4k) — nama ruangan tidak lagi dipaku di tengah bidang, tapi menyusul kursor dengan sedikit tertinggal ("ditarik tali"). Pindah dari `<Html>` drei ke overlay DOM tunggal di luar Canvas (`ui/WaypointLabel.tsx`); gerak kursor lewat ref, bukan state React.

**Per 3 Agu:**
- **Waypoint Lounge & Function TUNTAS** (§4k) — TODO verifikasi 30 Jul ditutup; semua waypoint sudah terukur & terlihat.
- **KTX2 dicoba ulang lalu DITOLAK** (§7) — jalan secara teknis (VRAM 240 → 64 MB) tapi kualitas visualnya kalah dari yang asli. Skripnya disimpan sebagai jawaban yang sudah dibayar, bukan pekerjaan tertunda. **Jangan diusulkan lagi tanpa membandingkan mata dulu.**
- **Perangkat sentuh: scene 3D jadi PEMANDANGAN** (§4p) — waypoint & minigame billiard mati di `(pointer: coarse)`. Penjaganya `INVARIANTS.md` §6 + test invariant ketiga.

- **Hero dipendekkan jadi 70dvh di HP** (§4p) — konten mengintip di bawah canvas ala basement.studio, **dan** framing 3D melebar: `fov` three.js itu vertikal, jadi viewport jangkung menyempitkan pandangan kiri-kanan (iPhone 15: hFOV 29,8° → 41,7°). "see our work" disembunyikan di HP.
- **Branch `join` di-merge, blocker §6 TERBUKA** (§4q) — room links navbar + routing berbasis path (`/lounge`, `/office`, …) dari Nico masuk; pengunjung HP tidak lagi terkunci di Lounge. Konflik `Hero.tsx` (pinned scroll vs 70dvh) **digabung, bukan dipilih salah satu**: track mobile disetel 126dvh supaya rasio lepas pin 0,444 sama persis dengan desktop. Satu bug layar-putih reduced-motion ikut ketangkap saat merge.
- **🔥 Empat perbaikan performa & navigasi** (§4r) — semuanya berangkat dari keluhan nyata, bukan tebakan: MSAA dimatikan (**30 → 60 FPS** di kerapatan Retina), engine matter-js yang berdetak selamanya dihentikan (biang "laptop panas"), pola mount-semua-ruangan dicabut, chunk billiard ditunda + di-prefetch. Alat ukurnya ikut disimpan (`scripts/measure-frames.mjs` + `shoot.mjs`).
- **Aliasing itu PILIHAN ESTETIK** (§4r) — setelah melihat perbandingan berdampingan, Keano **lebih suka** tepi yang sedikit bergigi; sejalan dengan arah PS1/basement.studio. Jangan tawarkan SMAA/FXAA/MSAA sebagai "perbaikan".
- **Konten per-ruangan lengkap** (§4q) — tiap ruangan punya narasinya sendiri: Lounge (perusahaan), Office (layanan), Meeting (studi kasus), Function (orang & karir). `Services.tsx` dihapus, diserap jadi accordion 9-item di Office.

**Per 4–6 Agu:**
- **Dua bug billiard "bola keluar meja" DIBETULKAN** (§6d) — bola melayang di sambungan pelat kain (rusuk antar-pelat jadi dinding tak terlihat) dan bola cepat menembus lubang lalu kabur (tunneling). Dua-duanya di branch `fix/billiard-bola-keluar-meja`, sudah di-merge. Item (a) & sebagian (b) dari daftar "berikutnya" 3 Agu tertutup.
- **Bake ulang lighting TUNTAS untuk 5 ruangan** (§4s) — lounge + office 5 Agu, lalu **meeting/function/pantry 6 Agu** (105 lightmap baru + re-bake arsitektur lintas ruangan). Tidak ada lagi ruangan yang memakai lightmap lama.
- **Tone di-tuning + GLB dipangkas** (§4s) — resep "dibagi 4 saat export, dikali 4 di viewer" supaya HDR selamat dari 8-bit; `scripts/shrink-lightmaps.mjs` menciutkan lightmap di **level byte kontainer GLB** (GPU 508 → 315 MB, worst frame `/office` 350 → 83 ms). ⚠️ **Encode ulang Draco itu lossy** walau setelan maksimal — jangan pakai pipeline gltf-transform API untuk ini.
- **Video rekaman VS Code di layar MacBook** (§6c) — layar kedua yang terisi, dan yang pertama memakai `VideoTexture`. Rekaman asli, encode ala basement.studio (720px + `NearestFilter`, reduksi 4× bukan 40×). Blocker material MacBook di tabel §6c **ternyata sudah tidak berlaku** — `OMacbook_D7` punya material layar sendiri.
- **Tiga keluhan visual dari build web DIBETULKAN** (§4s) — hotspot oranye rak cubby A & B + cincin cahaya plafon meeting. Semuanya **diukur pada frame web**, bukan preview Blender. Tiga akar masalah yang tak terlihat dari gejalanya: objek terlewat dari daftar bake, dua rak berbagi mesh+UV sehingga satu lightmap melayani dua posisi, dan satu lightmap masih memakai konvensi lama tanpa ÷4. Sekalian **denoise OIDN** — bake 96 samples ternyata tidak pernah kena denoiser, itu biang "banyak noise".
- **`CharacterLights` GUGUR permanen** (§4s) — bukan ditunda. Lampu ber-`layers` tidak pernah jalan di three r185 (pengujinya **kamera**, bukan objek yang disinari). Keano melihat perbandingannya dan memilih karakter tanpa lampu.
- **EMPAT layar iMac terisi** (§6c) — situs cogniti, easter egg, wallpaper, dasbor PM. Mesh gabungan **dipecah saat runtime** di Three.js, bukan export ulang GLB. Pelajaran mahal: **emissive wajib DIUKUR** (menebak dari analogi meleset ~3×), dan resolusi aset mengikuti **ukuran tampil**, bukan tetangganya.
- **Merge `origin/main` bersih** (§4o) — 25 commit dari Nico (careers/crew/awards), 189 test hijau. ⚠️ `bun install` dulu sebelum percaya hasil test setelah merge.
- **SEMUA LAYAR TERISI — tidak ada lagi layar kosong** (§6c, 7 Agu, commit `2b247d4`) — TV meeting (rekaman Desa+) & TV function (logo cogniti mantul ala screensaver DVD). TV function sekaligus **membetulkan cacat**: materialnya me-render putih polos yang mekar seperti lampu. Gerbang video jadi **per-ruangan**, karena tiga video di tiga ruangan berarti men-dekode yang tidak terlihat.

**Per 8–11 Agu** — batch "kantornya terasa hidup", semuanya sudah di `main`:
- **Panel "under maintenance"** (§4t) — lubang pintu buntu Office ditutup papan catur dither Bayer, lalu **jadi interaktif** 9 Agu (hover teks melayang, klik glitch sobek). Dua aturan mahal ikut tercatat: **`renderOrder` WAJIB 0** (dinaikkan jadi 2 → hologram terlihat menembus tembok, dan sebabnya bukan depth melainkan pengurutan antrean transparan), dan **keterbacaan dither berbanding TERBALIK dengan jumlah tangga kuantisasi** (16 tangga = gradien halus; 4 tangga = tekstur betulan).
- **Glitch karakter saat idle** (§4u) — setelah 8 dtk, kelima karakter "rusak" 130–240 ms: irisan tergeser + kilasan dither putih. **Di karakter saja, bukan fullscreen** (fullscreen terbaca "website rusak"). Fade lintas-ruangan memakai jarak ke **target pandangan**, bukan posisi kamera — percobaan pakai kamera gagal karena kamera Lounge mundur jauh dan ikut mem-fade Leonard.
- **Kantor merespons kursor & perpindahan** (§4v) — mouse parallax (dihitung di **ruang kamera**, jadi benar di keempat ruangan tanpa angka per-ruangan), HoverScan, sobekan transisi, debu melayang. **Nol pass render tambahan.** Dua gotcha R3F kelas berat: **`onPointerMove` dipanggil sekali per PERPOTONGAN** (pola "set kalau kena, clear kalau tidak" diam-diam rusak) dan **prop `uniforms` MENYALIN, bukan merujuk** (debu tidak muncul sama sekali, tanpa satu pun error).
- **Hero mengalir tanpa pin** (§4w) — tiga laporan dari HP ternyata satu sebab (hero dipaku & disurutkan padahal di layar sempit tak perlu keduanya), lalu **desktop menyusul ikut bentuk HP**: pin & surut dibongkar, seam `HeroHandoff` dicabut seluruhnya. Satu koreografi untuk semua lebar layar.
- **Menu layar penuh di navbar** (§4x) — adaptasi `#menu-overlay` situs tayang; burger **memorf** jadi "— Close." (garis tengah & strip kata = satu elemen yang sama). Jam tiga zona digerbangi "menu terbuka" dan bangun **per pergantian menit**, bukan `setInterval(…,1000)` selamanya — pola itu persis biang "laptop panas" 3 Agu.
- **Kantor bernapas saat ditinggal** (§4y) — `idleClock` ref-counted untuk seluruh app, LED strip turun 16% setelah 8 dtk, layar tidur di **45 dtk (bukan 8** — TV ada untuk ditonton). Sekalian ketahuan **FIX 4 mati diam-diam**: nama material GLB berakhiran nama mesh (`M_LEDStrip__MG_Office_M_LEDStrip`), jadi `===` selalu meleset **tanpa error**.
- **Section konten dirombak + penjaga overflow HP** (§4z, rekan tim) — Industries jadi kartu sektor, Vision jadi `MissionShowcase`, `NetworkField` dibuang (canvas rAF-nya biang jank scroll sentuh), `overflow-x: clip` global.

**Per 12 Agu:**
- **Minigame billiard resmi FINAL** (§6d) — item tertunda paling lama di dokumen ini. Keano mereviewnya di browser dan menilainya **clear, tanpa revisi**.
- **Industries & Deployments dibetulkan untuk layar sentuh** (§4aa, rekan tim) — Industries jadi korsel scroll-snap yang maju sendiri tiap 4,5 dtk dan berhenti permanen pada sentuhan pertama; foto kartu Deployments yang dulu hanya terbuka **saat hover** (dan karenanya redup selamanya di HP) kini terikat scroll. Satu gotcha layout: **anak grid/flex yang memuat scroller wajib `min-w-0`**, kalau tidak scroll-nya diam tanpa gejala overflow apa pun.
- **Copy dibersihkan** (§4aa) — typo, pecahan kalimat, dan pola *rule-of-three* yang terbaca hasil mesin. ⚠️ beberapa assertion test mengutip kalimatnya utuh.

**Per 13 Agu:**
- **Loading di deploy publik tidak lagi buntu** (§4ab) — origin melayani ~50 KB/s, jadi `office.glb` 13 MB berarti **4+ menit di balik loader tanpa tanda kemajuan**, dan putus di tengah = **hero statis permanen**. Sekarang GLB diunduh sendiri (progres byte + sambung ulang lewat header `Range`), dan `SceneFailed` punya tombol retry yang pulih **tanpa reload**. 🔥 `useGLTF.preload` **DIHAPUS** — mengembalikannya = unduhan dobel. Sisa: cache edge Cloudflare `/3d/*`, yang ada di panel Keano, bukan di repo.
- **Form inquiry pindah ke layar MacBook 3D** (§4ac) — MacBook tertutup yang membuka saat diklik, layarnya jadi form. Engsel & kamera dapat **pegas terpisah** (satu nilai untuk keduanya terbaca sentakan), melayang dimatikan selama terbuka supaya teksnya tidak melunak, dan di layar sentuh/jendela sempit form-nya lewat lembar datar — bukan lewat laptop. 🚧 **`submitInquiry()` masih STUB**, Web3Forms belum dipasang: **blocker rilis.**
- **🐛 "Ngeflick" ternyata TIGA bug bertumpuk** (§4ac) — canvas R3F tertinggal ~58 ms dari tata letak DOM; lalu membatalkan lompatan lewat **kamera** ternyata mengubah sudut pandang, bukan skala (ketahuan karena lebarnya meleset 1% tapi tingginya 9%); lalu `setViewOffset` yang membetulkannya **merusak `<Html transform>` drei**, yang meniru kamera lewat CSS 3D dan memaku titik hilangnya di pusat canvas. 🔥 Pelajarannya: **probe geometri canvas yang bersih tidak membuktikan render yang bersih** — sentakannya cuma tertangkap oleh probe yang membaca piksel.

**Per 18 Agu:**
- **🐛 Gulir lintas-ruangan berhenti di tengah halaman** (§4ag) — biangnya `height: 100%` / `h-full` di `<html>` & `<body>`. ResizeObserver yang dipakai Lenis melaporkan **kotak** elemen, bukan `scrollHeight`, jadi `limit`-nya beku di tinggi halaman yang **kebetulan terukur pertama kali** (Lounge mentok di y=3005 — `limit` milik Office — padahal dasarnya 5833). Tidak ada error, tidak ada test merah. Naik jadi **INVARIANTS §8** + `scrollRootHeight.invariant.test.ts`.
- **Lounge dirampingkan** (§4ag) — Manifesto & LivingArchitecture dicabut dari alur, berkasnya dihapus bersama `ArchitectureGrid`/`NodeGlyphs`/`CsiParticleField` (−1808 baris). Efek sampingnya lebih besar dari copy: **tidak ada lagi Canvas kecil yang ikut remount saat berganti ruangan.**
- **Contact berdiri sendiri di Office** (§4ad) — CTA "let's talk" tidak lagi melempar ke Lounge; **keempat ruangan berisi** kini punya `<Contact />`, dan tombol Navbar-nya diturunkan dari `ROOM_CONTENT` sehingga benar sendiri tanpa daftar yang ditulis ulang. Gulirnya lewat `scrollToSection()`, bukan anchor — lompatan anchor bawaan peramban berebut posisi dengan rAF Lenis.
- **Laptop inquiry hidup di layar sentuh** (§4ad) — dua bug satu sebab: jalur "sheet" tidak pernah menyalakan gerbang yang sama dengan jalur desktop, jadi engselnya diam (`overlay` selalu false) dan tombol tutupnya tertimbun navbar (`promoted` juga mati).
- **Navbar: pill → bilah penuh** (§4ae) — merapatkan padding tidak akan pernah membawa logo ke 12 px; yang menahan `max-w-5xl` + `justify-center` (logo berhenti 233 px dari tepi di 1440). Latarnya `.dither-panel` menggantikan `.glass` — blur itu satu-satunya permukaan di layar yang datang dari era berbeda.
- **Crew: daftar berkelompok + tirai sorot hover** (§4af) — filter kategori & nama-aktif-ikut-gulir dilepas, tinggal hover. Pasangan z-40/45 masuk tabel INVARIANTS §2.

**Per 19 Agu:**
- **Pindah ruangan dari konten = potong + tirai kotak, bukan camera fly** (§4ah) — camera fly itu afordans **spasial**; dari dalam konten titik berangkatnya tak pernah terlihat, jadi yang tersisa cuma **1,4 detik menunggu** (plus kedipan ruangan lama saat halaman dijepret ke atas). `GridReveal` menutup layar dengan kisi 64 px yang dikocok Fisher-Yates, menukar ruangannya di puncak, lalu **menunggu FRAME — bukan waktu** — sebelum mengangkat tirai (`frameloop` mati di konten, INVARIANTS §7). Waypoint 3D & jalur hero **tetap** camera fly. 🐛 Empat jebakan tercatat, dua di antaranya gagal **senyap**: `scrollToTop()` ditelan scroll-lock sendiri, dan commit **ANTARA** store ↔ router yang memicu tween 1400 ms di balik tirai.
- **Navbar & URL bicara bahasa konten** (§4ah) — **Home / Services / Work / People**, bukan nama ruangan; `RoomKey` tidak berubah di mana pun dan label waypoint 3D tetap nama ruangan. Slug lama (`/office`, …) tetap hidup dan dinormalkan dengan **`replace`** — dengan push, Back mendarat di URL yang detik itu juga ditulis ulang dan tombolnya terasa mati. *(Batch ini di-commit `142d573`, 19 Agu.)*
- **CDN resmi jalan — sisa terakhir §4ab tertutup** (§4ai) — Cache Rule Cloudflare untuk `/3d/*` dibuat rekan yang memegang akses zone; `office.glb` turun dari **4+ menit (50 KB/s)** ke **3,9 detik (3,3 MB/s)**. `.glb` **bukan ekstensi default CF**, jadi tanpa rule eksplisit header apa pun tidak menolong. Sekalian `office.glb` **keluar dari git** (`2357c8e`): kini di `/3d/models` (root, di-ignore) dan disajikan middleware `serveLocalModels` di `vite.config.ts` — update model = **ganti file + scp + purge**, tanpa commit/rebuild. 🐛 Deploy pertama sempat **404 di origin** (scp terlewat) tapi **tak pernah terlihat pengunjung** — edge masih memegang salinan; pelajarannya di §4ai.
- **Fps drop Safari → optimasi GPU idle DIMAJUKAN sebagian** (§4aj) — scene berjalan **tepat di ambang vsync tanpa headroom** (terukur 7 Agu), dan Safari (ANGLE→Metal, sedikit lebih lambat utk pass fullscreen yang sama) jatuh terkuantisasi ke ~30 fps. Tiga lever terpasang: **cap 30 fps saat idle** (gambar tiap 2 tick rAF — BUKAN `frameloop="demand"` yang diharamkan; semua `useFrame` tetap berdetak serempak), **dpr 1,5 → 1 + `image-rendering: pixelated`** (2,25× lebih sedikit piksel, look kotak PS1), dan **adaptive dpr** — termostat tangga [1 → 0,6] yang dikemudikan frekuensi rAF nyata. 🔥 Jebakan terpenting: **cap OS Low Power Mode dan GPU jenuh terkunci vsync KEMBAR** (sama-sama 33,3 ms rata) — pembedanya **jendela idle** dari cap 30 fps sendiri. Debug: `window.__renderPace()` / `window.__adaptiveDpr()`; A/B look: `?dpr=`.
- **🐛 Bayangan billiard berubah-ubah bentuk tiap navigasi** (§4ak) — akar di **sumber drei**: penghitung bake `ContactShadows` adalah `let count = 0` **di badan render, bukan ref** → tiap re-render Scene (flip heroInView, langkah adaptive dpr, toggle billiard) mengulang bake 4 frame **di momen acak di luar tirai**. Fix: elemen dibangun di `useMemo` (bail-out identitas elemen React) + Dust keluar dari pass depth lewat `NO_BAKE_LAYER` (posisi basis salah tempat + `gl_PointSize` undefined per driver). Pelajaran probe: "reproduksi" pertama ternyata **artefak parallax kursor probe sendiri** — netralkan posisi mouse sebelum diff screenshot.

**Per 20–21 Agu:**
- **🐛 404 saat refresh di rute SPA** (§4al) — produksi = pm2 + `serve` Vercel di atas `dist`, dan `serve` tidak tahu rute klien; fix = `public/serve.json` berisi rewrite semua rute ke `index.html` (Vite menyalin `public/` ke `dist`, jadi konfigurasinya ikut ter-deploy sendiri).
- **Rombak People** (§4am) — CareersRoles diisi konten V1, TestimonialSpotlight baru, foto crew asli menggantikan placeholder.
- **Grading foto via ffmpeg** (§4an) — resep netralkan-amber-dulu (⚠️ `colortemperature` kebalikan intuisi: Kelvin TINGGI = mendinginkan) + zoom-blur radial dirakit dari `mix` + `maskedmerge` tanpa plugin. Outputnya kini dipakai Vision (§4ar).
- **Lift scroll hero** (§4ao) — kamera "melorot" saat hero digulir habis, **titik pandang TERKUNCI** (dongakan muncul sendiri dari lookAt; versi dua-kurva dicabut). Anti-void = jaminan geometris: `LIFT_MIN_CAM_Y` di atas lantai, bukan angka yang kebetulan pas.
- **🐛 Debu patah-patah kalau tab hidup lama** (§4ap) — presisi float32 `uTime` habis pelan-pelan (9 jam = gerak bertangga, 37 jam = beku-lompat). Fix: **wrap waktu 800 dtk** + laju naik dikuantisasi 9 tingkat supaya semua periode sepadan; verifikasi via `?dustT0=` tanpa menunggu berjam-jam.
- **Services: accordion → sabuk teks 3D** (§4aq) — panel putih ala Lusion di `/services`, porting selektif pmndrs `infinite-scroll` (damp + pop + pudar-saat-diam), wheel disandera di atas panel (desktop) + **drag pointer** (HP 1,5×; drag mouse dicabut malamnya → §4at). Canvas kedua di halaman → `frameloop="demand"` dengan pesan-frame-sendiri sampai menetap; diam = 0 draw call.
- **Perampingan sections** (§4ar) — eyebrow dicabut serempak (Portfolio/Featured/Meeting Room·The Work/Our Vision), Vision dirombak jadi headtext + foto kantor ter-grading full-bleed, panel stat & NumberTicker dibuang, + 🐛 fix meta CareersRoles menumpuk di HP (jebakan flex-wrap: `flex-1` basis-0 + `basis-full` muat "satu baris").
- **Audit teks: em dash dihapus** (§4as) — 16 titik di 9 berkas teks tampil (title/meta, copy sections, label loader, aria-label, sr-only) diganti koma/titik seperlunya; komentar kode & console sengaja tidak disentuh.
- **Services ticker dipisah per perangkat** (§4at) — desktop hanya wheel, sentuh hanya drag (drag mouse dicabut); hint "Scroll/Drag to explore" ikut `useCoarsePointer` yang sama dengan gerbang efeknya. 🔥 Gotcha probe CDP: clip `captureScreenshot` = koordinat dokumen, bukan viewport.
- **Industries: galeri → tumpukan raycast-cycling 3D** (§4au) — porting pmndrs `raycast-cycling` di strip putih full-bleed: tangga spiral 13 plank kaca buram (komposisi demo verbatim), wheel menggilir plank yang tertutup **hanya saat ray kena ≥2 plank** (di luar itu wheel = scroll halaman), klik plank = mode fokus (terbang kiri + expand foto + panel deskripsi, sisa tangga & bayangan fade). `<CycleRaycast/>` drei di-fork (preventDefault document-wide + bajak Tab). Canvas KETIGA di halaman, demand. 🐛 ref material lupa dipasang = rantai invalidate mati diam-diam; 🔥 raycaster three tidak cek `visible`.

**⬅️ Berikutnya:** (a) **pasang backend Web3Forms untuk form inquiry** (§4ac) — satu-satunya blocker rilis yang tersisa, dan sengaja sudah dikurung dalam satu fungsi; (b) uji anti-beku loader di browser sungguhan (DevTools Performance saat kompilasi shader) — inti keputusan Worker (§4n); (c) selidiki p95 33 ms di `/office` & `/meeting` (dugaan: skinning karakter, §4s); (d) optimasi GLB lanjutan — atlas per ruangan + dedup 29 image kembar (§4s); (e) post-processing PS1 (§4b), pass terakhir untuk look basement.studio; (f) **verifikasi perf Safari oleh Keano sendiri** setelah deploy §4aj — `window.__adaptiveDpr()` di console langsung memberi tahu jatuh di kategori mana (GPU-bound → index naik; tetap `{dpr: 1}` tapi lag → cap OS Low Power Mode). **Optimasi GPU idle:** penundaan "tunggu finalise" (7 Agu) **dicabut sebagian 19 Agu** karena Safari — opsi 1/2/4 terpasang (§4aj); sisa **opsi 3** (gabung pass HueSaturation + BrightnessContrast) tetap menunggu finalise.

> ⚠️ **Test suite: 324 test / 53 berkas, hijau** (21 Agu). Satu test *pernah* merah pada satu putaran penuh — `TheCrewMobileCarousel.test.tsx` ("auto-advances 30s after going idle") — lalu hijau saat dijalankan sendiri **dan** pada putaran penuh berikutnya. **Flake fake-timer di bawah beban, bukan regresi**; kalau ia muncul lagi, curigai `advanceTimersByTimeAsync` di suite yang berbagi sesi timer, bukan komponennya.

## 🎉 MVP 1 SELESAI (27 Jul) — **50-60 FPS di browser**

Seluruh scene (5 ruangan) jalan mulus di browser: **8,0 MB, 401 draw call, 0 lampu realtime** (semua cahaya + bayangan di-bake ke lightmap).

> Model yang dipakai sekarang adalah **`public/3d/models/office.glb`** (8,09 MB per 30 Jul, sudah termasuk 5 karakter) di dalam app web — bukan lagi viewer HTML `export-test/`. Jalankan `bun dev` → `http://localhost:3000`. Viewer lama masih dijelaskan di §4e sebagai rujukan kalibrasi.

| Metrik | Awal | Final |
|---|---|---|
| Ukuran GLB | 35 MB | **8,0 MB** |
| Draw call | 2.522 | **401** |
| Lampu realtime | 39 | **0** (baked) |
| FPS | 1-2 | **50-60** ✅ |

Tahapan yang menghasilkannya — masing-masing ada sub-bab detailnya:
1. **Pre-export audit** (§4d): 0 material prosedural, 0 CURVE, 0 AREA light, 0 image unpacked, 0 objek tanpa UV
2. **Optimasi poly** (§4c): 1.008M → 760.871 tris
3. **Resize texture** (§4c): 134,4 → 52,9 MP (−61%); temuan besar: Magic Keyboard sendirian 62% beban texture
4. **Merge objek** (§4f): 2.522 → 401 draw call — *ini yang paling menentukan FPS*
5. **Bake lightmap** (§4g): 39 lampu realtime → 0

**Pelajaran utama:** bottleneck-nya **draw call & lampu realtime**, BUKAN poly count. 995k tris tetap 50-60 fps setelah draw call ditekan dan lampu dibake. Urutan diagnosa yang benar ada di §4e.

**Berikutnya:** ~~Karakter PS1 (§6b)~~ ✅ **5 karakter tampil di web 29 Jul.** ~~Ukur ulang FPS~~ ✅ **60 FPS terukur 30 Jul** dengan karakter + N8AO + contact shadow + sapuan reveal aktif (§4l, §4m) — tambahan-tambahan itu tidak memakan anggaran performa MVP1. Sisa: review visual billiard di browser (§6d).

**Pekerjaan aktif:** melengkapi & menata furniture/aksesori office. Semua furniture office sudah **dirapikan ke sub-collection** di bawah `Office_Plan`. **Utang teknis import mentah BERES** — `OP_Electronics` diciutkan 1424 → **131 objek** (semua junk `Object_*/Node_*/pCube*/pPlane*/RootNode*` dibuang; part di-rename bersih: `OMagic_KB_/Mouse_`, `OMon_AOC_`). **11 kursi kantor Sketchfab di-rename `OChair_Office_*` & dipindah ke `OP_Seating`.** Furniture office terkini (22 Jul): **pantry cabinet L-shape `OP_Pantry` (56 part: base unit + tower + wall unit + worktop)** di pojok barat laut, **printer `OP_Printer` + shredder `OP_Shredder`** (di pojok, `OP_Electronics`), **wardrobe/kabinet rendah `OP_Ward_*`** (11 part, di `OP_Shelves`), **microwave `OP_Microwave` + bar table `OP_BarTable_*`** (pojok barat daya, di atas pantry base). **Pencahayaan office SUDAH ADA (22 Jul)** — track lighting `OP_TrackL/TrackLV_*` (8 SPOT) + lunch pendant `OP_LunchLight_*` (3 POINT), collection `OP_Lighting`. Collection sudah dirapikan (0 loose). Scene total ~**1391 objek, 254 material**.

> ✅ **Utang teknis import mentah SELESAI (21 Jul):** ratusan node sampah FBX/Sketchfab dibuang, scene 2551 → 1189 objek. Sisa loose di Scene Collection tinggal **18 objek**: `ODisp_Brio_Root`, `OBar_*` (5), `OP_Shelf2_*` (9), 3 `ODesk_Root_Single_Dup*` — semua geometry manual bersih, tinggal dipindah ke sub-collection `Office_Plan` yang sesuai (opsional, tidak menghambat export).

---

## 1. Gambaran Proyek

**Tujuan:** website tour kantor 3D interaktif — pengunjung bisa menjelajahi kantor Cogniti secara virtual di browser.

**Pipeline:**
```
Scan ruangan (Polycam) → Import GLB ke Blender (referensi)
→ Remodel manual geometry bersih (box modeling)
→ Export GLB → Three.js di browser
```

**Kenapa remodel, bukan pakai scan langsung?** Scan Polycam berat (~90k faces per ruangan), berantakan (floating geometry, permukaan bergelombang), dan materialnya baked. Remodel manual menghasilkan geometry ringan (~12k faces satu ruangan penuh isi), rapi, dan material bisa dikontrol.

**Struktur file Blender:**
- Collection `Reference` — scan Polycam (wireframe, hide_select, tidak ikut export)
- Collection `Remodel` — geometry bersih hasil remodel

---

## 2. Ruangan 1: Lounge / Billiard Room ✅ (~95%)

Ruangan 5m × 16.6m, plafon 3.6m. Scan dibersihkan, diluruskan (rotasi 1.02°), lantai di Z=0.

### Struktur
| Objek | Detail |
|---|---|
| Floor | x −1.95..2.45, y −8.25..8.10 + nook (lorong kecil x 1.65..2.45, y 6.75..8.10) penghubung ke smoking area |
| Walls | H 3.6m, tebal 0.1; double-door di dinding kiri (ke office area); dark charcoal |
| Ceiling | Flat dark matte charcoal — trik "dark ceiling" ala basement.studio, sengaja TIDAK model pipa/ducting exposed |
| Lantai | Tile hitam glossy 57cm — texture baked `T_FloorTile` 1024px, roughness 0.18 |

### Furniture & Objek
| Objek | Prefix | Catatan |
|---|---|---|
| Meja billiard (flip → air hockey) | `PT_*` | 1.51×2.50m, felt oranye. Bentuk FINAL. Fitur flip = interaksi web nanti |
| Lampu gantung billiard ×3 | `BilLight_*` | Cage pendant hexagonal bentuk pir (final), bohlam edison emissive, wireframe modifier |
| Sofa 3-seat + 2-seat | `SofaA_*`, `SofaB_*` | Putih, layout L di ujung utara |
| Coffee table | `CT_*` | Kayu, laci + trestle legs |
| Karpet lounge | `Rug_Lounge` | 3.1×2.55m, dua warna (tengah taupe + border gelap 6cm), bevel |
| Front desk | `FD_*` | Rebuild dari 4 foto produk ruparupa; top L-shape SATU mesh tanpa seam; panel greige + wood cap + reveal silver |
| Dresser + cermin | `Dresser_*`, `StandMirror_*` | Cermin arch nyender dinding (tanpa kaki), di atas kabinet |
| Half pillar | `Pillar_Lounge` | 0.40×1.10×3.6m di garis dinding kiri — setengah nembus office area; sejajar kaki billiard |
| Panel meteran listrik | `EP_*` | Dari foto IMG_6138/6139: 3 lampu indikator, 3 meter Hz/A/V (kecil, pepet kanan), kunci nancep, 2 rotary switch identik, 2 konduit |
| Vas palem besar | `Vase_*` | Dari IMG_6141: vas cream spin-profile + 10 pelepah palem prosedural |
| Plant stand pojok | `PS_*` | Dari IMG_6142: frame emas "stroke-only" + top putih, pepet pojok tembok |
| Pot anggrek | `Orchid_*` | Pot hitam + 7 daun + 6 batang, di atas plant stand |

### Pencahayaan
- 3 pendant billiard (`Pendant_1-3`) + 2 pendant front desk — Point, warm
- `Ambient_Fill` & `Lounge_Fill` — **Point** (dulu Area — diganti karena glTF tidak support Area light)

### PR Lounge
- ~~Dinding kaca ke office area~~ ✅ selesai 17 Jul (`GWO_*` — kaca + pintu ayun ganda, lihat §3b)
- ~~Dinding kaca ke smoking area~~ ✅ selesai (GW_*, dari IMG_6160)
- Interaksi flip billiard ↔ air hockey (nanti, fase web)

---

## 3. Ruangan 2: Smoking Area ✅ (~95%)

Interior x −2.05..2.45, y 6.85..11.55, H 3.6m. Di utara lounge, tersambung via nook + pintu kaca. Remodel di collection `Smoking` (prefix `SMK_*`), kerangka di `Remodel` (prefix `SM_*`).

### Kerangka
| Objek | Detail |
|---|---|
| Lantai & plafon | **Digabung dengan lounge** — lihat catatan di bawah |
| SM_Wall_N | Dinding utara, dark charcoal (TV wall). Keputusan: SOLID, tanpa kaca grid seperti scan (ruang di baliknya tidak dimodel) |
| SM_Wall_W / E | Cream hangat (0.72/0.66/0.55). W & E identik: y 6.85..11.65. Slab timur `Walls` lounge dipotong di y=6.85 biar tidak overlap |
| GW_* | Dinding kaca + pintu ke lounge (dibuat sesi sebelumnya dari IMG_6160) |

### Lantai & plafon GABUNGAN (13 Jul)
- `Floor` = **satu rectangle** x −2.05..2.45, y −8.25..11.55 menutup lounge + smoking sekaligus — material `M_Floor` (baked `T_FloorTile`), UV cube project 4m. Tile nyambung mulus lewat pintu kaca, tidak ada seam/bolong
- `Ceiling` = satu plane footprint sama, z=3.6, normal ke bawah, `M_Ceiling` charcoal
- `SM_Floor`, `SM_FloorPatch`, `SM_Ceiling` + materialnya **dihapus** (tidak perlu bake tile smoking terpisah lagi)

### Furniture & Objek
| Objek | Prefix | Catatan |
|---|---|---|
| Sofa cokelat 2-seat | `SMK_SofaBr_*` | 2.6m, sandaran nempel kaca (selatan), menghadap TV. 2 dudukan lebar + 2 bantal sandaran (14 Jul: bantal biru → cokelat sama dengan dudukan; fix z-fighting sisi arm — bidang Base/Back coplanar digeser 5mm) |
| Loveseat cream | `SMK_Love_*` | Dinding barat, menghadap timur. **Di-rebuild 14 Jul** = copy kursi frame besi di-stretch jadi 1.3m (kursi asli & loveseat memang model sama, beda panjang) |
| Kursi frame besi ×2 | `SMK_Chair0/1_*` | **Dari foto IMG_6163–6165** — lihat bagian Kursi di bawah. ✅ SELESAI (kerangka + bantalan) |
| Karpet strip abu | `SMK_Rug` | x −1.45..0.95, y 7.95..9.75. Material `M_SM_Rug_Grey` **✅ SUDAH DI-BAKE** (Wave+ColorRamp → image texture; sudah bukan prosedural) |
| TV + kabinet | `SMK_TV_*`, `SMK_Cab_*` | Dinding utara: TV 1.45m + kabinet putih kaki kayu |
| APAR + platform | `SMK_Ext_*`, `SMK_Platform` | Pojok barat laut. **Rebuild 14 Jul**: tank spin-profile merah + label putih + valve chrome + handle/lever hitam + pin + hose curve + nozzle, parent `SMK_Ext_Root` |
| Wall art | `SMK_WallArt_*` | **Rebuild 14 Jul dari foto IMG_6167**: 15 part parent `SMK_WallArt_Root` — 7 piringan dish (filigree dark besar tengah, 2 lace putih, 2 bronze, 2 teal) + 3 inner plate + 5 mangkok emas dome. Material: Dark/Teal/Gold/Bronze/White/Plate_Grey |
| Pedestal + tanaman | `SMK_Ped_*`, `SMK_Plant_*` | Frame emas + top putih + pot & daun, dekat dinding barat utara |
| Standing ashtray | `SMK_Bin` | **Rebuild 14 Jul**: silinder R0.11 H0.6 dengan jendela buang + ceruk ashtray di top, di samping loveseat |

### Kursi frame besi (dari foto IMG_6163/6164/6165) — ✅ SELESAI (14 Jul)
Kursi aslinya = kerangka besi + bantalan lepas. Semua bagian sudah jadi:
- **`ArmBackLoop`** = SATU curve nyambung (bevel 12mm, fillet arc r=5cm): kaki depan kiri ↑ → arm lurus miring ~4° → cross belakang atas → arm kanan ↘ → kaki depan kanan. Tanpa bola sudut, tanpa bottom rail (kursi asli memang tidak ada)
- **BackLeg** miring (raked), ujung atas nyelup tepat di sumbu arm; **BackRail** horizontal z=0.276 + **BackStrut** miring naik ke garis puncak — kemiringan senada kaki belakang
- **SeatRail** kiri-kanan miring 4° (z 0.318→0.276) — penyangga dudukan; semua tube 24 seg + smooth shading
- **Deck slat** (`M_SMK_Chair_Slat`, abu): border + 6 bilah, mepet rail (sempat melayang 23mm, diturunkan pakai bbox)
- **Bantalan** (`M_SMK_Chair_Cushion`, fabric cream 0.87/0.83/0.74, sheen 0.4, bevel 2.8cm): `CushSeat` 54×57cm miring 3.32° ngikutin slope deck, `CushBack` 57×34cm miring 16.2° nyender di strut
- Posisi: x 0.78, y 8.60 & 9.28, hadap barat, 0.60×0.60m; Chair1 = copy Chair0

**Loveseat cream** (`SMK_Love_*`) di-rebuild 14 Jul: yang lama (blocky) dihapus, diganti copy Chair0 di-stretch vertex-level jadi 1.3m (pojok/fillet tidak melar) + mirror menghadap timur, strut jadi 4. User konfirmasi kursi & loveseat aslinya memang model sama beda panjang.

### Pencahayaan smoking
`SM_Light_0/1` — 2 Point light warm di plafon (z 3.3, y 9.2 & 10.8, energy 50/40 W).

**Ceiling lamp ×4 (24 Jul)** — `FR_CeilLamp_0..3` + `FR_CeilLight_0..3` (di `FR_Lights`): linked duplicate `OP_MR_CeilLamp_1` (scale 0.35), posisi dari annotate user: (−0.93, 10.52) / (1.63, 10.45) / (1.58, 7.89) / (−0.94, 7.96), top snap ceiling 3.6. + 4 POINT 150W warm. ⚠️ Gotcha: origin lamp ≠ center geometry → light 2/3 sempat melenceng ~24cm dari lampunya; fix = snap light ke **pusat geometry bbox** tiap lampu, bukan ke koordinat patokan.

### Teknik deteksi pintu di scan
Histogram strip dinding gagal (scan nutup rapat). Yang berhasil: **peta okupansi lantai** (numpy histogram2d grid 20cm) — bukaan pintu kelihatan sebagai ceruk di footprint lantai. Untuk layout furniture: histogram okupansi di band ketinggian z 0.25–0.85 (level dudukan).

---

## 3b. Ruangan 3: Office Area ✅ (~95%) (DIMULAI 17 Jul — interior, pencahayaan & bake lightmap SELESAI 27 Jul)

Capture ke-3, ruangan besar penghubung. Scan diimport (`OfficeScan`, collection `Scan_Office`). Extent blockout: **X −19.75..−2.05, Y −8.35..5.75, Z 0..3.6** — membentang ke barat dari dinding kiri lounge.

### Struktur collection (`Office_Plan` — dirapikan lagi 23 Jul: 45 loose sink/faucet/SRack → `OP_Pantry`, lampu baru → `OP_Lighting`, mirror → `OP_Decor`. **Rapi total 24 Jul: 0 loose di root scene & `Office_Plan`** — 25 `MR_*` + AirVent ×4 → `OP_MeetingRoom` (71 obj), `OP_WB2_*` → `OP_Whiteboard`, Dyson → `OP_Electronics`, `OP_MR_Ceiling`+`OP_WoodSlat_Wall` → `OP_Structure`, `OP_Vase_Body/Palm` keluar dari `LR_Furniture` → `OP_Decor`)
Semua furniture/aksesori office sudah dipindah dari Scene Collection ke sub-collection tematik:

| Sub-collection | Jml objek | Isi |
|---|---|---|
| `OP_Structure` | 19 | Kerangka: dinding N/S/W, `OP_Floor_West`, pintu utara `OP_DoorN_*` (daun+kusen+2 handle), `OP_WestRm_*` sekat barat, `OP_Pillar_N/Mid`, `OP_Stair_Step1/2/3` |
| `OP_Desks` | 309 | 11 meja detail `ODesk_*` (lihat bawah) + sisa `OP_Desk_B/D` |
| `OP_Electronics` | **128** | 11 iMac `OP_iMac_*` + 11 `OMagic_KB_/Mouse_` (Apple KB/mouse, di-rename bersih) + 5 monitor `OMon_AOC_*` + MacBook `OMacbook_*`. **✅ semua junk import dibuang** (dulu 1424) |
| `OP_Seating` | 70 | 5 bar stool `BS555_*` + kursi kerja `OP_Chair_*` (seat+back+4 leg) + **11 kursi kantor `OChair_Office_*`** (eks-Sketchfab) + gaming chair `OChair_Gaming_*` (3 part) |
| `OP_LunchTable` | 61 | Lunch table `OP_LunchTable_*` + 4 stool kayu `OP_StoolW0..3` |
| `OP_Decor` | 31 | Tanaman lantai `OP_Plant_*` (basket + 8 daun + slat pot) + `OP_GrassRug` + **`OP_WallMirror`** + **frame pilar `OP_Pillar_Frame` + `OP_Pillar_Art`** (23 Jul) |
| `OP_Sockets` | 44 | Socket dinding `OP_Socket_*` (plate + recess + 2 pin + plug head) |
| `OP_Whiteboard` | 22 | Whiteboard beroda `OP_WB_*` (papan 1.97×0.96m + frame + 2 post + kaki + 4 caster + knob + rail) |
| `OP_Shelves` | 41 | Rak berdiri `OP_Shelf_*` + rak dinding `OP_WShelf_*` + **wardrobe/kabinet `OP_Ward_*`** (11 part) + `OP_Shelf2_*` (9) + **3 storage bag `OP_Shelf_Bag1..3`** (23 Jul) |
| `OP_Pantry` | 101 | **Pantry cabinet L-shape** (base unit + tower + wall unit + worktop + handle) + **area wastafel** `OP_Sink_*`/`OP_Faucet_*`/`OP_SRack_*` (45 obj, dipindah dari root 23 Jul) — lihat bawah |
| `OP_Lighting` | 122 | Pencahayaan office: track lighting `OP_TrackL_*`/`OP_TrackLV_*` + **duplikat `OP_TrackL2_*`** + lunch pendant `OP_LunchLight_*` + **ceiling lamp `OP_CeilLamp_A/B` + main light `OP_CeilLight_A/B`** + **hanging lamp set `OP_HangLamp_*`/`OP_HangLight_*`** (23 Jul) — lihat §pencahayaan |

Pilar timur `OP_Pillar_E` batas ke lounge ada di collection `Structure`.

> ✅ **Collection dirapikan lagi (22 Jul):** 131 loose di Scene Collection → **0**. Semua ODesk dup/microwave/shelf2/bar/lunch-light dipindah ke sub-collection tematik. Dibuat `OP_Lighting`. Junk import Brio dispenser (16 node GLTF `Object_*/Mesh*/Group*`) di-**flatten jadi 1 mesh bersih `ODisp_Brio`** (1640 verts, di `OP_Electronics`), 12 empty dibuang. Total scene 1406 → **1391 objek, 254 material**.

**Loose di Scene Collection (belum dipindah, 18 objek — semua geometry manual bersih):**
- **`OBar_Root`/`OBar_Top`+`OBar_Leg0..3`** — bar counter kayu (mat `OBar_Wood`/`OBar_Steel`), top z≈1.36–1.40m, di dinding barat X −16.3..−15.7, Y −5.86..−4.72 (samping dispenser)
- **`ODisp_Brio_Root`** — water dispenser Brio, di dinding barat X≈−15.9 Y≈−6.16, rotasi Z 90° (hadap +X)
- **`OP_Shelf2_*`** (9 part) — rak dinding kedua (top z≈1.5m) di X −4.6..−3.5, Y≈5.2–5.6 (dinding utara)
- **`ODesk_Root_Single_Dup`/`Dup2`/`Dup3`** — 3 meja tambahan (Dup/Dup2 sisi utara Y≈3.3; Dup3 di Y≈−6.1, X −3.75..−2.25)

11 kursi kantor Sketchfab yang dulu loose kini sudah **di-rename `OChair_Office_*` & masuk `OP_Seating`**.

### Desk detail per foto IMG_6179 ✅ (`ODesk_*`, 27 part/unit) — kini 11 meja (2 pod + 1 single)
Meja kantor detail-tinggi sesuai foto (kayu oak top + pedestal laci + kaki loop besi). Unit dasar footprint 1.2×0.6m, tinggi 0.75m. Material: `ODesk_Oak/OakV`, `ODesk_BlackSteel`, `ODesk_BlackPanel`, `ODesk_Chrome`, `ODesk_Brass`, `ODesk_GreyFabric`.

**Susunan (21 Jul):** 11 root — 2 pod cluster benching + 1 meja single.
- **Pod A** (`ODesk_Root_L1/L2/R1/R2/B`) — center x≈−11.28 y≈−5.09
- **Pod C** (`ODesk_Root_C_L1/L2/R1/R2/B`) — center x≈−6.15 y≈−5.05 (offset +5.125 di X)
- **Single** (`ODesk_Root_Single`) — 1 meja lepas

Pola tiap pod: 4 meja vertikal 2×2 (kiri `L1/L2` hadap −X, kanan `R1/R2` hadap +X, back-to-back) + 1 meja horizontal `B` di sisi −Y. Blockout `OP_DeskIsland_A/C` lama sudah dihapus.
| Bagian | Objek | Catatan |
|---|---|---|
| Top oak | `ODesk_Top` | 1.2×0.6m, tebal 3cm, z 0.72..0.75 + 2 grommet kabel (`ODesk_Grommet_Cap/Ring_0/1`) |
| Pedestal laci | `ODesk_Ped_*` | Sisi kiri: body + door + drawer + top slab + 2 edge + 4 foot + lock/key/keyring — kabinet laci berkunci |
| Kaki loop besi | `ODesk_Leg` | Sisi kanan, loop frame plat pipih hitam (480 verts, mat BlackSteel, bevel 6mm) |
| Detail | `ODesk_Panel`, `ODesk_Rail`, `ODesk_Strap_0/1`+Pad, `ODesk_HandleLiner`, `ODesk_Logo` | Panel modesty, rail, strap organizer kabel, liner handle, logo |
| Privacy screen | (fabric grey gantung) | Panel `GreyFabric` tergantung 2 strap di tepi belakang top |

### Elektronik meja ✅ (`OP_Electronics`, 128 objek — sudah bersih)
- **11 iMac** (`OP_iMac_Base/Stand/Display/Screen/Logo/PortC_*/PortPower`) — di atas desk pod, layar menghadap sesuai orientasi meja
- **Magic Keyboard & Magic Mouse** ×11 (`OMagic_KB_*` / `OMagic_Mouse_*`) — asset Apple FBX/OBJ yang sudah di-flatten & di-rename bersih
- **Monitor AOC** ×5 (`OMon_AOC_*`) + **MacBook** (`OMacbook_*`) di area meja

✅ **Cleanup selesai 21 Jul:** semua node sampah import (`Object_*` 959, `Node_*` 132, `pCube*` 70, `pPlane*` 60, `RootNode*`, `Geom*`, `group*`, `temp_export*`) sudah dibuang/di-join. `OP_Electronics` ciut 1424 → 123, total scene 2551 → 1189. GLB tidak lagi bawa ratusan node sampah.

### Furniture lain office ✅
- **Lunch table** (`OP_LunchTable_*`) + 4 **stool kayu** (`OP_StoolW0..3`) di sisi terbuka +X; top z≈1.03m bar height
- **Bar stool** `BS555_*` (gas-lift: base+collar+piston+stem+seat+footrest curve+hoop clamp+lever+tip) — 5 kursi berjajar X=−13.95, hadap −X ke lunch table
- **Kursi kerja** — `OP_Chair_*` manual (seat + back + 4 leg, 1 unit) + **11 kursi kantor `OChair_Office_*`** (eks-Sketchfab, sudah di-rename & masuk `OP_Seating`) satu per meja di kedua pod + gaming chair `OChair_Gaming_*`
- **Bar counter** `OBar_*` (top kayu `OBar_Wood` z≈1.4m + 4 kaki besi `OBar_Steel`) di dinding barat, samping water dispenser
- **Water dispenser Brio** `ODisp_Brio_Root` — nempel dinding barat (X≈−15.9, Y≈−6.16), hadap +X ke arah lunch table
- **Tanaman lantai** `OP_Plant_*` (basket + 8 daun + slat) + `OP_GrassRug` (1.36×1.14m) di x≈−7.5
- **Rak** `OP_Shelf_*` (berdiri: top/bottom/side/H1-3/V1-2) + `OP_WShelf_A/B/C` + **`OP_Shelf2_*`** (rak dinding utara, top z≈1.5m)
- **Socket dinding** `OP_Socket_*` — 10 buah (plate + recess + 2 pin + plug head)

### Dinding kaca ✅
- **`GWO_*`** (di `Structure`, 8 part) — bukaan kaca + **pintu ayun ganda** lounge↔office di x≈−2.0, y −3.09..−0.71, H 2.45m: `GWO_DoorA/B_Glass`+`_Smoke` + `GWO_Handle_A/B`+`_In`
- **`GWL_*`** (di `Structure`, 13 part — BARU) — partisi kaca **frosted** 3 seksi `N1`/`N2`/`S`, tiap seksi `_Glass`+`_Frost`+2 `_Jamb`, plus `GWL_Header`

### Pantry cabinet L-shape ✅ (`OP_Pantry`, 56 part — 22 Jul)
Dapur/pantry kabinet berbentuk L di pojok barat laut office, bbox **X −17.81..−15.56, Y −3.54..−2.95, Z 0.30..2.72** (nempel dinding barat + utara). Terdiri dari 4 modul:
| Modul | Objek | Catatan |
|---|---|---|
| Base unit | `OP_Pantry_Base_*` | Carcass + 2 pintu (`DoorA/B` + inset) + plinth + `Worktop` — kabinet bawah dengan meja kerja |
| Tower unit | `OP_Pantry_Tower_*` | Kolom tinggi: back/bottom/top + 2 side (E/W) + 2 pintu (DoorLow/DoorUp + inset) + 2 shelf |
| Wall unit | `OP_Pantry_Wall_*` | Kabinet gantung: carcass + bottom + 2 shelf |
| Pintu kaca dinding | `OP_Pantry_WallDoor0..3_*` | 4 pintu (frame L/R/T/B + panel) — glass front (mat `OP_Pantry_Glass`) |
| Handle | `OP_Pantry_CupPull_0..2`, `Knob_A/B`, `TKnob_Low/Up`, `WKnob_0..3` | Cup pull laci + knob pintu + tower knob + wall knob |

### Printer, shredder, wardrobe, microwave ✅ (22 Jul)
- **Printer** `OP_Printer` (di `OP_Electronics`) — X≈−9.49, Y≈−6.77, di atas permukaan z≈0.75m. 6 material: `Glass/Plastic/Lid/Socket/PlasticTop/Metal`
- **Shredder** `OP_Shredder` (di `OP_Electronics`) — X≈−9.50, Y≈−7.79, di lantai. 8 material: `Body/Paper/Glass/Panel/Misc/Trim/Chrome/Bin`
- **Wardrobe/kabinet rendah** `OP_Ward_*` (11 part, di `OP_Shelves`) — bbox X −9.78..−9.29, Y −7.64..−6.56, Z 0..0.75. Carcass (back/bottom/top + 2 side N/S) + 2 pintu (F/B) + plinth + shelf + 2 rail (top/bot)
- **Microwave** `OP_Microwave` (di `OP_Electronics`) — X −16.44..−15.96, Y −8.17..−7.74, z 1.19..1.49m. Mat `Oven`
- **Bar table** `OP_BarTable_*` (7 part, di `OP_LunchTable`) — X −16.52..−15.89, Y −8.18..−7.73, z 0.30..1.19m: top + 4 kaki (A–D) + 2 brace (E/W)
- **Water dispenser Brio** `ODisp_Brio` — di-flatten 22 Jul dari 16 node import GLTF jadi 1 mesh bersih (1640 verts). Bbox X −16.29..−15.89, Y −6.20..−5.88, z 0.30..1.37m. Mat `BLACK_PLASTIC/GREY_PLASTIC/M_2022_09_17_1_1`

### Pencahayaan Office ✅ (22 Jul — pertama kali ada lampu di area office)
Collection `OP_Lighting` (80 objek). Semua **SPOT/POINT** (glTF-safe, bukan Area).
| Fixture | Objek | Detail |
|---|---|---|
| Track lighting utama | `OP_TrackL_*` (36 part) | Rail + 4 spot (rose/frame/lens/cable/mount) di atas desk pod A, bbox X −12.12..−6.13, z 2.34..3.60. **4 SPOT** `OP_TrackL_Light_N0/S1` (E=40W) |
| Track lighting cabang | `OP_TrackLV_*` (26 part) | Rail vertikal di desk pod area timur, X −6.70..−5.60. **4 SPOT** `OP_TrackLV_Light_E0/E1/W0/W1` (E=40W) |
| Lunch pendant ×3 | `OP_LunchLight_*` (18 part) | Cage pendant di atas lunch table (X≈−14.4, Y −7.21..−5.56, z 2.23..3.60): ceil-rose+socket+cable+bulb+cage + **3 POINT** `OP_LunchLight_Point_0/1/2` (E=40W) |
| Track duplikat (23 Jul) | `OP_TrackL2_*` (18 part) | Copy unit dasar TrackL, dipasang di X≈−3.01 Y≈−5.24 (atas meja single Dup3). Mesh linked-duplicate, **light data independen** (2 SPOT) |
| **Ceiling lamp ×2 — MAIN LIGHT** (23 Jul) | `OP_CeilLamp_A/B` + `OP_CeilLight_A/B` | Fixture flat bulat Ø60cm (dari `ceiling_light.glb`, flush ceiling z 3.51–3.6) di (−10.58,−1.04) & (−4.42,−1.06) + **2 POINT 400W kuning hangat (1.0, 0.72, 0.4) ≈2700K** — satu²nya lampu yang cast shadow |
| Hanging lamp set (23 Jul) | `OP_HangLamp_Circle/Square/Line` + `OP_HangLight_*` | Set 3 lampu gantung (dari `ceiling_lamps.glb`, flatten+join, scale 0.7) di ceiling dekat titik (−4.1, 4.3), fixture z≈2.96–3.0, layout horizontal sejajar `Walls_Left`. Faces bawah dikasih mat emissive `OP_HangLamp_Glow` (strength 5) + 2 POINT 200W + 1 AREA 80W (⚠️ Area di-drop saat export glTF) |

Material: `OP_TrackLight_Walnut` (bodi track), `OP_TrackL_BulbEmit` (emissive bohlam), `OP_HangLamp_Glow` (emissive warm diffuser).

> ⚠️ **Perf (23 Jul):** 31 lampu total sempat bikin *"Shadow buffer full (2243/2048)"* + viewport berat. Solusi: **shadow OFF di 29 lampu** (cuma `OP_CeilLight_A/B` yang cast shadow) + `shadow_pool_size` 512 → **1024MB**. Buat bake render final, hidupin lagi shadow per-lampu seperlunya.

### Dekorasi office ✅ (23 Jul)
- **Storage bag ×3** `OP_Shelf_Bag1..3` (di `OP_Shelves`) — box open-top ala DRÖNA 30×30×27cm, taper bawah + bevel, di cell rak cubby (kiri-baris3 / tengah-baris2 / kanan-baris1, sesuai annotate). Masih tanpa material kain
- **Rak cubby di-join + oak (24 Jul)** — `OP_Shelf_*` 9 part → **`OP_Shelf_Cubby_A`** (dekat pintu utara) dan `OP_Shelf2_*` 9 part → **`OP_Shelf_Cubby_B`** (dekat function room), masing² 1 mesh 102 polys. Mat `OP_Shelf_Wood` diganti **`ODesk_Oak`** (prosedural wave, Object coords — nggak butuh UV, tapi wajib bake sebelum export, ikut daftar bake desk). Bag1..3 sengaja tetap terpisah
- **Pintu utara oak (24 Jul)** — `OP_DoorN_Leaf` mat `M_OP_DoorWood` → `ODesk_Oak`. ⚠️ Object coords: skala motif ikut dimensi objek, di pintu seratnya lebih besar/blobby dari desk — kalau ganggu, bikin varian oak dengan mapping scale khusus pintu
- **Wall mirror** `OP_WallMirror` (di `OP_Decor`) — dari Sketchfab (5 part di-join), scale 0.6 → 60×75cm, di `OP_Wall_Perimeter_NW` y=1.598 (gap 2mm), center (−7.475, z 2.05). ⚠️ Frame masih tekstur Minecraft `spruce_log.png` pixelated — ganti kayu polos kalau mengganggu
- **Picture frame pilar** `OP_Pillar_Frame` + `OP_Pillar_Art` (di `OP_Decor`) — frame "Emapale Enmarcate" (Sketchfab, chayaruart, CC-BY) portrait 46.6×66cm di muka `OP_Pillar_Mid` (y=−5.908, center x≈−9.6, z 1.35..1.93; hook ngambang dihapus). Art = plane UV fill-crop dengan image **`Downloads/Mona Lisa Parodies….jpeg`** (640×959) — ⚠️ **image belum di-pack ke .blend**
- **Geser dinding GWM** — 9 objek `GWM_*` (jamb/header/wall-above/door/glass/frost/handle) digeser total **15cm ke −X**

### PR Office (berikutnya)
- ~~Rapikan asset import mentah~~ ✅ SELESAI 21 Jul (2551 → 1189 objek)
- ~~Pindahkan objek loose ke sub-collection `Office_Plan`~~ ✅ SELESAI 22 Jul (131 → 0 loose; Brio dispenser di-flatten jadi 1 mesh)
- ~~Pencahayaan office (Point/Spot warm)~~ ✅ SELESAI 22 Jul (track lighting 8 SPOT + lunch pendant 3 POINT, collection `OP_Lighting`)
- Detail dinding + bukaan (jendela) verifikasi vs foto `Photo-reference-office/` (termasuk IMG_6176_2, IMG_6220–6227, IMG_6240–6242, IMG_6247–6252)
- Aksesori meja tambahan; verifikasi penempatan 11 kursi vs orientasi meja
- Isi pantry (barang di rak/worktop)
- ~~LED strip lantai~~ ✅ 24 Jul → **`OP_LEDStrip_Floor`** (di `OP_Lighting`, 96 polys): 1 mesh, strip 4cm×8mm ngambang 2mm di atas lantai. 33 stroke annotate user di-**straighten** (snap ke sumbu, collinear digabung) jadi 16 segmen: spine H di Y −1.85 + cabang V + stub meeting room; jalur barat Y −4.04 naik bertahap ikut Z tangga (0→0.1→0.2→0.3). Mat `M_LEDStrip` emission warm (1.0, 0.75, 0.45) **strength 8** (dipertahankan buat bake). **Keputusan: look final (warna warm vs cool-cyan + bloom) di-tweak di Three.js, bukan Blender** — pendar ke lantai otomatis dari bake lightmap, glow dari UnrealBloomPass
- Bake material furniture office bila ada yang prosedural (cek sebelum export)
- **Pack image `OP_Pillar_Art` (Mona Lisa) ke .blend** sebelum export
- Material kain untuk storage bag `OP_Shelf_Bag1..3`; ganti frame mirror dari tekstur Minecraft
- Kasih emission/isi ke frame `OP_TrackL2` bila perlu; cek annotate lama (bisa dihapus dari layer Note)

---

## 3c. Ruangan 4: Meeting Room 🚧 (DIMULAI 23 Jul)

Ruangan di balik bukaan barat laut blok utama office. Scan `MeetingScan` diimport ke collection `Reference` (bbox X −21.7..−13.7, Y −2.8..1.7). Objek prefix `MR_*`, sementara di collection `Office_Plan`; lantai `OP_MR_Floor` z=0; dinding TV = sisi barat x≈−21.55.

### Furniture & Objek (semua user-approved)
| Objek | Prefix | Catatan |
|---|---|---|
| Meja konferensi | `MR_Table_Top` + `MR_Table_Leg*` | Top 3.5×1.3m (z 0.69..0.75) kayu hitam gelap `MR_TableWood`. **Kaki = frame "stroke-only" bolong tengah** (ala plant stand PS_*): 4 panel V kanan-kiri (`LegV_L0/L1/R0/R1`, apex ngarah ke dalam, dari annotate) + 1 panel tengah (`LegC`), boolean frame border 7cm tebal 5cm, `MR_TableLeg` hitam pekat |
| Cekungan cable tray ×2 | (bagian `MR_Table_Top`) | 2 recess 62×21cm **dalam 5cm** di permukaan meja (dasar z 0.70, sisa daging 1cm), interior mat `MR_TableTray` hitam matte. Posisi dari annotate, dirapikan simetris terhadap center X=−17.96 |
| TV 98" frameless | `MR_TV_Body/Screen/Mount` | Layar **2.170×1.227m (diagonal 98" 16:9)**, bezel 3mm, panel depth 3cm, center z=1.5 y=−0.4 nempel dinding barat |
| Cabinet TV | `MR_TVCab_*` (18 part) | Dari foto **IMG_6254**: 1.93m × H0.52 × D0.45. Kiri→kanan: pintu sliding 5 slat horizontal + backing hitam (`DoorBack`, biar celah kebaca) \| rak terbuka + divider \| 2 laci + handle notch hitam. Plinth recessed. Mat `MR_CabWood` sonoma oak / `MR_CabInner` / `MR_CabDark` |
| Rally Camera (replika) | `MR_RallyCam_*` (12 part) | **Remodel manual dari 6 screenshot Sketchfab skfb.ly/ptFor** (model tidak bisa didownload — remodel manual, legal-safe & low-poly): base puck Ø11.4×5.2cm + 2 seam + top disc gloss, arm kapsul, head silinder Ø8.6×10.5cm, lensa barrel + glass + 3 ring concentric silver. Di atas cabinet, hadap meja. Mat `MR_Cam_*`. Belum: logo logi, tombol belakang (fase texture, mungkin skip) |
| Apple TV 4th gen | `MR_AppleTV` | Import `apple-tv-4th-generation.zip` → flatten 17 mesh jadi 1, scale ke 98mm real. **Fix**: slot material 0 kosong (putih) → `MR_AppleTV_Silver` aluminum; **remote bawaan model dihapus** (bmesh, sudah ada remote terpisah). Posisi: di atas cabinet TV (dari annotate) |
| Siri Remote | `MR_AppleRemote` | Import `apple_tv_remote.glb` → flatten 12 mesh, scale panjang 12.4cm, flat di meja. **Fix origin & rotasi baked**: origin di-set center of volume, sumbu panjang dideteksi PCA lalu diluruskan |
| Magic Keyboard | `MR_MagicKB` | Linked duplicate dari `OMagic_KB_0` office |
| Magic Trackpad | `MR_TrackPad` | Import `apple-magic-track-pad.zip`, ukuran sudah benar 16×11.5cm |
| AC standing | `MR_AC_*` | Body + grill + vent (sudah ada dari sesi scan) |
| Tanaman pojok | `MR_Plant_*` | Basket + 8 daun + slat pot + 3 kaki (sudah ada) |
| Air vent dinding ×4 | `AirVent_01..04` | Import `air_vent.glb` (Sketchfab) → flatten empty chain, mesh share 1 data `AirVent` + mat `M_AirVent` (linked duplicates). 35×35cm, berjejer rapat di dinding `OP_Wall_Perimeter_NW` muka y=1.6 (hadap −Y ke ruangan, verifikasi raycast), X −17.24/−16.87/−16.52/−16.16, center z=2.33. Posisi dari annotate. ⚠️ prefix belum `MR_` |
| Kursi meeting ×9 (24 Jul) | `MR_Chair_01..09` | Import `office_chair.glb` (Sketchfab) → flatten 20 mesh jadi 1 (`MR_Chair`, 4.5k verts, transform applied, min-Z=0, rotation_mode XYZ) + 8 linked duplicates. Layout **lurus sejajar meja tanpa jitter** (revisi user): 4 utara y=0.55 rot 0°, 4 selatan y=−1.35 rot 180° (X −19.30/−18.43/−17.57/−16.70, spacing 0.87m), 1 kursi kepala timur (−15.90, −0.40) rot −90° hadap TV |
| Rally Mic Pod ×4 (24 Jul) | `MR_MicPod_*` (5 part/unit) | **Replika prosedural** (spin profile, specs asli Ø10.2×2.1cm): body graphite edge membulat + top disc domed matte + tombol mute + LED ring emissive hijau + kabel bezier curve tipis di permukaan meja. Parent per unit `MR_MicPod_Root(.001–003)`, duplikat = linked mesh, rotasi beda-beda biar kabel natural. Posisi meja: X −18.55 (asli) / −18.79 / −17.97 / −17.13 (dari annotate), semua Y≈−0.44, z=0.75. ⚠️ kabel = CURVE, convert sebelum export. NB: pod asli & dup pertama mepet (24cm) — kandidat digeser/hapus 1 |
| Snake plant (24 Jul) | `MR_Plant_Snake` | Import `snake-plant-2-low-poly` (GLB single mesh, tanpa empty chain — tidak perlu flatten). Scale ke H 0.9m (applied), pojok barat laut (−21.30, 1.25) dari annotate, rot 34°. Mat `M_Foglie`/`M_Vasi` texture embedded |
| Pintu kaca DIBUKA (24 Jul) | `GWM_Door_Glass/Smoke` + 2 handle | Daun pintu dirotasi **−90° ke arah −X** (ngayun masuk meeting room) via pivot matrix di garis engsel y=1.62 (sisi jauh dari handle). 4 part diputar bareng lewat `matrix_world`. Posisi vs tembok dibenerin user (24 Jul) |
| **Ceiling dropped (24 Jul)** | `OP_MR_Ceiling` | Plane 1 face, footprint `OP_MR_Floor` (X −21.70..−14.45, Y −2.60..1.77), **z=2.94 rata puncak `OP_WoodSlat_Wall`** (lebih rendah dari ceiling utama 3.6 → kesan dropped ceiling). Normal ke bawah, mat `M_Ceiling`. Di `OP_Structure` |
| Ceiling lamp ×6 + light (24 Jul) | `OP_MR_CeilLamp_0..5` + `OP_MR_CeilLight_0..5` | Linked duplicate `OP_CeilLamp_A` **scale 0.35** (downlight kecil), grid 3×2 dari annotate user: X −20/−18/−16, Y 0.9 & −1.7, top snap ke ceiling 2.94. + 6 POINT 150W warm (1.0, 0.72, 0.4) shadow-soft 0.12 di z 2.78. Di `OP_Lighting` |
| Motif frost (24 Jul) | `GWM_Frost_A` + `GWM_Door_Smoke` | Materialnya udah `M_GlassFrost` (mosaic `T_GlassMosaic`) tapi **nggak punya UV → tampak polos**. Fix: UV dibuat manual = koordinat world (sumbu memanjang × Z), skema sama `GWL_*` → motif nyambung se-gedung |

**Layout devices di meja** (dari annotate, cluster dekat ujung TV): keyboard \| trackpad \| remote sejajar di X≈−16.9, Y −0.72..−0.17, semua flat z=0.75. Apple TV di atas cabinet (−21.28, −1.21).

### PR Meeting Room
- ~~Kursi meeting~~ ✅ 24 Jul (9 kursi `MR_Chair_*`)
- ~~Ceiling + lampu~~ ✅ 24 Jul (`OP_MR_Ceiling` z2.94 + 6 downlight)
- ~~Grup `MR_*` ke sub-collection sendiri~~ ✅ 24 Jul (semua `MR_*` + AirVent ×4 → `OP_MeetingRoom`, 71 obj)
- ~~Plafon tembus dinding timur~~ ✅ 27 Jul (lihat §3d)
- Dinding/kerangka ruangan (masih pakai scan sebagai acuan — cek apakah perlu dinding remodel sendiri)
- Deco tambahan + verifikasi vs scan/foto
- Rename `AirVent_01..04` → `MR_AirVent_*` biar konsisten prefix
- Convert kabel mic pod (CURVE) sebelum export; pertimbangkan geser/hapus 1 pod yang mepet

---

## 3d. Bug Model Lama yang Ketahuan saat Review MVP1 (27 Jul)

Bug-bug ini **sudah ada di file Blender sejak sesi 22-24 Jul**, bukan akibat proses export. Baru ketahuan saat scene dilihat dari sudut-sudut baru di viewer web.

| Bug | Detail | Fix |
|---|---|---|
| **Plafon MR tembus dinding** | `OP_MR_Ceiling` melebar sampai X=−14.45, dinding kaca `GWM_WallAbove` ada di X=−14.65 → menonjol **20 cm**. Tiga sisi lain (barat −21.70, utara 1.77, selatan −2.60) sudah pas. | Vertex sisi timur digeser ke −14.65 |
| **Lensa track light yatim** | `OP_TrackL_Lens_N0.001` mengambang tanpa Spot/Mount (jarak ke housing 0,41 m; normalnya 0,03 m) — sisa duplikasi lama | Dihapus |
| **5 spot tanpa lensa** | `OP_TrackL_Spot_N0.001/.002/.003`, `S1.002/.003` punya selongsong tapi lampunya tidak ada | Dibuatkan lensa (copy linked mesh dari pasangan yang benar) |
| **2 lensa meleset 39 mm** | `S1.002`/`S1.003` — **kesalahan saat membuat lensa pengganti**: offset disalin dari spot `N0`, padahal `S1` menghadap arah berlawanan (rot Z 180°). Offset benar untuk S1 = `(0, −0.0186, −0.0695)` | Offset dihitung ulang dari pasangan `S1` yang benar |

**Cara verifikasi pasangan lensa-spot yang ANDAL:** ukur **lateral offset terhadap sumbu selongsong**, bukan jarak titik-tengah (jarak titik-tengah menyesatkan — bisa terlihat "pas" padahal melenceng ke samping). Sumbu spot dicari lewat SVD dari vertex-nya:
```python
u, s, vt = np.linalg.svd(verts_spot - center); ax = vt[0]/norm(vt[0])
d = center_lens - center_spot
lateral = norm(d - (d@ax)*ax)      # harus < 5 mm
```
Hasil akhir: **14/14 lensa lateral offset = 0.0000**.

**Pelajaran proses:** saat review, kumpulkan temuan jadi daftar dulu baru perbaiki sekaligus — lebih baik daripada tambal satu-per-satu, karena pola yang sama sering muncul di beberapa objek.

---

## 4. Export Pipeline Blender → Three.js ✅ TERBUKTI

Tes end-to-end 13 Jul: `export-test/lounge.glb` — **1.28 MB, 192 mesh, ~30k tris, load ~130ms**. Enteng banget buat web.
**Update 27 Jul:** seluruh scene (4 ruangan) sudah di-export ke MVP1 — lihat §4e (varian GLB + viewer) dan §4d (audit pre-export).

### Checklist di Blender SEBELUM export
1. **Bake material prosedural** ke image texture packed — glTF tidak bawa node Brick/Noise/ColorRamp (gejala: lantai jadi putih polos)
2. **Recalc normals outside** untuk mesh hasil spin/bmesh (gejala: vas jadi hitam)
3. **Lampu harus Point/Spot/Sun** — Area light di-drop diam-diam
4. **Un-hide Walls/Ceiling** (sering ke-hide pas kerja; `use_visible=True` skip yang hidden)
5. Modifier **tidak perlu** apply manual — `export_apply=True` yang handle (file kerja tetap non-destructive)

### Perintah export
```python
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_visible=True,
    export_apply=True, export_lights=True, export_cameras=False, export_yup=True)
```

### Settingan viewer Three.js (`export-test/index.html`, three@0.166)
| Setting | Nilai | Alasan |
|---|---|---|
| toneMapping | ACESFilmic, exposure **0.55** | 1.0 = kebakar putih |
| Environment | RoomEnvironment via PMREM, intensity **0.25** | Tanpa ini glossy/metal = hitam mati |
| Ambient | 0xfff2e6 × 0.15 | Pengganti bounce light |
| Light clamp | intensity ≤ **6**, decay 2 | glTF point light over-bright |
| Shadow | mapSize 2048, bias **−0.0004**, normalBias 0.02, radius 4 | bias −0.002 bikin bayangan "copot" |
| Housing lampu | castShadow = **false** (mesh radius 0.45m dari lampu) | Cage bikin motif jaring di dinding |
| Bloom | UnrealBloomPass 0.35 / 0.5 / threshold **1.0** | threshold 0.85 bikin lantai & felt ikut glow |
| Emission mesh | emissiveIntensity ≥ 2.5 | Biar keangkat bloom |

**Konversi sumbu** (glTF Y-up): `three(x, y, z) = blender(x, z, −y)`

**Menjalankan viewer:**
```bash
cd export-test && python3 -m http.server 8137
# buka http://localhost:8137
```

### Catatan kaca (EEVEE vs Three.js)
- Kaca pakai **alpha blend** (alpha 0.08), BUKAN transmission — keputusan pipeline (transmission berat/artefak di three.js)
- Kalau kaca kelihatan **noise/bintik pasir di viewport Blender**: itu `surface_render_method='DITHERED'` (default EEVEE Blender 5.x) — set ke `'BLENDED'`. Murni urusan display Blender, tidak ngaruh ke export

### Belum dites
- Performa 3 ruangan + shadow banyak lampu — kalau drop: shadow hanya lampu utama / bake ke texture ✅ **teruji di MVP1** (shadow di-cap 4 lampu, sisanya castShadow=false — lihat §4e)
- ~~Draco compression~~ ✅ dicoba di MVP1, tapi **WebP menang** (6.6 MB vs Draco 21 MB) — lihat §4e

---

## 4e. MVP1 Export — Seluruh Scene ✅ SELESAI (27 Jul) — **50-60 FPS**

Export penuh 5 ruangan. Perjalanan ukuran & performa dari raw sampai final:

| Tahap | Ukuran | Draw call | FPS | Metode |
|---|---|---|---|---|
| Raw | 35 MB | 2.522 | — | tanpa kompresi |
| + Draco | 21 MB | 2.522 | 1-2 | kompresi geometry |
| + WebP | 6.6 MB | 2.522 | 1-2 | texture PNG → WebP |
| + Merge | 5.2 MB | **403** | 14-16 | join per (zona × material) |
| **+ Baked lightmap** | **8.0 MB** | **401** | **50-60** ✅ | 39 lampu realtime → 0 |

**File final: `export-test/office-mvp1-baked.glb`** (di-serve sebagai `index.html`).

### Pelajaran urutan diagnosa (PENTING — jangan langsung tuduh poly)
1. **Ukur draw call dulu** (`renderer.info.render.calls`). Patokan web: <300. Scene ini awalnya **2.522** — itu biang keroknya, bukan 760k tris (segitu ringan untuk desktop).
2. Kalau draw call sudah sehat tapi masih berat → **hitung lampu realtime**. Three.js forward rendering: cost fragment shader ~linear terhadap jumlah lampu. Terbukti: 0 lampu lancar, 15 lampu → 14-16 fps.
3. Baru terakhir curigai poly/texture.

### Ukuran GLB — urutan dampak
PNG→WebP paling besar (texture 17 → 2.6 MB), Draco untuk geometry (35 → 21 MB), lalu merge. ⚠️ File `.blend` (78 MB) **TIDAK sama** dengan ukuran GLB (8 MB) — .blend menyimpan scan referensi + backup `_ORIG` yang tidak ikut export.

### Viewer `export-test/index.html` (three@0.166)
- **5 tombol view** teleport kamera: Office / Lounge / Meeting / Pantry / Function (helper `bl(x,y,z)` = konversi Blender→three Y-up)
- **`DRACOLoader` WAJIB di-set** — tanpa ini GLB ber-Draco gagal load total
- **Shadow map OFF total** (`renderer.shadowMap.enabled = false`) — bayangan sudah di lightmap
- Slider live: Lightmap (0-3×), Exposure, Ambient, Pendar lampu (0-4×)
- HUD diagnostik: fps · draw call · tris · jumlah lightmap · jumlah AO asli yang dijaga
- ⚠️ **JANGAN clamp `emissiveIntensity`.** Viewer lama punya `Math.max(m.emissiveIntensity, 2.0)` — GLB sekarang sudah bawa `KHR_materials_emissive_strength` (bohlam 12, LED strip 8), jadi clamp itu justru MENURUNKAN nilainya jadi 2.0 → lampu terlihat redup/mati. Set juga `m.toneMapped = false` supaya pendar tidak diredam ACES saat exposure rendah.

**Serve:** `cd export-test && python3 -m http.server 8137` → buka `http://localhost:8137`

Varian lain di folder: `office-mvp1.glb` (raw), `-draco.glb`, `-merged.glb` (realtime light), `lounge-v1.html` + `lounge.glb` (viewer lama 13 Jul).

---

## 4f. Merge Objek untuk Draw Call ✅ (27 Jul) — 2.522 → **401**

Draw call = jumlah perintah CPU→GPU per frame. 1.462 objek terpisah = CPU tercekik, GPU menganggur. Solusi: gabung objek di Blender, **non-destruktif** lewat collection `Export_Merged` (objek di-copy; collection kerja tidak disentuh, di-exclude saat modeling).

### Aturan merge (jangan asal join semua)
1. **JANGAN join mesh multi-user** — instancing menghemat 427k tris di VRAM. Kalau semua di-join VRAM naik **+128%**. Join hanya objek unik + instanced KECIL (<200 tris, instancing tak sepadan untuk mesh mini). Hasil: 1.366 join + 95 instanced dipertahankan.
2. **Group per (ZONA × material), bukan global** — kalau seluruh gedung jadi 1 objek, frustum culling mati dan GPU render ruangan yang tak terlihat. Zona ditentukan dari koordinat bbox dunia (Office/Lounge/Function/MeetingWest/WestRoom/PantryWing), bukan collection (banyak collection isinya campur).
3. **Nama grup harus UNIK** — dua grup dengan material-set beda tapi material pertama sama akan bentrok & saling menimpa (kasus `MG_WestRoom_BLACK_PLASTIC`, 1 objek sempat hilang).

### 4 BUG MERGE yang wajib diantisipasi (semua kena di sesi ini)
1. **Parent hilang** → 69 objek merged masih menempel ke parent (`FD_Root`, `EP_Root`, `BS555_BarStool`) yang tidak ikut export → knob emas berserakan di lantai, panel meja terlepas. **Fix:** lepas parent + bekukan transform dunia ke geometri (`j.parent=None; j.matrix_world=mw; j.data.transform(j.matrix_world); j.matrix_world=Identity`). Untuk instanced yang tak boleh diubah: ikutkan 9 empty parent-nya ke collection export.
2. **Modifier hilang** — `bpy.ops.object.join()` MEMBUANG modifier objek yang digabung. 229 objek terdampak (8 Wireframe, 216 Bevel, 5 Subsurf) → lampu cage jadi gumpalan padat, semua tepi berbevel jadi tajam. **Fix:** ambil mesh hasil evaluasi sebelum join — `ev = o.evaluated_get(depsgraph); c.data = bpy.data.meshes.new_from_object(ev)`.
3. **UVMap asli tertimpa** — saat menyiapkan UV lightmap jangan `while me.uv_layers: remove(...)`. UVMap lantai punya rentang `u[-3.19,1.06]` (texture ter-tile berkali-kali); kalau ditimpa jadi 0-1, ubin diregangkan 1× sepanjang ruangan. **Fix:** pertahankan UVMap, TAMBAHKAN UVLightmap sebagai layer kedua; objek tanpa UV dibuatkan UVMap kosong di index 0 saat merge.
4. **Kontaminasi MG_** — objek hasil merge ikut terbaca sebagai objek sumber (karena `Export_Merged` sempat di-include untuk pengecekan) → hasil merge ter-merge lagi, lensa track light jadi 11 bukan 10. **Fix:** guard eksplisit sebelum bangun rencana:
   ```python
   assert not any(o.name.startswith('MG_') for o in src), "KONTAMINASI MG_!"
   ```

### Atlas material — Magic Keyboard
12 keyboard × 79 material = **948 draw call (71% dari total)**. Sama akarnya dengan temuan texture: 1 keycap = 1 material. **Fix:** susun 79 texture jadi atlas 1152² (grid 9×9 × tile 128), remap UV per-face berdasarkan `material_index` (`uv_baru = (gx + u)/grid`), lalu 1 material. Huruf keycap tetap presisi. Cari kasus serupa lewat rasio **material per objek**.

---

## 4g. Bake Lightmap ✅ (27 Jul) — 39 lampu realtime → **0**

Mengikuti pendekatan basement.studio (§4b): semua cahaya + bayangan dipanggang jadi texture, runtime nyaris tanpa lampu. Hasilnya BUKAN cuma lebih cepat — kualitas juga lebih baik (global illumination, bayangan lembut alami, occlusion sudut).

### Bake PER OBJEK, bukan atlas bersama
Dua percobaan gagal sebelum ketemu cara yang benar:
- **Per zona → GAGAL.** Node `BAKE_TARGET` disimpan di MATERIAL, jadi 1 material tak bisa punya 2 lightmap. Di scene ini **44 material dipakai lintas zona** (`M_SM_Wall_Cream` di 5 zona) → bake antar-zona saling menimpa; zona yang di-setup belakangan menang. Gejala: lightmap zona awal terisi 7-15%, zona lain 66-80%.
- **Atlas global 291 objek → GAGAL.** UV coverage cuma **0,55%** — `pack_islands` di Edit Mode multi-objek membiarkan UV antar-objek saling menumpuk.
- **Per objek → BERHASIL.** Coverage **64,7%**, seluruh masalah packing lenyap.

### Resep yang terbukti
- Bake hanya objek **luas ≥ 8 m²** → 37-41 objek, sudah mencakup **90% luas permukaan**. Objek kecil cukup ambient+envmap.
- Resolusi proporsional: `res = 2**round(log2(sqrt(luas) * 40))`, clamp 256–1024 → ~50 px/m untuk lantai besar. (Patokan arsitektur cukup 8-16 px/m.)
- Cycles GPU: `prefs.compute_device_type='METAL'` + `cycles.device='GPU'` — **default-nya CPU, cek dulu, ini beda 6×**.
- **Matikan caustics + pangkas bounces**: `caustics_reflective/refractive=False`, `max_bounces=4, diffuse=3, glossy=1`. Ini memangkas **89 detik → 10,7 detik** per bake (8×). Total 37 objek = **~1 menit**.
- Tiap `bpy.ops.object.bake` membangun ulang BVH SELURUH scene — objek 38 tris pun bayar ongkos penuh. Karena itu setelan di atas krusial.
- ⚠️ Bake >120 detik akan lepas dari MCP jadi background task — hasilnya TETAP jadi di Blender, cek `bpy.data.images` alih-alih menganggapnya gagal.

### ⚠️ SHADOW LAMPU HARUS ON saat bake
Sisa perf-fix EEVEE 23 Jul: 29 dari 39 lampu `use_shadow=False`. Di Blender 4.x+, `use_shadow` berlaku untuk EEVEE **DAN Cycles** — bake pertama menghasilkan cahaya yang menembus meja & dinding. Setelah semua shadow ON: lantai office **31% lebih gelap** (mean 0.474 → 0.326), kontras p90/p10 **22-120×** di seluruh permukaan. Sekalian naikkan `eevee.shadow_pool_size` ke `'1024'` (maksimum; STRING enum) supaya viewport tidak error "shadow buffer full".

### ⚠️ NOISE BINTIK — `bpy.ops.object.bake` TIDAK memakai denoiser (fix 27 Jul)

Gejala: saat lightmap dinyalakan, dinding/meja/plafon penuh bintik halus. `scene.cycles.use_denoising=True` itu untuk **render**, bukan bake — jadi noise 32-samples masuk mentah ke texture (terukur 0.042–0.072; patokan bersih <0.01).

Menaikkan samples saja **tidak cukup**: 32 → 256 (8× lipat, 8× lebih lama) cuma memangkas noise 36%.

**Solusi: blur gaussian numerik setelah bake.** Lightmap = data cahaya low-frequency, jadi blur ringan tidak menghilangkan informasi — detail tajam ada di base color texture, bukan di lightmap.

| | noise | kecerahan |
|---|---|---|
| Sebelum | 0.0556 | — |
| **Sesudah** (σ 1.6 @512 / 2.4 @1024) | **0.0046** (−92%) | −0.3% |

Prosesnya cuma 1,1 detik untuk 37 lightmap. Resep final: **bake 128 samples + resolusi minimum 512** (jangan 256) **+ gaussian blur**.

⚠️ Setelah bake ulang, **relink node `LM_TEX`** — image datablock di-recreate sehingga node lama menunjuk datablock yang sudah dihapus.

### Menyelundupkan lightmap ke glTF (tak ada slot resmi)
Pakai node group **`glTF Material Output`** socket **Occlusion** → keluar sebagai `occlusionTexture` → dibaca three.js sebagai `aoMap` → diubah jadi `lightMap` di viewer (kalau tidak, teksturnya MENGGELAPKAN alih-alih menerangi). Material yang dipakai lintas objek WAJIB di-copy dulu (`m.copy()`) karena lightmap-nya per objek — 38-43 material perlu dipisah.

**DUA BUG yang nyaris lolos (selalu verifikasi struktur GLB, jangan asumsi):**
1. **texCoord harus 1.** glTF `texCoord` = INDEX uv layer. 19 objek (dinding/plafon polos) tidak punya `UVMap` sama sekali, jadi UVLightmap menempati index 0 → lightmap menempel di UV base color. Fix: pastikan urutan `UVMap`(0) + `UVLightmap`(1).
2. **JANGAN ubah SEMUA `aoMap` jadi `lightMap`.** 5 material punya AO asli bawaan aset (`lamp_01`, `Oven`, `ASSET_MAT_MR`, dll) — kalau ikut dikonversi, objeknya salah nyala. Pembeda ANDAL = **`texture.channel === 1`**, BUKAN nama: glTF hasil export Blender **tidak menyimpan `texture.name`** (0 dari 107), namanya cuma ada di `image.name`.

### Export settings final (baked)
```python
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', use_visible=True, export_apply=True,
    export_lights=False,          # semua lampu OFF — cahaya sudah di lightmap
    export_cameras=False, export_yup=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14, export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_image_format='WEBP', export_image_quality=85)
```
⚠️ Export WebP **GAGAL DIAM-DIAM** untuk image `depth < 24` (grayscale/paletted) — menghasilkan `{"extensions":{}}` kosong yang bikin Three.js crash `reading 'uri'`. Fix: rebuild image jadi RGBA 32-bit sebelum export.

---

## 4d. Pre-Export Blocker Audit ✅ (27 Jul)

Sebelum export MVP1, dijalankan audit sistematis untuk mendeteksi 5 blocker yang bikin GLB rusak di Three.js. **Semua clear**: 0 material prosedural, 0 CURVE, 0 AREA light, 0 image unpacked, 0 objek tanpa UV.

### Cara audit (jalankan sebelum tiap export)
Scan lewat bpy:
- `bpy.data.materials` → node bertipe `TEX_NOISE/TEX_WAVE/VALTORGB/MIX/BUMP/MATH` (kandidat prosedural)
- semua LIGHT → `o.data.type == 'AREA'` (di-drop diam-diam oleh glTF)
- `o.type == 'CURVE'` (tidak ikut export tanpa convert)
- `o.visible_get() == False` (kena skip `use_visible=True`)
- `im.packed_file is None` (image belum di-pack)

### Gotcha penting (dari eksekusi 27 Jul)
1. **Banyak FALSE POSITIVE prosedural.** Material hasil import glTF/Sketchfab selalu punya pola `MATH + SEPARATE_COLOR` (`Metallic = SeparateColor.Blue * 0.0`, `Roughness = SeparateColor.Green`) — itu **round-trip glTF normal, BUKAN prosedural**. Cukup unlink MATH & set Metallic=0 eksplisit, TIDAK perlu bake. Dari 12 material yang ke-flag, cuma **6 yang beneran prosedural**. Selalu telusuri node tree per-input Principled dulu.
2. **Alpha cutout import**: pola `1 - (tex.Alpha < 0.05)` → ganti Alpha langsung dari image + `blend_method='CLIP'` (= glTF alphaMode MASK).
3. **GOTCHA pack image Non-Color** — urutan WAJIB: (1) `images.new()` → (2) set `colorspace_settings.name='Non-Color'` → (3) `pixels.foreach_set()` → (4) `update()` → (5) `pack()`. Kalau colorspace di-set SETELAH pack, `has_data` jadi False & pack batal diam-diam (tanpa error). Kena di `T_FabricNormal`, harus rebuild dari nol.
4. **Convert CURVE: turunkan resolusi dulu.** 17 curve dengan `resolution_u` 12-16 + `bevel_resolution` 6-12 = ~226k verts kalau convert apa adanya. Set `resolution_u=6, bevel_resolution=3` (16 sisi keliling, cukup halus untuk tube 20mm) → jadi **9.3k verts**, visual identik. Backup `curve.copy()` + `use_fake_user=True` dulu. `export_apply=True` TIDAK meng-convert curve.
5. **UV mesh multi-user**: kalau 2 objek share mesh, UV world-space bikin salah satu meleset. Pakai koordinat LOKAL × `obj.scale` — instancing tetap terjaga, tidak perlu `make_single_user`.

Texture baru hasil audit: `T_ODesk_Oak/OakV`, `T_SinkMarble`, `T_GrassRug`, `T_FabricNormal`, `T_ChairFrame_Black` (semua 1024 packed).

---

## 4c. Optimasi Poly untuk Web 🚧 (DIMULAI 24 Jul, LANJUT 27 Jul)

Kekhawatiran: scene berat saat di-export ke website. **Audit 24 Jul** (tanpa scan Reference/Scan_Office yang memang tidak ikut export): 873 unique mesh, 1143 objek mesh, **~431k unique verts** (file GLB) / **~1.11 juta instanced verts** (beban render GPU per frame — linked duplicates digambar berulang).

### Prinsip kerja (dari pengalaman sesi ini)
1. **SATU objek dulu, verifikasi visual (screenshot + user cek), baru terapkan ke duplikatnya** — jangan langsung semua
2. **Limited Dissolve (1°, delimit UV/MATERIAL/SEAM/SHARP)** = metode utama — hanya menggabung face nyaris sebidang, tidak bisa mengubah siluet. **JANGAN Decimate Collapse** untuk objek dengan detail kecil (keycap keyboard macbook sempat meleleh jadi lempengan — user komplain, di-restore)
3. **RED FLAG: material glossy + custom split normals** — dissolve merusak interpolasi normal → shading smear (kasus logo Apple TV). Cek dulu; kalau mayoritas face glossy-baked, **skip objek itu**
4. Backup mesh asli sebagai `*_ORIG` (fake_user) sebelum ubah; hapus setelah user approve final
5. Decimate/dissolve tidak bisa langsung di multi-user mesh → copy mesh → proses → relink ke semua user

### Hasil geometry — total scene 1.008M → **760.871 tris (−24.5%)**
| Objek | Sebelum | Sesudah | Metode | Status |
|---|---|---|---|---|
| `OP_Shredder` | 126.672 | **10.634** (−92%) | Decimate 0.06 + smooth 35° (aman: bentuk kotak, texture bawa detail) | ✅ 24 Jul |
| `OMacbook` ×5 | 82k verts | 32.7k **tris** (−26% dari 44k tris) | Limited dissolve + Decimate 0.75 (0.5 DITOLAK: keycap robek) | ✅ 27 Jul |
| `MR_TrackPad` | 28.407 | **13.225** (−53%) | Limited dissolve 1° | ✅ 24 Jul |
| `OMagic_Mouse` ×11 | 21k | **6.6k** (−68.5%) | Dissolve 1° + Decimate 0.35. Custom normals + glossy ternyata AMAN (uji grazing angle) | ✅ 27 Jul |
| `OMagic_Mouse_Dup2` | 21k | **relink** (gratis) | Mesh `Node_0_Mat_0.001` = PERMUTASI IDENTIK mesh utama → relink | ✅ 27 Jul |
| `OP_WoodSlat_Wall` | 33.5k | **8.2k** (−75%) | Decimate 0.25 — panel DATAR, slat-nya texture bukan geometri | ✅ 27 Jul |
| `MR_AppleTV` | 24.740 | 24.740 (0%) | **SKIP** — 15.5k/18.5k face = `Glass dark` glossy baked normals; dissolve bikin logo smear | ⛔ tidak bisa aman |

**Pelajaran 27 Jul:** (a) "glossy + custom normals" BUKAN larangan mutlak — Magic Mouse aman, AppleTV gagal karena hal lain; tetap uji di mesh copy dulu. (b) Cek permutasi mesh identik: sort koordinat `np.lexsort` lalu bandingkan — `np.allclose` mentah bilang "beda" padahal identik (beda urutan vertex). (c) Blender tolak `modifier_apply` di mesh multi-user → putus sharing dulu, apply, relink. (d) Setelah apply modifier non-pertama, modifier tetap NEMPEL → wajib `o.modifiers.remove()`, kalau tidak decimate jalan 2× saat export.

Backup `*_ORIG` (fake_user): `MR_TrackPad`, `OMacbook`, `OMagic_Mouse`, `OP_Shredder`, `OP_WoodSlat_Wall` — hapus saat final.

### Sisa poly (10 terberat, total 760.871 tris)
`OMacbook` 32.7k×5, `MR_TrackPad` 20.4k, `OChair_Gaming` 20.3k×3, `MR_AppleTV` 18.5k (SKIP), `OP_Shredder` 15.1k, `OP_LetterTray` 11.4k.

> **CATATAN:** setelah merge (§4f) tris ter-render jadi **995k** — naik karena modifier Wireframe/Bevel kini terpanggang sejak awal (dulu ditambahkan belakangan saat export). Bukan regresi. Dan poly TERBUKTI bukan bottleneck: dengan 995k tris + 0 lampu realtime, FPS tetap **50-60**. Optimasi poly lanjutan **tidak mendesak**.

### Texture ✅ SELESAI (27 Jul) — 134.4 MP → **52.9 MP (−61%)**, .blend 102.8 → **78.5 MB**
135 image ikut export, **0 file >1024**, 0 unpacked, 0 colorspace salah.
- **Resep resize massal:** `i.scale(nw, nh)` → **`i.pack()` LANGSUNG** setelahnya. ⚠️ **JEBAKAN:** menyetel `i.colorspace_settings.name` (bahkan ke nilai yang SAMA) **memicu reload dari file packed → ukuran BALIK ke asli**. Selalu cek jumlah image `>1024` SESUDAH loop, jangan percaya counter.
- **SKIP texture milik scan** (`OfficeScan*`/`MeetingScan`/`SmokingScan` — 9 file 4096²): objek referensi hidden, tidak ikut export. Deteksi: petakan image→material→object, skip kalau pemakainya ⊆ himpunan objek scan. Kalau tidak dipisah, angka audit menyesatkan.
- **TEMUAN BESAR — Magic Keyboard**: `MR_MagicKB`/`OMagic_KB_*` (12 unit) punya **79 material, tiap keycap 1 texture 1024²** = 82.8 MP untuk objek 2.354 tris — sendirian **62% beban texture seluruh scene**. Isinya nyaris polos. Di-resize ke **128²** → 1.29 MP (−98%), huruf keycap tetap TAJAM (extreme closeup). Aset Sketchfab multi-material begini: cari lewat rasio **MP per 1k tris** (keyboard 35 vs normal ~3).
- Verifikasi visual 1024px: keycap Macbook masih terbaca, pola mesh Shredder masih rapi. **1024 aman untuk semua aset office.**

### CURVE convert ✅ (27 Jul)
17 CURVE (stool pipes, BS555 footrest, SMK chair loop, mic pod cable) → convert ke mesh, resolusi diturunkan dulu (226k → 9.3k verts). 0 CURVE tersisa saat export.

---

## 4b. Riset: cara basement.studio bikin look retro/PS1 (14 Jul)

Repo mereka open source: [basementstudio/website-2k25](https://github.com/basementstudio/website-2k25). Temuan dari bongkar kodenya:

**Look "PS1 jadul" itu BUKAN dari cara export — GLB-nya biasa aja. Semuanya post-processing di Three.js:**

| Teknik | Detail (dari `renderer.tsx` + `material-postprocessing/fragment.glsl`) |
|---|---|
| NearestFilter | Scene dirender ke `WebGLRenderTarget` dengan `minFilter/magFilter = NearestFilter` — edge kasar pixelated |
| Pixelated UV | `floor(vUv * res/2) * 2 / res` di shader post — efektif setengah resolusi (1/8 buat efek reveal) |
| Bloom checkerboard | Bloom cuma dihitung di pola papan catur (`mod(x+y,2)`), vogel disk 24 sample — hemat + nambah grain retro |
| Scanline + noise | `OPACITY_SCANLINE 0.24`, noise 0.01, vignette — semua di satu shader post |
| Tone mapping manual | ACES + gamma/contrast/brightness dihitung sendiri di shader, bukan bawaan three |

**Asset pipeline mereka (relevan buat performa kita):**
- GLB dipecah per bagian: `office.glb`, `officeItems.glb`, `outdoor.glb`, dst.
- **SEMUA lighting di-bake di Blender** → puluhan `bake-XX-lightmap.exr` + `bake-XX-ao.jpg`. Scene web nyaris tanpa realtime light
- Material custom shader: baca lightmap (EXR, UV2) + AO map (JPG) dikali base color — bukan MeshStandardMaterial

**Status adopsi:**
1. Post-processing retro = lapisan opsional, tinggal tambah render target + fullscreen shader di viewer — pipeline export TIDAK berubah. **Belum dikerjakan.**
2. ~~Bake lightmap patut ditiru~~ ✅ **SUDAH DIKERJAKAN 27 Jul** (§4g) — terbukti jadi jawaban PR performa: 39 lampu realtime → 0, FPS 14-16 → **50-60**. Bedanya dari mereka: kita selundupkan lightmap lewat slot `occlusionTexture` glTF + `MeshStandardMaterial.lightMap` bawaan three, bukan custom shader + EXR terpisah. Lebih sederhana, hasilnya cukup.
3. Pecah GLB per ruangan buat lazy-load — **belum perlu**: 8,0 MB masih ringan & FPS sudah 50-60. Simpan sebagai opsi kalau nanti scene bertambah besar.

---

## 4h. Integrasi ke web ✅ (27–28 Jul)

> Judul bab ini dulu "Integrasi ke Next.js". **Next.js sudah dicabut 29 Jul** — sekarang Vite + React SPA (§4j). Isi bab ini tetap berlaku; yang berubah cuma cara build & memuat komponen.

GLB kantor sudah tidak lagi cuma jalan di viewer HTML — dia sekarang **hero fullscreen di project web ini**. Struktur halaman: `[3D office tour = hero] → Deployments → Services → Vision → Contact`.

### Peta file (per 30 Jul)

| File | Isi |
|---|---|
| `src/components/sections/Hero.tsx` | Section 3D setinggi `h-dvh`. `Scene` di-load `React.lazy` + `Suspense` (dulu `dynamic({ssr:false})`, §4j). IntersectionObserver (threshold 0.15) → `heroInView` |
| `src/components/canvas/Scene.tsx` | `<Canvas>`: ACESFilmic exposure 1.0, `dpr [1,1.5]`, fov 60 / near 0.05 / far 120, background `#0a0a0c`, **ambient 0.03**, EffectComposer + **N8AO** + Bloom (§4l) |
| `src/components/canvas/Office.tsx` | Pemuat GLB + 3 fix-up wajib (di bawah) + klik meja billiard + fade lampu + **penggerak sapuan reveal** (§4m) + **pemasangan konten layar** (§6c) |
| `src/components/canvas/SceneEnvironment.tsx` | `RoomEnvironment` + PMREM blur 0.04, `environmentIntensity` 0.18 |
| `src/components/canvas/CameraController.tsx` | `VIEWS` 5 preset + tween 1400 ms + hash routing + `billiardView()` + `goToView`. **Tanpa handler wheel/keyboard/touch sejak 30 Jul** (§4k) |
| ~~`src/components/canvas/CharacterLights.tsx`~~ | ❌ **DIHAPUS 6 Agu** — lampu ber-layer tidak pernah jalan di three; karakter kini hidup dari lightmap sekitar saja (§6b) |
| `src/components/canvas/Waypoints.tsx` | 🆕 **Waypoint navigasi 3D** — bidang di ruangan, hover → arsir + bingkai + label (§4k) |
| `src/components/canvas/ContactShadowsRig.tsx` | 🆕 **Bayangan kontak per ruangan** — "gelap di bawah meja" (§4l) |
| `src/components/canvas/revealSweep.ts` | 🆕 **Sapuan "kantor terbentuk"** — patch shader dither ke 233 material (§4m) |
| `src/components/canvas/screens.ts` | **Konten 8 layar** — gambar & video via `emissiveMap`, + `splitScreen()` pemecah mesh gabungan iMac (§6c) |
| `src/components/canvas/screenVideo.ts` | **Cache `<video>` + `VideoTexture`**, play/pause per-URL untuk gerbang per-ruangan (§6c) |
| `src/components/canvas/billiard/` | Minigame billiard — 6 file (§6d) |
| `src/components/ui/BilliardHUD.tsx` | Bar tenaga kiri + tombol reset/exit + gestur bidik (§6d) |
| `src/lib/store/sceneStore.ts` | Zustand: `currentRoom`, `heroInView`, `activeSection`, `goTo`, `goToView` + state billiard + **`START_ROOM`/`hashFor()`** (§4k) |
| `src/lib/hooks/useScrollSpy.ts` | IntersectionObserver untuk highlight link navbar |

**Dihapus:** `src/components/ui/RoomNav.tsx` (30 Jul, diganti waypoint §4k) · `LightCone.tsx` + `LightCones.tsx` (30 Jul, §4l).

Stack per 30 Jul: **Vite 6 + React 19 + three 0.185 + @react-three/fiber 9 + drei 10 + @react-three/postprocessing 3 + zustand 5 + cannon-es 0.20 + motion 12 + Tailwind 4** (cannon-es untuk billiard §6d; `motion` untuk animasi teks section §4i). **`@react-three/rapier` sudah dicopot** — alasannya di §6d. **`next` juga sudah dicopot** — §4j.

### 3 fix-up wajib di `Office.tsx`

Ketiganya hasil debugging panjang; kalau meleset, visualnya rusak dengan cara yang tidak kelihatan jelas.

1. **`aoMap` → `lightMap`, hanya kalau `channel === 1`.** glTF tak punya slot lightmap, jadi lightmap diselundupkan lewat `occlusionTexture` (§4g) dan three membacanya sebagai `aoMap` — yang **MENGGELAPKAN**, bukan menerangi. Pembeda andal = `texture.channel`, BUKAN nama (glTF Blender tidak menyimpan `texture.name`). AO asli bawaan aset ada di channel 0/3 dan harus dibiarkan. Sekalian salin atribut UV ke `uv1` kalau belum ada — tanpa itu lightmap tidak tergambar sama sekali.
2. **JANGAN clamp `emissiveIntensity`.** GLB membawa `KHR_materials_emissive_strength` (bohlam 12, LED strip 8). Viewer lama punya `Math.max(intensity, 2.0)` yang justru **menurunkan** nilai itu jadi 2.0 → lampu terlihat mati. Pakai nilai aslinya, plus `toneMapped=false` supaya pendarnya tidak diredam ACES.
3. **`needsUpdate` setelah environment terpasang.** GLB selesai dimuat SETELAH `SceneEnvironment` mount, jadi shader-nya dikompilasi tanpa envMap → permukaan glossy (lantai ubin, chrome) kehilangan refleksi, terukur **0,60× lebih gelap** dari viewer acuan. `SceneEnvironment` juga wajib pakai `useLayoutEffect`, bukan `useEffect`.

**Angka verifikasi** (log dev `[office]`): `lightmap=40 aoAsliDijaga=22 tanpaUV1=0 emissive=28` — plus `skinned` (jumlah SkinnedMesh karakter) sejak 29 Jul. Kalau menyimpang jauh, fix-up gagal — cek ini dulu sebelum menyalahkan setelan lighting.

### Bloom bukan hiasan — ⚠️ angkanya sudah TIDAK 1.6 lagi

> **Per 30 Jul `intensity` = 0.4**, diturunkan bertahap 1,6 → 0,8 → 0,4. Alasan & konteksnya di §4l. Sub-bab ini disimpan sebagai **sejarah kalibrasi**, bukan target — tabel di bawah diambil saat scene belum punya AO maupun bayangan dan lightmap masih mati.

`intensity 1.6`, **bukan 0.4 seperti viewer HTML**. Viewer pakai `UnrealBloomPass`, di sini `BloomEffect` dari postprocessing — algoritmanya beda jadi angkanya tidak setara. Dikalibrasi terhadap screenshot viewer sampai rasio kecerahan 0.98:

| intensity | 0.4 | 0.8 | 1.2 | **1.6** |
|---|---|---|---|---|
| rasio kecerahan vs viewer | 0.75 | 0.85 | 0.92 | **0.98** |

LED strip lantai & bohlam **mengandalkan bloom untuk terlihat menyala**. Tanpa bloom, kecerahan terukur turun ke 0.53×. `luminanceThreshold 0.95` — kalau diturunkan, lantai & permukaan terang ikut glow seperti lava. (Ambang 0.95 **masih berlaku** per 30 Jul; yang berubah cuma intensity.)

### ~~⚠️ `LIGHTMAP_INTENSITY = 0`~~ → **sudah 1 sejak 30 Jul**

> **Lightmap SUDAH DINYALAKAN** (`LIGHTMAP_INTENSITY = 1`, commit `864322d`). Jangan pakai sub-bab ini sebagai keadaan sekarang — lihat §4l untuk apa yang berubah dan lubang apa yang masih ada.

Catatan historis, kondisi 28–29 Jul: nilainya **0**, konsekuensi dari temuan lightmap ter-clip 8-bit (§4g) — bake Cycles menghasilkan HDR float (max 189) tapi di-export sebagai WebP 8-bit yang cuma menyimpan 0–1, jadi semua nilai >1 terpotong. Yang tersisa hanya gradasi/AO halus. Saat itu cahaya scene datang dari bloom + emissive + ambient 0.12 + environment 0.18, **bukan** dari lightmap — dan itu penyebab keluhan "semuanya terang rata": ambient mengenai semua permukaan sama rata tanpa peduli arah hadap, jadi pojok & plafon ikut terang. Diselesaikan di §4l.

### Navigasi antar-ruangan (`CameraController.tsx`)

OrbitControls **diganti** dengan navigasi tur: kamera pindah antar 5 titik pandang tetap.

- `VIEWS` = 5 preset (Office, Lounge, Meeting, Function, Pantry). **Pantry `disabled: true`** — dilewati navigasi dan waypoint ke arahnya tidak dirender (`ACTIVE_KEYS`).
- Konversi sumbu Blender→three lewat helper `bl(x,y,z) → (x, z, −y)`.
- Tween **1400 ms cubic in-out**, dengan guard `animating` supaya input beruntun tidak melompati ruangan. `up` & FOV ikut di-tween (perlu untuk masuk/keluar pandangan billiard).
- ~~Input: wheel di canvas, panah keyboard, swipe touch ≥30 px~~ — **SEMUA DIHAPUS 30 Jul.** Lihat §4k: berpindah ruangan hanya lewat waypoint 3D + room links Navbar.
- ~~**Hash routing**: `#lounge`, `#meeting`, dst via `history.pushState` + `popstate`~~ — **DIGANTI routing berbasis PATH 3 Agu** (`/`, `/office`, `/meeting`, `/function`) lewat React Router + `routes/RoomRouteSync.tsx`; lihat §4q. `hash` sekarang khusus untuk scroll ke section (`#contact`), bukan penanda ruangan. Ruangan awal tetap `START_ROOM` = **Lounge**, kini lewat `pathFor()`/`roomFromPath()` di store. ⚠️ **Slug-nya berubah lagi 19 Agu** jadi slug KONTEN (`/services`, `/work`, `/people`) — slug nama ruangan tetap dikenali dan dinormalkan; lihat §4ah.
- `goTo` didaftarkan ke `sceneStore` supaya `Waypoints` & `Navbar` (yang satu di dalam Canvas, satu di luar) bisa memanggilnya.

### UI yang mengikuti scroll

- **`heroInView`** (IntersectionObserver di Hero, threshold 0.15) — begitu 3D keluar viewport, label ruangan di navbar & waypoint 3D disembunyikan. Tanpa ini, penanda navigasi mengambang di atas konten teks.
- **Navbar background kondisional**: gradient transparan saat di hero, `bg-black/90` + backdrop-blur + border bawah saat sudah lewat. Memakai `heroInView` yang sudah ada — tidak menambah listener baru.
- **Scrollspy** (`useScrollSpy`) — `rootMargin −45%/−45%` mempersempit garis deteksi ke pita tipis di tengah layar, jadi section tinggi jadi active tepat saat isinya di tengah, bukan saat tepi atasnya baru menyentuh viewport. Di hero, tidak ada link yang active.

### ✅ BLOCKER `MODEL_URL` — SUDAH DIBETULKAN (28 Jul)

`Office.tsx` sempat memuat `/export-test/office-mvp1-baked.glb` lewat symlink `public/export-test → ../export-test`. **Symlink itu tidak pernah ada di git maupun di disk**, dan GLB-nya juga tidak ada (`export-test/*.glb` di-gitignore, isinya tinggal 4 file HTML) — jadi scene mentok di loader. Diverifikasi dengan `pnpm dev`:

```
/3d/models/office.glb                → 200
/export-test/office-mvp1-baked.glb   → 404
```

**Sudah dikembalikan ke `/3d/models/office.glb`** (nilai aslinya di commit `ad31934`; `bc0e86c` yang menggantinya ke path symlink dev-only). File itu ter-track git (9,04 MB saat itu; **8,09 MB sejak export ber-karakter 29 Jul**) dan strukturnya memang benar: 213 mesh, 227 material, 89 image, **0 lampu**, 44 material ber-`occlusionTexture` (39 di antaranya `texCoord=1` = lightmap). Draco + WebP aktif. Komentar peringatan sudah ditulis di atas konstanta itu supaya tidak terulang.

### Yang belum (per 30 Jul)

- **Loader saat mengunduh** — `Scene.tsx` sudah punya `<Loader>` dengan `useProgress`, tapi ia baru muncul setelah Suspense aktif. Jendela yang sebenarnya perlu ditutup adalah **unduhan GLB 8,09 MB + stall kompilasi shader 2,3 s** saat layar masih hitam (§4m).
- Post-processing PS1 (§4b) — `@react-three/postprocessing` sudah terpasang, tinggal tambah pass
- Interaksi klik pintu — `Bvh firstHitOnly` sudah dipasang di `Office.tsx` untuk mempercepat raycast. Klik **meja billiard** sudah jalan (§6d); waypoint 3D (§4k) sudah mengambil peran "klik untuk pindah ruangan"
- ~~Karakter (§6b)~~ ✅ **SELESAI 29 Jul** — 5 karakter tampil & beranimasi (tanpa lampu khusus; `CharacterLights` dihapus 6 Agu, §6b)
- ~~Gambar di layar monitor (§6c)~~ ✅ **SELESAI SEMUANYA** — AOC 30 Jul, MacBook 5 Agu, 4 iMac 6–7 Agu, TV meeting & TV function 7 Agu.
- **Review visual billiard di browser** (§6d) — masih belum pernah dilakukan
- **Verifikasi waypoint Lounge & Function** (§4k) — koordinatnya warisan lama, belum dicek dengan resep pengukuran

### ⚠️ Ukur ulang FPS setelah karakter masuk — sebagian sudah

Angka 50-60 FPS di MVP1 diukur **sebelum** ada 5 SkinnedMesh + 2 directional light layer-1 + `frustumCulled = false`, dan sebelum N8AO + contact shadow masuk.

**Terukur 30 Jul** (§4l, §4m) — dengan karakter + N8AO high+halfRes + contact shadow + sapuan reveal aktif: **60 FPS setelah sapuan selesai, 0 error.** Saat mengukur varian AO, angka mentahnya sampai 119 FPS (`high + halfRes`) vs 66 (`high` tanpa halfRes). Jadi tambahan-tambahan itu **tidak** memakan anggaran performa MVP1.

Yang **masih** belum diukur: FPS saat minigame billiard jalan (fisika cannon-es + 16 bola). Lakukan bersamaan dengan review billiard.

## 4i. Konten & Animasi Teks ✅ (29 Jul — dikerjakan rekan tim)

Dikerjakan paralel di branch `feature/port-konten-v1` + `feature/text-transitions`, sudah di-merge ke `main`. **Tidak ada satu pun file yang beririsan dengan pekerjaan 3D/billiard** — jadi tidak pernah ada konflik git.

**Struktur halaman saat itu** (`src/App.tsx` — dulu `src/app/page.tsx` sebelum migrasi Vite, §4j) — 5 section bertambah jadi 9 di bawah hero:

```
Hero (3D) → Manifesto → Deployments → Services → LivingArchitecture
          → Process → Industries → Careers → Vision → Contact
```

> ⚠️ **Struktur satu-halaman-panjang ini sudah TIDAK berlaku sejak 3 Agu.** Situsnya kini empat halaman per-ruangan (§4q): `App.tsx` tinggal tabel route, dan daftar section pindah ke `src/lib/roomContent.tsx`. `Services.tsx` **dihapus** (diserap ke `Office.tsx`), `Careers` pindah ke Function. Yang di bawah ini tetap berlaku — komponen `motion`-nya masih dipakai semua.

**4 komponen animasi** (`src/components/motion/`), semuanya pakai library `motion` v12 (`motion/react`):

| Komponen | Fungsi |
|---|---|
| `FadeUp.tsx` | Stagger fade-up (`FadeUpList` + `FadeUpItem`), stagger 0,04 s, ease `[0.16, 1, 0.3, 1]` |
| `LineMask.tsx` | Teks muncul dari balik mask per baris |
| `Marquee.tsx` | Teks berjalan menyamping |
| `ScrollHighlight.tsx` | Warna kata digerakkan progres scroll (`useScroll` + `useTransform`) |

> **`useReducedMotion` dipakai di semua komponen** — kalau OS pengunjung minta kurangi animasi, elemen langsung tampil terang tanpa transisi. Ini bukan tambahan opsional; menghilangkannya membuat isi halaman tak terbaca bagi sebagian pengunjung.

✅ **Lockfile sudah disatukan ke bun (29 Jul)** — lihat §7.

### Percobaan WebGPU + KTX2 — di-revert (27→28 Jul)

Commit `38168ce` sempat mengganti viewer ke `WebGPURenderer` (three r171, fallback WebGL2) + aset KTX2/ETC1S (`office-mvp1-final.glb`, 699 KB VRAM vs 5,59 MB). **Di-revert penuh** di `8a1e0b1` keesokan harinya. Yang bertahan dari eksperimen itu bukan kodenya, tapi **idenya** — navigasi scroll/touch/keyboard + tween 1400 ms + hash routing lahir di sana, lalu ditulis ulang sebagai komponen R3F di `bc0e86c`. (Navigasi scroll/touch/keyboard itu sendiri **akhirnya dihapus** 30 Jul — §4k.)

### KTX2 dicoba ulang di jalur R3F — DITOLAK (3 Agu)

Percobaan kedua, kali ini murni KTX2 tanpa WebGPU, dengan uji berdampingan `?ktx2=1`. **Ditolak Keano: yang asli terlihat lebih bagus.** Artefak percobaannya dihapus; yang disimpan cuma `scripts/ktx2-convert.sh`.

Yang terukur — semuanya jalan, jadi ini **bukan** penolakan karena gagal teknis:

| | office.glb | office-ktx2.glb |
|---|---|---|
| VRAM | 240 MB | **64 MB** (−73%) |
| disk | 8,1 MB | 17,8 MB (**2,2× lebih besar**) |
| node/mesh/material | 656/240/233 | identik |
| lightmap | 39 | 39 |
| selisih piksel vs asli | — | rata-rata 0,49/255; 0,11% piksel beda >24 |

Pelajaran yang berlaku di luar KTX2:

- **Ukuran disk NAIK, bukan turun.** WebP+Draco sudah sangat efisien untuk transfer; KTX2 menukar itu demi format yang GPU baca langsung. Yang dibeli VRAM & waktu upload, yang dibayar bandwidth — arah yang berlawanan dari dugaan awal.
- **Lightmap WAJIB UASTC.** Dengan ETC1S ia turun ke 0,98 bit/piksel dan gradasi cahaya halus adalah titik terlemah kompresi blok (gejalanya banding). Memaksa UASTC (`-tu normal,attrib`) menaikkan VRAM 49 → 64 MB dan menyumbang ~3,6 MB ke ukuran file. Ini penyebab utama file jadi besar.
- **gltfpack menghapus nama mesh** (240/240 jadi kosong) meski `-kn` dipakai — `-kn` menjaga nama **node**, bukan mesh. Nama node & material selamat, jadi `M_LEDStrip` dan klik `PoolTable` tetap jalan. Tapi kode yang mencari nama *mesh* akan gagal senyap.
- **`TEXCOORD_1` turun 80 → 40 primitif** dan itu **aman**: ke-40 yang dibuang tidak dipakai material lightmap mana pun (diverifikasi satu per satu). gltfpack membuang UV mati. Sempat terlihat seperti bug fatal — pengecekan yang benar bukan "berapa yang hilang" tapi "apakah yang hilang itu dipakai".
- **Angka 240 MB itu nyata** dan terhitung dari header GLB: 62,9 MP × 4 byte. Bukan estimasi kasar.

Kalau suatu saat VRAM benar-benar jadi penghalang (mis. target perangkat mobile), resepnya sudah ada di `scripts/ktx2-convert.sh` — 4 langkah, karena gltfpack tidak bisa membaca Draco maupun WebP. Tapi jangan mengulang percobaan ini cuma karena "240 MB terdengar besar": sudah dicoba, hasilnya kalah di mata.

## 4j. Migrasi Next.js → Vite + React SPA ✅ (29 Jul — dikerjakan rekan tim)

Commit `5af294c`/`9264cd6`, branch `chore/migrate-nextjs-to-vite`, backup di `backup/main-before-vite-migration`. **Next.js dicabut seluruhnya.** Project ini SPA client-only — tidak ada satu pun halaman yang butuh SSR, dan hero 3D justru harus `ssr:false`.

| Dari (Next 16.2) | Ke (Vite 6) |
|---|---|
| `next dev` / `next build` | `vite --port 3000` / `tsc --noEmit && vite build` |
| `src/app/page.tsx` + `layout.tsx` | `index.html` + `src/main.tsx` + `src/App.tsx` |
| `src/app/globals.css` | `src/index.css` |
| `next/dynamic({ssr:false})` | `React.lazy` + `<Suspense>` |
| `next/image` | `<img fetchPriority="high">` |
| `next/font/google` | `@fontsource/geist-sans` + `@fontsource/geist-mono` |
| `@tailwindcss/postcss` | `@tailwindcss/vite` |
| `process.env.NODE_ENV` | `import.meta.env.DEV` |
| alias `@/*` dari `next` | `vite-tsconfig-paths` |

**Yang ikut beres di migrasi ini:** `public/export-test` symlink dihapus dan `public/3d/models/office.glb` di-commit langsung — jadi blocker `MODEL_URL` (§4h) tidak bisa terulang lewat symlink yang tidak ada di git. `.gitignore` diperbarui: `/.next/` → `/dist`, plus `!public/3d/models/office.glb`.

Terverifikasi: build sukses, dev server **276 ms** (dari beberapa detik di Next), app jalan.

> ⚠️ **Dokumentasi lama masih banyak menyebut "Next.js".** Itu sejarah, bukan keadaan sekarang. Yang sudah dikoreksi: §4h, §4i, §7. Kalau ketemu sisa lain, `next` sudah tidak ada di `package.json` — itu sumber kebenarannya.

---

## 4k. Navigasi Waypoint 3D ✅ (29–30 Jul) — scroll/swipe/keyboard DICABUT

Commit `a1a857a`. **`src/components/ui/RoomNav.tsx` dihapus**, `src/components/canvas/Waypoints.tsx` (568 baris) menggantikannya.

### Apa yang berubah, dan kenapa se-radikal itu

Dulu ada **empat** jalan berpindah ruangan: dot RoomNav, scroll wheel, swipe, panah keyboard. Sekarang **dua**: klik bidang waypoint di dalam ruangan, atau pemilih ruangan di Navbar.

> ⚠️ **Koreksi 3 Agu:** bagian ini (dan §4h) sempat menyebut "dropdown Navbar" — UI itu **tidak ada** saat §4k ditulis; `RoomNav` sudah dihapus di commit yang sama. Baru ada lagi 3 Agu dalam bentuk **room links** (bukan dropdown) dari merge `join`, §4q. Sejak itu ia juga bukan sekadar alternatif: di perangkat sentuh ia **satu-satunya** jalan pindah ruangan (§4p, INVARIANTS §6).

- **Scroll & swipe dihapus karena artinya ganda.** Di atas canvas ia memindah ruangan, di luar canvas ia menggulir halaman — dan pengunjung tidak bisa menebak mana yang akan terjadi.
- **Panah keyboard dihapus meski tidak ambigu**, supaya tidak ada jalur berpindah yang **tidak tergambar di layar**. Satu-satunya cara pindah harus yang kelihatan.

> ⚠️ **Konsekuensi yang wajib diingat kalau menambah ruangan:** tiap ruangan WAJIB punya minimal satu waypoint keluar yang **benar-benar terlihat** dari `VIEWS`-nya. Tidak ada lagi next/prev room sebagai jaring pengaman.

### Kenapa bidang 3D, bukan tombol HTML

Waypoint harus ikut perspektif — mengecil saat jauh, terasa menempel di ruangan. Tombol DOM selalu menempel di layar dan langsung terbaca sebagai antarmuka, bukan bagian dari dunia. Tampilannya: **arsir diagonal shader** (bukan tekstur, supaya tetap tajam berapa pun jarak kamera) + bingkai bracket di 4 sudut + label mono `[Nama Ruangan]`, semua muncul saat hover.

Detail implementasi yang penting:
- **`depthTest=false` + `renderOrder=10`** — waypoint sengaja digambar di atas segalanya termasuk perabot yang berdiri di depannya. Posisinya tetap benar di ruangan (jadi perspektifnya betul), tapi tidak ikut tertutup.
- **Hover dianimasikan lewat `ref` + `useFrame`, bukan `useState`.** Nilainya berubah tiap frame; lewat state, tiap frame memicu render ulang React di seluruh subtree.
- Disembunyikan saat `!heroInView` atau `billiardActive` — kalau tidak, geser-untuk-membidik di billiard bisa mengenai waypoint dan pemain terlempar ke ruangan lain.

### Label mengekor kursor (31 Jul, commit `c4fe546`)

Nama ruangan tidak lagi dipaku di tengah bidang waypoint, melainkan muncul di samping kursor dan **menyusulnya dengan sedikit tertinggal** — seperti ditarik tali, bukan dipaku.

- **Pindah dari `<Html>` drei ke overlay DOM tunggal di luar Canvas** (`src/components/ui/WaypointLabel.tsx`). Alasannya: label ini elemen screen-space, posisinya ditentukan **kursor**, bukan titik di dunia 3D — sedangkan `<Html>` justru memproyeksikan titik dunia ke layar tiap frame. Bonus: tiap `<Html>` memanggil `ReactDOM.createRoot()` sendiri, jadi satu overlay tunggal meniadakan satu root React **per** waypoint.
- **Gerak kursor sengaja TIDAK lewat state React** — posisinya di `ref` dan diinterpolasi tiap frame, supaya tidak memicu render ulang saat mouse bergerak.

### 🔑 Resep mengukur posisi waypoint — JANGAN menebak koordinat

Semua angka di `WAYPOINTS` **diukur**, dan tiap entri mencatat nama objek Blender-nya supaya bisa diukur ulang kalau modelnya berubah. Alurnya lewat Blender MCP:

1. **Ukur objeknya** — `matrix_world @ v.co` untuk bbox tiap objek terkait.
2. **Bikin kamera tiruan** yang sama persis dengan `VIEWS.<Room>`: `sensor_fit='VERTICAL'`, `sensor_height=24`, `lens = 12/tan(30°)` → FOV 60°. Konversi `bl(x,y,z)` di kode = `blender(x, y, z)` langsung; `three(x,y,z) = blender(x, z, −y)`.
3. **⚠️ `bpy.context.view_layer.update()` DULU** sebelum baca `matrix_world`. Tanpa itu `world_to_camera_view` mengembalikan hasil ngawur — pernah bikin bisection gagal.
4. **Cek keterhalangan** dengan `scene.ray_cast` dari kamera ke titik sasaran; jarak hit < jarak sasaran = ada yang menutupi.
5. **Bikin quad uji + render Workbench** untuk verifikasi mata. Workbench pakai `material.diffuse_color`, BUKAN node BSDF — set `diffuse_color` + `scene.display.shading.color_type='MATERIAL'`, kalau tidak rendernya polos abu-abu.
6. **Bersihkan** objek/kamera/material bantu setelah selesai.

### Temuan besar: 3 waypoint ternyata MUSTAHIL TERLIHAT sejak ditulis

Ini yang paling mahal didapat dari resep di atas — dan tidak akan pernah ketahuan tanpa mengukur proyeksi kamera. Waypoint yang ditempel di pintu sungguhan bisa jatuh **di belakang kamera**, karena `VIEWS` ruangan itu menghadap ke arah lain:

| Waypoint | Pintunya di | `VIEWS` menghadap | dot vs arah pandang | Penggantinya |
|---|---|---|---|---|
| Office→Lounge | +X (kaca `GWL_N1_Glass`) | −X | **−2,65** | **dibaringkan di lantai**, mengikuti petak garis LED |
| Meeting→Office | timur | barat (ke TV) | **−0,24** | dinding krem timur pilar `OP_Pillar_N2` |
| Function→Lounge | selatan (`GW_Door`) | utara (ke TV) | **−0,96** | dinding gelap kanan TV, batas ditandai user via annotate |

Ketiganya **mati sejak ditulis**, bukan rusak setelah kamera digeser. Waypoint pengganti diberi `label` eksplisit ("Go back to Lounge") karena nama ruangan saja terbaca seperti tujuan baru, padahal maksudnya jalan pulang.

Pola yang muncul: **waypoint jalan-pulang jarang bisa ditempel di pintunya**, karena `VIEWS` tiap ruangan sengaja menghadap ke daya tarik utamanya (TV, whiteboard), bukan ke jalan masuknya. Tempel di bidang yang memang terlihat, dan buat lebih besar dari bagian yang terlihat supaya tepinya keluar bingkai — kotak yang terpotong di tengah dinding terbaca sebagai cacat.

### Gotcha waypoint

- **Waypoint lantai butuh rotasi beda:** `planeGeometry` lahir menghadap +Z, jadi `floor: true` merebahkannya `[-π/2, 0, rotY]`. Label diangkat pada **+Z lokal** (setelah rebah = lurus ke atas) — rumus yang sama tetap benar untuk waypoint dinding.
- **React key wajib memuat `floor`:** satu pasang ruangan boleh punya dua waypoint (pintu + lantai); tanpa pembeda itu keduanya berbagi key dan hover-nya menyala bersamaan.
- **Awas objek di atas dinding:** `AirVent_01..03` (z 2,155..2,505). Bidang setinggi penuh akan menembus kisinya kalau tidak ditaruh di depannya.
- **Label `pointerEvents: none`** — kalau label ikut menangkap kursor, dia menutupi bidang di bawahnya dan hover berkedip-kedip.

### ⚠️ Function Room berpotensi jalan buntu di HP → **terjawab lain jalan**

Waypoint Function→Lounge terlihat 100% di 21:9, 59% di 16:9, 43% di 16:10, 16% di 4:3, dan **tidak terlihat sama sekali di rasio potret**. Sejak scroll & swipe dihapus, di layar potret pengguna sentuh **tidak punya jalan keluar dari Function Room**.

**Temuan ini yang memicu §4p** — tapi jawabannya bukan memindahkan waypoint-nya ke lantai seperti yang direncanakan di sini. Setelah ditelusuri, masalahnya lebih luas dari satu waypoint: **waypoint dibangun di atas hover, dan jari tidak punya hover**. Jadi di perangkat sentuh waypoint dimatikan **seluruhnya** dan navigasi diserahkan ke navbar (§4p, §4q, INVARIANTS §6). Waypoint ini sendiri dibiarkan apa adanya — di desktop ia baik-baik saja.

### `START_ROOM` — titik awal tur pindah ke Lounge

`START_ROOM = "Lounge"` di `sceneStore.ts`, dan itu **satu-satunya** tempat titik awal ditentukan. Ia dipakai untuk **tiga** hal yang wajib tetap sepakat:

1. posisi kamera saat mount (`CameraController` + `START_POS` di `Scene.tsx`)
2. `currentRoom` awal di store
3. ruangan yang URL-nya **tanpa hash** — lewat `hashFor()`

Nomor 3 yang paling mudah terlewat. Dulu Office yang tanpa hash; memulai di Lounge tapi membiarkan Office tanpa hash berarti **pindah ke Office membuat URL jadi bersih, lalu reload mengembalikan pengunjung ke Lounge** — bukan ke Office yang barusan dibuka.

Sekalian dibetulkan: `START_POS` di `Scene.tsx` dulu tuple hardcode `[-6.0, 1.6, 4.0]` yang bahkan **tidak cocok** dengan `VIEWS.Office` (`[-3.97, 1.13, 2.48]`) — jadi frame pertama selalu dari tempat yang salah sampai `CameraController` men-snap-nya. Sekarang diturunkan dari `VIEWS[START_ROOM].pos`.

---

## 4l. Lighting Dirombak ✅ (30 Jul) — lightmap dinyalakan, AO + bayangan kontak masuk

Commit `864322d`. Keluhan yang memicunya: **"semuanya terang rata"** — dan penyebabnya bukan kurang efek, melainkan `LIGHTMAP_INTENSITY = 0` yang membuat **ambient jadi satu-satunya sumber cahaya**. Ambient mengenai semua permukaan sama rata tanpa peduli arah hadap maupun ada tembok di sebelahnya, jadi pojok ruangan & plafon ikut terang.

| Setelan | Sebelum | Sesudah |
|---|---|---|
| `LIGHTMAP_INTENSITY` (`Office.tsx`) | **0** | **1** |
| `ambientLight` (`Scene.tsx`) | 0.12 | **0.03** |
| `<Bloom intensity>` | 1.6 | **0.4** |
| AO | tidak ada | **N8AO** `high` + `halfRes` |
| Bayangan | tidak ada | **ContactShadows** per ruangan |
| `M_LEDStrip` emissive | 8 (dari GLB) | **3** (ditimpa) |

Logikanya: bloom 1,6 dulu dipakai untuk **mengangkat kecerahan keseluruhan** — pekerjaan yang sekarang diambil alih lightmap + AO + bayangan. Bloom kembali ke porsinya: memberi pendar pada yang memang menyala.

### N8AO — mengisi lubang terbesar lightmap

Bake lightmap hanya mencakup objek ≥8 m² (§4g) = **39 dari 233 material**. 189 material sisanya tidak punya lightmap sama sekali, jadi pojoknya tidak pernah gelap. AO bekerja **per piksel layar**, jadi kena semua objek tanpa perlu bake — sekaligus menutup tiga cacat yang tidak bisa dibetulkan dari Three.js: plafon Office/Lounge/Function tidak ke-bake, dan 2 lightmap (dinding krem + parket meeting) isinya hitam total.

**⚠️ HARUS SEBELUM `<Bloom>` di `EffectComposer`.** Urutan = urutan eksekusi: AO menggelapkan dulu, bloom baru menyebarkan sisa yang terang. Dibalik, bloom menyebar dari piksel yang belum digelapkan dan pendarnya bocor ke pojok yang seharusnya gelap.

**⚠️ `quality="high"` + `halfRes`, dan keduanya hasil pengukuran — bukan selera.** `quality="low"` adalah penyebab **NOISE BELANG** di dinding & plafon yang sempat dikira berasal dari lightmap (dokumentasi n8ao menyebutnya sendiri: *"Low (Temporally stable, but low-frequency noise)"*). Bukti A/B: mematikan lightmap **tidak** mengubah rasio noise (0,00377 → 0,00393), sedangkan mematikan AO memangkas noise **53%** padahal ruangan jadi lebih terang.

Noise terukur di dinding kiri meeting room + FPS:

| Setelan | Noise | FPS | |
|---|---|---|---|
| `low` + halfRes | 0,377 | | noise belang — kondisi awal |
| **`high` + halfRes** | **0,322** | **119** | ✅ DIPAKAI — paling halus DAN tercepat |
| `high` tanpa halfRes | 0,621 | 66 | lebih buruk DAN separuh FPS |

> Baris terakhir berlawanan intuisi tapi terukur: **membuang `halfRes` menaikkan noise dua kali lipat.** Di setengah resolusi, upsample sadar kedalaman ikut meratakan bintik antar-piksel — jadi `halfRes` di sini berfungsi sebagai **penghalus**, bukan cuma penghemat ongkos.

### Bayangan kontak — "gelap di bawah meja"

`ContactShadowsRig.tsx`, satu bidang penangkap **per ruangan** (Office, Meeting, Lounge, Function; Pantry tidak ada karena `VIEWS.Pantry` masih `disabled`). Pelengkap AO, bukan tumpang-tindih: AO bekerja di ruang layar (pojok & celah rapat), ini menjatuhkan bayangan **arah** pada lantai dari benda di atasnya.

**Kenapa `ContactShadows` dan bukan lampu + shadow map:** komponen drei ini sama sekali tidak memakai lampu — ia memasang `scene.overrideMaterial = MeshDepthMaterial`, merender dari kamera ortografis yang memandang **lurus ke atas dari lantai**, lalu mem-blur hasilnya. Jadi `gl.shadowMap` tidak perlu dinyalakan — dan **jangan** dinyalakan, karena itu memaksa 291 mesh statis dievaluasi ulang.

Karena kameranya memandang ke atas, benda rendah jadi gelap dan makin tinggi makin pudar sampai terpotong `far`. Persis perilaku occlusion yang dicari. Rumus alpha, dari shader-nya sendiri:

```
alpha = 1 − (h − y0 − near) / (far − near)      // h = ketinggian dunia occluder
```

**Ini yang membuat pendekatannya mungkin di GLB yang sudah di-merge:** depth clipping bekerja **per-fragmen**, bukan per-objek. `MG_Office_ODesk_BlackSteel` membentang y 0,01..3,60 — meja dan geometri setinggi plafon di SATU mesh, mustahil dipisah lewat layer atau visibilitas. Tapi `near`/`far` memotongnya dengan benar (diuji: papan meja y 0,70–0,75 tertangkap, slab lantai ter-clip `near`, plafon ter-clip `far`).

**⚠️ 4 jebakan yang semuanya kena di sesi ini:**

1. **`y0` beda-beda per ruangan** karena tinggi lantainya beda: Office 0,00 · Meeting parquet 0,00 · Lounge rug 0,012 · Function rug 0,018. Kalau bayangan hilang di SATU ruangan saja, ini tersangka pertama.
2. **`blur` dipatok ke resolusi 256** (`uniforms.h.value = blur * 1/256`), jadi nilainya TIDAK sebanding antar resolusi. Mengubah `resolution` **wajib** setel ulang `blur` — jangan dibawa apa adanya.
3. **Bidang kurang lebar = bayangan terpotong jadi garis.** Versi pertama Meeting dibuat 7,4 × 4,6 (pas occluder + bantalan 0,25 m) dan tepi timurnya memotong occluder → bayangan deretan kursi kanan terpotong di garis vertikal, meninggalkan pita terang bertangga. Sempat dikira z-fighting `near`; ternyata murni bidangnya kurang lebar. Beri bantalan ~0,5 m karena blur menyebarkan bayangan keluar siluetnya.
4. **`key={currentRoom}` WAJIB.** `frames={4}` berarti bayangan dipanggang sekali lalu berhenti; tanpa remount, pindah ruangan membawa bayangan ruangan **lama**. Dan jangan `frames={1}`: material masih dimutasi setelah mount (`needsUpdate` + PMREM), jadi 1 frame bisa mengunci scene kosong.

### 🐛 Bug paling menyesatkan: bayangan yang MENERANGI lantai

N8AO memindahkan objek yang `transparent && !depthWrite && !userData.treatAsOpaque` ke pass transparansinya sendiri, dan **di pass itu AO tidak diterapkan pada piksel di baliknya**. Bidang penangkap bayangan memenuhi ketiga syarat itu — jadi lantai di bawahnya kehilangan penggelapan AO, dan bayangannya **berbalik menerangi lantai**.

Terukur di piksel yang sama, bawah meja:

| Kondisi | Tanpa bayangan | Dengan bayangan | |
|---|---|---|---|
| AO nyala, tanpa flag | 37 | **54** | ❌ salah arah |
| AO nyala, dengan flag | 37 | **33** | ✅ benar |
| AO mati | 113 | 103 | ✅ benar |

Baris terakhir yang membuatnya sulit dilacak: **tanpa AO semuanya tampak beres**, jadi gejalanya cuma muncul di kombinasi keduanya.

Solusinya `userData.treatAsOpaque = true` — dan **⚠️ flag HARUS di userData MESH.** Memasangnya lewat prop `userData` pada `<ContactShadows>` menempel ke grup luarnya dan tidak terbaca N8AO (sudah dicoba, angkanya tidak bergerak sama sekali). Karena itu ada `useEffect` yang men-traverse grup dan menandai mesh-nya. **JANGAN pakai `cannotReceiveAO`** — flag itu justru MENAMBAHKAN objek ke pass transparan, memperburuk masalahnya.

### ⚠️ Menaikkan `LIGHTMAP_INTENSITY` lebih dari 1 TIDAK akan menolong

Lightmap lantai office (image 21) di-pack sebagai **ORM**: satu texture dipakai serentak sebagai `occlusionTexture` DAN `metallicRoughnessTexture`. three.js membaca `lightMap` sebagai `.rgb` penuh, jadi menaikkan intensity **membanjiri lantai dengan biru** dari channel metallic (terukur mean RGB 51/36/254). Dua lightmap lain juga mati: `M_SM_Wall_Cream_MeetingWest` hitam pekat, `M_MR_Parquet_MeetingWest` kosong. Itulah kenapa AO + bayangan kontak diperlukan, bukan sekadar menaikkan angka.

### LED strip: `emissiveIntensity` 8 → 3

Satu-satunya material yang emissive-nya **ditimpa** — pengecualian bertarget, bukan pembatalan aturan "jangan clamp emissive" (§4h fix 2, yang dilarang adalah clamp **menyeluruh**). Blender mengekspornya 8 lewat `KHR_materials_emissive_strength`; dengan `toneMapped=false` angka itu melewati ambang bloom 0,95 dengan margin ~8×, jadi pendarnya jauh lebih tebal dari lampu lain. Turunkan angka ini untuk mengurangi bloom garis LED **tanpa** menyentuh `<Bloom intensity>` global. Di bawah ~1,0 strip berhenti berpendar sama sekali.

Cahaya LED yang **jatuh di lantai** sudah di-bake ke lightmap dan tidak ikut berubah — yang berubah cuma pendar strip-nya sendiri.

### ❌ Light cone volumetrik — DIBANGUN lalu DIHAPUS (30 Jul)

`LightCone.tsx` (567 baris) + `LightCones.tsx` (108 baris) dibuat di `864322d` lalu **dihapus di hari yang sama**. Versi terakhir ada di `git stash` ("light cone WIP 30 Jul"). Dua temuan yang mahal didapat, dicatat supaya tidak diulang kalau nanti dicoba lagi:

1. **Kerucut 360° tidak bisa MENJAMIN sinar seimbang kiri-kanan.** Potongan noise yang menghadap kamera ditentukan azimut kamera, jadi tiap view dapat potongan berbeda dan ada yang kebetulan berat sebelah. Mengubah seed/frekuensi/lantai-sinar cuma menggeser peluang, tidak menyelesaikan. Yang menyelesaikan: **setengah cangkang (180°) yang selalu menghadap kamera + `uv.x` dicerminkan** → kiri == kanan secara matematis.
2. **Radius kerucut tampak = KERUCUT DALAM Blender**, yaitu `spot_size × (1 − spot_blend)`, bukan `spot_size` penuh. Yang penuh itu batas terluar tempat cahaya sudah habis meredup; memakainya memberi bentuk **kipas mekar**, bukan berkas sorot.

---

## 4m. Sapuan "Kantor Terbentuk" ✅ (30 Jul)

`src/components/canvas/revealSweep.ts` + penggerak di `Office.tsx`. Menggantikan pop-in mendadak saat GLB selesai dimuat: sebuah bidang tegak menyeberangi ruangan sepanjang sumbu X — di belakangnya geometri tampil normal, di depannya belum ada apa-apa, dan di garis pertemuannya piksel muncul bertahap lewat pola dither dengan tepi silver brand.

**Terverifikasi di browser: 60 FPS setelah sapuan, 0 error.**

| Parameter | Nilai | Alasan |
|---|---|---|
| Arah | **Lounge → Meeting** (x +2,55 → −21,70) | Lounge itu pintu masuknya. Dibalik, kantor terbentuk dari ruangan terdalam yang belum pernah dilihat — terbaca seperti pemindaian denah, bukan seperti memasuki tempat |
| Durasi | **2,6 s** easeOutCubic | 24,25 m / 2,6 s ≈ 9 m/s. Punya bobot, bukan kilatan. Jangan >3 s: sapuan berjalan sebelum pengunjung bisa berinteraksi |
| Pita dither (`BAND`) | 3,5 m | ≈14% bentangan — cukup lebar untuk terbaca sebagai gradasi, cukup sempit untuk tetap terbaca sebagai garis bergerak |
| Pita silver (`EDGE`) | 1,4 m | Lebih sempit dari BAND supaya warnanya jatuh di ujung depan saja |
| Warna tepi | **`#d2d3d4`** | Silver huruf "cogniti" dari `public/brand/Logo-Final.png` |

**Merah `#ec2028` (segitiga logo) sengaja TIDAK dipakai** untuk efek seluruh ruangan: menyapu seluruh kantor dengan merah terbaca sebagai **peringatan sistem**, bukan brand. Simpan merah untuk aksen kecil yang memang menuntut perhatian.

### Kenapa dither + `discard`, bukan alpha fade seperti referensinya

basement.studio memudarkan alpha (`material.transparent = true`). Itu bekerja untuk **satu** objek; di sini ada **233 material**. Menyalakan `transparent` di semuanya berarti three memindahkan mereka ke pass transparan yang diurutkan per jarak — urutan gambarnya jadi salah di geometri yang saling tembus (kusen di dalam dinding, kaki kursi di dalam karpet), dan `depthWrite` mati sehingga objek di belakang bocor ke depan. Ditambah ongkos sortir 294 primitive tiap frame.

`discard` menghindari semuanya: material tetap **opaque**, depth buffer tetap benar, urutan gambar tidak berubah. Yang hilang cuma kehalusan gradasi — dan justru itu yang ditutup **pola dither Bayer 4×4**: mata membaca kerapatan titik sebagai gradasi, persis seperti halftone koran.

> ⚠️ **JANGAN ganti `discard` jadi alpha tanpa mengukur ulang keempat ruangan.**

### Detail shader yang tidak boleh digeser sembarangan

- **Satu fungsi `patch` yang dipakai bersama semua material.** `Material.customProgramCacheKey()` bawaan three mengembalikan `this.onBeforeCompile.toString()`, jadi selama semua material memakai **referensi fungsi yang sama**, WebGL hanya mengompilasi SATU program tambahan. Objek uniform juga dibagi → menyetel progress = menulis **satu** angka, bukan 233.
- **Titik sisip VERTEX = `project_vertex`** (`meshphysical.glsl.js:44`). Di titik itu `transformed` sudah melewati morph, skinning, dan displacement — itu yang membuat **5 karakter ber-skin ikut tersapu di posisi pose sebenarnya** alih-alih di bind pose. Menyisip sebelum `skinning_vertex` membuat karakter muncul di tempat yang salah.
- **Titik sisip FRAGMENT = `dithering_fragment`** (`:221`), chunk **terakhir**, setelah `tonemapping_fragment` (217) dan `colorspace_fragment` (218). Konsekuensinya penting: `gl_FragColor` sudah dalam sRGB akhir, jadi tepi tampil **persis `#d2d3d4`** tanpa diredam ACES. Dipindah ke sebelum tonemapping, silver-nya jadi abu kusam dan harus dikonversi manual.
- **Pola dither pakai `gl_FragCoord`, bukan UV.** Polanya terkunci ke layar dengan kerapatan tetap 1 titik/piksel, sama rapatnya pada dinding jauh maupun meja di depan hidung. Pola berbasis UV akan melar mengikuti perspektif dan terlihat seperti tekstur kotor.
- **Matriks Bayer ditulis sebagai rantai `if`, bukan array const** — array indexing dinamis di GLSL ES 1.0 (WebGL1) tidak dijamin didukung, dan project ini belum mengunci WebGL2. Rantai ini dikompilasi jadi lookup konstan, ongkosnya nol.
- **Deklarasi `uniform`/`varying` wajib ditambahkan sendiri** lewat prefiks string. Mengisi `shader.uniforms` hanya menyediakan **nilai**-nya ke three, tidak membuat variabelnya ada di shader — tanpa itu kompilasi gagal "undeclared identifier".
- **`dispose()` wajib dipanggil setelah animasi selesai** dan harus mengembalikan `onBeforeCompile` **yang asli**, bukan disetel ke no-op (no-op tetap mengubah cache key dan memaksa kompilasi program ketiga). Tanpa dispose, tiap fragmen di seluruh kantor terus menghitung dither + discard selamanya untuk hasil yang sudah pasti "tampil penuh".
- **`useLayoutEffect`, bukan `useEffect`** — patch harus terpasang sebelum frame pertama digambar. Dengan `useEffect` ada satu frame di mana kantor tampil penuh sebelum sapuan mengambil alih.
- Material di-dedup pakai `Set`: 233 material dipakai bersama oleh 294 primitive.

### ⚠️⚠️ STALL 2,3 DETIK — terukur, dan BUKAN dari sapuan

Ini temuan paling penting di sesi ini karena mudah sekali salah menuduh. Antara GLB selesai di-parse dan **frame PERTAMA tergambar** ada jeda besar: three sedang mengompilasi shader untuk 233 material dan mengunggah 91 texture, dan itu memblokir thread utama.

Terukur di mesin ini (30 Jul, dev build):

```
traverse GLB selesai      → +0,88 s
frame PERTAMA tergambar   → +3,20 s
────────────────────────────────────  stall 2,32 s
```

**A/B dengan patch sapuan dimatikan: 2319 ms tanpa vs 2366 ms dengan** — sapuan menambah ~50 ms, bukan penyebabnya. Stall ini **sudah ada sebelum sapuan dibuat**. Jangan salahkan sapuan kalau loading terasa lama.

**Tapi stall itu MERUSAK animasinya kalau tidak ditangani:** hitungan dimulai di frame 1, frame 2 baru datang 2,4 s kemudian, dan sapuan langsung **meloncat ke 87%** — praktis tak terlihat. Persis gejala yang muncul saat pertama dicoba.

Penanganannya: jam baru mulai setelah ada frame yang jaraknya wajar (`dt < 0,25 s`). Ambang 0,25 s jauh di atas frame normal (0,008–0,033 s) tapi jauh di bawah stall kompilasi — sekaligus menangani hitchan lain dengan sebab sama (pindah tab, GC besar) tanpa kasus khusus.

**Kandidat perbaikan stall:** `KHR_parallel_shader_compile` / `compileAsync`. **Belum dikerjakan.**

### ✅ Loader saat mengunduh — SELESAI (31 Jul, lihat §4n)

Permintaan awal user, sengaja dipisah dari sapuan. Jendela yang benar untuk itu justru **stall 2,3 s + unduhan GLB 8,09 MB**, saat layar masih hitam dan pengunjung tidak dapat umpan balik apa pun. Dijawab 31 Jul dengan **loading screen isometrik yang dirender di Web Worker** — detail di §4n.

### Verifikasi visual: Playwright 1.61.0

Versi itu yang cocok dengan chromium 1228 yang sudah ter-cache di `~/Library/Caches/ms-playwright`; **versi lain memicu unduhan browser baru**. Flag WebGL yang jalan di headless:

```
--use-gl=angle --use-angle=metal --enable-unsafe-swiftshader
```

---

## 4n. Loading Screen Isometrik ✅ (31 Jul) — dirender di Web Worker

Port animasi loader basement.studio (sumber `~/Downloads/CSI.tsx`). File di `src/components/loader/`: `introAnimation.ts` (logika murni), `intro.worker.ts`, `introMessages.ts`, `LoadingScreen.tsx`.

**Koreografi (SENGAJA beda dari referensi):** intro sekali → idle putar-jeda berulang → outro. Referensi membuang batangnya keluar layar tiap siklus; untuk loader berdurasi tak tentu itu bikin gelisah, jadi batang ditahan di tempat.

### ⚠️ Empat hal mahal yang tidak terlihat dari kode

1. **Worker itu SYARAT, bukan kemewahan.** Kompilasi 233 shader memblokir main thread 2,3 s (§4m). Kanvas 2D menggambar di thread yang sama → animasi main-thread **MEMBEKU** persis di detik terakhir sebelum kantor muncul. Yang kena stall itu fase IDLE-nya; outro aman karena sinyalnya datang dari `useFrame` yang baru jalan setelah stall usai.
2. **JANGAN impor `three` di modul animasi.** Worker = chunk terpisah; `three` membuatnya ratusan kB dan loader harus menunggu unduhan sebelum bisa muncul — kebalikan dari tugasnya. Matematika 4×4 ditulis tangan (~40 baris), rumus rotasi disalin dari `Matrix4.makeRotationFromEuler` cabang XYZ (cocok sampai galat 1,7e-15). Hasil: chunk worker **3,74 kB**.
3. **StrictMode + `transferControlToOffscreen()` = bug fatal di dev.** Fungsi itu cuma boleh dipanggil SEKALI seumur hidup elemen kanvas. Alur dev: mount → transfer → cleanup → mount lagi; di putaran kedua jalur worker DAN jalur cadangan sama-sama buntu → layar putih kosong. Solusi: worker **tidak** dimatikan di cleanup (ref bertahan melewati remount), dimatikan di `finish()` saja.
4. **`useProgress` drei BOHONG** — melapor 100% saat unduhan selesai, 2,3 s sebelum ada yang terlihat. Diganti `sceneReady`, disetel dari gerbang `dt > 0.25` di `Office.tsx` (§4m).

### Detail yang tidak boleh digeser

- Batang digambar `destination-out` (**melubangi** lingkaran), bukan putih seperti referensi. Wajib: saat outro latar putihnya memudar, batang putih akan tertinggal melayang di atas kantor 3D.
- Latar putih = `<div>` DOM + `transition-opacity`, bukan `fillRect`. Repo ini belum punya `AnimatePresence` di mana pun — jangan perkenalkan untuk fade sesederhana ini.
- `index.html` punya `<div>` putih statis di dalam `#root` — mencegah kedipan hitam sebelum React mount (body `#000`, loader putih).
- Tuas kalau idle terasa lama: `IDLE_PAUSE_MS` di `introAnimation.ts` (2000 → 1200).
- **BELUM DIUJI:** anti-beku di browser sungguhan (DevTools Performance saat kompilasi shader) — itu inti keputusan Worker, dan cuma bisa dibuktikan mata.

---

## 4o. 🐛 Bug Merge Lintas-Wilayah + INVARIANTS.md ✅ (31 Jul)

Repo ini dikerjakan berdua: **Keano** pegang `src/components/canvas/**` + `lib/store` (aset & scene 3D), **Nico** pegang `src/components/sections/**`, `motion/**`, Navbar (konten web). Batasnya bersih — tumpang tindih nyaris nol dalam 80 commit.

**Kelas bug yang berulang: dua cabang yang masing-masing benar, rusak hanya saat bertemu — dan git TIDAK melaporkan konflik** karena perubahannya jatuh di baris berbeda. Sudah terjadi dua kali:

1. **`frameloop="demand"` vs tiga `useFrame` baru.** `frameloop="demand"` (`df27f3d`, hanya di `main`) vs `useFrame` di Office/Waypoints/BilliardGame (dari `feature/screen-content`, bercabang 7 menit sebelum kontrak demand lahir). Auto-merge sukses secara tekstual (baris 41 vs 67 di `Scene.tsx`). Akibat: hanya `CameraController` yang punya `invalidate()` → cuma dia yang minta frame. **Gejala khas: tampilan stuck total + berat, TAPI navigasi tetap responsif.** Sapuan reveal berhenti di progress 0, `sweep.dispose()` tak pernah tercapai, 233 material menghitung dither + `discard` selamanya, dan `discard` mematikan early-Z → berat, terutama di GPU integrated. **Fix:** `frameloop="demand"` dicabut (`7e3723a`).
2. **`StaticHero` (reduced-motion) vs `LoadingScreen`.** `<Scene/>` tak di-mount → `sceneReady` selamanya false → overlay putih menutupi situs selamanya.

Keduanya **lolos** `tsc --noEmit`, `eslint`, dan `bun run build`. Yang menangkap cuma: membuka halamannya, atau test yang membaca sumber.

**Penjaganya sekarang ada** (`INVARIANTS.md` di root — **7 pasal**, 4 di antaranya 🔒 dijaga test):
- `src/components/canvas/frameloop.invariant.test.ts` (§1)
- `src/components/loader/loaderGate.invariant.test.tsx` (§3)
- `src/lib/hooks/coarsePointer.invariant.test.ts` (§6, 3 Agu, §4p)
- `src/components/canvas/frameloopGate.invariant.test.ts` (§7, 4 Agu, §4r)

Norma penulisan penjaga di repo ini: **buktikan test-nya MERAH di kondisi rusak dulu** sebelum dipakai memverifikasi perbaikan. Test yang tak pernah terlihat gagal tidak bisa dipercaya. Catatan: jsdom tidak punya `canvas.getContext('2d')`, jadi `LoadingScreen` selalu jatuh ke `finish()` seketika di test — jangan tulis test "overlay bertahan", itu memaksa orang melemahkan kode produksi.

### ✅ Merge 6 Agu (`51a41cd`) — bersih, tapi diperiksa dulu

`origin/main` maju **~25 commit** (merge cabang `join`: room refresh + careers/crew/awards, **61 berkas, +5633/−712**) sementara lokal memegang commit bake lighting `514e8a7`. Berkas yang disentuh **disjoint di atas kertas** — mereka `sections/`+`motion/`, aku `canvas/`+GLB — dan auto-merge memang lolos tanpa konflik. Tapi persis begitulah dua bug di atas dulu lolos, jadi diperiksa manual:

| yang dicek | hasil |
|---|---|
| Ikatan §6 — room links `Navbar.tsx` (`ACTIVE_KEYS` → `goRoom`) | utuh |
| Ikatan §7 — `heroInView` diproduksi `Hero.tsx`, dikonsumsi `canvas/` | utuh |
| `bun run test` | 34 berkas / **189 test** hijau |
| `npx tsc --noEmit` | exit 0 |
| **Buka halamannya** (kebiasaan wajib INVARIANTS.md) | lounge & meeting benar |

**⚠️ Jebakan: `bun run test` GAGAL 8 berkas tepat setelah merge** — `Failed to resolve import "lucide-react"`. Sekilas seperti kerusakan merge, padahal cuma **dependensi baru yang ikut lewat `package.json`** (`lucide-react`, `clsx`, `tailwind-merge`). **`bun install` dulu, baru percaya hasil test.**

**Dua ikatan lintas-wilayah yang aktif sekarang dan TIDAK ADA test-nya** — keduanya harus dicek mata tiap merge:
- Room links di `Navbar.tsx` = **satu-satunya** jalan pindah ruangan di perangkat sentuh (§6). Dihapus atau diubah jadi butuh hover → jalan buntu di HP. `coarsePointer.invariant.test.ts` menjaga *gerbangnya mati*, bukan menjaga *adanya jalan keluar*.
- `heroInView` (§7) — putus berarti laptop panas lagi, atau loader menggantung selamanya.

---

## 4p. Perangkat sentuh: scene 3D jadi pemandangan ✅ (3 Agu)

Di `(pointer: coarse)`, kantor 3D **tidak menerima interaksi apa pun**: waypoint tidak di-render, meja billiard tidak bisa dibuka. Navigasi ruangan di HP diserahkan sepenuhnya ke navbar.

**Pemicunya** waypoint `Function→Lounge`: di rasio potret ia jatuh **di luar bingkai** sepenuhnya (terlihat 100% di 21:9, 59% di 16:9, 0% di 1:1 ke bawah), jadi Function Room menjadi jalan buntu di HP sejak scroll & swipe dicabut 30 Jul. Tapi setelah ditelusuri, masalahnya lebih luas dari satu waypoint.

**Akar masalahnya bukan layar sempit, melainkan tidak ada hover.** Waypoint adalah bidang **tak terlihat** sampai kursor menyentuhnya — arsir, bingkai, dan label itulah satu-satunya penanda bahwa ia bisa diklik. Jari tidak punya keadaan hover: sentuhan pertama langsung memindahkan ruangan, jadi yang dialami pengunjung HP adalah kamera melompat tanpa sebab yang terlihat. Karena itu patokannya `pointer: coarse`, **bukan `max-width`** — patokan lebar layar meloloskan tablet landscape yang masalahnya sama persis.

**Blocker yang ditemukan saat mengerjakan ini — dan sudah terjawab.** `Navbar.tsx` ternyata **belum punya pemilih ruangan sama sekali**: `RoomNav` dihapus di `a1a857a`, dan komentar di `Hero.tsx` + `CameraController.tsx` yang menyebut "dropdown ruangan di Navbar" merujuk ke UI yang tidak ada lagi (komentarnya sudah dibetulkan). Grep `goTo` di seluruh `src/` cuma menemukan `Waypoints.tsx`. Konsekuensinya pengunjung HP terkunci di Lounge — diterima sadar sambil menunggu koordinasi dengan Nico, karena navbar wilayahnya.

Ternyata Nico mengerjakannya paralel di branch `join`: room links di `Navbar.tsx` (`ACTIVE_KEYS.map` → `goRoom`) + **routing berbasis path** (`/lounge`, `/meeting`, …) lewat `routes/RoomRouteSync.tsx` yang menyinkronkan URL ↔ `currentRoom` dua arah. Begitu `join` di-merge, kuncinya terbuka. ⚠️ Keduanya kini **terikat**: kalau room links dihapus, §6 berubah jadi jalan buntu di HP, dan tidak ada test yang bisa melihat ikatan itu.

**Tiga berkas menjalankan satu keputusan ini**, dan urutannya tidak boleh dibalik:

| berkas | perannya | kalau lepas |
|---|---|---|
| `canvas/Waypoints.tsx` | berhenti me-render waypoint | sentuhan memindah ruangan tanpa penjelasan |
| `canvas/Office.tsx` | `onClick` meja tidak membuka minigame | **pemain terkunci** di pandangan atas meja — tombol keluar hidup di HUD yang tidak di-mount |
| `sections/Hero.tsx` | HUD & label tidak di-mount | chunk terunduh percuma di seluler (kosmetik + hemat bundle) |

Gerbang di `Hero.tsx` cuma kosmetik; yang benar-benar mematikan interaksi adalah dua yang pertama. **Menyembunyikan HUD tanpa mematikan pintu masuknya menghasilkan jalan buntu**, bukan tampilan yang kurang rapi.

Hook-nya `src/lib/hooks/useCoarsePointer.ts` — `useSyncExternalStore` di atas `matchMedia`, jadi ia ikut berubah kalau perangkat berganti mode. Penjaganya `coarsePointer.invariant.test.ts`, dan **sudah dibuktikan merah** dengan melepas gerbang di `Office.tsx` + mengganti query ke `max-width` sebelum dipakai. ⚠️ Seluruh aturan ini **tidak terlihat sama sekali di desktop** — buka device toolbar setelah menyentuh apa pun di `canvas/`.

---

## 4q. Routing Per-Ruangan & Konten Per-Ruangan ✅ (3 Agu — merge `join`)

Situs berubah dari **satu halaman panjang** jadi **empat halaman**, satu per ruangan. Hero 3D tetap sama di semuanya; yang berganti cuma konten di bawahnya.

### Bentuk barunya

```
App.tsx  →  <SiteLayout>            ← persisten, TIDAK ikut berganti
              LoadingScreen
              Navbar
              Hero  (menampung <Canvas>)
              HeroHandoff
              <main><Outlet/></main> ← HANYA ini yang di-swap
              RoomRouteSync
            </SiteLayout>

  /          → RoomContent room="Lounge"
  /office    → RoomContent room="Office"
  /meeting   → RoomContent room="Meeting"
  /function  → RoomContent room="Function"
  *          → redirect ke /
```

**Kenapa Hero ada di layout, bukan di tiap route:** `<Canvas>` hidup di dalam `Hero.tsx`. Kalau ia ikut berganti tiap pindah ruangan, konteks WebGL kantor 3D dibongkar-pasang setiap kali — kompilasi ulang 233 shader di tengah tween kamera 1400 ms. Dengan Hero di `SiteLayout`, ia tidak pernah unmount.

**Konten tiap ruangan** (`src/lib/roomContent.tsx`) — tiap ruangan punya narasinya sendiri, bukan potongan acak dari halaman lama:

| ruangan | isi | perannya |
|---|---|---|
| **Lounge** `/` | CsiHero → Manifesto → TrustedBy → Deployments → LivingArchitecture → Process → Industries → Vision → Contact | perusahaannya |
| **Office** `/office` | Office (accordion 9 layanan) | apa yang dikerjakan |
| **Meeting** `/meeting` | MeetingLead → CaseGrid → CaseStudySpotlight → Contact | studi kasus |
| **Function** `/function` | PeopleIntro → PeopleValues → TheCrew → Careers → Contact | orang & karir |

> Tabel di atas keadaan saat section ini ditulis. **Sejak 19 Agu isi Office ↔ Function ditukar** dan URL-nya memakai slug konten (`/people`, `/services`, `/work`) — lihat §4ah.

`Services.tsx` **dihapus** — isinya diserap jadi accordion 9-item di `Office.tsx`, supaya tidak ada dua sumber layanan yang tumpang tindih. `FeaturedProjects` juga dibuang karena menduplikasi `CaseGrid` di Meeting.

### `RoomRouteSync` — tiga arah, bukan satu

Berkas ini menyinkronkan URL ↔ `currentRoom`, dan ketiga arahnya menjawab hal berbeda. Ia duduk di DOM (bukan di dalam `<Canvas>`) karena butuh konteks React Router yang tidak tersedia di sana.

| arah | pemicu | kerjanya |
|---|---|---|
| 1 | `pathname` berubah | Back/forward & deep-link → `goTo(room)` |
| 2 | `currentRoom` berubah | Klik waypoint 3D → `navigate()` supaya address bar menyusul |
| 3 | `hash` berubah | `#contact` → `scrollIntoView` setelah satu `rAF` |

**Dua guard di Arah 1 yang keduanya wajib** — ini hasil resolusi konflik yang digabung, bukan dipilih salah satu:

- `!hash` (dari Nico) — jangan lompat ke atas kalau URL membawa anchor; Arah 3 yang mengurus scroll-nya. Tanpa ini pengunjung melihat halaman tersentak ke atas sebelum meluncur ke tujuan.
- `key === currentRoom` (dari branch ini) — jangan jalankan efek samping saat URL cuma **menyusul** kamera yang sudah bergerak.

Guard kedua itu bukan optimasi. Klik waypoint memicu rantai: `goTo()` → Arah 2 `navigate()` → `pathname` berubah → Arah 1 menyala lagi — semuanya **selagi tween kamera 1400 ms berjalan**. Panggilan `goTo()`-nya sendiri tertahan `if (animating.current) return` di `CameraController`, tapi `window.scrollTo` di sebelahnya **tidak ikut tertahan**: ia memaksa layout + repaint sementara `useFrame` menggerakkan kamera 60×/detik. Gejalanya perpindahan ruangan terasa **tersendat**, dan penyebabnya tidak menunjuk ke sini sama sekali (`060cf5f`).

> ⚠️ Jangan "menyederhanakan" dengan memindahkan `scrollTo` ke dalam guard `animating` di `CameraController` — guard itu juga tidak bisa membedakan "URL menyusul kamera" dari "pengguna menekan Back", dan ini urusan DOM yang memang wilayahnya di `RoomRouteSync`.

### 🐛 Query string terbuang saat pindah ruangan (`9384d69`)

Arah 2 dulu menavigasi ke `pathFor(currentRoom)` **telanjang**. `pathFor()` cuma tahu soal ruangan, jadi menavigasi ke hasilnya apa adanya **menulis ulang seluruh URL** — dan `location.search` terbuang pada perpindahan ruangan pertama.

Ketahuan lewat overlay dev ber-query yang menyala di Lounge lalu lenyap tepat saat ganti ruangan. Gejalanya menyesatkan: tampak seperti overlay-nya yang rusak. Dampak sebenarnya jauh lebih luas dari alat dev — **`?utm_source=` dari tautan kampanye ikut hilang diam-diam**, jadi kunjungan yang berpindah ruangan kehilangan atribusinya.

Perbaikannya `navigate(target + search + hash)`. Tapi perbandingannya **tetap `target !== pathname`** — murni path, tanpa search. Kalau search ikut dibandingkan, efeknya menyala tiap query berubah lalu menavigasi ke URL yang isinya persis sama: riwayat browser terisi entri kembar, dan Arah 1 ikut menyala di tengah tween kamera.

Penjaganya `roomRouteSearch.test.tsx`, dibuktikan **merah** dulu (dapat `/meeting`, search & hash dua-duanya hilang). Pakai render sungguhan + `MemoryRouter`, beda dari `RoomRouteSync.test.tsx` yang membaca teks sumber: yang dijaga di sini murni urusan routing, tidak butuh WebGL.

### "Talk to us" tidak lagi melempar ke Lounge (`7c8408f`)

Perilaku lama: dari ruangan mana pun selain Lounge, tombolnya `navigate("/#contact")`. Alasannya sempat benar — "`#contact` cuma ada di Lounge" — lalu jadi basi begitu Meeting & Function ikut memuat `<Contact />`, **tanpa ada yang berubah di Navbar**.

Sekarang ia menggulir **di tempat** kalau ruangannya punya Contact. Hanya dari Office — satu-satunya yang memang tidak punya — ia pindah ke Lounge. Memindahkan pengunjung hanya karena ia menekan tombol kontak itu mengagetkan; ia kehilangan tempatnya tanpa meminta.

Keputusannya diturunkan dari `ROOM_CONTENT` lewat `roomHasContact()`, **bukan daftar nama ruangan yang ditulis ulang di Navbar**: begitu Office diberi `<Contact />`, tombolnya ikut benar sendiri tanpa ada yang perlu ingat menyunting Navbar. Penelusurannya menyusuri pohon React element, jadi `<Contact />` boleh terbungkus elemen lain nanti.

> Norma test yang dipakai di sini: penelusuran pohonnya **ditulis ulang secara independen di test**, bukan mengimpor helper yang sama — mengimpornya cuma membuktikan fungsi itu setuju dengan dirinya sendiri.

### 🐛 Layar putih permanen di reduced-motion (tertangkap saat merge `455eae7`)

`Hero.tsx` di `join` mengembalikan cabang `if (reduced) return <StaticHero/>` — fitur comfort yang hilang di PR #4, dan itu bagus. Tapi pemantik `setSceneReady` ditaruh **sesudah** early return itu, jadi di jalur reduced ia tidak pernah dieksekusi.

Akibatnya persis yang `INVARIANTS.md` §3 dokumentasikan: `<Scene/>` tidak di-mount → `sceneReady` selamanya false → `LoadingScreen` menutupi situs **selamanya** bagi siapa pun yang menyalakan "Reduce motion" di OS-nya. Jaring pengaman 1500 ms tidak menolong; ia sendiri digerbangi `sceneReady`.

Seluruh **62 test di `join` HIJAU**. Yang menangkap cuma eslint, dengan pesan yang tidak menyebut loader sama sekali: *"React Hook called conditionally"*.

### Rasio lepas pin harus SAMA di semua ukuran

Konflik terbesar merge ini: Nico merombak `Hero.tsx` jadi *pinned scroll* (`h-[180dvh]` + `sticky h-dvh`), sementara branch ini memendekkan hero jadi `h-[70dvh]` di HP (§4p). Dua jawaban untuk masalah yang sama. **Digabung.**

Nico menemukan canvas *recede* harus selesai saat sticky **lepas pin**, bukan saat track habis — yaitu di `(track − sticky) / track`, bukan progress 1,0 — lalu menyetel rentangnya ke `[0.28, 0.44]`: 180/100 → 0,444.

Tapi tinggi sticky mobile berbeda (70dvh), dan dengan track 150dvh rasionya jadi 0,533. **Satu rentang tidak bisa benar untuk dua rasio** — di HP canvas habis memudar ~13dvh *sebelum* lepas pin, menyisakan area kosong yang masih terpaku di layar.

Track mobile diubah **150 → 126dvh**:

```
desktop  (180dvh track, 100dvh sticky) → (180−100)/180 = 0,444
mobile   (126dvh track,  70dvh sticky) → (126− 70)/126 = 0,444  ✓ sama
```

Rumus pasangannya dicatat di komentar `Hero.tsx`: **`track = sticky / (1 − 0,444)`**. Kalau tinggi sticky diubah lagi, tracknya wajib ikut — bukan disetel dengan mata.

---

## 4r. Empat Perbaikan Performa ✅ (3 Agu)

Semuanya berangkat dari **keluhan nyata** ("berat", "laptop panas"), bukan tebakan — dan tiga dari empat menemukan penyebab yang berbeda dari dugaan awal.

Empat perbaikannya: **4r-1** (MSAA), **4r-3** (matter-js), **4r-4** (mount semua ruangan), **4r-5** (chunk billiard). **4r-2** disisipkan di antaranya karena ia bukan perbaikan melainkan *keputusan* — dan justru keputusan itu yang paling mudah dibatalkan orang berikutnya tanpa sadar.

### 4r-1. 🔥 MSAA dimatikan — 30 → 60 FPS (`b55a0ab`)

`<EffectComposer>` ditulis **tanpa props**, jadi kena default library `multisampling: 8` (diverifikasi di `node_modules`). Setelan termahal di seluruh berkas itu, dan sebelumnya tidak disebut di komentar mana pun.

Terukur di M2, **dpr 2** (2,63 Mpx, mendekati layar Retina):

| multisampling | p50 | FPS |
|---|---|---|
| 8 (default library) | 33,3 ms | 30 |
| 4 | 33,3 ms | 30 ← **tidak menolong sama sekali** |
| **0** (dipakai sekarang) | **16,7 ms** | **60** ✅ |

**Bahwa 4 sama mahalnya dengan 8 berarti pilihannya BINER.** Jangan pernah "kompromi" ke 4: bayar penuh, tidak dapat apa-apa.

> ⚠️ **Di dpr 1 ketiganya sama-sama 16,7 ms** karena mentok vsync. Mengukur di jendela kecil akan menyimpulkan "tidak ada bedanya" — **salah total**. Ongkos N8AO + Bloom + MSAA itu **per piksel**; piksel naik 2,25× → frame time naik tepat 2×.

Ini juga yang menjelaskan keluhan **"berat di desktop, lancar di HP"** yang selama ini terdengar terbalik: HP merender jauh lebih sedikit piksel **dan** melewatkan waypoint + billiard (§6).

**`antialias: true` di `gl` ikut dimatikan**, dan ini terukur terpisah: mengubahnya `true → false` **tidak mengubah frame time sama sekali**. Flag itu berlaku pada *default framebuffer*, sedangkan `EffectComposer` merender ke buffer offscreen sendiri dan melewatinya — MSAA dialokasikan 2×, satu menganggur. Konsekuensinya: **menyalakannya lagi TIDAK akan mengembalikan tepi yang mulus.**

### 4r-2. Aliasing itu pilihan estetik, bukan utang teknis (`c292bef`)

Ongkos tampilannya **terlihat** dan diterima sadar setelah Keano melihat perbandingan berdampingan: **18,84% piksel berubah**, tepi plafon diagonal & pilar jadi bertangga, cincin lampu gantung pecah jadi putus-putus.

Komentar awalnya menyisakan SMAA sebagai "jalan kalau mau tepi mulus lagi" — seolah ini kompromi yang ditelan demi FPS dan menunggu diperbaiki. **Keano menyatakan sebaliknya: ia LEBIH SUKA tepi yang sedikit bergigi.** Sejalan juga dengan arah look PS1/basement.studio yang justru bersandar pada `NearestFilter` + piksel tegas — anti-aliasing yang terlalu halus melawan arah itu.

> 🚫 **Jangan menawarkan SMAA/FXAA/MSAA sebagai "perbaikan".** Laporan "tepinya kasar" nanti = konsekuensi yang sudah ditimbang, bukan bug. Dibiarkan seperti semula, orang berikutnya akan membaca komentar itu sebagai undangan membetulkan sesuatu yang memang disengaja.

### 4r-3. 🔥 Engine matter-js berdetak selamanya — biang "laptop panas" (`6912e8b`)

`Runner.run()` dipanggil langsung saat mount dan **tidak pernah berhenti** sampai unmount.

Yang membuatnya lolos dari mata: ada flag `physicsActive`, tapi ia cuma menggerbangi **penulisan transform** di `afterUpdate`. Simulasinya sendiri tetap mengintegrasikan posisi 3 dinding + N badan kata ~60×/detik walau kursor tak pernah menyentuh judulnya. Dan `<PhysicsHeading>` dipakai **2×** di `Deployments.tsx`, jadi **dua engine** berjalan bersamaan sepanjang Lounge terbuka.

Ini beban **CPU, bukan GPU** — itulah kenapa gejalanya kipas menyala & laptop panas, bukan sekadar FPS turun, dan kenapa di HP tidak terasa.

Sekarang engine baru berjalan saat hover dan berhenti lagi saat kursor pergi. Perjalanan pulangnya murni CSS transition (badan sudah diteleport ke rumah, `physicsActive` sudah false), jadi engine boleh berhenti **sekarang** tanpa menunggu transisi 0,6 s selesai.

> 💡 **Pelajaran yang bisa dipakai lagi:** flag yang menggerbangi **efek** animasi belum tentu menggerbangi **mesin**-nya. Pertanyaannya *"apa yang menghentikannya?"*, bukan *"apa yang menyembunyikannya?"*.

Sudah disisir juga dan hasilnya bersih: `CsiParticleField` digerbangi `active` (`useInView`), `NetworkField` punya `IntersectionObserver` sendiri, `WaypointLabel` rAF-nya wajar. `PhysicsHeading` satu-satunya yang bocor.

### 4r-4. Pola "mount semua ruangan" dicabut (`7c8408f`)

Dipasang di `ff4a488` untuk menghindari remount konteks WebGL tiap ganti ruangan. Alasannya **sah saat itu**: keempat ruangan masih placeholder satu paragraf, jadi menahan semuanya di DOM praktis gratis. Beberapa jam kemudian Office/Meeting/Function diisi konten penuh, dan asumsinya runtuh.

1. **Berat sepanjang waktu.** `display: none` menghentikan render & layout, tapi **TIDAK menghentikan hook**. `useScroll` tetap terpasang di window dan `useInView` tetap punya `IntersectionObserver` hidup. Dengan empat ruangan berisi, observer & listener scroll berlipat — semuanya ikut dievaluasi tiap frame scroll, termasuk milik ruangan yang tak terlihat.
2. **`id` GANDA.** `<Contact />` kini ada di Lounge, Meeting, **dan** Function, jadi `id="contact"` muncul 3× sekaligus. `getElementById` mengembalikan yang **pertama** — bisa milik ruangan tersembunyi, dan scroll ke elemen `display: none` tidak ke mana-mana. HTML memang melarang id ganda; pola itu melanggarnya **secara struktural**, bukan karena kelalaian.

**Ongkos remount WebGL dibayar SEKALI per perpindahan; ongkos observer berlipat dibayar SETIAP frame scroll, selamanya.** Yang kedua jauh lebih mahal.

> ⚠️ Kalau remount WebGL terasa mengganggu lagi, jalan keluarnya **bukan** mengembalikan pola ini — melainkan memindahkan Canvas-nya ke tempat yang tidak ikut berganti (seperti `SiteLayout`, yang sudah dilakukan untuk Hero), atau membuatnya menahan konteks GL antar-mount.

Koreksi angka yang ikut dibetulkan: komentar lama menyebut **tiga** konteks WebGL di-remount tiap ganti ruangan (`CsiParticleField`, `ManifestoField`, `DeploymentsField`). Diperiksa ulang — `DeploymentsField` **sudah tidak diimpor siapa pun**, dan dua sisanya cuma ada di section Lounge. Angka "tiga" itu ikut membesarkan ongkos yang dikira ada di sana.

### 4r-5. Chunk billiard ditunda + prefetch (`1d85a39`)

`<BilliardGame>` di-mount **tanpa syarat**, jadi setiap pengunjung membayar ~1 MB GLB (`billiard_balls` 887 KB + `cue` 94 KB) plus 16 mesh bola yang dirender tiap frame, tergeletak di lantai sebelah meja sepanjang tur. Di perangkat sentuh minigame **mati total** (§6), jadi di sana 1 MB itu murni sia-sia.

**Dua anggapan lama yang ternyata salah, dan keduanya ditulis di kode supaya tidak "dioptimalkan" orang berikutnya:**
- "World fisika hidup selama tur" — **salah**, `s.step()` sudah digerbangi `active` sejak awal.
- "`directionalLight` yang selalu ter-mount itu mahal" — **salah**, ia `layers.set(1)` sementara kamera tetap layer 0, dan three mengumpulkan lampu lewat `object.layers.test(camera.layers)`. Ia tak pernah masuk render state.

**Prefetch, bukan lazy polos.** Lazy polos memindahkan ongkos 1 MB ke detik paling buruk — tepat saat meja diklik, berbarengan tween kamera 1400 ms. Sekarang chunk-nya diunduh diam-diam saat pengunjung sampai di **Lounge** (tempat mejanya), dan baru di-mount saat `billiardActive`. Prefetch digerbangi `coarse` juga — penghematan terbesar dari seluruh perubahan ini.

Aturannya dipisah ke `prefetchRule.ts` sebagai **fungsi murni** `(ruangan, jenis pointer) → boolean` — sekalian membereskan `react-refresh/only-export-components`.

| | sebelum | sesudah |
|---|---|---|
| `Scene` chunk | 445,13 kB (gzip 166,44) | **352,32 kB** (gzip 138,50) |
| `BilliardGame` | — (ikut Scene) | chunk sendiri **93,34 kB** (gzip 28,22) |

### `ChunkBoundary` — repo punya 4 `lazy()` dan NOL error boundary

Ikut dibangun di commit yang sama, karena menunda pemuatan **menaikkan** risikonya.

`<Suspense>` menangani **sedang memuat**, bukan **gagal**. Import yang ditolak membuat `lazy()` melempar saat render, dan error render yang tak tertangkap meng-unmount **seluruh pohon** — halaman blank. Skenario nyatanya bukan jaringan putus, tapi **deploy saat ada tab terbuka**.

Dua aturan yang ditulis di kodenya:

- **Di dalam `<Canvas>` JANGAN beri fallback DOM.** R3F merekonsiliasi ke objek three; `<div>` di sana melempar error **baru** dari dalam penangkap error.
- **`Scene` WAJIB punya fallback yang memanggil `setSceneReady(true)`.** Sinyal itu datang dari `useFrame` di `Office.tsx` yang tak pernah jalan kalau chunk gagal, dan `LoadingScreen` menunggunya untuk memulai outro → **loader menggantung selamanya**. Jaring pengaman 1500 ms tidak menolong; ia baru dipasang setelah `sceneReady` true.

### 🔧 Alat ukur: `scripts/measure-frames.mjs` + `shoot.mjs`

Nol dependency, pakai Chrome yang sudah ada lewat **CDP**. Ini menjawab gagalnya `r3f-perf` — tidak perlu ada yang menyalin bacaan dari HUD.

```bash
node scripts/measure-frames.mjs http://localhost:3000/ 8 2   # url, detik, dpr
node scripts/shoot.mjs http://localhost:3000/ shot.png 2     # url, keluaran, dpr
```

Keduanya berpasangan: yang pertama mengukur **ongkos**, yang kedua merekam **hasilnya**. Keputusan yang menyentuh tampilan butuh dua-duanya — angka saja membuat orang menukar sesuatu yang tidak seharusnya ditukar (persis yang hampir terjadi di 4r-2).

> ⚠️ **WAJIB ukur di dpr 2.** Default `dpr 1` sudah mentok vsync, jadi semua setelan terlihat sama — kesimpulannya salah. Skripnya juga **mencetak renderer yang dipakai**: kalau tertulis SwiftShader/llvmpipe, itu rasterisasi CPU dan angkanya tidak mewakili laptop siapa pun.

---

## 4s. Bake Ulang Lighting ✅ (4–6 Agu) — mood baru + emission layar; **5 ruangan TUNTAS**, tone di-tuning & GLB dipangkas

Keano ingin look referensi Cycles yang gelap-kontras (kolam cahaya hangat, LED strip menyala, ambient gelap) tanpa lampu realtime. Keputusan desain yang DIKUNCI:

- **Refleksi lantai glossy DICORET** — no SSR, no env probe. Kilau lantai = jatah envmap viewer yang sudah ada. Separuh "wah" referensi memang dari refleksi, tapi ongkosnya tidak sepadan.
- **Emission 5 material layar dinyalakan** supaya spill-nya terpanggang: `iMac_Screen`/`OMon_Screen`/`MR_TVScreen` strength 3, `M_MacBook_Screen` 2.5, `M_SM_TV_Screen` 4 ("sedikit memancar" — function room tetap terang). Warna netral kebiruan (0.75, 0.82, 1.0) karena layar nanti diisi VideoTexture (§6c) — glow baked harus cocok dengan footage apapun. Glow-nya statis (tidak ikut kedip video) — trade-off standar, basement.studio juga begitu.
- **Mood per ruangan:** office & meeting & pantry TIDAK diubah; function `FR_CeilLight` 150→**100W**; lounge dapat **`LNG_FillCard`** — AREA 4×3 m, 120W, warna hangat (1.0, 0.88, 0.72) di (-0.3, 4.6, 3.25). Lampu siluman = trik film: practical yang terlihat + fill tak terlihat; gratis karena cuma hidup saat bake. ⚠️ AREA tidak di-support glTF — tidak masalah, `export_lights=False`.
- ~~**CharacterLights akan dirombak**~~ ❌ **DIBATALKAN 6 Agu** — rencananya dulu: 1 point light *motivated* per karakter (P2/P3 monitor kebiruan, Leonard pendant hangat, P4 TV/ceiling netral, P5 TV function), ide "1 layar saja per orang" dari Keano. **Gugur karena premisnya salah**: lampu ber-`layers` tidak pernah jalan di three (§6b). Karakter kini hidup dari lightmap sekitar saja — pilihan Keano setelah melihat perbandingannya.

### Status bake: ✅ TUNTAS — 212 lightmap (107 pada 5 Agu + 105 pada 6 Agu)
| Batch | Objek | Hasil |
|---|---|---|
| Lounge (`MG_Lounge_*`) | 34 | ✅ 96 samples |
| Arsitektur ter-lihat dari lounge (lantai/tembok/plafon lintas ruangan) | 24 | ✅ (1 skip → dibetulkan) |
| Office (`MG_Office_*`) | 49 | ✅ 10 menit, 0 error |
| **Meeting + function + pantry & arsitektur lintas ruangan (6 Agu)** | **105** | ✅ 96 samples |

EXR float tersimpan ganda: `/tmp/lmt_*/` + **`bake-output/{lounge,office,meeting,function,pantry}/`** (folder di-ignore, lokal saja). `.blend` sudah di-save dengan LMT8 packed.

### Batch 6 Agu — 3 ruangan sisa + koreksi mood
Bake terakhir sekaligus membetulkan hal yang baru kelihatan setelah lounge/office jadi:
- **Bayangan segitiga di tembok kiri meeting HILANG** — hasil re-bake arsitektur lintas ruangan; artefak lama dari bake yang tidak konsisten antar-batch.
- **Meeting**: downlight 150 → **80W**, warna (1.0, 0.72, 0.4) → **(1.0, 0.88, 0.72)**. Piksel yang kena clamp `÷4` turun dari **9–32% jadi <6%** — jauh lebih sedikit informasi highlight yang terpotong 8-bit.
- **Function**: warna `FR_CeilLight` ke warm lembut, watt tetap 100.
- **Pantry wing**: 3 hang light ke warm lembut + 200 → **110W**, 47 objek sekitar ikut di-re-bake. Satu hotspot yang tetap membandel **dipatch soft-cap langsung di piksel LMT8** — tambalan lokal, bukan re-bake ulang seluruh batch.
- **Tekstur kayu WPC meeting** digeser hue merah → cokelat, saturasi −25%.

**🐛 Bug ORM merge (baru, mahal kalau tidak tahu):** lightmap kayu meeting **tergabung dengan roughness** yang beresolusi 1024px. Penyebabnya exporter glTF menggabungkan channel `occlusion` + `metallic-roughness` ke satu image **kalau ukurannya sama** — dan lightmap kita kebetulan seukuran. Perbaikannya: roughness di-resize ke **512** supaya ukurannya beda dan penggabungan tidak terjadi. Ini konsekuensi langsung dari memakai slot `occlusion` sebagai kanal lightmap (§4g) — awasi tiap kali resolusi lightmap berubah.

`office.glb` sekarang **13,5 MB** (dari 7,3 MB) — backup `office.glb.bak-prebake3` disimpan sebelum batch ini.

### Batch 6 Agu sore — denoise + 3 keluhan visual dari web ✅ (commit `514e8a7`)

Setelah semua ruangan jadi, Keano menilai dari **build web** (satu-satunya sudut yang bisa dia nilai — tur tidak punya free view) dan mengajukan tiga keluhan. Ketiganya sudah dibetulkan dan **diukur pada frame web yang sama**, bukan di preview Blender:

| Keluhan | Sebelum → sesudah | Cara ukur |
|---|---|---|
| Kolam cahaya oranye mencolok di rak cubby B | R/B 1,502 → **1,433**; luma 77,1 → 75,3 | crop tembok di belakang rak |
| Cincin cahaya jelek di plafon meeting | halo 61,8 → **50,8** luma | crop plafon |
| Sisa strip oranye di tepi kanan rak cubby A | R/B 1,996 → **1,771**; maxLuma 160 → 129 | crop strip-nya langsung |

Perubahan lampunya: `OP_HangLamp_Glow` emission 5,0 → **2,0** + warna ke warm lembut; `OP_MR_CeilLight_*` 80 → **50W** + light-linking `LL_MR_CeilingBlock` yang **mengecualikan plafon** dari penerima cahaya; fixture `OP_MR_CeilLamp_*` disetel `visible_diffuse=False`/`visible_glossy=False`; `OP_CeilLight_B` 400 → **160W** + warm lembut.

**Denoise: bake 96 samples TIDAK PERNAH kena denoiser.** Itu biang "kok banyak noise" yang dikeluhkan Keano — denoiser Cycles bekerja di render, bukan di `bpy.ops.object.bake`. Solusinya melewatkan EXR hasil bake lewat node **Denoise OIDN di compositor** (node group `DenoiseLM`, sudah ada di `.blend`); noise turun **5,5×**. ⚠️ Blender 5 mengganti nama `scene.node_tree` → `scene.compositing_node_group`.

**Skrip baru `scripts/swap-lightmaps.mjs`** — saudara kandung `shrink-lightmaps.mjs`, menukar byte image lightmap di GLB tanpa menyentuh geometri (alasannya sama: encode ulang Draco itu lossy). Ini yang membuat siklus "bake ulang beberapa objek → masukkan ke GLB" jadi hitungan menit, bukan export ulang penuh.

**🐛 Tiga akar masalah yang tidak kelihatan dari gejalanya** — semuanya "setelan sudah benar tapi hasilnya tidak berubah":

1. **Cincin plafon meeting nyaris tidak bergerak** (61,81 → 59,63 luma, −3,5%) setelah re-bake 44 objek. Sebabnya `MG_MeetingWest_M_Ceiling` **tidak masuk daftar objek yang di-bake** — light-linking-nya benar, tapi hasil yang benar itu tidak pernah ditulis ke lightmap mana pun. Ditemukan lewat sapuan jarak bbox radius 3,5 m yang memunculkan **29 objek terlewat**. Pelajaran: kalau setelan sudah benar tapi angkanya tidak bergerak, curigai **daftar objeknya**, bukan setelannya.
2. **Rak cubby A tetap oranye** walau rak B sudah beres. Dua sebab sekaligus: (a) `OP_Shelf_Cubby_A` dan `_B` **berbagi mesh data, material, DAN UV** (`A.data is B.data` → `True`; di GLB node 72 & 73 menunjuk mesh 13) sehingga satu lightmap harus melayani keduanya — dan lightmap lama itu dibake dari posisi rak B saja; (b) `LM_OP_Shelf_Cubby_B` masih memakai konvensi LAMA **tanpa ÷4** sementara 188 lightmap lain sudah `LMT8_*` ber-÷4, jadi ia tampil ~**4× lebih terang**. Perbaikannya: bake A dan B terpisah, dirata-rata, lalu ÷4. Mean 0,1245 → **0,0125**.
3. **Node export-nya bukan yang diduga.** Material cubby mengekspor lightmap lewat `LM_TEX` (yang menyuapi `LM_OUT` → Material Output.Occlusion), **bukan** `LM_BakeTarget` seperti material lain. Ditemukan dengan menelusuri node tree, bukan diasumsikan — ini persis peringatan di handoff: jangan anggap 1 objek = 1 image.

⚠️ **Bake menulis ke UV layer AKTIF, bukan `active_render`** — dan node image tujuan harus **`select=True` DAN `nodes.active`** sekaligus; salah satu saja, bake diam-diam mendarat di tempat lain.

**Dua lightmap sengaja DIBIARKAN salah** (dilaporkan ke Keano, dia memilih berhenti di sini): `LM_MG_Office_ODesk_White` (mean 0,0242, R/B 2,124) dan `LM_MG_Lounge_M_PoolTable_Body` (mean 0,1058, R/B 1,944) masih memakai konvensi 4× yang sama seperti bug #2 di atas. Keduanya ada di ruangan yang Keano keluarkan dari lingkup bake. Kalau nanti terlihat terlalu terang, ini tersangkanya.

**`office.glb` final: 13,02 MB.** Disiplin verifikasi tiap kali menukar byte: 2453 accessor **byte-identik**, 0 berbeda; jumlah mesh 240 / material 261 / image 246 / node 660 / texture 304 tak berubah; hanya image yang diniatkan yang berubah; clamp ÷4 mengenai **0,00%** piksel; diff lounge mean 0,004.

### Beda resep vs bake lama (§4g) — dan kenapa
- **Semua objek dibake** (kecil pun), bukan hanya ≥8 m² — mood gelap butuh benda kecil ikut gelap; objek yang cuma dapat ambient akan mengambang terang.
- **166 mesh era baru belum punya UV2** → `smart_project` per mesh (66°, margin 0.02) ke layer `Lightmap`. ⚠️ `Export_Merged` di-EXCLUDE dari view layer — `lc.exclude=False` dulu, kembalikan setelahnya, atau semua ops gagal "not in ViewLayer".
- **Pass DIFFUSE direct+indirect TANPA color** (murni cahaya) — sama seperti lama.
- **Material lintas objek diduplikat DI DEPAN** (`mn__objname`), bukan setelah ketahuan saling timpa (kasus bohlam billiard & M_GlassFrame; 9+3 material).
- **Karakter (5 rig) dibiarkan visible saat bake** = pelempar bayangan, bukan penerima (SkinnedMesh tidak dibake). Bola billiard tidak ada di .blend (aset Three.js terpisah) — isu bayangan hantu gugur.
- **Progress ditulis ke `/tmp/bake_progress.json` per objek** + EXR di-save per objek. Bake >2 menit MEMUTUS socket MCP ("No data received") padahal Blender jalan terus — pantau lewat file progress / `ps aux` (CPU tinggi = masih bake), JANGAN kirim perintah bertubi (cuma antre). Selesai → reconnect N-panel.

### Preview "lihat hasil bake" (tanpa export)
Override per material: `UVMap(Lightmap) → LM_BakeTarget → Mix MULTIPLY dengan Base Color → Emission`, strength 1, semua lampu `hide_render`, world 0. ⚠️ Blender 5: socket `ShaderNodeMix` RGBA dicari via `identifier` (`A_Color`/`B_Color`/`Result_Color`) — `inputs['A']` mengembalikan socket Float yang SALAH sambung. ⚠️ Material emissive asli (bohlam/layar) harus dikembalikan emission-nya di mode preview, kalau tidak bohlam tampak mati. ⚠️ WAJIB restore penuh sebelum bake batch berikutnya — bake dalam mode preview = cahaya dobel.

**Membaca preview:** render diffuse-only SELALU tampak lebih gelap dari hasil web — tidak ada specular (lantai hitam mengkilap = hampir nol diffuse), ambient, envmap, bloom, exposure. Verifikasi dengan render `view_settings.exposure=+1.5`: kalau informasi cahayanya ada (sofa kebaca, mozaik hidup), bake SEHAT — kalibrasi terang final di viewer (slider exposure / lightMapIntensity), BUKAN re-bake. Keano sempat menilai "masih gelap" dari render tanpa exposure — versi +1.5 stop menjawabnya.

### Tes di web (5 Agu, malam)
Wiring export: `UV Lightmap → LM_BakeTarget → glTF Material Output.Occlusion` → `occlusionTexture texCoord=1` (kontrak §4g/§4l tak berubah — `Office.tsx` deteksi `ao.channel===1` tetap jalan, **kode web NOL perubahan**). Verifikasi GLB: 140 material texCoord=1, 96 AO asli utuh.
- LMT float 32-bit bikin GLB **138 MB** → konversi **LMT8** (8-bit, clamp 0-1, downscale 2048→1024, `Non-Color`) → **104 MB**. Masih 12× versi lama (8.5 MB) — **SENGAJA belum dioptimasi**; percuma mengecilkan file kalau lighting masih bisa berubah. Optimasi final nanti: atlas per ruangan + Draco + WebP (§4g).
- ⚠️ Clamp 0-1 di LMT8 memotong nilai >1 (bohlam 51.8) — di permukaan penerima efeknya kecil (mayoritas <1), tapi kalau highlight baked terasa tumpul, ini tersangkanya.
- `office.glb` produksi di-backup: `public/3d/models/office.glb.bak-prebake`. **Belum di-commit** — masih fase tes.
- **Hasil di web BELUM di-review Keano** (pulang duluan) — item pertama besok.

### Tuning tone di viewer ✅ (5 Agu) — resep "dibagi 4, dikali 4"
Export pertama 5 Agu gelap: EXR menyimpan cahaya HDR (hotspot lampu ~36) tapi PNG/WebP 8-bit memenggal semua nilai >1.0. Solusinya nilai lightmap **dibagi 4 di skrip export Blender** (in-memory, EXR asli tak disentuh) lalu **dikalikan 4 lagi di viewer** — hotspot 1.0–4.0 selamat; >4.0 (13 dari 144 image) tetap terpotong, kompromi diterima. ⚠️ Pembagi di skrip export dan pengali di `Office.tsx` **HARUS sama** — ubah satu, ubah dua-duanya.
- `Office.tsx`: `LIGHTMAP_INTENSITY = 5`; lightmap di-set `SRGBColorSpace` (GLTFLoader menandai occlusionTexture linear → midtone terangkat gamma, pucat keabu-abuan)
- `Scene.tsx`: exposure 1.0→**1.6**; ambient 0.03→**0.18 warm `#ffbd75`**; +`HueSaturation saturation 0.3` + `BrightnessContrast 0.03/0.08` setelah Bloom — ACES pada exposure tinggi menekan saturasi, dinding cream jadi pucat kelabu; dua pass murah ini mengembalikannya di level frame tanpa melawan lightmap

### 🐛 "Web jadi berat setelah bake ulang" — DIAGNOSA + FIX ✅ (5 Agu siang)
Gejala Keano: FPS drop saat jalan-jalan, laptop panas, tab lain lemot. **Bukan tone tuning-nya** (post-processing digabung satu pass) — biang: bake ulang meledakkan tekstur **91 → 179** (lightmap 36 → **124** terpisah; Office sendiri 54), memori GPU **336 → 508 MB**. Cocok dengan gejala = memory pressure di unified memory M2. Ukuran headless dpr 2: `/office` p95 33 ms + worst 350 ms (thrash bind tekstur), lounge/function mulus.

**Fix: `scripts/shrink-lightmaps.mjs`** — ciutkan 123 lightmap ke 256px (lossless WebP) **di level byte kontainer GLB**. Hasil: GPU **508 → 315 MB** (LM 236 → ~33 MB), file 6.4 → 6.9 MB, worst frame `/office` 350 → 83 ms. Lightmap aman di 256px karena low-frequency. Direview visual Keano ✅.

Tiga jebakan yang dilalui (mahal, jangan diulang):
1. **`gltf-transform resize` CLI melewati tekstur WebP DIAM-DIAM** (hanya dukung PNG/JPEG) — run "sukses" dengan nol perubahan.
2. **Encode ulang Draco = lossy walau setelan maksimal.** Pipeline gltf-transform API (NodeIO) men-decode Draco dan wajib encode ulang saat menulis; grid kuantisasi baru ≠ milik exporter → UV bergeser menyeberang padding island lightmap → **segitiga terang di panel rak cubby** MESKI lightmap rak itu tak diciutkan. `quantizeTexcoord: 14` tidak menolong. Solusi final: operasi di level kontainer GLB (JSON + BIN chunk), hanya byte image ditukar, bufferView Draco tersalin **byte-identik** (diverifikasi SHA-256).
3. **Nama LM hidup di `images`, bukan `textures`** — GLB ini pakai `EXT_texture_webp` dan tekstur-teksturnya anonim; filter by `texture.name` dapat nol.

Sisa yang sengaja belum: dedup 29 image kembar (hemat kecil setelah LM mengecil; butuh utak-atik referensi JSON), atlas per ruangan (fix sejati thrash bind — kerjaan Blender, bareng bake 3 ruangan sisa). **p95 33 ms di `/office` & `/meeting` MASIH ADA setelah shrink** — bukan dari tekstur; kesamaan dua ruangan itu karakter beranimasi (skinning) → isu terpisah, belum diselidiki.

### NEXT (urutan)
1. ~~Review web bareng Keano~~ ✅ 5 Agu — tone di-tuning (lihat atas), GLB shrink direview OK
2. ~~Bake 3 ruangan sisa dengan pipeline yang sama~~ ✅ **6 Agu** — meeting/function/pantry selesai, tidak ada lagi lightmap lama
3. ~~Kalibrasi exposure/lightMapIntensity/bloom di viewer~~ ✅ 5 Agu
4. ~~Rombak `CharacterLights.tsx`~~ ❌ **DIBATALKAN 6 Agu** — bukan ditunda, **gugur permanen**. Lampu ber-`layers` TIDAK PERNAH jalan di three r185: uji `light.layers.test(camera.layers)` — pengujinya **kamera**, bukan objek yang disinari, jadi lampu di layer 1 tidak pernah ikut terkumpul. `CharacterLights.tsx` dihapus, `Scene.tsx` menyimpan komentar alasannya. Keano melihat perbandingannya dan **memilih karakter tanpa lampu** — tabel *motivated lighting* di atas tinggal catatan sejarah
5. ~~Jalankan ulang `shrink-lightmaps.mjs`~~ ✅ **sudah** — diverifikasi langsung dari GLB: **188 dari 188** lightmap `LMT8_*` sudah 256px, tidak ada yang tertinggal. Sisa optimasi: atlas per ruangan + dedup 29 image kembar + audit pre-export (§4d)
6. Selidiki p95 33 ms di `/office` & `/meeting` (dugaan: skinning karakter)

---

## 4t. Panel "Under Maintenance" ✅ (8–9 Agu) — lubang pintu buntu ditutup, lalu jadi interaktif

Lubang pintu di sisi **timur laut Office** tidak menuju ke mana-mana dan terbaca sebagai lubang hitam. Ditutup `src/components/canvas/MaintenanceHologram.tsx` (commit `819ae9f`): papan catur **dither Bayer 4×4 putih** dengan tulisan UNDER MAINTENANCE yang menyatu ke dalam pola yang sama. `ShaderMaterial` mentah, aditif, ikut sapuan reveal (§4m).

### Empat hal yang mahal didapat

- **🔥 `renderOrder` WAJIB 0, jangan dinaikkan.** Sempat dipasang 2 dengan alasan "mengunci urutan biar tidak bergantung urutan traverse GLB" — dan dari Lounge hologramnya **terlihat menembus tembok**. Sebabnya bukan depth yang salah: partisi yang menghalangi ikut antrean transparan dengan `depthWrite` mati, jadi ia tidak pernah menulis depth dan `depthTest` hologram tidak punya apa pun untuk ditolak. Yang tersisa cuma urutan gambar — dan three.js mengurutkan antrean transparan pakai **`renderOrder` sebagai kunci utama, jarak baru kunci kedua**. Pengurutan jarak bawaan sudah benar; menguncinya justru mematikannya.
  > Kalau nanti ada material transparan lain yang "tembus", **cek `renderOrder` sebelum mencurigai depth.**
- **Keterbacaan dither berbanding TERBALIK dengan jumlah tangga kuantisasi.** Di 16 tangga selisih antar tangga cuma 6% dan mata membacanya sebagai gradien halus. Turun ke **4 tangga** selisihnya 25% dan papan caturnya jadi tekstur betulan. Konsekuensinya tiap suku intensitas harus ditimbang supaya rentangnya **melintasi batas tangga** — yang tidak melintasi 0,25 jatuh rata di satu tangga dan berhenti nge-dither sama sekali. Basis **0,125** dan teks **0,625** dipilih karena ×4 keduanya jatuh tepat di 8/16 sel Bayer, jadi teks = papan catur yang sefase & seukuran dengan latarnya.
- **Satu sel dither harus lebih besar dari ~1 px CSS.** Bayer 4×4 pada 1 px perangkat = 2×2 px CSS di Retina, di bawah ambang mata dan terbaca sebagai butiran, bukan pola. `DITHER_PX = 2`.
- **GAIN wajib turun dari 1,5 saat warnanya jadi putih.** Putih linear (1,1,1) pada 1,5 masuk jauh di atas ambang Bloom 0,95 (§4s): titik dither yang bersebelahan saling menutup dan polanya berubah jadi kabut rata.

**Turunan aturan tangga:** apa pun yang bobotnya sepadan dengan satu tangga kuantisasi akan **diperbesar jadi bercak**. Itu yang membunuh chevron, scanline, bar sapuan, dan kedip — semuanya sempat ada lalu dicabut, masing-masing ditinggali komentar berisi alasan + syarat kalau mau kembali. `uTime`/`useFrame`/`useReducedMotion` ikut dihapus karena jadi kode mati; **kalau geraknya dihidupkan lagi, penjaga reduced-motion-nya wajib ikut hidup lagi.**

`revealSweep.ts` kini membuka `X_FROM`/`X_TO`/`BAND`/`uProgress` supaya material non-standard bisa ikut tersapu — `prepareRevealSweep()` hanya menjangkau `MeshStandardMaterial`, jadi tanpa ini hologramnya sudah tampil utuh di tengah kantor yang belum terbentuk.

### Jadi interaktif (9 Agu, commit `2302cd5`)

Revisi tampilan atas penilaian Keano "kok jelek". **Pendar tepi putih tebal dihapus TOTAL** — dua tahap, karena diturunkan jadi pita 4 cm pun masih terbaca "tepi putih". Batas panel sekarang **kusen pintunya sendiri**; jangan gambar bingkai lagi, apa pun di tepi dibaca sebagai cacat rendering.

Teks pindah ke **plane terpisah** supaya bisa maju ~44 cm saat hover (lerp eksponensial; rest 5 mm di depan panel = tampilan diam tidak berubah). Klik memicu **glitch 2 burst** (0–200 & 300–480 ms) yang satu kisi & irama dengan `CharacterGlitch` (§4u) — irisan 0,09 m, re-roll 24 Hz, hash sama — tapi levelnya milik panel. Dua resep yang **gagal** dan kenapa:

| Percobaan | Kenapa gagal | Yang dipakai |
|---|---|---|
| Geser-UV kecil | Panel cuma ~90 px di layar & papan caturnya **ruang-layar**, jadi geseran UV pada bidang rata = nol | `SHIFT_UV` 0,16 + **discard** di luar 0..1 (siluet ikut koyak — padanan geseran `gl_Position` karakter) + fase Bayer meloncat per irisan + stretch ±40% |
| Flash naik-saja (resep karakter) | Di panel aditif nyaris transparan, menambah terang = bar 3–6× di atas bidang yang diam → "kaya tempelan" | Level **dua arah**: separuh irisan gate ambruk ~nol (hologram bolong), lift diredam setangga (0,20–0,45), brownout global 0–35% per re-roll, + jitter pasca-kuantisasi |

**Gerbang interaksi:** Office saja + `pointer: fine` + `!billiard`. Raycast panel hidup-mati lewat prop, **tanpa `stopPropagation`**, dan klik **mengalah** kalau `hoveredWaypoint` terisi (menjaga alasan lama `NO_RAYCAST`, §4k). Plane teks `NO_RAYCAST` permanen — penangkap hover yang ikut bergerak = hover berkedip. Reduced motion: teks snap, glitch mati.

**Verifikasi:** `?holo=1` (dev, memaksa) atau `scripts/drive.mjs` move+click di CSS ~(1325, 310) dari `/office`.

---

## 4u. Glitch Karakter saat Idle ✅ (8–9 Agu)

Setelah **8 detik tanpa input**, kelima karakter sesekali "rusak" 130–240 ms (burst tiap 4–9 dtk). `src/components/canvas/CharacterGlitch.tsx`, commit `889d331`.

**Di karakter saja, bukan fullscreen** — keputusan Keano setelah diskusi: glitch fullscreen saat idle terbaca "website rusak", dan menambah pass render justru **pada saat yang sedang direncanakan untuk dihemat** (§4s / rencana idle GPU).

- **Vertex:** irisan horizontal (band Y **dunia** 0,09 m — bukan model-space, rig Mixamo membawa skala di matrix) digeser di ruang NDC ±0,018.
- **Fragment:** posterize **4 tangga** + Bayer sel **2 px** — angka **disamakan** dengan `MaintenanceHologram` supaya satu bahasa visual. Kalau hologram berubah, ikutkan.
- **Flash putih** (revisi "kurang noticeable"): irisan yang tergeser diangkat ke putih 0,35–0,70 **sebelum** kuantisasi — baju karakter gelap, geseran tanpa flash tenggelam. Putih, bukan merah/cyan: merah sudah jadi bahasa galat fatal di `revealSweep`, dan hue bikin dither melebur (pelajaran §4t). Puncak ≈**0,86**, sengaja di bawah ambang Bloom 0,95 supaya irisan tidak ikut mekar.

**Kontrak urutan (penting):** patch `onBeforeCompile` harus terpasang **sebelum** `prepareRevealSweep` — sweep menyimpan lalu memulihkannya saat dispose. Itu dijamin karena `CharacterGlitch` adalah **anak `Office`** (layout effect anak jalan duluan). **Jangan pindahkan ke `Scene.tsx` sebagai saudara `Office`.** Pola anti-StrictMode-nya sama dengan §4m: patch + uniform module-level, originals di `WeakMap` module-level (scene di-cache `useGLTF`, bisa lintas mount).

### 🐛 Glitch menembus kaca — dibetulkan 9 Agu (`f208268`)

Dari Lounge, burst karakter Function & Meeting tampil jelas di balik kaca: kedipan putih di sudut mata yang menarik perhatian ke ruangan yang **bukan** sedang ditonton. Kaca transparan `depthWrite` mati, jadi tidak ada cara "menyembunyikan di baliknya" — yang diandalkan **tata letak**: fade per-vertex berdasar jarak ke `VIEWS[currentRoom].tgt` (uniform `uGlitchCenter`, di-copy tiap frame via `getState`), penuh ≤5 m, nol ≥8 m.

> ⚠️ **Acuannya TARGET pandangan, bukan posisi kamera.** Percobaan pertama pakai `cameraPosition` gagal: kamera Lounge mundur jauh, Leonard ~8–9 m jatuh se-rentang dengan karakter lintas-ruangan (~10 m) dan ikut ter-fade bersih. Jarak ke `tgt` memisah tegas — se-ruangan 2–4 m vs lintas 11–18 m.

**Gating:** `useReducedMotion` → mati; ikut mati bersama `FrameloopGate` (semua logika di `useFrame`; listener input cuma menulis timestamp — pelajaran §4r-3). **Verifikasi:** dev-only `?glitch=1` memaksa efek nyala terus → `shoot.mjs`; pixel-diff **0,47%**, seluruhnya di karakter yang terlihat, scene lain nol. Fade lintas-ruangan diverifikasi screenshot paksa di keempat ruangan.

---

## 4v. Kantor Merespons Kursor & Perpindahan ✅ (10 Agu)

Empat efek yang sama-sama menjawab **"ruangannya terasa seperti foto, bukan ruangan"**. Semuanya menumpang jalur yang sudah ada: **nol pass render tambahan, nol draw call baru** di jalur postprocessing.

### 4v-1. Kamera mengekor kursor (`8a6d7cf`)

Gerakan kursor menggeser kamera sedikit ke arah berlawanan, lerp eksponensial supaya berhentinya lembut dan tidak menyentak mengikuti pointer mentah. `mouseParallax.ts` + `CameraController.tsx`.

**Pergeserannya dihitung di RUANG KAMERA, bukan ruang dunia** — offsetnya disusun dari sumbu kanan & atas kamera saat itu, jadi ia benar di keempat ruangan **tanpa satu pun angka yang perlu disetel per ruangan**. Sudut pandangnya tidak ikut berputar; hanya titik matanya yang bergeser, sehingga bidikan yang sudah diukur per-ruangan (§4k) tetap utuh. Mati di `pointer: coarse` (tidak ada kursor untuk diikuti) dan saat reduced motion.

`mouseParallax.ts` murni fungsi tanpa React/three supaya bisa diuji tanpa merender apa pun — 7 test menjaga arah, batas amplitudo, dan peluruhannya.

> ⚠️ **Gotcha test:** `PerspectiveCamera.lookAt()` cuma menyetel quaternion — `matrixWorld` masih identitas sampai render pertama. Tanpa `updateMatrixWorld(true)`, test membaca sumbu kanan yang salah dan **lulus karena alasan yang keliru**.

### 4v-2. HoverScan — selubung dither + label pengekor kursor (`70374c3`)

Benda interaktif (meja billiard) mendapat selubung dither saat di-hover, plus label yang mengekor kursor lewat jalur `hoveredLabel` yang sama dengan waypoint (`hoveredWaypoint` di store **diganti nama** jadi `hoveredLabel` — pemakainya bukan cuma waypoint lagi). Penjaga "jangan hapus kursor yang baru dipasang pihak lain" ikut diperluas ke `MaintenanceHologram`.

> 🔥 **R3F memanggil `onPointerMove` SEKALI PER PERPOTONGAN, bukan sekali per gerakan mouse.** Satu gerakan di atas meja billiard menghasilkan rentetan panggilan dengan `e.object` berbeda-beda (`…M_PoolTable_Body` → `…M_Alu_Trim` → `Rug_Lounge009` → `MG_Office_M_Floor`). Akibatnya pola "set kalau kena, clear kalau tidak" **diam-diam rusak**: panggilan pertama menyalakan hover, panggilan berikutnya langsung memadamkannya. Gejalanya efeknya **tidak pernah terlihat sama sekali** padahal raycast-nya benar.
>
> Obatnya: ambil keputusan dari **seluruh sinar** — `for (const hit of e.intersections)`, bukan dari `e.object` panggilan ini. Bonus: gerbangnya jadi identik dengan `onClick`. `over`/`out` tidak bisa dipakai karena bagi R3F **seluruh kantor adalah satu event object**. ⚠️ `<Bvh firstHitOnly>` TIDAK menolong — ia membatasi hit per-mesh, bukan lintas-scene.

### 4v-3. Sobekan transisi (`transitionTear.tsx`)

Irisan layar tergeser saat kamera terbang antar ruangan, pulih sendiri saat tiba.

- **Amplitudo digerakkan LAJU kamera, dihitung dari `basePos` — bukan `camera.position`.** Kalau dari `camera.position`, parallax kursor (§4v-1) akan terbaca sebagai laju dan efeknya menyala saat diam.
- **Wajib efek PERTAMA di rantai postprocessing.** Kalau belakangan, pita yang tergeser mengambil piksel yang **belum di-grade**.

### 4v-4. Debu melayang (`Dust.tsx`)

Bintik melayang di Lounge & Office. Kotak partikelnya **mengekor kamera**, bukan didefinisikan per-ruangan — kerapatan jadi seragam tanpa angka baru tiap denah berubah.

> 🔥 **`<shaderMaterial uniforms={obj} />` di R3F TIDAK menyimpan objek uniform yang kita beri.** `applyProps` punya cabang khusus untuk `uniforms`: ia `Object.assign` isi tiap uniform ke pembungkus `{ value }` milik material sendiri, dan **semua rujukan bersama putus**. Gejalanya debu tidak muncul sama sekali, **tanpa satu pun error di console** — `uRevealProgress` cuma dapat salinan nilai saat mount (0) sementara revealSweep menulis ke objek asli → semua fragmen di-discard; `uTime` beku; `uCam` beku di (0,0,0) sehingga kotak wrap mengelilingi titik asal dunia.
>
> **Obatnya:** kalau material perlu **berbagi** objek uniform atau ditulis tiap frame dari `useFrame`, bangun `new ShaderMaterial({ uniforms })` di `useMemo` lalu pasang lewat `<primitive object={mat} attach="material" />` (+ dispose di cleanup). Itu pola yang sudah dipakai `MaintenanceHologram` — dan sebabnya hologram tidak pernah kena bug ini. Butuh ~1 jam bisect shader untuk sampai ke sini karena kodenya sendiri terlihat benar; tekniknya: override output shader jadi konstanta, lalu ganti satu per satu dengan tiap faktor peredup untuk menemukan yang nol.

**INVARIANTS.md** ikut diperbarui: patch `onBeforeCompile` sekarang **tiga** yang berbagi material sama, dan kontrak urutan (glitch & hover-scan **wajib anak `Office`**, bukan saudara di `Scene`) ditulis eksplisit.

---

## 4w. Hero Mengalir Tanpa Pin ✅ (10 Agu) — HP dulu, lalu desktop menyusul

### 4w-1. HP: tiga laporan, satu sebab (`10b0126`)

Hero dipaku (sticky) dan disurutkan (opacity + scale) persis seperti di desktop, padahal **di layar sempit tidak ada yang perlu dipaku maupun disurutkan**:

| Laporan | Sebab |
|---|---|
| "40% layar kosong" | Hero 70dvh dipaku di dalam track 126dvh → 30dvh badan track tak berisi apa pun sebelum konten mulai |
| "3D kepotong kiri-kanan" | `scale: 0.96` mengecilkan canvas **di tempat**, menyisakan lajur gelap di kedua tepi |
| "scroll tersendat" | Menganimasikan opacity+scale sebuah layer **WebGL seukuran layar** tiap frame scroll = pekerjaan compositing termahal di halaman ini |

Di HP hero kini **mengalir**: tanpa sticky, dan pembungkus canvas tidak menerima style transform apa pun. `useNarrowViewport` (767,98px — **sama dengan `md:`**) yang memisahnya: satu sumber kebenaran, karena kalau JS dan CSS berbeda ambang, ada jendela lebar di mana keduanya tak sepakat koreografi mana yang sedang jalan.

`HeroHandoff` jadi `hidden md:block`. Seam itu menutupi canvas yang sedang surut; **tanpa surut ia cuma strip 40px yang menimpa bagian bawah kantor** — itu sebabnya "3D dapat 70%" tidak tercapai dengan menaikkan tinggi hero saja. Riwayat percobaan `-mt-10 h-10` ditulis di berkasnya supaya tidak diulang: **sumbangan nol ke ALIRAN halaman bukan berarti nol ongkos ke YANG TERLIHAT.**

Menyusul dari situ, aturan **padding tipis untuk section pertama tiap ruangan** — section itulah yang kini bersebelahan langsung dengan kantor 3D, dan `pt-24`/`pt-32` bawaannya terbaca sebagai celah menganga. `CsiHero`, `MeetingLead`, `Office`, `PeopleIntro` semua `pt-6` di HP dan kembali ke nilai lamanya di `md:`.

Judul `CsiHero` turun ke `text-4xl` di layar **pendek** (`max-height: 700px`) — patokan **tinggi, bukan lebar**: hero mengambil 70dvh, jadi judul cuma kebagian 30dvh; di 640px tinggi, 4 baris `text-5xl` persis sepanjang jatahnya dan "Intelligence." terpotong separuh.

### 4w-2. Desktop ikut bentuk HP (`31a032d`)

Dilaporkan dari desktop: *"3D masih mengecil dan tersendat saat scroll ke konten, dan masih ada radius antara 3D dan halaman konten"*. Ketiganya satu akar — **landasan pin 80dvh** (track 180dvh + viewport sticky 100dvh):

- **mengecil** — `scale: 0.96` + `y: -20` di pembungkus canvas menyisakan lajur gelap di tepi kiri, kanan, atas.
- **tersendat** — scale itu membuat `react-use-measure` mengukur ulang, jadi `<Canvas>` **re-render tiap frame scroll**.
- **radius** — seam `HeroHandoff` (`md:rounded-t-3xl`, ditarik `-mt-32`) hanya masuk akal sebagai panel terangkat **di atas canvas yang surut**.

Sekarang **satu koreografi untuk semua lebar layar**: hero mengalir bersama halaman, yang beda cuma tingginya (70dvh di HP, setinggi layar di ≥768px). **Seam dicabut seluruhnya** — `HeroHandoff.tsx` dihapus. Ikut kena: `useScroll`/`useTransform`/`useNarrowViewport` di `Hero` jadi tak terpakai, `motion.div` pembungkus canvas turun jadi `div` biasa, dan ref sticky terpisah untuk `heroInView` dilebur (track = viewport sekarang — **kalau pin dihidupkan lagi, pemisahan ref-nya wajib ikut kembali**).

> **INVARIANTS §7 TIDAK ikut gugur** meski pemicu spesifiknya (surut scroll) hilang: aturan "frameloop lewat prop, bukan imperatif" tetap berlaku karena re-render `<Canvas>` masih bisa datang dari resize, ganti route, atau StrictMode (§4r).

**Terverifikasi lewat CDP dengan GLB benar-benar dimuat** — desktop 1440×900: gap 0px, border-radius 0px, seam tidak ada, style pembungkus `null`, lebar konten == lebar hero, tanpa overflow horizontal. HP 393×852: tidak berubah (hero 596px = 70% layar, gap 0).

Test yang dulu menjaga "surut tetap terpasang di layar lebar" **dibalik jadi penjaga keadaan baru, bukan dihapus** — kode yang dicabut itu BENAR di desktop, ia tidak akan pernah terlihat salah saat dibaca, dan mengembalikannya lolos typecheck maupun lint.

---

## 4x. Menu Layar Penuh di Navbar ✅ (10 Agu)

Adaptasi `#menu-overlay` dari **situs cogniti yang sudah tayang**, menggantikan kartu dropdown kaca kecil: panel gelap satu layar penuh berisi daftar ruangan besar, "Talk to us", tautan sosial, dan jam tiga zona waktu Indonesia. Commit `a408c35`.

**Tiga hal beda dari aslinya**, semua ada alasannya: daftarnya **RUANGAN**, bukan bagian halaman (INVARIANTS §6 — di perangkat sentuh, tautan ruangan di navbar satu-satunya jalan pindah ruangan); **tanpa efek scramble huruf** (menunya `md:hidden`, tidak ada hover di sana); dan tanpa baris logo + tombol tutup sendiri (pill navbar mengambang di atas overlay, di posisi yang sama).

**Tombolnya morf, bukan crossfade.** Ikon burger tertutup → "— Close." terbuka: garis tengah burger dan strip di depan kata itu **satu elemen yang sama** dan tidak pernah menghilang; garis atas & bawah meluncur menyatu lalu memudar. Urutannya dibalik menurut arah — membuka: garis melipat dulu lalu kata menyingkap; menutup: kata pergi dulu lalu garis mekar. Lebar katanya `0 ⇄ auto`, bukan angka piksel yang akan basi kalau fontnya berganti. `min-w-11` karena tombolnya terukur cuma 26px lebar; kelebihannya tumbuh ke kiri jadi ikonnya tidak bergeser.

### 🐛 Menutupnya ngeflick — empat sebab terpisah

| Sebab | Perbaikan |
|---|---|
| Opasitas memakai `easeOutExpo` — separuh hilang dalam ~30 ms | Kurva **FADE** (`easeInOutCubic`) khusus opasitas; `EASE` tetap untuk yang **bergerak**. Terukur: opacity turun rata, 0,5 tepat di paruh durasi |
| Isi menu ikut terbang 28px saat panelnya memudar | Label keluar `out` yang **sengaja tidak dimiliki varian anak mana pun** → panel memudar sebagai satu keping, isinya diam (terverifikasi: `top` item pertama tidak bergerak sepiksel pun selama 450 ms) |
| Chrome pill & jam berganti **di frame tombolnya ditekan**, di atas panel yang masih terlihat | Keduanya ikut `overlayUp` yang dimatikan `onExitComplete`, bukan timer yang ditebak |
| Kelas `border` disulap on/off → isi pill bergeser 1px | Border **selalu** terpasang; yang berubah warnanya |

**Jam tiga zonanya digerbangi "menu terbuka" dan bangun di pergantian menit**, bukan `setInterval(…, 1000)` selamanya seperti aslinya — pola **mesin-berdetak-walau-tak-terlihat** itu persis yang jadi biang "laptop panas" 3 Agu (§4r-3). 5 test menjaga **KAPAN ia berdetak**, bukan jam berapa yang tampil (`useZoneClocks.ts`).

Tautan sosial pindah ke `src/data/socials.ts`. `sections/Contact.tsx` **sengaja belum ikut**: ia masih punya daftarnya sendiri dengan `TODO(content)` yang belum ditutup, dan mengubahnya = mengubah isi halaman yang tampil.

---

## 4y. Kantor Bernapas saat Ditinggal ✅ (11 Agu) — idle / ambient life

Commit `c77fd3b`. Yang lain menambah gerakan; batch ini sebagian besar justru **menguranginya**, karena bacaan yang dikejar adalah *"kantornya ditinggal"*.

- **`idleClock.ts`** — satu set listener DOM untuk seluruh app, **ref-counted**, tiap pemakai memilih ambangnya sendiri. Pemasang **kedua tidak boleh me-reset** jam yang sudah berjalan. `CharacterGlitch` (§4u) ikut ke sini, tracker sendirinya dicabut.
- **`LedBreath.tsx`** — LED strip lantai turun **16%** setelah idle 8 dtk; dua gelombang yang **tidak sekelipatan** supaya tidak terbaca metronomik. Base **DIBACA DARI MATERIAL**, bukan dioper sebagai konstanta. Halusnya disengaja: tumpahan cahayanya di lantai sudah **di-bake** dan tidak ikut bergerak, jadi napas yang dalam terbaca "render rusak", bukan "lampu berdenyut".
- **`ScreensSleep.tsx`** — layar meredup ke 5% + video pause setelah **45 detik, bukan 8**. TV ada untuk ditonton, dan menonton berarti diam; tidur 8 detik mematikan video tepat pada orang yang paling menghargainya.
  > ⚠️ **Pause layar WAJIB lewat `wanted` di `ScreenVideoGate`** (§6c). Kalau peredup memanggil `pauseScreenVideos()` sendiri, efek gerbangnya tidak dijalankan ulang saat bangun dan **videonya mati permanen**.

**Nol patch `onBeforeCompile` baru** — INVARIANTS §5 tidak bertambah panjang.

### 🐛 FIX 4 di `Office.tsx` ternyata mati sejak lama

Nama material di GLB **berakhiran nama mesh**: `M_LEDStrip__MG_Office_M_LEDStrip`. Jadi `=== "M_LEDStrip"` **selalu meleset tanpa error**, dan strip berjalan pada **8** material dari GLB, bukan 3 yang tertulis di kode. Matcher dibetulkan lewat `ledStrip.ts` (+ test yang menjaga akhiran exporter kena dan `MR_MicPod_LED` tidak ikut terseret); konstantanya **disetel ke 8 supaya pembetulan itu nol perubahan tampilan**. Menurunkannya ke 3 sekarang jadi keputusan look yang terpisah — kenopnya baru pertama kali benar-benar hidup.

> Berlaku umum: **nama material glTF bisa dapat akhiran nama mesh.** Cocokkan dengan prefix/akhiran, jangan `===`.

**Terverifikasi di Brave** (dpr 2, 2880×1800): crop strip berayun 0 → **−3,2%** saat idle dan tidak pernah naik, kontrol jauh datar ±0,02%, kembali ke −0,01% pada gerakan pertama; layar **−12,8%** di 50 dtk dan masih utuh di 15 dtk.

> 🚫 Opsi **"frame texture: vignette + grain" DITOLAK Keano** — jangan ditawarkan atau dibangun lagi.

---

## 4z. Section Konten Dirombak + Penjaga Overflow HP ✅ (9 Agu — rekan tim)

- **`Industries`** (`31eb599`) — strip marquee diganti sticky heading + grid kartu sektor *core/also*, mengikuti pola `LivingArchitecture`. **`Vision`** — daftar misi datar diganti `MissionShowcase` (kartu gambar), dan latar scatter `NetworkField` **dibuang: canvas rAF-nya biang utama jank scroll di perangkat sentuh** (pelajaran yang sama dengan §4r-3). `Marquee.tsx` dihapus, sudah tidak dipakai section mana pun.
- **Penjaga overflow horizontal** (`f30614f`) — `html`/`body` tidak punya penjaga sumbu-x, jadi satu keturunan yang kelebaran membuat **seluruh dokumen bisa digeser ke samping** di HP (~360px). Ditambah `max-width: 100%` + **`overflow-x: clip`** (bukan `hidden`, supaya `position: sticky` di Hero/Industries/LivingArchitecture tetap hidup) sebagai penjaga global, plus `overflow-x-clip` lokal di lima section. Dua sumber lebar yang bikin konten **terpotong**, bukan cuma bisa digeser, ikut dibetulkan: judul terbesar `CsiHero` & heading hover-swap `TrustedByGrid` kini membungkus, dan `DeploymentCard`/`DeploymentCta` dapat `w-full` eksplisit supaya `aspect-[4/3]` tidak lagi menurunkan lebar dari `min-height` (sempat merender kartu 384px di lajur grid 312px).

---

## 4aa. Industries & Deployments untuk Layar Sentuh + Bersih-bersih Copy ✅ (12 Agu — rekan tim)

Lanjutan §4z, masih di wilayah `sections/` + `motion/` milik Nico.

### Industries: dari master-detail ke korsel

Lima commit berturut-turut, dan urutannya menarik karena **percobaan pertamanya dibuang sendiri**:

- **`805ee1e`** — desktop: oranye tidak lagi menandai *semua* kolom core saat diam, cuma kolom yang **aktif**; core ditandai titik netral redup, plus garis aksen tipis di atas saat hover/fokus. Mobile: daftar 13 deskripsi yang selalu terbuka diganti grid + overlay detail saat di-tap.
- **`b3798c9`** — **master-detail itu dicabut lagi**, diganti korsel scroll-snap yang meniru `CaseGridMobileStack`. Alasannya: tap-untuk-membuka menambah satu langkah sebelum kontennya terlihat. Sekarang tiap sektor tampil utuh di kartunya sendiri (foto + gradien gelap + deskripsi), tinggal geser.
- **`0cb1eb7`** — 🐛 geserannya terasa **macet**. `Industries.tsx` membungkus kontennya dalam CSS grid **di mobile juga, bukan cuma `lg:`**, dan grid item bawaannya `min-width: auto` — akar korselnya tidak menyusut ke lebar kolom, jadi track scroll-snap-nya tidak punya ruang bergerak. `min-w-0` di akar korsel.
  > Berlaku umum: **anak flex/grid yang di dalamnya ada scroller WAJIB `min-w-0`.** Gejalanya bukan overflow yang kelihatan, tapi **scroll yang diam** — jadi mudah salah dicurigai ke listener atau ke scroll-snap-nya.
- **`c94526f`** — di kartu terakhir, pantulan overscroll terbaca sebagai "melompat balik ke kartu pertama". `overscroll-x-contain` menahan pantulannya supaya tidak merambat lewat batas scroll korsel.
- **`6e98962`** — sektor selain kartu pertama tak pernah terlihat kalau pengunjung tidak menggeser sendiri. Maju otomatis tiap **4,5 dtk**, **berhenti untuk selamanya pada sentuhan pertama** (supaya tidak pernah melawan gerakan tangan), dan dilewati total saat `prefers-reduced-motion`.

### Deployments: foto kartu tak pernah terbuka di layar sentuh (`14de44f`)

Foto kartu terang dari redup **saat hover** — dan layar sentuh tidak punya hover, jadi fotonya redup selamanya. Di `pointer: coarse` dipasang `DeploymentRevealImage`: kecerahan & grayscale-nya terikat scroll, puncaknya saat kartu mencapai **tengah viewport**. Desktop tidak disentuh sama sekali — jalur hover CSS-nya utuh, **nol listener tambahan**. Reduced motion tetap dapat crossfade opacity/grayscale, cuma zoom-nya yang dibuang — cermin dari perilaku hover yang sudah ada.

### Copy

- **`055d268`** — typo & pecahan kalimat: `Asistant` → `Assistant`, dua caption misi Vision yang tidak gramatikal, title-case (`for`, `a`), `theatre` → `theater`.
- **`6c95f24`** — kelima blurb Deployments memakai triad mekanis yang sama (*"X for/linking A, B, and C"*) — pola **rule-of-three** yang terbaca hasil mesin. Ditulis ulang jadi kalimat yang bervariasi dan konkret.
- **`8188ee8`** — buzzword Vision & Manifesto (*empowers / sustainable value / worldwide*, template *"belongs not to X, but to Y"*) dibuang, pecahan kalimat *"Yet struggling to act"* dibetulkan.

> ⚠️ Ketiganya menyentuh **teks yang diuji test**. Kalau mengubah copy di section, cek `*.test.tsx` sebelahnya dulu — beberapa assertion mengutip kalimatnya utuh, dan `6c95f24` memang harus memperbarui test bersamaan dengan copy-nya.

---

## 4ab. Loading Deploy Publik ✅ (13 Agu) — progres byte, sambung-ulang, retry

Commit `ccefec8`. Seluruh masalah di section ini **cuma muncul di deploy publik**, tidak pernah di `localhost` — itu sebabnya ia lolos sekian lama.

Diukur di `csi2.wibudev.com` 13 Agu: origin melayani ~**50 KB/s**, jadi `office.glb` 13 MB = **4+ menit** di balik loader **tanpa satu pun tanda kemajuan**. Dan kalau unduhannya putus di tengah, hasilnya **hero statis permanen** — tidak ada jalan pulih selain reload manual.

- **`src/lib/officeModel.ts`** (baru) — GLB diunduh sendiri lewat `ReadableStream` → blob URL, bukan diserahkan ke `useGLTF`. Progres byte-nya masuk ke `sceneStore`; koneksi yang putus **disambung ulang lewat header `Range`**, maksimal 4×.
  > 🔥 **`useGLTF.preload` DIHAPUS. Jangan dikembalikan** — mengembalikannya berarti GLB-nya terunduh **dua kali**.
- **`Hero.tsx`** — unduhan dimulai saat mount, **paralel dengan chunk Scene**; dulu ia mengantre di belakangnya. Digerbangi reduced-motion.
- **`LoadingScreen.tsx`** — baris progres DOM `loading 3d office — N%`, lalu berganti jadi `preparing…` saat kompilasi shader (fase yang memang tidak punya persen). Ikut memudar bersama latar putih.
- **`ChunkBoundary.tsx`** — `fallbackWithRetry(retry)`; `SceneFailed` dapat tombol **"reload 3d tour"**: klik pertama reset + retry di tempat, klik kedua baru reload halaman.

**Teruji** lewat `scripts/probe-public-loading.mjs` (reproduksi via CDP throttle + blokir GLB): pada 2 Mbps persennya berjalan 0→100 lalu loader lepas (**61 dtk**); GLB diblokir → tombol muncul, unblock + klik → **pulih tanpa reload** (22 dtk).

> **Sisa pekerjaannya BUKAN di kode:** cache edge Cloudflare untuk `/3d/*`. ✅ **Tertutup 19 Agu** — lihat §4ai.

---

## 4ac. Form Inquiry di Layar MacBook ✅ (13 Agu)

Commit `5eb6a81` (rig + form), `3b9a32b` (sentakan), `7531248` (footer). Section Contact tidak lagi punya form datar: yang ada **MacBook 3D tertutup** yang, saat diklik, membuka dan **layarnya berubah jadi form**-nya. Kepala section (eyebrow, judul besar, subjudul, sepasang CTA) **dihapus** atas permintaan Keano — begitu form-nya pindah ke layar MacBook, judul dan subjudulnya ada dua kali di layar yang sama.

### Rig-nya

- **Aset** `public/3d/models/macbook-inquiry.glb` (312 KB), disiapkan dua skrip: `strip-macbook-logo.mjs` & `blacken-macbook-screen.mjs`.
- **Engsel dan kamera punya pegas SENDIRI-SENDIRI.** Dulu satu nilai, dan itu keliru: 170/26 pas untuk engsel yang memutar 110° di tempat, tapi kamera menempuh 0,4 m ke muka pengunjung — sejauh itu dengan pegas secepat itu terbaca **sentakan**, bukan dolly ("terlalu cepet ngezoomnya menjadi ngeflick"). Kamera dapat `55/23/1` → rasio redam 1,55 (**overdamped**, jadi tidak memantul melewati pose akhir), 95% pada ~1,1 dtk. Efek sampingnya bagus: engsel selesai lebih dulu (~0,5 dtk), jadi urutannya jadi *"lid membuka, baru kamera mendekat"* — bukan dua gerakan yang saling menumpuk.
- **Form-nya `<Html transform>` drei**, dipatok desain **1200×780** dan diperkecil oleh transform CSS, bukan media query — jadi tata letaknya selalu versi lebar. `HTML_SCALE` **dihitung dari ukuran layar aset** (`FACE_W` − 2 × bezel 6 mm), bukan angka coba-coba yang akan salah begitu ukuran desainnya diubah.
- **Jarak kamera dihitung, tidak ditaksir**: `overlayDistance()` mengambil yang paling menuntut dari dua kendala — layar mengisi **75% tinggi** viewport, dengan pagar **lebar 86%** supaya jendela yang kurus tidak memotong kiri-kanan.
- **Melayang DIMATIKAN selama terbuka** (`FLOAT_WHEN_OPEN = false`, sengaja satu baris supaya bisa dibalik). Waktu ayunan itu diminta layarnya masih kosong dan laptopnya benda hias; sekarang isinya form yang harus dibaca, diklik, dan diketik. Dua akibat yang tidak bisa ditawar: sasaran klik yang bergerak sulit dikenai, dan `<Html transform>` meraster DOM sekali lalu memiringkannya lewat CSS 3D — **miring sedikit saja teksnya melunak**, padahal seluruh rig ini justru dibangun supaya layarnya tegak lurus dan teksnya tajam. Bonusnya: tanpa animasi tanpa ujung, frameloop tetap `"demand"` selama form dipakai — **nol draw call sambil pengunjung mengetik**.
- **Di layar sentuh & jendela sempit form-nya BUKAN lewat laptop** — laptop tetap tertutup sebagai pemandangan, yang muncul lembar datar biasa. Dua gerbang terpisah dan **keduanya perlu**: `coarse` soal tidak adanya hover, `narrow` soal ruang. Jendela sempit berpenunjuk presisi (desktop yang dikecilkan, atau tablet ber-mouse) lolos dari `coarse` tapi tetap tidak punya tempat — rig overlay-nya terkendala **lebar**, jadi kamera mundur jauh dan layarnya cuma mengisi seperempat tinggi. Terpotret 13 Agu di 390 px: form-nya utuh tapi terlalu kecil untuk dibaca.
- **INVARIANTS bertambah tiga lapis z-index** (54 tirai / 55 lapisan laptop / 56 tombol tutup) yang sengaja **mengapit Navbar (50)**: form ini modal, jadi Navbar tidak boleh bisa diklik menembus tirainya — tapi ketiganya tetap harus tenggelam di bawah `LoadingScreen` (60). Kalau Navbar dinaikkan, ketiganya ikut naik bersama.

> 🚧 **`submitInquiry()` MASIH STUB.** Ia menunggu 900 ms lalu selalu mengembalikan `ok: true`; belum ada apa pun yang terkirim ke mana pun. Backend-nya direncanakan **Web3Forms** (seperti situs cogniti yang sudah tayang), dan seluruh jalan keluarnya sengaja dilewatkan satu fungsi supaya nanti yang berubah **cuma isi fungsi itu**. Jedanya juga sengaja ada supaya keadaan "sending" di UI benar-benar terlihat dan bisa diuji sekarang, bukan baru ketahuan rusak setelah backend dipasang. **Ini blocker rilis, bukan detail.**

### 🐛 "Ngeflick": tiga lapisan, tiga sebab berbeda

Keluhan Keano terdengar seperti satu bug. Ternyata **tiga**, dan masing-masing baru kelihatan setelah yang di atasnya dibereskan.

| # | Gejala | Sebab | Obat |
|---|---|---|---|
| 1 | Gambar melar/pepat beberapa frame saat lapisan berpindah ke `fixed inset-0` | Canvas R3F **tertinggal ~58 ms (3–4 frame)** dari tata letak DOM. Rantainya `react-use-measure` (ResizeObserver) → state React → `setSize`, dan ResizeObserver memang menyusul **setelah** paint | Ukur host sendiri lalu dorong ke store R3F di `useLayoutEffect`, **TANPA dep array** |
| 2 | Sesudah ditutup, laptop berhenti di pose yang **bukan** pose awal lalu **menyentak** balik | Lompatan tata letak dibatalkan dengan **memundurkan kamera** (`k = tinggi canvas / tinggi kotak`) lalu menggesernya. Itu mengubah **sudut pandang**, bukan skala | `camera.setViewOffset` — frustum miring, titik pandang tak bergerak, perspektif identik sampai piksel terakhir |
| 3 | "Layar form delay, tidak sinkron dengan layar MacBook" | Frustum miring itu **tak terlihat oleh `<Html transform>` drei**: ia tidak memakai WebGL, ia meniru kamera lewat CSS 3D dan **memaku titik hilangnya di pusat canvas** | Belah tugasnya: **SKALA** lewat view offset yang tetap terpusat, **POSISI** lewat `translate3d` di pembungkus bersama |

Yang membuat lapisan 2 ketahuan: **angkanya asimetris.** Sepanjang 2,4 dtk menutup, kotak laptopnya konvergen ke **313×133** padahal pose istirahatnya **310×120** — lebarnya meleset 1% tapi **tingginya 9%**, lalu menyentak 9 px tepat saat `settling` mati. Skala yang salah meleset merata; yang meleset **tidak** merata itu sudut pandang. Memundurkan kamera sambil membesarkan gambar hanya mempertahankan ukuran benda di bidang bidikan — sisanya memipih seperti ganti ke lensa tele.

Kenapa lapisan 3 muncul: menggeser titik pusat kamera lubang-jarum itu **persis sama dengan menggeser seluruh gambar**, sama untuk segala kedalaman — dan drei tidak bisa menirunya. Jadi lid melenceng dari form sejauh (dx, dy)·(1−t) lalu "menyusul" saat t→1. Skalanya sendiri ikut benar otomatis (`projectionMatrix.elements[5] × tinggi/2`); yang tidak bisa digeser cuma titik pusat proyeksinya.

⚠️ **`clearViewOffset()` TIDAK memulihkan `camera.aspect`** — `setViewOffset` menimpanya dengan `fw/fh` dan tidak pernah mengembalikannya. Setel ulang + `updateProjectionMatrix()` sendiri.

⚠️ Elemen `<Html>` drei **bukan saudara canvas**: ia ditempel ke `events.connected`, yang di R3F v9 = container **luar** `<Canvas>`; canvas sendiri satu div lebih dalam. Leluhur bersamanya = pembungkus kita sendiri — itulah yang digeser, supaya canvas dan form mustahil berselisih.

⚠️ Geseran CSS itu **wajib ditulis di efek layout juga**, bukan cuma di `useFrame`. Saat menutup, `dockHeight` kembali 0 di commit yang **sama** dengan turunnya frameloop ke `"demand"` — menunggu `useFrame` berikutnya berarti geseran lama (~120 px) tertinggal **terpaku di layar entah sampai kapan**.

> 🔥 **Pelajaran ukur yang paling mahal di batch ini:** probe geometri canvas yang bersih **TIDAK** membuktikan render yang bersih. Sentakan lapisan 2 tidak terlihat sama sekali di `probe-contact-transition.mjs` — semua barisnya `ok`. Yang menangkapnya `probe-contact-settle.mjs`, yang merekam **piksel** via `Page.startScreencast` lalu mencari kotak batas piksel terang per frame.

**Gotcha tetangga:** `<Html transform>` menggambar DOM **tanpa uji kedalaman**, jadi form-nya sempat tergambar menembus **punggung** lid yang masih tertutup — punggung aluminium putih berkedip jadi hitam berisi teks tercermin, tepat di frame pertama membuka. Digerbangi dengan memudarkan opacity menurut **hasil kali titik normal-layar · arah-ke-kamera**, bukan ambang pada `progress`: tanda dot itu persis "punggung atau muka", jadi ikut benar sendiri kalau rig kamera atau asetnya berubah.

### Footer menempel pojok (`7531248`)

`#contact` adalah section **paling bawah** di halaman tapi masih memakai `py-*`, jadi padding bawahnya menyisakan pita kosong 128 px tepat di ujung dokumen — terukur `footerBottom` 8412 vs `docHeight` 8540, tanpa apa pun di antaranya. Diganti `pt-*`. Footer-nya sendiri membentang tepi ke tepi lewat margin negatif yang membatalkan gutter `px-6 sm:px-10` milik section, dengan sisa 12 px supaya hurufnya tidak benar-benar menyentuh tepi layar. `border-t` dihapus: di posisi mepet begitu ia jadi sekat yang tidak memisahkan apa-apa.

**Verifikasi:** `probe-contact-settle.mjs` (piksel per frame saat menutup), `probe-contact-transition.mjs` (geometri per rAF — bandingkan kotak canvas vs kotak **host**-nya, bukan vs drawing buffer), `shoot-contact-sequence.mjs` (deret potret buka/tutup, sengaja digulir 120 px dari tengah supaya bug `dockOffsetY` tidak tersembunyi), `probe-contact-form.mjs`, `measure-contact-idle.mjs`.

---

## 4ad. Contact Berdiri di Ruangan Office + Laptop di Layar Sentuh ✅ (18 Agu)

Commit `bb517eb` (CTA Office), `00080d3` (jalur sentuh).

**CTA "let's talk" di Office tidak lagi melempar ke Lounge.** Dulu ia `<Link to="/#contact">`, dan alasannya sempat benar: Office satu-satunya ruangan berisi yang **tidak punya** `<Contact />` sendiri. Begitu ia punya, melempar pengunjung ke ruangan lain salah dua kali — ia kehilangan tempatnya tanpa meminta, padahal tujuannya beberapa layar di bawah kakinya. Sekarang **keempat ruangan berisi** punya Contact.

- Perpindahannya lewat **`scrollToSection()`**, bukan anchor `href="#contact"`: lompatan anchor bawaan peramban berjalan **di luar rAF Lenis** dan berebut posisi dengannya di frame yang sama. `Office.tsx` karena itu ikut didaftarkan ke `GUARDED_FILES` di `smoothScrollCallsites.invariant.test.ts`.
- `goToContact()` di Navbar diturunkan dari **`ROOM_CONTENT`** (menelusuri pohon React element mencari `<Contact />`), bukan dari daftar nama ruangan yang ditulis ulang — jadi penambahan ini tidak menuntut satu baris pun di Navbar, dan mustahil ada ruangan yang punya tombolnya tapi tidak punya section-nya.

### 🐛 Dua bug sentuh, satu sebab

Di perangkat sentuh jalur "sheet" tidak pernah menyalakan gerbang yang sama dengan jalur desktop:

| Gejala | Sebab | Obat |
|---|---|---|
| Engselnya diam — yang bergerak cuma form-nya | Pegas `progress` digerbangi `overlay`, yang **selalu false** di layar sentuh | Engsel ikut `open`, kamera yang ikut `overlay` — keduanya memang dua benda berbeda |
| Tombol tutup tertutup navbar | Kelas modal digerbangi `promoted`, yang juga mati di sentuh, jadi form naik **tanpa membawa lapisan z-nya** | Gerbang diperbaiki + `sheetSettling` (kembaran `settling` untuk jalur sheet) yang menahan keadaan modal sampai engselnya benar-benar pulang (`progress <= 0,002`), bukan sampai tombolnya ditekan |

---

## 4ae. Navbar: Pill Jadi Bilah Penuh ✅ (18 Agu)

Commit `c57d6a1`. Permintaannya sederhana — logo 12 px dari tepi — dan **merapatkan padding tidak akan pernah bisa menyampaikannya**: yang menahan itu `max-w-5xl` + `justify-center`, yang di 1440 menghentikan pill di 1024 dan meninggalkan logo **233 px** dari tepi. Jadi pill-nya dilepas seluruhnya.

- **12 px-nya sekarang padding DALAM `<nav>`**, bukan jarak luar `<header>`. Bedanya: latar sampai ke tepi layar (persegi yang benar-benar menempel di sudut) sementara isinya persis 12 px dari sudut. Terukur 12/12 di 390, 1440, dan 1920.
- **CTA "Talk to us" kehilangan pill putih + panahnya.** Pill itu satu-satunya benda 36 px di bilah, jadi dia sendiri yang menahan tinggi di 60 px; tanpa dia yang tertinggi tinggal logo dan bilahnya turun ke **52 px = 12 + 27,83 + 12**. ⚠️ **27,83**, bukan 30 seperti atribut `height`-nya — preflight Tailwind memasang `img { height: auto }` yang menimpanya.
- `maxDistance` MagneticButton ikut turun **14 → 4 px**: tarikan 14 px dulu tertelan `px-4 py-2` milik pill; pada teks telanjang di bilah 52 px ia melempar tulisannya menembus tepi.
- **Latarnya `.dither-panel`, bukan `.glass`.** Ambang Bayer 4×4 pada blok 1 px CSS = **2 px perangkat di dpr 2**, angka yang sama dengan `DITHER_PX` di HoverScan / MaintenanceHologram / CharacterGlitch. Blur itu satu-satunya permukaan di layar yang datang dari era berbeda. Kerapatannya **12/16**, bukan 8/16 yang luruh jadi papan catur 1 px biasa; titiknya **putih 6%**, bukan sewarna latar seperti percobaan pertama — yang lewat di belakang bilah hampir selalu `--background`, jadi polanya terukur rata sepenuhnya.
- **Dipasang sebagai LAPISAN `absolute`, bukan kelas di `<nav>`:** `background-image` tidak bisa di-transisi (yang dianimasikan opasitas lapisan, polanya tetap tajam), dan tepi 1 px-nya jadi tanpa andil pada tata letak — bug geser sepiksel saat menu ditutup tidak bisa kembali.
- **Di `<md` bilahnya tetap 68 px:** burger `h-11` = ambang minimum sentuh 44×44. Overlay menu ikut `px-9` → `px-3` supaya daftar ruangan rata persis dengan logo.

---

## 4af. Crew: Daftar Berkelompok + Tirai Sorot ✅ (18 Agu)

Commit `1858c36`. Filter kategori dan "nama aktif yang mengikuti gulir" dilepas; yang menyorot sekarang **cuma hover, satu state**. Anggotanya dikelompokkan per kategori dan diurutkan namanya **di module scope**, jadi tidak dihitung ulang tiap render. Dinding foto & korsel HP memakai urutan yang sama dengan daftar kiri (`ORDERED`), supaya hover di satu sisi menunjuk kotak yang sejajar di sisi lain.

> **Tirainya menggelapkan seisi halaman KECUALI navbar** — makanya pasangan **z-40 (tirai) / z-45 (yang disorot)** memang harus kalah dari Navbar 50, dan bukan 11/12. Didaftarkan ke tabel z-index **INVARIANTS §2** berikut alasannya: kalau `<main>` kelak melepas `z-10`-nya, urutannya tetap benar di akar. (Dan `<main>` memang melepasnya, di §4ac.)

---

## 4ag. Gulir Lintas-Ruangan Sembuh, Lounge Dirampingkan, Contact Dorong Kamera ✅ (18 Agu)

Commit `8fd0ea2`.

### 🐛 "Gulirnya berhenti di tengah halaman" — dua baris CSS refleks

Dilaporkan: *"gulir dulu di Office, pindah ke Lounge, lalu gulir ke bawah — berhenti di tengah halaman, bisa naik tapi tidak bisa turun."* Terukur: **Lounge mentok di y = 3005** — persis `limit` milik Office (3905 − 900) — padahal dasarnya **5833**.

Biangnya `height: 100%` / `h-full` di `<html>` & `<body>`. Lenis menyimpan tinggi konten di cache dan memperbaruinya lewat `ResizeObserver` yang mengamati `<html>` — dan **ResizeObserver melaporkan KOTAK elemennya, bukan `scrollHeight`-nya**. Tinggi yang terpaku setinggi viewport membuat observer-nya menyala sekali saat mount lalu diam selamanya, jadi `limit` beku di tinggi halaman yang **kebetulan terukur pertama kali**.

Tidak ada error, tidak ada test merah; yang terlihat cuma halaman yang seolah habis di tengah — dan tidak satu pun petunjuknya menunjuk balik ke CSS. Yang rusak ada di `useSmoothScroll.ts` + `routes/`, penyebabnya dua baris di `index.html` dan `src/index.css`, datang dari **dua tempat sekaligus**. Karena itu ia naik jadi **INVARIANTS §8** + `src/lib/scrollRootHeight.invariant.test.ts` (dua test, dibuktikan merah lebih dulu dengan mengembalikan `height: 100%`).

⚠️ **`min-h-full` BUKAN pengganti `h-full`** di `<body>`: itu `min-height: 100%`, yang menggantung pada tinggi `<html>`. Begitu `<html>` tingginya `auto`, persentasenya tak punya acuan dan diam-diam jadi nol. Pakai satuan viewport (`min-height: 100dvh`).

### Lounge dirampingkan

Manifesto & LivingArchitecture dicabut dari alur; berkasnya dihapus bersama `ArchitectureGrid`, `NodeGlyphs`, `CsiParticleField`, dan `data/architectureNodes` (−1808 baris). Alurnya jadi **Hero → CsiHero → Deployments → Process → Industries → Vision → Contact**.

> Efek samping yang lebih besar dari sekadar copy: **tidak ada lagi Canvas kecil yang ikut remount saat berganti ruangan.**

### Sisanya di commit yang sama

- **Contact: `open` menggerakkan kamera di KEDUA jalur** — lid membuka, kamera mendorong masuk ke layar, lembar form memudar menutupinya (menyusul §4ad, yang membetulkan gerbangnya di sentuh).
- **Archivo Variable** (sumbu `wdth` asli) **khusus wordmark COGNITI.ID** di kepala Contact, lewat token `--font-archivo`. Geist tetap font halaman.
- Navbar (bilah & menu seluler) dirapatkan mengikuti ukuran font baru.

---

## 4ah. Pindah Ruangan dari Konten: Tirai `GridReveal` + Slug Konten ✅ (19 Agu)

> ✅ **Di-commit `142d573`** (19 Agu). Berkas barunya: `src/components/GridReveal.tsx`, `src/lib/gridReveal.ts`, `src/components/canvas/frameTick.ts`, dua test, dan `scripts/probe-grid-reveal.mjs`.

### Masalahnya: camera fly di tempat yang salah

Klik ruangan di navbar selagi berada jauh di bawah konten dulu memicu **dua gerakan yang tidak diminta sekaligus**: halaman dijepret balik ke atas (jadi 3D ruangan **LAMA** sempat terlihat sekejap), lalu kamera terbang **1400 ms** ke ruangan baru.

Camera fly itu afordans **spasial** — benar saat mengklik waypoint di dalam ruangan, karena perjalanannya terlihat dan menceritakan letak ruangan satu terhadap yang lain. **Dari dalam konten titik berangkatnya tidak pernah terlihat**, jadi yang tersisa dari perjalanan itu cuma 1,4 detik menunggu.

Gantinya: **potong langsung, ditutupi tirai kotak-kotak.** Jadi tirai ini bukan hiasan di atas perpindahan — ia **yang membuat potongannya bisa diterima**.

> ⚠️ Hanya jalur konten yang lewat sini. Dari hero (`heroInView`) dan dari waypoint 3D, **camera fly SENGAJA dipertahankan**. Gerbangnya di `Navbar.goRoom`, bukan di dalam GridReveal. Cadangan kalau `goTo` masih null (chunk `<Scene>` belum termuat) juga jatuh ke jalur lama dengan sengaja: tanpa `goTo`, tirai tidak punya cara menjepret kamera dan akan terangkat memperlihatkan **ruangan yang salah**.

### Angkanya, dan kenapa segitu

| Konstanta | Nilai | Alasan |
|---|---|---|
| `TILE_PX` | 64 | **`background-size` milik `.ambient-grid`.** Menyamakannya membuat tirai terbaca sebagai kisi situs ini yang merapat, bukan grid asing yang ditempelkan |
| `MAX_TILES` | 640 | Tiap kotak satu `<div>` ber-transisi sendiri. 1440×900 → 345 kotak (nyaman); 2560×1440 → 920 (mulai terasa untuk sesuatu yang hidup 900 ms). Yang dikorbankan saat batasnya kena **bukan kualitas, melainkan kerapatan** — dan di layar besar itu tidak terlihat |
| `COVER_MS` / `UNCOVER_MS` | 380 / 450 | Menutup itu **jawaban atas klik** (makin cepat makin responsif); membuka itu **penyajian ruangan baru** — disamakan 380 ms ia terbaca direnggut, bukan diangkat |
| `TILE_MS` | 80 | Pop keras. Kotak yang memudar 300 ms saling tumpang tindih sampai belasan kotak setengah-transparan sekaligus, dan yang terbaca **kabut, bukan kisi** |
| `FRAMES_NEEDED` | 2 | Frame pertama setelah R3F resume bisa jadi frame yang sudah **antre sejak sebelum kamera dijepret** |
| `FRAME_WAIT_MS` | 300 | Jaring pengaman, **bukan jadwal** — lihat di bawah |

**Urutan kotaknya dikocok (Fisher-Yates), bukan delay acak per kotak.** `delay = rng() × durasi` memang acak, tapi bukan yang dimaksud orang saat bilang "muncul acak": lajunya **bergerombol**, dan **ekornya menggantung** (dengan N kotak, delay terbesar rata-rata jatuh di N/(N+1) × durasi — jadi hampir selalu ada 2-3 kotak yang baru menutup setelah sisanya penuh, dan itu terbaca sebagai **cacat**, bukan sebagai acak). Mengocok posisi dalam antrean memberi **acak di RUANG, teratur di WAKTU**. Membuka pakai **kocokan BARU**, bukan kebalikan kocokan menutup — urutan sama yang dijalankan mundur terbaca sebagai *rewind*, dan rasanya berubah dari "pindah tempat" jadi "batal".

### 🔑 Yang ditunggu FRAME, bukan WAKTU (`frameTick.ts`)

Tirai tidak boleh diangkat sebelum ruangan **baru** betul-betul digambar, dan **jeda tetap tidak bisa menjawab itu** — karena `frameloop = "never"` selama pengunjung berada di konten (INVARIANTS §7). Render loop-nya **berhenti**. Rantainya setelah tirai menutup:

```
jumpToTop() → IntersectionObserver Hero menyala (async) → heroInView true
            → prop frameloop kembali "always" → R3F resume → frame pertama
```

Jarak antara langkah pertama dan terakhir **tidak dijamin oleh apa pun**. `frameTick.ts` menghitung frame yang benar-benar tergambar (`markFrame()` dipanggil paling atas di `useFrame` CameraController, **sebelum early-out apa pun**), dan GridReveal menyedotnya lewat rAF. Pola yang sama dengan `sceneReady`.

- **Module-level, bukan state React** — penulisnya di dalam `useFrame` (60×/detik), pembacanya di DOM. Sama seperti uniform di `revealSweep.ts` & `transitionTear.tsx`.
- ⚠️ **`frameTick.ts` wajib bebas import three.** Ia diimpor `GridReveal.tsx` yang hidup di bundle utama; satu import three menyeret seluruh mesin 3D ke sana (alasan yang sama dengan catatan `Vec3` di `sceneStore.ts`).
- **`FRAME_WAIT_MS` 300 itu jaring pengaman**, menanggung keadaan di mana penghitung tidak akan pernah maju: chunk `<Scene>` gagal dimuat, tab disembunyikan (rAF berhenti), WebGL context hilang. Tanpanya semua keadaan itu berakhir sama — **tirai gelap menutupi layar selamanya**. Alasan yang sama dengan jaring pengaman 3 detik di `revealSweep`.

### 🐛 Empat jebakan yang semuanya kena

1. **`scrollToTop()` gagal SENYAP saat gulir dikunci.** Terukur 19 Agu: tirai menutup, `scrollToTop()` dipanggil, halaman tetap duduk di **y = 2868**. Dua rem milik `setScrollLocked` bekerja persis seperti seharusnya; keduanya cuma tidak bisa membedakan gulir pengunjung dari gulir naskah transisi — `lenis.stop()` mengabaikan `scrollTo` biasa (`force: true` yang mengesampingkannya), dan `overflow: hidden` di `<html>` memakukannya di **tingkat peramban**, yang tidak bisa ditembus opsi Lenis apa pun. Obatnya `jumpToTop()`: kunci diangkat sebentar lalu dipasang lagi di baris yang sama, dan `finally` menjamin ia kembali walau Lenis melempar. Gejala tanpa ini: mendarat di ruangan yang **benar** tapi pada **posisi gulir yang lama**, dan karena hero tak pernah masuk pandangan, penantian frame ikut mentok ke jaring pengamannya **tiap kali**.
2. **`setScrollLocked` harus BERHITUNG, bukan boolean.** Di HP, memilih ruangan dari menu burger memicu **dua pengunci sekaligus** (overlay Navbar + tirai). Menu menutup di tengah transisi, cleanup effect-nya memanggil `setScrollLocked(false)`, dan **kunci milik tirai yang masih terbentang ikut lepas** — sapuan jari lalu menggeser halaman di balik layar yang tidak menampilkannya. Hitungannya dijepit di nol dengan sengaja: `goToContact` memang memanggil unlock lebih dulu lalu membiarkan cleanup memanggilnya lagi.
3. **Commit ANTARA store dan router.** Tirai menukar dua hal di puncaknya: `currentRoom` (lewat `goTo` instan) dan `pathname` (lewat `navigate`). Menaruhnya dalam satu callback **tidak menjamin keduanya mendarat di satu commit** — zustand masuk lewat `useSyncExternalStore` yang dipaksa sync-lane, `navigate` lewat state biasa milik router. Di commit antara itu, RoomRouteSync Arah 1 membaca "pengunjung membuka /office" lalu memanggil `goTo("Office")` — **tween 1400 ms yang menyeret kamera balik ke ruangan asal**, tepat di balik tirai yang sebentar lagi terangkat. Membalik urutan tukarnya tidak menolong (commit antaranya cuma berpindah sisi); yang benar **mengakui kepemilikan**: selama `pendingRoom` terisi, RoomRouteSync Arah 1 diam.
4. **Dua rAF bersarang, bukan satu.** rAF pertama menunggu commit React yang memasang kotak-kotaknya; rAF kedua memberi peramban satu frame untuk menghitung gaya **awal**-nya (`opacity 0`). Tanpa frame kedua, 0 dan 1 mendarat di perhitungan gaya yang sama dan **transisinya dilewati** — tirai muncul seketika, tanpa kisi. Bug ini tampak seperti "CSS-nya salah".

Dua gotcha kecil yang ikut tercatat di kode: `goTo({ instant })` **mendahului** guard `animating` (tween yang sedang berjalan harus **dibatalkan**, kalau tidak ia lanjut menyeret kamera setelah tirai naik), dan jalur instan itu **wajib memulihkan `camera.up` & FOV** — ia bisa dipanggil sesaat setelah pemain keluar dari pandangan atas meja billiard, yang meninggalkan `up` miring dan FOV menyempit.

### Navbar & URL bicara bahasa konten

`ROOM_SLUGS` + `ROOM_LABELS` di `sceneStore.ts` — **satu-satunya tempat** penerjemahan itu; `RoomKey` tidak berubah di mana pun, dan label waypoint 3D tetap nama ruangan (di dalam kantor, metafora ruangannya justru yang benar).

| RoomKey | Label & URL | Isinya |
|---|---|---|
| Lounge | **Home** — `/` | hero + Deployments + Process + Industries + Vision |
| Office | **People** — `/people` | crew + values + Careers |
| Meeting | **Work** — `/work` | studi kasus |
| Function | **Services** — `/services` | bedah layanan |

Commit yang sama juga **menukar konten Office ↔ Function** (alasannya di komentar `roomContent.tsx`): konten People lebih nyambung dengan scene Office yang karakternya duduk bekerja di meja — sekaligus hologram maintenance (§4t) & glitch karakter idle (§4u), yang dua-duanya di-gate ke ruangan Office, jadi latar halaman People. Konten Services (accordion `sections/Office.tsx` — nama berkasnya warisan) pindah ke Function. *(Tabel di atas sempat tertulis terbalik — Office/Services & Function/People — sampai dikoreksi 20 Agu.)*

- **Slug lama tetap hidup** (`/office`, `/meeting`, `/function`) — tautan yang terlanjur beredar tidak boleh mati. `roomFromPath` mengenali keduanya, dan **route legacy-nya ada di `App.tsx`**: tanpa itu catch-all `*` melempar pengunjung ke `/` jauh sebelum store sempat membaca path-nya. ⚠️ Elemennya `RoomContent` **sungguhan, bukan `<Navigate>`** — pada deep-link, RoomRouteSync sengaja menahan URL apa adanya sampai chunk `<Scene>` tiba, dan `<Navigate>` akan balapan dengan penahan itu.
- **Normalisasinya `replace`, bukan push.** Path yang menunjuk ruangan yang sama tapi ejaannya bukan kanonis itu **bukan perpindahan**. Dengan push, menekan Back dari `/services` mendarat di `/office` yang detik itu juga ditulis ulang jadi `/services` lagi — **tombol Back terasa mati** dan riwayatnya terisi entri kembar tanpa batas.

### Penjaganya

- **`src/lib/gridReveal.test.ts`** — matematika kisi & delay. Termasuk satu test khusus untuk jebakan pembulatan `tileGrid`: rumus luas mengabaikan `ceil`, dan di 2560×1440 ia memberi 646 kotak (lewat dari 640) karena **dua pembulatan yang masing-masing menambah kurang dari satu lajur bisa bersama-sama menambah satu baris penuh**.
- **`src/components/GridReveal.test.tsx`** — urutan, bukan tampilan. `goTo({instant:true})` sebelum `navigate` **dibuktikan dengan memasang `RoomRouteSync` sungguhan** (kalau terbalik, `goTo` terpanggil dua kali dan yang kedua tanpa `instant`); tirai tidak terangkat sebelum penghitung frame maju; jaring pengaman tetap mengangkatnya kalau penghitung itu tak pernah maju.
- **`scripts/probe-grid-reveal.mjs`** — filmstrip lewat Brave. Yang dibuktikan bukan "ada kotak-kotaknya", melainkan tiga hal yang cuma kelihatan dari rentetan frame: tirai betul-betul menutup **sebelum** ruangannya ditukar, frame pertama setelah terangkat sudah memperlihatkan ruangan tujuan **dari sudut akhirnya** (bukan dari perjalanan), dan urutannya acak — bukan menyapu satu arah. Mode `hero` menjaga jalur camera fly yang memang **harus tetap ada**.
- **INVARIANTS §2** bertambah `z-58`: di atas Navbar (50), di bawah LoadingScreen (60). Tirai yang menutupi seluruh layar **kecuali satu bilah melayang** bukan tirai — yang terbaca "tirainya bocor", persis yang terpotret 13 Agu pada form inquiry.

---

## 4ai. CDN: Cache Edge `/3d/*` + `office.glb` Keluar dari Git ✅ (19 Agu)

Penutup sisa pekerjaan §4ab. Dua perubahan yang saling melengkapi: Cloudflare kini **menyimpan salinan** model 3D di edge (commit tak ada — kerjanya di dashboard CF), dan `office.glb` **tidak lagi lewat git** (commit `2357c8e`).

### Cache Rule — kenapa header saja tidak pernah cukup

Cloudflare secara default hanya meng-cache **daftar ekstensi tertentu** (png, jpg, js, mp4, …) — **`.glb` tidak termasuk**. Jadi selama apa pun origin berteriak lewat `Cache-Control`, `.glb` tetap `cf-cache-status: DYNAMIC`. Satu-satunya jalan: **Cache Rule** eksplisit.

- Rule-nya: `Hostname equals csi2.wibudev.com` **AND** `URI Path starts with /3d/` → Eligible for cache, Edge TTL 1 bulan. Dibuat oleh **rekan kerja yang memegang akses zone `wibudev.com`** — Keano tidak punya akses dashboard CF; tiap urusan rule/purge lewat dia.
- `/screens/*` **tidak perlu** rule — png & mp4 sudah ekstensi default.
- DNS `csi2` lewat **wildcard** — tidak relevan: rule mencocokkan hostname **request**, bukan record DNS. Yang penting record-nya proxied (dibuktikan oleh hadirnya header `cf-cache-status`).
- **Hasil terukur:** 13 MB turun dari **4+ menit @ ~50 KB/s** (origin) ke **3,9 dtk @ 3,3 MB/s** (edge, `HIT`) — **~66× lebih cepat**, dan origin nyaris tak tersentuh lagi.

### `office.glb` keluar dari git — `/3d/models` di root

File 13 MB tiap update model = commit 13 MB + rebuild + restart. Sekarang:

- File tinggal di **`3d/models/office.glb`** (root repo, di-ignore `/3d/`; pengecualian lama `!public/3d/models/office.glb` dicabut). **GLB kecil (billiard ×2, macbook) TETAP di `public/`.**
- **`vite.config.ts` → plugin `serveLocalModels`**: middleware untuk dev **dan** `vite preview` (= server produksi) yang melayani `/3d/models/*` dari folder root itu — `model/gltf-binary`, dukung **Range 206** (dibutuhkan sambung-ulang `officeModel.ts`). Middleware hanya menangkap file yang **ada** di folder; sisanya jatuh ke `public/`/`dist/`.
- URL publik **tidak berubah** → nol perubahan kode klien, nol urusan CORS, Cache Rule tetap kena.
- **Dua jalur update yang kini TERPISAH:** kode = commit → push → `bun run deploy` (JS ber-hash, cache beres sendiri); model 3D = ganti file → `scp` ke `<repo-server>/3d/models/` → **purge by URL** (nama file tak ber-hash!) → hangatkan cache. Runbook singkatnya di `xnote.md`.

### 🐛 Insiden deploy pertama: origin 404, pengunjung tak melihat apa-apa

Rekan pull + deploy **sebelum** file di-scp → `public/office.glb` di server terhapus oleh pull, dist tanpa GLB, origin **404**. Tapi **tak satu pun pengunjung kena** — edge masih memegang salinan lama dan terus melayaninya. Tiga pelajaran:

1. **`HIT` di jalur normal ≠ origin sehat.** Cara memeriksa origin yang sebenarnya: tambahkan query pembeda (`?origincheck=1`) — cache key berubah, edge terpaksa bertanya ke origin.
2. **Jangan purge saat origin sakit** — cache-nya justru satu-satunya jaring pengaman.
3. **Urutan deploy yang membawa perubahan model:** file dulu di `<repo-server>/3d/models/` (sejajar `package.json`), **baru** pull + build. Salinan di `dist/` cuma penambal — build berikutnya menghapusnya.

Verifikasi tutup kasus: origin `200` `model/gltf-binary`, unduhan penuh **13.020.916 bytes** — identik byte-per-byte dengan file lokal.

---

## 4aj. Perf Safari: Cap 30 fps Idle + dpr 1 + Adaptive DPR ✅ (19 Agu)

Laporan Keano: fps drop di scene 3D `csi2.wibudev.com` di Safari, tapi **langsung mulus begitu scroll ke konten**. Bagian kedua itu diagnostik berharga: mulusnya bukan "pulih" melainkan `FrameloopGate` mematikan render total saat hero off-screen — jadi seluruh beban ada di render loop 3D, bukan di halaman. Diagnosa: scene sudah berjalan **tepat di ambang vsync** (p50 16,7 ms, GPU ~100% idle — audit 7 Agu, §4s) tanpa headroom sama sekali; Safari menjalankan WebGL lewat ANGLE→Metal yang untuk pass fullscreen berloop (N8AO) umumnya sedikit lebih lambat dari Chromium — dan dengan vsync, lewat 16,7 ms sedikit saja langsung terkuantisasi ke **~30 fps patah-patah**, bukan turun mulus. Ini kasus nyata pertama dari isu "GPU 100% saat idle" yang dulu ditunda ke finalise; penundaannya dicabut sebagian atas permintaan Keano. Tiga lever, dua commit (`57bbb28`, `60b3b15`):

### Cap 30 fps saat idle — `renderPace.ts` + `IdleFrameCap.tsx`

Saat tidak ada yang bergerak, gambar **tiap 2 tick rAF** (~50% beban GPU hilang); frame yang dilewati menampilkan frame sebelumnya karena canvas WebGL tidak di-clear kalau tidak digambar — untuk pemandangan diam hasilnya identik.

- **BUKAN `frameloop="demand"`** — kontrak demand↔invalidate pernah rusak senyap lewat merge (§4 riwayat di Scene.tsx). Di sini SEMUA `useFrame` tetap berdetak 60×/dtk; yang dilewati hanya `composer.render()` — dibungkus lewat `EffectComposerContext` (library merender via useFrame priority 1, jadi semua priority 0 — termasuk penanda aktivitas — sudah jalan di tick yang sama sebelum keputusan skip). `useFrame` baru yang ditulis besok otomatis ikut pola tanpa tahu apa-apa.
- **Definisi idle** (satu fungsi, `isSceneActive`): dipaksa 60 fps penuh selama `!sceneReady` (sinyal loader, INVARIANTS §3), `pendingRoom !== null` (⚠️ menjaga kontrak `frameTick`/GridReveal — `markFrame()` menghitung tick dan anggapan "tick = frame tergambar" hanya sah karena tak ada skip selama transisi), `billiardActive` (bola menggelinding tanpa kamera bergerak), kamera menulis frame (tween/parallax — ditandai `CameraController` tepat setelah early-out-nya), sapuan reveal awal (`Office.tsx`), dan pointer move/down < 1 dtk (hover hologram/HoverScan tetap responsif).
- Efek samping yang diterima: karakter, video TV, LED bernapas jadi 30 fps saat ditonton diam — justru makin PS1.
- Penjaga: `renderPace.test.ts` (logika + pemeriksaan teks `markSceneActivity` tetap tersambung). Probe: `scripts/probe-render-pace.mjs` (Brave CDP) — **idle 0,50 · pointer 1,00**. Debug console: `window.__renderPace()`.

### dpr 1,5 → 1 + `image-rendering: pixelated`

Buffer 2,25× lebih kecil, dan SEMUA ongkos per-piksel (scene + N8AO + Bloom + grade) ikut turun sebesar itu. Upscale browser dibuat **kotak tegas** (pixelated), bukan blur bilinear — resep basement.studio (render internal rendah + Nearest) dan sejalan preferensi tepi bergigi (§4s: MSAA tetap 0). Override A/B look: **`?dpr=0.25–2`** (pola module-level yang sama dengan `?tear`/`?glitch`/`?dust`). Turun lebih jauh (0,5–0,75) = keputusan tampilan Keano, belum diambil.

### Adaptive dpr — termostat, bukan angka mati (`adaptiveDpr.ts` + `AdaptiveDprDriver.tsx`)

Setelah dua lever pertama Safari **masih** "agak lag", opsi #4 ikut dimajukan: tangga **[1 → 0,85 → 0,75 → 0,6]** yang dikemudikan frekuensi rAF nyata — perangkat kencang menetap di 1, yang keteteran turun sendiri sampai muat. Logika murni terpisah dari React (unit-testable tanpa WebGL). Tiga jebakan dijaga eksplisit:

1. **Cap OS ≠ GPU jenuh, dan keduanya KEMBAR di jendela aktif.** Low Power Mode Safari meng-cap rAF ke 30 fps; monitor naif membanting dpr ke minimum tanpa hasil. Keseragaman frame time TIDAK membedakannya — GPU jenuh terkunci vsync juga rata sempurna di 33,3 ms (persis gejala pemicu). Pembedanya **jendela idle dari cap 30 fps sendiri**: GPU jenuh pulih ke ~16,7 ms saat separuh draw dilewati; cap OS tetap 33,3 ms berapa pun bebannya. Tanpa bukti idle → tahan posisi (salah tahan = status quo; salah turun = membanting sampai mentok).
2. **Sampel jujur:** keputusan hanya dari sampel fase aktif (`isSceneActive` yang sama dengan cap idle) — tick idle setengah nganggur mencemari pengukuran.
3. **`?dpr=` menang:** ada override → driver tidak di-mount sama sekali.

Mekanika kestabilan: jendela 60 sampel aktif; turun butuh 2 jendela lambat beruntun, naik butuh 4 sehat; cooldown 120 tick pasca-langkah (hitch realloc buffer jangan terbaca "lambat"); bolak-balik kedua **mengunci di tangga bawah**; jeda >250 ms (kompilasi shader, pindah tab, pause gate) membuang jendela — ambang yang sama dengan gerbang sweep Office. Tangga terakhir diingat **per-tab** (sessionStorage, sengaja bukan localStorage — colok charger mengubah kesanggupan mesin). Debug: `window.__adaptiveDpr()`.

Dua gotcha implementasi yang mahal kalau diulang:

- 🔥 **dpr WAJIB state React → prop `<Canvas dpr={dpr}>`**, bukan `setDpr()` imperatif — pelajaran yang persis sama dengan FrameloopGate (terukur gagal 4 Agu): R3F menyinkronkan ulang prop tiap re-render dan menimpa panggilan imperatif.
- ⚠️ Nama file driver **bukan** `AdaptiveDpr.tsx`: di filesystem macOS yang case-insensitive ia bentrok dengan `adaptiveDpr.ts` (beda kapital saja) dan tsc menolak (TS1149).

Penjaga: `adaptiveDpr.test.ts` — termasuk test kembar cap-OS-vs-GPU-jenuh. **Estimasi gabungan: beban idle ~25–30% dari sebelumnya.** Status: terverifikasi CDP (mount default dpr 1; `?dpr=0.75` → driver mati + buffer 1080/1440); **belum dikonfirmasi Keano di Safari-nya sendiri** — lihat butir (f) di "Berikutnya".

---

## 4ak. 🐛 Bayangan Kontak Berubah-ubah Bentuk: Bake Liar drei ✅ (19 Agu)

Laporan: bayangan meja billiard **berubah bentuk setiap navigasi** Home → Services → Home (kadang selubung gelap kotak besar menutupi bidang). Commit `5aa322e`.

### Akar: `let count = 0` di badan render drei

`ContactShadows` drei (v-sekarang, `ContactShadows.js:72`) menyimpan penghitung bake-nya sebagai **variabel biasa di badan render** — bukan ref. Tiap re-render komponen me-reset hitungan → bake `frames` frame **diulang dari nol, di momen acak yang tidak dijaga siapa pun**. Dan re-render Scene menurun sampai sana lewat banyak jalur: **flip `heroInView`** (tiap scroll konten↔hero), **langkah AdaptiveDpr** (§4aj — memperbanyak pemicunya), **toggle billiard**. Jadi kontrak yang tertulis di rig ("dipanggang sekali per masuk ruangan, jatuh di bawah tirai") **tidak pernah benar**: bayangan terpanggang ulang berkali-kali di luar tirai, dan tiap panggangan memotret keadaan sesaat yang berbeda — pose karakter, state transien apa pun di mesin lambat. Bentuk bayangan = potret momen acak terakhir.

### Perbaikan tiga lapis

1. **Elemen `<ContactShadows>` dibangun di `useMemo` ber-dep `[currentRoom]`** — identitas elemen yang stabil membuat React **bail-out** re-render subtree-nya, closure useFrame drei (beserta `count`) selamat, dan bake benar-benar sekali per masuk ruangan. Dep-nya sekaligus menggantikan peran `key` lama: ganti ruangan = elemen baru = remount = bake ulang yang memang diinginkan.
2. **`NO_BAKE_LAYER` (layer 2): Dust keluar dari pass depth.** Pass bake memakai `scene.overrideMaterial` yang membuang vertex shader wrap Dust — titik-titik tergambar di **posisi BASIS**-nya (kotak [0,9)² di sekitar titik asal dunia, menyerempet bidang Lounge), bukan posisi yang terlihat mata; dan shader `MeshDepthMaterial` tidak pernah menulis `gl_PointSize`, jadi ukuran titik untuk primitif POINTS **undefined per spek GLSL** — 1px di kebanyakan driver, bebas berapa pun di driver lain (kandidat kuat selubung tebal di mesin pelapor). Kamera ortografis drei hidup di layer 0 saja → objek ber-layer ini otomatis lolos bake; kamera utama `enable(NO_BAKE_LAYER)` di `onCreated`. ⚠️ Layer 1 sudah milik `DYN_LAYER` billiard.
3. **Dep `billiardActive` di effect `treatAsOpaque`** — keluar billiard me-remount mesh penangkap **tanpa flag** (effect lama cuma keyed `currentRoom`), menghidupkan lagi bug "bayangan menerangi lantai" (§4-riwayat N8AO) khusus setelah main billiard — kombinasi yang hampir mustahil dilacak belakangan.

### 🔥 Pelajaran probe: netralkan parallax sebelum diff screenshot

"Reproduksi" pertama (diff antar-kunjungan membesar di bawah CPU throttle 8×) ternyata **artefak probe sendiri**: klik navbar memindahkan pointer → parallax menggeser kamera sub-piksel → diff penuh garis tepi yang terbaca "bayangan berubah". Setelah mouse dipindahkan ke titik tetap + tunggu damp settle sebelum tiap screenshot, diff jatuh ke nol — dan justru itu yang membuktikan bake-nya deterministik di mesin uji, mengarahkan pencarian ke mekanisme re-bake liar di atas. Aturan praktisnya: **diff screenshot scene yang punya parallax kursor wajib menstandarkan posisi pointer dulu.**

Penjaga: `contactShadowsRig.invariant.test.ts` — useMemo tetap terpasang + kontrak `NO_BAKE_LAYER` tersambung di ketiga sisinya (definisi, `layers.set` di Dust, `enable` di kamera). Verifikasi: throttle 8× + 3× bolak-balik Home↔Services → tidak ada varian blob; dust tetap terlihat mata.

---

## 4al. 🐛 404 saat Refresh di Rute SPA ✅ (20 Agu)

Refresh (atau deep-link) di `/people` dkk. di produksi jatuh ke 404. Sebabnya di tumpukan servernya sendiri (§7): pm2 + `serve` Vercel melayani `dist/` sebagai berkas statis biasa — `/people` bukan berkas fisik, dan `serve` tidak dijalankan dalam mode SPA. Selama ini tidak ketahuan karena navigasi internal ditangani React Router di sisi klien; 404-nya baru muncul saat request pertama benar-benar menyentuh server.

Perbaikan: `public/serve.json` berisi satu rewrite `** → /index.html`. Dua sifat yang membuatnya cukup:

- **Rewrite `serve` hanya berlaku untuk request yang tidak menemukan berkas** — aset nyata (`/assets/*.js`, `/3d/models/*` beserta Range request-nya, §4ai) tetap dilayani apa adanya.
- **Ditaruh di `public/`, bukan dikonfigurasi di server** — Vite menyalin `public/` ke `dist/` saat build, jadi konfigurasinya ikut terdeploy bersama artefak dan tidak ada langkah manual yang bisa terlupa di server. (Konsekuensi sisi lain dari perilaku salin-`public/` yang pernah bocor jadi URL publik saat bersih-bersih 13 Agu — kali ini perilakunya justru dimanfaatkan.)

Commit `3fc9410`.

---

## 4am. Rombak People: Roles V1, Testimonial Spotlight, Foto Asli ✅ (20 Agu)

Halaman People (ruangan Office sejak penukaran §4ah) dirombak besar supaya kontennya berhenti jadi placeholder dan look-nya menyusul V1 yang sudah tayang. Commit `8893c5a`; 308 test lulus (50 berkas, naik dari 251/46).

### `CareersRoles` — port careers V1, empat komponen jadi satu

`CareersPromote`, `HiringStack`, `CareersRoleHero`, `CareersRoleChip`, dan `promote-logic` **dihapus semua**, diganti satu `CareersRoles.tsx`: daftar role gaya V1 (Website-CSI `index.html` §careers) — baris bernomor dengan judul besar, **preview foto yang membuka dari tengah dan mengikuti kursor**, accordion satu-terbuka untuk detail. Konten overview + skills **diambil utuh dari careers V1 yang sudah tayang** (bukan placeholder), foto per role di `public/careers/`.

Port vanilla JS → React dengan tiga penyesuaian sadar (tercatat di header berkasnya): toggle hanya di header (`<button aria-expanded>`, bukan seluruh item clickable — tidak ada interactive-dalam-interactive), tinggi body via `grid-template-rows` 0fr→1fr (bukan ukur `scrollHeight` manual), dan tirai reveal dua panel `::before/::after` diganti `clip-path` inset 50%→0 (efek sama tanpa harus menyamakan warna panel dengan latar).

Halaman ini jauh lebih berat dari V1, jadi mekanika hover-nya ditulis ulang untuk compositor:

- **Preview digerakkan imperatif per-frame** (lerp rAF ke kursor) lewat **transform, bukan `style.left`** ala V1 — `left` pada elemen absolut menginvalidasi layout dokumen tiap frame. `mousemove` tidak memicu render React sama sekali; hanya visibilitas yang state. `rect.left` header di-cache saat `mouseenter` (scroll vertikal tidak mengubahnya) supaya tidak ada `getBoundingClientRect` per-mousemove.
- **Ekspansi baris saat hover hanya menumbuhkan padding-BOTTOM** (+`items-baseline`, bukan center): judul tidak bergerak vertikal, satu-satunya gerakan teks adalah translateX di compositor. Ekspansi simetris + center membuat judul ikut animasi layout = patah-patah.
- **`will-change` persisten** pada judul — akan/lepasnya promosi layer di awal/akhir transform terbaca sebagai dua "snap" rasterisasi. Hover menerangkan lewat **opacity**, bukan animasi `color` yang me-repaint glyph tiap frame.
- **Akar "flick" yang sebenarnya = gotcha Tailwind v4**: `translate-x-3` di-generate sebagai properti CSS `translate`, bukan `transform`, jadi transisinya wajib mencantumkan `translate` — `transition-[...,transform]` tidak menganimasikannya sama sekali. (Sekarang tercatat sebagai aturan umum; pertama kali kejadian di sini.)

Touch (`useCoarsePointer`): tanpa hover, foto role tampil di dalam body accordion — meniru fallback `.role-photo-mobile` V1.

### `TestimonialSpotlight` — quote raksasa gaya basement

Kartu blockquote lama di Office.tsx diganti spotlight: tanpa kartu, **quote-nya adalah layout** — teks tengah ukuran besar dengan **hairline di dasar tiap baris** via `repeating-linear-gradient` berjenjang `1lh` (unit `lh` mengikuti line-height terkomputasi, jadi garis tetap nempel ke baris di semua breakpoint tanpa ukur manual), panah prev/next memutar entri.

- **Tinggi dikunci sizer**: replika tak terlihat merender SEMUA entri menumpuk di satu sel grid, jadi kolom tengah selalu setinggi entri terpanjang — pindah ke quote pendek tidak menggeser panah/section di bawahnya; entri aktif absolute di atasnya.
- **Index + arah slide satu state** (`[index, direction]`): kalau terpisah, exit `AnimatePresence` bisa memakai arah basi dari klik sebelumnya.
- `aria-live="polite"` — pergantian quote tidak memindahkan fokus.
- ⚠️ Isinya masih **placeholder fiktif** (`TODO(content)` di berkasnya) — nama/instansi karangan, bukan endorsement sungguhan.

### `AwardsShowcase` — founder-section v1 dihidupkan lagi

Dirombak memakai desain `founder-section-demo.html` V1 yang tidak pernah tayang: baris pencapaian besar + kartu founder (Fami, foto asli di `public/people/fami-*.jpg`), hover meredupkan baris lain, **foto mengekor kursor dengan lerp + rotasi dari kecepatan mouse**. Yang sengaja TIDAK dibawa dari demo: custom cursor (keputusan look satu-halaman; di satu section saja ia lenyap-muncul di perbatasan dan terbaca bug) dan **scramble teks pada hover — dicabut atas permintaan Keano 20 Agu, jangan pasang lagi**.

Dua detail yang sempat jadi bug:

- **Tinggi preview dibulatkan ke piksel utuh** — 240 × 426/640 = 159,75px membuat tepi bawah foto jatuh di tengah piksel; browser menambalnya dengan baris interpolasi semi-transparan yang terbaca "garis putih di bawah foto", paling kentara saat foto bergerak.
- **Pop masuk & keluar = satu gerakan diputar balik** (permintaan 20 Agu; versi grid-fade dicoba lalu diganti): EXIT_EASE = cermin kurva back-out masuknya — `cubic-bezier(a,b,c,d)` dibalik jadi `(1-c, 1-d, 1-a, 1-b)`.

### Foto asli & penyesuaian ikutan

- **TheCrew & PeopleValues pakai foto asli crew** (`public/people/*.webp`, `src/data/people.ts` diperbarui). Dinding foto: celah `gap-px` → `gap-1` + tiap kotak diberi `border border-white/[0.08]` supaya sel kosong tetap terbaca sebagai sel (outline via `border`, bukan `ring` — `ring-1` sudah dipakai penanda kotak aktif). `grayscale` di foto PeopleValues dicabut.
- **Heading Office.tsx menyamai h2 CsiHero** (`text-4xl sm:text-6xl lg:text-7xl`, `max-w-5xl`) — keduanya heading pembuka ruangan yang menempel ke hero 3D, skalanya harus terbaca setara. Eyebrow "Services" dicabut: navbar sudah menyebut nama halamannya.
- **`LineMask` dapat pasangan `pb-[0.15em]` + `-mb-[0.15em]`** — descender ("g", "y") keluar dari line box saat line-height ketat dan terpangkas `overflow-hidden`; pb memberi ruang, -mb seukuran menariknya kembali sehingga tinggi layout tidak berubah. Posisi awal `y: 110%` tetap tersembunyi.
- **`GridReveal` `SWEEP_MS` 420 → 800** — 420 ternyata masih di sisi "respons" dari tawar-menawar §4ah; sapuannya lewat sebelum kisinya sempat dinikmati. 600 masih kurang; 800 dipilih Keano setelah melihat keduanya.
- **Jarak subtext `PeopleIntro` ke heading dirapatkan** `mt-16` → `mt-8` (laporan 20 Agu, celahnya terbaca menganga).

### Skrip ukur baru (pola CDP §4r, Brave via `CSI_BROWSER`)

- `scripts/shoot-careers.mjs` & `shoot-testimonial.mjs` — screenshot section terkait.
- `scripts/measure-careers-hover.mjs` — frame time roles-list per fase: idle vs hover-sweep vs buka accordion, untuk A/B "lag setelah port V1". ⚠️ Terima argumen **cpuThrottle** (mis. 4): M2 tanpa throttle mengunci 60fps dan menyembunyikan selisih ongkos antar-fase — jebakan yang sama kelasnya dengan "wajib dpr 2".
- `scripts/attribute-scroll-hitch.mjs` — jawaban untuk "lag-nya di section mana?": wheel-scroll `/people` atas-ke-bawah sambil mencatat `scrollY` tiap frame, cetak frame terpanjang + posisinya relatif batas-batas section.

---

## 4an. Grading Foto via ffmpeg + Velocity Blur ke Kartu ✅ (21 Agu)

`P1330392.JPG` (foto main UNO di lounge, `~/Documents/Foto foto CSI/Office/`) di-color-grade lalu diberi zoom-blur radial tipis yang menarik fokus ke kartu merah "9" di tengah meja. Output: `P1330392_velocity.jpg` full-res di folder yang sama. *(Update 21 Agu: versi webp-nya — `P1330392_velocity.webp` + `P1330392_noir.webp` — sudah masuk `public/home/` dan velocity dipakai section Vision, lihat §4ar.)*

### Resep grading (terbukti sejak P1330346, 20 Agu)

Mesin tidak punya ImageMagick — semua grading via `~/.local/bin/ffmpeg` (⚠️ `ffprobe` TIDAK ikut terinstall; dimensi dibaca dari stderr `ffmpeg -i`):

```
colortemperature=temperature=9800:pl=0.85,curves=master='0/0 0.21/0.15 0.5/0.5 0.79/0.84 1/1',vibrance=intensity=0.28
```

- ⚠️ **Arah `colortemperature` kebalikan dari intuisi "suhu lampu"**: Kelvin RENDAH = output makin hangat/oranye, TINGGI = mendinginkan. Menetralkan cast amber lampu kantor = ~9800K, bukan 4300K (kesalahan 20 Agu, hasilnya makin kuning).
- Urutannya prinsip, bukan kebetulan: **netralkan white balance dulu, baru kontras + vibrance**. Grade yang mempertahankan cast warm (look teal-orange/warm-film) sudah pernah ditolak — lampunya sendiri sudah amber, hasilnya kuning semua.
- Workflow: preview 1400px ke `/tmp/grade` → lihat → iterasi → render full-res `-q:v 2`.

### Velocity blur (zoom-blur radial) tanpa plugin — mix + maskedmerge

ffmpeg tidak punya filter radial/zoom blur; disusun dari primitif:

1. **12 salinan ter-zoom bertahap** (1.00093× … 1.0112×) dari foto ter-grade, masing-masing `scale=iw*z:ih*z` lalu `crop=W:H:cx*(z-1):cy*(z-1)`.
2. `mix=inputs=13` (asli + 12 salinan, bobot rata) → smear yang arahnya radial dari titik pusat zoom.
3. `maskedmerge` dengan mask radial `geq` — putih (tajam) di sekitar kartu, fade ke hitam (blur penuh) di tepi. Full-res: tajam ~radius 1000px, fade habis di ~2165px dari kartu `(2493, 1700)`.

Tiga jebakan yang ketemu:

- **Pusat zoom ≠ pusat frame.** Kartu ada di `(2493, 1700)` dari 4592×3448. Zoom "diam di titik itu" = offset crop `cx*(z-1), cy*(z-1)` — tanpa ini smear-nya konvergen ke pusat frame, bukan ke kartu.
- **Mask gray untuk maskedmerge**: kerjakan semua stream di `format=gbrp` dan konversi mask `gray→gbrp` (channel tereplikasi) — mask satu-plane atas stream YUV cuma mengenai luma.
- **"Tipis" = setengah dari yang terasa pas di preview kecil.** Versi pertama (8 step s/d 1.02×) terbaca oke sebagai efek tapi wajah di tepi jadi rusak; final 1.0112× dengan step lebih banyak (12) supaya di full-res gradasi ghost-nya tidak bertangga. Kalibrasi intensitas di preview 1400px dulu — full-res satu render ~30 dtk.

---

## 4ao. Lift Scroll Hero — Kamera Melorot, Pandangan Terkunci ✅ (21 Agu, commit `965014d`)

Saat halaman digulir melewati hero, kamera "turun lift": Y meluncur turun mengikuti progres scroll (0 = hero penuh, 1 = hero habis), sementara **titik pandang TIDAK ikut** — terkunci di target ruangan. Karena mata terpaku ke titik yang sama sementara kepala turun, **dongakan ke atas muncul SENDIRI dari lookAt**. Versi pertama (titik pandang ikut turun + kurva dongak kedua) **dicabut** pilihan Keano: dua gerakan bisa saling membatalkan di layar, satu gerakan tidak.

- Matematika murni di `scrollLift.ts` (+ `scrollLift.test.ts`), integrasi di `CameraController.tsx`; potret verifikasi `scripts/shoot-lift.mjs`.
- Kurva turun = Hermite klasik di **sepanjang** progres — tidak dipadatkan ke sebagian rentang, jadi terasa mengikuti gulir, bukan menghunjam.
- **Anti-void geometris, bukan kalibrasi**: turunnya dangkal (`LIFT_DROP_MAX` 0,6 m; pose 1,13–1,60 berakhir 0,53–1,00, setinggi mata orang duduk) DAN dijepit `LIFT_MIN_CAM_Y` 0,35 yang berada di atas lantai (y=0). Selama mata di atas lantai, lantai menutupi void dari sudut mana pun — angka-angkanya bebas di-tweak tanpa bisa bocor.
- Pengejaran progres `LIFT_TAU` 0,12 — lebih tegas dari parallax (0,22): Lenis sudah menghaluskan scroll-nya, peredam di sini cuma penata frame.

## 4ap. 🐛 Debu Patah-patah di Tab yang Hidup Lama: Presisi float32 `uTime` ✅ (21 Agu, commit `fc53b88`)

`uTime` debu dulu bertambah tanpa batas, dan uniform float diunggah ke GPU sebagai **float32 (mantissa 24 bit)** — makin besar nilainya makin kasar langkah yang bisa diwakilinya. Pada ~9 jam ulp-nya ~4 ms (¼ frame) dan gerakan mulai bertangga; ~37 jam ulp = satu frame penuh — debu beku lalu melompat. Bug kelas "tak akan pernah ketemu di sesi dev", cuma di tab yang ditinggal hidup.

- **Fix: waktu dilipat ke `[0, 800)` (`TIME_WRAP`)** — sah tanpa sambungan terlihat karena semua gerakan shader periodik DAN 800 kelipatan bulat semua periodenya: sway 20 dtk × 40 putaran persis; laju naik `RISE` digeser ke 1/32 supaya `RISE × 0,1 × 800 = 2,5` = tepat tinggi pita Y.
- Syarat kedua yang tidak gratis: **laju naik per bintik DIKUANTISASI 9 tingkat (0,6–1,4, langkah 0,1)** — bukan estetika, tapi syarat matematis: wrap hanya tak terlihat kalau tiap bintik menempuh kelipatan **bulat** pita Y per periode, dan itu butuh laju yang sepadan (commensurable). 9 tingkat × ~100 bintik berfase acak tetap terbaca taburan.
- Kedua syarat dijaga `dust.wrap.test.ts` (konstantanya di-export khusus untuk itu).
- **Verifikasi tanpa menunggu berjam-jam**: `?dustT0=8388608` (DEV-only) membuka halaman seolah tab sudah hidup selama itu; `scripts/probe-dust-precision.mjs` membuktikan — sebelum fix debu hanya bergerak di 5/13 pasangan frame, sesudahnya 13/13.
- ⚠️ **Bug laten yang sama masih ada di hatch Waypoints** (uniform waktu tak berbatas) — belum digarap.

## 4aq. Services: Accordion → Sabuk Teks 3D ala Lusion ✅ (21 Agu, commit `bfa8068`)

Accordion daftar layanan di `/services` diganti **panel putih rounded** (satu-satunya bidang terang di halaman) berisi 9 judul layanan sebagai **sabuk teks 3D tak berujung** (`ServicesTicker.tsx` + matematika murni `servicesBelt.ts`). `PinnedServiceStack` jadi tak terpakai. Porting **selektif** dari pmndrs `infinite-scroll`: diambil damping `MathUtils.damp` (λ=4), pop ke kamera sebanding laju, dan pudar-saat-diam/berwarna-saat-bergerak; **ditolak** ScrollControls (container scroll bohongannya rebutan wheel dengan Lenis) dan duplikasi-konten + teleport-scrollbar — wrap modulo per item (`beltX`) lebih sederhana dan tanpa titik sambung.

- **Wheel disandera di atas panel (desktop)**: non-passive `preventDefault` + `stopPropagation` sebelum sampai Lenis — kursor di panel = geser sabuk, keluar = scroll halaman. `deltaMode` 1 (baris, Firefox) dinormalkan ~16 px.
- **Drag horizontal (revisi hari yang sama, untuk HP)**: pointer events → jalan untuk sentuh DAN mouse. Konversi px→unit-dunia lewat tinggi panel (`VIEW_H / clientHeight`) supaya konten menempel jari **1:1**; sentuh dikali `DRAG_MULT_TOUCH` 1,5 ("sedikit lebih licin" — slot HP selebar layar, 1:1 butuh sapuan penuh per item). `touch-action: pan-y` menyerahkan gestur vertikal ke halaman: geser atas-bawah tetap scroll, kanan-kiri milik sabuk. Label: "Drag to explore".
- **Mobile**: panel 45svh (desktop tetap 70svh) + faktor judul diperkecil 0,13 → 0,095 (slot HP = selebar viewport; faktor desktop membuat judul 3 baris menelan panel).
- **Canvas KEDUA di halaman** (pelajaran "laptop panas" §4ac tetap dihormati): `frameloop="demand"` — wheel/drag memesan frame lewat `invalidate()` yang diserahkan keluar canvas (pola `PublishInvalidate`), dan `useFrame` memesan frame lanjutan sendiri **selama damping/warna belum menetap** (ambang `SETTLE_*`). Diam = 0 draw call, tanpa gerbang inView.
- Aksesibilitas: teks troika bukan DOM → panel `aria-hidden`, daftar layanan yang terbaca mesin = `<ul>` sr-only di `Office.tsx` (termasuk desc + subs bekas accordion).
- Gotcha kecil: prop `uniforms` R3F menyalin (§4v) tidak relevan di sini karena warna ditulis langsung ke material troika per frame — justru **jangan** lewat prop `color` (memicu re-layout glyph).

## 4ar. Perampingan Sections: Eyebrow Dicabut, Vision Pakai Foto ✅ (21 Agu, commit `c978877`)

Batch penyederhanaan serempak — pola **eyebrow kecil di atas heading dicabut** di empat section (Portfolio/CaseGrid, Featured/CaseStudySpotlight, "Meeting Room · The Work"/MeetingLead, "Our Vision"/Vision): navbar dan heading-nya sendiri sudah menyebut konteksnya.

- **Vision dirombak total**: `ScrollHighlight` + `MissionShowcase` (5 kartu misi berfoto Unsplash) dibuang → satu headtext bold besar + **foto kantor asli ter-grading** `P1330392_velocity.webp` full-bleed (aspect 16/9 di HP, 90vh di desktop). Foto §4an akhirnya masuk situs; Unsplash keluar.
- **MeetingLead**: heading disamakan skala `CsiHero` (grid 2 kolom + panel stat 8+/50+/4 dibuang — angka fiktif menunggu konten betulan).
- **TheCrew**: `NumberTicker` diganti angka statis.
- **🐛 CareersRoles di HP — meta menumpuk di atas judul**: baris role dulunya `flex-wrap` dengan judul `flex-1` + meta `basis-full`. Jebakannya: `flex-1` = basis **0%**, jadi `0% + 100% ≤ 100%` — keduanya "muat" di SATU baris flex, judul kebagian 0px dan teksnya meluap per kata. Fix: mobile jadi **grid 3 kolom** (judul | meta | panah) ala tabel "Open Positions" basement — tepi kiri meta lurus antar baris, boleh wrap. JANGAN kembalikan ke flex-wrap (komentar penjaga ada di berkasnya).
- Test ikut dibalik: `CaseGrid.test.tsx` kini memastikan eyebrow "Portfolio" **tidak** kembali (pola yang sama dengan test "Talk to us" di Office).

## 4as. Audit Teks: Em Dash Dihapus dari Semua Copy ✅ (21 Agu, commit `e2202ba`)

Permintaan Keano: audit seluruh teks yang **tampil** di situs, hapus semua dash. Hasil: **16 titik em dash (—) di 9 berkas** — `<title>` + `og:title` + `twitter:title` di `index.html`, quote TestimonialSpotlight, desc Process & Careers & Office/Services, MeetingLead, pesan sukses ContactForm, label loader ("loading 3d office 57%"), `aria-label` logo Navbar ("Cogniti, home"), dan pemisah daftar sr-only di `Office.tsx` (`{title} — {desc}` → `{title}: {desc}`).

- Di kalimat yang butuh jeda, dash diganti **koma/titik** seadanya — bukan dihapus polos yang meninggalkan run-on ("for years what used to take…").
- **Lingkup: teks tampil saja.** Komentar kode (ratusan em dash) dan pesan `console.*` (dev-facing) sengaja **tidak disentuh** — audit "teks di website" bukan alasan menyapu komentar.
- Cara audit yang kepakai: grep `—|–` lalu saring baris komentar; pola hyphen berspasi (` - `) dan en dash di teks tampil ternyata **nol** (satu-satunya hit = `calc(1lh - 1px)` di CSS dan nama mesh Sketchfab di komentar).

## 4at. Services Ticker: Penggerak Dipisah per Perangkat ✅ (21 Agu, commit `4bf5b63`)

Revisi §4aq atas permintaan Keano: **desktop hanya wheel, layar sentuh hanya drag** — drag mouse di desktop dicabut. Gerbangnya `useCoarsePointer` (soal INTERAKSI, bukan lebar layar — pembagian kerja vs `useNarrowViewport` yang sudah baku): efek drag di `ServicesTicker.tsx` hanya dipasang saat pointer coarse (dep `[coarse]`), dan **hint di kaki panel ikut sumber yang sama** — "Scroll to explore" (fine) vs "Drag to explore" (coarse), jadi teks dan perilaku tidak mungkin selisih. `cursor-grab` ikut dicabut (tanpa drag ia menyesatkan).

- Test `Office.test.tsx` yang mencari "drag to explore" disesuaikan jadi regex `/(scroll|drag) to explore/i` — jsdom pointer-nya fine, jadi yang tampil "Scroll to explore".
- Diverifikasi CDP Brave 3 arah di `/services`: wheel desktop menggeser sabuk ✓, drag mouse desktop TIDAK ✓, drag sentuh (emulasi `pointer: coarse` + touch events) menggeser ✓.
- 🔥 Gotcha probe yang sempat menyesatkan: `clip` di `Page.captureScreenshot` memakai **koordinat DOKUMEN** (wajib `+scrollX/scrollY`), bukan viewport — clip dari `getBoundingClientRect` mentah memotret area hero yang gelap, dan diff before/after selalu "identik" (dua putaran pertama menyimpulkan "drag mati di mobile" padahal probe-nya yang buta).

## 4au. Industries: Galeri Diganti Tumpukan Raycast-Cycling 3D ✅ (23 Agu)

Galeri kolom expanding (`IndustriesGallery`, DIHAPUS) diganti `IndustriesStack.tsx` — porting pmndrs/examples **`raycast-cycling`** atas permintaan Keano, didiskusikan dulu sebelum eksekusi: **strip putih full-bleed tanpa radius** (kontras identitas dengan panel Services yang rounded; strip menempel tepi bawah section, hairline `border-y` section jadi bingkainya), heading pindah dari kolom sticky kiri ke blok atas (pola Office). Komposisi scene **setia ke demo** (revisi di hari yang sama — versi pertama kipas foto tegak ditolak Keano): 13 plank kaca buram `[2×6×0.075]` membentuk tangga spiral (`sin/cos(i/5)`, naik `i·0.5`, puntir `i/π/2`), kamera verbatim `[-10,10,5]` fov 50 (varian di-zoom + dibidik centroid DICOBA & GAGAL — ekor spiral memang mengayun ke kamera, terpotong), panggung demo (ambient + 2 directional + `shadowMaterial`), hover = tint aksen `#fed7aa` (pengganti aquamarine demo). **Pulse sin demo dicabut** atas permintaan Keano ("hilangin effect berdenyut") — bonus: demand benar-benar diam saat kursor berhenti.

- **Inti mekanisme (dari demo)**: override `events.filter` R3F **merotasi** daftar intersection — plank ke-N di tumpukan "dianggap terdepan" — lalu `onPointerCancel(undefined)` + `onPointerMove(lastEvent)` palsu supaya hover berpindah ke plank hasil rotasi. HUD DOM di kaki strip: titik per lapisan tertusuk ray + `num · nama · desc` + tag Core Focus.
- **`<CycleRaycast/>` drei TIDAK dipakai mentah, di-fork** (~100 baris): (1) wheel listener aslinya di `document` dengan `preventDefault` TANPA SYARAT (sebelum cek `hits.length`) — sekali mount, scroll halaman mati total; (2) `keyCode` default 9 = **Tab**, membajak navigasi keyboard. Fork: listener di strip, **wheel hanya disandera saat ray kena ≥2 plank** (kesepakatan diskusi: strip selebar viewport, sandera penuh ala Services = jebakan scroll 70svh), tanpa key.
- **Mode fokus (klik)**: plank terbang ke kiri layar — posisi dari `unproject` NDC `[-0.45,-0.04]` + 8,8 unit di depan kamera (bukan angka dunia hardcoded), `slerp` ke quaternion kamera, expand `[2.2,1.1,1]` — jadi kartu foto; sisa tangga fade out dan **blob bayangan ikut pudar via opacity `shadowMaterial` lantai** (bayangan three tidak kenal opacity mesh; `BakeShadows` demo dicabut karena shadow map kini harus ikut bergerak); panel deskripsi DOM slide dari kanan (AnimatePresence). Tutup: klik kartu / tombol back / `onPointerMissed`. Foto dimuat **imperatif saat diklik** (TextureLoader + cache per URL — bukan `useTexture`, 13 foto tidak diunduh untuk pajangan spiral), duduk di **plane anak** (bukan `map` di box: 6 sisi box berbagi UV, rusuk 0,075 jadi garis warna aneh). Selama fokus wheel-cycling mati.
- **Kontrak canvas ke-3**: `frameloop="demand"`, dpr `[1,1.5]`, tanpa AA; semua animasi (lerp warna, progress fokus, fade, bayangan) memesan frame sendiri sampai `SETTLE`; mount digerbangi `useInView` margin 600px. Gerbang pemakaian **`isDesktop && !coarse`** — tablet sentuh 1024px+ jatuh ke `IndustriesMobile` (galeri lama cuma patokan lebar); AT membaca `<ul>` sr-only di `Industries.tsx` (pola Office), test desktop diarahkan ke sana.
- 🐛 **Gotcha yang kejadian**: lupa pasang `ref` di `<meshBasicMaterial>` → `matRefs` kosong → loop damp `continue` semua → `settled` selalu true → **rantai invalidate demand mati TOTAL tanpa error** — HUD tetap hidup (jalur React state, bukan frame) jadi tampak "setengah jalan". Diagnosis: diff screenshot ffmpeg `YAVG≈0` + probe `window.__indStackDebug` (frames berhenti di 1).
- 🔥 **Raycaster three TIDAK memeriksa `visible`** — tanpa saringan `h.object.visible` di filter, klik "area kosong" saat fokus bisa mendarat di plank yang tak terlihat.
- 🔥 **Gotcha probe CDP + Lenis** (`scripts/shoot-industries-stack.mjs`): setelah wheel menscroll halaman, `window.scrollTo` native langsung ditarik balik rAF Lenis → koordinat "restore" basi dan klik meleset (dua putaran tampak "fitur rusak" padahal skripnya). Baca rect apa adanya tanpa scroll ulang; titik klik jangan di y kecil (navbar fixed menelan klik).

---

## 5. Foto Referensi

| Folder | Isi |
|---|---|
| `Photo-reference-office/converted/` | Kumpulan foto referensi (dulu `Living-room-photo/`, di-rename 17 Jul). Lounge/smoking per objek (IMG_6109–6142): panel meteran 6138/6139, vas palem 6141, plant stand + anggrek 6142, dinding kaca 6160, kursi frame besi smoking 6163–6165, wall art 6167. Office: **IMG_6176_2** (convert 17 Jul); **IMG_6179–6184** (convert 18 Jul) — IMG_6179 = referensi meja kantor detail `ODesk_*` (oak top + pedestal laci + kaki loop besi); **IMG_6220–6227** (convert 20–21 Jul); **IMG_6240–6242** (convert 21 Jul); **IMG_6247–6250** (convert 22 Jul) = referensi pantry cabinet/kabinet dapur; **IMG_6252** (convert 22 Jul); **IMG_6254** = cabinet TV meeting room (23 Jul) |
| `Front-desk-Photo/` | 4 foto produk front desk (IMG_6155–6158) |
| `reference/` | Referensi lain + `SCAN-CHECKLIST.md`, `ROADMAP.md` |

## 6. Rencana Berikutnya (urutan)

1. ~~Bantalan kursi frame besi~~ ✅ selesai 14 Jul (+ loveseat di-rebuild konstruksi sama)
2. ~~Bake `M_SM_Rug_Grey`~~ ✅ selesai — sudah image texture, 0 material prosedural tersisa
3. ~~Scan + import Office Area + blockout kerangka~~ ✅ 17 Jul (dinding/pintu utara/pilar/tangga)
4. ~~Dinding kaca lounge ↔ office~~ ✅ 17 Jul (`GWO_*` kaca + pintu ganda)
5. ~~Furniture office awal~~ ✅ 17 Jul (desk island, meja, kabinet, whiteboard beroda) — lanjut kursi & aksesori
6. ~~Interior office: desk pod, elektronik (iMac/Magic KB/Mouse), lunch table+stool, bar stool, rak, tanaman, socket, partisi kaca `GWL_*`~~ ✅ 20–21 Jul + collection dirapikan
7. **Interior Office Area (finishing)** — 11 kursi kantor + bar counter + dispenser Brio + rak & meja tambahan ✅ ditempatkan; **cleanup asset import mentah ✅ SELESAI (2551→1189 objek)**; **pantry cabinet L + printer + shredder + wardrobe + microwave + bar table ✅ jadi (22 Jul)**; **pencahayaan office ✅ (track lighting + lunch pendant, 22 Jul)**; **collection dirapikan ✅ (0 loose, Brio di-flatten)**; **LED strip lantai ✅ + cubby join/oak + pintu oak (24 Jul)**. Sisa: isi pantry, verifikasi vs foto
7b. **Meeting Room** (§3c) — meja + TV 98" + cabinet + Rally Camera + Apple devices ✅ (23 Jul); kursi ×9 + mic pod ×4 + snake plant + pintu dibuka ✅ (24 Jul); **ceiling z2.94 + 6 downlight + frost UV + grouping `OP_MeetingRoom` ✅ (24 Jul)**. Sisa: kerangka dinding, deco kecil, rename AirVent
7c. **Optimasi poly + texture untuk web** (§4c) ✅ SELESAI 27 Jul — geometry −24.5% (760.871 tris), texture −61% (52.9 MP), curve convert, relink duplikat. Backup `*_ORIG` tinggal hapus saat final
7d. **Pre-export audit + MVP1 export** (§4d, §4e) ✅ SELESAI 27 Jul — 0 blocker
7e. **Merge objek** (§4f) ✅ SELESAI 27 Jul — draw call 2.522 → **401**
7f. **Bake lightmap** (§4g) ✅ SELESAI 27 Jul — 39 lampu realtime → **0**
8. ~~Export GLB seluruh scene~~ ✅ **MVP1 SELESAI 27 Jul — 8,0 MB, 50-60 FPS.** Pecah GLB per ruangan belum perlu
9. ~~**Karakter PS1** (§6b)~~ ✅ **SELESAI** — 28 Jul 4 karakter di Blender, **29 Jul jadi 5 karakter + di-export + tampil beranimasi di web**. Rencana vertex-color diubah jadi texture 256px `Closest`
10. **Integrasi ke web** (§4h) — 🚧 sebagian besar SELESAI 27–29 Jul: GLB jadi hero fullscreen, navigasi 5 ruangan + hash routing, navbar dropdown + scrollspy, `heroInView` gating, `MODEL_URL` dibetulkan, **karakter** (lampunya dihapus 6 Agu, §6b). **Sisa:** post-processing PS1
10b. **Migrasi Next.js → Vite** ✅ **SELESAI 29 Jul** (§4j, rekan tim) — SPA client-only, dev server 276 ms
11. ~~Minigame billiard~~ ✅ **DIBANGUN 28 Jul, engine diganti cannon-es 29 Jul** (§6d) — fisika terverifikasi lewat simulasi headless. ⏸️ Belum di-review di browser; bug bola di (0,0,0) dibetulkan 30 Jul
11b. **Konten V1 → V2 + animasi teks** ✅ **SELESAI 29 Jul** (§4i, rekan tim) — 9 section + 4 komponen `motion`
11c. **Navigasi waypoint 3D** ✅ **SELESAI 29–30 Jul** (§4k) — RoomNav + scroll/swipe/keyboard dicabut; 3 waypoint ternyata mustahil terlihat sejak ditulis
11d. **Lighting dirombak** ✅ **SELESAI 30 Jul** (§4l) — lightmap dinyalakan, N8AO + contact shadow, bloom 1,6→0,4, ambient 0,12→0,03. Light cone dibangun lalu dihapus
11e. **Sapuan "kantor terbentuk"** ✅ **SELESAI 30 Jul** (§4m) — dither Bayer 2,6 s, 60 FPS terverifikasi
11f. **Konten layar monitor** ✅ **TUNTAS 30 Jul – 7 Agu** (§6c) — Spotify pixel-art di AOC; video VS Code di MacBook (5 Agu, `VideoTexture`); EMPAT layar iMac (6–7 Agu, mesh gabungan dipecah runtime); **TV meeting & TV function (7 Agu)**. Tidak ada lagi layar kosong di scene
11g. **Loading screen isometrik (loader saat mengunduh)** ✅ **SELESAI 31 Jul** (§4n) — di-render di Web Worker, menjawab permintaan awal user
11h. **Semua pekerjaan 30 Jul di-merge ke `main`** ✅ **SELESAI 31 Jul** (§4o) — sekaligus perbaikan bug merge `frameloop="demand"` + `INVARIANTS.md`
11i. **Perangkat sentuh: scene jadi pemandangan** ✅ **SELESAI 3 Agu** (§4p) — waypoint & billiard mati di `pointer: coarse`, hero 70dvh di HP
11j. **Routing & konten per-ruangan** ✅ **SELESAI 3 Agu** (§4q, merge `join`) — 4 halaman (`/`, `/office`, `/meeting`, `/function`), Hero pindah ke `SiteLayout` supaya Canvas tidak remount, `Services` diserap ke Office. Blocker §6 (HP terkunci di Lounge) **terbuka** lewat room links navbar
11k. **Empat perbaikan performa** ✅ **SELESAI 3 Agu** (§4r) — MSAA dimatikan (**30 → 60 FPS**), engine matter-js dihentikan, mount-semua-ruangan dicabut, chunk billiard ditunda. Alat ukur CDP ikut disimpan
11l. **Bake ulang lighting 5 ruangan** ✅ **SELESAI 4–6 Agu** (§4s) — 212 lightmap, mood gelap-kontras + emission layar; tone di-tuning (resep ÷4/×4) & GLB dipangkas di level byte
11m. **Dua bug billiard "bola keluar meja"** ✅ **SELESAI 4 Agu** (§6d) — melayang di sambungan pelat kain + tunneling bola cepat lewat lubang; branch `fix/billiard-bola-keluar-meja` sudah di-merge
11n. **Tiga keluhan visual dari web + denoise** ✅ **SELESAI 6 Agu** (§4s, commit `514e8a7`) — hotspot oranye rak cubby A & B, cincin plafon meeting; denoise OIDN (noise −5,5×); `scripts/swap-lightmaps.mjs` bikin siklus re-bake jadi hitungan menit
11o. **Empat layar iMac terisi** ✅ **SELESAI 6–7 Agu** (§6c) — situs cogniti, easter egg, wallpaper, dasbor PM; mesh gabungan dipecah runtime, emissive diukur bukan dihitung
11p. **Dua TV terakhir terisi + gerbang video per-ruangan** ✅ **SELESAI 7 Agu** (§6c, commit `2b247d4`) — TV meeting (Desa+) & TV function (logo mantul DVD, disintesis `scripts/make-dvd-video.mjs`); TV function sekaligus membetulkan slab putih yang mekar
11q. **Panel "under maintenance"** ✅ **SELESAI 8–9 Agu** (§4t) — lubang pintu buntu Office ditutup panel dither Bayer, lalu **jadi interaktif** (hover teks melayang, klik glitch sobek). Dua aturan mahal ikut tercatat: `renderOrder` vs antrean transparan, dan keterbacaan dither yang berbanding terbalik dengan jumlah tangga kuantisasi
11r. **Glitch karakter saat idle** ✅ **SELESAI 8–9 Agu** (§4u) — irisan tergeser + kilasan dither putih di karakter saja (bukan fullscreen); fade lintas-ruangan memakai jarak ke **target pandangan**, bukan posisi kamera
11s. **Section konten dirombak + penjaga overflow HP** ✅ **SELESAI 9 Agu** (§4z, rekan tim) — Industries jadi kartu sektor, Vision jadi `MissionShowcase`, `NetworkField` dibuang (biang jank scroll sentuh), `overflow-x: clip` global
11t. **Kantor merespons kursor & perpindahan** ✅ **SELESAI 10 Agu** (§4v) — mouse parallax di ruang kamera, HoverScan, sobekan transisi, debu melayang. Dua gotcha R3F kelas berat ikut tercatat: **`onPointerMove` dipanggil per-perpotongan** dan **prop `uniforms` menyalin, bukan merujuk**
11u. **Hero mengalir tanpa pin** ✅ **SELESAI 10 Agu** (§4w) — HP dulu (tutup 40% layar kosong, 3D tak lagi kepotong), lalu **desktop menyusul ikut bentuk HP**: pin & surut dibongkar, seam `HeroHandoff` dicabut seluruhnya
11v. **Menu layar penuh di navbar** ✅ **SELESAI 10 Agu** (§4x) — adaptasi `#menu-overlay` situs tayang; burger **memorf** jadi "— Close."; empat sebab flick saat menutup dibetulkan; jam tiga zona digerbangi menu & bangun per menit (bukan `setInterval` selamanya)
11w. **Kantor bernapas saat ditinggal** ✅ **SELESAI 11 Agu** (§4y) — `idleClock` bersama, LED strip berdenyut, layar tidur di 45 dtk. Sekalian menemukan **FIX 4 yang mati diam-diam** karena nama material GLB berakhiran nama mesh
11x. **Review billiard di browser** ✅ **SELESAI 12 Agu** (§6d) — item tertunda paling lama di dokumen ini; Keano menilainya **clear, tanpa revisi**. Minigame billiard resmi **FINAL**
12. **⬅️ BERIKUTNYA, urut prioritas:**
    - ~~**Bug billiard**: bola yang masuk lubang harus dibekukan jadi `fixed`~~ ✅ **4 Agu** (§6d)
    - ~~**Rombak `CharacterLights.tsx`**~~ ❌ **DIBATALKAN 6 Agu** (§4s) — lampu ber-`layers` tidak pernah jalan di three; Keano memilih karakter tanpa lampu
    - ~~**Jalankan ulang `shrink-lightmaps.mjs`**~~ ✅ **sudah** — diverifikasi dari GLB: 188/188 lightmap 256px
    - ~~**a. Review billiard di browser** (§6d)~~ ✅ **SELESAI 12 Agu** — dinilai **clear tanpa revisi**; §6d ditutup sebagai FINAL
    - **b. Uji anti-beku loader di browser sungguhan** (§4n) — DevTools Performance saat kompilasi 233 shader; inti keputusan Web Worker, baru bisa dibuktikan mata
    - ~~**c. Sisa layar** (§6c) — TV meeting & TV smoking~~ ✅ **SELESAI 7 Agu** — keduanya terisi; blocker "SMK_TV belum punya UV" ternyata tidak pernah ada
    - **c. Selidiki p95 33 ms** di `/office` & `/meeting` (§4s) — dugaan skinning karakter, bukan tekstur
    - **d. Optimasi GLB lanjutan** (§4s) — atlas per ruangan + dedup 29 image kembar + audit pre-export (§4d)
    - **e. Post-processing PS1** (§4b) — pass terakhir untuk look basement.studio
    - ~~**Verifikasi waypoint Lounge & Function**~~ ✅ **SELESAI 3 Agu** (§4k) — semua waypoint terukur & terlihat
    - ~~**Sepakati satu lockfile**~~ ✅ **SELESAI 29 Jul — bun** (§7)
13. Dekorasi tambahan (tanaman via Sketchfab kalau integrasi di-enable)

### Polish opsional (tidak mendesak, MVP1 sudah jalan)
- Hapus backup mesh `*_ORIG` (5 objek) saat semua final
- Rename `AirVent_01..04` → `MR_AirVent_*`
- 4 spot track light lain yang masih tanpa lensa (kalau ketemu saat review)
- Post-processing PS1 (§4b) — lapisan opsional di viewer
- **Perbaiki stall kompilasi shader 2,3 s** (§4m) — kandidat: `KHR_parallel_shader_compile` / `compileAsync`
- **Bangun ulang light cone volumetrik** (§4l) kalau look-nya masih diinginkan — pakai setengah cangkang 180° + kerucut dalam, jangan ulangi dua kesalahan yang sudah dicatat

## 6b. Karakter (fase C3) ✅ SELESAI — 5 KARAKTER TAMPIL & BERANIMASI DI WEB (29 Jul)

Karakter low-poly gaya **PS1** untuk mengisi tour.

### Status: 5 karakter, sudah masuk `office.glb` dan jalan di browser

| Karakter | Posisi | Action | Tris | Material |
|---|---|---|---|---|
| **CH_Leonard** | duduk sofa lounge (−1.42, 4.39), hadap +X | `SittingIdle` (1 frame, statis) | 2.346 | `M_Character_Tex` |
| **CH_Person2** | mengetik di `OChair_Office_8` (−5.19, −4.00), hadap −X | `Typing_Loop` (96 frame) | 2.346 (mesh **dibagi**, 0 tris tambahan) | `M_Character_Tex` |
| **CH_Person3** | (−10.23, −4.47), rot Z 264.8° | `Typing_Loop_P3` (96 frame) | 3.102 (827 = rambut mesh sendiri) | + `6_characters.001` |
| **CH_Person4** | `MR_Chair_09` meeting room (−15.95, −0.39), hadap −X ke TV | `Person4_Static92` (pose beku) | 3.102 | + `M_Person4_Sweater` (hitam), `M_Person4_Hair` |
| **CH_Person5** | function room (−1.68, 8.95) | `P5_SittingIdle_Baked` (loop) | 2.346 | `M_Character_Tex` |

Masing-masing di collection sendiri. Tinggi 170 cm, rig Mixamo 65 bone prefix `mixamorig9:`. Di GLB: **5 skin, 5 klip animasi**, node per karakter dipecah jadi `_Body/_Collar/_Pants/_Shoes/_Sweater` + `_Rig`.

### ✅ Export & integrasi web (29 Jul, commit `05c5a66`)

`office.glb` sebelumnya **tidak memuat satu pun objek `CH_*`** — kelima karakter cuma ada di Blender dan tidak pernah tampil di web. Sekarang sudah di-export ulang berikut animasinya.

**Ukuran justru TURUN meski isinya bertambah: 9,04 → 8,09 MB.** Percobaan pertama membengkak jadi **78 MB** karena setelan export tidak disamakan — begitu WebP + Draco dipakai seperti export sebelumnya, ukurannya kembali normal. Pelajarannya: setelan kompresi jangan pernah diasumsikan terbawa, selalu set eksplisit tiap export (§4g).

Tiga hal di sisi React (`Office.tsx`):

1. **Satu mixer cukup untuk kelima karakter.** `useAnimations(animations, scene)` — kelima klip menarget bone rig masing-masing tanpa tumpang tindih, jadi tidak perlu mixer terpisah.
2. **Dua klip berdurasi 0,03 detik itu POSE STATIS, bukan animasi.** `SittingIdle` & `Person4_Static92` = 1 frame dari Blender. Di-loop pun tak ada yang bergerak, jadi dimainkan sekali lalu `paused = true` supaya mixer tidak menghitungnya tiap frame selamanya. Tiga klip lain di-loop dengan **offset acak** (`action.time = Math.random() * duration`) supaya idle-nya tidak serempak seperti robot.
3. **`frustumCulled = false` wajib untuk SkinnedMesh.** Bounding box-nya dihitung dari **bind pose** dan tidak ikut diperbarui saat tulang bergerak — pose duduk membuat karakter **berkedip hilang** di sudut pandang tertentu. Ini bug yang gejalanya mudah disalahartikan sebagai masalah loading.

### ❌ `CharacterLights.tsx` DIHAPUS (6 Agu) — premisnya keliru sejak awal

Isinya dulu: key light hangat + fill dingin, keduanya di **layer 1** (`CHAR_LAYER`), dengan alasan yang terdengar masuk akal — scene punya 0 lampu realtime (semua baked, §4g), karakter tidak bisa ikut di-bake karena bergerak, dan lampu ber-layer diharapkan **dilewati** saat merender ~300 objek statis sehingga biayanya nyaris nol.

**Premis itu salah.** Di three r185 (`WebGLRenderer` ~baris 17387) pengumpulan lampu diuji dengan `light.layers.test(camera.layers)` — **yang diuji KAMERA, bukan objek yang disinari**. Kamera ada di layer 0, jadi lampu di layer 1 tidak pernah masuk daftar sama sekali. Artinya kedua lampu itu **tidak pernah menyinari apa pun**, sejak hari pertama; "biayanya nyaris nol" memang benar, tapi karena tidak ada efeknya, bukan karena optimasinya jalan.

Rencana penggantinya (1 point light *motivated* per karakter, §4s) **juga dibatalkan**: begitu tahu lampu ber-layer tidak bisa dipakai, pilihannya tinggal menyalakan lampu realtime sungguhan untuk seluruh scene. Keano melihat perbandingannya dan **memilih karakter tanpa lampu** — mereka hidup dari lightmap sekitar saja. `Scene.tsx` menyimpan komentar alasannya supaya tidak ada yang mencoba lagi; `BilliardGame.tsx` (`DYN_LAYER`) juga diberi catatan yang sama.

**Pelajaran umum: kalau sebuah "optimasi" tidak pernah terlihat memakan biaya, pastikan dulu ia benar-benar JALAN.** Fitur yang diam-diam mati dan fitur yang gratis punya gejala yang sama persis.

**Duplikasi cara basement:** `n.data = o.data` — mesh data DIBAGI antar karakter (`users` 2–4), armature data di-copy (pose harus independen). Person2 menambah **0 tris**. Person3/4 punya rambut & sweater sendiri karena beda material.

### Texture, bukan vertex color — rencana awal DIUBAH

Rencana 27 Jul "vertex color, nol texture ala basement" **dicoba dan gagal 2×**:
- **Vertex color** → wajah bercak acak (kulit kepala hitam Mixamo + highlight tercampur), lalu pita hitam melintang di MATA (ambang garis rambut z=1.638 kena mata di z 1.64–1.66)
- **Cap rambut solid** → batas selalu bergerigi seperti gigi gergaji; face dahi ~2 cm terlalu besar untuk dipotong rapi

**Yang benar: pertahankan texture, resize saja.** 4K → **256×256** + `interpolation='Closest'` → piksel kotak-kotak justru **menguatkan** look PS1. Rambut, mata, alis, bibir tetap ada dengan batas mulus. Nol kerja tambahan.

**Metallic 0.5 bawaan Mixamo = biang glossy.** Import FBX Mixamo memberi Metallic 0.5 + normal map 4K → kulit & kain memantul seperti plastik basah, DAN membuat faset low-poly menonjol tajam. Fix: Metallic 0, Roughness 0.9, Specular 0.2, lepas link normal/roughness/specular map. Keluhan "polygon keliatan banget" dan "glossy" itu **satu penyakit**.

### Animasi: yang boros itu FRAME, bukan bone

Animasi Mixamo mentah **20× lebih besar dari mesh-nya sendiri** (1005 KB vs mesh ~50 KB). Buang bone diam saja cuma hemat 23%.

**Pangkas frame** — cari titik loop mulus dengan merekam quaternion 8 bone acuan tiap frame, lalu cari pasangan (start, start+90..180) dengan selisih pose terkecil. Hasil: frame **130–225** (96 frame, 3,2 dtk), selisih sambungan 0.185 (<0.5 mulus, >1.0 kentara meloncat).

**Buang 40 bone jari** (Thumb/Index/Middle/Ring/Pinky) → reset ke rest, tangan tetap bentuk wajar. Jari paling aktif di data tapi paling tak terlihat dari kamera tur. Hasil: 520 → **103 fcurve**, 65 → 25 bone teranimasi.

**Total: 1005 KB → 39 KB (−96%).**

**Performa runtime animasi hampir nol** — skinning 65 bone dihitung di GPU. Yang membebani FPS adalah draw call (§4f), bukan animasi. Yang perlu diurus hanya ukuran file.

### Gotcha yang mahal

- **`animation_data_clear()` MEMUTUS binding slot di Blender 5.** Action bisa di-assign dan terlihat benar di UI, tapi kurvanya **tidak pernah dievaluasi** (pose bone tetap identity). Gejala: tinggi bbox = T-pose berdiri padahal action duduk sudah terpasang. Jangan "perbaiki" dengan menyalin pose lalu `keyframe_insert` — itu MENIMPA kurva, hasilnya action bernama benar tapi isinya pose dari sumber salah (kasus nyata: Person4 bernama `Typing_Loop_P4` tapi pose-nya Leonard, ketahuan user). **Cara benar:** duplikat rig sumber UTUH (`rig.copy()` + `data.copy()`) yang otomatis membawa `animation_data` sehat, lalu pindahkan mesh anak ke rig baru.
- **Verifikasi wajib:** bandingkan quaternion bone di beberapa frame terhadap rig SUMBER (harus 0.0) DAN terhadap rig lain (harus >0). **Nama action tidak membuktikan apa-apa.**
- **Pose bone hilang** kalau tidak dikunci jadi Action — begitu depsgraph re-evaluate, rig balik ke rest dan karakter muncul T-POSE BERDIRI di render.
- **Ukur arah hadap dari garis bahu** (LeftShoulder→RightShoulder, rotasi −90°), BUKAN hips→foot (kaki bisa menyilang). Kasus nyata: badan menghadap 152° bukan 180°.
- **Arah pandang bone Head = sumbu Z lokal, BUKAN Y** (Y = sepanjang tulang ke atas kubah kepala, memberi elevasi +70° yang menyesatkan). Person4 menatap TV: leher −8° + kepala −14° → meleset 1,33°.
- **Uji ketiga sumbu sebelum menebak.** Tangan Person4 tembus meja: X−10° cuma 56→13 vertex, **Z+10° langsung 56→2**.
- **Jangan tumpuk rotasi quaternion untuk "reset"** — reset benar: set `rotation_quaternion=(1,0,0,0)` lalu `frame_set` bolak-balik.
- **Skala scene tidak konsisten** — jangan pakai pintu sebagai acuan (2,45 m = 1,2× nyata); **acuan yang benar = perabot** (sofa 0,78 m, kursi meeting 1,16 m ≈ 1,0×).
- **Body Mixamo TIDAK utuh** — sudah dipotong; `Ch31_Body` 18.340 tris isinya cuma 7 loose part (kepala+leher, 2 tangan, 2 lengan bawah, 2 mata kaki), nol vertex di z 0.2–1.3. Jangan bikin logika "hapus face tertutup baju".
- **Hair cards: hapus saja** — `Ch31_Hair` 10.860 tris / 1.100 loose part @ ~10 tris. Decimate meruntuhkannya jadi serpihan.
- **Variabel Python tidak bertahan antar panggilan `execute_blender_code`** — rekam + tulis harus dalam SATU blok.

### ⚠️ Sketchfab BUKAN untuk karakter yang perlu animasi Mixamo

Dicoba 28 Jul, gagal, dibatalkan. Model "Low poly ordinary man" (3.296 tris) bagus visualnya, tapi **nama bone-nya beda total** (`Pelvis_02`, `Torso_03` vs `mixamorig9:Hips`). 4 percobaan retarget semuanya gagal — badan terpelintir, rebah, sampai jungkir balik. **Metrik bbox BUTA ARAH**; kalau harus menilai orientasi pakai metrik anatomis (`head.z − pelvis.z` harus positif).

**Aturan:** karakter butuh animasi Mixamo → ambil dari **Mixamo**. Sketchfab hanya untuk props/furnitur statis. Kalau tetap mau model Sketchfab: upload FBX-nya ke Mixamo untuk auto-rig dulu.

### Keputusan awal (27 Jul) — konteks

- **⚠️ Ready Player Me MATI** (shutdown 31 Jan 2026, `*.readyplayer.me` = NXDOMAIN). Rencana "avatar dari foto staff" DIBATALKAN — di resolusi target wajah asli hilang jadi gumpalan; bonus tidak perlu consent staff.
- **Pengganti** kalau perlu: Avaturn (avaturn.me, tier gratis, GLB) atau Avatar SDK/MetaPerson.
- **Pilihan user:** sumber **Mixamo** (rig + animasi gratis, lalu decimate), gaya kasual realistis, animasi idle loop halus. Karakter pertama di **sofa lounge**.
- **Target teknis:** ≤2.500 tris & ≤150 KB per karakter.
- **Bukti dari repo basement** (`character-model-*.glb` dibedah): TOTAL 4.860 tris untuk SEMUA karakter, `images: []` (NOL texture, warna via `COLOR_0`), head cuma 484 tris, STRUKTUR MODULAR (1 body dipakai bersama, beda per orang cuma rambut & kacamata). Look PS1 = post-processing terpisah, bukan dari model.
- **Anchor dudukan (terverifikasi):** `SofaB_Seat_0` (sofa dinding kiri lounge, bantalan kiri). Permukaan duduk z=0.48, center (−1.41, 4.38), badan hadap +X.
- **Gotcha:** download Mixamo **FBX Binary (.fbx)**, BUKAN varian 2013/6100 (Blender 5 min. 7100). Mesin ini tidak punya converter FBX.

~~**NEXT:** export GLB + load ke Next.js, lalu isi `CharacterLights.tsx`~~ ✅ **SELESAI 29 Jul** — lihat sub-bab export & integrasi di atas.

## 6c. Video/Gambar di Layar ✅ SELESAI (diputuskan 28 Jul; tuntas 7 Agu — 8 layar terisi, tidak ada lagi yang kosong)

Pertanyaan berulang: "nambahin video di laptop & iMac itu di mana?" — **Jawaban: di THREE.JS, bukan Blender.** Blender cuma bisa bake tekstur DIAM. Untuk video berputar atau konten yang bisa diganti tanpa export ulang, pakai `THREE.VideoTexture` yang membaca frame dari elemen `<video>` HTML. Gambar statis pakai `TextureLoader` biasa.

**Syarat yang harus disiapkan di Blender SEBELUM export:** material layar terpisah dari casing, nama objek jelas untuk dicari di kode, UV layar kotak penuh 0–1.

| Layar | Material | Siap? |
|---|---|---|
| Monitor AOC `OMon_AOC_*` | `OMon_Screen` terpisah | ✅ **TERISI** 30 Jul — Spotify pixel-art |
| TV meeting `MR_TV_Screen` | `MR_TVScreen` terpisah | ✅ **TERISI** 7 Agu — rekaman Desa+ |
| TV smoking `SMK_TV_Screen` | `M_SM_TV_Screen` terpisah | ✅ **TERISI** 7 Agu — logo mantul DVD. ~~tidak punya UV~~ **keliru** |
| iMac `OP_iMac_Screen.*` | `iMac_Screen` terpisah | ✅ **TERISI 4 layar** (6–7 Agu) — mesh gabungan dipecah runtime |
| MacBook `OMacbook_D*` | ~~`ASSET_MAT_MR` dipakai SELURUH laptop~~ → `M_MacBook_Screen` terpisah | ✅ **TERISI** 5 Agu — video VS Code |

⚠️ **"TV smoking" = TV function room.** Ruangannya di-rename; nama objek Blender-nya masih `SMK_*` dan node hasil merge-nya `MG_Function_M_SM_TV_Screen`. Satu benda, tiga nama — sumber kebingungan yang nyata saat mencari di GLB.

**KETIGA blocker di tabel ini gugur sendiri, tidak satu pun dibereskan:**
- ~~Material MacBook belum terpisah~~ — saat mengisi video 5 Agu, `OMacbook_D7` sudah punya `M_MacBook_Screen` sendiri (ikut ternyalakan emission-nya di §4s).
- ~~UV iMac cuma u[0.125, 0.875], perlu unwrap ulang~~ — UV-nya tidak pernah jadi masalah. Yang menghalangi adalah **kesepuluh layar iMac ada di satu mesh gabungan**; begitu dipecah saat runtime, UV-nya jalan apa adanya. Detail di bawah.
- ~~SMK_TV tidak punya UV~~ — dicoba saja 7 Agu, dan videonya langsung tampil dengan rasio benar. UV-nya ada. Tidak jelas dari mana klaim ini dulu berasal.

Pola yang berulang, dan sekarang tiga dari tiga: **periksa ulang blocker sebelum mengerjakannya.** Biayanya beberapa menit; SMK_TV tercatat sebagai penghalang selama sepuluh hari padahal tidak pernah ada.

Catatan: `OMacbook_D*` = **32.751 tris each** × 5 buah — kandidat decimate besar, jauh lebih berat dari karakter.

### ✅ Monitor AOC SUDAH TERISI (30 Jul) — blocker dilewati, bukan dibereskan

`src/components/canvas/screens.ts`. Layar pertama yang benar-benar berisi: **Spotify pixel-art di `OMon_AOC_2`**, `public/screens/spotify-home.png` (96×54, 7 KB). Blocker MacBook/iMac/SMK_TV **tidak disentuh** — monitor AOC memang satu-satunya yang sudah SIAP di tabel di atas, jadi dikerjakan yang bisa dulu.

`SCREENS` sengaja **daftar eksplisit**, bukan "semua yang materialnya `*_Screen`": hanya layar yang benar-benar terlihat dari salah satu `VIEWS` yang perlu diisi, sisanya buang memori texture percuma (dan +1 draw call masing-masing).

**`emissiveMap`, BUKAN `map`.** Material layar di GLB baseColor-nya ~0,01 (hitam) dan ambient scene cuma 0,03 — dipasang sebagai `map` saja, gambarnya praktis tak terlihat. Yang membuatnya "menyala" adalah `emissiveMap`, yang tidak bergantung cahaya sekitar sama sekali. `emissiveIntensity = 1.0`; jangan dinaikkan tanpa melihat hasilnya, karena ambang bloom 0,95 (§4l) berarti di atas itu layar **menyebar pendar** dan terbaca seperti lampu, bukan monitor.

### Pixelasi dilakukan OFFLINE, bukan di shader

Gambarnya memang **disimpan kecil** (96×54) lalu dibesarkan GPU dengan `NearestFilter`. Tidak ada shader, tidak ada canvas 2D per frame, tidak ada quantize UV — GPU sudah melakukan persis itu secara gratis saat mengambil sampel texture yang lebih kecil dari layarnya.

Konsekuensinya: **tingkat pixelasi ditentukan saat membuat aset, bukan di kode.** Untuk mengubahnya, buat ulang PNG-nya:

```bash
ffmpeg -i sumber.png -vf "crop=W:H:X:Y,scale=96:54:flags=neighbor" keluaran.png
```

`flags=neighbor` **WAJIB** — tanpa itu ffmpeg memakai bicubic yang merata-ratakan piksel tetangga, hasilnya blur kecil, bukan pixel-art. Crop **sebelum** scale supaya rasionya sudah benar dan gambarnya tidak melar.

### 🔑 Cara memilih resolusi aset untuk layar lain

Yang menentukan **bukan** seberapa enak gambarnya dilihat sendirian, melainkan **seberapa besar layar itu tampil di viewport**. Monitor AOC dari `VIEWS.Office` berjarak 2,49 m dan hanya mengisi ±278 × 181 piksel (1080p, dpr 1,5).

Artinya aset 192 px mendarat di **0,69 teksel per piksel layar** — nyaris 1:1, jadi GPU hampir tidak membesarkan apa pun dan blok pixelnya tidak pernah terbentuk. Itu sebabnya 192 terlihat "kurang pixel" meski di file-nya jelas pixel-art. Dibandingkan pada **ukuran tampil sesungguhnya**:

| Aset | Hasil |
|---|---|
| 192 | blok terlalu halus — terbaca sebagai gambar biasa yang agak kasar |
| **96** | ✅ **DIPAKAI** — blok jelas terbaca, tata letak Spotify masih dikenali |
| 64 | sudah jadi bidang warna, tidak lagi terbaca sebagai antarmuka |

**Untuk layar lain, ULANGI pengukurannya** — TV meeting yang jauh lebih besar di layar akan butuh angka lebih tinggi untuk kekasaran yang sama. Aturan praktisnya: bidik **±0,3 teksel per piksel tampil**, yaitu lebar-tampil ÷ 3.

### 4 jebakan yang semuanya kena

1. **Material WAJIB di-clone.** Keempat monitor (`OMon_AOC_0..3`) berbagi mesh **dan** material `OMon_Screen` yang sama persis — menempelkan texture langsung membuat **keempatnya** menampilkan gambar yang sama.
2. **`emissive` harus disetel putih.** `emissiveMap` dikalikan dengan warna `emissive`; dibiarkan hitam (bawaan), hasil perkaliannya nol dan gambarnya **tidak muncul sama sekali** — gejala yang mudah disalahartikan sebagai "texture-nya gagal dimuat".
3. **`texture.flipY = false` wajib, dan ini gampang terlewat.** glTF menaruh titik asal UV di kiri-atas, WebGL di kiri-bawah. `GLTFLoader` mendamaikannya dengan menyetel `flipY = false` pada setiap texture yang **IA** muat — tapi texture ini dimuat `TextureLoader` lewat `useTexture`, yang bawaannya `flipY = true`. Dibiarkan bawaan, gambarnya **terbalik atas-bawah** (verifikasi dari accessor: pos.y 0,407 → v=0; pos.y 0,108 → v=1).
4. **`flipX` per-node untuk monitor AOC.** Quad layarnya normal menghadap −Z dengan u=0 di sisi +X, jadi tanpa dibalik gambarnya tampil sebagai **bayangan cermin**. Ini sifat mesh-nya, bukan gambarnya — makanya jadi setelan per-node (`repeat.x = -1` + `offset.x = 1`, bukan menyiapkan dua versi file).

### ⚠️ Urutan dengan sapuan reveal — clone HARUS lebih dulu

`applyScreens()` dipanggil di dalam `useMemo` yang **sama** dengan fix-up material, bukan di `useEffect` terpisah. Alasannya: material hasil clone harus sudah ada saat `prepareRevealSweep()` mengumpulkan material untuk dipatch (§4m). Kalau dipasang belakangan, **layarnya tidak ikut tersapu** dan tampil utuh sejak frame pertama di tengah kantor yang belum terbentuk.

Sekalian: `toneMapped` sengaja **dibiarkan menyala** di sini — beda dari lampu & LED strip yang mematikannya. Lampu memang harus menembus ACES supaya berpendar; layar tidak. Dimatikan, warnanya melompat lebih terang dari seluruh scene dan monitornya terlihat seperti **ditempel**, bukan berada di dalam ruangan yang sama.

### ✅ Video VS Code di MacBook (5 Agu) — layar pertama yang bergerak

`OMacbook_D7`, `public/screens/vscode-real.mp4` (713 KB). **Rekaman layar asli**, bukan animasi sintetis — sempat dibuat generator sintetis 72×50 (`scripts/make-vscode-video.mjs`, skripnya di-commit tapi hasilnya tidak dipakai) tapi rekaman asli menang: teks yang benar-benar diketik terbaca sebagai "orang sedang bekerja", sedangkan yang sintetis terbaca sebagai pola.

**Encode ala basement.studio — reduksi 4×, BUKAN 40×.** Resolusi 720×500 + `NearestFilter` di GPU sebagai sumber pixelasi. Ini menyimpang dari aturan "lebar-tampil ÷ 3" di atas, **dan itu disengaja**: aturan ÷3 berlaku untuk **pixel-art** (Spotify), di mana blok besar memang tujuannya. Untuk rekaman layar, ÷3 membuat teks kode hancur jadi bubur — yang dicari di sini keterbacaan "ada yang ngoding", bukan estetika blok.

**`eq=gamma=1.4` untuk konten tema gelap.** VS Code dark theme di dalam scene yang juga gelap = tidak terbaca sama sekali. Gamma mengangkat midtone **tanpa memucatkan hitamnya** (min 0 → 20, luma rata-rata 31 → 63) — beda dari menaikkan brightness, yang akan mengabukan seluruh layar.

**Arsitektur (`screenVideo.ts`):** cache `<video>` + `VideoTexture` di level modul, priming frame pertama supaya tidak ada kedipan hitam saat pertama tampil. Sejak 7 Agu play/pause-nya **per-URL**, bukan semua sekaligus (lihat gerbang per-ruangan di bawah).

⚠️ **`ScreenVideoGate` pakai `useEffect`, BUKAN `useFrame`** — ini pelajaran matter-js 3 Agu (§4r) yang terbayar. Video harus dipause saat hero keluar layar / pindah ruangan, tapi `useFrame` **ikut mati** saat `frameloop="never"` (§4r-frameloop) — gerbang yang dipasang di sana justru tidak pernah jalan persis saat paling dibutuhkan. Penjaganya: `screenVideo.invariant.test.ts` — "video wajib dipause saat hero keluar layar".

### ✅ EMPAT layar iMac terisi (6–7 Agu) — mesh gabungan dipecah saat RUNTIME

Blocker "UV iMac perlu unwrap ulang" di tabel atas **dilewati, bukan dibereskan** — ternyata UV-nya tidak pernah jadi masalah. Yang jadi masalah: **kesepuluh layar iMac ruang Office duduk di satu mesh** `MG_Office_iMac_Screen` dengan satu material (buah dari merge per-material demi menekan draw call, §4). Menempelkan texture ke situ menyalakan kesepuluhnya, dan karena tiap layar punya UV 0..1 sendiri, kesepuluhnya menampilkan halaman yang sama.

**Dipecah di Three.js, bukan di Blender.** Memecah di Blender lebih rapi sebagai aset tapi menuntut **export ulang seluruh GLB** — dan resep export itu penuh jebakan yang sudah tercatat mahal (texCoord lightmap, aoMap channel 1, WebP gagal diam-diam, ORM merge bikin magenta). Semua risiko itu mengenai **seluruh model**, demi memisahkan 12 segitiga. `splitScreen()` di `screens.ts` memindahkan segitiga milik satu layar ke mesh sendiri berdasarkan **kotak batas ruang dunia** (angkanya dibaca dari bbox Blender, dikonversi `three(x,y,z) = blender(x,z,−y)`, margin 2 cm). Ongkosnya satu draw call per layar.

Empat yang diisi — hanya yang benar-benar terlihat dari `VIEWS.Office`, diverifikasi **raycast** (keempatnya jadi hit PERTAMA, tidak terhalang baris meja depan):

| Layar | Isi | Aset | emissive |
|---|---|---|---|
| `OScreen_iMac_Cogniti` | beranda cogniti.id | 192 px | **6,2** |
| `OScreen_iMac_EasterEgg` | desktop kerja: Blender berisi model kantor INI + logo kecil di Preview | 192 px | **1,5** |
| `OScreen_iMac_Wallpaper` | wallpaper macOS polos | 96 px | **0,7** |
| `OScreen_iMac_Dashboard` | dasbor manajer proyek tim ini, tab tur 3D ikut terbuka | 96 px | **2,6** |

**🔑 emissive WAJIB DIUKUR, bukan dihitung.** Aku sempat menebak 2,4 untuk iMac pertama lewat analogi MacBook dan **meleset ~3×**; sekali lagi memperkirakan teksel 255 mendarat di 115 padahal hasil ukurnya 205. Caranya: naikkan emissive → tembak layar (`shoot.mjs`) → ukur kotak layarnya. Yang harus disamakan antar layar bersebelahan adalah **TINGKAT PUTIHNYA**, bukan rata-rata atau p90 — layar berisi konten terang memang seharusnya tampak lebih terang. Itu sebabnya angkanya berpencar 0,7–6,2 dan itu **bukan ketidakkonsistenan**: halaman yang nyaris hitam butuh emissive tinggi justru karena piksel terangnya jarang.

**Resolusi mengikuti ukuran TAMPIL, bukan tetangganya.** Dua iMac depan tampil 322×192 px (jarak 2,5–2,9 m) → aset 192; dua di baris belakang cuma 98×63 px (jarak 7,4–7,7 m) → aset 96. Memberi 192 pada layar yang tampil 98 px berarti GPU **mengecilkan** 2× — dan karena mipmap dimatikan + `NearestFilter`, pengecilan itu tidak merata-ratakan apa pun: tiap piksel mengambil satu teksel acak → **berkedip**, bukan lebih tajam.

**⚠️ Aturan "lebar-tampil ÷ 3" itu untuk PIXEL-ART saja.** Untuk screenshot/rekaman, sumbernya lebih baik dibiarkan besar lalu dikasarkan `NearestFilter` — sama seperti pelajaran MacBook. `flags=area`, bukan `neighbor` (neighbor pada sumber rekaman mengubah teks jadi bintik acak).

**⚠️ Melebarkan RENTANG, bukan mengangkat gambar.** Mode gagal "latar memucat" kena tiga kali di berkas ini lewat pintu berbeda. Untuk konten tema gelap, refleks menyalin `eq=gamma` dari MacBook **keliru** kalau sumbernya tidak punya hitam sejati — gamma 1,6 mengangkat minimum 12 → 52 dan seluruh halaman jadi bidang kelabu. Yang bekerja: `contrast` + `brightness` yang memetakan [12, 227] → [7, 255] — hitamnya tetap hitam, puncaknya naik.

**Easter egg: "ramai dan logonya kecil" itu SPESIFIKASI.** Versi pertama memakai logo yang memenuhi layar dan **ditolak** karena terbaca sebagai papan nama, bukan temuan. Mengganti dengan logo yang lebih besar dan bersih akan membatalkan gunanya.

**Trik `ANNOTATE` untuk menunjuk objek di mesh gabungan** — saat perlu memastikan "yang mana persis layar ini?" di Blender, objek merge tidak bisa di-klik per bagian. Membuat anotasi/penanda di koordinat bbox-nya jauh lebih cepat daripada menebak dari outliner.

### ✅ DUA TV TERAKHIR (7 Agu) — layar terakhir yang kosong

**TV meeting** `MG_MeetingWest_MR_TVScreen` — rekaman **Desa+**, `public/screens/desa-plus.mp4` (212×120, 15 fps, 355 KB), `emissive` **0,8**.

```bash
ffmpeg -i sumber.mp4 -vf "crop=1908:1080:6:0,scale=w=212:h=120:flags=neighbor,fps=15" \
  -c:v libx264 -pix_fmt yuv420p -crf 30 -g 30 -an -movflags +faststart desa-plus.mp4
```

**🔑 `neighbor` vs `area` itu soal RASIO REDUKSI, bukan soal jenis kontennya.** Catatan MacBook di atas menulis "neighbor pada sumber rekaman mengubah teks jadi bintik acak" — itu **terlalu pukul rata**, dan diperbaiki di sini setelah enam varian benar-benar dirender di dalam scene:

| Aset | `area` | `neighbor` |
|---|---|---|
| 318 px (reduksi 6×) | lembek, tidak pernah jadi blok | ✅ tepi keras, huruf masih utuh |
| 212 px (reduksi 9×) | lembek | ✅ **DIPAKAI** — teks kecil hancur, dan itu diterima |

`area` merata-ratakan tetangga, jadi berapa pun resolusinya hasilnya blur — bukan PS1. `neighbor` mengambil satu piksel per blok, jadi tepinya keras. Yang rusak oleh reduksi besar bukan flag-nya, melainkan **detail setipis satu-dua piksel**. Efek samping yang berlawanan intuisi: pada resolusi sama, `neighbor` menghasilkan berkas h264 **lebih besar** dari `area` — tepi keras itu mahal untuk dikompres.

⚠️ **Sub-headline yang beranimasi di video ini memang TIDAK TERBACA, dan itu disengaja.** Yang harus terbaca cuma "ada tayangan jalan di TV". Jangan "perbaiki" keterbacaannya dengan menaikkan resolusi — itu membuang kekasaran yang menyamakan TV ini dengan tetangganya. Asetnya mendarat di **0,38 teksel per piksel tampil**, dekat dengan monitor AOC (0,35) dan sejalan dengan aturan ÷3 di atas.

⚠️ **Resolusi TIDAK selalu menggeser emissive.** Keenam varian mengukur max 243 dan 0% di atas ambang bloom, jadi 0,8 tetap dipakai tanpa ukur ulang. Aturan yang lebih tepat: **resolusi menggeser emissive hanya kalau piksel paling terangnya berasal dari detail setipis satu-dua piksel** — kalau begitu, mengecilkan aset akan menghapus puncak itu.

---

**TV function** `MG_Function_M_SM_TV_Screen` — **logo cogniti mantul ala screensaver DVD**, `public/screens/dvd-logo.mp4` (424×248, 15 fps, 19 KB), `emissive` **1,0**.

**⚠️ Ini MEMBETULKAN CACAT, bukan cuma menghias.** Sebelum diisi, layar ini me-render **putih polos**: terukur avg 255,0 dengan **99,9% pikselnya di atas ambang bloom** — benda paling terang di ruangan, mekar seperti lampu. Itu bawaan material `M_SM_TV_Screen` di GLB. Jadi kalau entri-nya suatu saat dihapus, yang kembali **bukan** layar hitam yang netral melainkan slab menyilaukan itu lagi.

emissive-nya **diukur**, seperti semua layar lain:

| ei | max | >249 | |
|---|---|---|---|
| 1,7 | 255 | 2,4% | mekar |
| 1,3 | 255 | 1,7% | mekar |
| **1,0** | 234 | 0,0% | ✅ **DIPAKAI** |
| 0,7 | 197 | 0,0% | |

⚠️ Ditulis **eksplisit** di `screens.ts` walau kebetulan sama dengan `SCREEN_EMISSIVE`: kalau default bersama itu suatu hari dinaikkan demi layar lain, layar ini ikut naik lalu mulai mekar tanpa ada yang menghubungkannya dengan perubahan tadi.

⚠️ Teksel paling terang di aset ini cuma **210** (silver brand `#d2d3d4`), bukan 255 — jadi angka 234 di atas **tidak sebanding langsung** dengan tingkat putih TV meeting (243, dari teksel 255). Ganti logonya dengan yang mengandung putih murni → **ukur ulang**.

#### `scripts/make-dvd-video.mjs` — disintesis, deterministik, nol dependensi

Isinya cuma satu gambar yang bergeser di atas hitam, jadi merekam atau meng-export dari tool lain berarti menyimpan aset yang tidak bisa diubah tanpa membuka tool-nya lagi. Di sini kecepatan, ukuran logo, dan panjang loop-nya **angka di kepala berkas**. Tidak ada undian sama sekali → menjalankan ulang menghasilkan berkas **identik byte demi byte**.

- **Loop wajib mulus, dan itu yang menentukan angkanya.** Gerak mantul itu gelombang segitiga; kalau panjang video bukan kelipatan persekutuan periode X dan Y, logo **MELOMPAT** tiap video mengulang — cacat yang gampang lolos kalau cuma dicek 5 detik pertama, lalu bikin orang menyalahkan encode-nya. Dihindari dengan menurunkan kecepatan **DARI** panjang loop (`v = 2×rentang ÷ FRAMES`), bukan memilih kecepatan lalu berharap pas. Mau ubah kecepatan? ubah `FRAMES`.
- **Fase Y digeser seperempat periode** supaya X dan Y tidak pernah sampai di ujung bersamaan — logonya **tidak pernah kena sudut**. Itu memang inti lelucon DVD-nya.
- **`color=` di ffmpeg itu generator TAK TERBATAS.** Komposit logo ke latar hitam pakai `color=c=black[bg];[bg][0:v]overlay` **menggantung selamanya** tanpa `-frames:v 1`. Gejalanya bukan error melainkan hang, lalu `spawnSync` membunuhnya karena `maxBuffer` penuh **dengan stderr kosong** — nol petunjuk.
- **Komposit ke hitam WAJIB di resolusi penuh sebelum diperkecil.** Memperkecil RGBA duluan membuat scaler ikut merata-ratakan piksel ber-alpha-nol — di logo ini piksel itu **PUTIH**, hasilnya garis terang tipis mengelilingi tiap huruf.
- **Digambar 212 px lalu digandakan 2× ke 424.** Penggandaannya **bukan** menaikkan resolusi; itu melawan subsampling chroma yuv420 yang 2×2, yang kalau tidak dilawan membuat aksen **merah** logo lembek sementara silver-nya tetap tajam.

**Ukuran logo 32 px (15% lebar layar) — kecil, dan itu disengaja.** Kandidat 100/76/60/44/32 semuanya dirender **di dalam scene**, bukan ditonton sebagai mp4 — ukuran yang terasa pas waktu videonya diputar sendirian selalu kegedean begitu ditempel ke TV. Dua hal yang cuma kelihatan di sana:

1. **Makin besar logonya, makin sempit ruang mantulnya.** Di 100 px geraknya terbaca **bergetar**, bukan melayang. Yang dijual lelucon ini adalah perjalanan panjang menuju sudut, dan itu butuh layar kosong.
2. **Di 32 px tulisan "cogniti" tidak terbaca lagi** (tingginya 12 px); yang tersisa siluet + titik merah brand. Diterima, karena yang dijual gerakannya. **Jangan "perbaiki" dengan membesarkan logonya** — biayanya poin 1.

Ukuran logo **tidak** menggeser emissive: semua kandidat max 227–230, 0% di atas ambang. Angkanya argumen CLI: `node scripts/make-dvd-video.mjs 60`.

**Kenapa video, bukan disimulasikan hidup** (pertanyaan yang wajar berulang): kena sudut itu **bukan soal keberuntungan** — di screensaver DVD asli pun geraknya deterministik, dan apakah dia kena sudut cuma ditentukan perbandingan kecepatan terhadap ukuran layar. Perbandingan itu selalu rasional di komputer, jadi polanya **pasti** berulang; yang berbeda cuma panjang periodenya. Di dalam loop 20 detik pilihannya tinggal dua, dan dua-duanya jelek: tidak pernah kena sudut (yang dipakai), atau kena sudut di detik yang sama persis tiap 20 detik — yang justru terbaca dijadwalkan. "Sekali-sekali dan tak ketebak" cuma bisa didapat dengan menghitung posisi per-frame secara hidup; kalau suatu saat mau, konsekuensinya layar ini keluar dari jalur `playScreenVideos` dan **butuh gerbang `heroInView` sendiri** (penjaga invariant yang sekarang cuma tahu soal elemen `<video>`).

### 🚪 Gerbang video jadi PER-RUANGAN (7 Agu)

Sebelumnya `playScreenVideos()` memutar **semua** video sekaligus dan hanya dinyalakan dari view Office. Dengan tiga layar video di tiga ruangan berbeda, itu berarti men-dekode video yang bahkan tidak ada di dalam frustum.

- Daftar URL-nya **diturunkan dari `SCREENS`** (`s.video && s.room === currentRoom`), bukan ditulis tangan di gerbang — supaya menambah layar video baru tidak menuntut siapa pun ingat menyunting gerbangnya juga.
- **Menghentikan yang tidak diizinkan dilakukan di `screenVideo.ts`**, bukan diserahkan ke pemanggil. Berpindah ruangan tidak boleh bisa meninggalkan video ruangan sebelumnya berjalan — kegagalan yang **nol gejalanya di layar** dan cuma terbaca sebagai kipas laptop menyala (§4r).
- **Set `allowed` perlu ada terpisah dari flag `wantPlaying`** karena gerbangnya bekerja per-RUANGAN sementara priming bekerja per-VIDEO: saat `loadeddata` sebuah video akhirnya tiba, ia harus tahu apakah **dirinya sendiri** yang dikehendaki. Tanpa itu, membuka Meeting Room membuat video MacBook yang baru selesai memuat ikut jalan dan tidak pernah di-pause.

Diverifikasi lewat `scripts/drive.mjs` + handle DEV `__screenVideos()`: di Function cuma `dvd-logo` yang jalan; pindah ke Meeting mem-pause-nya dan menjalankan `desa-plus`; balik lagi berbalik; `vscode-real` (Office) diam sepanjang itu.

⚠️ **Regex di `screenVideo.invariant.test.ts` ikut berubah, dan hampir gagal diam-diam.** Versi lamanya mensyaratkan kurung **KOSONG** (`playScreenVideos\(\s*\)`), jadi begitu fungsinya menerima argumen, tidak ada berkas yang cocok, daftar pelanggar selalu kosong, dan test-nya **hijau justru saat ia berhenti memeriksa apa pun**. Sekarang ada pemeriksaan tambahan "minimal ada satu pemanggil" supaya penjaga ini tidak bisa lolos-hampa lagi. Pelajarannya umum: **penjaga yang polanya dicocokkan ke bentuk panggilan wajib punya assert bahwa ia masih menemukan sesuatu.**

### 🔒 Screenshot sumber TIDAK di-commit

Sumbernya tangkapan layar akun Spotify pribadi — nama akun, playlist, riwayat dengar — dan repo ini publik. `.gitignore` memblokir `/Screenshot *.png`; yang di-commit **hanya hasil pixelasinya** di `public/screens/` (96×54, sudah tidak terbaca). Verifikasi log dev: `[office] layar terisi=1/1` — kalau kurang, nama node di `screens.ts` tidak cocok dengan yang ada di GLB, dan layarnya akan **diam hitam tanpa error apa pun**.

## 6d. Minigame Billiard ✅ **FINAL** (dibangun 28 Jul; direview & ditutup 12 Agu)

Sandbox: aim + power + tembak, bola masuk lubang hilang, auto re-rack, tombol reset. **Tanpa skor/giliran/aturan 8-ball.** Fisika **cannon-es 0.20** — dipakai LANGSUNG tanpa wrapper R3F (lihat di bawah kenapa pindah dari Rapier).

**Status: ✅ SELESAI & FINAL.** Logika, fisika, dan dua bug "bola keluar meja" sudah diverifikasi lewat simulasi headless (4 Agu, di bawah). **Penilaian visual di browser — yang sempat jadi item tertunda paling lama di dokumen ini — sudah dilakukan Keano dan hasilnya CLEAR.** Tidak ada revisi yang diminta: posisi stik, warna bola, framing kamera, dan timing fade lampu semuanya diterima apa adanya. Minigame ini **tidak lagi ada di daftar pekerjaan** (§6 item 12); perlakukan sebagai fitur yang sudah jadi.

### 🐛 Bola & stik tergeletak di (0,0,0) sepanjang tur — dibetulkan 30 Jul

Commit `6ad97b2`. **Loop sinkronisasi mesh berhenti saat minigame tidak aktif**, jadi keenam belas bola tetap berada di titik asal objek — tergeletak di lantai sebelah meja — dan terlihat sebagai benda kecil misterius selama tur, meski minigame belum pernah dibuka.

Dua bagian perbaikannya:
1. **Rak disusun sekali di awal begitu mesh siap** (`active || meshes.some(Boolean)`), tidak menunggu pemain masuk mode main. Dan `reset()` menyinkronkan mesh ke posisi rak **saat itu juga**, tidak menyerahkannya ke loop yang sedang berhenti.
2. **Stik & garis bidik disembunyikan** kecuali minigame benar-benar dibuka — `aiming = active && phase === "aiming"`, bukan sekadar `phase === "aiming"`.

### 🐛 Traverse seluruh scene tiap frame — dibetulkan 31 Jul

Commit `f94ee51`. `BilliardLights` mendaftarkan bola ke layer 1 lewat `useFrame` + `scene.traverse()` **tanpa gerbang `active`** — artinya seluruh scene graph disapu **60×/detik sepanjang tur**, meski minigame biliar tak pernah dibuka. Penjaga `userData.dynLit` cuma melewati isi loop; traversalnya sendiri tetap berjalan penuh.

Sapuan itu juga sia-sia total: diperiksa dari header GLB, `office.glb` punya **656 node dan NOL** yang berawalan `Ball`/`Cone`. Jadi kunjungan node terbanyaknya murni ongkos tanpa hasil. **Fix:** traversal digerbangi `active`.

### ⚠️ PINDAH DARI RAPIER KE CANNON-ES (29 Jul) — alasannya rasa main, bukan performa

`@react-three/rapier` **sudah dicopot** dari `package.json`. Penyebabnya satu hal mendasar:

**Yang menentukan rasa permainan billiard adalah koefisien tiap PASANGAN benda** (bola↔bola, bola↔kain, bola↔bantalan) — masing-masing punya restitusi & friksi sendiri. cannon-es menyatakannya langsung lewat `ContactMaterial`. Rapier hanya menyimpan **satu nilai per collider** lalu menggabungkannya dengan aturan (Average/Min/Max).

Perbedaan itu berkali-kali menyesatkan: **kain tertulis restitusi 0,05 tapi yang berlaku 0,485** karena dirata-rata dengan nilai bola. Di cannon-es, angka yang tertulis = angka yang berlaku. Nilai koefisiennya mengikuti referensi `elijah-atkins/Billiards` yang sudah terbukti enak dimainkan.

Konsekuensi teknis dari pindah ini ada tiga, semuanya sudah ditangani — dan dua di antaranya membalik keputusan yang tertulis di sub-bab bawah:

### Tidak jadi modeling di Blender — aset Sketchfab siap pakai

| File | Isi | Skala |
|---|---|---|
| `billiard_balls.glb` (908 KB) | 16 mesh × 960 tris. `Ball1`..`Ball15` + **`Ball Clube` = bola putih** (terverifikasi dari tekstur putih polos 1 KB). Tiap bola punya material + tekstur nomor + normal map sendiri | ×0,0015055 → 57 mm |
| `billiard_cue.glb` (96 KB) | 1 mesh, 92 tris, memanjang +Z, tip di origin | ×0,02443 → 1,45 m |

Keduanya sudah disalin ke `public/3d/models/`. Material aslinya `metallic 0.4` — **diturunkan ke 0,02** saat load, kalau tidak bola terlihat seperti bola besi (scene punya `scene.environment` aktif).

### Peta file

```
src/components/canvas/billiard/
  table.ts            konstanta meja (SEMUA angka hasil ukur Blender)
  physics.ts          dunia cannon-es: ContactMaterial, step, pocket, rack
  Balls.tsx           16 bola (mesh; fisikanya dipegang physics.ts)
  Cue.tsx             stik
  lamps.ts            pemudaran lampu gantung
  BilliardGame.tsx    siklus permainan + salin fisika→mesh + lampu layer
src/components/ui/BilliardHUD.tsx   bar tenaga kiri + tombol (z-30)
```

**`TableColliders.tsx` sudah tidak ada** — konsekuensi #2 pindah engine. Tanpa wrapper R3F, collider tidak lagi dideklarasikan sebagai komponen JSX; semuanya dibangun imperatif di `physics.ts`. Harganya: posisi fisika harus **disalin manual ke mesh** tiap frame di `BilliardGame.tsx` (dulu `@react-three/rapier` yang mengurus).

Store menambah `billiardActive`/`billiardPhase`/`aimAngle`/`shotPower`/`tableRotated` + jembatan `registerBilliard`, `cueScreen` (posisi bola putih dalam piksel, untuk HUD), dan `goToView` (tween kamera bebas, dipakai juga untuk `up` & `fov`).

### Bidik dengan MEMUTAR, bukan menggeser (`BilliardHUD.tsx`)

Sudut bidik dihitung dari **sudut kursor terhadap bola putih di layar**, bukan geseran mendatar — supaya gerakan ke arah mana pun terbaca seperti memutar stik sungguhan. Yang dipakai **selisih sudut sejak jari menyentuh**, bukan sudut absolut, jadi stik tidak melompat ke posisi kursor saat pertama disentuh.

> ⚠️ **Nilai dibaca lewat ref, BUKAN closure.** Dengan `aimAngle` di dependency array, tiap perubahan sudut membongkar & memasang ulang semua listener — posisi jari sebelumnya ikut hilang, dan stik cuma bergeser sedikit lalu macet.

`cueScreen` diperbarui **hanya saat membidik dan hanya kalau bergeser >1 px**, karena setiap pembaruan memicu render React. ~~`RoomNav` disembunyikan saat main~~ — sejak 30 Jul yang disembunyikan adalah **waypoint 3D** (§4k) dan **bayangan kontak** (§4l), lewat `billiardActive` di store. Untuk waypoint alasannya bukan lagi tabrakan tata letak: geser-untuk-membidik bisa mengenai bidang waypoint dan pemain terlempar ke ruangan lain di tengah permainan.

### Bar tenaga — kurva kuadrat, bukan linear

`IMPULSE_MIN 0,05` → `IMPULSE_MAX 1,4` (referensi `elijah-atkins/Billiards`), dipetakan `min + (max−min) × p²`. **`IMPULSE_MIN` dulu 0,25 dan itu terlalu besar** — 18% dari MAX, artinya separuh bawah bar tenaga nyaris tak ada bedanya. Bola 0,17 kg → 8,2 m/s di tenaga penuh.

### Geometri meja — analitis, bukan dari mesh

Di `office.glb` meja sudah digabung jadi `MG_Lounge_M_PoolTable_Body`/`_Felt` demi menekan draw call, jadi bantalan & lubangnya bukan objek terpisah lagi. Semua collider dibangun dari angka ukur (Blender → three = `(x, z, −y)`):

- Felt (area main) **1,06 × 2,06 m**, permukaan z=0,807 → pusat bola y=**0,8355** (`BALL_R` 0,0285)
- Bibir rail (0,860) **2,45 cm di atas pusat bola** → bola memantul, tidak meloncat keluar
- 6 lubang r=0,075; sensor r=0,0607 (lebih kecil, supaya bola baru dihitung masuk kalau pusatnya sudah lewat bibir)
- Rack 5 baris, jarak antar bola 0,05814 (gap 2% — kalau bersentuhan persis, solver mendorongnya meledak)

### ⚠️ Tunneling — cannon-es TIDAK punya CCD, langkah kecil jadi satu-satunya penjaga

Ini konsekuensi #1 dari pindah engine. Rapier punya continuous collision detection; **cannon-es tidak**. Jadi yang mencegah bola menembus bantalan hanya ukuran langkah. Pada kecepatan maksimum 8,2 m/s (`IMPULSE_MAX` 1,4) vs bantalan setebal 80 mm:

| Langkah | Jarak tempuh/langkah | Hasil |
|---|---|---|
| 1/60 s | 137 mm | **TEMBUS** |
| 1/120 s | 69 mm | aman tipis |
| **1/180 s** | **46 mm** | **margin 43% — dipakai** |

`world.step(1/180, dt, 6)`. **Angka ini kritis, jangan dinaikkan tanpa hitung ulang.** `maxSubSteps 6` supaya frame yang tersendat (atau tab yang baru aktif lagi) dikejar bertahap, bukan satu lompatan besar.

Efek samping yang sama juga kena deteksi lubang: zona sensor lebarnya 122 mm sedangkan bola cepat menempuh 137 mm per frame. Uji **titik** akan melewatkannya begitu saja — itu sebabnya bola cepat kadang menembus lubang. Fix: uji **SEGMEN** dari `previousPosition` ke posisi sekarang (di-update cannon-es tiap langkah, tak perlu simpan riwayat sendiri).

Deteksi lubang juga pakai uji jarak mendatar, **bukan collider sensor** — cannon-es tidak punya sensor bawaan, dan uji jarak lebih dapat diprediksi karena tidak bergantung apakah dua collider kebetulan bertemu di langkah yang sama. Syarat tambahan: bola harus **sudah turun di bawah permukaan kain** (`y < FELT.y`), andal karena collider kain benar-benar berlubang di mulut lubang.

### ⚠️ Bola masuk lubang: DIHAPUS dari world (bukan dibekukan)

Bug yang paling mahal di fase ini. Bola yang masuk lubang **terjun bebas tanpa dasar** (tidak ada lantai di bawah lubang; y sampai −480 m), kecepatannya tidak pernah turun, jadi pengecekan "semua bola sudah diam" tidak pernah terpenuhi → **giliran menggantung selamanya**. Terbukti lewat simulasi headless: **21 dari 36 tembakan menggantung**.

**Solusinya berubah setelah pindah ke cannon-es.** Dulu bola dibekukan jadi `fixed`/STATIC. Pendekatan beku menyisakan **benda mati di dalam simulasi**: masih bisa ditumbuk bola lain, masih ikut broadphase, dan harus dilewati manual di setiap loop — sumber beberapa bug susulan. Sekarang body-nya **dihapus dari world** (`world.removeBody`), dan semua masalah itu hilang dengan sendirinya. Body-nya tetap hidup di array `balls`, tinggal dipasang lagi lewat `restoreBall` saat rack atau respot — kalau lupa, bola cuma diam mengambang dan tak bisa dipukul.

> **Pelajaran:** untuk fisika web, tulis simulasi headless Node yang meniru logika komponen. Jauh lebih cepat & meyakinkan daripada mencoba-coba di browser.

### Kamera: tegak lurus dari atas, dihitung dari bentuk layar

Pilihan user (revisi 28 Jul; awalnya sudut serong 26° karena terhalang lampu). Meja 1,30 × 2,47 m (rasio 1,90), jadi orientasinya menyesuaikan layar — meja tegak di layar 16:9 cuma mengisi **25% layar**:

| Layar | Orientasi | Kamera y | FOV | Layar terisi |
|---|---|---|---|---|
| desktop 16:9 | mendatar | 2,45 | 49° | 82% |
| tablet 4:3 | mendatar | 2,45 | 62° | 61% |
| HP 9:19.5 | tegak | 2,86 | 72° | 78% |

Diuji 9 bentuk layar (21:9 → 9:21): meja selalu muat penuh, kamera selalu ≥0,34 m di atas lampu, tidak menembus plafon.

### ⚠️ Kamera pernah masuk KE DALAM lampu → layar putih penuh

Gejalanya seluruh layar jadi bola putih raksasa. Penyebabnya **bukan** pemudaran lampu yang gagal, tapi **posisi kamera**: hitungan framing menghasilkan y=2,08 padahal lampu membentang sampai **y=2,11** — bohlam emissive (strength 12) cuma **13 cm dari lensa**, menutupi 60% layar, lalu bloom membakarnya jadi putih.

Fix: ketinggian dijepit **dua sisi** — `MIN_CAM_Y = 2,11 + 0,34` (di atas lampu) dan `CEILING_LIMIT = 3,45`. Karena jadi lebih jauh, **FOV dipersempit** (46–72°, ikut di-tween); efek sampingnya justru bagus — perspektif lebih rata, mirip biliar 2D. Urutan hitung: **ketinggian dulu (dibatasi benda fisik), FOV menyusul.**

> Kalau ada objek terang menutupi layar, **cek jarak kamera ke objek itu dulu** — jangan langsung menyalahkan material atau bloom.

### ⚠️ Pandangan lurus ke bawah wajib set `camera.up`

Arah pandang (0,−1,0) sejajar dengan up bawaan (0,1,0), dan `lookAt()` tidak bisa menentukan orientasi dari dua vektor sejajar → **meja berputar sendiri secara acak**. Tegak: `up=(0,0,−1)`; mendatar: `up=(1,0,0)`. `goToView` ikut men-tween up & fov; `goTo` biasa mengembalikan keduanya ke normal. Arah geser bidik juga **dibalik saat meja mendatar** — kalau tidak, geser kanan justru membidik ke kiri.

### Menyembunyikan lampu saat main (`lamps.ts`)

Dua hal yang bikin ini tidak sesederhana `visible = false`:

1. **Mesh kap lampu billiard DIGABUNG dengan lampu front desk** (`MG_Lounge_M_BilLight_Cage`, 3.300 tris) demi menekan draw call. Menyembunyikan objeknya ikut memadamkan lampu front desk. Solusi: pecah geometri jadi 2 group berdasarkan posisi. Terverifikasi: **1.980 segitiga billiard (z −2,45…−0,81) vs 1.320 lampu lain (z 4,23…5,57)**, total 3.300 tidak ada yang hilang; kedua kelompok terpisah 6,7 m jadi ambangnya aman.
2. **Material bohlam `M_BilLight_Bulb` DIPAKAI BERSAMA 8 lampu** di seluruh kantor (front desk, lunch table) — wajib di-clone dulu.

Pemilihan objek pakai **posisi dunia, bukan nama** (nama node bisa berubah saat export ulang). `transparent=true` diset permanen supaya tidak memicu kompilasi ulang shader saat transisi; objek emissive juga di-`visible=false` pada opacity ~0 karena bloom masih menangkap sisa pendarnya.

### KEPUTUSAN: lampu TIDAK dinaikkan di Blender

Sempat diusulkan menaikkan lampu mepet plafon supaya kode hide tak perlu. **Ditolak setelah dihitung**: kamera lihat lurus ke bawah, jadi lampu harus seluruhnya di atas kamera tertinggi (3,02 m di HP layar panjang) → kap lampu jadi y 3,07–3,46, **sisa kabel cuma 15 cm** (sekarang 149 cm) — berhenti jadi cage pendant, berubah jadi lampu plafon. Padahal desain 3 pendant itu ciri khas ruangan asli & sudah di-approve setelah 4× revisi; bayangannya juga sudah ter-bake. Catatan: setelah kamera dinaikkan ke atas lampu, hide sekarang **cuma untuk kerapian**, bukan penyelamat.

### ⚠️ 2 jebakan loading GLB (bikin bola putih & stik tak muncul)

1. **GLTFLoader mengganti SPASI jadi garis bawah.** Node `Ball Clube` jadi **`Ball_Clube`** setelah dimuat (`sanitizeNodeName` via `createUniqueName`). Mencocokkan nama mentah dari file → bola putih tak ketemu, dan stik ikut hilang karena posisinya mengacu ke bola putih. Fix: normalkan nama sebelum dicocokkan.
2. **Aset Sketchfab bisa punya transform WARISAN dari rantai node induk.** Stik membawa skala 0,0254 + rotasi −90°/−90°; `mesh.clone()` ikut mewarisinya → stik jadi 1 mm & salah arah. Fix: bangun `new Mesh(src.geometry, mat)` dari geometrinya saja, dan hitung skala terhadap **geometri mentah**. Bola tidak kena masalah ini (skala dunia 1,0) — **selalu cek per aset**.

> **Cara verifikasi yang benar:** cek nama node dengan **memuat GLB lewat GLTFLoader sungguhan**, bukan membaca JSON GLB mentah. Sempat "terverifikasi 16/16 cocok" dari file mentah padahal di three.js gagal. Di Node bisa dijalankan dengan tempelan `globalThis.self`, `URL.createObjectURL`, `Image`, `document.createElementNS`.

### Ganti GLB kantor (mis. versi ber-karakter) TIDAK perlu ngoding ulang

Kode billiard cuma bergantung 3 hal dari `office.glb`: (a) nama node mengandung **`PoolTable`**, (b) material **`M_BilLight_Cage`/`M_BilLight_Bulb`**, (c) posisi meja — **angka tetap di `table.ts`, tidak dibaca dari GLB**. Bola & stik file terpisah. Kalau nama file export tetap `office.glb` → **nol perubahan kode**.

✅ **Terbukti 29 Jul:** `office.glb` sudah diganti dengan versi berisi 5 karakter — **nol baris kode billiard yang berubah.** Karakter terdekat `CH_Leonard` 1,6 m dari meja (duduk di sofa), 4 lainnya 6,9–16 m.

---

## 7. Alat & Setup

- **Blender 5.1.2** + blender-mcp (reconnect: N-panel → Connect to Claude, lalu `/mcp`). File kerja: `~/Documents/Livingroom.blend` (~78 MB per 27 Jul). Scene per 28 Jul: **1.767 objek, 267 material** (naik dari 1.391/254 — selisihnya karakter + `Export_Merged` 338 objek)
  - Collection `Export_Merged` = hasil merge untuk export (§4f). **Di-exclude saat modeling**, di-include saat export. Objek asli di collection kerja tidak pernah disentuh.
  - Cycles: **GPU Metal** (`prefs.compute_device_type='METAL'` + `cycles.device='GPU'`) — cek tiap sesi, default-nya CPU
- **Polycam** untuk scanning (GLB)
- **Vite + bun** (project web ini) — **GLB sudah terintegrasi (§4h)**. Stack: **Vite 6** (dulu Next 16.2, dimigrasikan 29 Jul — §4j), React 19, three 0.185, @react-three/fiber 9 + drei 10 + postprocessing 3, zustand 5, Tailwind 4, **react-router-dom 7** (routing per-ruangan, §4q), **cannon-es 0.20** (billiard, §6d), **motion 12** (animasi teks, §4i), **matter-js 0.20** (`PhysicsHeading`, §4r-3). Jalankan: `bun dev` → `http://localhost:3000`
- **Vitest 4** — `bun run test`. **308 test di 50 berkas**, semuanya hijau per 20 Agu (naik dari 251/46 pada 12 Agu). Empat di antaranya invariant lintas-wilayah (`INVARIANTS.md` §1, §3, §6, §7). Norma repo: **buktikan test-nya MERAH di kondisi rusak dulu** sebelum dipakai memverifikasi perbaikan
- **Pengukuran performa: CDP langsung, tanpa dependency** (§4r) — `scripts/measure-frames.mjs` (frame time) + `scripts/shoot.mjs` (screenshot) + `scripts/drive.mjs` (klik/eval/tembak berurutan). ⚠️ **Wajib jalankan di dpr 2**; dpr 1 mentok vsync dan semua setelan terlihat sama
  - **Browser verifikasi = Brave**, bukan Chrome. CDP-nya identik, cukup tukar path binary-nya. ⚠️ Kelima skrip di `scripts/` masih **hardcode path Chrome** — ganti manual saat dipakai
  - **`drive.mjs` dapat tiga langkah baru** (10 Agu): `emulate` memasang device metrics **sekaligus** `setTouchEmulationEnabled` — tanpa itu halaman terbaca sebagai desktop sempit, `(pointer: coarse)` tidak cocok, dan gerbang INVARIANTS §6 **tidak ikut teruji padahal itu justru yang sedang diperiksa** saat mengemulasi HP; `scroll` memindahkan halaman ke posisi tertentu sebelum memotret; `media` memaksa `prefers-reduced-motion` (cabang itu dipilih saat komponen **dipasang**, jadi tidak bisa dipalsukan dari `eval`)
  - ⚠️ `captureScreenshot` kini `fromSurface: false` dan melempar kalau datanya kosong — dengan device metrics override aktif, potret dari surface kadang balik kosong dan `Buffer.from(undefined)` gagal jauh dari sebabnya
- **`scripts/measure-scroll.mjs`** (10 Agu) — mengukur **kehalusan scroll**, bukan fps diam seperti `measure-frames.mjs`. ⚠️ Batas alatnya ditulis di kepala berkas: **ia mencekik CPU**, sementara yang mahal di HP adalah compositing layer WebGL di **GPU** — untuk keputusan yang menyentuh compositing, ia bukan wasitnya
- **Generator aset layar** (§6c) — `scripts/make-dvd-video.mjs` (logo mantul TV function; deterministik, jalankan ulang → berkas identik byte demi byte) & `scripts/make-vscode-video.mjs` (sintetis, tidak dipakai). Aset lain hasil `ffmpeg` langsung; resepnya di komentar `screens.ts`
- **Playwright 1.61.0** untuk verifikasi visual headless — **versi itu spesifik**, lihat §4m. Flag WebGL: `--use-gl=angle --use-angle=metal --enable-unsafe-swiftshader`. (Tidak ada di `package.json`; dipasang terpisah saat dibutuhkan. Untuk mengukur **frame time** pakai skrip CDP di atas, bukan ini.)

### 📦 Manajer paket: BUN (diputuskan 29 Jul) — pnpm sudah tidak dipakai

Sempat ada **dua lockfile berbeda manajer** hidup berdampingan (`pnpm-lock.yaml` asli + `bun.lock` dari rekan tim). Itu bikin tiap orang install dengan alat berbeda dan lockfile-nya saling menimpa. **Diputuskan: bun.**

Yang dikerjakan supaya tidak terulang:
- `pnpm-lock.yaml` **dihapus** (dari git & disk). `bun.lock` satu-satunya yang sah.
- `package.json` diberi `"packageManager": "bun@1.3.14"` — jadi alat lain tahu (dan Corepack menolak) kalau ada yang salah pakai.
- `.gitignore` memblokir `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`.
- README diganti: cuma `bun install` + `bun dev`.

Diverifikasi: `bun install` bersih (468 install / 541 paket, no changes) dan `bun run build` **lolos penuh** — compile 2,7 s, TypeScript 2,0 s, 4 halaman statis ter-generate.

> ⚠️ **`bun` ada di `~/.bun/bin` tapi tidak selalu ada di PATH shell non-interaktif.** PATH-nya diset di `~/.zshrc`, yang tidak dimuat oleh shell non-login. Kalau ketemu `command not found: bun` di skrip/tool, pakai `export PATH="$HOME/.bun/bin:$PATH"` dulu — bukan berarti bun-nya belum terpasang.
- **Kompresi GLB:** WebP texture + Draco geometry, keduanya lewat exporter Blender bawaan (`export_image_format='WEBP'` + `export_draco_mesh_compression_enable=True`). WebP menang telak vs Draco kalau harus pilih satu — beban terbesar = texture
- Integrasi Sketchfab & Hyper3D di BlenderMCP: sebagian besar prosedural, tapi **ada asset Sketchfab + FBX/OBJ Apple (Magic KB/Mouse, monitor) di `OP_Electronics` + 3 kursi kantor Sketchfab loose** diimport untuk elektronik & seating office. Import ini bawa banyak node sampah (empty hierarki, mesh terpisah) — perlu dibersihkan sebelum export

### Sumber Asset 3D
**Sketchfab = sumber utama model** (paling lengkap: variasi, brand-spesifik, kualitas; sudah ke-set di MCP → search + preview + import langsung). Yang lain cuma pelengkap sesuai niche:

| Sumber | Kekuatan | Lisensi | Catatan |
|---|---|---|---|
| **Sketchfab** | Model apa saja, brand-spesifik | Campur (cek per model) | **Utama.** Via MCP: search/preview/import |
| **Poly Haven** | HDRI & texture PBR (model dikit) | CC0 | **Terintegrasi MCP** — import langsung tanpa download |
| **ambientCG** | Texture PBR (beton/kayu/karpet/metal) | CC0 | Buat detailing material |
| **Poly Pizza** | Model low-poly (eks-Google Poly) | CC0 | Ringan, GLB langsung — ideal web/Three.js |
| **Quaternius** | Pack low-poly (office/furniture) | CC0 | Style konsisten, enteng |
| **Kenney** | Props modular game-style | CC0 | Detailing kecil |
| **BlenderKit** (addon) | Ribuan model/material | Ada tier gratis | Drag-drop di Blender |
| **CGTrader / TurboSquid** | Model akurat/realistis | Berbayar | Utamakan format `.blend`/`.fbx`/`.gltf` |

**Rekomendasi buat proyek ini:** Sketchfab (model props/furniture/elektronik) + Poly Haven (HDRI lighting & texture lantai/dinding). Poly Pizza/Quaternius kalau butuh props low-poly biar GLB tetap ringan.

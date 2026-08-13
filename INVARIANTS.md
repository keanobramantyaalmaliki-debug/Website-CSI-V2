# Invariant lintas-wilayah

Aturan yang **melintasi batas kerja kita berdua**. Semuanya punya sifat sama:
tiap file-nya benar sendiri-sendiri, dan rusaknya baru muncul saat dua bagian
bertemu — biasanya saat merge, sering tanpa konflik git sama sekali.

Pembagian kerja kita (terbaca dari 80 commit terakhir):

| wilayah | pemegang |
|---|---|
| `src/components/canvas/**`, `src/lib/store/` | Keano — aset & scene 3D |
| `src/components/sections/**`, `motion/**`, `Navbar` | Nico — konten web |

Batas itu sudah bersih; tumpang tindihnya nyaris nol. **Berkas ini bukan soal
kepemilikan folder** — melainkan soal beberapa aturan yang berlaku di kedua
wilayah sekaligus, sehingga tidak ada satu orang pun yang bisa melihatnya utuh
dari sisinya sendiri.

Yang punya 🔒 dijaga otomatis oleh test. Sisanya bergantung pada berkas ini
dibaca.

---

## §1 🔒 `frameloop="demand"` mewajibkan `invalidate()`

**Aturan.** Kalau `canvas/Scene.tsx` memakai `frameloop="demand"`, maka setiap
berkas di `src/components/canvas/**` yang memakai `useFrame` **wajib** memanggil
`invalidate()`. Tanpa itu, canvas berhenti menggambar dan animasinya beku.

**Penjaga.** `src/components/canvas/frameloop.invariant.test.ts` — gagal dengan
menyebut nama berkas yang belum patuh.

**Kejadian nyata (29–31 Jul).** `df27f3d` menambahkan `frameloop="demand"`.
Optimasi yang sah, dikerjakan teliti: `invalidate()` dipasang di
`CameraController` & `SceneEnvironment`, yaitu semua pemanggil yang ada **saat
itu**. Tujuh menit sebelumnya `feature/screen-content` sudah berangkat dari
`main`, membawa tiga `useFrame` baru (`Office`, `Waypoints`, `BilliardGame`)
yang tidak pernah tahu kontrak itu ada.

Saat digabung di `96df186`, **git tidak melaporkan konflik pada `Scene.tsx`** —
perubahannya di baris berbeda, jadi auto-merge sukses secara tekstual. Yang
rusak semantiknya:

- sapuan reveal berhenti di progress 0 → kantor tak pernah tergambar
- `sweep.dispose()` tak pernah tercapai → 233 material menghitung dither +
  `discard` selamanya → berat, terutama di GPU integrated
- layar **beku tapi navigasi tetap jalan** — karena `CameraController`
  satu-satunya yang punya `invalidate()`

Status sekarang: `demand` **dicabut** dari scene utama. Dua canvas kecil di
`motion/` (`DeploymentsField`, `ManifestoField`) tetap memakainya dan itu
**benar** — keduanya menggerakkan animasinya sendiri lewat `invalidate()` dan
tidak berbagi kontrak dengan scene 3D.

---

## §2 Skala z-index tunggal

**Aturan.** Satu skala untuk seluruh situs. Jangan menambah lapisan baru tanpa
menengok tetangganya di tabel ini.

| z | penghuni | pemegang |
|---:|---|---|
| 0 | `.ambient-grid` | Nico |
| 10 | konten `<main>`, petunjuk scroll Hero | Nico |
| 30 | `BilliardHUD` | Keano |
| 50 | `Navbar` | Nico |
| 54 | tirai gelap form inquiry (`Contact`) | Keano |
| 55 | lapisan laptop/form inquiry, dan lembar sentuhnya | Keano |
| 56 | tombol tutup form inquiry | Keano |
| 60 | `LoadingScreen` | Keano |

**Tiga lapisan 54–56 itu sengaja mengapit Navbar.** Form inquiry bersifat modal:
selama terbuka, gulir dikunci dan Navbar TIDAK boleh bisa diklik menembus
tirainya — makanya di atas 50. Tapi ia tetap harus tenggelam di bawah
`LoadingScreen` (60), yang menutupi seluruh situs tanpa kecuali. Kalau kelak
Navbar dinaikkan, ketiganya ikut naik bersama, tetap di bawah 60.

**Kenapa rawan.** Ini seam paling langsung antara kita: Navbar milik Nico,
loader & HUD milik Keano, dan keduanya harus tetap berurutan. Menaikkan navbar
ke 70 untuk suatu keperluan akan menenggelamkan loader — tanpa error, tanpa test
merah, cuma "loadernya kok ketutupan".

Belum ada penjaga otomatis untuk ini. Kalau nanti terasa perlu, bentuknya sama
seperti §1: baca teks, bandingkan angkanya.

---

## §3 🔒 Overlay loader harus selalu punya jalan keluar

**Aturan.** `LoadingScreen` menutupi **seluruh** situs. Setiap kondisi yang
membuat `<Scene/>` tidak di-mount **wajib** menyalakan `sceneReady` sendiri.

**Penjaga.** `src/components/loader/loaderGate.invariant.test.tsx`

**Kejadian nyata (31 Jul, ditemukan saat memperbaiki §1).** `sceneReady` hanya
disetel dari `useFrame` di `Office.tsx` — yang hidup **di dalam** `<Scene/>`.
Tapi `Hero.tsx` punya jalur `prefers-reduced-motion` yang mengganti `<Scene/>`
dengan `<StaticHero/>`. Di jalur itu `sceneReady` selamanya `false`, dan jaring
pengaman 1500 ms di `LoadingScreen` **bahkan tidak terpasang** — ia sendiri
digerbangi `if (!sceneReady) return`. Hasilnya: layar putih menutupi situs
selamanya, bagi siapa pun yang menyalakan "Reduce motion" di OS-nya.

Sekali lagi polanya sama: `StaticHero` lahir di `feature/comfort-redesign`,
`LoadingScreen` di `feature/loading-screen`, keduanya benar sendiri-sendiri.
Bug-nya cuma ada di persimpangannya. Diperbaiki di `Hero.tsx` — jalur reduced
menyalakan `sceneReady` sendiri.

**Status 31 Jul.** Percabangan `reduced ? <StaticHero/> : <Scene/>` **hilang
dari render** saat resolusi konflik di PR #4 (`73bdca6`), jadi `<Scene/>` kini
selalu di-mount dan bug ini tidak aktif. `StaticHero` tinggal sebagai kode mati.
Pemantik `setSceneReady` tetap dipasang lebih dulu sebagai pengaman, dan
penjaganya tetap hidup — begitu percabangan itu dikembalikan, syaratnya berlaku
lagi. Keputusan mengembalikan atau membuang fitur comfort itu ada di pemiliknya.

Korban sunyi lain dari resolusi konflik yang sama: `<div className="ambient-grid" />`
hilang dari `App.tsx` padahal `.ambient-grid` masih ada di `index.css`.
Dikembalikan di PR ini. Keduanya menunjukkan hal yang sama — **resolusi konflik
adalah tempat fitur menghilang tanpa jejak**, karena tidak ada yang gagal.

---

## §4 `revealSweep` wajib `dispose()`

**Aturan.** Sapuan menyisipkan `discard` + dither ke shader **233 material**.
Kalau tidak pernah mencapai `t >= 1`, `dispose()` tidak dipanggil dan setiap
fragmen di seluruh kantor terus menghitungnya selamanya, untuk hasil yang sudah
pasti "tampil penuh".

`discard` mahal khususnya karena mematikan early-Z di GPU — inilah kenapa
kegagalan §1 muncul sebagai **lag berat**, bukan sekadar layar diam.

Kalau menambahkan gerbang baru sebelum sapuan (seperti `loaderDone`), pastikan
selalu ada jalan menuju `t >= 1`. Yang ada sekarang punya batas 3 detik di
`Office.tsx` sebagai jaring pengaman.

---

## §5 `onBeforeCompile` harus satu referensi fungsi bersama

**Aturan.** `Material.customProgramCacheKey()` bawaan three mengembalikan
`this.onBeforeCompile.toString()`. Selama semua material memakai **referensi
fungsi yang sama**, WebGL cuma mengompilasi satu program tambahan.

Patch itu sekarang ada **tiga**, dan ketiganya berbagi material yang sama:

| Patch | Berkas | Sasaran |
|---|---|---|
| Sapuan reveal | `revealSweep.ts` | semua `MeshStandardMaterial` |
| Glitch idle | `CharacterGlitch.tsx` | material 5 `SkinnedMesh` |
| Selubung hover | `HoverScan.tsx` | material benda interaktif (meja billiard) |

Tidak boleh ada yang menimpa `onBeforeCompile` secara **buta**: ketiganya
menyimpan yang sebelumnya (`Map`/`WeakMap`) dan mengembalikannya saat
`dispose()`, dan yang dua terakhir hanya melepas kalau slot-nya **masih milik
mereka**. Menimpa buta akan menghapus patch orang lain diam-diam, dan gejalanya
muncul sebagai "efek X tiba-tiba hilang" berbulan-bulan kemudian.

**Kontrak urutan.** `CharacterGlitch` dan `HoverScan` **wajib jadi anak
`Office`**, bukan saudaranya di `Scene.tsx`. Sapuan reveal dipasang di layout
effect `Office` sendiri, dan yang membuat urutannya benar adalah React: layout
effect **anak** berjalan sebelum layout effect induk, jadi sapuan menyimpan
kedua patch itu sebagai "previous" dan memulihkannya saat selesai. Dipindah jadi
saudara, keduanya ditelan sapuan tanpa dikembalikan.

Uniform tiap patch juga **wajib module-level**, bukan dibuat di dalam fungsi
prepare — lihat catatan panjang "sweep hilang di load pertama" (7 Agu) di
`revealSweep.ts`.

---

## §6 🔒 Di perangkat sentuh, kantor 3D adalah pemandangan

**Aturan.** Saat `(pointer: coarse)`, scene 3D tidak menerima interaksi apa pun:
waypoint tidak di-render, meja billiard tidak bisa dibuka. Perpindahan ruangan
di perangkat sentuh **sepenuhnya bergantung pada navbar**.

**Penjaga.** `src/lib/hooks/coarsePointer.invariant.test.ts`

**Kenapa.** Waypoint dibangun di atas *hover*: arsir, bingkai, dan label baru
muncul saat kursor menyentuhnya — dan itulah satu-satunya penanda bahwa bidang
tak terlihat itu bisa diklik. Jari tidak punya keadaan hover, jadi sentuhan
pertama langsung memindahkan ruangan tanpa pengunjung sempat tahu apa yang ia
sentuh. Pemicunya adalah waypoint `Function→Lounge` yang di rasio potret jatuh
**di luar bingkai** sepenuhnya, tapi masalahnya ternyata lebih luas dari satu
waypoint.

Patokannya `pointer: coarse`, **bukan lebar layar**: yang menentukan adalah ada
atau tidaknya hover, bukan sempitnya layar. `max-width` akan meloloskan tablet
landscape yang masalahnya sama persis.

> **Catatan (13 Agu) — form inquiry memakai DUA patokan, dan itu bukan
> pelanggaran aturan di atas.** `sections/Contact.tsx` menggugurkan overlay
> laptop 3D-nya saat `coarse` **atau** `narrow` (<768px). Yang kedua menjawab
> soal yang berbeda: bukan hover, tapi RUANG. Rig overlay-nya terkendala lebar,
> jadi di jendela sempit kamera mundur jauh dan layar laptopnya cuma mengisi
> seperempat tinggi — form-nya utuh tapi terlalu kecil untuk dibaca (terpotret
> di 390px). Aturan §6 tetap berlaku apa adanya untuk INTERAKSI scene; ini
> tambahan soal keterbacaan, bukan penggantinya.

**Kenapa lintas-wilayah.** Ini seam paling tajam sekarang, dan bentuknya beda
dari §1–§5 — saat ditulis ia tidak menunggu merge untuk rusak, ia **sudah**
bergantung pada pekerjaan yang belum ada:

> Saat gerbang ini ditulis (3 Agu), `Navbar.tsx` **belum punya** pemilih
> ruangan sama sekali — grep `goTo` di seluruh `src/` dan satu-satunya
> pemanggil adalah `Waypoints.tsx`. `RoomNav` dihapus di `a1a857a`, dan
> komentar yang menyebut "dropdown ruangan di Navbar" merujuk ke UI yang tidak
> ada lagi (komentarnya sudah dibetulkan). Artinya untuk sementara pengunjung
> HP **terkunci di Lounge** — diterima sadar sambil menunggu koordinasi.

**✅ TERJAWAB — `join` sudah di-merge (3 Agu, `455eae7`).** Nico membangun room
links di `Navbar.tsx` (`ACTIVE_KEYS.map` → `goRoom`) plus routing berbasis path
lewat `routes/RoomRouteSync.tsx`. Kuncinya terbuka; pengunjung HP bisa berpindah
ruangan lewat navbar.

⚠️ **Yang berlaku sekarang adalah ikatannya.** Room links di `Navbar.tsx`
bukan sekadar kenyamanan — ia **satu-satunya** jalan pindah ruangan di
perangkat sentuh. Kalau suatu saat dihapus atau diubah jadi butuh hover, §6
langsung berubah jadi jalan buntu di HP, dan **tidak ada test yang bisa melihat
ikatan itu**: `coarsePointer.invariant.test.ts` menjaga gerbangnya mati, bukan
menjaga adanya jalan keluar.

Dan tetap: **jangan "memperbaiki" §6 dengan menghidupkan lagi waypoint di
perangkat sentuh.** Jalan keluarnya adalah navbar, dan sekarang navbar itu ada.

**Urutan gerbang yang tidak boleh dibalik.** Tiga berkas menjalankan satu
keputusan ini, dan dua di antaranya punya kegagalan lebih buruk dari sekadar
"fitur bocor":

| berkas | perannya | kalau lepas |
|---|---|---|
| `canvas/Waypoints.tsx` | berhenti me-render waypoint | sentuhan memindah ruangan tanpa penjelasan |
| `canvas/Office.tsx` | `onClick` meja tidak membuka minigame | **pemain terkunci** di pandangan atas meja — tombol keluar hidup di HUD yang tidak di-mount |
| `sections/Hero.tsx` | HUD & label tidak di-mount | chunk terunduh percuma di seluler (kosmetik) |

Gerbang di `Hero.tsx` bersifat kosmetik + hemat bundle; yang benar-benar
mematikan interaksi adalah dua yang pertama. **Menyembunyikan HUD tanpa
mematikan pintu masuknya menghasilkan jalan buntu**, bukan sekadar tampilan
yang kurang rapi.

---

## §7 🔒 Render loop mati saat hero di-scroll lewat

**Aturan.** `useGatedFrameloop()` (di `canvas/FrameloopGate.tsx`) mengembalikan
`"never"` saat `!heroInView && sceneReady`, dan `canvas/Scene.tsx` memasangnya
sebagai **prop** `frameloop` di `<Canvas>`. Wajib prop, bukan `setFrameloop()`
imperatif — bentuk imperatif sudah dicoba dan terukur gagal: tiap re-render
`<Canvas>` (dulu dipicu `react-use-measure` saat fade scroll men-scale
pembungkus hero) menyinkronkan ulang prop `frameloop` yang tidak diset =
`"always"`, menimpa panggilan imperatif persis di momen ia dibutuhkan.

> Pemicu spesifik itu — surut scroll yang men-scale pembungkus hero — sudah
> dibongkar 10 Agu bersama pin desktop (lihat `sections/Hero.tsx`). Aturannya
> TIDAK ikut gugur: yang dibuktikan kejadian itu adalah "prop menang atas
> panggilan imperatif di setiap re-render", dan re-render `<Canvas>` bisa
> datang dari mana saja (resize jendela, ganti route, StrictMode). Hilangnya
> satu pemicu bukan alasan menghidupkan lagi bentuk imperatifnya.

Dua konsekuensi, satu ke tiap arah:

1. **Untuk siapa pun yang menulis kode di `canvas/`:** `useFrame` TIDAK
   berdetak saat pengunjung berada di konten bawah halaman. Komponen baru tidak
   boleh mengandalkan tick untuk pekerjaan yang harus jalan saat hero
   off-screen (polling, sinkronisasi state, timer). Pakai efek/DOM biasa untuk
   itu. Animasi visual justru aman — toh canvasnya tak terlihat.
2. **Untuk siapa pun yang menyentuh gate-nya:** kondisi jalan wajib menyertakan
   `|| !sceneReady`. `sceneReady` dipancarkan `useFrame` di `Office.tsx` — kalau
   loop dipause sebelum frame pertama, sinyal tak pernah datang dan overlay
   loader menutupi situs **selamanya** (kegagalan yang sama dengan §3).
   `heroInView` default `true` tidak cukup: reload di posisi scroll tengah
   halaman membuat observer menyetelnya `false` sebelum GLB selesai dimuat.

**Penjaga.** `src/components/canvas/frameloopGate.invariant.test.ts`

**Kenapa BUKAN `frameloop="demand"` (§1).** `"never"` beda kelas: ia
menghentikan SEMUA `useFrame` serempak — mixer karakter, sweep, tween — tidak
ada file yang bisa "lupa invalidate" sebagian. Kontrak demand↔invalidate yang
rapuh itu tetap tidak dihidupkan lagi.

**Kenapa lintas-wilayah.** Gejala aslinya (3 Agu) ada di wilayah Nico — "laptop
panas saat baca konten" — tapi sebabnya di wilayah Keano: canvas tetap merender
60 fps di balik pembungkus `opacity: 0` milik `sections/Hero.tsx`. Dan sinyal
gerbangnya (`heroInView`) diproduksi `Hero.tsx` (Nico) lalu dikonsumsi
`canvas/` (Keano) — persis jenis ikatan yang putus diam-diam saat salah satu
pihak mengubah observernya.

Ikatan turunannya: `BilliardHUD` keluar otomatis saat `!heroInView` — HUD-nya
`position: fixed`, tanpa itu bar tenaga melayang di atas konten halaman.

---

## Kebiasaan yang menangkap sisanya

Tiga hal ini menangkap lebih banyak daripada tooling mana pun di atas, karena
kegagalan seperti §1 dan §3 **lolos dari typecheck, lint, dan build**:

1. **Rebase sebelum merge, jangan merge langsung.** `feature/screen-content`
   hidup 2 hari dan berangkat dari titik yang sudah basi. Dengan
   `git rebase main` dulu, benturannya muncul di satu commit kecil dengan
   konteks jelas — bukan tersembunyi dalam auto-merge 15 berkas.

2. **Buka halamannya setelah merge.** 30 detik. Bug §1 kelihatan dalam 5 detik
   pertama. Tidak ada yang menjalankan `main` setelah `96df186`; kita berdua
   langsung lanjut di cabang masing-masing. Merge bukan garis akhir — itu titik
   di mana dua asumsi pertama kali bertemu.

3. **Cabang pendek.** Makin lama sebuah cabang hidup, makin besar peluang ada
   invariant yang berubah di belakangnya tanpa ia tahu.

`bun run test` menjalankan §1, §3, dan §6. Ketiganya sudah dibuktikan **merah**
di kondisi rusak sebelum dipakai — test yang tak pernah terlihat gagal tidak
bisa dipercaya.

§6 punya satu kebiasaan tambahan yang tidak dijawab tooling: **buka halamannya
di device toolbar browser** (atau HP betulan) setelah menyentuh apa pun di
`canvas/`. Seluruh aturan §6 tidak terlihat sama sekali di desktop — di sanalah
letak bahayanya.

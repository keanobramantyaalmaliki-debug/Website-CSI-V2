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
| 60 | `LoadingScreen` | Keano |

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

Kalau nanti ada patch shader **kedua** (efek baru di scene yang sama), keduanya
tidak boleh saling menimpa `onBeforeCompile` secara buta — `revealSweep.ts`
sudah menyimpan yang sebelumnya di `Map` dan mengembalikannya saat `dispose()`.
Ikuti pola itu. Menimpanya buta akan menghapus patch orang lain diam-diam, dan
gejalanya muncul sebagai "efek X tiba-tiba hilang" berbulan-bulan kemudian.

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

**Kenapa lintas-wilayah.** Ini seam paling tajam sekarang, dan bentuknya beda
dari §1–§5 — ia tidak menunggu merge untuk rusak, ia **sudah** bergantung pada
pekerjaan yang belum ada:

> Saat gerbang ini ditulis (3 Agu), `Navbar.tsx` **belum punya** pemilih
> ruangan sama sekali — grep `goTo` di seluruh `src/` dan satu-satunya
> pemanggil adalah `Waypoints.tsx`. `RoomNav` dihapus di `a1a857a`, dan
> komentar yang menyebut "dropdown ruangan di Navbar" merujuk ke UI yang tidak
> ada lagi (komentarnya sudah dibetulkan). Artinya untuk sementara pengunjung
> HP **terkunci di Lounge** — diterima sadar sambil menunggu koordinasi.

**Sudah terjawab di branch `join`:** Nico membangun room links di `Navbar.tsx`
(`ACTIVE_KEYS.map` → `goRoom`) plus routing berbasis path lewat
`routes/RoomRouteSync.tsx`. Begitu `join` masuk, kunci itu terbuka.

Yang tetap berlaku: **jangan "memperbaiki" §6 dengan menghidupkan lagi waypoint
di perangkat sentuh.** Jalan keluarnya adalah navbar, dan sekarang navbar itu
ada. Kalau suatu saat room links-nya dihapus/diubah, §6 ikut jadi jalan buntu —
keduanya terikat, dan tidak ada test yang bisa melihat ikatan itu.

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

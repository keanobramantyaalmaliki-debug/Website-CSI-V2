# Diskusi — Lounge Phase 3: Ganti Visual Process/Deployments/LivingArchitecture

Branch: `feature/lounge-refresh`
Room: Lounge (pemilik konten: Nico)
Tanggal: 2026-08-04

## Latar Belakang

Setelah Phase 1 (hero moment + copy declutter di `LivingArchitecture`,
`CsiHero`) dan Phase 2 (Process/LivingArchitecture/Deployments dirombak jadi
card + foto stok), user merasa tiga section ini masih terasa "image semua" —
Process pakai foto Unsplash keyed per step, LivingArchitecture pakai foto
Unsplash keyed per node, Deployments pakai foto Picsum per sektor. Tidak ada
variasi bahasa visual antar section.

User menunjukkan referensi cogniti.id: pola **sticky scroll reveal /
scrollytelling** — daftar step di sisi kiri, satu panel sticky di kanan yang
berisi ilustrasi SVG line-art abstrak, berganti mengikuti step mana yang
sedang di-scroll. Bukan foto.

## Diskusi & Tiga Keputusan User

1. **Process** → adopsi pola cogniti.id persis: teks step di kiri, panel
   sticky di kanan berisi SVG line-art abstrak per step (ganti total dari
   foto Unsplash). Alasan: Process adalah konsep/metodologi kerja, bukan
   bukti nyata di lapangan — ilustrasi abstrak lebih pas daripada foto orang
   generik dari stok.

2. **Deployments** → foto **tetap dipakai**, karena section ini berfungsi
   sebagai bukti real-world per sektor (Public Services, Infrastructure,
   Logistics, Hospitality, Communities) — abstraksi akan melemahkan pesan
   "ini benar-benar terjadi di lapangan". Yang berubah hanya strukturnya:
   dari card statis (foto selalu terlihat) menjadi 3D flip card, meniru pola
   interaksi yang sudah dipakai LivingArchitecture di Phase 2.

3. **LivingArchitecture** → user awalnya minta rekomendasi pengganti foto
   (bukan diputuskan sepihak). Rekomendasi yang diajukan dan disetujui
   secara implisit (user minta lanjut ke plan): pakai bahasa visual yang
   sama dengan Process — SVG line-art abstrak kecil bertema circuit/node-
   diagram per node, ditaruh di *back face* flip card yang sudah ada
   (mekanik flip tidak diubah, hanya konten back face). Dua alasan:
   - Nama section "Living Architecture" secara harfiah tentang arsitektur
     sistem — diagram/circuit jauh lebih representatif daripada foto stok
     manusia/kantor generik.
   - Menyamakan bahasa visual Process ↔ LivingArchitecture (sama-sama
     abstrak) membuat Deployments (satu-satunya yang tetap pakai foto)
     terasa seperti kontras yang **disengaja** — bukan inkonsistensi desain
     yang tidak direncanakan.

## Temuan Sebelum Implementasi

- `src/components/ui/sticky-scroll-reveal.tsx` (`StickyScroll`) **sudah ada**
  di repo dan generik: `activeIndex` di-*drive* dari luar (bukan scroll
  internal komponen), `content: ReactNode` per panel (bukan hardcoded
  `<img>`). Sudah dipakai `Office.tsx` untuk pola list+sticky-panel yang
  sama persis. Keputusan: dipakai ulang, tidak membuat komponen sticky baru.
- Mekanik flip 3D (`perspective` + `preserve-3d` + `rotateY(180deg)`, hover
  di fine-pointer vs tap di coarse-pointer lewat `useCoarsePointer` yang
  sudah ada, crossfade untuk `prefers-reduced-motion`) sebelumnya hanya
  hidup di `NodeCard` (`LivingArchitecture.tsx`). Karena `DeploymentCard`
  butuh mekanik yang sama, diekstrak jadi komponen bersama — sama semangat
  dengan ekstraksi `useSpotlight` di Phase 2 (hindari duplikasi, aturan
  global #8 soal DRY/file health).

## Perubahan yang Diimplementasikan

### File baru

**`src/components/motion/FlipCard.tsx`**
Ekstraksi generik dari `NodeCard` versi lama. Menerima `front`, `back`
(keduanya `ReactNode`), dan `ariaLabel`. State `flipped`, `useCoarsePointer()`,
`useReducedMotion()` semua di-encapsulate di dalam komponen — konsumen tidak
perlu tahu detail mekanik flip. `className` bisa dioverride untuk ukuran
card yang berbeda (LivingArchitecture pakai `h-48 sm:h-56`, Deployments
pakai `h-56 sm:h-64` karena kontennya lebih padat).

**`src/lib/hooks/useScrollStepper.ts`**
Hook untuk scrollytelling: `IntersectionObserver` dengan `rootMargin` yang
membentuk band tipis di tengah viewport (`-45% 0px -45% 0px`), mengembalikan
`{ activeIndex, setRef }`. Step yang saat ini berada di band tengah jadi
`activeIndex`. Sengaja **tidak** memakai `useScroll`/`useMotionValueEvent`
(matematik scroll-progress yang di Phase 2 sengaja dibuang dari
LivingArchitecture) — ini teknik scrollytelling standar berbasis native
browser API, tidak menambah dependency baru.

**`src/components/motion/ProcessGlyphs.tsx`** (6 komponen SVG)
Line-art abstrak original (path sendiri, bukan trace referensi), palet
`zinc-400`/accent `#f97316` konsisten dengan tema situs:
- `DiscoveryGlyph` — orbit/comet (lingkaran konsentris + titik orbit)
- `StrategyGlyph` — rute zigzag menuju titik tujuan
- `DesignGlyph` — dua wireframe box bertumpuk
- `DevelopmentGlyph` — baris-baris kode
- `TestingGlyph` — grid checklist dengan centang
- `DeploymentGlyph` — grid node + garis koneksi menuju titik target

**`src/components/motion/NodeGlyphs.tsx`** (7 komponen SVG)
Tema circuit/node-diagram, satu per node LivingArchitecture: `CitizenGlyph`,
`OperationsGlyph`, `KnowledgeGlyph`, `InfrastructureGlyph`,
`IntelligenceGlyph`, `DecisionGlyph`, `ActionGlyph`. Statis (tidak
scroll-driven) karena reveal-nya sudah ditangani transisi flip yang ada.

### File diubah

**`src/components/sections/Process.tsx`** (rewrite)
- `STEPS`: field `image` dihapus, tambah `kicker` (kata pendek per step:
  UNDERSTAND, PLAN, SHAPE, BUILD, VERIFY, LAUNCH). Field `desc` yang sudah
  ada dipakai ulang sebagai caption di bawah glyph.
- Layout desktop: daftar step di kiri (tiap step diberi ruang vertikal
  cukup lewat padding `py-10 sm:py-14` agar scroll berhenti wajar di
  tengah viewport, sesuai band `useScrollStepper`), `StickyScroll` (reuse)
  di kanan berisi glyph + kicker + title, `activeIndex` disuplai dari
  `useScrollStepper`.
- Mobile (`lg:hidden` di dalam `StickyScroll` sendiri): glyph kecil inline
  di bawah tiap step, selalu visible — bukan pola hover/sticky-gated, pola
  sama seperti fallback mobile `Office.tsx`.
- `useSpotlight` di-drop dari file ini (tidak dipakai lagi, section ini
  sudah punya interaksi scroll-sync sendiri).

**`src/components/sections/LivingArchitecture.tsx`**
- `NODES`: field `image` dihapus (tidak perlu field baru — glyph dipilih
  dari `NodeGlyphs.tsx` berdasarkan index array, urutan node tetap sama).
- `NodeCard` disederhanakan drastis: sekarang wrapper tipis di atas
  `FlipCard`. Front tidak berubah (nomor + nama + dot aksen oranye). Back
  diganti dari `<img>` foto menjadi glyph SVG (ukuran `14×14`, warna
  `orange-500/80`) + `desc`.
- Mekanik hover/tap/reduced-motion **tidak diketik ulang** — sudah pindah
  ke dalam `FlipCard`, `NodeCard` hanya konsumen.

**`src/components/sections/DeploymentCard.tsx`** (rewrite)
- Dari card statis (foto + teks selalu terlihat sekaligus) menjadi
  `FlipCard`: front = nomor + sector + region pill (informasi yang
  sebelumnya semua ditampilkan sekaligus di bawah foto, sekarang dipisah
  jadi tahap pertama interaksi). Back = foto Picsum (source & logic
  `IMAGE_SEED` per sektor **tidak berubah**) + desc, dengan gradient
  overlay yang sama seperti sebelumnya untuk keterbacaan teks di atas foto.
- `useSpotlight` di-drop (flip menggantikan spotlight sebagai interaksi
  utama card ini, sama seperti keputusan di LivingArchitecture Phase 2).

**`src/components/sections/Deployments.tsx`**
Tidak ada perubahan struktural — grid wrapper (`grid-cols-1 gap-4
sm:grid-cols-2 lg:grid-cols-3`) tetap kompatibel karena `DeploymentCard`
masih dirender sebagai direct child yang menerima stagger variants dari
parent `motion.div`.

### Test yang diupdate

**`Process.test.tsx`**
- Assertion "6 gambar Unsplash" (`querySelectorAll("img")`) diganti
  assertion glyph SVG: 12 `<svg>` total (6 step × 2 — satu di panel sticky
  desktop, satu di fallback inline mobile; keduanya selalu ada di DOM
  jsdom karena tidak ada breakpoint gating pada level render).
- Tambah assertion 6 kicker (`UNDERSTAND`, `PLAN`, dst) ter-render.
- Assertion judul step diubah dari `getByText` (tunggal) ke `getAllByText`
  dengan panjang 2 — karena title sekarang muncul dua kali (list kiri +
  panel sticky kanan).

**`LivingArchitecture.test.tsx`**
- Assertion `querySelectorAll("img")).toHaveLength(7)` diganti
  `querySelectorAll("svg")).toHaveLength(7)` — satu glyph per back face
  card.
- Test hover (fine-pointer) dan tap (coarse-pointer) **tidak berubah sama
  sekali** — kontrak DOM/ARIA (`aria-pressed`, `role="button"`) identik
  karena sekarang lewat `FlipCard`, bukan implementasi ulang.

**`Deployments.test.tsx`**
- Assertion 5 foto Picsum tetap ada (foto masih dipakai, sekarang berada
  di back face, bukan langsung terlihat).
- Assertion nama sektor diubah dari `getByText` ke `getAllByText` panjang
  2 (muncul di front face dan back face card).
- Tambah 2 test baru, mirror pola `mockPointer` + `fireEvent`/`userEvent`
  dari `LivingArchitecture.test.tsx`: flip on hover untuk fine-pointer,
  flip on tap untuk coarse-pointer.
- Tidak dibuat `FlipCard.test.tsx` terpisah — kontrak flip sudah tercover
  oleh dua consumer test (LivingArchitecture + Deployments) yang mengetes
  perilaku observable (aria-pressed, hover/tap), bukan detail implementasi
  internal `FlipCard`.

## Item Terbuka (Dicatat, Belum Diputuskan)

- **`src/lib/hooks/useSpotlight.ts`** sekarang jadi dead code — tidak
  dipakai lagi di mana pun setelah Process dan Deployments lepas dari pola
  spotlight-hover (diganti scroll-sync glyph dan flip). Sama seperti
  `FlowDiagram.tsx` yang sudah jadi dead code sejak Phase 2: **dibiarkan
  dulu**, tidak dihapus, menunggu keputusan user (mungkin dipakai lagi di
  room lain, atau memang tinggal dihapus).

## Batas Keras (Tidak Disentuh, Terkonfirmasi via `git diff --stat`)

`src/components/canvas/**`, `src/lib/store/**` (wilayah 3D Keano),
`CsiParticleField.tsx` + `<aside>` pembungkusnya di `CsiHero.tsx`,
`ManifestoField.tsx`, `Hero.tsx`, `useCoarsePointer.ts` (dipakai ulang,
tidak diedit isinya), z-index tidak melebihi skala `<main>` = 10. Semua
perubahan berada di `src/components/sections/**`, `src/components/motion/**`,
`src/lib/hooks/**`.

## Verifikasi

| Item | Hasil |
|---|---|
| `bun run test` | ✅ 112 test lulus, 20 file (termasuk 3 file yang diupdate) |
| `bun run lint` | ✅ bersih di semua file yang disentuh — 2 error pre-existing di `DeploymentsMatterField.tsx` (tidak terkait perubahan ini, sudah tercatat sejak Phase 2) |
| `bun run build` | ✅ `tsc --noEmit && vite build` sukses |
| `git diff --stat` | ✅ hanya `sections/`, `motion/`, `lib/hooks/` yang berubah — tidak ada file di luar batas keras |

Dev server dijalankan manual oleh user sendiri untuk pengecekan visual (bukan
otomatis via Playwright/ego-browser — sesuai aturan global, tool browser
hanya dipanggil atas permintaan eksplisit).

## Belum Dilakukan

- Push ke remote (belum diminta eksplisit oleh user).
- Pre-Push Guarantee Report (baru relevan sebelum push, sesuai aturan
  global #18).
- Keputusan final soal `useSpotlight.ts` dan `FlowDiagram.tsx` (dead code,
  sengaja dibiarkan dulu, lihat "Item Terbuka" di atas).

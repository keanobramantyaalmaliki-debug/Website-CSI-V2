# Lounge Refresh — Ringkasan Diskusi & Perubahan

Branch: `feature/lounge-refresh`
Room: Lounge (pemilik konten: Nico)

## Konteks Awal

Website Cogniti (CSI) punya hero 3D persisten (milik Keano, off-limits) dan 4
"room" konten (milik Nico). User merasa teks di beberapa section terlalu
padat — orang tidak sempat baca saat scroll cepat. Rencana: tiap room dapat
satu "hero moment" yang dramatis secara visual, section lain di room yang
sama cukup dirapikan copy-nya. Urutan eksekusi: **Lounge → Office → Meeting
→ Function**, satu PR per room. Dokumen ini mencakup kerja untuk Lounge.

---

## Phase 1 — Hero moment + copy declutter (LivingArchitecture, CsiHero)

### Diskusi & keputusan
- Worktree ini dibuat dari branch `worktree-eksplore-transisi-animasi-card-responsive`
  (sudah berisi commit fan-slider CaseGrid), bukan dari `main`.
- Pola desc node di `LivingArchitecture`: scroll-driven, desc penuh hanya
  untuk node aktif (membalik komentar lama "name+desc selalu visible") —
  dipilih user secara eksplisit.
- Boleh pakai `useMotionValueEvent` (built-in `motion/react`) untuk
  menurunkan `activeIndex` dari `scrollYProgress` — pola baru di codebase,
  tidak menambah dependency.
- Batas keras yang dikonfirmasi TIDAK disentuh: `src/components/canvas/**`,
  `src/lib/store/**` (wilayah 3D Keano), `CsiParticleField.tsx` +
  `<aside>` pembungkusnya di `CsiHero.tsx`, `ManifestoField.tsx`,
  `Hero.tsx`, `useCoarsePointer.ts`, z-index melewati skala `<main>` = 10.

### Perubahan
- **`LivingArchitecture.tsx`**: layout responsif (FlowDiagram sticky di
  atas untuk mobile/tablet, sticky di kanan untuk desktop), hilangkan
  `hidden lg:block` yang membuat FlowDiagram tidak pernah mount di mobile,
  `activeIndex` diturunkan dari `scrollYProgress` via `useMotionValueEvent`,
  desc node expand/collapse mengikuti scroll (pola mirip `Disclosure.tsx`
  tapi digerakkan scroll, bukan klik). Copy tiap node dipangkas jadi lebih
  pendek (8-11 kata, dari sebelumnya 12-17 kata) karena hanya 1 desc yang
  visible di satu waktu.
- **`FlowDiagram.tsx`**: tambah `data-testid="flow-diagram"`, wrapper
  dibuat responsif untuk container mobile yang sempit.
- **`CsiHero.tsx`**: ganti body placeholder (`TODO(csi-hero)`) dengan copy
  final: *"We turn scattered systems into intelligence your organization
  can act on — every day, every decision."*
- **`LivingArchitecture.test.tsx`** (baru): render tanpa crash, 7 nama node
  ter-render, FlowDiagram mount tanpa gate breakpoint, desc node pertama
  visible default & node lain collapsed.

### Verifikasi
`bun run test` (102 test lulus), `bun run lint` (bersih di file yang
disentuh), `bun run build` (tsc + vite build sukses). Manual check via
dev server + ego-browser: layout desktop/mobile, sync activeIndex ↔
FlowDiagram dot, reduced-motion fallback — semua sesuai ekspektasi.

---

## Phase 2 — Card + image refresh (Process, LivingArchitecture v2, Deployments)

### Diskusi & keputusan
User melihat 3 section (Process/"How We Work", LivingArchitecture, dan
Deployments/"Built for real-world environments") masih terasa polos — teks
atau angka doang tanpa visual yang menahan mata. Diminta dirombak jadi card
+ image, dengan referensi animasi transisi dari luar.

Riset referensi (WebSearch): Stripe-style flashlight/spotlight hover, 3D
flip card, stacked scroll-reveal — dari Awwwards Card Animations/
Transitions, freefrontend.com Stripe-inspired cards, scroll-driven-
animations.style.

Tiga keputusan kunci dari AskUserQuestion:
1. **Gaya transisi**: mix — **beda gaya per section** (bukan 1 komponen
   serba-bisa), supaya Lounge tidak terasa monoton.
2. **LivingArchitecture**: user memilih **ganti total jadi card grid** —
   mekanik scroll-driven + FlowDiagram dari Phase 1 (yang baru saja
   di-approve) sengaja **dibuang**, diganti grid 7 card image+nama+desc.
3. **Sumber image Process**: **Unsplash keyed** per step (sama pola seperti
   `Office.tsx`), bukan Picsum abstrak.

Constraint dari INVARIANTS.md yang berlaku:
- z-index card baru tidak boleh melebihi skala `<main>` = 10.
- Hover-only content harus tetap bisa diakses di touch device (§6) — pola
  existing yang benar: `DeploymentRow.tsx` men-gate layer dekoratif hover
  dengan `hidden sm:block`, konten inti selalu visible.
- Tidak menambah Canvas/WebGL baru di Deployments — git history menunjukkan
  physics/interactive-ball experiment di section ini pernah di-rollback
  karena performa.

### Perubahan

**`src/lib/hooks/useSpotlight.ts`** (baru)
Extract logic spotlight (radial-gradient mengikuti mouse, gaya Stripe
flashlight) yang tadinya inline di `DeploymentRow.tsx` jadi hook reusable
`useSpotlight(reduced)` → `{ ref, background, onMouseMove }`. Dipakai di
`Process.tsx` dan `DeploymentCard.tsx` supaya tidak ada logic terduplikasi.

**`Process.tsx`** — spotlight hover card
- `STEPS` ditambah field `desc` dan `image` (Unsplash keyed sesuai makna
  tiap step: discovery→whiteboard, planning→roadmap, design→UI mockup,
  development→kode, testing→QA, deployment→server).
- List horizontal lama diganti grid card (`1 col → 2 col sm → 3 col lg`).
  Tiap card: foto di atas (selalu visible, bukan hover-only), nomor jadi
  ghost badge kecil, spotlight hover mengikuti mouse via `useSpotlight`.

**`LivingArchitecture.tsx`** — full rewrite ke 3D flip card grid
- **Dibuang**: FlowDiagram, `useScroll`/`useMotionValueEvent`, mekanik
  scroll-driven desc dari Phase 1.
- **Baru**: grid 7 card (`2 col → 3 col sm → 4 col lg`), tiap card 3D flip
  (`perspective` + `preserve-3d` + `rotateY(180deg)`). Depan: nomor + nama +
  dot aksen. Belakang: foto (Unsplash keyed per node) + desc (copy pendek
  dari Phase 1 dipertahankan).
- Trigger flip: **hover** di fine-pointer (desktop), **tap/klik** di
  coarse-pointer (touch) — pakai `useCoarsePointer` yang sudah ada di
  codebase (bukan gabungan hover+click sekaligus, karena awalnya
  menyebabkan bug: klik di desktop langsung membalik ulang card yang baru
  di-hover — ditemukan & diperbaiki saat test).
- `reduced-motion`: skip transform 3D, crossfade opacity instan.
- **`LivingArchitecture.test.tsx`**: rewrite total (assertion lama untuk
  scroll-driven sudah tidak relevan). Assertion baru: 7 nama node (muncul 2x,
  depan+belakang card), 7 flip card dengan image di back face, fine-pointer
  flip on hover, coarse-pointer flip on tap.

**`Deployments.tsx` + `DeploymentRow.tsx` → `DeploymentCard.tsx`**
- File di-rename konsep (`DeploymentRow.tsx` dihapus, `DeploymentCard.tsx`
  dibuat baru) karena perubahan struktur row→card cukup besar.
- Layout: dari list vertikal jadi grid (`1 col → 2 col sm → 3 col lg`).
- Foto Picsum diperbesar (`900×160` → `900×560`, proporsi card bukan row
  panjang), sumber **tetap Picsum** (tidak diganti Unsplash — user hanya
  minta Unsplash untuk Process). Tambah image-zoom (`scale-110`) + reuse
  `useSpotlight` sebagai lapisan dekoratif di atas konten yang sudah selalu
  visible.
- `Deployments.tsx`: update import `DeploymentRow` → `DeploymentCard`,
  wrapper list diganti grid.

**Test baru**: `Process.test.tsx`, `Deployments.test.tsx` — render tanpa
crash, judul/sector ter-render, jumlah image sesuai data.

### Item terbuka (sudah diputuskan user)
- **`FlowDiagram.tsx`** sekarang jadi **dead code** — tidak dipakai di mana
  pun lagi setelah LivingArchitecture diganti jadi grid card. Keputusan
  user: **biarkan dulu**, tidak dihapus (mungkin dipakai lagi nanti / room
  lain).

### Verifikasi
`bun run test` (109 test lulus, semua file), `bun run lint` (bersih di
semua file yang disentuh — 2 error pre-existing di `DeploymentsMatterField.tsx`
tidak terkait perubahan ini), `bun run build` (tsc + vite build sukses).
`git diff --stat` dicek: tidak ada file di `canvas/**`, `lib/store/**`,
atau `Hero.tsx` yang ter-modify — sesuai batas keras.

Dev server dijalankan manual oleh user untuk pengecekan visual (belum ada
laporan hasil balik di percakapan ini).

---

## File yang berubah (kumulatif, Phase 1 + Phase 2)

| File | Status |
|---|---|
| `src/components/sections/LivingArchitecture.tsx` | Modified (2x — Phase 1 lalu Phase 2) |
| `src/components/sections/LivingArchitecture.test.tsx` | New (2x — rewrite di Phase 2) |
| `src/components/sections/CsiHero.tsx` | Modified |
| `src/components/motion/FlowDiagram.tsx` | Modified (Phase 1), sekarang unused |
| `src/components/sections/Process.tsx` | Modified |
| `src/components/sections/Process.test.tsx` | New |
| `src/components/sections/Deployments.tsx` | Modified |
| `src/components/sections/Deployments.test.tsx` | New |
| `src/components/sections/DeploymentRow.tsx` | Deleted |
| `src/components/sections/DeploymentCard.tsx` | New |
| `src/lib/hooks/useSpotlight.ts` | New |

---

## Phase 3 — Ganti visual Process/Deployments/LivingArchitecture supaya tidak "image semua"

### Diskusi & keputusan
User melihat referensi cogniti.id (pola sticky scroll reveal / scrollytelling:
list step kiri, panel sticky kanan dengan SVG line-art abstrak per step, bukan
foto). Tiga keputusan:
1. **Process** → adopsi pola itu persis: teks step kiri, panel sticky kanan
   berisi SVG line-art abstrak per step (ganti foto Unsplash).
2. **Deployments** → foto tetap dipakai (bukti real-world per sektor), tapi
   struktur diubah jadi 3D flip card seperti LivingArchitecture (bukan card
   statis).
3. **LivingArchitecture** → ganti foto jadi SVG line-art abstrak kecil per
   node di back face flip card (bahasa visual sama dengan Process), supaya
   kontras dengan Deployments (satu-satunya yang masih pakai foto) terasa
   disengaja.

Ditemukan `StickyScroll` (`src/components/ui/sticky-scroll-reveal.tsx`) sudah
generik dan dipakai `Office.tsx` untuk pola sama — dipakai ulang, bukan bikin
komponen sticky baru. Mekanik flip di `NodeCard` (LivingArchitecture)
diekstrak jadi `FlipCard.tsx` dan dipakai ulang di `DeploymentCard.tsx` —
sama semangat dengan ekstraksi `useSpotlight` di Phase 2 (DRY, aturan global
#8).

### Perubahan

**`src/components/motion/FlipCard.tsx`** (baru)
Ekstrak markup + mekanik flip generik dari `NodeCard` lama: `front`/`back`
sebagai `ReactNode` slot, `useCoarsePointer()` + `useReducedMotion()`
di-encapsulate di dalam. Konsumen kirim `front`, `back`, `ariaLabel`.

**`src/lib/hooks/useScrollStepper.ts`** (baru)
Hook `IntersectionObserver` dengan `rootMargin` band di tengah viewport →
`{ activeIndex, setRef }`. Teknik standar scrollytelling, native browser API,
tidak menambah dependency. Sengaja tidak pakai `useScroll`/
`useMotionValueEvent` (matematik scroll-progress yang di Phase 2 sengaja
dibuang dari LivingArchitecture).

**`src/components/motion/ProcessGlyphs.tsx`** (baru) & **`NodeGlyphs.tsx`** (baru)
6 + 7 komponen SVG line-art original (bukan hasil trace referensi), palet
zinc-400/accent (`#f97316`) konsisten dengan tema situs. ProcessGlyphs:
Discovery (orbit), Strategy (rute), Design (wireframe), Development (baris
kode), Testing (checklist grid), Deployment (grid+garis koneksi).
NodeGlyphs: tema circuit/node-diagram untuk tiap node LivingArchitecture.

**`Process.tsx`** (rewrite)
`STEPS` kehilangan field `image`, tambah `kicker` (UNDERSTAND/PLAN/SHAPE/
BUILD/VERIFY/LAUNCH). Layout: list step kiri + `StickyScroll` (reuse) kanan
berisi glyph, `activeIndex` dari `useScrollStepper`. Mobile (`lg:hidden`):
glyph kecil inline selalu visible di bawah tiap step. `useSpotlight` di-drop
dari file ini.

**`LivingArchitecture.tsx`**
`NODES` kehilangan field `image`. `NodeCard` disederhanakan jadi wrapper
tipis di atas `FlipCard` — front tidak berubah (nomor+nama+dot), back diganti
glyph dari `NodeGlyphs.tsx` + desc (foto dibuang). Mekanik hover/tap/
reduced-motion tidak berubah secara perilaku (sekarang di dalam `FlipCard`).

**`DeploymentCard.tsx`** (rewrite)
Dari card statis ke `FlipCard`: front = nomor + sector + region pill
(dipindah dari layout lama), back = foto Picsum (source & `IMAGE_SEED` tidak
berubah) + desc. `useSpotlight` di-drop (flip menggantikan spotlight sebagai
interaksi utama, sama seperti LivingArchitecture).

**`Deployments.tsx`** — tidak berubah struktural, grid wrapper tetap cocok
dengan `DeploymentCard` baru.

**Test**: `Process.test.tsx` — assertion foto Unsplash diganti assertion
glyph SVG (12: 6 mobile inline + 6 sticky panel) + kicker; assertion judul
step disesuaikan jadi `getAllByText` (2x kemunculan: list + sticky panel).
`LivingArchitecture.test.tsx` — assertion 7 `<img>` diganti 7 `<svg>` di back
face; test hover/tap tetap jalan tanpa perubahan (kontrak DOM/ARIA sama,
lewat `FlipCard`). `Deployments.test.tsx` — tambah 2 test flip (hover
fine-pointer, tap coarse-pointer) mirror pola LivingArchitecture; assertion
sector name jadi `getAllByText` (2x: front+back face); assertion foto Picsum
(5) tetap ada. Tidak bikin `FlipCard.test.tsx` terpisah — kontraknya sudah
tercover 2 consumer test yang mengetes perilaku, bukan implementasi.

### Item terbuka (dicatat, tidak diputuskan sekarang)
- **`src/lib/hooks/useSpotlight.ts`** jadi tidak dipakai lagi setelah
  Process & Deployments lepas dari pola spotlight-hover (diganti flip/glyph).
  Sama seperti `FlowDiagram.tsx` di Phase 2: dibiarkan, tidak dihapus,
  keputusan user ditunda.

### Verifikasi
`bun run test` — 112 test lulus (20 file, termasuk 3 file yang diupdate).
`bun run lint` — bersih di semua file yang disentuh (2 error pre-existing di
`DeploymentsMatterField.tsx` tidak terkait perubahan ini, sama seperti
dicatat di Phase 2). `bun run build` — `tsc --noEmit && vite build` sukses.
`git diff --stat` dicek: hanya `sections/`, `motion/`, `lib/hooks/` yang
berubah — tidak ada file di `canvas/**`, `lib/store/**`, atau `Hero.tsx` yang
tersentuh, sesuai batas keras.

Dev server dijalankan manual oleh user sendiri untuk pengecekan visual
(sesuai aturan global — Playwright/browser check tidak dipanggil otomatis
tanpa permintaan eksplisit).

## Belum dilakukan
- Push ke remote (belum diminta eksplisit oleh user).
- Pre-Push Guarantee Report belum ditampilkan (baru relevan sebelum push).
- Keputusan final soal `useSpotlight.ts` dan `FlowDiagram.tsx` (dead code,
  dibiarkan dulu).

---

## Phase 3 (rencana, belum diimplementasi) — Ganti visual biar tidak "image semua"

### Diskusi & keputusan
User kasih referensi cogniti.id (`Development Process` section) — pola **sticky
scroll reveal / scrollytelling**: list step di kiri, satu panel sticky di kanan
berisi ilustrasi SVG line-art abstrak yang berganti per step (bukan foto). Bukan
komponen "2D" khusus — nama pattern-nya *Sticky Scroll Reveal* (Aceternity UI
punya versi dengan nama itu). Sudah ditemukan: `src/components/ui/sticky-scroll-
reveal.tsx` (`StickyScroll`) **sudah ada di repo**, generik (`content: ReactNode`,
bukan hardcoded `<img>`), dipakai `Office.tsx` untuk pola sama persis (list +
panel sticky, `activeIndex` controlled dari luar) — dipakai ulang, tidak bikin
baru.

Tiga keputusan user:
1. **Process** → adopsi pola cogniti.id: teks step kiri, panel sticky kanan berisi
   SVG line-art abstrak per step (ganti foto Unsplash yang sekarang). Alasan user:
   Process itu konsep/metodologi, bukan bukti nyata — abstrak lebih kuat dari foto
   orang generic.
2. **Deployments** → foto **tetap dipakai** (bukti real-world per sektor), tapi
   strukturnya diubah jadi 3D flip card seperti `LivingArchitecture` yang sekarang
   (bukan card statis foto-selalu-visible).
3. **LivingArchitecture** → user minta rekomendasi selain foto. Rekomendasi yang
   diajukan: pakai bahasa visual sama dengan Process — SVG line-art abstrak kecil
   per node (circuit/node-diagram), ditaruh di back face flip card yang sudah ada
   (ganti foto, mekanik flip tidak berubah). Alasan: nama section "Living
   Architecture" = arsitektur sistem, diagram lebih pas dari foto stok; sekaligus
   menyamakan visual language dengan Process (abstrak) supaya kontras dengan
   Deployments (satu-satunya yang tetap foto) terasa disengaja, bukan tidak
   konsisten.

### Rencana perubahan file

**`src/components/motion/FlipCard.tsx`** (baru) — ekstrak mekanik flip generik
dari `NodeCard` di `LivingArchitecture.tsx` saat ini (perspective/preserve-3d/
rotateY, hover fine-pointer vs tap coarse-pointer via `useCoarsePointer` yang
sudah ada, reduced-motion crossfade). Slot `front`/`back` sebagai `ReactNode`.
Dipakai ulang di `LivingArchitecture` dan `DeploymentCard` — sama semangat dengan
ekstraksi `useSpotlight` di Phase 2, hindari duplikasi.

**`src/lib/hooks/useScrollStepper.ts`** (baru) — `IntersectionObserver` dengan
band tengah viewport, return `{ activeIndex, refs }` untuk drive `StickyScroll`.
Bukan `useScroll`/`useMotionValueEvent` (matematik scroll-progress yang sengaja
dibuang dari LivingArchitecture di Phase 2) — teknik scrollytelling standar,
native API, tanpa dependency baru.

**`src/components/motion/ProcessGlyphs.tsx`** (baru) — 6 SVG line-art abstrak
statis, original artwork terinspirasi motif cogniti.id (comet/orbit, rute
zigzag, wireframe box, baris kode, checklist grid, grid+garis koneksi), palet
zinc-400/accent (`#f97316`).

**`src/components/motion/NodeGlyphs.tsx`** (baru) — 7 SVG kecil circuit/node-
diagram, satu per node LivingArchitecture (Citizen, Operations, Knowledge,
Infrastructure, Intelligence, Decision, Action).

**`src/components/sections/Process.tsx`** (rewrite) — `STEPS`: hapus `image`,
tambah `kicker` (UNDERSTAND, PLAN, SHAPE, BUILD, VERIFY, LAUNCH); `desc` yang
ada dipakai ulang sebagai caption. Layout: list kiri, `StickyScroll` (reuse)
kanan (`hidden lg:block` seperti Office.tsx) berisi glyph + kicker + caption,
`activeIndex` dari `useScrollStepper`. Mobile: glyph kecil inline di bawah tiap
step (selalu visible). Drop `useSpotlight` (tidak dipakai lagi di file ini).

**`src/components/sections/LivingArchitecture.tsx`** — `NodeCard` disederhanakan
jadi wrapper tipis di atas `FlipCard`: front tidak berubah (nomor+nama+dot), back
= glyph dari `NodeGlyphs.tsx` + desc (ganti foto). Mekanik hover/tap/reduced-
motion pindah ke `FlipCard`, tidak diketik ulang.

**`src/components/sections/DeploymentCard.tsx`** (rewrite) — ganti dari card
statis jadi `FlipCard`: front = nomor+sector+region pill, back = foto Picsum
(source **tetap Picsum**, `IMAGE_SEED` tidak berubah) + desc. Drop `useSpotlight`
di file ini (flip menggantikan spotlight sebagai interaksi utama).

**`src/components/sections/Deployments.tsx`** — tidak banyak berubah, hanya
memastikan cocok dengan props `DeploymentCard` baru.

### Rencana test
- `Process.test.tsx`: assertion "6 gambar Unsplash" → 6 glyph SVG di sticky
  panel + step titles/kicker tetap ada.
- `LivingArchitecture.test.tsx`: `querySelectorAll("img")` → assert SVG di back
  face tiap card (7). Test hover/tap yang ada tetap jalan (kontrak DOM/ARIA sama
  lewat `FlipCard`).
- `Deployments.test.tsx`: tambah test flip (mirror pola `mockPointer` dari
  `LivingArchitecture.test.tsx`, 5 sector). Assertion gambar Picsum (5) tetap ada
  (foto masih dipakai, sekarang di back face).
- Tidak bikin `FlipCard.test.tsx` terpisah — kontrak sudah tercover 2 consumer
  test yang mengetes perilaku, bukan implementasi.

### Item terbuka (dicatat, belum diputuskan)
- **`useSpotlight.ts`** akan jadi dead code setelah Process & Deployments lepas
  dari pola spotlight-hover (diganti sticky-reveal / flip). Sama seperti
  `FlowDiagram.tsx` di Phase 2: rencana **dibiarkan**, tidak dihapus, menunggu
  keputusan user saat implementasi selesai.

### Batas keras (tidak berubah)
`src/components/canvas/**`, `src/lib/store/**`, `CsiParticleField.tsx` + `<aside>`
pembungkus di `CsiHero.tsx`, `ManifestoField.tsx`, `Hero.tsx`,
`useCoarsePointer.ts` (dipakai ulang, tidak diedit), z-index ≤ skala `<main>` =
10. Semua perubahan di `sections/`, `motion/`, `lib/hooks/` saja.

### Status
Rencana sudah dibahas, **belum diimplementasi** — menunggu approval user.

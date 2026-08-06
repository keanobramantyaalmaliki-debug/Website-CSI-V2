# Diskusi — Lounge Phase 4: Mobile Impact + Deployments Image Fix + LivingArchitecture Staggered Slider

Branch: `feature/lounge-refresh`
Room: Lounge (pemilik konten: Nico)
Tanggal: 2026-08-04/05

## Latar Belakang

Lanjutan dari Phase 3 (flip card + glyph). User membawa 4 temuan baru:

1. `CsiParticleField` di `CsiHero` dibungkus `<aside className="hidden lg:block">`
   — partikel tidak pernah muncul di mobile/tablet.
2. `ManifestoField` (bagian lain, di luar scope Lounge tapi berbagi pola
   partikel) punya lattice 40-kolom + offset `+1.0` yang dihitung untuk lebar
   desktop — di viewport sempit partikel menumpuk ke tepi kanan.
3. `DeploymentCard` pakai foto Picsum dengan `seed` string acak
   (`IMAGE_SEED`) — foto tidak berhubungan dengan makna sektor (user
   menyebut "gambarnya ubur-ubur" muncul di konten yang seharusnya tentang
   deployment nyata).
4. `LivingArchitecture` pakai 7 flip-card dengan glyph ukuran tetap `h-14
   w-14` — kekecilan di desktop, dan interaksi flip (hover/tap satu-satu)
   dianggap kurang menarik dibanding pola yang lebih dinamis.

## Rencana yang Disepakati (plan tertulis dari user, diimplementasikan persis)

**Batas keras** (tidak boleh disentuh): `src/components/canvas/**`,
`src/lib/store/**`, logika timeline/partikel internal `CsiParticleField.tsx`
dan `ManifestoField.tsx` (hanya wrapper/posisi target/mask yang boleh
diubah), `Hero.tsx` (beda dari `CsiHero.tsx`), isi `useCoarsePointer.ts`
(reuse saja), z-index ≤ 10. Semua perubahan wajib di
`src/components/sections/**`, `src/components/motion/**`,
`src/lib/hooks/**`.

### Fix #1 — CsiHero mobile

`<aside className="relative hidden lg:block">` → `"relative mt-8 lg:mt-0"`,
container tinggi jadi `h-40 lg:h-[20rem]` (responsive, bukan tetap 20rem).
`PARTICLE_COUNT` dipecah jadi `PARTICLE_COUNT_FINE = 1000` /
`PARTICLE_COUNT_COARSE = 500`, dipilih via `useCoarsePointer()` — alasan
performa sekarang field ini benar-benar render di device sentuh.

### Fix #2 — ManifestoField mobile positioning

Bukan pakai `useCoarsePointer` (itu soal ada-tidaknya hover, bukan lebar
layout — dua concern beda per `INVARIANTS.md` §6). Dipakai
`matchMedia("(max-width: 1023px)")` inline lewat hook lokal
`useNarrowViewport()` (tidak perlu file hook terpisah, satu titik pakai).
`targetPosition()`: `cols` 40→24, `offset` 1.0→0.3 saat narrow. Mask
gradient fade 35%→55% dari kiri, tambah `opacity: 0.7` di narrow supaya
partikel tidak "berebut" ruang baca dengan teks di layar sempit.

### Fix #3 — Deployments images

`IMAGE_SEED: Record<sector, string>` (Picsum seed acak) diganti
`SECTOR_IMAGE: Record<sector, string>` berisi URL Unsplash spesifik per
sektor, mengikuti pola persis yang sudah dipakai `Office.tsx`
(`SERVICES[].image`):

```ts
const SECTOR_IMAGE: Record<string, string> = {
  "Public Services": "https://images.unsplash.com/photo-1756227584303-f1400daaa69d?w=900&q=80&auto=format&fit=crop",
  Infrastructure: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80&auto=format&fit=crop",
  Logistics: "https://images.unsplash.com/photo-1645736315000-6f788915923b?w=900&q=80&auto=format&fit=crop",
  Hospitality: "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=900&q=80&auto=format&fit=crop",
  Communities: "https://images.unsplash.com/photo-1691724414154-8b1551e7b292?w=900&q=80&auto=format&fit=crop",
};
```

`w=900` (vs `w=640` di `Office.tsx`) karena back-face card butuh area lebih
besar. Kelima URL diverifikasi hidup (HTTP 200 + `image/jpeg`) via `curl`
langsung sebelum dipakai — tidak percaya klaim plan begitu saja.
`Deployments.test.tsx` assertion diubah dari cek `picsum.photos` ke
`images.unsplash.com`.

### Fix #4 — LivingArchitecture: staggered slider

Ganti 7 flip-card jadi:

- **Desktop (`lg:` ke atas):** komponen baru
  `src/components/motion/StaggeredGlyphSlider.tsx`, port dari pola
  basement.studio `experiments/58.staggered-slider.tsx` (source asli
  diambil dari GitHub `basementstudio/basement-laboratory`, bukan tebakan
  dari memori). Bedanya, versi asli pakai GSAP — repo ini sengaja tidak
  menambah dependency, jadi diimplementasikan ulang pakai `motion/react`
  yang sudah ada. Formula ukuran/opacity/z-index linear dari `displayIndex`
  (card depan paling besar+opaque, makin ke belakang mengecil+meredup),
  diskalakan dari ukuran foto asli basement.studio (726px/280px) ke ukuran
  card glyph+label (320px/140px). Auto-advance tiap 5 detik via
  `setInterval`, klik card membawanya ke depan. Reduced-motion fallback ke
  grid statis 4 kolom (`StaticGrid`, `data-testid="glyph-slider-static"`).
- **Mobile/tablet (`lg:hidden`):** bukan flip card lagi, jadi
  `MobileNodeCard` dengan `whileInView` scroll-reveal per-card
  (`viewport={{ once: true, margin: "-20%" }}`, stagger `delay: index *
  0.05`) — pola scroll-reveal yang sudah ada di codebase, bukan
  `useScrollStepper` (itu untuk panel sticky eksternal, tidak cocok di
  sini).
- Glyph: proporsional terhadap ukuran card di slider desktop (`size *
  0.3`), `h-16 w-16 sm:h-20 sm:w-20` di mobile (naik dari `h-14 w-14`
  lama).
- `FlipCard.tsx` **tetap dipakai** di `DeploymentCard.tsx` — bukan dead
  code setelah LivingArchitecture berhenti memakainya.

## Perubahan yang Diimplementasikan

### File baru

- **`src/components/motion/StaggeredGlyphSlider.tsx`** — komponen slider
  desktop, lihat Fix #4 di atas.

### File diubah

- **`src/components/sections/CsiHero.tsx`** — wrapper `<aside>` particle
  field jadi responsive (Fix #1).
- **`src/components/motion/CsiParticleField.tsx`** — `PARTICLE_COUNT`
  kondisional via `useCoarsePointer()` (Fix #1).
- **`src/components/motion/ManifestoField.tsx`** — `useNarrowViewport()`,
  `targetPosition()` dan mask gradient jadi viewport-aware (Fix #2).
- **`src/components/sections/DeploymentCard.tsx`** — `SECTOR_IMAGE`
  menggantikan `IMAGE_SEED`/Picsum (Fix #3).
- **`src/components/sections/LivingArchitecture.tsx`** — render dua jalur:
  `StaggeredGlyphSlider` desktop, `MobileNodeCard` mobile (Fix #4).

### Test yang diupdate

- **`Deployments.test.tsx`** — assertion foto: `picsum.photos` →
  `images.unsplash.com`.
- **`LivingArchitecture.test.tsx`** — rewrite total (assertion lama
  `aria-pressed` dari FlipCard sudah tidak relevan). Test baru: render
  tanpa crash, 7 nama node × 2 kemunculan (slider desktop + reveal mobile
  sama-sama ada di DOM jsdom, pola sama seperti `Process.test.tsx`), 14 SVG
  total (7 glyph × 2 varian), klik card di slider desktop membawa ke
  depan (`data-active` attribute, bukan assert inline style), auto-advance
  5 detik via `vi.useFakeTimers()`/`vi.advanceTimersByTime()`,
  reduced-motion render `StaticGrid` tanpa crash. Mocking
  `useReducedMotion` mengikuti pola yang sudah ada di
  `CsiParticleField.test.tsx` (`vi.mock("motion/react", ...)` dengan
  variabel `mockReduced` yang di-mutate per test, komponen di-`import()`
  dinamis setelah mock terpasang) — bukan pola `matchMedia` mock yang
  dipakai untuk `useCoarsePointer` di test lain, karena target di sini beda
  hook.

## Item Terbuka (Diwarisi dari Phase 3, Belum Diputuskan)

- `src/lib/hooks/useSpotlight.ts` masih dead code — belum dipakai lagi di
  mana pun sejak Phase 3. Dibiarkan, menunggu keputusan user.
- `src/components/motion/FlowDiagram.tsx` — dead code sejak Phase 2, ada
  perubahan kecil (1 baris) di Phase 4 tapi statusnya sebagai dead code
  belum berubah. Menunggu keputusan user.

## Batas Keras (Terkonfirmasi via `git diff --stat` + `grep`)

`src/components/canvas/**`, `src/lib/store/**`, dan `Hero.tsx` (versi asli,
bukan `CsiHero.tsx`) **tidak tersentuh**. Semua perubahan berada di
`src/components/sections/**`, `src/components/motion/**`,
`src/lib/hooks/**`.

## Verifikasi

| Item | Hasil |
|---|---|
| `bun run test` | ✅ 113 test lulus, 20 file (termasuk 3 file test yang ditulis/di-update di Phase 4) |
| `bun run lint` | ✅ bersih di semua file yang disentuh — 2 error + beberapa warning pre-existing di `DeploymentsMatterField.tsx`/`ManifestoField.tsx`/file lain, dikonfirmasi via `git stash`/`git stash pop` sudah ada sebelum perubahan ini |
| `bun run build` | ✅ `tsc --noEmit && vite build` sukses (hanya warning ukuran chunk yang sudah ada sebelumnya) |
| `git diff --stat` | ✅ hanya `sections/`, `motion/`, `lib/hooks/` yang berubah — tidak ada file di `canvas/`, `lib/store/`, atau `Hero.tsx` asli |

Verifikasi visual manual (device toolbar / viewport mobile) **sengaja tidak
dilakukan lewat Playwright** — user eksplisit menyatakan akan cek sendiri
lewat `bun dev` ("nanti aku test manual aja pakai bun dev"), sesuai aturan
global soal Playwright hanya dipanggil atas permintaan eksplisit.

## Belum Dilakukan

- Push ke remote (belum diminta eksplisit oleh user).
- Pre-Push Guarantee Report (baru relevan sebelum push, aturan global #18).
- Verifikasi manual mobile viewport — didelegasikan ke user via `bun dev`.
- Keputusan final soal `useSpotlight.ts` dan `FlowDiagram.tsx` (dead code,
  masih menunggu user, lihat "Item Terbuka").

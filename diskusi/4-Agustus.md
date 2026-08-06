# Diskusi & Plan — Refresh Konten/Layout Non-3D per Room (2026-08-04)

> Rangkuman diskusi + plan Phase 1-3 dari inisiatif refresh konten Lounge → Office →
> Meeting → Function. Status: **plan disusun, belum ada implementasi kode** — worktree
> disiapkan per phase, menunggu approve copy sebelum eksekusi dimulai.

---

## 1. Latar belakang & permintaan user

Agent lain menyusun plan awal (di luar sesi ini) untuk mengatasi dua masalah di situs
Cogniti (CSI): konten terlalu padat (Office, CaseStudySpotlight, LivingArchitecture
menampilkan blok teks panjang yang bikin orang malas baca saat scroll cepat), dan tidak
ada "titik diam" — momen di mana section terasa berhenti sejenak karena visualnya berubah,
bukan karena orang harus baca. Prioritas: **mobile lebih dari desktop, tapi tidak boleh
rusak di desktop**.

Pola yang disepakati dengan user: **Hybrid** — 1 "hero moment" scroll-pinned per room
(dramatis, jadi titik yang diingat), section lain di room yang sama cukup dirapikan
(copy dipangkas + stagger fade-up yang sudah ada dipertahankan, tanpa pin baru).

Urutan eksekusi: **Lounge → Office → Meeting → Function**, bertahap, 1 PR per room —
bukan digabung jadi satu PR raksasa.

**Aturan wajib dari user:** untuk setiap section yang teksnya dipangkas, draft copy
singkat harus disusun dan ditunjukkan ke user untuk approve **sebelum** diimplementasikan
ke komponen. Belum ada satu pun copy yang di-approve final di sesi ini — semua masih draft.

### Batas keras — wilayah 3D (tidak boleh disentuh)

Sesuai `INVARIANTS.md` (pembagian wilayah: Keano = 3D, Nico = konten web):

- `src/components/canvas/**`, `src/lib/store/**`
- `src/components/ui/BilliardHUD.tsx`, `WaypointLabel.tsx`
- `src/components/motion/CsiParticleField.tsx`, `ManifestoField.tsx`, `DeploymentsMatterField.tsx` (internal-nya)
- `src/components/sections/Hero.tsx`, `src/routes/SiteLayout.tsx` bagian `<Hero>`
- `src/lib/hooks/useCoarsePointer.ts` dan semua gate `pointer: coarse`
- `public/3d/models/**`, `export-test/**`

Boleh disentuh meski namanya mirip 3D: `sections/Office.tsx` (section HTML biasa, beda
dari `canvas/Office.tsx`), `NetworkField.tsx` (canvas 2D murni, non-WebGL), `DeploymentsMatterField.tsx`
(matter-js 2D physics, non-Three) — tapi wrapper/pemanggilnya di section boleh disentuh,
internal filenya tidak.

### Primitif yang sudah ada — wajib reuse

| Primitif | File | Fungsi |
|---|---|---|
| FadeUpList / FadeUpItem | `src/components/motion/FadeUp.tsx` | Stagger fade-up masuk viewport |
| LineMask | `src/components/motion/LineMask.tsx` | Clip-mask reveal untuk heading |
| Disclosure | `src/components/motion/Disclosure.tsx` | Accordion accessible, progressive disclosure |
| ScrollHighlight | `src/components/motion/ScrollHighlight.tsx` | Word-by-word highlight saat scroll |
| StickyScroll | `src/components/ui/sticky-scroll-reveal.tsx` | Crossfade panel by activeIndex, desktop-only saat ini |
| FlowDiagram | `src/components/motion/FlowDiagram.tsx` | SVG scroll-progress diagram, desktop-only saat ini |
| pola `useScroll`+`useTransform` | `LivingArchitecture.tsx`, `Manifesto.tsx` | Contoh scroll-linked existing |

Aturan teknis semua pin/scrub baru: **`position: sticky`**, bukan scroll-jacking berbasis
JS. Setiap efek baru wajib menghormati `useReducedMotion()` mengikuti pola yang sudah
konsisten di codebase (selalu dari `motion/react`, bukan custom hook).

---

## 2. Setup worktree — satu worktree per phase

Karena tiap room dieksekusi sebagai PR terpisah dan bisa direview/rollback independen,
disepakati **worktree terpisah per phase**, semua dibuat dari basis branch yang sama:
`worktree-eksplore-transisi-animasi-card-responsive` (commit `80187eb` — sudah berisi
commit fan-slider CaseGrid dari kerja sebelumnya di sesi ini, lihat §3).

| Phase | Room | Worktree | Branch |
|---|---|---|---|
| 1 | Lounge | `.claude/worktrees/lounge-refresh` | `feature/lounge-refresh` |
| 2 | Office | `.claude/worktrees/office-refresh` | `feature/office-refresh` |
| 3 | Meeting | `.claude/worktrees/meeting-refresh` | `feature/meeting-refresh` |

Ketiganya **independen/paralel** (bukan stacked) — tidak saling bergantung, masing-masing
bisa di-PR dan merge terpisah tanpa menunggu yang lain. Semua worktree sudah `bun install`
dan baseline test hijau (17 test file, 98 test lulus) sebelum plan disusun.

Phase 4 (Function) belum dibuatkan worktree — disebutkan di plan awal sebagai
kemungkinan tidak butuh perubahan struktural (section-nya sudah paling ringan teksnya).

---

## 3. Kerja yang sudah selesai (bukan bagian plan ini, tapi terjadi di sesi yang sama)

Sebelum plan Phase 1-3 disusun, ditemukan perubahan uncommitted di
`src/components/sections/CaseGrid.tsx` (fan-slider transition: kartu fan-out dengan
auto-advance 5 detik, crossfade detail overlay, mobile static stack) — tidak terkait
inisiatif Lounge-Office-Meeting-Function, melainkan kerja fitur transisi kartu yang
sedang berjalan di worktree `eksplore-transisi-animasi-card-responsive`. Sesuai arahan
user, ini di-commit terpisah dulu sebagai fitur sendiri:

```
80187eb feat(meeting): replace CaseGrid category filter with fan-slider transition
```

8 test baru ditulis (`CaseGrid.test.tsx`), lint bersih, file health OK (345 baris).
Commit ini menjadi basis untuk semua worktree phase di atas.

**Catatan:** `CaseGrid.tsx` karena itu sudah "selesai" secara terpisah dan disebut
eksplisit di Phase 3 sebagai **preseden pola yang benar, bukan target perubahan** — tidak
disentuh lagi selama Phase 3.

---

## 4. Plan per Phase

### Phase 1 — Lounge (worktree `feature/lounge-refresh`)

**Hero moment:** `LivingArchitecture.tsx`

Masalah: 7 node dengan desc 12-17 kata, opacity floor 0.6 → semua selalu terbaca sekaligus
(wall of text). `FlowDiagram` dibungkus `hidden lg:block` DAN digate `{!reduced && ...}` —
mobile kehilangan elemen paling visual dari section ini sepenuhnya (tidak pernah mount).

Keputusan yang dikonfirmasi eksplisit ke user (membalik komentar desain lama "name+desc
selalu visible, never hides text"):
- **Desc node scroll-driven** — nama selalu tampil, desc hanya expand penuh untuk node
  yang sedang "aktif" (posisi scroll menunjuknya). Node lain collapse.
- `activeIndex` diturunkan dari `scrollYProgress` yang sama dengan yang dikirim ke
  `FlowDiagram`, lewat `useMotionValueEvent` (built-in `motion/react`, pola baru di
  codebase tapi tidak nambah dependency) — supaya dot yang menyala di diagram dan desc
  yang expand di list dijamin sinkron di titik scroll yang sama (inilah "titik diam"-nya).
- `FlowDiagram` diubah dari `hidden lg:block` jadi selalu mount di semua breakpoint:
  mobile — diagram di atas dalam `sticky` pendek, list di bawahnya; desktop — tetap seperti
  sekarang (sticky di kanan). Gate `{!reduced && ...}` di parent dihapus karena
  `FlowDiagram` sudah punya fallback statis internal untuk `useReducedMotion` (bug lama:
  reduced-motion user bahkan di desktop kehilangan FlowDiagram sepenuhnya).

**CsiHero.tsx** — body placeholder (`TODO(csi-hero): pending final copy`, 22 kata) diganti
draft baru ≤20 kata. `HEADING_LINES` dan `<aside>`/`CsiParticleField` tidak disentuh.

**Section lain di Lounge** — dibaca penuh, **tidak ada perubahan wajib**: Manifesto (4
baris manifesto sudah editorial-pendek, komentar padding-nya terikat erat ke Hero
70dvh/HeroHandoff — terlalu berisiko disentuh untuk manfaat kecil), Deployments/DeploymentRow
(desc sudah ringkas), Process (cuma num+title), Industries, Vision, Contact (semua minimal).

**Draft copy yang perlu approve** (tabel lengkap ada di file plan asli, ringkasan): 7 desc
node dipangkas dari 12-17 kata jadi 8-11 kata; body CsiHero dari 22 kata jadi 16 kata draft.

**Test baru:** `LivingArchitecture.test.tsx` (belum ada sebelumnya) — render tanpa crash,
7 nama node ter-render, `FlowDiagram` selalu mount (tidak lagi conditional), `activeIndex`
awal = 0 → desc node pertama visible default.

---

### Phase 2 — Office (worktree `feature/office-refresh`)

**Hero moment:** foto besar service jadi scroll-progress driven (bukan cuma declutter copy)

Ini keputusan yang paling signifikan di Phase 2 — dikonfirmasi eksplisit ke user dengan
rekomendasi jelas. Kondisi saat ini: foto besar (`StickyScroll`, desktop-only lewat
`hidden lg:block`) HANYA berubah lewat `onMouseEnter`/`onFocus` per row — di touch device
tidak ada event ini sama sekali. Mobile hanya dapat foto lewat `<img>` inline di dalam
`Disclosure` (dari commit `eb890e9` sebelumnya), muncul HANYA saat row di-tap-expand — user
harus tap 9 kali untuk lihat 9 foto.

**Alasan pilih scroll-progress driven** (bukan pertahankan hover/tap saja):
1. Office adalah section terpadat di seluruh situs — kalau titik-diam tidak diterapkan di
   sini, brief inti "titik diam pasif" tidak benar-benar terpenuhi di room yang paling
   butuh.
2. Prioritas mobile eksplisit dari user — pola hover-desktop/tap-mobile berarti mobile
   TIDAK PERNAH dapat titik diam otomatis.
3. Hover override tetap dipertahankan di desktop (progressive enhancement, bukan
   penghapusan refinement lama).
4. Konsekuensi yang disetujui: 2 assertion test lama (`Office.test.tsx`, "mobile has no
   hover" dan "expand adds 1 image") akan ditulis ulang karena mengasersi kontrak lama
   yang sengaja diganti — bukan dihapus diam-diam, sesuai aturan project.

**Implementasi:**
- Komponen baru `PinnedServiceStack.tsx` (menggantikan `StickyScroll` yang hanya dipakai
  di Office — aman diganti) — crossfade panel foto, mount di semua breakpoint (bukan
  `hidden lg:block` lagi), sticky lebih pendek di mobile.
- `activeService` didorong `useScroll`+`useMotionValueEvent` (progress dari list service),
  dengan `manualOverride` state untuk hover di desktop (`onMouseEnter`/`onMouseLeave` set
  override, `onMouseLeave` lepas balik ke scroll-driven). Mobile otomatis 100%
  scroll-driven karena tidak ada hover event.
- Foto inline mobile-only di dalam `Disclosure` — **dihapus** (redundan karena foto besar
  sudah otomatis tampil di semua breakpoint).
- Disclosure tap untuk expand desc lengkap **tetap ada, tidak dihapus** — yang berubah
  hanya sumber foto besar.

**File health:** `Office.tsx` sudah 309 baris — ekstraksi `PinnedServiceStack.tsx` sejak
awal (bukan ditambah ke `Office.tsx` langsung) supaya tidak berisiko mendekati limit
global 500 baris.

**Draft copy yang perlu approve:** 9 desc service dipangkas dari 12-19 kata jadi ≤12 kata;
overview paragraph dari 50 kata jadi ≤25 kata draft.

**Test:** 2 assertion di `Office.test.tsx` ditulis ulang (kontrak foto berubah), 1
assertion baru (smoke test scroll-driven index), sisanya (heading, CTA, testimonial,
recognition, stats, 9 accordion items) diverifikasi tetap lulus tanpa diubah.

---

### Phase 3 — Meeting (worktree `feature/meeting-refresh`)

**Hero moment:** `CaseStudySpotlight.tsx`

Masalah: section terpadat kedua di situs, dan **satu-satunya section yang teksnya "wajib
dibaca" tanpa interaksi apa pun** — 2 spotlight, masing-masing 2 paragraf penuh (67-73 kata
total) selalu visible di kolom utama. Sidebar sudah punya teaser (paragraf pertama) tapi
hanya desktop (`hidden lg:block`) — mobile malah dapat body penuh tanpa ringkasan sama
sekali.

**Keputusan yang dikonfirmasi ke user:** pull-quote pendek + `Disclosure` "Baca detail"
(bukan hapus konten sepenuhnya):
- Body 2-paragraf diganti 1 pull-quote ≤20 kata (kalimat terkuat, **diambil dari** paragraf
  pertama existing, bukan ditulis dari nol) + `outcome` dibesarkan secara visual (dari
  baris kecil di sidebar metadata jadi elemen mono besar di main content).
- Paragraf lengkap (2 paragraf existing) **tidak dihapus/reword** — dipindah ke balik
  `Disclosure.tsx` yang sudah ada (reuse langsung, bukan reimplementasi), klik "Baca
  detail" untuk expand. Konten SEO/detail tetap ada.
- Foto ditambah scroll-scrub ringan (`useScroll`+`useTransform` per `SpotlightItem`, pola
  sama `LivingArchitecture.tsx` tapi target-nya ref item individual) — supaya ada gerakan
  terasa di mobile tanpa bergantung hover (`whileHover` yang ada sekarang cuma jalan di
  device dengan hover, jadi statis total di mobile). `whileHover` tetap dipertahankan
  sebagai tambahan di desktop, bukan pengganti.
- Sidebar teaser desc (`hidden lg:block`, paragraf pertama) dihapus — jadi redundan karena
  pull-quote di main sekarang tampil di semua breakpoint.

**Draft pull-quote yang perlu approve:**

| Spotlight | Draft pull-quote |
|---|---|
| Citizen Service Portal | "Thousands of requests a month — permits, letters, complaints — all still processed by hand at a counter." (17 kata) |
| Field Operations Suite | "Field teams across hundreds of sites, coordinating by phone — information arriving too late to matter." (15 kata) |

**Section lain di Meeting** — `MeetingLead.tsx` sudah ringkas (1 paragraf ~28 kata), tidak
ada perubahan. `CaseGrid.tsx` **tidak disentuh** (sudah selesai duluan, lihat §3).
`Contact.tsx` sudah minimal.

**Test:** `CaseStudySpotlight.test.tsx` — **file baru** (belum ada sebelumnya). Assertion:
render tanpa crash, 2 pull-quote tampil, paragraf detail TIDAK visible default, klik
trigger → paragraf muncul (`role="region"` dari `Disclosure`), outcome besar tampil di
main content, smoke test tidak crash saat `useScroll` di-stub.

---

## 5. Yang belum selesai / langkah berikutnya

1. **Belum ada draft copy yang di-approve user** di ketiga phase — ini blocker eksplisit
   sebelum implementasi kode dimulai sama sekali (aturan wajib user, lihat §1).
2. **Belum ada implementasi kode** di worktree manapun — semua masih tahap plan (mode plan
   diaktifkan untuk ketiganya, plan ditulis ke file plan session, belum di-exit-approve).
3. Phase 4 (Function) belum dibuatkan worktree/plan — kemungkinan tidak butuh perubahan
   struktural besar (disebut di plan awal sebagai room paling ringan teksnya), tapi belum
   diverifikasi ulang.
4. Urutan yang disarankan: selesaikan approve copy + implementasi Phase 1 dulu (Lounge)
   sebelum lanjut Phase 2 & 3, supaya pola `useMotionValueEvent` yang divalidasi di
   Phase 1 bisa jadi referensi konsisten untuk Phase 2 & 3 (keduanya juga memakai pola
   yang sama).

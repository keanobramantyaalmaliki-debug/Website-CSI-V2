# Perubahan — Perombakan UI/UX Comfort-First (2026-07-30)

> Sesi redesign radikal UI/UX dengan **kenyamanan sebagai prioritas utama**.
> Branch: `feature/comfort-redesign` (dari `feature/content-show-dont-tell`).
> Status: **selesai, belum di-push** — menunggu diskusi & konfirmasi user.

---

## 1. Konteks & jalannya diskusi

### Permintaan awal user
1. Pakai `ego-browser` untuk analisa mendalam `http://localhost:3000/`.
2. Rombak UI & desain agar lebih rapi, futuristik, animasi lebih baik.
3. Carikan skill pendukung yang bisa di-install.

### Pergeseran arah selama diskusi (penting — ini menyetir keputusan)
- **Pesan 1:** user pilih "futuristik agresif", boleh install GSAP, aktifkan 4 skill.
- **Pesan 2 (pivot besar):** user tegaskan **kenyamanan** yang utama — situs terasa
  *"kaku, membosankan, cenderung menyebalkan & membingungkan"*. Minta riset tren desain 2026.
- **Pesan 3:** setelah ditanya, user pilih **Seimbang 50/50** (nyaman + 1-2 momen wow),
  3D **dipertahankan tapi dioptimalkan**, Disclosure → **ringkasan tampil default**.
- **Pesan 4:** user tidak suka **hitam pekat** ("membingungkan secara psikologi, bikin malas").
  Klarifikasi: **tetap dark, tapi bukan hitam pekat**. Pilih "gelap tapi diperbaiki" + jembatan transisi halus.
- **Pesan 5:** "lanjutkan semuanya hingga selesai, nanti diskusi lagi."

### Temuan analisa (bukti: ego-browser + baca seluruh source)
Fondasi teknis **sudah kuat** (Vite + React 19 + R3F + `motion` v12 + Tailwind v4 + Zustand),
tapi UX menyakiti dirinya sendiri:
1. **Keterbacaan disandera scroll** — `ScrollHighlight` render teks abu-gelap → menyala hanya
   saat scroll presisi. Manifesto sempat **hitam total** saat screenshot.
2. **~70% teks disembunyikan** di balik `Disclosure` (dari fase "anti-boring" sebelumnya).
3. **Navigasi ganda-fungsi** — dropdown "Office" campur *pindah ruang 3D* + *anchor halaman*.
4. **Berat** — WebGL + bloom + billiard → eval JS sampai timeout → jank di device menengah.
5. **Identitas ganda & ritme seragam** — hero 3D main-main → konten brosur; 10× pola `eyebrow→heading→list`.

### Riset tren 2026 (memvalidasi arah user)
Industri **berbalik dari "motional theatrics"** ke: *calm interfaces, restraint with intention,
purposeful motion, dark-first, glassmorphism surgical, accessibility core*. Artinya comfort-first
= definisi "modern 2026", bukan kompromi. (Sumber: envato, UX Design Institute, Pixelmatters, Inverness.)

---

## 2. Prinsip yang dipegang (guardrails)

1. **Konten selalu kebaca** — animasi hanya memperhalus, tak pernah jadi syarat baca.
2. **Progressive disclosure jujur** — ringkasan tampil, expand hanya detail opsional.
3. **Dark-first, satu tema** — dark diangkat (bukan hitam pekat), 1 aksen orange dikunci.
4. **Restraint with intention** — tiap animasi punya alasan 1 kalimat.
5. **Accessibility core** — semua lolos `useReducedMotion`, kontras dinaikkan, keyboard nav utuh.
6. **Tidak sentuh** `Scene.tsx`/kamera/billiard internal.
7. **Nol dependency baru** — cukup `motion` v12 (GSAP akhirnya **tidak jadi perlu**).

---

## 3. Perubahan per commit

### `e283eab` — feat(ui): comfort-first foundation (Fase 1)
**Token & fondasi (`src/index.css`, +97 baris):**
- Base warna: `#000` (hitam pekat) → **`#14161b`** (dark slate terangkat, tidak pekat).
- Skala surface elevation (`--surface-0..3`), skala teks (`--text-primary/secondary/muted`).
- Token glass (`--glass-bg`, `--glass-blur`) + utility `.glass` dengan fallback `prefers-reduced-transparency`.
- Layer `.ambient-grid` — grid halus GPU-safe, fixed, radial mask (depth global).
- Token motion (`--ease-out`, durasi).

**Kontras teks dinaikkan menyeluruh (~13 file):**
- 29 teks low-contrast `text-zinc-500/600` → `zinc-300/400` (sumber rasa "malas/suram").
- Surface gelap `bg-zinc-950`/`bg-black` + hairline `border-zinc-900` → white-alpha
  (`bg-white/[0.02]`, `border-white/[0.08]`) supaya nyatu dengan base terangkat.

**Keterbacaan dibebaskan (`ScrollHighlight.tsx`):**
- Rentang warna: `#52525b → #f4f4f5` (gelap→terang) menjadi `#a9adb6 → #f4f5f7`
  (sudah-terbaca → penuh). Teks **selalu kebaca**, scroll cuma emphasis halus.

**Navigasi dipisah (`Navbar.tsx` — rewrite):**
- Dropdown "Office" (campur ruang 3D + anchor) **dihapus**.
- Navbar jadi **glass pill floating**, tinggi ≤ 72px, satu baris desktop, CTA nested-arrow.
- **Mobile hamburger menu** ditambah (morph ke X, panel glass) — sebelumnya nav hilang di HP.
- Kontrol ruang 3D tetap di hero (`RoomNav`).
- `App.tsx`: layer ambient-grid + `<main class="relative z-10">`.

### `abaf635` — feat(ui): open gated content for readability (Fase 2)
- **Deployments (`DeploymentRow.tsx`):** sektor + region + **deskripsi selalu tampil**
  (buang klik-untuk-baca). Spotlight hover + ghost numeral dipertahankan.
- **LivingArchitecture:** nama + deskripsi 7 node **tampil default**; scroll cuma angkat
  emphasis dim→penuh (floor 0.6, tak pernah sembunyi). Branch reduced-motion digabung ke `NodeItem`.
- **Vision:** 5 verba misi + detail **inline satu baris** (buang Disclosure).
- Hapus import `Disclosure` yang tak terpakai. **`Disclosure` disisakan hanya di Services**
  (9 item, deskripsi panjang — accordion = pola long-list yang benar, biar tak jadi tembok teks).

### `2e768e1` — perf(hero): skip WebGL under reduced-motion (Fase 3)
- `Hero.tsx`: saat `prefers-reduced-motion`, **WebGL scene TIDAK di-mount sama sekali** —
  ganti `StaticHero` (gradient branded + wordmark, CSS murni, nol aset baru).
- Kontrol 3D (RoomNav/BilliardHUD) & scroll-hint bounce juga di-skip di mode ini.
- Scene sudah optimal sebelumnya (`frameloop="demand"`, `dpr [1,1.5]`) — tak disentuh.
- **Manfaat:** hemat GPU/bundle untuk reduced-motion + device lemah = accessibility + perf.

### `bc2c329` — feat(motion): Hero→Manifesto handoff (Fase 4)
- Komponen baru `HeroHandoff.tsx` — seam gradient scroll-linked yang melebur warna
  scene 3D (`#0a0a0c`) ke base konten (`#14161b`), + guide line accent + label
  "leaving the office". Melunakkan lompatan hero→konten.
- Pure `motion` `useScroll` (no pin, no hijack, GPU-safe). Reduced-motion → seam statis.
- Disisipkan di `App.tsx` antara `<Hero />` dan `<Manifesto />`.

---

## 4. Verifikasi

| Cek | Hasil |
|---|---|
| `bun run build` (tsc + vite) | ✅ hijau tiap fase |
| Base color | ✅ `rgb(20,22,27)` = `#14161b` (computed style) |
| Deployments desc tampil default | ✅ 6 `<p>` |
| LivingArchitecture node desc | ✅ 7 paragraf |
| Vision mission detail inline | ✅ 5 paragraf |
| Services accordion `aria-expanded` toggle | ✅ false→true, `aria-controls` ada |
| Reduced-motion skip WebGL | ✅ `hasCanvas: false`, `heroImg: true` |
| Ambient grid aktif | ✅ z-0, fixed |
| Hutang teknis baru (TODO/console.log/@ts-ignore) | ✅ tidak ada |

**Verifikasi visual headless terbatas:** particle field R3F bikin CDP timeout, jadi verifikasi
utama via DOM assertion (lebih andal) + screenshot section yang bisa (nav, StaticHero).

---

## 5. Catatan jujur / hutang

- **Lint gagal — PRE-EXISTING, bukan dari sesi ini:** `eslint-config-next` (sisa Next.js,
  proyek ini Vite). Perlu dibersihkan terpisah.
- **Belum ada test runner** — mayoritas perubahan presentasional. `Disclosure` punya behavior
  yang bisa di-assert → usul pasang **Vitest + RTL** (menunggu izin user, aturan global).
- **Contact** masih `TODO(content)`: handle sosial + `mailto:hello@cogniti.id` belum final.
- Belum `git push` / merge — menunggu keputusan user.

---

## 6. File yang disentuh (sesi ini)

**Baru:**
- `src/components/motion/HeroHandoff.tsx`
- `diskusi/perubahan-2026-07-30.md` (dokumen ini)

**Dimodifikasi:**
- `src/index.css` (token + ambient grid + glass)
- `src/App.tsx` (ambient grid + HeroHandoff)
- `src/components/Navbar.tsx` (rewrite: pill glass + mobile menu, buang dropdown 3D)
- `src/components/sections/Hero.tsx` (StaticHero + skip WebGL reduced-motion)
- `src/components/motion/ScrollHighlight.tsx` (rentang warna aman-baca)
- `src/components/sections/DeploymentRow.tsx` (buka desc, buang Disclosure)
- `src/components/sections/LivingArchitecture.tsx` (buka node desc)
- `src/components/sections/Vision.tsx` (misi inline, buang Disclosure)
- Kontras/surface: `Services.tsx`, `Manifesto.tsx`, `Process.tsx`, `Careers.tsx`,
  `Industries.tsx`, `Contact.tsx`, `motion/Marquee.tsx`

---

## 7. Poin diskusi berikutnya (open questions)

1. Warna `#14161b` sudah pas "dark tak membosankan", atau mau lebih terang/hangat?
2. Services sengaja tetap accordion (9 item panjang) — setuju atau buka semua?
3. `HeroHandoff` ("leaving the office") — dipertahankan atau terlalu banyak?
4. Pasang Vitest untuk test `Disclosure`?
5. Bersihkan `eslint-config-next` yang pre-existing?
6. Kapan push / merge?

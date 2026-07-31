# Plan — Redesign Ritme Konten (setelah 3D Hero)

> Tujuan: konten setelah tampilan 3D tidak lagi terasa membosankan/monoton, tetap
> **text-first + transisi wajar**. Tanpa dependency baru (pakai `motion` v12 yang ada).
> Acuan gaya: skill `minimalist-ui` (kontras tipografi ekstrem, macro-whitespace,
> ritme editorial, motion halus) — diadaptasi ke dark monochrome yang sudah ada.

## Diagnosa (kenapa terasa membosankan)

Semua 9 section pakai pola **identik**: `eyebrow (xs) → heading (3xl/4xl, max-w-xl) → grid/list`.
Akibatnya:

1. **Ritme vertikal seragam** — tidak ada variasi tempo, mata tidak punya titik istirahat/kejutan.
2. **Kontras tipografi lemah** — heading semua seukuran, tak ada momen tipografi besar/berani.
3. **Layout terasa satu-kolom** — semua rata kiri, seperti daftar panjang, bukan komposisi.
4. **Transisi seragam** — fade-up + word-highlight dipakai di mana-mana, efek "wow"-nya luntur.

## Strategi

Pertahankan **urutan & konten** section. Ubah **komposisi + skala tipografi** di section
kunci supaya tempo berselang-seling: `besar-lega → rapat → editorial → PIN → horizontal →
marquee → rows → besar → besar`. Bedakan peran transisi (mask untuk heading besar, fade-up
untuk list, highlight hanya untuk manifesto/vision, sticky untuk 1 section saja).

---

## Perubahan per bagian

### 0. Global — tambah editorial serif  `[fondasi, kerjakan pertama]`
- `src/app/layout.tsx`: tambah `Instrument_Serif` (atau `Newsreader`) via `next/font/google`
  sebagai `--font-serif`. Body & UI tetap Geist Sans.
- `src/app/globals.css`: daftarkan `--font-serif`; util class `.font-serif`.
- **Aturan pakai:** serif HANYA untuk statement besar (Manifesto, Vision, Contact heading).
  Jangan dipakai di body/list — biar kontras editorial terjaga.

### 1. Manifesto — jadikan statement pembuka paling berani
- Perbesar lines dari `text-xl/2xl` → `text-3xl sm:text-5xl`, pakai `font-serif`,
  `leading-tight tracking-tight`. Tetap `ScrollHighlight` (T3) per line.
- Tambah macro-whitespace atas-bawah (`py-32 sm:py-40`) — ini "napas" setelah 3D.
- Momen tipografi terbesar di halaman = pemecah monoton pertama.

### 2. Deployments — list rapat (kontras vs Manifesto yang lega)
- Pertahankan struktur rows + `LineMask` heading. Perkuat: nomor `tabular-nums`
  sedikit lebih menonjol, hover row jelas. Tempo: padat & teknikal.
- Perubahan minor — section ini sudah berfungsi sebagai "rapat".

### 3. Services — dari card-grid 3 kolom → list editorial
- 9 card seragam = sumber monoton. Ganti jadi **list bernomor 2 kolom** dengan
  `divide-y`/border tipis (`#EAEAEA`-style: `border-zinc-900`), nomor besar `01–09`.
- Tag `subs` (AI Solutions) tetap sebagai pill kecil di bawah item terkait.
- Hilangkan look "SaaS card", ganti jadi indeks editorial. Tetap `FadeUpList` (T2).

### 4. LivingArchitecture — UPGRADE ke sticky pin  `[momen kejutan tunggal]`
- Implement T4 penuh (yang sekarang di-defer): heading + intro **pin/sticky** di kolom kiri,
  daftar 7 node scroll di kolom kanan; node menyala progresif seiring scroll.
- Pakai `position: sticky` (CSS murni) + `useScroll` yang sudah ada — **tanpa GSAP**.
- Dipakai **hanya di section ini** biar tetap terasa spesial. Fallback `useReducedMotion`
  tetap render statis (sudah ada).

### 5. Process — dari card-grid → alur horizontal bernomor
- 6 step card kotak → **horizontal numbered flow** (baris dengan konektor `→` antar step,
  wrap di mobile). Variasi bentuk vs grid di atas/bawah. Tetap stagger (T2).

### 6. Industries — pertahankan (sudah variasi)
- `Marquee` full-bleed sudah jadi pemecah ritme yang baik. Tidak diubah.

### 7. Careers — pertahankan struktur, poles minor
- Rows + underline-wipe (T7) sudah oke. Sinkronkan skala nomor/heading dengan Services.

### 8. Vision — statement besar (bookend Manifesto)
- Perbesar `ScrollHighlight` vision → `text-3xl sm:text-4xl` + `font-serif`.
- Missions list tetap (T2). Vision & Manifesto jadi dua "tiang" tipografi editorial
  yang menutup dan membuka blok konten.

### 9. Contact — heading serif besar
- `LineMask` heading → `font-serif`, perbesar konsisten dengan Vision. Selebihnya tetap.

---

## Prinsip transisi (dibedakan per peran)
| Peran | Transisi | Section |
|---|---|---|
| Heading besar | `LineMask` (T1) | Deployments, Services, LivingArch, Careers, Contact |
| Statement | `ScrollHighlight` (T3) | Manifesto, Vision |
| List/grid item | `FadeUpList/Item` (T2) | semua list |
| Full-bleed | `Marquee` (T5) | Industries |
| **Sticky pin** | `useScroll` + CSS sticky | **LivingArchitecture saja** |
| Eyebrow | slide-in x (T6) | semua |

## Yang TIDAK dilakukan
- Tidak menambah dependency (no GSAP).
- Tidak mengubah urutan/isi konten.
- Tidak menyentuh Hero 3D / kamera / scroll-camera.
- Tidak flip ke canvas putih — dark monochrome dipertahankan.

## Urutan kerja (branch: `feature/content-rhythm-redesign`)
1. (0) Serif global — fondasi.
2. (1)(8)(9) Statement editorial: Manifesto, Vision, Contact.
3. (3) Services → list editorial.
4. (5) Process → horizontal flow.
5. (4) LivingArchitecture → sticky pin (paling berisiko, terakhir).
6. (2)(7) Poles minor Deployments & Careers.
7. Verifikasi manual (reduced-motion, mobile wrap), lapor + tunggu konfirmasi merge.

## Risiko & catatan
- Sticky pin (#4) paling rawan di mobile → sediakan fallback non-sticky < `lg`.
- Serif Google font: pastikan `display: swap` + subset latin agar tidak menggeser layout.
- Semua animasi wajib lolos `useReducedMotion` (pola sudah ada di primitives).

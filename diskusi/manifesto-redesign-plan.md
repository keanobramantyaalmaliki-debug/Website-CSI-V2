# Plan — Manifesto Redesign

> Branch: `feature/manifesto-redesign`
> Tujuan: dari "blok teks kiri + void hitam kanan" → "pernyataan berskala dengan klimaks + partikel konvergen di belakang". Menarik tapi tetap sebuah manifesto, bukan techno demo.

## Design Read

Section manifesto, dark-mode tech/AI, bahasa **editorial-manifesto + kinetic-type minimal**, R3F sudah tersedia di stack.

**Dial:** `VARIANCE 6 / MOTION 6 / DENSITY 2`
(dari baseline calm `3/4/2` → dinaikkan karena user minta "jangan terlalu teks" & "menarik").

**Konsep tunggal:** *data berserak → menyatu jadi keputusan → aksi*. Semua motion tunduk ke satu makna ini. Tidak ada gerak tanpa alasan.

## Masalah yang diperbaiki

1. Void kanan menganga (teks `max-w-2xl` kiri, ~50% kanan hitam kosong) → kebaca "belum jadi".
2. Type kekecilan (`text-xl sm:text-2xl` = ukuran body) → statement bunyi seperti caption.
3. 4 baris rata bobot → tidak ada klimaks; thesis "those who act" tenggelam.
4. Eyebrow "MANIFESTO" numpuk pojok, hubungan lemah dengan teks.

## Perubahan

### 1. Tipografi & hierarki — `Manifesto.tsx` (risiko rendah, dampak besar)
- Skala statement naik: `text-3xl md:text-5xl`, `leading-[1.15]` (bukan `leading-snug`), `tracking-tight`.
- **Beat / ritme**, bukan 4 baris rata:
  - Baris 1-2 → pembuka, weight medium, warna sekunder saat idle.
  - **Baris 3 (thesis: "…not to those who collect, but to those who act.")** → klimaks: lebih besar (`md:text-6xl`), **italic same-family** (Geist Sans italic — BUKAN inject serif). Descender clearance: `leading-[1.15] pb-1`.
  - Baris 4 → penutup, balik tenang.
- Struktur data `LINES` diubah dari array string → array objek `{ text, weight }` biar per-baris bisa beda treatment. Emphasis kata dalam baris tetap pakai `<em>` (italic same-family), tidak mixed-family.
- Eyebrow: pindah agar duduk sebagai anchor komposisi (di atas blok teks dengan hairline/spine), bukan floating pojok.

### 2. Progress spine — `Manifesto.tsx` (motion termotivasi: "membaca = perjalanan")
- Garis vertikal tipis di margin kiri (`w-px`, `bg-zinc-800`) dengan overlay `bg-zinc-400` yang `scaleY` mengikuti `useScroll` section.
- Pakai `useScroll` + `useTransform` (motion values, **bukan** `useState` per frame). Sudah sepola dengan `ScrollHighlight`.
- Reduced-motion: spine tampil penuh statis.

### 3. Partikel konvergen — komponen baru `src/components/motion/ManifestoField.tsx` (isolated R3F leaf)
- **Canvas terpisah & ringan** — TIDAK menyentuh `Scene.tsx`/`CameraController`/bloom office. Alasan: bloom di scene office hasil kalibrasi ketat, dan kamera office punya controller sendiri. Manifesto pakai Canvas mandiri static camera.
- Config Canvas: `frameloop="demand"` (konsisten dengan proyek), `dpr={[1, 1.5]}`, `gl={{ antialias:false, powerPreference:"high-performance" }}`, transparan (`gl alpha`, `<color>` tidak dipasang). Tanpa EffectComposer/bloom (hindari cost).
- Geometri: satu `Points` (~800-1200 partikel) berbasis `BufferGeometry`. Tiap partikel simpan posisi **scatter** (acak, radius lebar) & posisi **target** (rapat/menyatu, mis. lattice atau cluster tengah-kanan).
- Animasi digerakkan **scroll progress section** (bukan waktu): `scatter → target` di-lerp sesuai `scrollYProgress`. Saat section masuk viewport = berserak; saat mendekati klimaks = konvergen. Metafora langsung: data → aksi.
- Karena `frameloop="demand"`: `invalidate()` dipanggil saat progress berubah (subscribe motion value), bukan `useFrame` loop terus-menerus. GPU idle saat diam.
- Visual: monochrome zinc (`#52525b`–`#a1a1aa`), opacity rendah (0.35-0.5), size kecil. **Low-contrast** — di belakang teks (`-z-10`), tidak melawan keterbacaan. Tanpa neon, tanpa warna.
- Posisi: kolom kanan (mengisi void), fade ke kiri via mask/gradient agar tidak ganggu teks kiri.
- Reduced-motion / no-WebGL: komponen return `null` (atau fallback gradient statis halus). Teks tetap 100% fungsional tanpa Canvas.

### 4. Layout section — `Manifesto.tsx`
- `min-h-[100dvh]` bila perlu ruang bernafas, atau tetap `py-32` — ditentukan saat implement (jangan over-pad, cap `pt-24`).
- Grid: `relative` container, teks di layer atas (`z-10`), `ManifestoField` absolute di belakang (`inset-0 -z-0 pointer-events-none`).
- Mobile `< 768px`: partikel di-dim lebih jauh / atau di-disable (cek FPS), teks jadi single-column full width, skala turun ke `text-3xl`.

## Yang SENGAJA dihindari (AI tells)
- Tidak ada eyebrow bernomor (`01 / MANIFESTO`), tidak ada scroll cue.
- Tidak ada em-dash sebagai flourish, tidak ada titik status berwarna.
- Partikel tidak neon/ungu/warna-warni — monochrome, low-contrast.
- Emphasis pakai italic **same-family**, bukan serif tempelan.
- 3D tidak dipakai buat pamer — satu makna: konvergensi = data jadi aksi.

## Testing
- Runner belum ada di proyek (cek `package.json`: hanya `tsc --noEmit` + eslint). Tidak ada test runner terpasang.
- Perubahan ini murni visual/presentational tanpa logic yang bisa di-assert unit-test bermakna.
- **Verifikasi:** `bun run build` (tsc typecheck + vite build) harus lulus + `bun run lint`. Manual: cek keterbacaan teks, FPS partikel, reduced-motion, mobile collapse.
- Jika user mau, tambah smoke-test render komponen — tapi butuh setup Vitest dulu (tanya user).

## Urutan kerja
1. `git checkout -b feature/manifesto-redesign`
2. Refactor tipografi + hierarki `Manifesto.tsx` (Tier 1, bisa langsung kelihatan hasilnya).
3. Tambah progress spine.
4. Buat `ManifestoField.tsx` (R3F leaf) + integrasi sebagai background layer.
5. Reduced-motion + mobile fallback + tuning kontras.
6. `bun run build` + `bun run lint` hijau.
7. Lapor: ringkasan + hasil build + nama branch. **Tunggu konfirmasi user sebelum merge.**

## File tersentuh
- `src/components/sections/Manifesto.tsx` (refactor)
- `src/components/motion/ManifestoField.tsx` (baru)
- (opsional) `src/components/motion/ScrollHighlight.tsx` — dipertahankan, dipakai untuk baris non-klimaks bila cocok.

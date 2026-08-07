# Keputusan: momentum scroll pakai Lenis

## Apa yang berubah

Menambah `lenis` sebagai dependency baru untuk momentum scroll wheel/trackpad
di desktop (glide ±0.4s setelah wheel berhenti). `gsap` yang sempat masuk
`package.json` di worktree ini dihapus lagi — nol dipakai di `src/`.

## Ini membalik arah yang sudah tercatat

Tiga catatan sebelumnya eksplisit bilang "nol dependency baru":

- `diskusi/perubahan-2026-07-30.md:51` — "Nol dependency baru — cukup `motion`
  v12 (GSAP akhirnya tidak jadi perlu)."
- `diskusi/plan-anti-boring.md:122` — "Tidak menambah GSAP/lib berat."
- `diskusi/plan-konten-redesign.md:56,91` — "Pakai `position: sticky` (CSS
  murni) ... tanpa GSAP", "Tidak menambah dependency (no GSAP)."

Pembalikan ini disengaja, dicatat di sini supaya tidak diam-diam.

## Kenapa alasan lama tidak berlaku untuk Lenis

Ketiga penolakan di atas soal **GSAP sebagai engine animasi** — GSAP
tumpang tindih penuh dengan `motion` v12 (`useScroll`, `whileInView`, dll)
yang sudah dipakai di ~50 file. Menambahnya cuma menduplikasi kapabilitas
yang sudah ada.

Lenis bukan engine animasi. Ia momentum scroll — meniru fisika inersia pada
event wheel/trackpad, kapabilitas yang **tidak ada penggantinya** di
`motion`. `motion` menganimasikan konten saat discroll (`useScroll`,
`whileInView`); ia tidak menyentuh perilaku scroll itu sendiri. Tanpa Lenis
(atau library sejenis), momentum wheel harus ditulis manual — event
listener + physics loop sendiri — yang justru lebih berisiko dan lebih
banyak kode daripada memakai library yang sudah teruji.

Jadi GSAP tetap ditolak (masih tumpang tindih, masih tidak perlu). Lenis
diterima karena mengisi lubang yang memang belum ada penggantinya.

## Scope

- `lerp: 0.09`, `syncTouch: false` (sentuh = native, momentum OS tidak
  ditimpa), `respectReducedMotion` — instance tidak dibuat sama sekali saat
  `prefers-reduced-motion: reduce`.
- Tidak menyentuh `Scene.tsx`, kamera, atau isi 3D — hanya wheel/trackpad
  desktop di DOM.
- Detail implementasi: `src/lib/smoothScroll.ts`,
  `src/lib/hooks/useSmoothScroll.ts`.

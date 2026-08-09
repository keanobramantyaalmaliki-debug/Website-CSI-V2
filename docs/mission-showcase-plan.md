# Plan — Ganti animasi Vision + Mission Showcase (lounge)

Status: **PLAN ONLY — belum dieksekusi.** Menunggu approve user.

## Keputusan yang sudah disepakati
| Topik | Keputusan | Alasan singkat |
|-------|-----------|----------------|
| Background `NetworkField` | **Buang dari Vision** (Opsi B) | Canvas rAF O(n²) 70 node = biang "berat pas scroll", percuma di touch |
| `ScrollHighlight` (teks vision) | **Pertahankan** | Desktop oke, teks tetap kebaca, ringan |
| `FadeUp` (list mission) | Diganti komponen showcase baru | Mission naik kelas jadi card slider/accordion |
| Sub-steps di card | **Drop** | Mission = 5 hal paralel, bukan proses; detail mission jadi payload expand |
| Model expand | **Default-expand + klik pindah + panah kiri/kanan** | 1 card animasi (bukan FLIP 3 card), ringan, jalan di keyboard/touch |
| Visual card | **Image card** — foto stock (Unsplash/Pexels), **hotlink CDN (tanpa file lokal)** | User pilih ada gambar; tema abstrak-teknologis biar tak terkesan stock murahan |
| Nav panah desktop | **Ya, fase 1** | Geser fokus card kiri/kanan; card tetap bisa diklik langsung |

### Trade-off hotlink (disadari & diterima)
Gambar bergantung CDN eksternal (Unsplash/Pexels resmi mengizinkan hotlink). Risiko: bila URL berubah / CDN lambat, card bisa lambat/blank. Mitigasi ringan: `loading="lazy"` non-aktif + `onError` fallback ke warna/gradient. Bila nanti butuh stabil → pindah lokal ke `public/`.

---

## 1. Perubahan di `Vision.tsx`
- Hapus import + pemakaian `NetworkField` (JANGAN hapus file — dipakai `Manifesto.tsx`).
- Pertahankan `ScrollHighlight` untuk kalimat vision.
- Ganti blok `FadeUpList` mission → render `<MissionShowcase missions={...} />`.
- Struktur akhir section:
  ```
  chip "OUR VISION"  → ScrollHighlight(vision statement)
  chip "OUR MISSION" → <MissionShowcase/>
  ```

## 2. Data (adaptasi dari MISSIONS yang ada, tanpa steps)
```ts
type Mission = {
  n: string;        // "01".."05"
  tag: string;      // label pendek, mis. "Delivery"
  verb: string;     // "Deliver" (dari data lama)
  detail: string;   // kalimat detail (dari data lama) — jadi payload saat expand
  image: string;    // URL stock berlisensi gratis
  imageAlt: string; // alt deskriptif (a11y)
};
```
Sumber `verb` + `detail` = konstanta `MISSIONS` yang sudah ada. Hanya nambah `n`, `tag`, `image`, `imageAlt`.

## 3. Komponen `MissionShowcase`
Satu komponen adaptif (bukan dua terpisah) untuk hindari double-DOM & double image-load.
- Deteksi breakpoint via `useMediaQuery('(min-width: 768px)')` — SSR-safe default (mobile-first) supaya nggak flash.
- **Desktop (md+):** baris horizontal card. Card aktif expanded (lebih lebar + tampil detail), sisanya collapsed. Klik card → pindah aktif. Nav panah kiri/kanan opsional (fase 2).
- **Mobile (<md):** accordion vertikal. Satu item terbuka; buka baru menutup lama. Chevron rotate 180°.
- Reveal payload = `detail` (tidak ada sub-card).

### Animasi (motion/react — sudah ada di repo)
- Desktop expand: `layout` + flex-basis (FLIP), bukan `layoutId`. Ease-out ~300–400ms.
- Mobile accordion: height auto via `AnimatePresence` + `motion.div`. Ease-out ~300ms.
- **`prefers-reduced-motion`:** hormati via `useReducedMotion` — expand tetap berfungsi tapi instan (tanpa transisi). WAJIB.

### Aksesibilitas
- Accordion: tiap header = `<button>`, `aria-expanded`, toggle via Enter/Space (native button = gratis).
- Desktop card aktif: `aria-current` atau state terpilih; fokus keyboard bisa memindah card aktif (Arrow / Enter).
- `alt` gambar deskriptif; card dekoratif `aria-hidden` bila perlu.
- Gambar `object-cover`, `loading="lazy"` untuk card non-aktif.

## 4. Sourcing gambar (tema per mission — stock lisensi gratis)
| # | Mission | Tema pencarian (Unsplash/Pexels) |
|---|---------|----------------------------------|
| 01 | Deliver — software solutions | clean code / dev workspace / product ui |
| 02 | Accelerate — digital transformation | light trails / motion / speed |
| 03 | Integrate — AI ke aplikasi bisnis | neural / circuit / connection |
| 04 | Partner — relasi jangka panjang | collaboration / team / handshake |
| 05 | Innovate — thrive di era digital | abstract innovation / growth / spark |

Catatan legal: **hanya** sumber berlisensi bebas-komersial (Unsplash/Pexels). Hotlink resmi lewat CDN mereka = diperbolehkan. Jangan scrape/hotlink situs lain. `image` = URL CDN langsung, `imageAlt` deskriptif. Tambah `onError` → fallback gradient bila gambar gagal load.

## 5. File yang disentuh
- `src/components/sections/Vision.tsx` — edit (cabut NetworkField, pasang showcase).
- `src/components/sections/MissionShowcase.tsx` — baru.
- (opsional) `src/hooks/useMediaQuery.ts` — cek apakah sudah ada; kalau belum, buat kecil.
- Aset gambar → `public/missions/` (bila disimpan lokal).

## 6. Test (wajib, ikut runner eksisting — lihat *.test.tsx yang ada)
- Render 5 mission (tag + verb + detail).
- Accordion: buka satu menutup lainnya (only-one-open).
- Keyboard: Enter/Space toggle item.
- Reduced-motion: konten tetap tampil (no crash, no hidden content).
- Default active card ter-render expanded di desktop.

## 7. Yang TIDAK dilakukan
- Tidak menghapus `NetworkField` / `ScrollHighlight` (dipakai section lain).
- Tidak menambah carousel library.
- Tidak mengarang metrik/proof-point (belum ada data asli).
- Tidak deploy / push (tunggu perintah eksplisit).

## Terbuka untuk dikonfirmasi
1. Gambar disimpan lokal di `public/` atau hotlink stock? (rekomendasi: lokal)
2. Nav panah desktop perlu di fase 1, atau cukup klik card dulu?
3. Test runner yang dipakai repo (Vitest/Jest) — ikuti yang ada.

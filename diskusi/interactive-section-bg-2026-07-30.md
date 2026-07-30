# Diskusi — Interactive Section Background (Pemanis BG per-section)

**Tanggal:** 2026-07-30
**Branch:** `feature/interactive-section-bg`
**Status:** Prototype disepakati (Network + glow cursor). Belum di-commit, belum di-roll-out ke semua section.

---

## Tujuan

Tambah "pemanis" pada **background tiap section konten** berupa background bergerak interaktif — biar tidak boring saat dikunjungi. **Section pertama (Hero 3D `#office`) TIDAK disentuh** sama sekali.

Acuan yang diberikan user (dieksplor via Ego Lite browser):
- https://brm.io/matter-js/ — physics engine 2D, bola/kotak jatuh + bisa drag/lempar. Terang, playful.
- https://wellcaffeinated.net/PhysicsJS/ — lingkaran gelap low-contrast melayang, **kabur dari cursor** (repulsion). Dark, calm — dekat dengan DNA project.

---

## Keputusan arah (hasil diskusi bertahap)

| Aspek | Keputusan | Alasan |
|---|---|---|
| Gaya fisika | **BUKAN physics penuh** (no collision solver) | Physics penuh = beban CPU per-frame, berat di HP low-end. Project sudah punya Hero WebGL berat + `ManifestoField`. |
| Cakupan | 1 sistem partikel yang **bertransformasi karakter per-section** | Hemat (bukan 10 canvas), tapi user tetap merasa tiap section beda. |
| Intensitas | "Terlihat tapi sopan" + **reaktif** | Anti-boring lewat *interaksi*, bukan keramaian. Teks selalu menang. |
| Teknologi render | **Canvas 2D**, bukan WebGL | WebGL context terbatas (~16/halaman), Hero sudah pakai. Repulsion ~100 titik di 2D jauh lebih ringan. |
| Library animasi | **Nol dependency baru** | Skill `react-spring-physics` dipakai *ilmunya* (tuning spring/velocity/precision), bukan library-nya — react-spring untuk animasi prop DOM, bukan gambar canvas per-frame. |

### Prinsip interaksi (dikoreksi user di tengah)
User menegaskan masalah bukan "titik kekecilan" tapi **tidak ada affordance** — user tidak ngeh titik bisa diinteraksi. Solusi: background harus **hidup sendiri** (drift/gerak tanpa mouse), interaksi mouse jadi lapisan tambahan. Pilihan final: **"seimbang — hidup sendiri + reaksi kerasa"**.

---

## Proses: 3 prototype dibandingkan live (di section Vision)

Dibuatkan switcher chip (kanan atas Vision) untuk banding langsung:

1. **Network** — titik + garis nyambung (constellation), drift sendiri, node kabur + garis nyala accent dekat cursor.
2. **Aurora** — warna mengalir tanpa titik, mouse menggeser aliran. Paling calm/premium.
3. **Spotlight** — grid gelap, cahaya ikut cursor mengungkap grid. Reaksi paling obvious.

### Pilihan user: **Network** (setelah menolak Aurora, membandingkan Network vs Spotlight)

Rekomendasi yang diberikan → **Network**, alasan:
- Spotlight = klise 2023–2024 (template Vercel/Aceternity), baca "template default" di 2026.
- Network **bermakna**: manifesto berbunyi *"Software connects information. Intelligence connects decisions."* → constellation = visualisasi harfiah "connect".
- Network **hidup sendiri**; Spotlight bergantung mouse (mati di HP tanpa cursor).
- Network lebih "techy/AI" → cocok brand.

### Keputusan final: **Network + glow cursor** (gabungan)
Network sebagai basis + suntikan glow ikut-cursor dari Spotlight. Dapat: makna (Network) + wow reaktif obvious (Spotlight) dalam satu efek.

### Tuning glow (koreksi user: "spotlight-nya terlalu lebar")
Glow dikecilkan & difokuskan:
- `CURSOR_GLOW`: 0.22 → **0.13** (radius, ~40% lebih kecil)
- `POINTER_GLOW`: 0.16 → **0.11**
- `NODE_GLOW`: 0.14 → **0.10**
- Alpha glow inti: 0.10 → **0.08**

---

## File yang dibuat/diubah

### Baru
| File | Isi |
|---|---|
| `src/lib/field/fieldMath.ts` | Math murni framework-free: `mulberry32` (seeded RNG), `generateHomePositions` (variant scatter/grid/flow/gather), `repelForce`, `stepAxis` (damped spring), `distance2`, `linkOpacity`, `driftOffset` (ambient self-motion). |
| `src/lib/field/fieldMath.test.ts` | 20 unit test untuk semua fungsi math. |
| `src/components/motion/backgrounds/NetworkField.tsx` | **Prototype terpilih.** Constellation + drift + repulsion + glow cursor (spring-lerped) + node/garis nyala accent dekat cursor. |
| `src/components/motion/backgrounds/AuroraField.tsx` | Prototype (kandidat, belum dipakai). |
| `src/components/motion/backgrounds/SpotlightField.tsx` | Prototype (kandidat, belum dipakai). |
| `src/components/motion/InteractiveField.tsx` | Versi awal (titik repulsion polos) — digantikan NetworkField, kandidat dihapus. |

### Diubah
| File | Perubahan |
|---|---|
| `src/components/sections/Vision.tsx` | Dipasang switcher 3 prototype + wrapper `relative z-10` untuk konten. **Sementara** (dev-only), harus dibersihkan saat roll-out. |

---

## Comfort & performa (semua aktif)

- `prefers-reduced-motion` → render gradient statis, nol animasi.
- Pause total saat off-screen (`IntersectionObserver`).
- DPR clamp (max 2).
- Teks selalu di `z-10`, background `-z-0` — teks 100% terbaca di semua kondisi.
- Canvas 2D, tanpa WebGL context tambahan.

## Verifikasi

- **Test:** 26/26 lolos (20 fieldMath baru + 6 lama).
- **Typecheck:** 0 error. **Lint:** 0 error di file baru.
- **Visual:** diverifikasi via Ego Lite (CDP screenshot — helper `captureScreenshot` ego bug di halaman ber-canvas, pakai `cdp('Page.captureScreenshot')` sebagai gantinya).
- **Hero 3D & section lain:** tidak disentuh.

---

## Langkah selanjutnya (belum dikerjakan)

1. Buang switcher + wrapper sementara di Vision; hapus prototype `AuroraField`, `SpotlightField`, `InteractiveField` yang tidak dipakai.
2. Pasang **karakter per-section** pakai basis Network (rencana: Services=grid, Process=flow, Vision=scatter, dst) — 1 sistem, param beda.
3. Commit ke branch `feature/interactive-section-bg`.
4. Ekstrak jadi **skill `interactive-section-bg`** khusus project (kodifikasi palet, aturan comfort, pola math+test terpisah, checklist perf) — agar diwariskan lintas sesi.

## Catatan lingkungan

- context-mode MCP rusak sesi ini (Node version mismatch `NODE_MODULE_VERSION 131 vs 127`) → dipakai tool native.
- Dev server: `bun run dev` di port 3000.

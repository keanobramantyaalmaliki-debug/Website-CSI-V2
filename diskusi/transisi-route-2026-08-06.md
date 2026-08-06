# Transisi antar-halaman: kenapa tidak dipasang (6 Agu 2026)

> Kesimpulan: **slot transisi route di situs ini sudah terisi oleh kamera.**
> Ditulis supaya usulan ini tidak lahir ulang dari nol — ia terdengar masuk akal
> sampai tiga menit terakhir pemeriksaannya.

Usulan aslinya datang dari analisa `iventions.com`: overlay `clip-path` polygon
menutup seluruh viewport saat route berganti, `z-index: 99999999`. Fase 5 dari
rencana port. Dibatalkan setelah dibaca terhadap kode yang ada.

## 1. Ganti ruangan di sini bukan ganti dokumen

Di iventions, wipe itu menutupi **kekosongan** — antar-halaman mereka tidak ada
yang berlanjut. Di sini justru sebaliknya: perpindahan ruangan adalah
penerbangan kamera ~1400 ms di dalam `<Canvas>` yang **tidak pernah unmount**
(lihat `routes/SiteLayout.tsx` — hanya `<Outlet>` yang di-swap).

Menutupinya dengan overlay berarti menyembunyikan satu-satunya hal yang membuat
navigasi situs ini bukan navigasi biasa. Yang di iventions jadi solusi, di sini
jadi kerusakan.

## 2. `AnimatePresence` bercabang dua, dua-duanya merusak "Talk to us"

Ini yang membunuh versi "wipe di `<main>` saja", yang tadinya terlihat aman:

- **Mode bawaan** — ruangan lama masih mount saat yang baru masuk. Itu persis
  pola yang **sudah dicabut 3 Agu** (lihat blok ⚠️ di `routes/RoomContent.tsx`):
  `<Contact/>` hidup dua kali, `id="contact"` ganda, `getElementById`
  mengembalikan yang pertama — bisa milik ruangan yang sedang keluar.
- **`mode="wait"`** — konten baru mount **setelah** exit selesai. `RoomRouteSync`
  Arah 3 mencari elemennya dalam satu `requestAnimationFrame`; targetnya belum
  ada. Rusak dari arah sebaliknya.

Keduanya menghidupkan lagi bug yang baru diperbaiki di `4c8314d`.

## 3. Yang tidak ber-`AnimatePresence` pun tidak terlihat

Versi paling aman — tanpa exit sama sekali, `key={pathname}` di dalam `<main>`,
hanya konten masuk yang beranimasi — lolos semua jebakan di atas, lalu gagal di
hal yang lebih sederhana: **tidak ada yang melihatnya.**

Saat route berganti, `RoomRouteSync` memaksa `scrollTo(0, { immediate: true })`.
Di posisi 0, hitung dari kelas yang ada:

| | track Hero | HeroHandoff | atas `<main>` | viewport |
|---|---|---|---|---|
| desktop | `md:h-[180dvh]` | `-mt-32` + `h-20` → −48px | ≈180dvh − 48px | 100dvh |
| mobile | `h-[126dvh]` | idem | ≈126dvh − 48px | 100dvh |

`<main>` mulai 72dvh (desktop) / 26dvh (HP) **di bawah lipatan**. Animasi 0,5
detik itu selesai jauh sebelum ada yang menggulir ke sana. Dan `Hero.tsx`
sendiri tidak merender teks apa pun yang bergantung ruangan — isinya canvas,
HUD, dan petunjuk scroll.

Satu-satunya kasus di mana konten itu memang di layar saat pathname berubah
adalah "Talk to us" dari ruangan lain (`/#contact`) — dan di situ
`smooth.scrollTo(el)` menghitung posisi target sementara pembungkusnya sedang
beranimasi dari `y: 12` ke `0`, jadi tujuannya bergeser di tengah perjalanan.

## Aturan yang tersisa dari ini

**Apa pun yang terlihat saat ganti ruangan harus berada di atas canvas** —
karena hanya canvas dan Navbar yang ada di layar pada saat itu. Jadi setiap
usulan "transisi halaman" di situs ini otomatis kembali ke opsi §1, yang
ditolak. Bukan soal implementasinya kurang pintar; geometrinya yang menentukan.

Kalau suatu saat Hero tidak lagi setinggi layar, atau `scrollTo(0)` saat ganti
ruangan dilepas, premis ini gugur dan pertanyaannya boleh dibuka lagi.

**Yang tetap tidak boleh:** `z-index` di luar skala INVARIANTS §2 (0/10/30/50/60).
`z-99999999` milik iventions bukan pilihan, apa pun bentuk transisinya nanti.

---

Yang **diambil** dari analisa iventions ada di tempat lain dan sudah terpasang:
Lenis satu-ticker (Fase 1), reveal per baris di `LineMask` (Fase 2), `EASE`
terpusat di `lib/motion/tokens.ts` (Fase 3), dan `PinnedSection` (Fase 4).

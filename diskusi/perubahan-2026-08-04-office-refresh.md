# Perubahan — Office Phase 2: Scroll-Driven Photo → Mobile Cards (2026-08-04)

> Sesi implementasi rencana "Phase 2 — Office refresh" (lanjutan inisiatif Lounge → Office →
> Meeting → Function), lalu koreksi dari feedback visual user.
> Branch: `feature/office-refresh` (dari worktree fan-slider CaseGrid, commit `80187eb`).
> Status: **sudah di-commit dan di-push** ke `feature/office-refresh`.

---

## 1. Konteks

Office adalah section terpadat di seluruh situs: 9 service dengan desc 12-19 kata, overview
paragraph 50 kata, dan foto besar yang sebelumnya **hanya berubah lewat hover/tap** —
berarti mobile tidak pernah dapat pengalaman visual otomatis (harus tap 9 kali satu-satu).

Rencana awal (plan yang di-approve user sebelum sesi ini dimulai) mengusulkan pendekatan
scroll-progress driven: satu foto besar mengikuti posisi scroll di list service, jadi mobile
otomatis dapat "titik diam" tanpa perlu tap.

---

## 2. Jalannya diskusi (pergeseran arah — penting untuk konteks)

### Iterasi 1 — implementasi plan awal
Dibangun sesuai rencana yang sudah disetujui: `PinnedServiceStack.tsx` (foto besar sticky,
scroll-driven via `useScroll`+`useMotionValueEvent`, mount di semua breakpoint), hover/focus
sebagai override sementara di desktop, foto inline mobile-only lama dihapus (dianggap
redundan), copy 9 desc dipangkas ≤12 kata + overview paragraph ke 24 kata (draft disetujui
via pertanyaan approval sebelum coding).

### Iterasi 2 — user kirim 9 screenshot, laporan bug visual
User: *"aneh ga sih kalau imagenya dibuat begitu, ditampilan mobile aneh jadinya"* —
disertai 9 screenshot mobile viewport (375×732) yang menunjukkan foto besar **mengambang
sendirian di bawah list**, tidak terhubung ke row manapun yang sedang dilihat.

**Root cause:** di mobile, list dan panel foto stack dalam **satu kolom** (grid desktop
`lg:grid-cols-[1fr_16rem]` tidak aktif). Sticky panel yang bekerja baik di desktop (list dan
panel bersebelahan, secara spasial jelas "foto ini mewakili row yang sedang dilihat") jadi
tidak masuk akal di mobile — foto berdiri sendiri tanpa hubungan visual ke row manapun.

Ditawarkan 2 opsi lewat AskUserQuestion (card per-row vs. perbaiki sticky-sync), user
menjawab **"kalau dimix gimana menurutmu?"** — lalu sebelum sempat riset referensi selesai,
user langsung kirim instruksi konkret di pesan berikutnya:

> *"jadikan card + ada asset image jadi biar ga boring + carikan card animasi transisi
> referensinya bisa kamu carikan diwebsite lain"*

### Iterasi 3 — fix: card mobile dengan tap-reveal
Riset singkat pola "thumbnail morphs into full photo" (referensi: Framer Academy's
"Scaling a clipped image on hover" tutorial, pola shared-element transition ala
gallery→lightbox) — lalu dicek dulu pola yang **sudah ada di codebase ini sendiri**
(`CaseGrid.tsx`'s `MobileStack`/`FanCard`) supaya konsisten dengan bahasa motion proyek,
bukan mengimpor gaya asing.

**Solusi:** desktop kembalikan `PinnedServiceStack` ke `hidden lg:block` (sudah benar di
sana, tidak disentuh). Mobile dapat kartu sendiri: setiap row jadi card berbingkai dengan
thumbnail 64×64 sebagai jangkar visual (bukan lagi cuma teks polos), dan tap pada row
**memorph-kan thumbnail jadi foto penuh** lewat `layoutId` (Motion's shared-layout/FLIP
animation) — reduced-motion dapat instant swap (durasi 0), bukan morph.

### Iterasi 4 — dummy content untuk testimonial & recognition
User kirim 1 screenshot desktop menunjukkan testimonial dan recognition strip masih berupa
skeleton placeholder kosong (blur bar abu-abu + badge dashed-border tanpa isi):
*"coba buat pada 2 komponen itu gak apa dummynya deh biar ada isinya kontennya"*.

**Perubahan:** testimonial diisi kutipan dummy dari "Placeholder Client" (avatar inisial
"PC"), recognition diisi 4 badge dengan label "Placeholder Award A-D" — keduanya jelas
ditandai sebagai placeholder (bukan diam-diam disamarkan sebagai konten asli), `TODO(content)`
comment dipertahankan supaya jelas ini perlu diganti data verified nanti.

### Iterasi 5 — commit & push
User minta commit lalu push ke branch saat ini. Pre-Push Guarantee Report ditampilkan
(CLAUDE.md §18), lalu `git push origin feature/office-refresh`.

---

## 3. Prinsip yang dipegang

1. **Jangan asal ganti tanpa root cause** — bug visual mobile didiagnosis dulu (grid
   single-column → sticky panel kehilangan makna spasialnya) sebelum memilih solusi.
2. **Konsisten dengan bahasa motion proyek sendiri** — pola card-reveal diambil dari
   `CaseGrid.tsx` yang sudah ada di repo ini, bukan meniru situs lain secara mentah.
3. **Desktop yang sudah benar tidak disentuh** — perbaikan mobile tidak mengorbankan
   perilaku desktop yang sudah sesuai rencana awal (hover-preview, sticky panel).
4. **Placeholder harus jujur** — dummy testimonial/awards diberi label eksplisit
   ("Placeholder Client", "Placeholder Award A-D") + `TODO(content)`, tidak menyamar
   sebagai data asli.
5. **Reduced-motion tetap dihormati** — semua transisi baru (crossfade, layoutId morph)
   punya jalur instant-swap saat `prefers-reduced-motion`.
6. **Copy checkpoint sebelum coding** — draft 9 desc + overview paragraph ditunjukkan dan
   di-approve user lewat AskUserQuestion sebelum SERVICES array diubah.

---

## 4. Perubahan per file (commit `3c545ab`)

### Baru — `src/components/motion/PinnedServiceStack.tsx`
- Panel foto sticky, **desktop-only** (`hidden lg:block`, `sticky top-32 h-72`) —
  menggantikan `StickyScroll` lama (yang jadi tidak terpakai, dibiarkan ada sesuai
  keputusan sebelumnya untuk kemungkinan dipakai ulang).
- Crossfade antar panel via `activeIndex` (opacity/scale, `duration: reduced ? 0 : 0.35`).
- `sr-only` label judul service yang sedang tampil (progressive enhancement aksesibilitas).

### `src/components/sections/Office.tsx` (309 → 348 baris)
- **Scroll wiring:** `useScroll` (target: list ref, `offset: ["start 0.75", "end 0.25"]`) +
  `useMotionValueEvent` menghitung `activeService` dari `scrollYProgress`; `manualOverride`
  (hover/focus di desktop) override sementara scroll-driven index.
- **Copy:** 9 `SERVICES[].desc` dipangkas ke ≤12 kata; overview paragraph 50→24 kata
  (draft di-approve user sebelum implementasi).
- **Mobile row jadi card:** border + rounded-2xl per row, thumbnail 64×64 (`layoutId`
  shared dengan foto penuh di dalam Disclosure) sebagai jangkar visual pengganti nomor urut
  besar (yang tetap ada, tapi jadi desktop-only).
- **Tap-reveal:** thumbnail collapsed → foto full-width expanded via shared `layoutId`
  morph animation saat Disclosure dibuka; kembali morph saat ditutup.
- **Testimonial:** avatar placeholder solid + kutipan dummy ("Cogniti rebuilt the systems…")
  atas nama "Placeholder Client · Placeholder Role, Placeholder Agency".
- **Recognition:** 4 badge Award dengan label "Placeholder Award A/B/C/D", teks "coming
  soon" dipertahankan di bawahnya.

### `src/components/sections/Office.test.tsx`
Assertion yang kontraknya berubah (ditulis ulang, bukan dihapus diam-diam):
- Image count: 9 → **18** (9 desktop sticky-panel + 9 mobile thumbnail, karena jsdom tidak
  menerapkan CSS breakpoint yang menyembunyikan salah satunya).
- Expand row: dulu "+1 image", sekarang **jumlah tetap** (thumbnail digantikan foto penuh
  via layoutId morph, bukan ditambah) + assert desc lengkap muncul di `role="region"`.
- Testimonial: dari assert teks "coming soon" → assert kutipan dummy + label
  "Placeholder Client" muncul.
- Recognition: tambah assert 4 elemen "Placeholder Award" muncul.
- Assertion baru: smoke test `activeService` default index 0 tidak crash tanpa scroll
  fisik (jsdom tidak punya scroll geometry).

---

## 5. Verifikasi

| Cek | Hasil |
|---|---|
| `bun run test` | ✅ 99/99 lulus |
| `bun run lint` | ✅ tidak ada error baru di file yang diubah (8 error/warning pre-existing di file lain, tidak disentuh) |
| `bun run build` (tsc + vite) | ✅ hijau |
| `wc -l Office.tsx` | ✅ 348 baris (limit hard 500, limit section disarankan lebih longgar) |
| `git diff --stat` vs scope plan | ✅ hanya 3 file yang direncanakan, tidak menyentuh `canvas/**` |
| Manual browser check | Dilakukan user sendiri (port 3000 dimatikan atas permintaan user untuk cek manual) |

---

## 6. Catatan jujur / hutang

- `TODO(content)`: testimonial dummy quote perlu diganti kutipan klien asli.
- `TODO(content)`: 4 placeholder award perlu diganti data recognition asli (jika ada).
- `TODO(content)`: dummy stats panel (pre-existing dari sesi sebelumnya, tidak disentuh sesi ini).
- `src/components/ui/sticky-scroll-reveal.tsx` sudah 0-import (tidak dipakai lagi) —
  sengaja dibiarkan ada, bukan dihapus, sesuai keputusan awal plan.
- Belum ada PR dibuka — baru push branch.

---

## 7. File yang disentuh (sesi ini)

**Baru:**
- `src/components/motion/PinnedServiceStack.tsx`
- `diskusi/perubahan-2026-08-04-office-refresh.md` (dokumen ini)

**Dimodifikasi:**
- `src/components/sections/Office.tsx`
- `src/components/sections/Office.test.tsx`

---

## 8. Poin diskusi berikutnya (open questions)

1. Kutipan testimonial dummy — nada/isinya sudah pas sebagai placeholder, atau mau
   diarahkan ke nada tertentu sambil menunggu kutipan asli?
2. Apakah `sticky-scroll-reveal.tsx` yang sudah tidak dipakai sebaiknya dihapus saja,
   atau tetap disimpan untuk referensi/pemakaian ulang di masa depan?
3. Buka PR sekarang, atau tunggu Phase lain (Meeting/Function) selesai untuk digabung?

# Perubahan — The Crew: Desktop Scroll Sync + Mobile Autoplay Carousel (2026-08-05)

> Sesi lanjutan pada section "The Crew" (tim/profil karyawan): dua pekerjaan terpisah
> yang saling menyambung dalam satu sesi.
> Branch: `feature/funcion-refresh`.
> Status: **implementasi + test selesai, verifikasi manual browser belum tuntas** — belum di-push, belum di-commit.

---

## 1. Konteks & jalannya diskusi

### Task A — Desktop: index list scrollable + sinkron hover/scroll
Sebelum sesi ini dimulai (carry-over dari sesi sebelumnya), daftar nama di panel kiri
desktop `TheCrew.tsx` dibuat scrollable di dalam box tinggi tetap, dengan deteksi
"baris aktif" berbasis posisi scroll (bukan `IntersectionObserver`, karena jsdom stub-nya
menandai semua baris aktif sekaligus) yang disinkronkan dengan hover/focus. Sudah selesai,
115 test lulus, **belum di-commit** saat Task B dimulai.

### Task B — Mobile: dari grid statis ke carousel autoplay + swipe
User mengirim screenshot tampilan mobile "The Crew" (grid 2 kolom statis: Fahmi Maliki,
Lena Almaliki, Jun, Imam Maliki, dst dengan avatar placeholder) dan bertanya:

> "kalau ditampilan mobile bisa engga dibuat kayak ada autoplay card gitu contoh profile
> fahmi nanti ada arah kanan kiri untuk lihat atau ganti profile yang lain paham ga maksutku"

Diklarifikasi lewat 3 pertanyaan (`AskUserQuestion`), semua terjawab sebelum implementasi:

| Pertanyaan | Jawaban user |
|---|---|
| Card jalan otomatis (autoplay) atau cuma bisa digeser manual? | **Autoplay + swipe** |
| Struktur carousel: dipisah per kategori (Management/Developer/R&D) atau satu carousel semua 13 orang? | **Satu carousel, semua orang** — kategori jadi label di dalam kartu |
| Navigasi: swipe + dot indicator saja, atau perlu tombol panah kiri/kanan yang terlihat? | **Swipe + dot indicator saja** (konsisten dengan pola `CaseGridMobileStack.tsx` yang sudah ada, tanpa preseden tombol panah di codebase ini) |

Plan ditulis lengkap, di-approve user via `ExitPlanMode`, lalu dieksekusi.

---

## 2. Pendekatan teknis

Tidak ada dependency baru — pola diambil dari komponen yang sudah ada di codebase:

- **Autoplay timer**: pola dari `CaseGrid.tsx` (fan-slider desktop) — `setInterval` yang
  di-*re-arm* setiap kali `active` berubah (`AUTO_ADVANCE_MS = 5000`), supaya tidak kena
  stale closure, dan otomatis "reset" saat user swipe manual karena swipe juga mengubah `active`.
- **Swipe mechanics**: pola dari `CaseGridMobileStack.tsx` — native CSS scroll-snap
  (`snap-x snap-mandatory`), tanpa library carousel eksternal (project memang tidak
  punya embla/swiper/keen-slider terpasang).
- **Reduced motion**: konvensi yang sudah dipakai di seluruh codebase —
  `const reduced = !!useReducedMotion()`, autoplay di-skip total kalau `true`.
- **Dot indicator**: identik gaya `CaseGrid.tsx`/`CaseGridMobileStack.tsx`
  (`h-1 w-6 rounded-full`, `bg-accent` aktif / `bg-white/20` idle).

---

## 3. Perubahan file

**Baru:**
- `src/components/sections/TheCrewMobileCarousel.tsx` — carousel autoplay + swipe,
  satu kartu per orang (13 orang, tanpa grouping kategori), dot indicator di bawah,
  reset ke orang pertama saat filter kategori berubah.
- `src/components/sections/TheCrewMobileCarousel.test.tsx` — 7 test (dot aktif saat
  mount, satu dot per orang, klik dot ganti profil, scroll update profil aktif,
  auto-advance setelah interval, auto-advance mati saat reduced-motion, reset saat
  daftar `people` berubah/filter ganti).

**Dihapus:**
- `src/components/sections/TheCrewMobileGrid.tsx` — grid statis lama, sepenuhnya
  digantikan carousel, tidak dipakai di tempat lain (dicek via grep sebelum dihapus).

**Dimodifikasi:**
- `src/components/sections/TheCrew.tsx` — import & call site diganti dari
  `TheCrewMobileGrid` ke `TheCrewMobileCarousel` (prop shape sama, `{ people }`).
- `src/components/sections/TheCrew.test.tsx` — test `crew-mobile-grid` diganti jadi
  `crew-mobile-carousel`.

---

## 4. Detail bug yang ditemukan & fix selama implementasi

1. **`Element.prototype.scrollTo` tidak ada di jsdom 30.0.1 (versi terpasang project ini)**
   — beda dari asumsi awal riset. `TypeError: listRef.current?.scrollTo is not a function`.
   **Fix**: optional chaining (`el.scrollTo?.(...)`) di kedua tempat pemanggilan — sekalian
   jadi lebih defensif untuk environment lain yang juga tidak punya API ini.
2. **Asumsi salah: carousel dikira hanya render kartu aktif** — nyatanya semua 13 kartu
   selalu ada di DOM sekaligus (sama seperti `CaseGridMobileStack.tsx`), yang membedakan
   "aktif" cuma posisi scroll-snap. Test yang tadinya cek `not.toHaveTextContent` diganti
   jadi cek class `bg-accent` pada dot aktif.
3. **Warning "not wrapped in act(...)"** saat pakai `vi.advanceTimersByTime()` dengan fake
   timer — dibungkus `act(() => {...})`.
4. **ESLint flag "Unused eslint-disable directive"** pada komentar
   `eslint-disable-next-line react-hooks/exhaustive-deps` yang saya tambahkan proaktif di
   atas dependency array efek autoplay — ternyata deps array-nya memang sudah benar
   (`active` sengaja ada di deps), jadi komentarnya dihapus.

---

## 5. Verifikasi

| Cek | Hasil |
|---|---|
| `bun run test` | ✅ 122 test lulus, 20 file |
| `bun run build` (tsc + vite) | ✅ tidak ada type error (hanya warning ukuran chunk pre-existing) |
| `bun run lint` | ✅ bersih di semua file yang disentuh sesi ini |
| Manual browser (mobile viewport, swipe/dot/autoplay/reduced-motion/filter reset) | ⏸️ **belum dituntaskan** — dev server sempat dijalankan & di-screenshot via `ego-browser`, tapi user memilih test manual sendiri ("aku test manual aja") sebelum verifikasi selesai |

**Catatan jujur:** 2 error `@typescript-eslint/no-explicit-any` muncul saat `bun run lint`
di `src/components/motion/DeploymentsMatterField.tsx` (baris 93, 103) — dicek via
`git status` bahwa file ini **tidak disentuh sesi ini**, jadi pre-existing, di luar scope.

---

## 6. Hutang / catatan terbuka

- Verifikasi manual browser (swipe, dot sync, autoplay pause-on-interaction, reduced-motion,
  filter reset) diserahkan ke user untuk dicoba sendiri — belum ada konfirmasi hasilnya.
- Task A (desktop scroll box) dan Task B (mobile carousel) **belum di-commit sama sekali**.
  Sesuai aturan global: tidak commit/push tanpa instruksi eksplisit.
- Belum ada keputusan soal urutan commit (satu commit gabungan Task A+B, atau dipisah
  per fitur — perlu tanya user saat commit).

---

## 7. Poin diskusi berikutnya (open questions)

1. Hasil test manual mobile carousel di device/browser asli — ada yang perlu diperbaiki?
2. Task A (desktop scroll sync) dan Task B (mobile carousel) di-commit terpisah atau digabung?
3. Kapan siap untuk push / lanjut ke review?

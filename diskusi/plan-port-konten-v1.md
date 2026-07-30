# Plan — Port Konten V1 ke V2

**Tujuan:** lengkapi 5 blok konten V1 yang belum ada di V2. Gaya **plain** (ikut pola section existing: Tailwind statis, tanpa animasi). Animasi/efek V2 dibangun terpisah nanti — konsisten dengan komentar di `page.tsx`.

**Scope:** semua 5 blok (Manifesto, Living Architecture, Process, Careers, Industries).

---

## Konvensi yang diikuti (dari section existing)

- 1 file per section di `src/components/sections/`, default export, komentar header `/** SECTION — real content from V1 */`.
- Data array di module scope (spt `DEPLOYMENTS`, `SERVICES`, `MISSIONS`).
- Pola markup: `<section id=... className="px-6 py-24 sm:px-10 sm:py-32">` → eyebrow `text-xs tracking-widest uppercase` → `<h2>` → konten.
- Palet: `zinc-*` netral + aksen `orange-500`. Section selang-seling pakai `border-y border-zinc-900 bg-zinc-950/50` (spt Services) untuk ritme visual.
- Server component (tanpa `"use client"`) — semua statis.

---

## Urutan section final (`page.tsx`)

```
Hero → Manifesto → Deployments → Services → LivingArchitecture
     → Process → Industries → Careers → Vision → Contact
```

Alasan: Manifesto = jembatan naratif setelah Hero (spt V1). Living Architecture + Process nyusul Services (dari "apa" ke "gimana"). Industries + Careers sebelum Vision (proof + ajakan gabung). Vision & Contact tetap penutup.

---

## File baru (5)

| # | File | Isi konten V1 | Latar |
|---|------|---------------|-------|
| 1 | `sections/Manifesto.tsx` | 4 baris manifesto (statis, ditumpuk vertikal — cross-fade nanti) | polos |
| 2 | `sections/LivingArchitecture.tsx` | Heading + 7 node (Citizen→Action) sbagai list bernomor + microcopy. Penutup "Signal Complete → From awareness to action." | `bg-zinc-950/50` |
| 3 | `sections/Process.tsx` | 6 langkah (Discovery→Deployment & Continuous Support) | polos |
| 4 | `sections/Industries.tsx` | 13 industri sbg pill/tag grid | `bg-zinc-950/50` |
| 5 | `sections/Careers.tsx` | 4 role (title, type, mode, tag) + alur hiring 5 tahap | polos |

### Konten verbatim yang dipakai

**Manifesto (4):**
1. "Software connects information. Intelligence connects decisions."
2. "Organizations are drowning in data. Yet struggling to act."
3. "The future belongs not to those who collect, but to those who act."
4. "Intelligence should exist across every interaction. Every workflow. Every decision."

**Living Architecture** — heading "A Living Architecture For Decisions." + sub "We connect signals, context, knowledge, and workflows into adaptive systems that help organizations move from awareness to action." + 7 node:
Citizen · Operations · Knowledge · Infrastructure · Intelligence · Decision · Action (dengan microcopy masing-masing dari V1). Penutup: "Signal Complete → From awareness to action."

**Process (6):** Discovery · Strategy & Planning · Design · Development · Testing & Quality Assurance · Deployment & Continuous Support.

**Industries (13):** Government & Public Sector, Smart Cities, Digital Villages, Healthcare, Education, Finance, Hospitality, Retail & E-Commerce, Manufacturing, Logistics, Property & Real Estate, Professional Services, Startups & Enterprises.

**Careers (4 role):** Innovation & Growth Manager (Full-time·Remote·Growth) · Technical Lead (Full-time·Hybrid·Engineering) · Product Builder (Full-time·Remote·Product) · Full Stack Engineer (Full-time·Hybrid·Engineering). Heading "Build What Comes Next." Alur hiring 5 tahap: Application → Conversation → Practical Challenge → Final Interview → Welcome Aboard.

---

## File diubah (2)

### `src/app/page.tsx`
- Import 5 section baru, susun sesuai urutan final di atas.

### `src/components/Navbar.tsx`
- Tambah `PAGE_LINKS` (jadi scrollspy otomatis ikut lewat `SECTION_IDS`). Usul link: **Deployments · Services · Industries · Careers · Vision** (5 link, hindari navbar kepadatan; Manifesto/Process/Living Architecture skip dari nav tapi tetap ada di halaman).
- Tidak ubah logika scrollspy/room — cuma nambah entri array.

---

## Perbaikan konten section existing (perlu keputusan kecil)

1. **`Contact.tsx:6-9`** — sosial masih `baliinteraktifperkasa` (2 TODO). V1 verbatim cuma sediakan `hello@cogniti.id`. **Opsi:** (a) hapus dua link sosial dulu sampai handle cogniti tersedia, atau (b) biarkan + biarkan TODO. → tanya saat eksekusi.
2. **Hero** — V1 punya paragraf value-prop ("We build intelligent digital solutions…"). V2 Hero = 3D tour tanpa teks itu. Opsi taruh paragraf ini di **Manifesto** atau intro Deployments. → default: skip (jaga Hero bersih), catat sbg opsional.

*Tidak menyentuh:* branding, positioning line, alamat, email — sudah benar di V2.

---

## Verifikasi (sesuai aturan project)

- `pnpm lint` + type check (`next build` / `tsc`) harus lulus sebelum lapor selesai.
- Cek visual manual via `pnpm dev` (browser hanya jika user minta eksplisit).
- Semua section statis → tak ada test unit yang bisa di-assert (server component render). Kalau mau, tambah smoke test render section baru — tanya dulu (belum ada test runner terpasang di project).

---

## Langkah eksekusi (urutan)

1. Branch `feature/port-konten-v1`.
2. Buat 5 file section (Manifesto, LivingArchitecture, Process, Industries, Careers) — konten verbatim, markup match existing.
3. Update `page.tsx` (import + urutan).
4. Update `Navbar.tsx` (`PAGE_LINKS`).
5. Konfirmasi keputusan kecil (sosial Contact, paragraf Hero).
6. `pnpm lint` + build. Perbaiki jika gagal.
7. Lapor: ringkasan + hasil build + nama branch. Tunggu konfirmasi user sebelum merge.
```
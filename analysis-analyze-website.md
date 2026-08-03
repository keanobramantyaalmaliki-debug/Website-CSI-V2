# Analisa basement.studio — Navbar & Home/Hero

**Metode:** Skill `analyze-website` (Fast-Path). Cek cache (kosong) → fetch HTML shell → ekstraksi terarah hanya region navbar+hero. Situs Next.js (JS-heavy): HTML statis = shell; visual dinamis (WebGL) ditandai `unknown`. MCP context-mode tidak tersedia (Node version mismatch), pakai parsing HTML terarah. Scope: navbar + hero saja (tahap pertama).

**Meta:**
- Title: `basement.studio | We make cool shit that performs.`
- Description: "basement.studio is a digital studio crafting brands, websites, 3D experiences, and products..."

---

## 1. NAVBAR

Fixed top, full-width, `bg-brand-k` (hitam, pola grid), auto-hide/show saat scroll; transparan di desktop.

| Urutan | Elemen | Tipe | Aksi |
|--------|--------|------|------|
| — | Logo (SVG wordmark) | Link | `/` (`aria-label="Go to homepage"`) |
| 1 | Home | Link | `/` |
| 2 | Services | Link | `/services` |
| 3 | Showcase | Link | `/showcase` (muncul juga `Showcase(25)`) |
| 4 | People | Link | `/people` |
| 5 | Blog | Link | `/blog` |
| 6 | Lab | Link | `/lab` |
| — | **Contact Us** | Button (CTA utama) | — |
| — | Music toggle | Button icon | `aria-label="Turn music on"` (default off) |
| — | Menu | Button icon | Buka overlay (`Close [ESC]`) |

---

## 2. HOME / HERO

- **H1 (headline):** "A digital studio & branding powerhouse making cool shit that performs"
- **Subheadline (P):** "We partner with the world's most ambitious startups, scale-ups and brands to unlock their true potential and growth through the convergence of creativity, design, and technology."
- **CTA hero:** tidak ada tombol statis di hero; konversi via navbar **Contact Us** + `mailto:hello@basement.studio`. Tidak ada eyebrow text sebelum H1.
- **Visual utama:** WebGL/3D di-inject client-side — `<canvas>`=0, `<video>`=0 di shell, ref `webgl` di bundle (`unknown`, butuh render browser). 7 `<img>` sekitar hero (aset kecil, bukan bg).
- **Batas bawah hero:** section H2 "Trusted by Visionaries" (logo klien). Section berikutnya (Featured Projects, Capabilities, About, Contact) di luar scope.

---

## 3. Importance

- **High:** nav links, CTA Contact Us, menu overlay (mobile).
- **Medium:** logo→home, hero headline/subheadline, hero WebGL.
- **Low:** music toggle.

## 4. Unknowns

- Bentuk pasti hero WebGL (perlu render browser).
- Perilaku CTA Contact Us (scroll/modal/mailto — ditemukan `mailto:hello@basement.studio`).
- Perilaku auto-hide navbar saat scroll (terindikasi dari class, belum diverifikasi runtime).

---

## Catatan Setup

- MCP context-mode error (better-sqlite3 NODE_MODULE_VERSION mismatch) — perlu `/ctx-upgrade` atau rebuild.
- Write file diblokir untuk subagent — konten ditulis oleh sesi utama ke path ini.

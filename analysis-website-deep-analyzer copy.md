# Analisa basement.studio — Navbar & Home/Hero

**Metode:** Skill `website-deep-analyzer` (ekstraksi raw-HTML, pertahankan nilai asli, tanpa translasi/rewrite). HTML `https://basement.studio/` (~237 KB, Next.js + Sanity CDN) diambil via sandbox `curl` dan diparse in-subprocess. Scope: navbar + hero saja (tahap pertama).

---

## NAVBAR

- **Logo/brand:** `basement.studio` (link ke `/`)
- **Nav items (urutan):**
  1. Home — `/`
  2. Services — `/services`
  3. Showcase (25) — `/showcase` — *counter live*
  4. People — `/people`
  5. Blog (28) — `/blog` — *counter live*
  6. Lab — `/lab`
- **CTA & kontrol:** `Contact Us` (primary CTA) · `Menu` (buka overlay) · `Close [ESC]`
- **Menu overlay extras:**
  - Email: `hello@basement.studio`
  - Socials: X `x.com/basementstudio` · Instagram `instagram.com/basementdotstudio` · GitHub `github.com/basementstudio` · LinkedIn `linkedin.com/company/basementstudio`

---

## HOME / HERO

- **Headline (H1):** "A digital studio & branding powerhouse making cool shit that performs"
- **Subheadline:** "We partner with the world's most ambitious startups, scale-ups and brands to unlock their true potential and growth through the convergence of creativity, design, and technology."
- **Secondary taglines:**
  - "We're here to create the extraordinary."
  - "No shortcuts, just bold, precision-engineered work that elevates the game & leaves a mark."
- **CTA buttons:** `Contact Us` · `Roll Me In`
- **Hero visual:** 0 `<canvas>` di markup statis — visual hero di-mount JS/WebGL setelah hydration (tidak ada di raw HTML; keterbatasan snapshot statis, bukan absennya visual). Logo area atas lazy-loaded dari Sanity CDN.

---

## Hirarki Konten (atas → bawah)

1. Navbar
2. Hero (H1 + subheadline + CTA)
3. Trusted by Visionaries (logo strip: Vercel, Next.js, Linear, Cursor, Scale, ElevenLabs, Harvey, Baseten, Together.ai, Replicate, Solana, MrBeast, Daylight, dll.)
4. Featured Projects (Vercel Ship, Daylight, KidSuper, Shop MrBeast)
5. Capabilities (Websites & Features, Visual Branding, IRL Experience Design, Marketing Execution)
6. About basement.studio
7. Contact

> Section 3–7 di luar scope tahap pertama — dicantumkan hanya untuk konteks hirarki.

---

## Meta

- **Title:** "basement.studio | We make cool shit that performs."
- **Description:** "basement.studio is a digital studio crafting brands, websites, 3D experiences, and products. We design and engineer cool shit that actually performs."

---

## Catatan Teknis

- Visual hero berbasis WebGL/JS — perlu render browser untuk analisa visual penuh.
- Blocker saat run: context-mode index tool rusak (Node/sqlite mismatch) & harness memblokir penulisan file di subagent — konten direlay inline lalu ditulis dari sesi utama.

---
---

# BAGIAN 2 — Interpretasi Detail Konten (Navbar + Hero)

Kerangka: skill `website-deep-analyzer`. Sumber **FAKTA**: HTML `https://basement.studio/` (Next.js + Sanity CDN). Bagian **INTERPRETASI** adalah pembacaan analis, bukan klaim eksplisit dari situs.

---

## 1. Headline utama — "A digital studio & branding powerhouse making cool shit that performs"

**Isi konten (FAKTA):**
- Elemen: `<h1>` (satu-satunya H1 di halaman).
- Selaras dengan `<title>`: "basement.studio | We make cool shit that performs." dan meta description.

**Interpretasi:**
- Ini **headline positioning + H1 sekaligus** — bukan tagline dekoratif. Secara SEO = penanda topik utama halaman; secara branding = pernyataan "siapa kami".
- Struktur pesan: [kategori] "digital studio & branding powerhouse" + [pembeda] "cool shit that performs".
- Tone sengaja **berani/provokatif** ("cool shit" — bahasa kasar informal) dipadu kata korporat "powerhouse". Kontras ini = strategi diferensiasi: studio kreatif yang anti-korporat, punya sikap, tapi serius soal hasil.
- Kata "**that performs**" = inti value: kreativitas mereka bukan sekadar estetik tapi berdampak/berfungsi (performa teknis, konversi, hasil bisnis). Menjawab keberatan klasik pada studio kreatif ("bagus tapi tidak efektif").

**Jawaban langsung:** ini **headline/positioning statement (H1)**, merangkap fungsi tagline brand — bukan sekadar slogan hiasan.

---

## 2. Subheadline — "We partner with the world's most ambitious startups..."

**Isi konten (FAKTA):**
- Elemen `<p>` tepat di bawah H1.
- Teks lengkap: "We partner with the world's most ambitious startups, scale-ups and brands to unlock their true potential and growth through the convergence of creativity, design, and technology."

**Interpretasi:**
- **Target audience** eksplisit: "startups, scale-ups and brands", dikualifikasi "world's most ambitious" → menyaring klien ber-ambisi tinggi (bukan UMKM/proyek kecil) = positioning partner premium.
- Kata "**partner**" (bukan "vendor/agency") = relasi jangka panjang & kolaboratif, bukan sekadar eksekutor order.
- **Value proposition**: membuka "true potential" & growth klien lewat "convergence of creativity, design, and technology" — klaim menggabungkan 3 disiplin (kreatif + desain + rekayasa) dalam satu atap. Pembeda dari agensi yang cuma kreatif atau cuma dev.
- Fungsi: memperjelas H1 yang playful jadi proposisi bisnis konkret (siapa dilayani + hasil apa).

---

## 3. "Trusted by Visionaries" + logo strip

**Isi konten (FAKTA):**
- Elemen `<h2>`: "Trusted by Visionaries". Logo lazy-load dari `cdn.sanity.io` (~160×88).
- Nama tertaut: Vercel, Next.js, Linear, Cursor, Scale, World Labs, ElevenLabs, Mintlify, Harvey, Baseten, Together.ai, Black Forest Labs, Profound, Rox, Factory.ai, Until Labs, Speakeasy, XBOW, Krea, Apollo GraphQL, Cal.com, Trunk, Replicate, Graphite, Spiral, Applied Compute, Solana, Flox, MrBeast, Daylight Computer.

**Interpretasi:**
- Ini **section social proof** — kredibilitas lewat asosiasi merek. Judul "Trusted by Visionaries" membingkai nama-nama itu sebagai pihak yang **mempercayai** basement.studio = **klien/partner mereka**, BUKAN sekadar tools yang dipakai.
- FAKTA pendukung: sebagian nama muncul lagi di "Featured Projects" sebagai proyek nyata (Vercel Ship, Daylight, MrBeast, KidSuper) dengan link `/showcase/...` → konfirmasi mereka klien.
- Mayoritas perusahaan tech/AI kelas atas (Vercel, ElevenLabs, Harvey, Scale, Solana) + tokoh mainstream (MrBeast) → memperkuat klaim "world's most ambitious brands". Kata "Visionaries" menyanjung klien sekaligus menaikkan status studio.
- Catatan hati-hati: beberapa nama (Next.js, Vercel) bisa merangkap **stack teknologi** yang dipakai juga, tapi di section ini framing-nya = klien/trust.

**Jawaban langsung:** "Trusted by" = **daftar klien/partner** yang bekerja sama dengan basement.studio (social proof), bukan daftar tools.

---

## 4. CTA — `Contact Us` vs `Roll Me In`

**Isi konten (FAKTA):**
- `Contact Us` — `<button>`, di navbar (persisten) + ada section `<h2>` "Contact".
- `Roll Me In` — `<button>` terpisah.
- Email kontak (menu overlay): `hello@basement.studio` (mailto).

**Interpretasi:**
- Keduanya CTA konversi ke tujuan sama (mulai percakapan/lead), beda **tone & konteks**:
  - **`Contact Us`** — formal/utilitarian, selalu di navbar. Untuk pengunjung yang siap menghubungi; bahasa netral standar.
  - **`Roll Me In`** — bergaya, informal, on-brand (senada "cool shit"). CTA ekspresif/playful untuk menurunkan friksi psikologis dengan bahasa lebih manusiawi/mengundang.
- **Kenapa dua**: strategi CTA berlapis — satu jalur fungsional selalu tersedia (`Contact Us`), satu jalur beraroma brand yang menonjol di hero. Keduanya kemungkinan mengarah ke titik konversi sama (form/email `hello@basement.studio`).
- Catatan: target link `Roll Me In` tidak terlihat di HTML statis (interaksi via JS) → fungsi persisnya inferensi.

---

## 5. Nav items — isi/tujuan tiap halaman

**Isi konten (FAKTA):** Home `/`, Services `/services`, Showcase (25) `/showcase`, People `/people`, Blog (28) `/blog`, Lab `/lab`.

| Item | Isi/tujuan (INTERPRETASI + FAKTA pendukung) |
|------|---------------------------------------------|
| **Home** | Landing/hero + ringkasan semua section |
| **Services** | Daftar layanan. FAKTA: section "Capabilities" homepage punya 4 kategori (Websites & Features, Visual Branding, IRL Experience Design, Marketing Execution) |
| **Showcase (25)** | Portofolio/studi kasus. FAKTA: link `/showcase/...` (Vercel Ship, Daylight, KidSuper, MrBeast) + filter `?category=`. Counter 25 = jumlah proyek |
| **People** | Halaman tim/anggota studio |
| **Blog (28)** | Artikel/tulisan. Counter 28 = jumlah post → studio aktif thought leadership |
| **Lab** | Area eksperimen/R&D/main teknis. Selaras brand WebGL/3D → ruang demonstrasi inovasi, bukan kerja klien |

**Kenapa hanya Showcase & Blog ada counter (INTERPRETASI):** keduanya koleksi ber-item yang jumlahnya bertambah, jadi angka bernilai sebagai bukti (volume portofolio & keaktifan konten). Home/Services/People/Lab bukan daftar ber-item, jadi tak perlu counter.

---

## 6. Secondary taglines

**Isi konten (FAKTA):**
- "We're here to create the extraordinary."
- "No shortcuts, just bold, precision-engineered work that elevates the game & leaves a mark."

**Interpretasi:**
- **Tagline pendukung / pernyataan filosofi**, muncul di area transisi setelah hero (bukan H1). Memperkuat brand voice & menjembatani ke section berikutnya.
- "create the extraordinary" — standar aspirasi tinggi.
- "No shortcuts... precision-engineered... leaves a mark" — menekankan **kualitas eksekusi & rekayasa presisi**, menggemakan janji "that performs" dari H1. "no shortcuts" = sinyal craft & integritas; "leaves a mark" = dampak berkesan.
- Fungsi: menutup celah antara sikap playful ("cool shit") dan keseriusan profesional.

---

### Keterbatasan
- FAKTA dari HTML statis. Visual hero berbasis JS/WebGL (0 `<canvas>` di markup) tidak terbaca snapshot statis — interpretasi interaksi (`Roll Me In`) bertanda inferensi.

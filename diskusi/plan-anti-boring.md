# Plan — Anti-Boring: Kurangi Teks & Show-Don't-Tell

> Tujuan: konten setelah Hero 3D tidak lagi terasa seperti brosur/company-profile —
> **teks turun drastis, tiap section punya jangkar visual berbeda**. Tanpa dependency baru
> (pakai `motion` v12 + R3F yang sudah ada). Membangun DI ATAS `plan-konten-redesign.md`
> (ritme/tipografi) & `analisa-transisi-basement.md` (katalog T1–T7) — dok ini menambah
> lapisan **density konten + visualisasi**, bukan mengulang.

## Ringkasan keputusan

Jalankan **Opsi 1 → Opsi 2 berurutan**. Opsi 3 (sambung ke office 3D) **ditunda** jadi north-star.

- **Kenapa bukan Opsi 1 saja:** trim doang = brosur lebih pendek, pola `eyebrow→heading→list`
  tetap terulang 10×. Sumber *boring* = keseragaman wadah, bukan cuma panjang teks.
- **Kenapa bukan Opsi 3 sekarang:** melawan keputusan arsitektur yang benar (canvas manifesto
  sengaja terpisah dari `Scene.tsx` karena bloom & kamera office terkalibrasi ketat),
  pertaruhkan `frameloop="demand"` yang sudah stabil, dan nambah friksi buat user yang mau skim.
  Simpan untuk **satu momen jembatan** (Hero→konten), bukan seluruh situs.

## Diagnosa (3 akar)

1. **Identitas ganda** — Hero janji "eksplor & main" (office + billiard), section bawah nyerahin
   "baca 9 paragraf". Transisi sebagus apapun, brosur tetap kerasa brosur.
2. **Density teks tinggi** di offender berikut:

   | Section | Beban | Verdict |
   |---|---|---|
   | Services | 9 kartu × desc 1–2 kalimat | 🔴 tembok teks terparah |
   | LivingArchitecture | 7 node × 1 kalimat + intro | 🔴 ini "alur", harusnya digambar |
   | Deployments | 5 baris prosa | 🟠 telling, bukan showing |
   | Vision | statement + 5 misi kalimat | 🟠 overlap tema Manifesto |
   | Process / Industries / Careers / Contact | ringan | 🟢 aman |

3. **Keseragaman wadah** — 10× `eyebrow → heading → list`. Variasi transisi tak cukup;
   yang harus divariasikan adalah **bentuk wadah** (split, diagram, index, strip).

## Strategi 2 fase (+ 1 ditunda)

**Prinsip:** (a) *progressive disclosure* — sembunyikan detail sampai diminta;
(b) prosa → data/label/visual; (c) satu elemen dominan per section, teks jadi pendukung.

---

## FASE A — Trim (shippable sendiri, ~1 hari, risiko rendah)

Menentukan **apa yang dibuang** sebelum divisualkan. Bisa rilis mandiri.

### Keystone: satu primitive baru `src/components/motion/Disclosure.tsx`
Expand/collapse **aksesibel** (klik + keyboard + `aria-expanded`, BUKAN hover-only — hover mati
di mobile & keyboard). Dipakai ulang di Services, LivingArchitecture, Deployments, Vision.
Satu primitive memangkas ~70% teks yang *tampil* tanpa menghilangkan info. **Ini unit yang bisa di-test.**

### Per-section (Fase A)
- **Services** 🔴 — 9 kartu grid → **indeks bernomor** `01–09`, judul selalu tampil, desc di balik
  `Disclosure`. Grup `subs` (AI) tetap pill saat item ke-expand. Buang look "SaaS card".
- **LivingArchitecture** 🔴 — nama 7 node tetap label; deskripsi pindah ke `Disclosure`/hover-focus.
  (visual alur menyusul di Fase B.) Intro dipangkas 1 kalimat.
- **Deployments** 🟠 — di `DeploymentRow.tsx`: tonjolkan `sector` (besar) + `region` (chip),
  desc panjang → `Disclosure`. `DeploymentsField` ambient dipertahankan.
- **Vision** 🟠 — statement tetap bookend (`ScrollHighlight`). 5 misi kalimat → **5 label verba**
  ("Deliver · Accelerate · Integrate · Partner · Innovate"), detail di `Disclosure`.
- **Process** — card grid → **alur horizontal bernomor** + konektor `→` (dari plan-konten). Ringan.
- **Keep apa adanya:** Manifesto (baru redesign), Industries (marquee), Careers (rows+underline), Contact.

### Konsolidasi section (target 10 → ~8, jujur — jangan dipaksa)
- **Manifesto & Vision** → tetap terpisah sebagai **bookend** (buka/tutup), jangan merge.
- **Kandidat merge (perlu konfirmasi user):** `Process` (cara deliver) diselipkan sebagai strip
  ramping di ekor `Services` (apa yang dikerjakan → bagaimana). Menghemat 1 section penuh.
- Sisanya kurangi **density**, bukan jumlah — count section sekunder, density primer.

---

## FASE B — Show-don't-tell (HANYA 3 offender)

Restraint = gerakan anti-boring. Cuma section terparah yang dapat viz; sisanya teks (sudah dipangkas).

- **Services** — 3 kartu index jadi **komposisi editorial** (nomor besar sebagai jangkar,
  split 2-kolom / full-bleed), hover/expand mengungkap sub-service. Wadah beda dari list biasa.
- **LivingArchitecture** — **`FlowDiagram.tsx` (SVG + motion, BUKAN R3F)**: node Citizen→Action
  tersambung garis; garis "digambar" (`strokeDashoffset`) & node menyala berurutan terikat
  `useScroll` (pola per-node yang sudah ada di file ini tinggal di-upgrade). Kandidat "wow #2"
  di tengah scroll. Sticky-pin (T4) opsional. Fallback reduced-motion: statis (sudah ada).
- **Deployments** — baris berbasis **metrik + chip sektor** (opsional peta pin minimal).
  ⚠️ Data sekarang tak punya angka — lihat *Ketergantungan Konten*. Tanpa angka asli: fallback
  ke sektor+region+keyword, **jangan mengarang metrik**.

---

## FASE C — North star (DITUNDA, jangan hilang dari catatan)

Satu momen jembatan **Hero→Manifesto**: transisi yang mereferensikan "keluar dari office"
(mis. kamera/opacity handoff) supaya metafora tour nyambung ke konten. Mahal & berisiko —
tidak dikerjakan sekarang, didokumentasikan agar tidak hilang saat sesi berakhir.

## Rambu (guardrails)

1. **Tidak ada canvas R3F ketiga** — LivingArch pakai SVG+motion. R3F hanya untuk ambient field.
2. **Jangan viz semua** — Process/Industries/Careers/Contact tetap teks (yang sudah dipangkas).
3. **Disclosure wajib aksesibel** — klik + fokus keyboard + `aria-expanded`, bukan hover-only.
4. Semua motion lolos `useReducedMotion` (pola sudah ada di primitives).
5. **Tidak menambah dependency**, tidak menyentuh Hero/`Scene.tsx`/kamera/billiard.
6. Tetap dark monochrome — tidak flip ke canvas putih, tidak neon.

## Ketergantungan konten (butuh input user — jangan diarang sendiri)

- **Services pillar/urutan**: pengelompokan & nomor `01–09` = keputusan editorial → konfirmasi user.
- **Deployments metrik**: butuh angka ASLI (jumlah agency, negara, dll). Tanpa itu, jangan
  fabrikasi — pakai fallback chip sektor. (Rule 15: no hardcoded/mengarang.)
- **Contact** masih `TODO(content)` handle sosial + `mailto:hello@cogniti.id` — konfirmasi final.

## Testing & verifikasi

- Runner belum terpasang (hanya `tsc --noEmit` + eslint). Mayoritas perubahan presentasional.
- **`Disclosure` punya behavior yang bisa di-assert** (toggle, `aria-expanded`, keyboard). Sesuai
  aturan "fitur baru wajib test" → **usul pasang Vitest + RTL** khusus untuk primitive ini
  (tanya user dulu, karena runner belum ada).
- Wajib hijau: `bun run build` (tsc + vite) & `bun run lint`.
- Manual: keterbacaan, FPS SVG/particle, reduced-motion, mobile collapse, navigasi keyboard disclosure.

## Yang TIDAK dilakukan

- Tidak menambah GSAP/lib berat. Tidak mengubah urutan Hero. Tidak menyentuh 3D office/kamera.
- Tidak menghapus konten — hanya menyembunyikan/mengubah bentuknya. Tidak white-canvas.

## Urutan kerja

> ✅ Branch `feature/content-anti-boring` dibuat dari `feature/manifesto-redesign` (commit `851a22b`).

1. ~~Branch `feature/content-anti-boring` dari `main` (setelah manifesto settle).~~ **DONE**
2. ~~**Fase A** — `Disclosure.tsx` + trim: Services, LivingArch, DeploymentRow, Vision, Process.~~ **DONE** — commit `851a22b`
   - `Disclosure.tsx`: click + keyboard + aria-expanded/controls + useReducedMotion ✅
   - Services: numbered index 01–09, desc behind Disclosure, subs pills on expand ✅
   - LivingArchitecture: scroll-animated names kept, desc → Disclosure, intro trimmed ✅
   - DeploymentRow: sector (lg) + region chip, desc → Disclosure ✅
   - Vision: 5 verb labels (Deliver/Accelerate/Integrate/Partner/Innovate) + Disclosure ✅
   - Process: horizontal flow + `→` connectors (desktop), vertical list (mobile) ✅
   - `bun run build` ✅ | lint error pre-existing (eslint-config-next missing, bukan dari perubahan ini)
   - **Menunggu konfirmasi user** sebelum lanjut Fase B.
   - Test Disclosure (`toggle`, `aria-expanded`, keyboard) → **usul pasang Vitest + RTL** (tanya user).
3. ~~**Fase B** — `FlowDiagram.tsx` (LivingArch) → Services editorial → Deployments metrik/chip.~~ **DONE** — branch `feature/content-show-dont-tell` commit `fcd331c`
   - `FlowDiagram.tsx`: SVG spine 7 node, `strokeDashoffset` per line, node color via `useTransform`, reduced-motion static ✅
   - LivingArchitecture: 2-col grid `lg:[1fr_200px]`, FlowDiagram sticky `top-24` di kanan ✅
   - Services: large number `text-4xl/5xl` sebagai jangkar tipografi, 3-col grid trigger ✅
   - Deployments: tidak diubah — tidak ada angka asli (Rule 15: no fabricated metrics) ✅
   - `bun run build` ✅
   - **Menunggu konfirmasi + verifikasi visual user** sebelum merge.
4. Verifikasi manual lengkap → lapor ringkasan + hasil build + nama branch. **Tunggu konfirmasi merge.**

## Risiko & catatan

- Sticky-pin LivingArch rawan di mobile → sedia fallback non-sticky `< lg`.
- `Disclosure` + `useReducedMotion`: pastikan konten expandable tetap terbaca screen-reader saat collapse.
- SVG flow: hati-hati `strokeDashoffset` di Safari; uji lintas-browser sebelum lapor.
- Fase A & B ter-decouple → kalau satu viz jelek, fallback ke teks Fase A yang sudah rapi.

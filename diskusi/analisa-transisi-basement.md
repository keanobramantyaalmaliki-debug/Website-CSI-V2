# Analisa Transisi Konten Teks — basement.studio

> Fokus: **transisi/animasi teks** tiap section (bukan 3D/WebGL canvas).
> Konten V1 sudah ke-port tapi masih "mentah" (statis, tulisan doang). Dok ini
> memetakan *gaya transisi* basement ke tiap section V2.

## Stack transisi yang terkonfirmasi (dari HTML basement.studio)

- **motion.dev / Framer Motion** — dipakai untuk semua reveal & scroll-linked.
  (terdeteksi `motion` 20x di payload; tidak ada GSAP/Locomotive).
- **Mask reveal** — teknik `clip-path` / overflow-hidden + translateY (terdeteksi `mask`).
- **Lenis-style smooth scroll** — inersia scroll (bikin scroll-linked animation terasa halus).
- Teks di-render **client-side** (HTML statis cuma footer) → semua transisi JS-driven.

---

## Katalog transisi teks basement.studio (yang kelihatan)

### T1 — Line-mask reveal (heading masuk)
Heading dipecah per-baris, tiap baris di dalam `overflow-hidden`. Saat masuk
viewport, baris naik dari bawah (translateY 100% → 0) dengan stagger antar baris.
- Easing: cubic ala `[0.16, 1, 0.3, 1]` (expo-out), durasi ~0.8s.
- Kesan: teks "tumbuh" dari garis, tegas.

### T2 — Word/char stagger (fade + rise)
Body copy dipecah per-kata (atau per-karakter untuk aksen). Tiap unit fade-in
(opacity 0→1) + translateY kecil (~12px), stagger 20–40ms.
- Dipakai di paragraf naratif & manifesto.

### T3 — Scroll-linked opacity / word highlight
Saat blok teks di-scroll melewati tengah layar, kata-kata berubah dari
`text-zinc-600` (redup) → `text-zinc-100` (terang) satu per satu, terikat progress
scroll (`useScroll` + `useTransform`). Efek "membaca sambil menyala".
- Ini signature move untuk manifesto/statement panjang.

### T4 — Sticky pin + swap
Section di-pin (sticky) sementara konten di dalamnya berganti/berpindah seiring
scroll. Dipakai untuk showcase/step berurutan (satu layar, konten cross-fade).

### T5 — Marquee / infinite scroll strip
Baris teks (industri, tags, award) jalan horizontal loop terus-menerus.
Kecepatan konstan, bisa react ke arah scroll.

### T6 — Number/counter & eyebrow slide
Eyebrow label ("Services", "Showcase (25)") slide-in pendek dari samping/bawah
saat section aktif. Angka count kadang di-animate.

### T7 — Hover magnetic / underline wipe
Link & role/career item: underline wipe kiri→kanan saat hover, teks sedikit
geser (magnetic). Bukan scroll, tapi bagian dari "hidup"-nya teks.

---

## Pemetaan ke section V2 (urutan `page.tsx`)

| Section | Transisi disarankan | Alasan |
|---------|--------------------|--------|
| **Hero** | T1 heading line-mask + T2 subline | Kesan pertama tegas, teks tumbuh dari 3D. |
| **Manifesto** | **T3 scroll word-highlight** (utama) | 4 baris statement → ini momen paling "basement". Kata menyala saat scroll. |
| **Deployments** | T1 heading + T6 eyebrow, item T2 stagger | List proyek muncul berurutan. |
| **Services** | T1 heading, kartu service T2 stagger + T7 hover | Sudah selang bg → reveal per kartu. |
| **LivingArchitecture** | **T4 sticky pin** + node T2 stagger | 7 node Citizen→Action cocok "menyala berurutan" saat pinned. |
| **Process** | T2 stagger bernomor + garis konektor draw | 6 langkah berurut → reveal step-by-step. |
| **Industries** | **T5 marquee strip** (13 pill loop) | Grid tag → jadikan strip jalan, khas basement. |
| **Careers** | T1 heading "Build What Comes Next" + role T7 hover underline | Role item interaktif; hiring 5 tahap T2 stagger. |
| **Vision** | T3 word-highlight (penutup statement) | Simetris dengan Manifesto sebagai bookend. |
| **Contact** | T1 heading + T7 hover pada link/email | CTA harus terasa "hidup". |

---

## Prioritas implementasi (dari dampak paling terasa)

1. **T3 word-highlight** → Manifesto + Vision (signature, dampak paling gede).
2. **T1 line-mask reveal** → semua heading section (konsistensi ritme).
3. **T2 word/item stagger** → body & list (Deployments, Process, Services, node LA).
4. **T5 marquee** → Industries.
5. **T4 sticky pin** → LivingArchitecture (paling kompleks, opsional/terakhir).
6. **T7 hover** → Careers, Contact, semua link.

---

## Catatan teknis untuk eksekusi (nanti, bukan sekarang)

- Semua section V2 saat ini **server component** (statis). Untuk transisi butuh
  wrapper `"use client"` — pola: bikin komponen kecil `Reveal.tsx`, `SplitText.tsx`,
  `ScrollHighlight.tsx` di `src/components/motion/` lalu bungkus teks. Jangan
  ubah data/konten, cuma bungkus presentasi.
- Pakai **motion.dev** (sesuai basement) — `motion`, `useScroll`, `useInView`,
  `useTransform`, `stagger`. Hindari nambah GSAP (lib berat, sudah cukup motion).
- Respect `prefers-reduced-motion` → matikan translate/opacity animation.
- Split teks: pakai util sendiri (~30 baris) bukan lib SplitText berbayar.
- Konsisten easing tokens: `ease = [0.16, 1, 0.3, 1]`, `dur = 0.8`, `stagger = 0.04`.

---

## Referensi cepat kode (pola, belum diimplement)

```tsx
// T3 — scroll word-highlight (Manifesto)
const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.4"] });
// tiap kata: useTransform(scrollYProgress, [i/n, (i+1)/n], ["#52525b", "#f4f4f5"])

// T1 — line-mask reveal (heading)
<span className="block overflow-hidden">
  <motion.span className="block"
    initial={{ y: "110%" }} whileInView={{ y: 0 }}
    transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }} viewport={{ once: true }} />
</span>

// T2 — stagger list
<motion.ul whileInView="show" initial="hidden" viewport={{ once: true }}
  variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
  <motion.li variants={{ hidden:{opacity:0,y:12}, show:{opacity:1,y:0} }} />
```

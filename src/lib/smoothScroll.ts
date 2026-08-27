import type Lenis from "lenis";

/**
 * Registry + scroll helpers dipisah dari useSmoothScroll.ts karena masa
 * hidupnya beda: berkas ini tidak bergantung React, jadi bisa dipanggil dari
 * mana pun (Navbar, RoomRouteSync) dan dites tanpa render.
 *
 * Tanpa instance terdaftar (reduced-motion, atau belum mount), kedua helper
 * jatuh ke perilaku native — identik dengan hari ini.
 */
let instance: Lenis | null = null;

/* Dua nilai berikut milik setScrollLocked di bawah — dideklarasikan di sini
   karena jumpToTop() ikut membacanya, dan `let` tidak ter-hoist nilainya. */
let previousOverflow: string | null = null;
let locks = 0;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo(0, 0);
}

/**
 * Lompat ke puncak halaman MESKI gulir sedang dikunci.
 *
 * `scrollToTop()` biasa tidak bisa dipakai untuk ini, dan kegagalannya SENYAP —
 * terukur 19 Agu: tirai GridReveal menutup, `scrollToTop()` dipanggil, dan
 * halaman tetap duduk di y = 2868. Dua rem yang dipasang `setScrollLocked`
 * memang bekerja persis seperti seharusnya; keduanya cuma tidak bisa
 * membedakan gulir milik pengunjung dari gulir milik naskah transisi:
 *
 *   · `lenis.stop()` membuat `scrollTo` biasa diabaikan — `force: true` yang
 *     mengesampingkannya
 *   · `overflow: hidden` di <html> memakukan posisinya di tingkat peramban,
 *     dan tidak ada opsi Lenis yang bisa menembus itu — makanya di sini
 *     kuncinya diangkat sebentar, lalu dipasang lagi di baris yang sama
 *
 * Gejala tanpa ini: pindah ruangan dari konten mendarat di ruangan yang BENAR
 * tapi pada posisi gulir yang lama, jadi tirai terangkat memperlihatkan bagian
 * tengah konten alih-alih 3D-nya. Dan karena hero tidak pernah masuk pandangan,
 * frameloop tetap "never" (INVARIANTS §7) — jadi penantian frame di GridReveal
 * ikut mentok ke jaring pengamannya, tiap kali.
 *
 * ⚠️ Kuncinya dipasang KEMBALI tanpa syarat kalau tadinya terpasang, termasuk
 * saat Lenis melempar. Melepas `overflow` di sini dan lupa mengembalikannya
 * berarti gulir hidup lagi di balik overlay yang masih terbentang.
 */
export function jumpToTop() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const relock = locks > 0;

  try {
    if (relock) root.style.overflow = previousOverflow ?? "";
    if (instance) instance.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  } finally {
    if (relock) root.style.overflow = "hidden";
  }
}

export function scrollToSection(id: string) {
  if (instance) {
    /*
     * `resize()` DULU, baru `scrollTo`. Lenis menyimpan `limit` (= tinggi
     * dokumen − tinggi viewport) hasil ResizeObserver, dan MENJEPIT setiap
     * target ke angka itu. Observer-nya baru berbunyi di frame berikutnya,
     * jadi kalau halaman baru saja berganti route, jepitannya masih memakai
     * ukuran HALAMAN SEBELUMNYA.
     *
     * Terukur di Brave saat "← Back to careers" (/careers/<slug> → /people#careers):
     *   #careers.offsetTop  = 3875  (tetap segitu sepanjang animasi — anchor
     *                                 TIDAK bergeser, itu bukan penyebabnya)
     *   halaman job          = 2396 tinggi dokumen, viewport 763 → limit 1633
     *   gulir berhenti di    ≈ 1630
     * Persis di jepitan halaman lama. Sesudah `resize()` ia mendarat di 3875.
     */
    instance.resize();
    instance.scrollTo(`#${id}`);
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/**
 * Kunci gulir halaman selama ada lapisan overlay di atasnya.
 *
 * Perlu DUA rem, bukan satu. `lenis.stop()` menghentikan gulir halus yang
 * dikemudikan Lenis, tapi Lenis tidak menangkap semua jalan masuk — panah
 * keyboard, PageDown, dan gulir asli di peramban yang Lenis-nya tidak aktif
 * (reduced-motion) tetap lolos. `overflow: hidden` di <html> yang menutup sisa
 * jalan itu. Tanpa Lenis, cabang keduanya saja sudah benar.
 *
 * Nilai `overflow` sebelumnya disimpan dan dikembalikan apa adanya — bukan
 * dipaksa jadi "" — supaya tidak menghapus setelan orang lain kalau kelak ada
 * yang juga menyentuhnya.
 *
 * ── `locks` berhitung, bukan boolean ───────────────────────────────────────
 * Berapa banyak lapisan yang sedang meminta kunci. BERHITUNG, bukan boolean —
 * dan itu perbaikan atas bug nyata, bukan generalisasi yang dibuat-buat.
 *
 * Di HP, memilih ruangan dari menu burger memicu DUA pengunci sekaligus: menu
 * overlay Navbar (yang mengunci selama `open`) dan tirai GridReveal. Menu lalu
 * menutup di tengah transisi, dan cleanup effect-nya memanggil
 * `setScrollLocked(false)` — melepas kunci milik tirai yang masih terbentang.
 * Akibatnya `lenis.start()` jalan lebih awal, dan sapuan jari selagi tirai
 * menutup menggeser halaman di balik layar yang tidak menampilkannya.
 *
 * Dengan hitungan, pelepasan baru benar-benar terjadi saat pemohon TERAKHIR
 * melepas.
 *
 * Dijepit di nol dengan sengaja: unlock berlebih itu pola yang sah — dulu
 * `goToContact` di Navbar memanggil `setScrollLocked(false)` lebih dulu lalu
 * membiarkan cleanup effect memanggilnya lagi (pemanggilnya sudah tiada sejak
 * CTA-nya berhenti menggulir, 27 Agu, tapi polanya boleh muncul lagi). Tanpa
 * jepitan, panggilan berlebih membuat hitungannya negatif dan kunci
 * berikutnya butuh dua kali unlock untuk lepas.
 */
export function setScrollLocked(locked: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (locked) {
    locks++;
    if (locks > 1) return;
    if (previousOverflow === null) previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    instance?.stop();
    return;
  }

  locks = Math.max(0, locks - 1);
  if (locks > 0) return;

  if (previousOverflow !== null) {
    root.style.overflow = previousOverflow;
    previousOverflow = null;
  }
  instance?.start();
}

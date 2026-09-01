/**
 * Matematika tirai kotak-kotak (GridReveal) — dipisah dari komponennya supaya
 * bisa dites tanpa render, dan supaya keputusan "kenapa segini" punya tempat
 * tinggal.
 */

/**
 * Sisi kotak dalam piksel CSS.
 *
 * 64 bukan angka bulat yang kebetulan enak: itu `background-size` milik
 * `.ambient-grid` (src/index.css). Menyamakannya membuat tirai terbaca sebagai
 * KISI SITUS INI yang merapat menutup layar, bukan sebagai grid asing yang
 * ditempelkan di atasnya. Kalau kisi ambient diubah, ubah ini bersamanya.
 */
export const TILE_PX = 64;

/**
 * Batas atas jumlah kotak.
 *
 * Tiap kotak satu <div> dengan transition opacity sendiri. Di 1440×900, 64px
 * memberi 23×15 = 345 — nyaman. Di monitor 2560×1440 angkanya jadi 40×23 = 920,
 * dan di sana ongkos layout + compositing-nya mulai terasa untuk sesuatu yang
 * cuma hidup 900 ms.
 *
 * Yang dikorbankan saat batas ini kena bukan kualitas efeknya, melainkan
 * KERAPATAN kisinya — kotaknya membesar. Di layar besar itu justru tidak
 * terlihat: kotak 96px di 2560px lebar punya proporsi visual yang sama dengan
 * kotak 64px di 1700px.
 */
export const MAX_TILES = 640;

/**
 * Jitter acak yang ditambahkan ke tiap delay, dalam milidetik (±).
 *
 * Tanpa ini, shuffle memberi laju yang RATA SEMPURNA — dan mata membaca
 * kerataan sempurna sebagai mesin, bukan sebagai acak. Sejumput ketidakteraturan
 * mengembalikan kesan tangan. Sengaja kecil: kalau jitter-nya sebanding dengan
 * jarak antar-delay, keuntungan shuffle (lihat shuffledDelays) ikut hilang.
 */
export const JITTER_MS = 15;

/**
 * Ukuran kisi untuk sebuah viewport.
 *
 * Selalu MEMBULAT KE ATAS: kisi harus menutupi layar sepenuhnya. Sisa kotak
 * yang menggantung di luar tepi tidak jadi soal — container-nya `overflow:
 * hidden` dan tiap kolom/baris memakai `1fr`, jadi lebarnya dibagi rata dan
 * sedikit lebih besar dari `tile` alih-alih menyisakan lajur kosong di tepi
 * kanan/bawah.
 */
export function tileGrid(
  width: number,
  height: number,
): { cols: number; rows: number; tile: number } {
  let tile = TILE_PX;
  let cols = Math.max(1, Math.ceil(width / tile));
  let rows = Math.max(1, Math.ceil(height / tile));

  if (cols * rows > MAX_TILES) {
    // Tebakan awal: luas per kotak yang PAS memberi MAX_TILES kotak.
    tile = Math.ceil(Math.sqrt((width * height) / MAX_TILES));
    cols = Math.max(1, Math.ceil(width / tile));
    rows = Math.max(1, Math.ceil(height / tile));

    // ⚠️ Tebakan itu SENDIRIAN tidak cukup, dan kelihatannya cukup — itu
    // sebabnya ada test khusus untuknya. Rumus luas mengabaikan pembulatan:
    // di 2560×1440 ia memberi tile 76 → ceil(2560/76)=34 kolom dan
    // ceil(1440/76)=19 baris = 646 kotak, lewat dari 640. Dua pembulatan ke
    // atas yang masing-masing menambah kurang dari satu lajur bisa bersama-sama
    // menambah satu baris PENUH.
    //
    // Menaikkan tile satu-satu dari tebakan yang sudah dekat: praktis 1-2
    // putaran, dan tidak menuntut ada yang percaya pada aljabar yang benar
    // sebagian.
    while (cols * rows > MAX_TILES) {
      tile++;
      cols = Math.max(1, Math.ceil(width / tile));
      rows = Math.max(1, Math.ceil(height / tile));
    }
  }

  return { cols, rows, tile };
}

/**
 * Delay per kotak (indeks = nomor kotak dalam urutan DOM) untuk satu sapuan.
 *
 * ── Kenapa URUTAN yang dikocok, bukan delay acak per kotak ─────────────────
 * Godaan pertamanya `delay = rng() * durasi` untuk tiap kotak. Itu memang acak,
 * tapi hasilnya BUKAN yang dimaksud orang saat bilang "muncul acak":
 *
 *   · lajunya bergerombol — beberapa puluh kotak muncul nyaris berbarengan,
 *     lalu ada jeda kosong, lalu bergerombol lagi
 *   · ekornya menggantung — dengan N kotak, delay TERBESAR rata-rata jatuh di
 *     N/(N+1) × durasi, jadi hampir selalu ada 2-3 kotak yang baru menutup
 *     setelah sisanya sudah penuh. Yang terbaca bukan "acak", melainkan
 *     "ada kotak yang telat" — dan itu terbaca sebagai cacat.
 *
 * Fisher-Yates memberi POSISI acak dalam antrean, lalu delay diturunkan dari
 * posisi itu. Kotaknya tetap muncul di tempat yang tak tertebak, tapi lajunya
 * rata persis dan kotak terakhir mendarat tepat di ujung durasi. Acak di RUANG,
 * teratur di WAKTU — itu yang sebenarnya diminta.
 *
 * `rng` disuntik (bukan Math.random langsung) supaya test bisa memberi urutan
 * yang bisa diulang.
 */
export function shuffledDelays(
  count: number,
  durationMs: number,
  rng: () => number,
): number[] {
  if (count <= 0) return [];

  // order[p] = nomor kotak yang mendapat giliran ke-p.
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const delays = new Array<number>(count);
  for (let p = 0; p < count; p++) {
    const jitter = (rng() * 2 - 1) * JITTER_MS;
    // max(0, …) — jitter negatif di kotak paling awal bisa menghasilkan delay
    // negatif, yang di CSS berarti "transisinya sudah berjalan sebagian" dan
    // membuat kotak pertama muncul setengah jadi.
    delays[order[p]] = Math.max(0, (p / count) * durationMs + jitter);
  }
  return delays;
}

/**
 * `id` dari `<clipPath>` yang dipasang GridReveal dan dipakai Hero.
 *
 * Ini KONTRAK LINTAS KOMPONEN, bukan detail: GridReveal yang membuat elemennya,
 * Hero yang menunjuknya lewat `clip-path: url(#…)`. Keduanya bersaudara di
 * pohon dan tidak saling impor apa pun selain konstanta ini — makanya nilainya
 * tinggal di sini, di berkas yang sudah jadi milik bersama mereka.
 */
export const CLIP_ID = "grid-reveal-clip";

/**
 * `id` seksi hero. GridReveal mengukurnya untuk tahu setinggi apa pita 3D-nya.
 *
 * Dipakai juga sebagai jangkar deep-link `#office`, jadi ia memang sudah harus
 * stabil — ini cuma menuliskan ketergantungan itu di satu tempat alih-alih
 * menyebar string "office" ke berkas yang tidak jelas hubungannya.
 */
export const HERO_SECTION_ID = "office";

/**
 * Pelebaran tiap kotak clip, dalam piksel (ke SEGALA arah).
 *
 * `clipPath` menyatukan anak-anaknya sebagai gabungan geometri, dan dua kotak
 * yang tepinya bersentuhan PAS tetap menyisakan garis rambut anti-alias di
 * sambungannya — di sini itu berarti sepotong tipis konten lama tembus di
 * antara kotak-kotak 3D, tepat pola yang paling terbaca mata karena
 * berulang di seluruh layar.
 *
 * Setengah piksel ke tiap arah membuat kotak bertetangga saling menindih satu
 * piksel penuh. Tidak menggeser apa pun: kotak yang membesar dari tengah tetap
 * berpusat di sel yang sama.
 */
export const CLIP_BLEED_PX = 0.5;

/**
 * Kisi yang dibelah oleh batas bawah hero.
 *
 * ── Kenapa dibelah ─────────────────────────────────────────────────────────
 * Sapuannya menyingkap 3D, dan 3D itu hidup di dalam kotak hero — `h-svh` di
 * desktop tapi cuma `h-[70svh]` di HP (lihat alasan panjangnya di Hero.tsx).
 * Di HP berarti ada PITA SISA di bawah hero yang tidak akan pernah berisi 3D
 * apa pun.
 *
 * Pembungkus canvas sengaja dipaku pada UKURAN ALAMINYA, bukan pada
 * `inset-0`. Menariknya jadi selayar penuh akan mengubah ukuran canvas, dan
 * canvas R3F menyusul perubahan tata letak ~58 ms di belakang DOM — kedipan
 * yang sudah terukur dan sudah mahal sekali dibayar di InquiryLaptop (13 Agu).
 * Ukurannya tidak pernah berubah = kedipan itu mustahil terjadi.
 *
 * Harganya: pita sisa perlu penutupnya sendiri. Itu yang dijawab `rowsStrip` —
 * bidang polos `var(--background)` yang ikut sapuan yang sama, lalu memudar
 * setelah route berganti dan konten baru sudah ada di belakangnya.
 *
 * Di desktop `bandH === viewportH`, jadi `rowsStrip` = 0 dan seluruh mekanisme
 * pita ini lenyap dengan sendirinya — tidak ada cabang yang perlu ditulis.
 */
export function bandGrid(
  width: number,
  viewportH: number,
  bandH: number,
): { cols: number; rowsBand: number; rowsStrip: number; tile: number } {
  const stripH = Math.max(0, viewportH - bandH);

  // Titik awal: ukuran kotak yang sudah menghormati MAX_TILES untuk seluruh
  // viewport. Membelahnya bisa menambah SATU baris (dua pembulatan ke atas
  // menggantikan satu), jadi anggarannya diperiksa ulang di bawah.
  let tile = tileGrid(width, viewportH).tile;

  const fit = () => ({
    cols: Math.max(1, Math.ceil(width / tile)),
    rowsBand: Math.max(1, Math.ceil(bandH / tile)),
    rowsStrip: stripH > 0 ? Math.max(1, Math.ceil(stripH / tile)) : 0,
  });

  let g = fit();
  while (g.cols * (g.rowsBand + g.rowsStrip) > MAX_TILES) {
    tile++;
    g = fit();
  }

  return { ...g, tile };
}

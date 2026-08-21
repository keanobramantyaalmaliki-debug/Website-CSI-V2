/**
 * Matematika murni sabuk teks ServicesTicker — dipisah dari komponennya
 * supaya bisa diuji tanpa WebGL (pola yang sama dengan scrollLift.ts).
 *
 * Demo pmndrs infinite-scroll membuat "tak berujung" dengan MENDUPLIKASI
 * konten lalu men-teleport scrollbar di ujung (plus guard 40ms menelan event
 * sintetisnya). Di sini kontennya cuma 9 teks yang posisinya kita tulis
 * sendiri tiap frame, jadi wrap modulo per item lebih sederhana DAN lebih
 * benar: tidak ada titik sambung, tidak ada duplikat, tidak ada teleport.
 */

/**
 * Posisi X item ke-`i` pada sabuk melingkar.
 *
 * Sabuknya sepanjang `count * slot` unit dunia; `offset` menggesernya ke kiri
 * (offset naik = item berjalan ke kiri, arah baca). Hasilnya selalu jatuh di
 * [-L/2, L/2) — terpusat di sumbu kamera — dan periodik: offset + L
 * menghasilkan posisi yang identik.
 */
export function beltX(i: number, slot: number, count: number, offset: number): number {
  const L = slot * count;
  // (v % L) ∈ (-L, L) karena % JS ikut tanda pembilang; +1.5L menariknya ke
  // (0.5L, 2.5L) sehingga modulo kedua sah di [0, L), lalu -L/2 memusatkan.
  return ((((i * slot - offset) % L) + L * 1.5) % L) - L / 2;
}

/**
 * Target intensitas efek dari laju sabuk (unit dunia/dtk): 0 saat diam, 1
 * begitu |vel| >= velFull. Padanan `data.delta * 50` / `1 - delta * 1000`
 * di demo pmndrs — di sana delta scroll internal, di sini kecepatan nyata.
 * Pemanggil yang men-damp hasilnya; fungsi ini cuma menjepit.
 */
export function motionIntensity(vel: number, velFull: number): number {
  if (velFull <= 0) return 0;
  return Math.min(1, Math.abs(vel) / velFull);
}

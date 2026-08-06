/**
 * Hitungan pin section.
 *
 * ── Relasi yang dijaga di sini ─────────────────────────────────────────────
 * Sebuah section yang "menahan" dibangun dari dua tinggi: TRACK (lebih tinggi
 * dari layar) dan ANAK STICKY di dalamnya (setinggi layar). Anak itu berhenti
 * menempel bukan di ujung track, melainkan di `(track − sticky) / track`.
 *
 * Angka itulah yang selalu salah ditebak. Progress dari `useScroll` membentang
 * sepanjang SELURUH track, jadi gerakan yang dipetakan ke [0, 1] akan separuh
 * berjalan setelah anaknya lepas dan ikut menggulir — terlihat seperti animasi
 * yang "kepotong", tanpa satu pun gejala yang menunjuk ke tinggi track. Hero
 * sudah dua kali tersandung persis di situ (lihat heroPin.ts).
 *
 * Karena itu di sini tinggi track tidak pernah ditulis tangan: ia DITURUNKAN
 * dari tinggi anaknya dan titik lepas pin yang diinginkan. Dua angka yang harus
 * sepakat jadi satu angka yang dihitung.
 */

/**
 * Titik anak sticky lepas dari pin, sebagai pecahan panjang track.
 *
 * Satuannya bebas asal sama — yang dipakai cuma perbandingannya.
 */
export const unpinRatio = ({
  track,
  sticky,
}: {
  track: number;
  sticky: number;
}) => (track - sticky) / track;

/**
 * Titik lepas pin bawaan: 0,5, alias track dua kali tinggi anaknya.
 *
 * Artinya separuh pertama gulir dipakai menahan, separuh kedua melepas. Kalau
 * dinaikkan, tahanannya makin lama tapi halamannya juga makin panjang — dan
 * ruang untuk gerakan isinya justru menyempit, karena semuanya harus selesai
 * sebelum titik ini.
 */
export const DEFAULT_UNPIN_AT = 0.5;

/**
 * Tinggi track yang membuat anak setinggi `sticky` lepas pin tepat di
 * `unpinAt` — sebagai panjang CSS, jadi satuannya (dvh, px, rem) ikut apa pun
 * yang diberikan.
 *
 * Sengaja `calc()` dan bukan angka jadi: `100dvh` baru diketahui nilainya oleh
 * browser, dan menghitungnya di JS berarti mengukur viewport sendiri lalu salah
 * setiap kali bilah alamat ponsel muncul-hilang.
 */
export function trackHeight(sticky: string, unpinAt: number): string {
  if (!(unpinAt > 0 && unpinAt < 1)) {
    throw new RangeError(
      `unpinAt harus di antara 0 dan 1 (eksklusif), bukan ${unpinAt}. ` +
        `Di 0 track sama tinggi dengan anaknya sehingga tidak ada yang ` +
        `ditahan; di 1 track-nya tak terhingga.`,
    );
  }
  // Dibulatkan supaya 1/(1−0.444) tidak menghasilkan ekor desimal panjang di
  // dalam string CSS-nya. Enam angka di belakang koma jauh lebih halus dari
  // satu piksel pada tinggi layar mana pun.
  const factor = Math.round((1 / (1 - unpinAt)) * 1e6) / 1e6;
  return `calc(${sticky} * ${factor})`;
}

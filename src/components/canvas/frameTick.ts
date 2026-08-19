/**
 * Penghitung frame yang benar-benar TERGAMBAR — jembatan dari dalam Canvas ke
 * overlay DOM di luarnya.
 *
 * ── Kenapa ini ada ─────────────────────────────────────────────────────────
 * GridReveal (tirai kotak-kotak saat pindah ruangan dari konten) harus tahu
 * kapan ruangan BARU sudah betul-betul digambar sebelum ia mengangkat tirai.
 * Jeda tetap tidak bisa menjawab itu, dan alasannya ada di INVARIANTS §7:
 * `frameloop` = `"never"` selama pengunjung berada di konten. Render loop-nya
 * BERHENTI. Rangkaiannya setelah tirai menutup:
 *
 *   scrollToTop() → IntersectionObserver di Hero.tsx menyala (async) →
 *   heroInView true → prop frameloop kembali "always" → R3F resume →
 *   frame pertama ruangan baru
 *
 * Jarak antara langkah pertama dan terakhir tidak dijamin oleh apa pun. Kalau
 * tirai diangkat pada hitungan detik, ada peluang nyata layar masih memegang
 * frame TERAKHIR ruangan lama — kedipan ruangan yang salah, persis di momen
 * paling terlihat.
 *
 * Pola yang sama dengan `sceneReady` di sceneStore: yang ditunggu FRAME, bukan
 * WAKTU.
 *
 * ── Kenapa module-level, bukan state React ─────────────────────────────────
 * Sama seperti uniform di revealSweep.ts & transitionTear.tsx: penulisnya ada
 * di dalam useFrame (60×/detik) dan pembacanya di DOM. Lewat state React itu
 * berarti satu render per frame untuk seluruh pohon — ongkos yang tidak
 * sebanding dengan satu angka yang cuma dibaca <1 detik sekali seumur
 * transisi. Pembacanya menyedot lewat rAF, bukan berlangganan.
 *
 * ⚠️ Berkas ini WAJIB tetap bebas import three. Ia diimpor GridReveal.tsx yang
 * hidup di bundle utama; satu import three di sini menyeret seluruh mesin 3D
 * ke bundle yang sengaja dijaga ringan (alasan yang sama dengan catatan Vec3
 * di sceneStore.ts).
 */

let frames = 0;

/** Dipanggil sekali per frame dari useFrame di CameraController. */
export function markFrame() {
  frames++;
}

/** Jumlah frame yang sudah digambar sejak halaman dimuat. */
export function frameCount() {
  return frames;
}

/** Khusus test — kembalikan penghitung ke nol. */
export function resetFrameCount() {
  frames = 0;
}

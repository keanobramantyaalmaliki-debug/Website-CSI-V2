/**
 * Token gerak — satu-satunya sumber kurva easing situs ini.
 *
 * ── Kenapa cuma satu kurva ─────────────────────────────────────────────────
 * Yang membuat sebuah situs terasa dikerjakan satu tangan bukan durasinya,
 * melainkan bentuk percepatannya. Begitu ada dua kurva yang mirip tapi tak
 * sama, matanya tidak bisa menyebut apa yang salah — hanya terasa ada yang
 * tidak rapi. Karena itu SKILL.md melarang "tweak easing per komponen", dan
 * angka ini tidak boleh disalin ke tempat lain, bahkan dengan nilai identik.
 *
 * ── Kenapa jadi modul ──────────────────────────────────────────────────────
 * Sebelumnya deklarasi yang sama persis ditulis ulang di 22 berkas. Semuanya
 * kebetulan masih sama, tapi tidak ada yang menjaganya: satu suntingan di satu
 * berkas akan lolos tanpa jejak, dan section itu bergerak sedikit berbeda dari
 * tetangganya selamanya. Sekarang mengubahnya berarti mengubah semuanya —
 * yang memang satu-satunya cara mengubah kurva ini yang dibenarkan.
 *
 * Padanan CSS-nya `--ease-out` di index.css, untuk transisi yang ditulis
 * sebagai CSS (bukan lewat motion). Keduanya dijaga tetap sama oleh
 * tokens.test.ts — dua tempat, satu angka.
 */

/**
 * Kurva tunggal itu: cepat di awal, berhenti panjang dan lembut di akhir.
 *
 * Bertipe tuple, bukan `number[]`, karena itu yang diminta `Transition["ease"]`
 * milik motion — array biasa ditolak type checker-nya.
 */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

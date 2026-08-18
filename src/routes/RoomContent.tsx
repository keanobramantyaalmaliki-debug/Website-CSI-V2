import type { RoomKey } from "@/lib/store/sceneStore";
import { ROOM_CONTENT } from "@/lib/roomContent";

/**
 * Konten di bawah hero untuk ruangan yang sedang aktif.
 *
 * ⚠️ HANYA ruangan aktif yang dirender. Ini pernah ditulis sebaliknya — semua
 * ruangan di-mount lalu yang tidak aktif disembunyikan `hidden` — dan itu
 * DICABUT (3 Agu). Sejarahnya penting supaya tidak diulang:
 *
 * Pola "mount semua" dipasang untuk menghindari remount konteks WebGL tiap
 * ganti ruangan. Alasannya sah saat itu: keempat ruangan masih placeholder
 * satu paragraf, jadi menahan semuanya praktis gratis.
 *
 * ⚠️ Komentar ini dulu menyebut TIGA konteks (CsiParticleField, ManifestoField,
 * DeploymentsField). Diperiksa ulang 3 Agu 2026: `DeploymentsField` sudah tidak
 * diimpor siapa pun, dan dua sisanya cuma ada di section LOUNGE — jadi
 * remount-nya terjadi saat masuk/keluar Lounge, bukan di setiap perpindahan.
 * Angka "tiga" itu ikut membesarkan ongkos yang dikira ada di sini. Per 18 Agu
 * 2026 ongkosnya NOL: CsiParticleField dihapus dan section Manifesto dicabut
 * dari Lounge, jadi tidak ada lagi konteks WebGL kecil yang ikut remount saat
 * berganti ruangan.
 *
 * Asumsi itu gugur beberapa jam kemudian, ketika Office/Meeting/Function diisi
 * konten penuh. Dua akibatnya nyata dan keduanya terlaporkan:
 *
 *   1. BERAT SEPANJANG WAKTU. `display: none` menghentikan render & layout,
 *      tapi TIDAK menghentikan hook. `useScroll` milik Framer Motion tetap
 *      terpasang di window, `useInView` tetap punya IntersectionObserver
 *      hidup. Dengan empat ruangan berisi, jumlah observer & listener scroll
 *      berlipat — dan semuanya ikut dievaluasi tiap kali halaman digulir,
 *      termasuk milik ruangan yang tak terlihat.
 *
 *   2. `id` GANDA. `<Contact />` kini ada di Lounge, Meeting, DAN Function,
 *      jadi `id="contact"` muncul 3× sekaligus di DOM. `getElementById`
 *      mengembalikan yang PERTAMA — bisa jadi milik ruangan tersembunyi, dan
 *      scroll ke elemen `display: none` tidak ke mana-mana. Ini yang membuat
 *      "Talk to us" berperilaku aneh. HTML memang melarang id ganda; pola
 *      "mount semua" melanggarnya secara struktural, bukan karena kelalaian.
 *
 * Ongkos remount WebGL itu nyata, tapi ia dibayar SEKALI per perpindahan.
 * Ongkos observer berlipat dibayar di SETIAP frame scroll, selamanya. Yang
 * kedua jauh lebih mahal.
 *
 * Kalau remount WebGL nanti terasa mengganggu lagi, jalan keluarnya BUKAN
 * mengembalikan pola ini — melainkan memindahkan ketiga Canvas itu ke tempat
 * yang tidak ikut berganti (seperti SiteLayout), atau membuatnya menahan
 * konteks GL sendiri antar-mount.
 */
export default function RoomContent({ room }: { room: RoomKey }) {
  return <>{ROOM_CONTENT[room]}</>;
}

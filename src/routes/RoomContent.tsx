import type { RoomKey } from "@/lib/store/sceneStore";
import { ROOM_CONTENT, ROOM_KEYS_WITH_CONTENT } from "@/lib/roomContent";

/**
 * Konten di bawah hero untuk ruangan yang sedang aktif.
 *
 * ⚠️ SEMUA ruangan tetap ter-mount; yang tidak aktif hanya DISEMBUNYIKAN.
 * Ini bukan gaya penulisan, melainkan soal performa.
 *
 * Bentuk sebelumnya `<>{ROOM_CONTENT[room]}</>` — React melihat subtree yang
 * sama sekali berbeda tiap kali `room` berganti, jadi ia MEMBONGKAR seluruh
 * konten lama lalu memasang yang baru dari nol. Untuk Lounge itu berarti 12
 * section, dan yang mahal: TIGA konteks WebGL (CsiParticleField,
 * ManifestoField, DeploymentsField) dihancurkan lalu dibuat ulang — konteks GL
 * baru, kompilasi shader, alokasi buffer, 1000 partikel di-sample ulang.
 *
 * Semua itu berjalan di main thread TEPAT saat kamera sedang tween 1400 ms ke
 * ruangan berikutnya. Gejalanya: perpindahan ruangan terasa BERAT dan tidak
 * mulus — dan penyebabnya tidak menunjuk ke kode 3D sama sekali.
 *
 * `hidden` memakai `display: none`, jadi ruangan tak aktif tidak ikut layout,
 * tidak digambar, dan Canvas `frameloop="demand"` di dalamnya tidak pernah
 * diminta menggambar (ketiganya hanya menggambar saat di-`invalidate`, dan
 * pemicunya digerbangi `useInView`/scroll yang mati saat `display: none`).
 * Ongkos diamnya mendekati nol; yang dihemat adalah ongkos MEMBANGUN ULANG.
 *
 * ⚠️ Konsekuensi kalau nanti menambah ruangan berkonten: semua konten ikut
 * dipasang di muat pertama, bukan saat ruangannya dibuka. Selama cuma Lounge
 * yang berisi (sisanya placeholder satu paragraf), ini praktis gratis. Kalau
 * tiap ruangan nanti punya konten penuh, timbang ulang — mungkin `lazy()` per
 * ruangan. Tapi JANGAN kembali ke bongkar-pasang: yang mahal adalah remount
 * WebGL-nya, bukan ukuran bundle-nya.
 */
export default function RoomContent({ room }: { room: RoomKey }) {
  return (
    <>
      {ROOM_KEYS_WITH_CONTENT.map((key) => (
        <div key={key} hidden={key !== room}>
          {ROOM_CONTENT[key]}
        </div>
      ))}
    </>
  );
}

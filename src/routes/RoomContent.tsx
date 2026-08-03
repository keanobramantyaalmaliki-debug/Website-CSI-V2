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
 * ⚠️ Konsekuensinya: SEMUA konten ikut dipasang di muat pertama, bukan saat
 * ruangannya dibuka. Per 3 Agu keempat ruangan sudah berisi penuh (Office
 * accordion, Meeting case grid, Function people) — bukan lagi placeholder satu
 * paragraf seperti saat pola ini dipasang.
 *
 * Itu tetap dipertahankan karena yang mahal BUKAN jumlah node DOM-nya,
 * melainkan konteks WebGL — dan ketiganya masih hanya ada di Lounge. Section
 * baru di ruangan lain murni DOM + motion, yang murah untuk di-mount dan
 * praktis nol saat `display: none`.
 *
 * Kalau nanti ruangan lain ikut membawa Canvas sendiri, timbang ulang: mungkin
 * `lazy()` + `Suspense` per ruangan supaya ongkos muat pertama tidak menumpuk.
 * Tapi JANGAN kembali ke bongkar-pasang — yang mahal remount WebGL-nya, dan
 * itu tidak berubah seberapa pun kontennya bertambah.
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

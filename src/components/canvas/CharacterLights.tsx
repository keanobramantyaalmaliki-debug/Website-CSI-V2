"use client";

/**
 * Slot lighting untuk objek DINAMIS (karakter) — masih kosong.
 *
 * Kenapa ini ada padahal belum dipakai:
 *
 * Scene kantor punya NOL lampu realtime — semua cahaya sudah dipanggang ke
 * lightmap (Documentations.md §4g). Itu yang bikin 50-60 FPS.
 *
 * Tapi karakter TIDAK BISA ikut di-bake karena dia bergerak (idle animation).
 * Kalau ditaruh apa adanya, karakter akan tampak gelap datar seperti stiker
 * yang ditempel — tidak menyatu dengan ruangan.
 *
 * Solusinya BUKAN menyalakan lampu scene lagi (itu balik ke 14 FPS), tapi
 * lampu ber-LAYER yang hanya menyinari karakter:
 *
 *   const CHAR_LAYER = 1;
 *   // di sini:
 *   <directionalLight
 *     position={[2, 3, 1]}
 *     intensity={1.5}
 *     ref={(l) => l?.layers.set(CHAR_LAYER)}
 *   />
 *   // di komponen karakter:
 *   character.traverse((o) => o.layers.enable(CHAR_LAYER));
 *
 * Lampu itu dilewati saat merender 291 objek statis, jadi biayanya nyaris nol.
 *
 * Rencana isi (lihat Documentations.md §6b): 1 key light hangat mengikuti arah
 * lampu ruangan terdekat + 1 fill lembut supaya sisi gelapnya tidak mati total.
 */
export default function CharacterLights() {
  return null;
}

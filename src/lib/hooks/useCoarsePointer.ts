import { useSyncExternalStore } from "react";

/**
 * true di perangkat yang alat tunjuk utamanya TIDAK presisi — layar sentuh,
 * termasuk tablet.
 *
 * Dipakai untuk mematikan interaktivitas scene 3D (waypoint & minigame
 * billiard), sehingga di perangkat sentuh kantor tampil sebagai pemandangan
 * saja. Lihat INVARIANTS.md §6.
 *
 * ⚠️ Sengaja `pointer: coarse`, BUKAN lebar layar. Yang membuat interaksi ini
 * gagal di HP bukan sempitnya layar melainkan TIDAK ADANYA hover: waypoint
 * hanya terbaca setelah kursor menyentuhnya (arsir + bingkai + label muncul di
 * `hover`), dan jari tidak punya keadaan itu — sentuhan pertama langsung
 * berpindah ruangan tanpa pengunjung sempat tahu apa yang ia sentuh. Patokan
 * `max-width` akan meloloskan tablet landscape yang masalahnya sama persis.
 *
 * `pointer` menjawab soal alat tunjuk UTAMA. Laptop layar sentuh yang punya
 * trackpad tetap terbaca `fine` — dan itu benar, hover-nya memang ada.
 */
const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Server snapshot: `false` = anggap ada penunjuk presisi.
 *
 * Situs ini SPA Vite tanpa SSR, jadi jalur ini praktis tak terpakai — tapi
 * useSyncExternalStore mewajibkannya, dan `false` adalah default yang aman:
 * kalau nanti ada SSR, HTML pertama berisi versi interaktif dan hidrasi
 * MENCABUT interaksi di perangkat sentuh. Kebalikannya lebih buruk — pengguna
 * desktop menerima kantor mati sesaat sebelum hidrasi menghidupkannya.
 */
function getServerSnapshot() {
  return false;
}

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

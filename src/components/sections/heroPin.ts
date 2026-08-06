/**
 * Angka-angka yang mengikat pin Hero jadi satu.
 *
 * Dipisah dari Hero.tsx bukan karena Hero kepanjangan, tapi supaya hubungan
 * antar angkanya bisa diuji tanpa menyalakan R3F/three di jsdom. Yang rapuh di
 * sini memang relasinya, bukan komponennya: tinggi track/sticky harus ditulis
 * utuh sebagai kelas Tailwind (pemindainya membaca teks, bukan variabel), jadi
 * angka yang sama hidup di dua tempat dan tidak ada yang memaksa keduanya
 * sepakat. Lihat heroPin.test.ts.
 *
 * Rumus lepas pin-nya sendiri tinggal di lib/motion/pin.ts bersama primitif
 * PinnedSection — Hero memakai rumus yang sama, cuma menuliskan tingginya
 * sebagai kelas Tailwind karena ia mendahului primitifnya.
 */
import { unpinRatio } from "@/lib/motion/pin";

export { unpinRatio };

/** Tinggi track dan anak sticky-nya per breakpoint, dalam dvh. */
export const PIN_HEIGHTS = {
  /** `md:h-[180dvh]` pada track, `md:h-dvh` pada sticky. */
  desktop: { track: 180, sticky: 100 },
  /** `h-[126dvh]` pada track, `h-[70dvh]` pada sticky. */
  mobile: { track: 126, sticky: 70 },
};

/**
 * 0,444 — dan angka ini HARUS sama di desktop maupun HP, kalau tidak satu
 * rentang fade tidak mungkin benar untuk keduanya. Itu sebabnya track mobile
 * 126dvh, bukan angka bulat. Kalau salah satu tinggi diubah, hitung ulang
 * pasangannya: track = sticky / (1 − 0,444).
 */
export const UNPIN_RATIO = unpinRatio(PIN_HEIGHTS.desktop);

/**
 * Rentang `scrollYProgress` tempat canvas memudar.
 *
 * ⚠️ Ujungnya HARUS ≤ UNPIN_RATIO. Memudarkan di [0.6, 1.0] membuat canvas
 * masih pekat selama ±28dvh SETELAH ia lepas pin dan ikut menggulir bersama
 * halaman, jadi ia terlihat muncul lagi di bawah seam HeroHandoff — dilaporkan
 * sebagai "kepotong saat discroll".
 */
export const CANVAS_EXIT_RANGE: [number, number] = [0.28, 0.44];

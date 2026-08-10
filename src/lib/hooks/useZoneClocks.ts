"use client";

import { useEffect, useState } from "react";

/**
 * Jam tiga zona waktu Indonesia untuk menu overlay.
 *
 * Diambil dari situs cogniti yang sudah tayang, dengan dua perbedaan sadar:
 *
 * 1. **Detaknya digerbangi `active`.** Versi aslinya memasang
 *    `setInterval(…, 1000)` sekali saat halaman dimuat dan membiarkannya
 *    berdetak selamanya. Di situs ini itu pola yang sudah pernah menggigit:
 *    mesin yang terus berdetak walau efeknya tidak terlihat adalah biang
 *    "laptop panas" 3 Agu (PhysicsHeading). Jam ini hanya terlihat saat menu
 *    terbuka, jadi hanya berdetak saat menu terbuka.
 * 2. **Bangun di pergantian menit, bukan tiap detik.** Yang ditampilkan cuma
 *    jam:menit, jadi 59 dari 60 pembaruan itu render sia-sia. `setTimeout`
 *    yang disetel ke sisa menit berikutnya memberi angka yang sama persis
 *    dengan seperenampuluh pekerjaannya.
 *
 * Nilai awalnya placeholder, bukan waktu asli, supaya tidak ada satu render
 * pun yang menampilkan jam basi sebelum efeknya jalan.
 */

export interface Zone {
  /** Label yang tampil, mis. "WIB". */
  label: string;
  /** Nama zona IANA, mis. "Asia/Jakarta". */
  tz: string;
}

export const ID_ZONES: readonly Zone[] = [
  { label: "WIB", tz: "Asia/Jakarta" },
  { label: "WITA", tz: "Asia/Makassar" },
  { label: "WIT", tz: "Asia/Jayapura" },
] as const;

export const CLOCK_PLACEHOLDER = "--:--";

const MINUTE = 60_000;

function readClocks(zones: readonly Zone[]): string[] {
  const now = new Date();
  return zones.map((z) =>
    // en-GB = 24 jam dengan nol di depan; format yang sama dipakai situs lama.
    now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: z.tz,
    }),
  );
}

export function useZoneClocks(
  active: boolean,
  zones: readonly Zone[] = ID_ZONES,
): string[] {
  const [times, setTimes] = useState<string[]>(() =>
    zones.map(() => CLOCK_PLACEHOLDER),
  );

  useEffect(() => {
    if (!active) return;

    let id = 0;
    const tick = () => {
      setTimes(readClocks(zones));
      // Ketiga zona Indonesia offsetnya jam bulat, jadi sisa menit UTC =
      // sisa menit lokal di ketiganya.
      id = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE));
    };
    tick();

    return () => window.clearTimeout(id);
  }, [active, zones]);

  return times;
}

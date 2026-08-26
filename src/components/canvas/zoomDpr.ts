/**
 * Jepitan dpr saat browser di-ZOOM-OUT (QC 26 Agu 2026).
 *
 * Zoom-out membesarkan viewport CSS sekaligus menurunkan
 * `window.devicePixelRatio` di bawah 1 (Retina zoom 50%: 2880×1800 CSS,
 * dpr 1). Semua <Canvas> di situs memakai dpr dengan lantai 1, dan dpr R3F
 * adalah rasio terhadap ukuran CSS — jadi buffer fisiknya justru MELEDAK
 * saat halaman dikecilkan: 4× di zoom 50%, 9× di 33% (p95 hero 16,9 →
 * 66,6 ms, terukur scripts/probe-zoom-out.mjs). Diam-diam itu juga
 * merender lebih tajam dari look dpr-1 pixelated yang disetujui 19 Agu —
 * ketajaman yang tidak pernah diminta, dibayar 4–9× ongkos.
 *
 * Obatnya faktor `min(1, devicePixelRatio)`: di zoom ≥100% nilainya 1
 * (nol perubahan piksel), di zoom-out ia menyusutkan dpr sebanding
 * sehingga buffer fisik kembali ~ukuran semula dan look-nya kembali ke
 * dpr-1 pixelated yang sama dengan idle normal.
 *
 * Dua hal yang SENGAJA tidak disentuh faktor ini (kontrak di Scene.tsx,
 * dijaga zoomDpr.test.ts):
 * - override `?dpr=` — angka yang sedang di-A/B Keano harus terpasang
 *   apa adanya, tidak boleh diam-diam dikalikan;
 * - termostat AdaptiveDpr — ia tetap mengemudikan tangga DPR_LADDER;
 *   faktor zoom mengalikan HASILNYA di prop, bukan mengubah tangganya.
 */
import { useEffect, useState } from "react";

/** 1 di zoom ≥100%; di zoom-out (dpr<1) menyusut sebanding. */
export function zoomOutFactor(deviceDpr: number): number {
  return Math.min(1, deviceDpr);
}

/**
 * Pengganti `dpr={[min, max]}` untuk Canvas kecil (IndustriesStack,
 * ServicesTicker, InquiryLaptop). Perilaku rentang R3F dipertahankan
 * persis di zoom ≥100% (devicePixelRatio dijepit ke [min, max]), lalu
 * dikalikan faktor zoom-out di atas.
 */
export function zoomAwareDpr(
  deviceDpr: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(deviceDpr, min), max) * zoomOutFactor(deviceDpr);
}

/**
 * `window.devicePixelRatio` yang HIDUP: user bisa zoom (atau menyeret
 * jendela ke monitor lain) tanpa reload, dan prop dpr R3F hanya diterapkan
 * ulang saat re-render — jadi nilainya harus state React, bukan bacaan
 * sekali jalan. Sinyal perubahannya matchMedia `(resolution: Xdppx)`:
 * media query yang cocok dengan dpr SAAT INI berhenti cocok begitu dpr
 * berubah, lalu listener dipasang ulang di nilai baru (pola resubscribe
 * standar — event "resize" saja tidak cukup, ia tidak menembak saat
 * pindah monitor tanpa perubahan ukuran jendela).
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() =>
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
  );
  useEffect(() => {
    let mql: MediaQueryList | null = null;
    function onChange() {
      setDpr(window.devicePixelRatio);
      subscribe();
    }
    function subscribe() {
      mql?.removeEventListener("change", onChange);
      mql = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      mql.addEventListener("change", onChange);
    }
    subscribe();
    return () => mql?.removeEventListener("change", onChange);
  }, []);
  return dpr;
}

/** Faktor zoom-out yang hidup — dipakai Scene.tsx untuk mengalikan tangga
 *  AdaptiveDpr. */
export function useZoomOutFactor(): number {
  return zoomOutFactor(useDevicePixelRatio());
}

/** `zoomAwareDpr` yang hidup — pengganti langsung `dpr={[min, max]}`. */
export function useZoomAwareDpr(min: number, max: number): number {
  return zoomAwareDpr(useDevicePixelRatio(), min, max);
}

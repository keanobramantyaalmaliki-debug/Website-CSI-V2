import { createContext } from "react";
import {
  nativeScrollTo,
  type ScrollTarget,
  type SmoothScrollToOptions,
} from "./nativeScroll";

export interface SmoothScrollApi {
  /** Gulir ke posisi/elemen. Jatuh ke scroll native kalau Lenis tidak ada. */
  scrollTo: (target: ScrollTarget, options?: SmoothScrollToOptions) => void;

  /**
   * Tahan scroll selama sesuatu menutupi halaman (loader, drawer, modal).
   *
   * Berbasis id, BUKAN boolean: loader dan drawer bisa menahan bersamaan, dan
   * yang selesai duluan tidak boleh melepaskan tahanan milik yang lain. Scroll
   * baru jalan lagi setelah id TERAKHIR dilepas.
   */
  lock: (id: string) => void;
  unlock: (id: string) => void;
}

/**
 * Nilai default context: scroll native apa adanya.
 *
 * Sengaja bukan `null` + lempar error. Komponen seperti Navbar & RoomRouteSync
 * harus tetap benar saat dirender sendirian di unit test, dan di bawah
 * reduced-motion memang tidak ada Lenis untuk dipakai — keduanya keadaan yang
 * sah, bukan kesalahan pemakaian yang perlu diteriaki.
 */
export const NATIVE_SCROLL_API: SmoothScrollApi = {
  scrollTo: nativeScrollTo,
  // Tanpa Lenis tidak ada yang bisa ditahan: scroll native bukan milik kita.
  lock: () => {},
  unlock: () => {},
};

export const SmoothScrollContext =
  createContext<SmoothScrollApi>(NATIVE_SCROLL_API);

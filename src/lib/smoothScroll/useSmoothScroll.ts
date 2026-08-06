import { useContext, useEffect } from "react";
import { SmoothScrollContext, type SmoothScrollApi } from "./context";

/** Akses scroll halus. Aman dipanggil di luar provider — jatuh ke scroll native. */
export function useSmoothScroll(): SmoothScrollApi {
  return useContext(SmoothScrollContext);
}

/**
 * Tahan scroll selama `active`, lepas saat tidak aktif atau saat unmount.
 *
 * `id` harus unik per pemakai (mis. "navbar-drawer") supaya dua overlay yang
 * hidup bersamaan tidak saling melepaskan tahanan.
 */
export function useScrollLock(id: string, active: boolean): void {
  const { lock, unlock } = useSmoothScroll();

  useEffect(() => {
    if (!active) return;
    lock(id);
    return () => unlock(id);
  }, [id, active, lock, unlock]);
}

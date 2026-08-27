/* Plafon dinamis `section-shell` (§4bh) — jawaban untuk dilema §4bg:
   dari CSS murni, "monitor besar" dan "browser di-zoom-out" sama-sama cuma
   terlihat sebagai viewport CSS yang lebar, jadi plafon statis 1920px bikin
   monitor >1920 bergap.

   ⚠️ Jalan yang TIDAK jalan (diukur di Brave sungguhan 27 Agu, zoom 50%
   via preferensi per-origin): `outerWidth` 1204→2404 dan `screen.width`
   1280→2560 — Chromium modern melaporkan KEDUANYA dalam CSS px, jadi
   ikut membesar bersama zoom persis seperti innerWidth. Trik klasik
   "outerWidth/innerWidth mendeteksi zoom" sudah mati. Satu-satunya angka
   yang terukur invarian: `screen.width × devicePixelRatio` = piksel FISIK
   panel (1280×2 = 2560×1 = 2560 pada pengukuran yang sama).

   Maka strateginya CAPTURE-AND-FREEZE, bukan formula per-resize:
   - Saat load, percayai `screen.width` sebagai lebar CSS monitor (mayoritas
     load terjadi di zoom 100%) → plafon = max(1920, screen.width).
   - Simpan tanda-tangan FISIK panel (screen × dpr, invarian terhadap zoom).
   - Saat resize: kalau tanda-tangan fisik tetap (= cuma zoom / geser ukuran
     jendela), plafon DIBEKUKAN — zoom-out tetap terjepit di angka capture.
     Kalau berubah >2% (= jendela pindah monitor; toleransi untuk drift
     pembulatan dpr pecahan macam 1,33), capture ulang.

   Degradasi yang disadari & diterima:
   - Load SAAT SUDAH di-zoom-out (zoom Chrome nempel per-origin) di monitor
     >1920: screen.width sudah menggembung → plafon ikut → sesi itu tanpa
     jepitan (= perilaku pra-§4bb). Sembuh sendiri begitu load di 100%.
   - Di monitor ≤1920 CSS (MacBook 1280, AOC looks-like-1080 = SEMUA
     hardware Keano saat ini) lantai 1920 selalu menang — perilaku identik
     plafon statis §4bg, capture salah pun tak berdampak. Bagian dinamisnya
     baru hidup di monitor >1920 (QHD/ultrawide milik pengunjung). */

export const SHELL_BASE_PX = 1920;

export function computeShellMax(screenWidth: number): number {
  return Number.isFinite(screenWidth) && screenWidth > 0
    ? Math.max(SHELL_BASE_PX, screenWidth)
    : SHELL_BASE_PX;
}

export function initShellMax(win: Window = window): () => void {
  const phys = () => ({
    w: win.screen.width * win.devicePixelRatio,
    h: win.screen.height * win.devicePixelRatio,
  });
  const changed = (a: number, b: number) =>
    !(Number.isFinite(a) && a > 0) || Math.abs(b - a) / a > 0.02;

  let sig = phys();
  const apply = () =>
    win.document.documentElement.style.setProperty(
      "--shell-max",
      `${computeShellMax(win.screen.width)}px`
    );
  apply();

  const onResize = () => {
    const s = phys();
    if (changed(sig.w, s.w) || changed(sig.h, s.h)) {
      sig = s;
      apply(); // pindah monitor → capture ulang
    } // zoom / resize jendela → beku
  };
  win.addEventListener("resize", onResize);
  return () => win.removeEventListener("resize", onResize);
}

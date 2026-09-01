import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * Hero MENGALIR bersama halaman di semua lebar layar — satu koreografi, yang
 * beda cuma tingginya (70svh di HP, setinggi layar di ≥768px).
 *
 * Bentuk itu lahir dari lima laporan, tiga di HP lalu dua di desktop (10 Agu):
 *
 *   1. "40% layar kosong"    — hero dipaku 70svh di dalam track 126svh, jadi
 *                              ada 30svh badan track yang tak berisi apa pun
 *                              sebelum konten mulai.
 *   2. "3D kepotong kiri-kanan" — `scale: 0.96` mengecilkan canvas di tempat.
 *   3. "scroll tersendat"    — opacity+scale sebuah layer WebGL seukuran layar
 *                              dianimasikan tiap frame scroll.
 *   4. "di desktop masih mengecil & tersendat" — (2) dan (3) yang sama, di sana
 *                              masih disengaja karena melayani pin.
 *   5. "masih ada radius"    — sudut membulat seam HeroHandoff, yang cuma masuk
 *                              akal sebagai panel terangkat DI ATAS canvas
 *                              surut.
 *
 * Semuanya hilang dengan satu keputusan yang berlaku di mana saja: TANPA pin,
 * TANPA style di pembungkus canvas, TANPA seam.
 *
 * ⚠️ Kenapa perlu dijaga test. Pin + surut itu koreografi yang tampak "benar"
 * saat dibaca — sticky yang rapi, fade yang halus — jadi menghidupkannya lagi
 * terasa seperti perbaikan, bukan kemunduran. Ia lolos typecheck & lint, dan
 * gejalanya (3D mengecil dengan lajur gelap di tepi, scroll tersendat, jeda
 * hitam sebelum konten) baru terlihat saat digulir sungguhan. Persis pola
 * INVARIANTS.md.
 */

let width = 400;

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      // useNarrowViewport bertanya (max-width: 767.98px); useReducedMotion &
      // useCoarsePointer ikut lewat sini juga dan harus tetap `false`.
      matches: query.includes("max-width") && width < 768,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  vi.resetModules();
});

async function renderHero() {
  vi.resetModules();
  const { default: Hero } = await import("./Hero");
  return render(<Hero />);
}

/** Pembungkus canvas = anak pertama dari viewport 3D (div ber-`absolute inset-0`). */
function canvasWrapper(container: HTMLElement) {
  const el = container.querySelector("section#office > div > div");
  if (!el) throw new Error("pembungkus canvas tidak ditemukan");
  return el as HTMLElement;
}

describe("Hero — mengalir, tanpa pin & tanpa surut", () => {
  it("HP: track 70svh, desktop setinggi layar — dan tidak ada yang dipaku", async () => {
    width = 400;
    const { container } = await renderHero();
    const track = container.querySelector("section#office") as HTMLElement;
    const viewport = track.firstElementChild as HTMLElement;

    // 70svh = 70% yang BENAR-BENAR terlihat. Itu hanya benar selama tak ada
    // seam yang menimpa bagian bawah canvas — seam HeroHandoff dulu memakan
    // 40px terakhirnya dan diam-diam mengembalikannya ke 65%.
    expect(track.className).toContain("h-[70svh]");
    expect(track.className).toContain("md:h-svh");
    // track 180svh = landasan pin balik lagi; setinggi layar tidak punya sisa
    // untuk dipaku.
    expect(track.className).not.toContain("180svh");
    // `sticky` dalam bentuk APA PUN = pin balik lagi, termasuk varian md:
    expect(viewport.className).not.toContain("sticky");
  });

  /**
   * `dvh` DI MANA PUN di hero = bug 1 Sep balik lagi: unit itu ikut bernapas
   * bersama bilah URL HP, jadi hero memanjang/memendek tiap toolbar
   * sembunyi/muncul dan SELURUH konten di bawahnya bergeser turun lalu balik
   * (terukur 39px pada napas 56px — alasan panjangnya di Hero.tsx).
   *
   * Dijaga di sini karena `dvh` terlihat seperti pilihan yang lebih "benar"
   * saat dibaca — ia memang unit yang paling akurat menggambarkan viewport
   * SEKARANG — sehingga menukarnya balik terasa seperti perbaikan. Gejalanya
   * cuma muncul di HP sungguhan: di responsive mode desktop tidak ada bilah
   * URL, jadi typecheck, lint, dan mata di layar besar semuanya lolos.
   *
   * Dua kelas dicek sekaligus (track + pembungkus canvas saat dipaku) karena
   * keduanya wajib memakai unit yang SAMA; kalau tidak, canvas melompat
   * setinggi bilah URL tepat saat sapuan GridReveal memakunya.
   */
  it.each([400, 1440])("tidak ada `dvh` di hero — lebar %i", async (w) => {
    width = w;

    // Dipaku (pendingRoom terisi) supaya cabang `fixed …` di CanvasStage yang
    // terbaca, bukan `absolute inset-0` yang memang tak bertinggi. Store-nya
    // di-set SETELAH resetModules & SEBELUM render: Hero mengimpor instance
    // yang sama dari graf modul segar yang sama.
    vi.resetModules();
    const { useSceneStore } = await import("@/lib/store/sceneStore");
    useSceneStore.setState({ pendingRoom: "Lounge" });
    const { default: Hero } = await import("./Hero");
    const { container } = render(<Hero />);

    const track = container.querySelector("section#office") as HTMLElement;
    const wrapper = canvasWrapper(container);

    expect(wrapper.className).toContain("fixed"); // cabang dipaku memang aktif
    expect(track.className).not.toContain("dvh");
    expect(wrapper.className).not.toContain("dvh");
    // Pasangannya wajib SAMA — kalau tidak, canvas melompat setinggi bilah URL
    // tepat saat sapuan memakunya.
    expect(wrapper.className).toContain(w < 768 ? "h-[70svh]" : "md:h-svh");

    useSceneStore.setState({ pendingRoom: null });
  });

  it("HP: pembungkus canvas tanpa transform — sumber 'kepotong' & 'tersendat'", async () => {
    width = 400;
    const { container } = await renderHero();
    const style = canvasWrapper(container).getAttribute("style") ?? "";

    expect(style).not.toContain("transform");
    expect(style).not.toContain("scale");
    expect(style).not.toContain("opacity");
  });

  /**
   * Cerminan test di atas, dan justru yang ini yang dulu menjaga hal
   * SEBALIKNYA ("surut TETAP terpasang di layar lebar"). Surut memang melayani
   * pin selama pin masih ada; begitu pin dibongkar, ia tinggal ongkos: canvas
   * mengecil dengan lajur gelap di tepi, `react-use-measure` mengukur ulang
   * tiap frame scroll, dan layar hitam di antara fade selesai dan konten
   * datang.
   */
  it("layar lebar: pembungkus canvas juga TANPA style — surut sudah dibongkar", async () => {
    width = 1440;
    const { container } = await renderHero();
    const style = canvasWrapper(container).getAttribute("style") ?? "";

    expect(style).not.toContain("transform");
    expect(style).not.toContain("scale");
    expect(style).not.toContain("opacity");
  });
});

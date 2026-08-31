/**
 * PENJAGA INVARIAN — "tidak ada kamera" harus TERBACA sebagai tidak ada
 *
 * ── Bug yang dijaga (31 Agu, produksi csi2.wibudev.com) ─────────────────────
 * `office.glb` tidak ikut ter-deploy, jadi ChunkBoundary melepas <Canvas>
 * SELAGI halaman hidup. Sejak itu tiap klik navbar memantul balik ke Home,
 * dan tidak ada satu pun jejak yang menunjuk ke penyebabnya.
 *
 * Penyebabnya satu baris cleanup di CameraController:
 *
 *     return () => registerGoTo(() => {});     // no-op — TETAP TRUTHY
 *
 * Seluruh DOM membaca "apakah kamera hidup" lewat truthiness `goTo`. No-op
 * membuat setiap penjaga itu lolos lalu memanggil fungsi kosong, sehingga
 * `currentRoom` beku selamanya. RoomRouteSync Arah 1 mengira kamera hidup →
 * menandai `resolvedPath` → Arah 2 membaca "kamera di Lounge tapi URL di
 * /services" → menavigasi BALIK. Terukur menyadap history di Brave:
 * `push /services -> push /`.
 *
 * Akibat keduanya di Navbar: penyorotnya membaca `currentRoom` yang beku itu,
 * jadi ia bertahan di Home walau pengunjung sudah di /services.
 *
 * ── Kenapa test ini membaca sumber, bukan me-render ─────────────────────────
 * Membuktikannya butuh <Canvas> yang benar-benar mount LALU dilepas error
 * boundary — artinya WebGL, R3F, dan pemuatan GLB, yang tidak satu pun ada di
 * jsdom. Yang perlu dijaga jauh lebih sederhana dan bisa dibaca: cleanup-nya
 * mengosongkan, dan penyorot navbar punya jalan mundur ke URL. Pola yang sama
 * dipakai RoomRouteSync.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CAMERA = strip(readFileSync(join(HERE, "CameraController.tsx"), "utf8"));
const NAVBAR = strip(readFileSync(join(HERE, "../Navbar.tsx"), "utf8"));

describe("goTo mengabarkan dengan jujur kalau kameranya sudah tidak ada", () => {
  it("cleanup CameraController mengosongkan goTo, bukan memasang no-op", () => {
    expect(CAMERA).toMatch(/registerGoTo\(\s*null\s*\)/);

    // Bentuk apa pun yang mendaftarkan FUNGSI saat melepas — `() => {}`,
    // `function () {}`, `noop` — mengembalikan bug-nya utuh: penjaga `!goTo`
    // di RoomRouteSync & Navbar lolos, lalu memanggil sesuatu yang tak
    // menggerakkan currentRoom.
    const cleanup = CAMERA.match(/return\s*\(\)\s*=>\s*registerGoTo\(([^)]*)\)/);
    expect(cleanup, "cleanup registerGoTo tidak ditemukan").not.toBeNull();
    expect(cleanup![1].trim()).toBe("null");
  });

  it("penyorot navbar jatuh ke URL waktu goTo kosong", () => {
    // Yang dijaga maksudnya, bukan gayanya: `activeRoom` harus menyebut BOTH
    // `goTo` (penanda kamera hidup) dan `roomFromPath` (jalan mundurnya).
    const activeRoom = NAVBAR.match(/const\s+activeRoom\s*=[\s\S]*?;/);
    expect(activeRoom, "deklarasi activeRoom tidak ditemukan").not.toBeNull();

    const decl = activeRoom![0];
    expect(decl, "activeRoom tidak lagi bercabang pada goTo").toMatch(/goTo/);
    expect(decl, "tidak ada jalan mundur ke pathname").toMatch(/roomFromPath/);
  });
});

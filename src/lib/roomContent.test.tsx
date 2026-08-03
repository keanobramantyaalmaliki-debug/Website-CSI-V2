/**
 * Menjaga `roomHasContact` tetap sepakat dengan ROOM_CONTENT.
 *
 * ── Kenapa ada ─────────────────────────────────────────────────────────────
 * Navbar memakainya untuk memutuskan "Talk to us" cukup menggulir di tempat
 * atau harus pindah ke Lounge dulu. Kalau jawabannya salah, gejalanya halus
 * dan menyesatkan:
 *
 *   false padahal ada  → pengunjung DILEMPAR ke Lounge tanpa alasan, padahal
 *                        Contact ada tepat di bawahnya (bug yang dilaporkan
 *                        3 Agu: "klik talk to us dari room lain, balik ke
 *                        lounge")
 *   true padahal tidak → tombolnya diam saja, tanpa umpan balik sama sekali
 *
 * Fungsinya menelusuri pohon React element, bukan membaca daftar nama ruangan,
 * justru supaya ia ikut benar sendiri saat susunan konten berubah. Test ini
 * memastikan penelusuran itu benar-benar bekerja — termasuk saat <Contact />
 * nanti terbungkus elemen lain.
 */
import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { ROOM_CONTENT, ROOM_KEYS_WITH_CONTENT, roomHasContact } from "./roomContent";
import Contact from "@/components/sections/Contact";
import type { RoomKey } from "@/lib/store/sceneStore";

/**
 * Pencari <Contact /> yang ditulis ULANG di sini, sengaja tidak mengimpor
 * helper internalnya: kalau keduanya berbagi implementasi, test ini cuma
 * membuktikan fungsi itu setuju dengan dirinya sendiri.
 */
function findsContact(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(findsContact);
  if (!isValidElement(node)) return false;
  if (node.type === Contact) return true;
  const kids = (node.props as { children?: ReactNode }).children;
  return kids === undefined ? false : findsContact(kids);
}

describe("roomHasContact", () => {
  it("cocok dengan isi ROOM_CONTENT sungguhan untuk tiap ruangan", () => {
    for (const room of ROOM_KEYS_WITH_CONTENT) {
      expect(
        roomHasContact(room),
        `roomHasContact("${room}") tidak cocok dengan isi ROOM_CONTENT-nya. ` +
          `Navbar memakai ini untuk memutuskan "Talk to us" menggulir di ` +
          `tempat atau pindah ruangan dulu.`,
      ).toBe(findsContact(ROOM_CONTENT[room]));
    }
  });

  it("Pantry (konten null) dijawab false, bukan melempar", () => {
    // Pantry disabled dan ROOM_CONTENT-nya null. Ia tidak punya route, jadi
    // seharusnya tak pernah ditanyakan — tapi jawaban yang salah di sini akan
    // muncul sebagai crash, bukan sebagai tombol yang keliru.
    expect(roomHasContact("Pantry" as RoomKey)).toBe(false);
  });

  it("menemukan <Contact /> yang terbungkus elemen lain", () => {
    // Sekarang <Contact /> berdiri langsung di bawah fragment tiap ruangan,
    // jadi pencarian sedalam satu tingkat pun sudah cukup. Test ini menjaga
    // kasus yang BELUM terjadi: begitu ada yang membungkusnya (mis. <div
    // className="..."> untuk keperluan layout), fungsinya harus tetap
    // menemukannya — kalau tidak, "Talk to us" diam-diam berubah jadi
    // "pindah ke Lounge" tanpa ada yang mengubah Navbar.
    expect(
      findsContact(
        <div>
          <section>
            <Contact />
          </section>
        </div>,
      ),
    ).toBe(true);
  });

  it("tidak menemukan apa pun di pohon tanpa Contact", () => {
    expect(findsContact(<div><p>halo</p></div>)).toBe(false);
  });
});

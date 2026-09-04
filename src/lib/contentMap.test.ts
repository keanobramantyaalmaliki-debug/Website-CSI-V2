/**
 * Penjaga: peta konten di `shared/contentMap.ts` harus sepakat dengan situs.
 *
 * Peta itu dipakai sebagai BERANDA panel admin — daftar halaman beserta konten
 * yang tinggal di masing-masingnya. Kalau sebuah halaman situs berganti slug
 * atau label dan peta tidak ikut, panel akan menunjukkan alamat yang tidak ada
 * atau nama yang tidak dikenal editor. Dua-duanya gagal DIAM-DIAM: panelnya
 * tetap tampil rapi, cuma isinya bohong.
 *
 * Sengaja mengimpor `sceneStore` saja dan bukan `roomContent.tsx` /
 * `CameraController`: keduanya menyeret seluruh section dan three.js ke dalam
 * test yang sebenarnya cuma membandingkan string.
 */

import { describe, expect, it } from "vitest";

import { CONTENT_GROUPS, CONTENT_PAGES, FOOTER_GROUP, findEntry } from "@shared/contentMap";
import { ROOM_LABELS, ROOM_SLUGS, pathFor, type RoomKey } from "@/lib/store/sceneStore";

/** Urutan navbar (`NAV_CONTENT_ORDER` di Navbar.tsx), dalam RoomKey. */
const NAV_ROOMS: RoomKey[] = ["Lounge", "Function", "Meeting", "Office"];

describe("peta konten ⟷ situs", () => {
  it("memuat keempat halaman navbar, dalam urutan navbar", () => {
    expect(CONTENT_PAGES.map((p) => p.key)).toEqual(
      NAV_ROOMS.map((r) => ROOM_SLUGS[r]),
    );
  });

  it("label tiap halaman sama persis dengan label navbar", () => {
    for (const room of NAV_ROOMS) {
      const page = CONTENT_PAGES.find((p) => p.key === ROOM_SLUGS[room]);
      expect(page, `halaman ${room} hilang dari peta`).toBeDefined();
      expect(page!.label).toBe(ROOM_LABELS[room]);
    }
  });

  it("alamat tiap halaman sama persis dengan pathFor", () => {
    for (const room of NAV_ROOMS) {
      const page = CONTENT_PAGES.find((p) => p.key === ROOM_SLUGS[room])!;
      expect(page.path).toBe(pathFor(room));
    }
  });

  /* Pantry sengaja TIDAK ada di peta: ruangannya disabled, tidak punya route
     dan tidak punya konten. Kalau kelak dihidupkan, test ini yang gagal. */
  it("tidak memuat ruangan yang tidak punya halaman", () => {
    expect(CONTENT_PAGES.some((p) => p.key === ROOM_SLUGS.Pantry)).toBe(false);
  });
});

describe("bentuk peta konten", () => {
  it("key entri unik di seluruh kelompok", () => {
    const semua = CONTENT_GROUPS.flatMap((p) => p.entries.map((e) => e.key));
    expect(new Set(semua).size).toBe(semua.length);
  });

  it("tiap kelompok punya minimal satu entri", () => {
    for (const page of CONTENT_GROUPS) {
      expect(page.entries.length, `${page.label} kosong`).toBeGreaterThan(0);
    }
  });

  it("tiap entri punya label dan ringkasan yang terisi", () => {
    for (const page of CONTENT_GROUPS) {
      for (const entry of page.entries) {
        expect(entry.label.trim(), `${page.label}/${entry.key}`).not.toBe("");
        expect(entry.summary.trim(), `${page.label}/${entry.key}`).not.toBe("");
      }
    }
  });

  /* Ini yang menjaga beranda tetap jujur saat entitas berikutnya dikerjakan:
     satu-satunya yang boleh "siap" adalah yang panelnya benar-benar ada. */
  it("hanya entitas yang panelnya sudah ada yang berstatus siap", () => {
    const siap = CONTENT_GROUPS.flatMap((p) => p.entries)
      .filter((e) => e.status === "siap")
      .map((e) => e.key);
    /* Urutannya urutan halaman, bukan urutan pengerjaan: Beranda datang
       sebelum Services, Services sebelum Work, Work sebelum People, dan di
       dalam People nilai dan crew berada di atas lowongan. */
    expect(siap).toEqual([
      "judul-home",
      "deployment",
      "proses",
      "industri",
      "visi",
      "judul-services",
      "layanan",
      "testimoni",
      "judul-work",
      "selected-work",
      "case-study",
      "judul-people",
      "nilai",
      "crew",
      "lowongan",
      "footer",
    ]);
  });

  it("kelompok footer ikut terangkut ke CONTENT_GROUPS", () => {
    expect(CONTENT_GROUPS).toContain(FOOTER_GROUP);
    expect(CONTENT_GROUPS.length).toBe(CONTENT_PAGES.length + 1);
  });

  /* Peta ini pernah menaruh testimoni di Work (label "Sorotan & testimoni"),
     padahal kutipan klien bernama cuma ada di TestimonialSpotlight, di dasar
     halaman Services — yang di Work itu kutipan masalah tanpa nama siapa pun.
     Salahnya gagal diam-diam: panel tetap tampil rapi, editor cuma tidak
     pernah menemukan yang dicarinya. Ini yang mengunci letaknya. */
  it("tiap halaman memuat entri yang memang ada di halaman itu", () => {
    const keys = (pageKey: string) =>
      CONTENT_GROUPS.find((p) => p.key === pageKey)!.entries.map((e) => e.key);

    expect(keys("home")).toEqual([
      "judul-home",
      "deployment",
      "proses",
      "industri",
      "visi",
    ]);
    expect(keys("services")).toEqual(["judul-services", "layanan", "testimoni"]);
    expect(keys("work")).toEqual(["judul-work", "selected-work", "case-study"]);
    expect(keys("people")).toEqual(["judul-people", "nilai", "crew", "lowongan"]);
    expect(keys("footer")).toEqual(["footer"]);
  });

  /**
   * Menu sisi merender kelompok bertanda `langsung` sebagai SATU baris dan
   * mencetak label kelompoknya — anaknya tidak pernah digambar sama sekali
   * (`admin/src/Sidebar.tsx`).
   *
   * Dua hal yang rusak diam-diam kalau tanda itu dipasang sembarangan: entri
   * kedua jadi tidak terjangkau dari menu mana pun, dan label anak yang beda
   * dari label kelompok berarti nama yang dilihat editor di menu bukan nama
   * yang dilihatnya di beranda. Keduanya tanpa galat.
   */
  it("kelompok langsung punya tepat satu entri, bernama sama dengan kelompoknya", () => {
    for (const halaman of CONTENT_GROUPS.filter((p) => p.langsung)) {
      expect(halaman.entries, `${halaman.label} bertanda langsung`).toHaveLength(1);
      expect(halaman.entries[0].label).toBe(halaman.label);
    }
  });

  it("findEntry menemukan entri dari kelompok mana pun", () => {
    expect(findEntry("lowongan")?.page.key).toBe("people");
    expect(findEntry("footer")?.page.key).toBe("footer");
    expect(findEntry("tidak-ada")).toBeNull();
  });
});

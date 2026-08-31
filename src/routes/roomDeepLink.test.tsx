/**
 * PENJAGA REGRESI — deep-link ke sebuah ruangan tidak boleh dilempar ke Lounge
 *
 * ── Bug yang dijaga (3 Agu) ────────────────────────────────────────────────
 * Membuka path ruangan langsung (tautan yang dibagikan, refresh, atau
 * bookmark — waktu itu "/office", kini "/services") mendarat di Lounge, dan
 * address bar diam-diam berubah jadi "/".
 *
 * Sebabnya dua arah di RoomRouteSync yang BALAPAN saat mount pertama:
 *
 *   Arah 1 (path → room) tertahan `if (!goTo) return`. `goTo` baru terdaftar
 *   setelah CameraController mount, dan itu di dalam chunk <Scene> yang
 *   di-lazy-load — puluhan hingga ratusan milidetik setelah RoomRouteSync.
 *
 *   Arah 2 (room → path) TIDAK punya penahan apa pun. Saat mount, currentRoom
 *   masih START_ROOM ("Lounge"), jadi ia melihat target "/" ≠ pathname
 *   "/office" lalu menavigasi ke "/" — MENIMPA tujuan pengunjung sebelum
 *   Arah 1 sempat bekerja.
 *
 * Begitu URL jadi "/", Arah 1 tidak menolongnya lagi: pathname sudah cocok
 * dengan currentRoom, jadi tidak ada yang terasa salah dari dalam.
 *
 * ── Kenapa ini lolos dari semua penjaga yang ada ───────────────────────────
 * Klik navbar TETAP JALAN — saat itu Scene sudah mount dan `goTo` sudah
 * terdaftar, jadi Arah 1 menang. Yang rusak hanya kunjungan yang BERANGKAT
 * dari path ruangan. Menguji lewat klik tidak akan pernah menangkapnya.
 *
 * `roomRouteSearch.test.tsx` juga tidak menangkapnya: test itu sengaja menyetel
 * `goTo: null` dan mulai dari "/", jadi Arah 2 memang tidak punya alasan
 * menavigasi. Yang dijaga di sini justru keadaan sebaliknya.
 */
import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import RoomRouteSync from "./RoomRouteSync";
import { useSceneStore } from "@/lib/store/sceneStore";

/** Mata-mata lokasi: menuliskan URL terkini supaya bisa diperiksa. */
function LocationProbe({ onChange }: { onChange: (url: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onChange(loc.pathname + loc.search + loc.hash);
  }, [loc, onChange]);
  return null;
}

describe("deep-link ke ruangan bertahan saat mount pertama", () => {
  it("membuka /services sebelum <Scene> mount tidak melempar ke /", async () => {
    // Keadaan sungguhan pada muat pertama: chunk Scene belum tiba, jadi
    // CameraController belum memanggil registerGoTo → goTo masih null.
    useSceneStore.setState({ currentRoom: "Lounge", goTo: null });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/services"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(url).not.toBe(""));

    expect(
      url,
      "Arah 2 di RoomRouteSync.tsx menavigasi memakai currentRoom yang MASIH " +
        "nilai awal (Lounge), karena Arah 1 tertahan menunggu `goTo` dari " +
        "chunk <Scene> yang di-lazy-load.\n\n" +
        "Akibat nyata: setiap tautan ke ruangan yang dibagikan — dan setiap " +
        "refresh di dalam ruangan — mendarat di Lounge. Klik navbar tetap " +
        "jalan, jadi bug ini tidak terlihat kecuali URL-nya dibuka langsung.\n\n" +
        "Perbaikan: Arah 2 tidak boleh menulis URL selama pathname saat ini " +
        "masih menunjuk ruangan yang sah dan berbeda — biarkan Arah 1 yang " +
        "menyelesaikannya begitu goTo terdaftar.\n",
    ).toBe("/services");
  });

  it("setelah goTo terdaftar, /services menggerakkan currentRoom ke Function", async () => {
    const seen: string[] = [];
    // ⚠️ Mock ini WAJIB meniru `if (animating.current) return` milik
    // CameraController. Tanpa penahan itu, Arah 1 dan Arah 2 saling
    // memanggil tanpa henti dan test menggantung selamanya — bukan karena
    // RoomRouteSync salah, tapi karena mock-nya lebih longgar dari aslinya.
    // Di produksi tween 1400 ms itulah yang memutus rantainya.
    let animating = false;
    useSceneStore.setState({
      currentRoom: "Lounge",
      goTo: (room) => {
        if (animating) return false;
        animating = true;
        seen.push(room);
        useSceneStore.setState({ currentRoom: room });
        return true;
      },
    });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/services"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(useSceneStore.getState().currentRoom).toBe("Function"),
    );
    expect(seen).toContain("Function");
    expect(url).toBe("/services");
  });

  // ── Slug lama (19 Agu) ─────────────────────────────────────────────────────
  // "/office" beredar di tautan yang dibagikan sebelum slug konten. Kontraknya
  // dua tahap: SELAMA goTo belum terdaftar URL dibiarkan apa adanya (persis
  // penjaga di atas — menulis ulang lebih awal balapan dengan Arah 1); begitu
  // Arah 1 selesai, Arah 2 menormalkannya ke slug konten ruangan itu
  // ("/people" sejak konten Office ↔ Function ditukar 19 Agu).
  it("slug lama /office: mendarat di Office, URL dinormalkan ke /people", async () => {
    let animating = false;
    useSceneStore.setState({
      currentRoom: "Lounge",
      goTo: (room) => {
        if (animating) return false;
        animating = true;
        useSceneStore.setState({ currentRoom: room });
        return true;
      },
    });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/office"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(useSceneStore.getState().currentRoom).toBe("Office"),
    );
    await waitFor(() => expect(url).toBe("/people"));
  });
});

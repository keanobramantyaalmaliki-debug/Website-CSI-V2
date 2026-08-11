/**
 * PENJAGA REGRESI — query string tidak boleh hilang saat pindah ruangan
 *
 * ── Bug yang dijaga (3 Agu) ────────────────────────────────────────────────
 * Arah 2 di RoomRouteSync menyinkronkan `currentRoom` → pathname lewat
 * `navigate(pathFor(currentRoom))`. `pathFor` mengembalikan path TELANJANG
 * ("/office"), jadi seluruh `location.search` ikut terbuang begitu pengunjung
 * berpindah ruangan.
 *
 * Ketahuan lewat overlay dev ber-query (`?perf=1`) yang menyala di Lounge lalu
 * LENYAP tepat saat ganti ruangan. Gejalanya menyesatkan karena terlihat
 * seperti overlay-nya yang rusak, padahal URL-nya yang ditulis ulang.
 *
 * Dampaknya jauh lebih luas dari alat dev: setiap query param — tautan
 * kampanye (`?utm_source=`), flag debug, atau apa pun yang ditambahkan nanti —
 * hilang diam-diam pada perpindahan ruangan pertama. `?perf=1` di test ini
 * tinggal contoh query yang sembarang; tidak ada lagi fitur yang memakainya.
 *
 * ── Kenapa test ini me-render sungguhan ────────────────────────────────────
 * Beda dari RoomRouteSync.test.tsx yang membaca teks sumber (perilakunya butuh
 * WebGL, tidak ada di jsdom), yang dijaga di sini MURNI urusan routing: tidak
 * ada Canvas, tidak ada useFrame. Jadi ia bisa — dan sebaiknya — dibuktikan
 * lewat render nyata + MemoryRouter, bukan lewat regex yang cuma menyetujui
 * bentuk penulisan tertentu.
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

describe("RoomRouteSync mempertahankan query string", () => {
  it("query param bertahan saat currentRoom berpindah (Arah 2)", async () => {
    // Mulai di Lounge (START_ROOM → path "/") dengan query menempel.
    useSceneStore.setState({ currentRoom: "Lounge", goTo: null });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/?perf=1"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(url).toBe("/?perf=1"));

    // Pindah ruangan seperti klik waypoint / navbar: store berubah lebih dulu,
    // Arah 2 yang menyusulkan URL-nya.
    useSceneStore.setState({ currentRoom: "Office" });

    await waitFor(() => expect(url.startsWith("/office")).toBe(true));

    expect(
      url,
      "Arah 2 di RoomRouteSync.tsx menulis ulang URL dengan path TELANJANG " +
        "dari pathFor(), sehingga location.search terbuang saat pindah " +
        "ruangan.\n\n" +
        "Akibat nyata: setiap ?utm_* pada tautan kampanye hilang di " +
        "perpindahan ruangan pertama, jadi kunjungannya kehilangan " +
        "atribusi.\n\n" +
        "Perbaikan: sertakan location.search saat navigate().\n",
    ).toBe("/office?perf=1");
  });

  it("hash ikut bertahan, dan tidak terduplikasi", async () => {
    useSceneStore.setState({ currentRoom: "Lounge", goTo: null });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/?perf=1#contact"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    useSceneStore.setState({ currentRoom: "Meeting" });

    await waitFor(() => expect(url.startsWith("/meeting")).toBe(true));

    // `?` dan `#` masing-masing tepat sekali — menggabungkan search/hash
    // dengan string apa adanya gampang menghasilkan "/meeting?perf=1?perf=1".
    expect((url.match(/\?/g) || []).length, `URL ganda: ${url}`).toBe(1);
    expect((url.match(/#/g) || []).length, `hash ganda: ${url}`).toBe(1);
    expect(url).toBe("/meeting?perf=1#contact");
  });

  it("tanpa query, URL tetap bersih (tidak ada '?' menggantung)", async () => {
    useSceneStore.setState({ currentRoom: "Lounge", goTo: null });

    let url = "";
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    useSceneStore.setState({ currentRoom: "Office" });

    await waitFor(() => expect(url.startsWith("/office")).toBe(true));

    // Menempelkan search tanpa syarat memberi "/office?" — sah tapi kotor,
    // dan ia mengubah URL yang dibagikan pengunjung tanpa alasan.
    expect(url, "ada '?' menggantung padahal tidak ada query").toBe("/office");
  });
});

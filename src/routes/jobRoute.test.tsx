/**
 * PENJAGA REGRESI — halaman lowongan tidak boleh dipantulkan ke path ruangan
 *
 * ── Kegagalan yang dijaga ───────────────────────────────────────────────────
 * `/careers/<slug>` bukan path ruangan: `roomFromPath()` mengembalikan null
 * untuknya. Sebelum diperbaiki, Arah 1 di RoomRouteSync tetap menandai
 * `resolvedPath.current = pathname` sebelum pulang — dan penanda itulah
 * satu-satunya syarat yang menahan Arah 2.
 *
 * Begitu ditandai, Arah 2 membaca "pathFor(currentRoom) tidak sama dengan
 * pathname, dan pathname ini sudah terurus", lalu MENAVIGASI ke path ruangan.
 * Pelamar yang membuka tautan lowongan langsung terlempar ke /people, dan
 * halaman yang sudah ditulis tidak pernah terbaca.
 *
 * ── Kenapa ini tidak akan tertangkap penjaga lain ──────────────────────────
 * Seluruh test routing yang ada berangkat dari path ruangan yang SAH, jadi
 * tidak satu pun pernah melewati cabang `key === null`. Gejalanya juga menipu:
 * halaman lowongan berkedip sekejap sebelum hilang, yang terbaca sebagai
 * "tautannya salah", bukan "router menimpanya".
 */
import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import RoomRouteSync from "./RoomRouteSync";
import { useSceneStore } from "@/lib/store/sceneStore";

function LocationProbe({ onChange }: { onChange: (url: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onChange(loc.pathname + loc.search + loc.hash);
  }, [loc, onChange]);
  return null;
}

const JOB_PATH = "/careers/full-stack-engineer";

describe("path non-ruangan bertahan di RoomRouteSync", () => {
  it("halaman lowongan tidak ditulis ulang jadi path ruangan", async () => {
    // Keadaan yang paling berbahaya: Scene SUDAH mount (goTo terdaftar) dan
    // pengunjung sedang berada di sebuah ruangan yang path-nya BUKAN "/".
    // Di sinilah Arah 2 punya semua alasan untuk menavigasi.
    //
    // goTo-nya meniru guard `animating` CameraController — tanpa itu Arah 1 &
    // Arah 2 bisa saling memanggil tanpa henti dan test menggantung.
    let animating = false;
    useSceneStore.setState({
      currentRoom: "Office",
      pendingRoom: null,
      goTo: (room) => {
        if (animating) return false;
        animating = true;
        useSceneStore.setState({ currentRoom: room });
        return true;
      },
    });

    let url = "";
    render(
      <MemoryRouter initialEntries={[JOB_PATH]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(url).not.toBe(""));

    expect(
      url,
      "RoomRouteSync menulis ulang URL halaman lowongan jadi path ruangan.\n\n" +
        "Penyebabnya Arah 1 menandai `resolvedPath.current = pathname` untuk " +
        "path yang BUKAN ruangan; penanda itu membuka gerbang Arah 2, yang " +
        "lalu menavigasi ke pathFor(currentRoom).\n\n" +
        "Perbaikannya `if (!key) return;` DI ATAS penanda itu — path non-ruangan " +
        "bukan urusan efek tersebut, dan tidak boleh dilaporkan sebagai terurus.\n",
    ).toBe(JOB_PATH);
  });

  it("kamera tidak digerakkan oleh path yang bukan ruangan", async () => {
    const seen: string[] = [];
    useSceneStore.setState({
      currentRoom: "Office",
      pendingRoom: null,
      goTo: (room) => {
        seen.push(room);
        useSceneStore.setState({ currentRoom: room });
        return true;
      },
    });

    let url = "";
    render(
      <MemoryRouter initialEntries={[JOB_PATH]}>
        <RoomRouteSync />
        <LocationProbe onChange={(u) => (url = u)} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(url).not.toBe(""));

    expect(
      seen,
      "Membuka halaman lowongan memicu goTo() — tween kamera 1400 ms berjalan " +
        "di balik halaman teks, membakar GPU tanpa ada yang melihatnya.",
    ).toEqual([]);
  });
});
